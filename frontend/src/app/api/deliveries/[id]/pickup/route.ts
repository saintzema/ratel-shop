import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/jwt";
import { db } from "@/lib/db";
import { notifyUser } from "@/lib/user-notify";

export const dynamic = "force-dynamic";

/**
 * POST /api/deliveries/[id]/pickup — the COURIER confirms pickup; matched → picked_up.
 * Requires the last 2 digits of the sender's pickup code, same verification the ride flow uses.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: deliveryId } = await params;
    const body = await req.json().catch(() => ({}));
    const codeEntered = String(body?.code || "").trim();

    const existing = await db.deliveryRequest.findUnique({ where: { id: deliveryId }, select: { courierId: true, status: true, pickupCode: true } });
    if (!existing || existing.courierId !== user.userId || existing.status !== "matched") {
        return NextResponse.json({ error: "This delivery can't be marked picked up (not yours, or not matched)" }, { status: 400 });
    }
    if (existing.pickupCode && codeEntered !== existing.pickupCode.slice(-2)) {
        return NextResponse.json({ error: "That doesn't match the sender's pickup code — ask them to read out the last 2 digits again" }, { status: 400 });
    }

    const { count } = await db.deliveryRequest.updateMany({
        where: { id: deliveryId, courierId: user.userId, status: "matched" },
        data: { status: "picked_up", pickedUpAt: new Date() },
    });
    if (count === 0) {
        return NextResponse.json({ error: "This delivery can't be marked picked up (not yours, or not matched)" }, { status: 400 });
    }

    const delivery = await db.deliveryRequest.findUnique({ where: { id: deliveryId }, select: { senderId: true, pickup: true, dropoff: true } });
    if (delivery) {
        await notifyUser(delivery.senderId,
            `📦 Your package has been picked up: ${delivery.pickup} → ${delivery.dropoff}.`,
            { type: "system", link: "/send-package" }
        );
    }

    return NextResponse.json({ success: true });
}
