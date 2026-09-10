import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/jwt";
import { db } from "@/lib/db";
import { notifyUser } from "@/lib/user-notify";

export const dynamic = "force-dynamic";

/**
 * POST /api/rides/[id]/complete — the DRIVER confirms drop-off; in_progress → completed.
 *
 * No fare collection happens here — there's no in-app ride-payment pipeline
 * yet, so the agreed fare is settled directly between rider and driver
 * (cash, transfer, whatever they arrange). This only closes out the trip
 * record and opens rating.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: rideId } = await params;
    const { count } = await db.rideRequest.updateMany({
        where: { id: rideId, driverId: user.userId, status: "in_progress" },
        data: { status: "completed", completedAt: new Date() },
    });
    if (count === 0) {
        return NextResponse.json({ error: "This ride can't be completed (not yours, or not in progress)" }, { status: 400 });
    }

    const ride = await db.rideRequest.findUnique({ where: { id: rideId }, select: { riderId: true, agreedFare: true, pickup: true, dropoff: true } });
    if (ride) {
        await notifyUser(ride.riderId,
            `✅ Trip completed: ${ride.pickup} → ${ride.dropoff}. Please settle ₦${ride.agreedFare?.toLocaleString()} with your driver if you haven't, and rate your trip.`,
            { type: "system", link: "/ride" }
        );
    }

    return NextResponse.json({ success: true });
}
