import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/jwt";
import { db } from "@/lib/db";
import { verifyPaystackTransaction } from "@/lib/paystack-verify";
import { notifyUser } from "@/lib/user-notify";

export const dynamic = "force-dynamic";

/**
 * POST /api/deliveries/[id]/pay  { reference }
 *
 * The SENDER pays the agreed fare into escrow via Paystack once a courier is
 * matched. Verified server-side against Paystack directly (never trusts a
 * client-supplied "it worked") and checked against the delivery's actual
 * agreedFare in kobo so a tampered/smaller charge can't be recorded as full
 * payment. Idempotent on paymentReference — a retried request (or a client
 * double-submit) for an already-recorded reference just returns the current
 * state instead of erroring or double-crediting.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: deliveryId } = await params;
    const body = await req.json().catch(() => ({}));
    const reference = String(body?.reference || "").trim();
    if (!reference) return NextResponse.json({ error: "reference is required" }, { status: 400 });

    const delivery = await db.deliveryRequest.findUnique({ where: { id: deliveryId } });
    if (!delivery) return NextResponse.json({ error: "Delivery not found" }, { status: 404 });
    if (delivery.senderId !== user.userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (!delivery.agreedFare) return NextResponse.json({ error: "This delivery has no agreed fare yet" }, { status: 400 });

    if (delivery.escrowStatus === "held" || delivery.escrowStatus === "released") {
        return NextResponse.json({ success: true, delivery, alreadyPaid: true });
    }

    const existingByRef = await db.deliveryRequest.findUnique({ where: { paymentReference: reference } });
    if (existingByRef) {
        return NextResponse.json({ success: true, delivery: existingByRef, alreadyPaid: true });
    }

    const result = await verifyPaystackTransaction(reference);
    if (!result.ok || result.tx.status !== "success") {
        return NextResponse.json({ error: "Payment could not be verified" }, { status: 402 });
    }

    const paidKobo = result.tx.amount || 0;
    const expectedKobo = Math.round(delivery.agreedFare * 100);
    if (paidKobo < expectedKobo) {
        return NextResponse.json({ error: `Amount paid (₦${(paidKobo / 100).toLocaleString()}) is less than the agreed fare (₦${delivery.agreedFare.toLocaleString()})` }, { status: 400 });
    }

    let updated;
    try {
        updated = await db.deliveryRequest.update({
            where: { id: deliveryId },
            data: { escrowStatus: "held", paymentReference: reference, paidAt: new Date() },
        });
    } catch (e: any) {
        if (e?.code === "P2002") {
            // Race with another request recording the same reference — treat as success.
            const current = await db.deliveryRequest.findUnique({ where: { id: deliveryId } });
            return NextResponse.json({ success: true, delivery: current, alreadyPaid: true });
        }
        throw e;
    }

    if (delivery.courierId) {
        await notifyUser(delivery.courierId,
            `💰 The sender paid ₦${delivery.agreedFare.toLocaleString()} into escrow for ${delivery.pickup} → ${delivery.dropoff}. It'll be released to you once you mark the delivery complete.`,
            { type: "system", link: "/deliver/dashboard" }
        ).catch(() => {});
    }

    return NextResponse.json({ success: true, delivery: updated });
}
