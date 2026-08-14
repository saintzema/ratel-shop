import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/jwt";
import { db } from "@/lib/db";
import { verifyPaystackTransaction } from "@/lib/paystack-verify";
import { createBoostCampaign, resolveMetaAdsCredentials } from "@/lib/meta-ads";

async function resolveSeller(userId: string, email?: string) {
    return db.seller.findFirst({
        where: { OR: [{ userId }, ...(email ? [{ ownerEmail: email }] : [])] },
        select: { id: true, facebookPageId: true, instagramUserId: true },
    });
}

/** GET /api/seller/facebook/promote — the seller's own boost history. */
export async function GET(req: NextRequest) {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const seller = await resolveSeller(user.userId, user.email);
    if (!seller) return NextResponse.json({ error: "No seller account" }, { status: 404 });

    const campaigns = await db.adCampaign.findMany({
        where: { sellerId: seller.id },
        orderBy: { createdAt: "desc" },
        take: 30,
    });

    // Hand back the authoritative markup so the client can price the boost with the
    // same number the POST handler will verify against. The composer used to hardcode
    // 20%: the moment an admin changed adsMarkupPct, the seller was charged the stale
    // amount, and then the server's "did you pay enough?" check rejected it — money
    // taken, no campaign, and a confusing error.
    const settings = await db.systemSetting.findUnique({
        where: { id: "global" },
        select: { adsMarkupPct: true },
    });

    return NextResponse.json({ campaigns, markupPct: settings?.adsMarkupPct ?? 20 });
}

/**
 * POST /api/seller/facebook/promote
 * { platform, postId, productId?, budgetNaira, days, paystackReference }
 *
 * The seller has ALREADY paid via a real Paystack charge (budgetNaira * (1 +
 * markup%), the composer/UI runs that charge before calling this) — this
 * route verifies that payment server-side before spending a naira with Meta.
 * A failed/unverified payment must never result in a live ad campaign.
 */
export async function POST(req: NextRequest) {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const seller = await resolveSeller(user.userId, user.email);
    if (!seller) return NextResponse.json({ error: "No seller account" }, { status: 404 });

    const credentials = await resolveMetaAdsCredentials();
    if (!credentials) {
        return NextResponse.json({ error: "Ad boosting isn't set up on our end yet — check back soon." }, { status: 503 });
    }

    const body = await req.json().catch(() => ({}));
    const { platform, postId, productId, budgetNaira, days, paystackReference } = body as {
        platform?: "facebook" | "instagram"; postId?: string; productId?: string;
        budgetNaira?: number; days?: number; paystackReference?: string;
    };

    if (!platform || !postId || !budgetNaira || budgetNaira <= 0 || !days || days <= 0 || !paystackReference) {
        return NextResponse.json({ error: "platform, postId, budgetNaira, days, and paystackReference are all required" }, { status: 400 });
    }
    if (platform === "facebook" && !seller.facebookPageId) {
        return NextResponse.json({ error: "Facebook Page not connected" }, { status: 400 });
    }
    if (platform === "instagram" && !seller.instagramUserId) {
        return NextResponse.json({ error: "Instagram not connected" }, { status: 400 });
    }

    // ─── Ownership of the post being boosted ───
    // Previously this only checked that the seller HAD a connected FB/IG account,
    // never that `postId` was theirs. Because boosting runs on FairPrice's own ad
    // credentials (resolveMetaAdsCredentials below), any seller could pay to boost
    // any other seller's post just by passing its id.
    if (platform === "instagram") {
        const ownsPost = await db.instagramPost.findFirst({
            where: { sellerId: seller.id, mediaId: postId },
            select: { id: true },
        });
        if (!ownsPost) {
            return NextResponse.json(
                { error: "That post doesn't belong to your store — nothing was charged or created." },
                { status: 403 }
            );
        }
    } else {
        // Facebook Page posts come back from the publish route as "<pageId>_<postId>".
        // Require that prefix to match the Page this seller actually connected — it's
        // the only ownership signal a bare post id carries.
        if (!postId.startsWith(`${seller.facebookPageId}_`)) {
            return NextResponse.json(
                { error: "That post doesn't belong to your connected Page — nothing was charged or created." },
                { status: 403 }
            );
        }
    }

    // meta-ads.ts rebuilds object_story_id as `${pageId}_${postId}`, so hand it the
    // BARE post id — passing the already-prefixed form through would produce
    // "pageId_pageId_postId" and Meta would reject the creative.
    const barePostId =
        platform === "facebook" && seller.facebookPageId
            ? postId.slice(`${seller.facebookPageId}_`.length)
            : postId;

    // ─── Payment-reference replay guard ───
    // A Paystack reference verifies as "success" every time it's checked, so
    // without this the same single payment could be POSTed repeatedly to spin up
    // unlimited campaigns off one charge.
    const alreadyUsed = await db.adCampaign.findFirst({
        where: { paidReference: paystackReference },
        select: { id: true },
    });
    if (alreadyUsed) {
        return NextResponse.json(
            { error: "This payment reference has already been used for another campaign." },
            { status: 409 }
        );
    }

    const settings = await db.systemSetting.findUnique({ where: { id: "global" }, select: { adsMarkupPct: true } });
    const markupPct = settings?.adsMarkupPct ?? 20;
    const budgetKobo = Math.round(budgetNaira * 100);
    const totalChargedKobo = Math.round(budgetKobo * (1 + markupPct / 100));

    // Verify the payment BEFORE creating the DB record or touching Meta —
    // never trust a client-supplied "I paid" without checking Paystack directly.
    const verify = await verifyPaystackTransaction(paystackReference);
    if (!verify.ok || verify.tx.status !== "success") {
        return NextResponse.json({ error: "Payment could not be verified — no campaign was created." }, { status: 402 });
    }
    if (verify.tx.amount !== null && verify.tx.amount < totalChargedKobo) {
        return NextResponse.json({ error: `Charged amount (${verify.tx.amount}) is less than the required total (${totalChargedKobo}) — no campaign was created.` }, { status: 402 });
    }

    const campaign = await db.adCampaign.create({
        data: {
            sellerId: seller.id,
            productId: productId || null,
            platform,
            postId,
            budgetKobo,
            markupPct,
            totalChargedKobo,
            days,
            paidReference: paystackReference,
            status: "pending",
        },
    });

    const result = await createBoostCampaign({
        pageId: seller.facebookPageId || "",
        postId: barePostId,
        platform,
        igUserId: seller.instagramUserId || undefined,
        budgetKobo,
        days,
        credentials,
    });

    await db.adCampaign.update({
        where: { id: campaign.id },
        data: result.success
            ? { status: "active", metaCampaignId: result.campaignId, metaAdSetId: result.adSetId, metaAdId: result.adId }
            : { status: "failed", failureReason: result.error },
    });

    if (!result.success) {
        // The seller already paid (verified above) but the campaign didn't go
        // live — this needs a real refund, not a silent loss. Flagging clearly
        // rather than pretending everything's fine.
        return NextResponse.json({
            error: `Payment was received but the ad campaign couldn't be created: ${result.error}. This needs a manual refund — contact support with reference ${paystackReference}.`,
        }, { status: 502 });
    }

    return NextResponse.json({ success: true, campaignId: campaign.id });
}
