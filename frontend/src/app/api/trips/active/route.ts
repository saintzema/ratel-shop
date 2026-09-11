import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/jwt";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/trips/active — the caller's single active ride OR delivery
 * (whichever exists), from whichever side they're on, for the site-wide
 * "trip in progress" bar. Deliberately light — just enough to render a
 * persistent status strip on every page, the closest a web app can get to
 * the OS-level live-activity strip without native ActivityKit code.
 */
export async function GET(req: NextRequest) {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ trip: null });

    const [ride, delivery] = await Promise.all([
        db.rideRequest.findFirst({
            where: { status: { in: ["matched", "in_progress"] }, OR: [{ riderId: user.userId }, { driverId: user.userId }] },
            select: {
                id: true, status: true, pickup: true, dropoff: true, agreedFare: true,
                riderId: true, driverId: true,
                rider: { select: { name: true } },
                driver: { select: { name: true } },
            },
            orderBy: { createdAt: "desc" },
        }),
        db.deliveryRequest.findFirst({
            where: { status: { in: ["matched", "picked_up"] }, OR: [{ senderId: user.userId }, { courierId: user.userId }] },
            select: {
                id: true, status: true, pickup: true, dropoff: true, agreedFare: true,
                senderId: true, courierId: true,
                sender: { select: { name: true } },
                courier: { select: { name: true } },
            },
            orderBy: { createdAt: "desc" },
        }),
    ]);

    if (ride) {
        const asRole = user.userId === ride.driverId ? "driver" : "rider";
        return NextResponse.json({
            trip: {
                id: ride.id, kind: "ride", status: ride.status, pickup: ride.pickup, dropoff: ride.dropoff, agreedFare: ride.agreedFare,
                asRole, otherPartyName: asRole === "driver" ? ride.rider?.name : ride.driver?.name,
            },
        });
    }
    if (delivery) {
        const asRole = user.userId === delivery.courierId ? "courier" : "sender";
        return NextResponse.json({
            trip: {
                id: delivery.id, kind: "delivery", status: delivery.status, pickup: delivery.pickup, dropoff: delivery.dropoff, agreedFare: delivery.agreedFare,
                asRole, otherPartyName: asRole === "courier" ? delivery.sender?.name : delivery.courier?.name,
            },
        });
    }
    return NextResponse.json({ trip: null });
}
