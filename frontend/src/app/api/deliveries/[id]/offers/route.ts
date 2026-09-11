import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/jwt";
import { db } from "@/lib/db";
import { notifyUser } from "@/lib/user-notify";
import { acceptDeliveryOffer } from "@/lib/delivery-accept";

export const dynamic = "force-dynamic";

/** POST /api/deliveries/[id]/offers — anyone (except the sender) counters with their own price to be the courier. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Sign in to send an offer" }, { status: 401 });

    const { id: deliveryId } = await params;
    const body = await req.json().catch(() => ({}));
    const { offeredFare, message } = body || {};

    const fare = Number(offeredFare);
    if (!fare || fare <= 0) {
        return NextResponse.json({ error: "Enter the fare you're offering" }, { status: 400 });
    }

    const delivery = await db.deliveryRequest.findUnique({ where: { id: deliveryId } });
    if (!delivery || delivery.status !== "searching") {
        return NextResponse.json({ error: "This delivery is no longer open for offers" }, { status: 400 });
    }
    if (delivery.senderId === user.userId) {
        return NextResponse.json({ error: "You cannot offer on your own delivery request" }, { status: 400 });
    }

    const offer = await db.deliveryOffer.upsert({
        where: { deliveryRequestId_courierId: { deliveryRequestId: deliveryId, courierId: user.userId } },
        update: { offeredFare: fare, message: message || null, status: "pending" },
        create: { deliveryRequestId: deliveryId, courierId: user.userId, offeredFare: fare, message: message || null },
    });

    if (delivery.autoAcceptMax && fare <= delivery.autoAcceptMax) {
        try {
            const { conversationId } = await acceptDeliveryOffer(deliveryId, offer.id);
            await notifyUser(delivery.senderId,
                `✅ Auto-accepted a ₦${fare.toLocaleString()} offer for your delivery from ${delivery.pickup} to ${delivery.dropoff}.`,
                { type: "system", link: "/send-package" }
            );
            return NextResponse.json({ success: true, offer, autoAccepted: true, conversationId });
        } catch {
            // Fall through to the normal pending-offer path if accept somehow failed.
        }
    }

    await notifyUser(delivery.senderId,
        `📦 A courier offered ₦${fare.toLocaleString()} for your delivery from ${delivery.pickup} to ${delivery.dropoff}.`,
        { type: "system", link: "/send-package" }
    );

    return NextResponse.json({ success: true, offer });
}
