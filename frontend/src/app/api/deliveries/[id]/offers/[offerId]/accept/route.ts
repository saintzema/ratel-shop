import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/jwt";
import { db } from "@/lib/db";
import { acceptDeliveryOffer } from "@/lib/delivery-accept";

export const dynamic = "force-dynamic";

/** POST /api/deliveries/[id]/offers/[offerId]/accept — the SENDER picks one offer. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; offerId: string }> }) {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: deliveryId, offerId } = await params;

    const delivery = await db.deliveryRequest.findUnique({ where: { id: deliveryId } });
    if (!delivery) return NextResponse.json({ error: "Delivery not found" }, { status: 404 });
    if (delivery.senderId !== user.userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (delivery.status !== "searching") return NextResponse.json({ error: "This delivery already has a courier" }, { status: 400 });

    try {
        const { conversationId } = await acceptDeliveryOffer(deliveryId, offerId);
        return NextResponse.json({ success: true, conversationId });
    } catch (e: any) {
        return NextResponse.json({ error: e.message || "Could not accept this offer" }, { status: 400 });
    }
}
