import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/jwt";
import { db } from "@/lib/db";

const API_VERSION = "v21.0";

/**
 * POST /api/seller/facebook/publish  { imageUrl, caption }
 * Real Facebook Page photo post — POST /{page-id}/photos with a public
 * image URL + caption, using the Page's own access token.
 */
export async function POST(req: NextRequest) {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const seller = await db.seller.findFirst({
        where: { OR: [{ userId: user.userId }, ...(user.email ? [{ ownerEmail: user.email }] : [])] },
        select: { id: true, facebookPageId: true, facebookPageAccessToken: true },
    });
    if (!seller?.facebookPageId || !seller.facebookPageAccessToken) {
        return NextResponse.json({ error: "Facebook Page not connected — connect it under Integrations first." }, { status: 400 });
    }

    const { imageUrl, caption } = await req.json().catch(() => ({}));
    if (!imageUrl || !imageUrl.startsWith("http")) {
        return NextResponse.json({ error: "A public image URL is required to publish to Facebook." }, { status: 400 });
    }

    try {
        const res = await fetch(`https://graph.facebook.com/${API_VERSION}/${seller.facebookPageId}/photos`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                url: imageUrl,
                caption: caption || "",
                access_token: seller.facebookPageAccessToken,
            }),
        });
        const data = await res.json();
        if (data.error) {
            console.error("[FB publish] error:", data.error);
            return NextResponse.json({ error: data.error.message || "Facebook rejected this post." }, { status: 502 });
        }

        const postId: string | undefined = data.post_id || data.id;
        const permalink = postId ? `https://www.facebook.com/${postId}` : null;

        return NextResponse.json({ success: true, postId, permalink });
    } catch (err: any) {
        console.error("[FB publish] error:", err);
        return NextResponse.json({ error: "Failed to publish to Facebook." }, { status: 500 });
    }
}
