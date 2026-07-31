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
    return NextResponse.json({ campaigns });
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
        postId,
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
