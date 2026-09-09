import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Real NGN→foreign-currency rates for the "international visitor sees a
 * converted price estimate" feature — every price a Nigerian shopper checks
 * out with is still charged in NGN via Paystack; this is a display estimate
 * only, never fabricated. Rates come from a live, free, no-API-key exchange
 * rate service and are cached in-memory for a few hours (rates don't move
 * fast enough to justify fetching on every page load, and this endpoint has
 * no auth of its own to rate-limit abuse against the upstream).
 */
let cache: { rates: Record<string, number>; fetchedAt: number } | null = null;
const CACHE_MS = 6 * 60 * 60 * 1000; // 6 hours

export async function GET() {
    const now = Date.now();
    if (cache && now - cache.fetchedAt < CACHE_MS) {
        return NextResponse.json({ base: "NGN", rates: cache.rates, updatedAt: cache.fetchedAt, cached: true });
    }

    try {
        const res = await fetch("https://open.er-api.com/v6/latest/NGN", {
            signal: AbortSignal.timeout(8000),
        });
        if (!res.ok) throw new Error(`Upstream ${res.status}`);
        const data = await res.json();
        if (!data?.rates || typeof data.rates !== "object") throw new Error("Malformed rate response");

        cache = { rates: data.rates, fetchedAt: now };
        return NextResponse.json({ base: "NGN", rates: data.rates, updatedAt: now, cached: false });
    } catch (err) {
        // Serve a stale cache rather than nothing if the upstream is briefly down —
        // still a REAL rate, just not the freshest. Only if there's truly never
        // been a successful fetch do we return no rates at all (never a made-up one).
        if (cache) {
            return NextResponse.json({ base: "NGN", rates: cache.rates, updatedAt: cache.fetchedAt, cached: true, stale: true });
        }
        return NextResponse.json({ error: "Exchange rate service unavailable" }, { status: 503 });
    }
}
