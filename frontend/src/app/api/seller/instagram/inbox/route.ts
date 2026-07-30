import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/jwt";
import { db } from "@/lib/db";

async function resolveSeller(userId: string, email?: string) {
    return db.seller.findFirst({ where: { OR: [{ userId }, ...(email ? [{ ownerEmail: email }] : [])] } });
}

/**
 * GET /api/seller/instagram/inbox
 * Real data for the Unified Inbox tab: unreplied purchase-intent comments +
 * DM threads (grouped by buyer, most recent message per thread), newest first.
 */
export async function GET(req: NextRequest) {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const seller = await resolveSeller(user.userId, user.email);
    if (!seller) return NextResponse.json({ error: "No seller account" }, { status: 404 });

    // ?igsid= returns the full chronological history for one thread, for the
    // chat pane once a seller taps into a conversation.
    const igsid = req.nextUrl.searchParams.get("igsid");
    if (igsid) {
        const history = await db.instagramMessage.findMany({
            where: { sellerId: seller.id, igsid },
            orderBy: { createdAt: "asc" },
            take: 100,
        });
        return NextResponse.json({ history });
    }

    const [comments, messages] = await Promise.all([
        db.instagramComment.findMany({
            where: { sellerId: seller.id, replied: false },
            orderBy: { createdAt: "desc" },
            take: 50,
        }),
        db.instagramMessage.findMany({
            where: { sellerId: seller.id },
            orderBy: { createdAt: "desc" },
            take: 200, // enough to reconstruct the last ~50 threads' latest message
        }),
    ]);

    // Group messages into threads by igsid, keep only the latest per thread.
    const threadMap = new Map<string, typeof messages[number]>();
    for (const m of messages) {
        if (!threadMap.has(m.igsid)) threadMap.set(m.igsid, m);
    }
    const threads = Array.from(threadMap.values()).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return NextResponse.json({ comments, threads });
}
