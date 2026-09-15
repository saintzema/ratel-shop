import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/jwt";
import { db } from "@/lib/db";
import { verifyPaystackTransaction } from "@/lib/paystack-verify";
import { notifyUser } from "@/lib/user-notify";
import { notifyAdmins } from "@/lib/admin-notify";
import { transferRideFareToDriver } from "@/lib/ride-payout";

export const dynamic = "force-dynamic";

/**
 * GET /api/rides/[id]/pay — trip summary for the checkout page (rider only).
 * POST /api/rides/[id]/pay  { reference } — the RIDER pays the agreed fare.
 *
 * Unlike a delivery (paid into escrow, released on drop-off), a ride is
 * already over by the time this runs — the driver only renders the QR/link
 * after sliding to end the trip — so a verified payment routes straight to
 * an instant Paystack transfer to the driver's payout bank details. No
 * escrow hold, no separate "release" step.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: rideId } = await params;
    const ride = await db.rideRequest.findUnique({
        where: { id: rideId },
        include: { driver: { select: { name: true } } },
    });
    if (!ride) return NextResponse.json({ error: "Ride not found" }, { status: 404 });
    if (ride.riderId !== user.userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    return NextResponse.json({
        ride: {
            id: ride.id,
            pickup: ride.pickup,
            dropoff: ride.dropoff,
            agreedFare: ride.agreedFare,
            status: ride.status,
            paidAt: ride.paidAt,
            driverName: ride.driver?.name,
        },
    });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: rideId } = await params;
    const body = await req.json().catch(() => ({}));
    const reference = String(body?.reference || "").trim();
    if (!reference) return NextResponse.json({ error: "reference is required" }, { status: 400 });

    const ride = await db.rideRequest.findUnique({ where: { id: rideId } });
    if (!ride) return NextResponse.json({ error: "Ride not found" }, { status: 404 });
    if (ride.riderId !== user.userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (!ride.agreedFare) return NextResponse.json({ error: "This ride has no agreed fare" }, { status: 400 });

    if (ride.paidAt) {
        return NextResponse.json({ success: true, ride, alreadyPaid: true });
    }

    const existingByRef = await db.rideRequest.findUnique({ where: { paymentReference: reference } });
    if (existingByRef) {
        return NextResponse.json({ success: true, ride: existingByRef, alreadyPaid: true });
    }

    const result = await verifyPaystackTransaction(reference);
    if (!result.ok || result.tx.status !== "success") {
        return NextResponse.json({ error: "Payment could not be verified" }, { status: 402 });
    }

    const paidKobo = result.tx.amount || 0;
    const expectedKobo = Math.round(ride.agreedFare * 100);
    if (paidKobo < expectedKobo) {
        return NextResponse.json({ error: `Amount paid (₦${(paidKobo / 100).toLocaleString()}) is less than the agreed fare (₦${ride.agreedFare.toLocaleString()})` }, { status: 400 });
    }

    let updated;
    try {
        updated = await db.rideRequest.update({
            where: { id: rideId },
            data: { paymentReference: reference, paidAt: new Date() },
        });
    } catch (e: any) {
        if (e?.code === "P2002") {
            const current = await db.rideRequest.findUnique({ where: { id: rideId } });
            return NextResponse.json({ success: true, ride: current, alreadyPaid: true });
        }
        throw e;
    }

    if (ride.driverId) {
        const transfer = await transferRideFareToDriver(rideId, ride.agreedFare, ride.driverId);
        if (transfer.success) {
            await notifyUser(ride.driverId,
                `💰 ₦${ride.agreedFare.toLocaleString()} has been sent to your bank account for ${ride.pickup} → ${ride.dropoff}.`,
                { type: "system", link: "/drive/dashboard" }
            ).catch(() => {});
        } else {
            await notifyUser(ride.driverId,
                `💰 The rider paid ₦${ride.agreedFare.toLocaleString()} for ${ride.pickup} → ${ride.dropoff} — add your payout bank details to get paid automatically next time, or our team will settle this one shortly.`,
                { type: "system", link: "/account/payout-details" }
            ).catch(() => {});
            await notifyAdmins(
                `💰 Ride fare paid: ₦${ride.agreedFare.toLocaleString()} owed to driver for ${ride.pickup} → ${ride.dropoff} (ride ${rideId}). Auto-transfer did not run (${transfer.message}) — settle manually.`,
                { type: "system", link: "/admin/payouts" }
            ).catch(() => {});
        }
    }

    return NextResponse.json({ success: true, ride: updated });
}
