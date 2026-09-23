import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { benchmarkAgainstCatalogue } from "@/lib/price-flag-service";

export const dynamic = "force-dynamic";

/**
 * GET /api/products/[id]/price-check
 *
 * What this listing costs against comparable listings on the platform — the
 * numbers behind the badge, so a buyer sees "₦3.4m, and the usual price is
 * ₦1.85m across 3 other listings" rather than an unexplained red label.
 *
 * Public: it says nothing a shopper can't already work out by searching, and
 * the whole point is that buyers can see it.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const product = await db.product.findUnique({
        where: { id },
        select: { id: true, name: true, price: true, category: true, priceFlag: true, recommendedPrice: true },
    }).catch(() => null);
    if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const verdict = await benchmarkAgainstCatalogue(product);

    // The stored flag comes from the batch pass, which compares against the
    // WHOLE catalogue; this request compares against a candidate subset so the
    // product page stays fast. The subset occasionally finds one comparable
    // fewer and falls under the minimum, which would show a warning badge on
    // the search card and nothing at all on the page it links to. So the
    // stored verdict wins, and the live pass supplies the supporting numbers
    // only when it agrees — a badge with no numbers beats a contradiction.
    const flag = verdict.flag === "none" ? product.priceFlag : verdict.flag;
    const agrees = verdict.flag === flag;

    return NextResponse.json({
        flag,
        median: agrees ? verdict.median : null,
        peerCount: agrees ? verdict.peerCount : 0,
        ratio: agrees ? verdict.ratio : null,
        price: product.price,
    });
}
