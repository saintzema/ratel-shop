import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/jwt";
import { db } from "@/lib/db";
import { sendInstagramDm } from "@/lib/instagram-dm";

/**
 * POST /api/seller/instagram/messages/reply  { igsid, message }
 * Seller manually replying to a DM thread from the FairPrice dashboard,
 * covering everything the AI auto-reply hands off (negotiation, orders,
 * complaints, anything it wasn't confident answering from the catalog).
 */
export async function POST(req: NextRequest) {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const seller = await db.seller.findFirst({
        where: { OR: [{ userId: user.userId }, ...(user.email ? [{ ownerEmail: user.email }] : [])] },
        select: { id: true, instagramUserId: true, instagramAccessToken: true },
    });
    if (!seller?.instagramUserId || !seller.instagramAccessToken) {
        return NextResponse.json({ error: "Instagram not connected" }, { status: 400 });
    }

    const { igsid, message } = await req.json().catch(() => ({}));
    if (!igsid || !message?.trim()) {
        return NextResponse.json({ error: "igsid and message are required" }, { status: 400 });
    }

    const sent = await sendInstagramDm(seller.instagramUserId, seller.instagramAccessToken, igsid, message.trim());
    if (!sent) {
        return NextResponse.json({ error: "Instagram rejected the message." }, { status: 502 });
    }

    await db.instagramMessage.create({
        data: { sellerId: seller.id, igsid, text: message.trim(), direction: "outbound" },
    });

    return NextResponse.json({ success: true });
}
