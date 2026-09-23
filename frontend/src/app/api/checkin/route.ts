import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserFromRequest } from "@/lib/jwt";
import {
    CHECKIN_SOURCE, CHECKIN_CREDIT_VALIDITY_DAYS, CHECKIN_LADDER,
    deriveCheckinState, lagosDayKey, monthlyCeiling,
} from "@/lib/checkin";

export const dynamic = "force-dynamic";

const LOOKBACK_DAYS = 60;

async function loadState(userId: string) {
    const since = new Date(Date.now() - LOOKBACK_DAYS * 86_400_000);
    const [claims, balance] = await Promise.all([
        db.adRewardCredit.findMany({
            where: { userId, source: CHECKIN_SOURCE, createdAt: { gte: since } },
            select: { createdAt: true },
            orderBy: { createdAt: "desc" },
        }),
        db.adRewardCredit.aggregate({
            where: { userId, status: "active", expiresAt: { gt: new Date() } },
            _sum: { amount: true },
        }),
    ]);
    return {
        state: deriveCheckinState(claims.map(c => c.createdAt)),
        spendableBalance: balance._sum.amount ?? 0,
    };
}

/** GET /api/checkin — streak, whether today is claimed, and the credit balance. */
export async function GET(req: NextRequest) {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { state, spendableBalance } = await loadState(user.userId);
    return NextResponse.json({
        ...state, spendableBalance,
        ladder: CHECKIN_LADDER,
        monthlyCeiling: monthlyCeiling(),
    });
}

/**
 * POST /api/checkin — claim today's credit.
 *
 * The "already claimed today" check is done against the ledger in Lagos time,
 * server-side. A replayed request is a no-op, not a second payout: the client
 * is never trusted for either the date or the amount, and the amount is
 * derived from the streak the ledger proves rather than anything posted.
 */
export async function POST(req: NextRequest) {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { state } = await loadState(user.userId);
    if (state.claimedToday) {
        return NextResponse.json(
            { error: "You've already checked in today. Come back tomorrow.", ...state },
            { status: 409 },
        );
    }

    const amount = state.nextReward;
    if (!(amount > 0)) {
        return NextResponse.json({ error: "No reward available right now" }, { status: 409 });
    }

    await db.adRewardCredit.create({
        data: {
            userId: user.userId,
            amount,
            source: CHECKIN_SOURCE,
            status: "active",
            expiresAt: new Date(Date.now() + CHECKIN_CREDIT_VALIDITY_DAYS * 86_400_000),
        },
    });

    // Re-derived rather than incremented, so what comes back is what the
    // ledger actually says — no chance of the UI and the balance disagreeing.
    const fresh = await loadState(user.userId);
    return NextResponse.json({
        success: true,
        awarded: amount,
        day: lagosDayKey(new Date()),
        ...fresh.state,
        spendableBalance: fresh.spendableBalance,
    });
}
