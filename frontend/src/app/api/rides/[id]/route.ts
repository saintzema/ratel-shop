import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/jwt";
import { db } from "@/lib/db";
import { notifyUser } from "@/lib/user-notify";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/rides/[id]
 *   { proposedFare }  — rider raises their offer to attract more drivers.
 *   { autoAcceptMax } — rider sets/changes their auto-accept ceiling.
 *   { status: "cancelled", cancelReason }
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: rideId } = await params;
    const ride = await db.rideRequest.findUnique({ where: { id: rideId } });
    if (!ride) return NextResponse.json({ error: "Ride not found" }, { status: 404 });
    if (ride.riderId !== user.userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const data: any = {};

    if (body.status === "cancelled") {
        if (ride.status === "completed") return NextResponse.json({ error: "This ride is already complete" }, { status: 400 });
        data.status = "cancelled";
        data.cancelReason = body.cancelReason ? String(body.cancelReason).slice(0, 200) : null;
        if (ride.driverId) {
            await notifyUser(ride.driverId, `The rider cancelled the trip from ${ride.pickup} to ${ride.dropoff}.`, { type: "system" });
        }
    } else {
        if (ride.status !== "searching") {
            return NextResponse.json({ error: "This ride already has a driver" }, { status: 400 });
        }
        if (body.proposedFare !== undefined) {
            const fare = Number(body.proposedFare);
            if (!fare || fare <= 0) return NextResponse.json({ error: "Enter a valid fare" }, { status: 400 });
            data.proposedFare = fare;
        }
        if (body.autoAcceptMax !== undefined) {
            data.autoAcceptMax = body.autoAcceptMax ? Number(body.autoAcceptMax) : null;
        }
    }

    const updated = await db.rideRequest.update({ where: { id: rideId }, data });
    return NextResponse.json({ success: true, ride: updated });
}
