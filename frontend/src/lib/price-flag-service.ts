import { db } from "@/lib/db";
import { benchmarkPrice, type Benchmark, type Comparable } from "@/lib/price-benchmark";

/**
 * Works out a listing's price verdict against the live catalogue and writes
 * it to the row. The seller's own `price_flag` is ignored everywhere — see
 * lib/price-benchmark.ts for why that had to stop.
 *
 * The candidate set is kept small on purpose: only active listings whose name
 * shares the target's most distinctive word (usually the brand or model
 * number). That's a cheap indexed-ish query rather than a full table scan, and
 * benchmarkPrice then does the real comparison on the handful that come back.
 */

const NOISE_WORDS = new Set(["the", "and", "for", "with", "new", "original", "pro", "max", "plus"]);

/**
 * The words most likely to identify the product line — the longest non-noise
 * tokens. More than one, because a single anchor recalls too little: matching
 * "Felicity 17.5kw Lithium Battery" on "lithium" alone found 2 comparables
 * where the whole-catalogue pass found 3, so the product page disagreed with
 * its own stored badge. Widening to a couple of anchors closes that gap;
 * benchmarkPrice still decides what genuinely matches.
 */
function anchorWords(name: string, count = 2): string[] {
    const tokens = Array.from(new Set(
        name.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/)
            .filter(t => t.length > 2 && !NOISE_WORDS.has(t) && !/^(19|20)\d{2}$/.test(t)),
    ));
    return tokens.sort((a, b) => b.length - a.length).slice(0, count);
}

export async function benchmarkAgainstCatalogue(
    target: Comparable,
    opts: { candidateLimit?: number } = {},
): Promise<Benchmark> {
    const anchors = anchorWords(target.name);
    if (anchors.length === 0) return { flag: "none", median: null, peerCount: 0, ratio: null };

    const candidates = await db.product.findMany({
        where: {
            isActive: true,
            price: { gt: 0 },
            id: { not: target.id },
            OR: anchors.map(a => ({ name: { contains: a, mode: "insensitive" as const } })),
        },
        select: { id: true, name: true, price: true, category: true },
        take: opts.candidateLimit ?? 250,
    }).catch(() => [] as Comparable[]);

    return benchmarkPrice(target, candidates);
}

/** Benchmarks one product and persists the verdict. Returns what it decided. */
export async function refreshPriceFlag(productId: string): Promise<Benchmark | null> {
    const product = await db.product.findUnique({
        where: { id: productId },
        select: { id: true, name: true, price: true, category: true, priceFlag: true, recommendedPrice: true },
    }).catch(() => null);
    if (!product) return null;

    const verdict = await benchmarkAgainstCatalogue(product);
    if (verdict.flag !== product.priceFlag) {
        await db.product.update({
            where: { id: product.id },
            data: { priceFlag: verdict.flag as any },
        }).catch(() => null);
    }
    return verdict;
}
