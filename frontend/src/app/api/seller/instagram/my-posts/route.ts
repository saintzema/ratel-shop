import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/jwt";
import { db } from "@/lib/db";

/**
 * GET /api/seller/instagram/my-posts
 * Real, live performance for posts published via FairPrice's Social
 * Composer — not the seller's whole Instagram history, just what we made.
 *
 * Likes/comments come from the plain media fields (covered by
 * instagram_business_basic — cheap, reliable). Reach comes from the
 * dedicated /insights endpoint (needs instagram_business_manage_insights) —
 * fetched best-effort per post; a post that can't return it just shows null
 * rather than failing the whole list.
 */
export async function GET(req: NextRequest) {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const seller = await db.seller.findFirst({
        where: { OR: [{ userId: user.userId }, ...(user.email ? [{ ownerEmail: user.email }] : [])] },
        select: { id: true, instagramAccessToken: true },
    });
    if (!seller?.instagramAccessToken) {
        return NextResponse.json({ error: "Instagram not connected" }, { status: 400 });
    }
    const token = seller.instagramAccessToken;

    const posts = await db.instagramPost.findMany({
        where: { sellerId: seller.id },
        orderBy: { publishedAt: "desc" },
        take: 30,
    });

    const withInsights = await Promise.all(posts.map(async (post) => {
        let likeCount: number | null = null;
        let commentsCount: number | null = null;
        let reach: number | null = null;

        try {
            const res = await fetch(`https://graph.instagram.com/${post.mediaId}?fields=like_count,comments_count&access_token=${token}`);
            const data = await res.json();
            if (!data.error) {
                likeCount = data.like_count ?? null;
                commentsCount = data.comments_count ?? null;
            }
        } catch { /* leave as null */ }

        try {
            const res = await fetch(`https://graph.instagram.com/${post.mediaId}/insights?metric=reach&access_token=${token}`);
            const data = await res.json();
            reach = data?.data?.[0]?.values?.[0]?.value ?? null;
        } catch { /* leave as null */ }

        return { ...post, likeCount, commentsCount, reach };
    }));

    return NextResponse.json({ posts: withInsights });
}
