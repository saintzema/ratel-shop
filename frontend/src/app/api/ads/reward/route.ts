import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserFromRequest } from "@/lib/jwt";
import { AD_CONFIG } from "@/lib/ad-config";

export const runtime = "nodejs";

// POST /api/ads/reward — issue a small platform-funded discount credit after
// a buyer completes a rewarded ad view. This trusts a client-reported
// "I watched it" event for now (no AdMob account exists yet to receive
// AdMob's server-side verification callback, which is the real anti-fraud
// mechanism). The 24h-per-user cooldown below is the interim abuse guard —
// swap this for real SSV once AdMob is configured, since a client call alone
// can be replayed without ever actually watching an ad.
export async function POST(request: Request) {
    try {
        const user = getUserFromRequest(request);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const cooldownStart = new Date(Date.now() - AD_CONFIG.rewardedAd.cooldownHours * 60 * 60 * 1000);
        const recent = await db.adRewardCredit.findFirst({
            where: { userId: user.userId, createdAt: { gte: cooldownStart } },
        });
        if (recent) {
            const nextEligible = new Date(recent.createdAt.getTime() + AD_CONFIG.rewardedAd.cooldownHours * 60 * 60 * 1000);
            return NextResponse.json(
                { error: "You've already claimed a reward recently.", nextEligibleAt: nextEligible.toISOString() },
                { status: 429 }
            );
        }

        const credit = await db.adRewardCredit.create({
            data: {
                userId: user.userId,
                amount: AD_CONFIG.rewardedAd.creditAmount,
                source: "rewarded_ad",
                status: "active",
                expiresAt: new Date(Date.now() + AD_CONFIG.rewardedAd.creditValidityHours * 60 * 60 * 1000),
            },
        });

        return NextResponse.json({ success: true, credit });
    } catch (error: any) {
        console.error("[ads/reward] error:", error);
        return NextResponse.json({ error: "Failed to issue reward" }, { status: 500 });
    }
}

// PATCH /api/ads/reward — redeem an active credit against a placed order.
// Verifies ownership + that it's still active/unexpired server-side rather
// than trusting the client's word that it was actually applied — a buyer
// can't redeem someone else's credit or reuse an already-spent one by
// replaying this call.
export async function PATCH(request: Request) {
    try {
        const user = getUserFromRequest(request);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const body = await request.json();
        const { creditId, orderId } = body;
        if (!creditId || !orderId) {
            return NextResponse.json({ error: "creditId and orderId are required" }, { status: 400 });
        }

        const credit = await db.adRewardCredit.findUnique({ where: { id: creditId } });
        if (!credit || credit.userId !== user.userId) {
            return NextResponse.json({ error: "Credit not found" }, { status: 404 });
        }
        if (credit.status !== "active" || credit.expiresAt < new Date()) {
            return NextResponse.json({ error: "Credit is no longer active" }, { status: 409 });
        }

        const updated = await db.adRewardCredit.update({
            where: { id: creditId },
            data: { status: "redeemed", redeemedOrderId: orderId, redeemedAt: new Date() },
        });

        return NextResponse.json({ success: true, credit: updated });
    } catch (error: any) {
        console.error("[ads/reward] PATCH error:", error);
        return NextResponse.json({ error: "Failed to redeem reward" }, { status: 500 });
    }
}

// GET /api/ads/reward — the buyer's current active, unexpired credit (if any).
export async function GET(request: Request) {
    try {
        const user = getUserFromRequest(request);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const credit = await db.adRewardCredit.findFirst({
            where: { userId: user.userId, status: "active", expiresAt: { gt: new Date() } },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json({ success: true, credit: credit || null });
    } catch (error: any) {
        console.error("[ads/reward] GET error:", error);
        return NextResponse.json({ error: "Failed to fetch reward status" }, { status: 500 });
    }
}
