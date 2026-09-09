import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/jwt";
import { db } from "@/lib/db";
import { notifyUser } from "@/lib/user-notify";
import { acceptRideOffer } from "@/lib/ride-accept";

export const dynamic = "force-dynamic";

/** POST /api/rides/[id]/offers — an approved driver counters with their own price. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Sign in to send an offer" }, { status: 401 });

    const { id: rideId } = await params;
    const body = await req.json().catch(() => ({}));
    const { vehicleId, offeredFare, message } = body || {};

    const fare = Number(offeredFare);
    if (!fare || fare <= 0) {
        return NextResponse.json({ error: "Enter the fare you're offering" }, { status: 400 });
    }

    const [ride, vehicle] = await Promise.all([
        db.rideRequest.findUnique({ where: { id: rideId } }),
        db.vehicle.findUnique({ where: { id: vehicleId } }),
    ]);
    if (!ride || ride.status !== "searching") {
        return NextResponse.json({ error: "This ride is no longer open for offers" }, { status: 400 });
    }
    if (ride.riderId === user.userId) {
        return NextResponse.json({ error: "You cannot offer on your own ride request" }, { status: 400 });
    }
    if (!vehicle || vehicle.driverId !== user.userId || vehicle.status !== "approved") {
        return NextResponse.json({ error: "You need an approved vehicle to send offers" }, { status: 403 });
    }
    if (ride.vehicleClassPref && ride.vehicleClassPref !== vehicle.vehicleClass) {
        return NextResponse.json({ error: "This rider asked for a different vehicle class" }, { status: 400 });
    }

    const offer = await db.rideOffer.upsert({
        where: { rideRequestId_driverId: { rideRequestId: rideId, driverId: user.userId } },
        update: { offeredFare: fare, vehicleId, message: message || null, status: "pending" },
        create: { rideRequestId: rideId, driverId: user.userId, vehicleId, offeredFare: fare, message: message || null },
    });

    // "Auto-accept up to ₦X" — a rider who already set a ceiling doesn't have
    // to babysit the request; the first qualifying offer just wins.
    if (ride.autoAcceptMax && fare <= ride.autoAcceptMax) {
        try {
            const { conversationId } = await acceptRideOffer(rideId, offer.id);
            // acceptRideOffer only notifies the driver (the rider is the one
            // who clicks Accept in the manual flow, so they already know) —
            // on auto-accept the rider isn't actively watching, so tell them too.
            await notifyUser(ride.riderId,
                `✅ Auto-accepted a ₦${fare.toLocaleString()} offer for your ride from ${ride.pickup} to ${ride.dropoff}.`,
                { type: "system", link: "/ride" }
            );
            return NextResponse.json({ success: true, offer, autoAccepted: true, conversationId });
        } catch {
            // Fall through to the normal pending-offer path if accept somehow failed.
        }
    }

    await notifyUser(ride.riderId,
        `🚗 A driver offered ₦${fare.toLocaleString()} for your ride from ${ride.pickup} to ${ride.dropoff}.`,
        { type: "system", link: "/ride" }
    );

    return NextResponse.json({ success: true, offer });
}
