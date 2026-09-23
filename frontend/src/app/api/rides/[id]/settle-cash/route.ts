import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserFromRequest } from "@/lib/jwt";
import { recordCommission, outstandingCommission, MAX_OUTSTANDING_COMMISSION } from "@/lib/mobility-commission";
import { notifyUser } from "@/lib/user-notify";

export const dynamic = "force-dynamic";

/**
 * POST /api/rides/[id]/settle-cash — the DRIVER confirms the rider paid the
 * fare in cash.
 *
 * This is the half of the business model that in-app payment can't cover, and
 * in Nigeria it's the larger half. The fare never passes through FairPrice, so
 * there's no transfer to net a commission out of — instead the commission is
 * booked against the driver, exactly as Bolt and inDrive do, and cleared from
 * their later in-app earnings or by settling up.
 *
 * Only the assigned driver can call it: the rider marking their own ride
 * "paid in cash" would be a free ride with a commission bill attached to
 * someone else.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: rideId } = await params;
    const ride = await db.rideRequest.findUnique({ where: { id: rideId } });
    if (!ride) return NextResponse.json({ error: "Ride not found" }, { status: 404 });
    if (ride.driverId !== user.userId) {
        return NextResponse.json({ error: "Only the driver on this trip can record a cash payment" }, { status: 403 });
    }
    if (!ride.agreedFare) return NextResponse.json({ error: "This ride has no agreed fare" }, { status: 400 });
    if (ride.paidAt) return NextResponse.json({ success: true, alreadyPaid: true });

    const split = await recordCommission({
        driverId: user.userId, jobType: "ride", jobId: rideId,
        fare: ride.agreedFare, settled: false, note: "Paid in cash to driver",
    });

    const updated = await db.rideRequest.update({
        where: { id: rideId },
        data: { paidAt: new Date(), status: "completed" },
    });

    const owed = await outstandingCommission(user.userId);
    await notifyUser(user.userId,
        `You kept ₦${ride.agreedFare.toLocaleString()} cash for ${ride.pickup} → ${ride.dropoff}. Service fee of ₦${split.commission.toLocaleString()} (${split.ratePct}%) added to your balance — ₦${owed.toLocaleString()} outstanding.`,
        { type: "system", link: "/drive/dashboard" },
    ).catch(() => {});

    return NextResponse.json({
        success: true,
        ride: updated,
        commission: split.commission,
        ratePct: split.ratePct,
        outstanding: owed,
        blocked: owed > MAX_OUTSTANDING_COMMISSION,
        limit: MAX_OUTSTANDING_COMMISSION,
    });
}
