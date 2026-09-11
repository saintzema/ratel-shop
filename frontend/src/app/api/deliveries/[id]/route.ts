import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/jwt";
import { db } from "@/lib/db";
import { notifyUser } from "@/lib/user-notify";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/deliveries/[id]
 *   { proposedFare }  — sender raises their offer to attract more couriers.
 *   { autoAcceptMax } — sender sets/changes their auto-accept ceiling.
 *   { status: "cancelled", cancelReason }
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: deliveryId } = await params;
    const delivery = await db.deliveryRequest.findUnique({ where: { id: deliveryId } });
    if (!delivery) return NextResponse.json({ error: "Delivery not found" }, { status: 404 });
    if (delivery.senderId !== user.userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const data: any = {};

    if (body.status === "cancelled") {
        if (delivery.status === "delivered") return NextResponse.json({ error: "This delivery is already complete" }, { status: 400 });
        data.status = "cancelled";
        data.cancelReason = body.cancelReason ? String(body.cancelReason).slice(0, 200) : null;
        if (delivery.courierId) {
            await notifyUser(delivery.courierId, `The sender cancelled the delivery from ${delivery.pickup} to ${delivery.dropoff}.`, { type: "system" });
        }
    } else {
        if (delivery.status !== "searching") {
            return NextResponse.json({ error: "This delivery already has a courier" }, { status: 400 });
        }
        if (body.proposedFare !== undefined) {
            const fare = Number(body.proposedFare);
            if (!fare || fare <= 0) return NextResponse.json({ error: "Enter a valid fare" }, { status: 400 });
            data.proposedFare = fare;
        }
        if (body.autoAcceptMax !== undefined) {
            data.autoAcceptMax = body.autoAcceptMax ? Number(body.autoAcceptMax) : null;
        }
    }

    const updated = await db.deliveryRequest.update({ where: { id: deliveryId }, data });
    return NextResponse.json({ success: true, delivery: updated });
}
