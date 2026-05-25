import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/jwt";
import { db } from "@/lib/db";

/**
 * GET /api/seller/instagram/posts
 * Fetches the seller's real Instagram media using their stored access token.
 * Returns up to 20 most recent IMAGE/CAROUSEL_ALBUM posts.
 */
export async function GET(req: NextRequest) {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const seller = await db.seller.findFirst({
        where: { userId: user.userId },
        select: {
            id: true,
            instagramAccessToken: true,
            instagramUserId: true,
            instagramUsername: true,
            instagramTokenExpiry: true,
        } as any,
    });

    if (!seller) return NextResponse.json({ error: "No seller account" }, { status: 404 });

    const { instagramAccessToken: token, instagramUserId: igUserId, instagramUsername } = seller as any;

    if (!token || !igUserId) {
        return NextResponse.json({ connected: false, posts: [] });
    }

    // Check token expiry
    const expiry: Date | null = (seller as any).instagramTokenExpiry;
    if (expiry && expiry < new Date()) {
        return NextResponse.json({ connected: false, expired: true, posts: [] });
    }

    try {
        const fields = "id,caption,media_url,thumbnail_url,media_type,timestamp,permalink";
        const igRes = await fetch(
            `https://graph.facebook.com/v20.0/${igUserId}/media?fields=${fields}&limit=30&access_token=${token}`
        );
        const igData = await igRes.json();

        if (igData.error) {
            console.error("[IG posts] Graph API error:", igData.error);
            // Token may be invalid — clear it so seller re-connects
            if (igData.error.code === 190) {
                await db.seller.update({
                    where: { id: (seller as any).id },
                    data: { instagramAccessToken: null, instagramUserId: null } as any,
                });
                return NextResponse.json({ connected: false, expired: true, posts: [] });
            }
            return NextResponse.json({ error: igData.error.message }, { status: 502 });
        }

        // Only include single images and carousels (skip videos for now)
        const posts = (igData.data || [])
            .filter((p: any) => p.media_url && ["IMAGE", "CAROUSEL_ALBUM"].includes(p.media_type))
            .map((p: any) => ({
                id: p.id,
                media_url: p.media_url,
                caption: p.caption || "",
                media_type: p.media_type,
                timestamp: p.timestamp,
                permalink: p.permalink,
            }));

        return NextResponse.json({ connected: true, username: instagramUsername, posts });
    } catch (err: any) {
        console.error("[IG posts] Fetch error:", err.message);
        return NextResponse.json({ error: "Failed to fetch posts" }, { status: 500 });
    }
}
