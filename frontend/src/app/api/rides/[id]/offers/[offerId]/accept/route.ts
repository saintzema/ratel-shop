import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/jwt";
import { db } from "@/lib/db";
import { acceptRideOffer } from "@/lib/ride-accept";

export const dynamic = "force-dynamic";

/** POST /api/rides/[id]/offers/[offerId]/accept — the RIDER picks one offer. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; offerId: string }> }) {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: rideId, offerId } = await params;

    const ride = await db.rideRequest.findUnique({ where: { id: rideId } });
    if (!ride) return NextResponse.json({ error: "Ride not found" }, { status: 404 });
    if (ride.riderId !== user.userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (ride.status !== "searching") return NextResponse.json({ error: "This ride already has a driver" }, { status: 400 });

    try {
        const { conversationId } = await acceptRideOffer(rideId, offerId);
        return NextResponse.json({ success: true, conversationId });
    } catch (e: any) {
        return NextResponse.json({ error: e.message || "Could not accept this offer" }, { status: 400 });
    }
}
