import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/jwt";
import { db } from "@/lib/db";
import { verifyPaystackTransaction } from "@/lib/paystack-verify";
import { notifyUser } from "@/lib/user-notify";
import { notifyAdmins } from "@/lib/admin-notify";
import { transferRideFareToDriver } from "@/lib/ride-payout";
import { previewWallet, redeemCredits } from "@/lib/credit-wallet";
import { splitFare, recordCommission } from "@/lib/mobility-commission";

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

    // What the rider's reward credit can take off this fare. Quoted here and
    // re-derived on POST — the client never gets to say how much it applied.
    //
    // Credit only works when the ride is paid IN APP. If the rider hands the
    // driver cash or sends a bank transfer, the money never passes through
    // FairPrice and there is nothing for a credit to reduce. That's a real
    // constraint, and it's also the point: the discount is the reason to pay
    // on the rail that gives the rider a receipt and a dispute path, and pays
    // the driver automatically.
    const wallet = ride.agreedFare
        ? await previewWallet(user.userId, ride.agreedFare, (await splitFare("ride", ride.agreedFare)).commission)
        : { balance: 0, applicable: 0, amountDue: 0 };

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
        creditBalance: wallet.balance,
        creditApplied: wallet.applicable,
        amountDue: wallet.amountDue,
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

    // The fare the rider owes AFTER their reward credit — recomputed here from
    // the live balance rather than taken from the request, so the discount
    // can't be inflated by editing the payload.
    const fareSplit = await splitFare("ride", ride.agreedFare);
    const wallet = await previewWallet(user.userId, ride.agreedFare, fareSplit.commission);
    const paidKobo = result.tx.amount || 0;
    const expectedKobo = Math.round(wallet.amountDue * 100);
    if (paidKobo < expectedKobo) {
        return NextResponse.json({ error: `Amount paid (₦${(paidKobo / 100).toLocaleString()}) is less than the ₦${wallet.amountDue.toLocaleString()} due` }, { status: 400 });
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

    // Credit is consumed only once the payment has verified and the ride is
    // recorded as paid, so a failed payment never burns it. The driver is
    // still transferred the FULL agreed fare below — the credit is funded by
    // the platform out of take rate, it is not a deduction from the driver's
    // earnings, and a driver must never be paid less because their rider had
    // a check-in streak.
    if (wallet.applicable > 0) {
        await redeemCredits(user.userId, wallet.applicable, `ride:${rideId}`).catch(() => 0);
    }

    if (ride.driverId) {
        // The platform's take rate comes out here. The rider paid the full
        // fare into our Paystack account, so keeping the commission is simply
        // a matter of transferring the driver the remainder — see
        // lib/mobility-commission.ts for why the rate is what it is.
        //
        // The rider's reward credit does NOT come out of this: the driver is
        // paid on the agreed fare regardless of any discount the rider had,
        // because a driver who earns less for carrying a rider with a check-in
        // streak would simply start refusing those riders.
        const split = fareSplit;
        await recordCommission({
            driverId: ride.driverId, jobType: "ride", jobId: rideId,
            fare: ride.agreedFare, settled: true, note: "Paid in app",
        });

        const transfer = await transferRideFareToDriver(rideId, split.payout, ride.driverId);
        if (transfer.success) {
            await notifyUser(ride.driverId,
                `💰 ₦${split.payout.toLocaleString()} has been sent to your bank account for ${ride.pickup} → ${ride.dropoff} (₦${ride.agreedFare.toLocaleString()} fare less ${split.ratePct}% service fee).`,
                { type: "system", link: "/drive/dashboard" }
            ).catch(() => {});
        } else {
            await notifyUser(ride.driverId,
                `💰 The rider paid ₦${ride.agreedFare.toLocaleString()} for ${ride.pickup} → ${ride.dropoff}. Your ₦${split.payout.toLocaleString()} is waiting — add your payout bank details to get paid automatically next time, or our team will settle this one shortly.`,
                { type: "system", link: "/account/payout-details" }
            ).catch(() => {});
            await notifyAdmins(
                `💰 Ride fare paid: ₦${split.payout.toLocaleString()} owed to driver for ${ride.pickup} → ${ride.dropoff} (ride ${rideId}). Auto-transfer did not run (${transfer.message}) — settle manually.`,
                { type: "system", link: "/admin/payouts" }
            ).catch(() => {});
        }
    }

    return NextResponse.json({ success: true, ride: updated });
}
