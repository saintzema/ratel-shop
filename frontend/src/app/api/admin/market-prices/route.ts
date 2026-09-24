import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserFromRequest } from "@/lib/jwt";
import { lookupMarketPrice, isStale, MARKET_PRICE_TTL_DAYS } from "@/lib/market-price";
import { benchmarkPrice, type Comparable } from "@/lib/price-benchmark";
import { refreshPriceFlag } from "@/lib/price-flag-service";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * POST /api/admin/market-prices  — admin only. Fills the independent market
 * reference for listings the catalogue cannot judge on its own.
 *
 * Only listings with too few comparables are enriched, and only when their
 * existing reference is stale. That keeps the cost proportional: a category
 * with plenty of sellers is already answerable for free, and there's no point
 * paying a grounded lookup to confirm it.
 *
 * GET reports how many listings would be enriched, without spending anything.
 */

async function candidates(limit: number) {
    const catalogue = await db.product.findMany({
        where: { isActive: true, price: { gt: 0 } },
        select: {
            id: true, name: true, price: true, category: true,
            marketPrice: true, marketPriceAt: true,
        },
    });
    const comparables: Comparable[] = catalogue.map(p => ({
        id: p.id, name: p.name, price: p.price, category: p.category,
    }));

    // "Cannot be judged from listings alone" is exactly the case where
    // benchmarkPrice returns no verdict with the market reference withheld.
    const needy = catalogue.filter(p =>
        benchmarkPrice(p, comparables).flag === "none" && isStale(p.marketPriceAt));

    return { total: catalogue.length, needy: needy.slice(0, limit), needyCount: needy.length };
}

export async function GET(req: NextRequest) {
    const user = getUserFromRequest(req);
    if (!user || user.role !== "admin") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { total, needyCount, needy } = await candidates(50);
    return NextResponse.json({
        catalogueSize: total,
        needingReference: needyCount,
        ttlDays: MARKET_PRICE_TTL_DAYS,
        sample: needy.slice(0, 20).map(p => ({ id: p.id, name: p.name, price: p.price })),
    });
}

export async function POST(req: NextRequest) {
    const user = getUserFromRequest(req);
    if (!user || user.role !== "admin") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    // Small batches by default: each item is a grounded model call, and this
    // route is billed per lookup. The caller repeats until `remaining` is 0.
    const limit = Math.min(Number(body?.limit) || 10, 40);

    const { needy, needyCount } = await candidates(limit);
    const enriched: { id: string; name: string; price: number; market: number; flag: string }[] = [];
    const skipped: { id: string; reason: string }[] = [];

    for (const product of needy) {
        const market = await lookupMarketPrice(product.name, product.category);
        if (!market) {
            skipped.push({ id: product.id, reason: "no trustworthy market price found" });
            continue;
        }
        await db.product.update({
            where: { id: product.id },
            data: {
                marketPrice: market.average,
                marketPriceLow: market.low,
                marketPriceHigh: market.high,
                marketPriceAt: new Date(),
                marketPriceSource: market.source,
            },
        }).catch(() => null);

        // Re-grade immediately so the reference has an effect in the same run.
        const verdict = await refreshPriceFlag(product.id);
        enriched.push({
            id: product.id, name: product.name.slice(0, 60), price: product.price,
            market: market.average, flag: verdict?.flag ?? "none",
        });
    }

    return NextResponse.json({
        enriched: enriched.length,
        skipped,
        remaining: Math.max(0, needyCount - needy.length),
        results: enriched,
    });
}
