import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/jwt";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * POST /api/deliveries/[id]/location  { lat, lng }  — the caller's own live position.
 * GET  /api/deliveries/[id]/location                — both parties' last known positions.
 *
 * Same scoping as /api/rides/[id]/location — only the sender or courier on
 * THIS specific delivery may read or write its location.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: deliveryId } = await params;
    const body = await req.json().catch(() => ({}));
    const lat = Number(body?.lat);
    const lng = Number(body?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return NextResponse.json({ error: "lat/lng required" }, { status: 400 });
    }

    const delivery = await db.deliveryRequest.findUnique({ where: { id: deliveryId }, select: { senderId: true, courierId: true, status: true } });
    if (!delivery) return NextResponse.json({ error: "Delivery not found" }, { status: 404 });
    if (delivery.status !== "matched" && delivery.status !== "picked_up") {
        return NextResponse.json({ error: "This delivery isn't active" }, { status: 400 });
    }

    const now = new Date();
    if (user.userId === delivery.senderId) {
        await db.deliveryRequest.update({ where: { id: deliveryId }, data: { senderLat: lat, senderLng: lng, senderLocationAt: now } });
    } else if (user.userId === delivery.courierId) {
        await db.deliveryRequest.update({ where: { id: deliveryId }, data: { courierLat: lat, courierLng: lng, courierLocationAt: now } });
    } else {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ success: true });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: deliveryId } = await params;
    const delivery = await db.deliveryRequest.findUnique({
        where: { id: deliveryId },
        select: {
            senderId: true, courierId: true,
            courierLat: true, courierLng: true, courierLocationAt: true,
            senderLat: true, senderLng: true, senderLocationAt: true,
        },
    });
    if (!delivery) return NextResponse.json({ error: "Delivery not found" }, { status: 404 });
    if (user.userId !== delivery.senderId && user.userId !== delivery.courierId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({
        courier: delivery.courierLat != null ? { lat: delivery.courierLat, lng: delivery.courierLng, at: delivery.courierLocationAt } : null,
        sender: delivery.senderLat != null ? { lat: delivery.senderLat, lng: delivery.senderLng, at: delivery.senderLocationAt } : null,
    });
}
