import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserFromRequest } from "@/lib/jwt";
import { resolveSellerForUser } from "@/lib/resolve-seller";

export const dynamic = "force-dynamic";

/**
 * Durable, product-scoped buyer↔seller threads.
 *
 * Replaces a localStorage-only chat store. There was no table for conversations
 * at all, so a cleared cache or a new device destroyed every thread permanently
 * — notifications survived (they are rows) while messages did not, which is
 * exactly what sellers reported.
 *
 * Threads are keyed on (seller, buyer, product). The same buyer asking one
 * seller about a generator and a fridge gets two threads rather than one mixed
 * conversation where neither negotiation is followable.
 *
 * GET  /api/conversations/threads              → my threads (as buyer AND seller)
 * GET  /api/conversations/threads?id=<convId>  → one thread with its messages
 * POST /api/conversations/threads              → send a message (creates the thread)
 */

/** Everything this user is, so a thread they own on either side resolves. */
async function identity(user: any) {
    const seller = await resolveSellerForUser(user, { id: true }).catch(() => null);
    return { userId: user.userId as string, sellerId: (seller as any)?.id as string | undefined };
}

export async function GET(req: NextRequest) {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const convId = searchParams.get("id");
    const { userId, sellerId } = await identity(user);

    if (convId) {
        const conv = await db.conversation.findUnique({
            where: { id: convId },
            include: { messages: { orderBy: { createdAt: "asc" }, take: 500 } },
        });
        if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 });
        // Only the two parties may read a thread.
        if (conv.buyerId !== userId && conv.sellerId !== sellerId) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Opening a thread clears that side's unread counter.
        const isSeller = conv.sellerId === sellerId;
        await db.conversation.update({
            where: { id: convId },
            data: isSeller ? { unreadForSeller: 0 } : { unreadForBuyer: 0 },
        }).catch(() => { /* never fail a read because a counter did not clear */ });

        return NextResponse.json({ conversation: conv, viewerRole: isSeller ? "seller" : "buyer" });
    }

    const threads = await db.conversation.findMany({
        where: {
            OR: [
                { buyerId: userId },
                ...(sellerId ? [{ sellerId }] : []),
            ],
        },
        orderBy: { lastMessageAt: "desc" },
        take: 200,
    });

    return NextResponse.json({
        threads: threads.map(t => ({
            ...t,
            viewerRole: t.sellerId === sellerId ? "seller" : "buyer",
            unread: t.sellerId === sellerId ? t.unreadForSeller : t.unreadForBuyer,
        })),
    });
}

export async function POST(req: NextRequest) {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Sign in to send a message" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const text = String(body?.text || "").trim();
    const imageUrl = body?.imageUrl ? String(body.imageUrl) : null;
    if (!text && !imageUrl) {
        return NextResponse.json({ error: "Message cannot be empty" }, { status: 400 });
    }

    const { userId, sellerId: mySellerId } = await identity(user);

    // Resolve the thread: either an explicit id, or the (seller, buyer, product)
    // triple that defines one.
    let conv = null as any;
    if (body?.conversationId) {
        conv = await db.conversation.findUnique({ where: { id: String(body.conversationId) } });
        if (!conv) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
        if (conv.buyerId !== userId && conv.sellerId !== mySellerId) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
    } else {
        const targetSellerId = String(body?.sellerId || "").trim();
        if (!targetSellerId) {
            return NextResponse.json({ error: "sellerId is required to start a thread" }, { status: 400 });
        }
        // A seller messaging their own store is not a conversation.
        if (targetSellerId === mySellerId) {
            return NextResponse.json({ error: "You cannot message your own store" }, { status: 400 });
        }

        // "" not null — see the schema comment on productId.
        const productId = String(body?.productId || "");
        conv = await db.conversation.upsert({
            where: { sellerId_buyerId_productId: { sellerId: targetSellerId, buyerId: userId, productId } },
            update: {},
            create: {
                sellerId: targetSellerId,
                buyerId: userId,
                productId,
                productName: body?.productName || null,
                productImage: body?.productImage || null,
                sellerName: body?.sellerName || null,
                buyerName: body?.buyerName || null,
            },
        });
    }

    const senderRole = conv.sellerId === mySellerId ? "seller" : "buyer";

    const [message] = await db.$transaction([
        db.chatMessage.create({
            data: {
                conversationId: conv.id,
                senderId: userId,
                senderName: body?.senderName || null,
                senderRole,
                text: text || "",
                imageUrl,
            },
        }),
        db.conversation.update({
            where: { id: conv.id },
            data: {
                lastMessage: text ? text.slice(0, 200) : "📷 Photo",
                lastMessageAt: new Date(),
                // Increment the OTHER side's unread count.
                ...(senderRole === "seller"
                    ? { unreadForBuyer: { increment: 1 } }
                    : { unreadForSeller: { increment: 1 } }),
            },
        }),
    ]);

    return NextResponse.json({ success: true, message, conversationId: conv.id });
}
