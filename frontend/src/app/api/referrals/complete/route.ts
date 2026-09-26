import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserFromRequest } from "@/lib/jwt";
import { notifyUser } from "@/lib/user-notify";

export const dynamic = "force-dynamic";

// Both sides get the same thing — the friend who invited, and the friend who
// joined. NOT exported: a Next.js route file may only export its handlers and
// a fixed set of config names, and an extra export fails the production build
// (dev is lenient about it, so tsc is the only thing that catches it).
const REFERRAL_CREDIT = 2000;
const CREDIT_VALIDITY_DAYS = 90;

/**
 * POST /api/referrals/complete  { referrerCode }
 *
 * Pays out a referral once the invited buyer completes their first order.
 *
 * This used to run entirely in the checkout page: it base64-decoded the code
 * in the browser, wrote a coupon through the local sync store, and paid only
 * the REFERRER — while the referrals page promised "you both get ₦2,000". The
 * invited friend got nothing, which is why nobody could work out what the
 * link was for.
 *
 * Now both sides get ₦2,000 of FairPrice credit, and it is decided on the
 * server: a client cannot mint credit by posting a code, because the payout
 * requires this caller to be a real signed-in user whose FIRST order has
 * actually been placed, and each side is written once.
 */
export async function POST(req: NextRequest) {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const rawCode = String(body?.referrerCode || "").trim();
    if (!rawCode) return NextResponse.json({ error: "referrerCode is required" }, { status: 400 });

    // The link carries the referrer's id, base64-encoded.
    let referrerId = "";
    try {
        referrerId = Buffer.from(rawCode, "base64").toString("utf8").trim();
    } catch {
        return NextResponse.json({ error: "Invalid referral code" }, { status: 400 });
    }
    if (!referrerId) return NextResponse.json({ error: "Invalid referral code" }, { status: 400 });
    // Inviting yourself is the first thing anyone tries.
    if (referrerId === user.userId) {
        return NextResponse.json({ error: "You can't refer yourself" }, { status: 400 });
    }

    const referrer = await db.user.findUnique({ where: { id: referrerId }, select: { id: true } }).catch(() => null);
    if (!referrer) return NextResponse.json({ error: "Referrer not found" }, { status: 404 });

    // The reward is for a REAL first order, checked here rather than taken on
    // trust from whatever the checkout page says it just did.
    const orderCount = await db.order.count({ where: { customerId: user.userId } }).catch(() => 0);
    if (orderCount < 1) {
        return NextResponse.json({ error: "No completed order on this account yet" }, { status: 409 });
    }

    // One payout per invited buyer, ever — keyed by this user's own id so a
    // replayed request, or a second order, cannot pay twice.
    const source = `referral:${user.userId}`;
    const already = await db.adRewardCredit.findFirst({ where: { source }, select: { id: true } }).catch(() => null);
    if (already) return NextResponse.json({ success: true, alreadyPaid: true });

    const expiresAt = new Date(Date.now() + CREDIT_VALIDITY_DAYS * 86_400_000);
    await db.adRewardCredit.createMany({
        data: [
            { userId: referrerId, amount: REFERRAL_CREDIT, source, status: "active", expiresAt },
            { userId: user.userId, amount: REFERRAL_CREDIT, source, status: "active", expiresAt },
        ],
    });

    await Promise.all([
        notifyUser(referrerId,
            `🎁 Your friend just placed their first order — ₦${REFERRAL_CREDIT.toLocaleString()} credit added to your account.`,
            { type: "system", link: "/rewards" }).catch(() => {}),
        notifyUser(user.userId,
            `🎁 Referral bonus: ₦${REFERRAL_CREDIT.toLocaleString()} credit added to your account. Spend it on your next order, ride or delivery.`,
            { type: "system", link: "/rewards" }).catch(() => {}),
    ]);

    return NextResponse.json({ success: true, credited: REFERRAL_CREDIT, bothSides: true });
}
