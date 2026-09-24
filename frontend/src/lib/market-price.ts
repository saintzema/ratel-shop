import { aiJSON } from "@/lib/ai-provider";

/**
 * An independent answer to "what does this actually sell for in Nigeria?".
 *
 * This exists because the catalogue can't always answer it. A benchmark needs
 * comparable listings, and a young category has none — the two iPhone 16
 * listings on the platform only match each other, so with one comparable each
 * there's no way to tell which of the pair is mispriced. The verdict has to
 * come from outside.
 *
 * It must come from outside the SELLER too. Product.recommendedPrice was the
 * obvious candidate and is worthless for this: it's written from the same
 * request body as the price, so a listing supplies its own baseline and
 * grades itself. What this returns is stored in columns no write path
 * accepts from a client.
 *
 * Grounded — the model is asked to search rather than recall, because a
 * remembered price for Nigerian retail is worse than no price. Everything
 * comes back with a confidence and a range, and low confidence is discarded
 * rather than smoothed over.
 */

export interface MarketPrice {
    average: number;
    low: number;
    high: number;
    confidence: "high" | "medium" | "low";
    source: string;
}

// Sanity rails. A grounded lookup still occasionally returns the price of an
// accessory for the product, or a spare part for a car — the failure the
// existing price prompt guards against with its "you are LIKELY looking at a
// TOY or SPARE PART" warning. Anything outside these bounds is treated as a
// miss, not a finding.
const MIN_PLAUSIBLE_NGN = 500;
const MAX_PLAUSIBLE_NGN = 500_000_000;

function plausible(value: unknown): value is number {
    return typeof value === "number" && Number.isFinite(value)
        && value >= MIN_PLAUSIBLE_NGN && value <= MAX_PLAUSIBLE_NGN;
}

/**
 * Looks up one product's market price. Returns null whenever the answer
 * isn't trustworthy — no result, low confidence, an incoherent range, or a
 * figure outside the plausible bounds. A null means "no badge", which is the
 * correct outcome; a guess would be worse than silence on a platform whose
 * name is a promise about price.
 */
export async function lookupMarketPrice(
    productName: string,
    category?: string | null,
): Promise<MarketPrice | null> {
    const prompt = `You are a pricing researcher for the Nigerian market.

Search for what this product CURRENTLY sells for in Nigeria, in Naira:
Product: "${productName}"${category ? `\nCategory: ${category}` : ""}

Rules:
- Use real Nigerian listings and retailers (jiji.ng, jumia.com.ng, konga.com, slot.ng, cars45.com).
- Price the EXACT product named. If the name is an accessory, a case, a screen
  protector or a spare part, price THAT, not the device it fits.
- If you cannot find real current Nigerian listings for this exact product,
  set confidence to "low". Do not estimate from memory.
- All figures in Naira as plain numbers, no currency symbols or separators.

Return ONLY this JSON:
{
  "average": number,
  "low": number,
  "high": number,
  "confidence": "high" | "medium" | "low",
  "note": "one short sentence on what you based this on"
}`;

    const response = await aiJSON<RawMarketPrice>({
        prompt, temperature: 0, maxTokens: 500, timeoutMs: 45_000,
    }).catch(() => null);

    if (!response) return null;
    return parseMarketPrice(response.data, response.provider);
}

export interface RawMarketPrice {
    average?: unknown; low?: unknown; high?: unknown;
    confidence?: unknown; note?: unknown;
}

/**
 * Validates one model answer into a usable reference, or rejects it.
 *
 * Split out from the call so the rails are testable without a provider key
 * and without spending anything — these decide whether a listing gets
 * accused of overcharging, so they need to be exercised directly.
 */
export function parseMarketPrice(raw: RawMarketPrice | null | undefined, provider = "ai"): MarketPrice | null {
    if (!raw) return null;
    // "low" means the model couldn't find real listings and would be guessing.
    if (raw.confidence === "low") return null;
    if (!plausible(raw.average)) return null;
    const average = raw.average;

    // A range that doesn't contain its own average is an incoherent answer, so
    // the endpoints aren't trusted — the average is bounded instead.
    const low = plausible(raw.low) && raw.low <= average ? raw.low : average * 0.8;
    const high = plausible(raw.high) && raw.high >= average ? raw.high : average * 1.2;

    const note = typeof raw.note === "string" ? raw.note : "grounded market search";
    return {
        average: Math.round(average),
        low: Math.round(low),
        high: Math.round(high),
        confidence: raw.confidence === "high" ? "high" : "medium",
        source: `${provider}: ${note.slice(0, 240)}`,
    };
}

/** Market data older than this is re-looked-up; Nigerian prices move fast. */
export const MARKET_PRICE_TTL_DAYS = 30;

export function isStale(at: Date | null | undefined): boolean {
    if (!at) return true;
    return Date.now() - at.getTime() > MARKET_PRICE_TTL_DAYS * 86_400_000;
}
