import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/jwt";
import { db } from "@/lib/db";
import { notifyUser } from "@/lib/user-notify";

export const dynamic = "force-dynamic";

/** POST /api/deliveries/[id]/pickup — the COURIER confirms pickup; matched → picked_up. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: deliveryId } = await params;
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
