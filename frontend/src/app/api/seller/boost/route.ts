import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/jwt";
import { db } from "@/lib/db";
import { verifyPaystackTransaction } from "@/lib/paystack-verify";
import { BOOST_TIERS, getTier, getAddOn, calculateBoostTotal, META_ADS_ADDON_ID } from "@/lib/boost-packages";
import { createBoostCampaign, resolveMetaAdsCredentials } from "@/lib/meta-ads";

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
    const { productId, productIds, tierId, addOnIds = [], paystackReference } = body as {
        productId?: string; productIds?: string[]; tierId?: string; addOnIds?: string[]; paystackReference?: string;
    };

    // Packages cover multiple listings (that's the competitive point against
    // Jiji's per-package ad allowances), so accept a list. Single productId is
    // still honoured for the one-listing case.
    const targetIds = Array.from(new Set((productIds?.length ? productIds : [productId]).filter(Boolean) as string[]));

    if (targetIds.length === 0 || !tierId || !paystackReference) {
        return NextResponse.json({ error: "productId(s), tierId and paystackReference are required" }, { status: 400 });
    }

    const tier = getTier(tierId);
    if (!tier) return NextResponse.json({ error: "Unknown boost package" }, { status: 400 });

    if (targetIds.length > tier.maxListings) {
        return NextResponse.json(
            { error: `${tier.label} covers up to ${tier.maxListings} listing${tier.maxListings === 1 ? "" : "s"} — you selected ${targetIds.length}.` },
            { status: 400 }
        );
    }

    const validAddOns = (addOnIds || []).filter(id => !!getAddOn(id));

    // Ownership: every listing in the purchase must belong to this seller.
    const products = await db.product.findMany({
        where: { id: { in: targetIds } },
        select: { id: true, name: true, sellerId: true, imageUrl: true, price: true },
    });
    if (products.length !== targetIds.length) {
        return NextResponse.json({ error: "One or more products were not found." }, { status: 404 });
    }
    if (products.some(p => p.sellerId !== seller.id)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    // The Meta add-on posts a single product; use the first selected.
    const productId0 = targetIds[0];

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

    // One campaign row per boosted listing, all sharing the payment reference —
    // the expiry sweep and the per-listing stats both work per product. The
    // replay guard above runs BEFORE this, so a second POST with the same
    // reference finds these rows and is rejected.
    const campaigns = await db.$transaction(
        targetIds.map(pid =>
            db.adCampaign.create({
                data: {
                    sellerId: seller.id,
                    productId: pid,
                    platform: "onplatform",
                    postId: tierId,
                    // Charge is recorded once on the first row; the rest are 0 so
                    // revenue reporting doesn't multiply one payment by the listing count.
                    budgetKobo: pid === targetIds[0] ? totalKobo : 0,
                    markupPct: 0, // fixed-price package; no per-spend markup applies
                    totalChargedKobo: pid === targetIds[0] ? totalKobo : 0,
                    days: tier.days,
                    paidReference: paystackReference,
                    status: "active",
                },
            })
        )
    );
    const campaign = campaigns[0];

    // Apply the placement effects the seller just paid for, to every listing.
    await db.product.updateMany({
        where: { id: { in: targetIds } },
        data: {
            isSponsored: tier.effects.sponsored,
            ...(tier.effects.trending ? { isTrending: true } : {}),
        },
    });

    const expiresAt = new Date(campaign.createdAt.getTime() + tier.days * 86400000);

    // ─── Optional: extend the boost onto Facebook + Instagram ───
    // The on-platform placement above is already paid for and live at this point.
    // Everything below is best-effort: if Meta refuses, the seller keeps the boost
    // they bought and we report the shortfall honestly rather than silently
    // pocketing the ad portion.
    let metaResult: { attempted: boolean; ok: boolean; detail: string } = {
        attempted: false, ok: false, detail: "",
    };

    if (validAddOns.includes(META_ADS_ADDON_ID)) {
        metaResult = { attempted: true, ok: false, detail: "" };
        try {
            const addOn = getAddOn(META_ADS_ADDON_ID);
            const adSpendNaira = addOn?.adSpendNaira ?? 0;
            const credentials = await resolveMetaAdsCredentials();

            const fullSeller = await db.seller.findUnique({
                where: { id: seller.id },
                select: {
                    facebookPageId: true,
                    facebookPageAccessToken: true,
                    instagramUserId: true,
                },
            });

            if (!credentials) {
                metaResult.detail = "Facebook/Instagram ads aren't configured on our end yet — we'll run this manually and contact you.";
            } else if (!fullSeller?.facebookPageId || !fullSeller.facebookPageAccessToken) {
                metaResult.detail = "Connect your Facebook Page under Integrations and we'll run the ad — nothing extra to pay.";
            } else {
                // Publish the product to the seller's Page first: Meta boosts an
                // existing post, it can't advertise a bare product URL this way.
                const productForPost = products.find(p => p.id === productId0);

                const fbRes = await fetch(
                    `https://graph.facebook.com/v21.0/${fullSeller.facebookPageId}/photos`,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            url: productForPost?.imageUrl,
                            caption: `${productForPost?.name}\n\n₦${(productForPost?.price ?? 0).toLocaleString()}\n\nhttps://www.fairprice.ng/product/${productId0}`,
                            access_token: fullSeller.facebookPageAccessToken,
                        }),
                    }
                );
                const fbData = await fbRes.json();
                if (fbData.error) throw new Error(fbData.error.message || "Facebook rejected the post");

                const rawPostId: string = fbData.post_id || fbData.id || "";
                // createBoostCampaign rebuilds "<pageId>_<postId>", so strip any prefix.
                const barePostId = rawPostId.startsWith(`${fullSeller.facebookPageId}_`)
                    ? rawPostId.slice(`${fullSeller.facebookPageId}_`.length)
                    : rawPostId;

                const boost = await createBoostCampaign({
                    pageId: fullSeller.facebookPageId,
                    postId: barePostId,
                    platform: "facebook",
                    igUserId: fullSeller.instagramUserId || undefined,
                    budgetKobo: Math.round(adSpendNaira * 100),
                    days: tier.days,
                    credentials,
                });

                if (boost.success) {
                    metaResult = { attempted: true, ok: true, detail: `Live on Facebook${fullSeller.instagramUserId ? " and Instagram" : ""} for ${tier.days} days.` };
                    await db.adCampaign.create({
                        data: {
                            sellerId: seller.id,
                            productId: productId0,
                            platform: "facebook",
                            postId: barePostId,
                            budgetKobo: Math.round(adSpendNaira * 100),
                            markupPct: 0,
                            totalChargedKobo: Math.round((addOn?.priceNaira ?? 0) * 100),
                            days: tier.days,
                            // Same payment, distinct row — suffixed so the replay guard
                            // above still blocks a genuine second use of this reference.
                            paidReference: `${paystackReference}:meta`,
                            status: "active",
                            metaCampaignId: boost.campaignId,
                            metaAdSetId: boost.adSetId,
                            metaAdId: boost.adId,
                        },
                    }).catch(() => { /* bookkeeping only — the ad is live */ });
                } else {
                    metaResult.detail = boost.error || "Meta rejected the ad.";
                }
            }
        } catch (err: any) {
            metaResult.detail = err?.message || "Couldn't start the Facebook/Instagram ad.";
        }
    }

    return NextResponse.json({
        success: true,
        boostId: campaign.id,
        tier: tier.label,
        expiresAt: expiresAt.toISOString(),
        meta: metaResult.attempted ? metaResult : undefined,
        message:
            `Boost ${tier.label} ${tier.days}d has been activated successfully.` +
            (metaResult.attempted
                ? metaResult.ok
                    ? ` ${metaResult.detail}`
                    : ` Your FairPrice boost is live. The Facebook/Instagram part didn't start: ${metaResult.detail} Our team will sort it or refund that portion.`
                : ""),
    });
}
