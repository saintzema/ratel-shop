import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/jwt";
import { db } from "@/lib/db";
import { notifyUser } from "@/lib/user-notify";

export const dynamic = "force-dynamic";

/**
 * POST /api/rides/[id]/start — the DRIVER confirms pickup happened; matched → in_progress.
 *
 * Requires the last 2 digits of the rider's pickup code (the rider reads it
 * out — "Ride Code: 1234" shown on their screen), same verification AMap/
 * inDrive use so a driver can't tap "picked up" for whoever's standing
 * nearby rather than their actual matched rider.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: rideId } = await params;
    const body = await req.json().catch(() => ({}));
    const codeEntered = String(body?.code || "").trim();

    const existing = await db.rideRequest.findUnique({ where: { id: rideId }, select: { driverId: true, status: true, pickupCode: true } });
    if (!existing || existing.driverId !== user.userId || existing.status !== "matched") {
        return NextResponse.json({ error: "This ride can't be started (not yours, or already in progress)" }, { status: 400 });
    }
    if (existing.pickupCode && codeEntered !== existing.pickupCode.slice(-2)) {
        return NextResponse.json({ error: "That doesn't match the rider's pickup code — ask them to read out the last 2 digits again" }, { status: 400 });
    }

    const { count } = await db.rideRequest.updateMany({
        where: { id: rideId, driverId: user.userId, status: "matched" },
        data: { status: "in_progress", startedAt: new Date() },
    });
    if (count === 0) {
        return NextResponse.json({ error: "This ride can't be started (not yours, or already in progress)" }, { status: 400 });
    }

    const ride = await db.rideRequest.findUnique({ where: { id: rideId }, select: { riderId: true, pickup: true, dropoff: true } });
    if (ride) {
        await notifyUser(ride.riderId, `🚗 Your trip from ${ride.pickup} to ${ride.dropoff} has started.`, { type: "system", link: "/ride" });
    }

    return NextResponse.json({ success: true });
}
