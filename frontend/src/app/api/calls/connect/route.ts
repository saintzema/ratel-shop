import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/jwt";
import { db } from "@/lib/db";
import { hasCallMaskingConfig, toE164, signCallToken, placeMaskedCall } from "@/lib/call-masking";

export const dynamic = "force-dynamic";

/**
 * POST /api/calls/connect  { kind: "ride"|"delivery", tripId }
 *
 * Places a masked call between the two parties on an active ride or
 * delivery: rings the CALLER's own phone first, and once they pick up,
 * Twilio's webhook (/api/calls/twiml) bridges them to the other party's
 * real number — neither side ever sees the other's actual digits.
 */
export async function POST(req: NextRequest) {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!hasCallMaskingConfig) {
        return NextResponse.json({ error: "Calling isn't set up yet — message instead for now." }, { status: 503 });
    }

    const body = await req.json().catch(() => ({}));
    const { kind, tripId } = body || {};
    if (!["ride", "delivery"].includes(kind) || !tripId) {
        return NextResponse.json({ error: "kind and tripId are required" }, { status: 400 });
    }

    let callerId: string, otherPartyId: string | null, isActive: boolean;

    if (kind === "ride") {
        const ride = await db.rideRequest.findUnique({ where: { id: tripId }, select: { riderId: true, driverId: true, status: true } });
        if (!ride) return NextResponse.json({ error: "Ride not found" }, { status: 404 });
        if (user.userId !== ride.riderId && user.userId !== ride.driverId) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        callerId = user.userId;
        otherPartyId = user.userId === ride.riderId ? ride.driverId : ride.riderId;
        isActive = ride.status === "matched" || ride.status === "in_progress";
    } else {
        const delivery = await db.deliveryRequest.findUnique({ where: { id: tripId }, select: { senderId: true, courierId: true, status: true } });
        if (!delivery) return NextResponse.json({ error: "Delivery not found" }, { status: 404 });
        if (user.userId !== delivery.senderId && user.userId !== delivery.courierId) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        callerId = user.userId;
        otherPartyId = user.userId === delivery.senderId ? delivery.courierId : delivery.senderId;
        isActive = delivery.status === "matched" || delivery.status === "picked_up";
    }

    if (!isActive) return NextResponse.json({ error: "This trip isn't active" }, { status: 400 });
    if (!otherPartyId) return NextResponse.json({ error: "No one matched yet" }, { status: 400 });

    const [caller, otherParty] = await Promise.all([
        db.user.findUnique({ where: { id: callerId }, select: { whatsappNumber: true } }),
        db.user.findUnique({ where: { id: otherPartyId }, select: { whatsappNumber: true } }),
    ]);

    const callerE164 = caller?.whatsappNumber ? toE164(caller.whatsappNumber) : null;
    const targetE164 = otherParty?.whatsappNumber ? toE164(otherParty.whatsappNumber) : null;
    if (!callerE164) {
        return NextResponse.json({ error: "Add your phone number in Profile to enable calling" }, { status: 400 });
    }
    if (!targetE164) {
        return NextResponse.json({ error: "The other party hasn't added a phone number yet" }, { status: 400 });
    }

    const token = signCallToken({ targetE164, tripKind: kind, tripId });
    const origin = req.nextUrl.origin;
    const result = await placeMaskedCall(callerE164, `${origin}/api/calls/twiml?t=${encodeURIComponent(token)}`);

    if (!result.success) {
        return NextResponse.json({ error: result.error || "Couldn't place the call" }, { status: 502 });
    }
    return NextResponse.json({ success: true });
}
