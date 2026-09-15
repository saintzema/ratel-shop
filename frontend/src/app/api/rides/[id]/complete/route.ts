import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/jwt";
import { db } from "@/lib/db";
import { notifyUser } from "@/lib/user-notify";

export const dynamic = "force-dynamic";

/**
 * POST /api/rides/[id]/complete — the DRIVER slides to end the trip;
 * in_progress → completed.
 *
 * The driver's own screen renders a QR/link straight to /ride/[id]/pay right
 * after this call succeeds (see the SlideToConfirm flow on /drive/dashboard)
 * so the rider can scan and pay in-app instead of settling cash-in-hand —
 * the rider is also notified here with that same link, and /ride
 * auto-navigates them there if they're actively on the app.
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
            `✅ Trip completed: ${ride.pickup} → ${ride.dropoff}. Pay ₦${ride.agreedFare?.toLocaleString()} now to close out your trip.`,
            { type: "system", link: `/ride/${rideId}/pay` }
        );
    }

    return NextResponse.json({ success: true });
}
