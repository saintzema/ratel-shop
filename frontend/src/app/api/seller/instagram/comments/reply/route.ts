import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/jwt";
import { db } from "@/lib/db";
import { resolveSellerForUser } from "@/lib/resolve-seller";

/**
 * POST /api/seller/instagram/comments/reply  { commentId, message }
 * Replies to a comment via the real Graph API (POST /{comment-id}/replies) —
 * the reply appears as a genuine public comment reply on the seller's post.
 */
export async function POST(req: NextRequest) {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const seller = await resolveSellerForUser(user, { id: true, instagramAccessToken: true });
    if (!seller?.instagramAccessToken) {
        return NextResponse.json({ error: "Instagram not connected" }, { status: 400 });
    }

    const { commentId, message } = await req.json().catch(() => ({}));
    if (!commentId || !message?.trim()) {
        return NextResponse.json({ error: "commentId and message are required" }, { status: 400 });
    }

    const comment = await db.instagramComment.findUnique({ where: { id: commentId } });
    if (!comment || comment.sellerId !== seller.id) {
        return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    const res = await fetch(`https://graph.instagram.com/${comment.igCommentId}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.trim(), access_token: seller.instagramAccessToken }),
    });
    const data = await res.json();
    if (data.error) {
        return NextResponse.json({ error: data.error.message || "Instagram rejected the reply." }, { status: 502 });
    }

    await db.instagramComment.update({
        where: { id: commentId },
        data: { replied: true, replyText: message.trim() },
    });

    return NextResponse.json({ success: true });
}
