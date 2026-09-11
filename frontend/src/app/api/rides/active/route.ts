import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/jwt";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/rides/active — the caller's single active ride (matched or
 * in_progress), from whichever side they're on, for the site-wide "trip in
 * progress" bar. Deliberately light: no offers, no full history — just
 * enough to render a persistent status strip on every page, the closest a
 * web app can get to the OS-level live-activity strip without native code.
 */
export async function GET(req: NextRequest) {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ ride: null });

    const ride = await db.rideRequest.findFirst({
        where: {
            status: { in: ["matched", "in_progress"] },
            OR: [{ riderId: user.userId }, { driverId: user.userId }],
        },
        select: {
            id: true, status: true, pickup: true, dropoff: true, agreedFare: true,
            riderId: true, driverId: true,
            rider: { select: { name: true } },
            driver: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
    });

    if (!ride) return NextResponse.json({ ride: null });

    const asRole = user.userId === ride.driverId ? "driver" : "rider";
    return NextResponse.json({
        ride: {
            id: ride.id,
            status: ride.status,
            pickup: ride.pickup,
            dropoff: ride.dropoff,
            agreedFare: ride.agreedFare,
            asRole,
            otherPartyName: asRole === "driver" ? ride.rider?.name : ride.driver?.name,
        },
    });
}
