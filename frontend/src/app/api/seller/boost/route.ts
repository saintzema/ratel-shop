import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/jwt";
import { db } from "@/lib/db";
import { verifyPaystackTransaction } from "@/lib/paystack-verify";
import { BOOST_TIERS, getTier, getAddOn, calculateBoostTotal } from "@/lib/boost-packages";

/**
 * On-platform listing boosts (Basic / Premium / VIP + add-ons).
 *
 * Reuses the AdCampaign model rather than adding a table: platform is set to
 * "onplatform" to distinguish these from the Meta ad boosts that share it,
 * postId carries the tier id, and productId is the boosted listing. Expiry is
 * derived from createdAt + days, so nothing new needs storing. (Schema adds
 * against the pooled connection have broken the deploy before — reusing an
 * existing shape is the cheaper, safer call here.)
 */

async function resolveSeller(userId: string, email?: string) {
    return db.seller.findFirst({
        where: { OR: [{ userId }, ...(email ? [{ ownerEmail: email }] : [])] },
        select: { id: true },
    });
}

/** GET — this seller's on-platform boosts, newest first. */
export async function GET(req: NextRequest) {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const seller = await resolveSeller(user.userId, user.email);
    if (!seller) return NextResponse.json({ error: "No seller account" }, { status: 404 });

    const campaigns = await db.adCampaign.findMany({
        where: { sellerId: seller.id, platform: "onplatform" },
        orderBy: { createdAt: "desc" },
        take: 50,
    });

    const now = Date.now();

    // Expire elapsed boosts and strip the placement they bought. Without this a
    // 7-day package would grant sponsored placement forever. Done as a sweep on
    // read rather than a cron so it's self-healing and needs no scheduler; the
    // seller's own dashboard load is the natural trigger, and the sweep is
    // idempotent so a concurrent one is harmless.
    const justExpired = campaigns.filter(
        c => c.status === "active" && c.createdAt.getTime() + c.days * 86400000 <= now
    );
    if (justExpired.length > 0) {
        await Promise.all(
            justExpired.map(async c => {
                await db.adCampaign.update({ where: { id: c.id }, data: { status: "completed" } });
                if (!c.productId) return;
                // Only clear placement if no OTHER boost is still live on this listing.
                const stillBoosted = campaigns.some(
                    other =>
                        other.id !== c.id &&
                        other.productId === c.productId &&
                        other.status === "active" &&
                        other.createdAt.getTime() + other.days * 86400000 > now
                );
                if (!stillBoosted) {
                    await db.product
                        .update({ where: { id: c.productId }, data: { isSponsored: false, isTrending: false } })
                        .catch(() => { /* product may have been deleted */ });
                }
                c.status = "completed";
            })
        );
    }
    return NextResponse.json({
        tiers: BOOST_TIERS,
        boosts: campaigns.map(c => {
            const expiresAt = new Date(c.createdAt.getTime() + c.days * 86400000);
            return {
                id: c.id,
                productId: c.productId,
                tierId: c.postId,
                status: c.status,
                days: c.days,
                totalChargedKobo: c.totalChargedKobo,
                createdAt: c.createdAt.toISOString(),
                expiresAt: expiresAt.toISOString(),
                isLive: c.status === "active" && expiresAt.getTime() > now,
            };
        }),
    });
}

/**
 * POST { productId, tierId, addOnIds?, paystackReference }
 *
 * The client runs the Paystack charge first; this verifies it server-side
 * against the amount the tier + add-ons actually cost before granting any
 * placement. An unverified or short payment must never activate a boost.
 */
export async function POST(req: NextRequest) {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const seller = await resolveSeller(user.userId, user.email);
    if (!seller) return NextResponse.json({ error: "No seller account" }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const { productId, tierId, addOnIds = [], paystackReference } = body as {
        productId?: string; tierId?: string; addOnIds?: string[]; paystackReference?: string;
    };

    if (!productId || !tierId || !paystackReference) {
        return NextResponse.json({ error: "productId, tierId and paystackReference are required" }, { status: 400 });
    }

    const tier = getTier(tierId);
    if (!tier) return NextResponse.json({ error: "Unknown boost package" }, { status: 400 });

    const validAddOns = (addOnIds || []).filter(id => !!getAddOn(id));

    // Ownership: a seller can only boost their own listing.
    const product = await db.product.findUnique({
        where: { id: productId },
        select: { id: true, name: true, sellerId: true },
    });
    if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });
    if (product.sellerId !== seller.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Replay guard — a Paystack reference verifies as "success" on every check,
    // so without this one payment could be POSTed repeatedly for unlimited boosts.
    const alreadyUsed = await db.adCampaign.findFirst({
        where: { paidReference: paystackReference },
        select: { id: true },
    });
    if (alreadyUsed) {
        return NextResponse.json(
            { error: "This payment reference has already been used for another boost." },
            { status: 409 }
        );
    }

    const totalNaira = calculateBoostTotal(tierId, validAddOns);
    const totalKobo = Math.round(totalNaira * 100);

    // Verify BEFORE granting placement — never trust a client "I paid".
    const verify = await verifyPaystackTransaction(paystackReference);
    if (!verify.ok || verify.tx.status !== "success") {
        return NextResponse.json({ error: "Payment could not be verified — no boost was activated." }, { status: 402 });
    }
    if (verify.tx.amount !== null && verify.tx.amount < totalKobo) {
        return NextResponse.json(
            { error: `Charged amount (${verify.tx.amount}) is less than this package costs (${totalKobo}) — no boost was activated.` },
            { status: 402 }
        );
    }

    const campaign = await db.adCampaign.create({
        data: {
            sellerId: seller.id,
            productId,
            platform: "onplatform",
            postId: tierId,
            budgetKobo: totalKobo,
            markupPct: 0, // fixed-price package; no per-spend markup applies
            totalChargedKobo: totalKobo,
            days: tier.days,
            paidReference: paystackReference,
            status: "active",
        },
    });

    // Apply the placement effects the seller just paid for.
    await db.product.update({
        where: { id: productId },
        data: {
            isSponsored: tier.effects.sponsored,
            ...(tier.effects.trending ? { isTrending: true } : {}),
        },
    });

    const expiresAt = new Date(campaign.createdAt.getTime() + tier.days * 86400000);

    return NextResponse.json({
        success: true,
        boostId: campaign.id,
        tier: tier.label,
        expiresAt: expiresAt.toISOString(),
        message: `Boost ${tier.label} ${tier.days}d has been activated successfully.`,
    });
}
