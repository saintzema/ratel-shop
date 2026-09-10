import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/jwt";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * POST /api/rides/[id]/location  { lat, lng }  — the caller's own live position.
 * GET  /api/rides/[id]/location                — both parties' last known positions.
 *
 * Only the rider or driver on THIS specific ride may read or write its
 * location — a ride's location is exactly the kind of thing that leaks a
 * home address if it isn't scoped tightly.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: rideId } = await params;
    const body = await req.json().catch(() => ({}));
    const lat = Number(body?.lat);
    const lng = Number(body?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return NextResponse.json({ error: "lat/lng required" }, { status: 400 });
    }

    const ride = await db.rideRequest.findUnique({ where: { id: rideId }, select: { riderId: true, driverId: true, status: true } });
    if (!ride) return NextResponse.json({ error: "Ride not found" }, { status: 404 });
    if (ride.status !== "matched" && ride.status !== "in_progress") {
        return NextResponse.json({ error: "This ride isn't active" }, { status: 400 });
    }

    const now = new Date();
    if (user.userId === ride.riderId) {
        await db.rideRequest.update({ where: { id: rideId }, data: { riderLat: lat, riderLng: lng, riderLocationAt: now } });
    } else if (user.userId === ride.driverId) {
        await db.rideRequest.update({ where: { id: rideId }, data: { driverLat: lat, driverLng: lng, driverLocationAt: now } });
    } else {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ success: true });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: rideId } = await params;
    const ride = await db.rideRequest.findUnique({
        where: { id: rideId },
        select: {
            riderId: true, driverId: true,
            driverLat: true, driverLng: true, driverLocationAt: true,
            riderLat: true, riderLng: true, riderLocationAt: true,
        },
    });
    if (!ride) return NextResponse.json({ error: "Ride not found" }, { status: 404 });
    if (user.userId !== ride.riderId && user.userId !== ride.driverId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({
        driver: ride.driverLat != null ? { lat: ride.driverLat, lng: ride.driverLng, at: ride.driverLocationAt } : null,
        rider: ride.riderLat != null ? { lat: ride.riderLat, lng: ride.riderLng, at: ride.riderLocationAt } : null,
    });
}
