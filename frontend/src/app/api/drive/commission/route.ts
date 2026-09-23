import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserFromRequest } from "@/lib/jwt";
import { outstandingCommission, commissionRates, MAX_OUTSTANDING_COMMISSION } from "@/lib/mobility-commission";

export const dynamic = "force-dynamic";

/**
 * GET /api/drive/commission — a driver's own service-fee statement: what they
 * owe from cash jobs, what's already been netted out of in-app payouts, and
 * the recent lines behind both.
 */
export async function GET(req: NextRequest) {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [owed, rates, recent, settledTotal] = await Promise.all([
        outstandingCommission(user.userId),
        commissionRates(),
        db.driverCommissionCharge.findMany({
            where: { driverId: user.userId },
            orderBy: { createdAt: "desc" },
            take: 50,
        }),
        db.driverCommissionCharge.aggregate({
            where: { driverId: user.userId, status: { in: ["settled", "paid"] } },
            _sum: { amount: true },
        }),
    ]);

    return NextResponse.json({
        outstanding: owed,
        limit: MAX_OUTSTANDING_COMMISSION,
        blocked: owed > MAX_OUTSTANDING_COMMISSION,
        lifetimeSettled: Math.round(settledTotal._sum.amount ?? 0),
        rates,
        charges: recent,
    });
}
