import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/jwt";
import { db } from "@/lib/db";
import { notifyUser } from "@/lib/user-notify";

export const dynamic = "force-dynamic";

/**
 * POST /api/deliveries/[id]/deliver — the COURIER confirms drop-off;
 * picked_up → delivered. Fare is settled directly between sender and
 * courier, same as rides — no in-app payment pipeline for this yet.
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

    const delivery = await db.deliveryRequest.findUnique({ where: { id: deliveryId }, select: { senderId: true, agreedFare: true, pickup: true, dropoff: true } });
    if (delivery) {
        await notifyUser(delivery.senderId,
            `✅ Delivered: ${delivery.pickup} → ${delivery.dropoff}. Please settle ₦${delivery.agreedFare?.toLocaleString()} with your courier if you haven't, and rate your delivery.`,
            { type: "system", link: "/send-package" }
        );
    }

    return NextResponse.json({ success: true });
}
