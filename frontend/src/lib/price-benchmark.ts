/**
 * What a listing SHOULD cost, worked out from the other listings of the same
 * thing on the platform.
 *
 * Why this exists: `priceFlag` was whatever the seller's own browser sent —
 * `priceFlag: body.price_flag || "none"` on the write path — so a listing
 * could call itself "fair" and get the green badge for free. The live
 * catalogue showed "iPhone 16 2024 128gb" at ₦2,485,000 wearing a FAIR badge
 * next to "Apple iPhone 16 256 GB" at ₦850,000: a 2.9× spread on the same
 * phone, with the expensive one carrying the trust mark. On a platform called
 * FairPrice that is worse than showing no badge at all.
 *
 * So the flag is computed here, on the server, from comparable listings, and
 * the seller never gets a say.
 *
 * The matching is deliberately conservative. A verdict needs at least
 * MIN_PEERS genuine comparables, and anything short of that stays `none` —
 * a thin category must produce no badge rather than a confident wrong one.
 */

export type PriceFlag = "fair" | "overpriced" | "too_low" | "none" | "great_deal";

export interface Comparable {
    id: string;
    name: string;
    price: number;
    category?: string | null;
}

export interface Benchmark {
    flag: PriceFlag;
    /** Median price of the comparables found, or null when there weren't enough. */
    median: number | null;
    /** How many other listings the verdict is based on. */
    peerCount: number;
    /** price ÷ median, for copy like "2.9× the typical price". */
    ratio: number | null;
    /** Where the baseline came from — other listings, or a stored market reference. */
    basis?: "listings" | "reference";
}

// A listing this far above the median of its peers is overpriced. Nigerian
// retail genuinely varies — condition, warranty, who's importing — so the
// band is wide enough that ordinary variation doesn't get anyone flagged.
const OVERPRICED_AT = 1.35;
const GREAT_DEAL_AT = 0.72;
// Far enough below the median to be a bait listing rather than a bargain.
const TOO_LOW_AT = 0.45;
const MIN_PEERS = 3;
// Two comparables is a thin sample, but a listing at double the price of the
// only other two of the same model is not a sampling artefact — it's the
// finding. Requiring three would have kept a ₦2,485,000 iPhone 16 unflagged
// beside an ₦850,000 one purely because the catalogue is young. Ordinary
// variation still needs the full sample.
const MIN_PEERS_WHEN_EXTREME = 2;
const EXTREME_RATIO = 2;

// Words that say nothing about WHICH product this is. Condition and year do
// move the price, but they don't make two listings different products, and
// keeping them would stop a "foreign used" iPhone 16 matching a plain one.
const NOISE = new Set([
    "the", "and", "for", "with", "new", "original", "genuine", "official",
    "brand", "quality", "premium", "best", "hot", "sale", "offer", "deal",
    "free", "shipping", "delivery", "fast", "uk", "us", "usa", "foreign",
    "used", "refurbished", "unlocked", "sealed", "verified", "fairprice",
    "inch", "inches", "pcs", "set", "kit", "pack", "in", "of", "by", "a",
]);

const CAPACITY = /(\d+(?:\.\d+)?)\s*(gb|tb|mb|ml|l|kg|g|w|kw|mah|ah)\b/gi;

// Words that mark a different MODEL TIER of the same product line. A Pro Max
// is not an expensive iPhone, it's a different phone, and comparing the two
// produces both false alarms and missed ones. These have to match exactly on
// both sides or the listings aren't comparable at all.
const TIERS = new Set(["pro", "max", "plus", "ultra", "mini", "lite", "air", "se", "fe"]);

/**
 * Meaningful words in a product name — brand and model, essentially.
 *
 * Capacity is stripped out rather than counted. A 128GB and a 256GB of the
 * same phone ARE comparable — the storage step moves the price by a fraction,
 * not a multiple — and treating them as different products is what let a
 * ₦2,485,000 "iPhone 16 128gb" escape comparison with an ₦850,000 "iPhone 16
 * 256 GB" entirely.
 */
export function nameTokens(name: string): Set<string> {
    const cleaned = name.toLowerCase().replace(CAPACITY, " ").replace(/[^a-z0-9.\s]/g, " ");
    const tokens = cleaned.split(/\s+/).filter(t =>
        t.length > 1 && !NOISE.has(t) && !TIERS.has(t) && !/^(19|20)\d{2}$/.test(t));
    return new Set(tokens);
}

/** The tier words present in a title, e.g. "Pro Max" → {pro, max}. */
export function tierWords(name: string): Set<string> {
    const out = new Set<string>();
    for (const t of name.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/)) {
        if (TIERS.has(t)) out.add(t);
    }
    return out;
}

// Everything normalised to one unit per family, so "1tb" and "512gb" are
// comparable numbers rather than two unrelated strings.
const UNIT_SCALE: Record<string, [string, number]> = {
    mb: ["bytes", 1], gb: ["bytes", 1024], tb: ["bytes", 1024 * 1024],
    ml: ["volume", 1], l: ["volume", 1000],
    g: ["mass", 1], kg: ["mass", 1000],
    w: ["power", 1], kw: ["power", 1000],
    mah: ["charge", 1], ah: ["charge", 1000],
};

/** The largest capacity stated per unit family, e.g. { bytes: 262144 }. */
export function capacityScale(name: string): Record<string, number> {
    const out: Record<string, number> = {};
    for (const m of name.toLowerCase().matchAll(CAPACITY)) {
        const scale = UNIT_SCALE[m[2]];
        if (!scale) continue;
        const [family, factor] = scale;
        const value = parseFloat(m[1]) * factor;
        if (!(value > 0)) continue;
        out[family] = Math.max(out[family] ?? 0, value);
    }
    return out;
}

// A storage or capacity STEP is a normal product variant — 128GB vs 256GB is
// the same phone at a slightly different price, so those must stay
// comparable. A different order of magnitude is a different product: a 980kWh
// generator against a 500W one is not a pricing problem, it's a category
// error, and comparing them would flag the big one as a rip-off.
const MAX_CAPACITY_RATIO = 2.5;

function capacitiesCompatible(a: string, b: string): boolean {
    const ca = capacityScale(a), cb = capacityScale(b);
    for (const family of Object.keys(ca)) {
        const other = cb[family];
        if (other == null) continue;
        const ratio = Math.max(ca[family], other) / Math.min(ca[family], other);
        if (ratio > MAX_CAPACITY_RATIO) return false;
    }
    return true;
}

function sameSet(a: Set<string>, b: Set<string>): boolean {
    if (a.size !== b.size) return false;
    for (const v of a) if (!b.has(v)) return false;
    return true;
}

/** 0–1 overlap between two names, after the noise words are dropped. */
export function nameSimilarity(a: string, b: string): number {
    // Different tier — different product, whatever the rest of the words say.
    if (!sameSet(tierWords(a), tierWords(b))) return 0;
    if (!capacitiesCompatible(a, b)) return 0;

    const ta = nameTokens(a), tb = nameTokens(b);
    if (ta.size === 0 || tb.size === 0) return 0;

    let intersection = 0;
    for (const t of ta) if (tb.has(t)) intersection++;
    // Overlap coefficient rather than Jaccard: a long, keyword-stuffed title
    // shouldn't fail to match the same product listed under a short one.
    return intersection / Math.min(ta.size, tb.size);
}

const SIMILAR_ENOUGH = 0.6;

export function findComparables(target: Comparable, catalogue: Comparable[]): Comparable[] {
    return catalogue.filter(other =>
        other.id !== target.id &&
        other.price > 0 &&
        nameSimilarity(target.name, other.name) >= SIMILAR_ENOUGH);
}

export function median(values: number[]): number | null {
    if (values.length === 0) return null;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * The verdict for one listing against the rest of the catalogue.
 *
 * Median, not mean: one absurd listing shouldn't drag the baseline up and
 * launder itself into looking fair — which is exactly the failure mode being
 * fixed here.
 */
export function benchmarkPrice(
    target: Comparable,
    catalogue: Comparable[],
    opts: { referencePrice?: number | null } = {},
): Benchmark {
    const peers = findComparables(target, catalogue);
    if (!(target.price > 0)) {
        return { flag: "none", median: null, peerCount: peers.length, ratio: null };
    }

    const peerMedian = peers.length > 0 ? median(peers.map(p => p.price)) : null;

    // `opts.referencePrice` (Product.recommendedPrice) is deliberately NOT used
    // as a fallback baseline, though it was tried. That column is written from
    // the same seller-supplied payload as the price itself, so on the live
    // catalogue a ₦2,485,000 iPhone 16 carried a ₦2,485,000 "recommended"
    // price and benchmarking against it handed the listing a FAIR badge —
    // reinstating precisely the self-certification this module exists to
    // remove. Elsewhere the column is unrelated junk (a ₦3,910,000 machine
    // against a ₦120,000 reference). A trustworthy reference has to come from
    // a source the seller does not control; until one exists, a thin category
    // gets no badge, which is the honest answer.
    const useReference = false;

    const mid = peerMedian;
    if (mid == null || !(mid > 0)) {
        return { flag: "none", median: null, peerCount: peers.length, ratio: null };
    }

    const ratio = target.price / mid;
    const basis: "listings" | "reference" = useReference ? "reference" : "listings";
    void opts;

    // Sample-size gate — waived for a reference price (it isn't a sample) and
    // relaxed for an unmistakable outlier.
    if (basis === "listings") {
        const extreme = ratio >= EXTREME_RATIO || ratio <= 1 / EXTREME_RATIO;
        const needed = extreme ? MIN_PEERS_WHEN_EXTREME : MIN_PEERS;
        if (peers.length < needed) {
            return { flag: "none", median: null, peerCount: peers.length, ratio: null };
        }
    }

    let flag: PriceFlag = "fair";
    if (ratio >= OVERPRICED_AT) flag = "overpriced";
    else if (ratio <= TOO_LOW_AT) flag = "too_low";
    else if (ratio <= GREAT_DEAL_AT) flag = "great_deal";

    return { flag, median: mid, peerCount: peers.length, ratio, basis };
}

/**
 * How much a listing's search ranking is scaled by its verdict. An overpriced
 * listing isn't removed or edited — that's the seller's business — it just
 * stops outranking honest ones, which is the whole remedy the platform owes
 * a buyer. `too_low` is damped too: on a marketplace, a price far under
 * everyone else is more often bait than a bargain.
 */
export function rankingMultiplier(flag: PriceFlag | null | undefined): number {
    switch (flag) {
        case "overpriced": return 0.35;
        case "too_low": return 0.7;
        case "great_deal": return 1.15;
        default: return 1;
    }
}
