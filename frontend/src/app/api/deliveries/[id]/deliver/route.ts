import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/jwt";
import { db } from "@/lib/db";
import { notifyUser } from "@/lib/user-notify";
import { notifyAdmins } from "@/lib/admin-notify";
import { transferDeliveryFareToCourier } from "@/lib/delivery-payout";

export const dynamic = "force-dynamic";

/**
 * POST /api/deliveries/[id]/deliver — the COURIER confirms drop-off;
 * picked_up → delivered.
 *
 * If the sender paid into escrow (escrowStatus "held"), this releases it and
 * attempts a REAL, automatic Paystack transfer to the courier's own payout
 * bank details (see /account/payout-details). If the courier hasn't added
 * those yet, or the transfer fails for any reason, this falls back to the
 * same admin-reviewed settlement queue seller payouts already use (the
 * notifyAdmins call below) — never a silent loss of the courier's money.
 * If nothing was paid in-app, the fare is settled directly between sender
 * and courier, same as rides.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: deliveryId } = await params;
    const { count } = await db.deliveryRequest.updateMany({
        where: { id: deliveryId, courierId: user.userId, status: "picked_up" },
        data: { status: "delivered", deliveredAt: new Date() },
    });
    if (count === 0) {
        return NextResponse.json({ error: "This delivery can't be marked delivered (not yours, or not picked up)" }, { status: 400 });
    }

    const delivery = await db.deliveryRequest.findUnique({
        where: { id: deliveryId },
        select: { senderId: true, courierId: true, agreedFare: true, pickup: true, dropoff: true, escrowStatus: true },
    });
    if (!delivery) return NextResponse.json({ success: true });

    if (delivery.escrowStatus === "held") {
        await db.deliveryRequest.update({ where: { id: deliveryId }, data: { escrowStatus: "released" } });
        await notifyUser(delivery.senderId,
            `✅ Delivered: ${delivery.pickup} → ${delivery.dropoff}. Your payment has been released to the courier. Please rate your delivery.`,
            { type: "system", link: "/send-package" }
        ).catch(() => {});

        const transfer = delivery.courierId && delivery.agreedFare
            ? await transferDeliveryFareToCourier(deliveryId, delivery.agreedFare, delivery.courierId)
            : { success: false, message: "No courier or fare on this delivery" };

        if (transfer.success) {
            await notifyUser(delivery.courierId!,
                `💰 ₦${delivery.agreedFare?.toLocaleString()} has been sent to your bank account for this delivery.`,
                { type: "system", link: "/deliver/dashboard" }
            ).catch(() => {});
        } else {
            if (delivery.courierId) {
                await notifyUser(delivery.courierId,
                    `💰 ₦${delivery.agreedFare?.toLocaleString()} has been released for this delivery — add your payout bank details to get paid automatically next time, or our team will settle this one shortly.`,
                    { type: "system", link: "/account/payout-details" }
                ).catch(() => {});
            }
            await notifyAdmins(
                `💰 Delivery escrow released: ₦${delivery.agreedFare?.toLocaleString()} owed to courier for ${delivery.pickup} → ${delivery.dropoff} (delivery ${deliveryId}). Auto-transfer did not run (${transfer.message}) — settle manually.`,
                { type: "system", link: "/admin/payouts" }
            ).catch(() => {});
        }
    } else {
        await notifyUser(delivery.senderId,
            `✅ Delivered: ${delivery.pickup} → ${delivery.dropoff}. Please settle ₦${delivery.agreedFare?.toLocaleString()} with your courier if you haven't, and rate your delivery.`,
            { type: "system", link: "/send-package" }
        ).catch(() => {});
    }

    return NextResponse.json({ success: true });
}
