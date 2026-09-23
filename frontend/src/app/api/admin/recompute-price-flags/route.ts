import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserFromRequest } from "@/lib/jwt";
import { benchmarkPrice, type Comparable } from "@/lib/price-benchmark";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * POST /api/admin/recompute-price-flags  — admin only.
 *
 * Re-derives every listing's price verdict from the catalogue and writes the
 * ones that changed. Needed once because the existing flags are all
 * seller-supplied and therefore meaningless: 78 listings called themselves
 * "fair" including a ₦2,485,000 iPhone 16 sitting beside an ₦850,000 one.
 *
 * Unlike the per-write path (lib/price-flag-service.ts, which queries a small
 * candidate set per product), this loads the whole active catalogue once and
 * compares in memory — far fewer round trips when doing all of them.
 *
 * `dryRun: true` reports what would change without writing.
 */
export async function POST(req: NextRequest) {
    const user = getUserFromRequest(req);
    if (!user || user.role !== "admin") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const dryRun = body?.dryRun === true;

    const catalogue = await db.product.findMany({
        where: { isActive: true, price: { gt: 0 } },
        select: { id: true, name: true, price: true, category: true, priceFlag: true, recommendedPrice: true },
    });

    const comparables: Comparable[] = catalogue.map(p => ({
        id: p.id, name: p.name, price: p.price, category: p.category,
    }));

    const changes: { id: string; name: string; from: string; to: string; price: number; median: number | null; peers: number }[] = [];
    for (const product of catalogue) {
        const verdict = benchmarkPrice(product, comparables, { referencePrice: product.recommendedPrice });
        if (verdict.flag === product.priceFlag) continue;
        changes.push({
            id: product.id,
            name: product.name.slice(0, 60),
            from: product.priceFlag,
            to: verdict.flag,
            price: product.price,
            median: verdict.median,
            peers: verdict.peerCount,
        });
    }

    if (!dryRun) {
        // Grouped by target flag so this is one UPDATE per verdict rather than
        // one per product — a few statements instead of a few hundred.
        const byFlag = new Map<string, string[]>();
        for (const c of changes) {
            const ids = byFlag.get(c.to) ?? [];
            ids.push(c.id);
            byFlag.set(c.to, ids);
        }
        for (const [flag, ids] of byFlag) {
            await db.product.updateMany({ where: { id: { in: ids } }, data: { priceFlag: flag as any } });
        }
    }

    const summary: Record<string, number> = {};
    for (const c of changes) summary[c.to] = (summary[c.to] ?? 0) + 1;

    return NextResponse.json({
        dryRun,
        scanned: catalogue.length,
        changed: changes.length,
        summary,
        // The interesting ones — what a buyer is actually being warned about.
        flaggedExamples: changes.filter(c => c.to === "overpriced" || c.to === "too_low").slice(0, 25),
    });
}
