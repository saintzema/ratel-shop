import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/jwt";
import { db } from "@/lib/db";
import { validateMediaForPlatform } from "@/lib/social-media-validate";

/**
 * POST /api/seller/instagram/publish  { imageUrl, caption }
 *
 * Real Instagram Graph API publish (Business Login / graph.instagram.com,
 * matching the pattern already used by posts/route.ts) — two-step content
 * publishing flow: create a media container, then publish it.
 * https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/content-publishing
 *
 * Requires instagram_business_content_publish. imageUrl must be a public
 * HTTPS URL Instagram's servers can fetch — our own Blob-hosted product
 * images qualify; this is also why Instagram catalog imports get re-hosted
 * on our own storage instead of hot-linking Instagram's own ephemeral CDN.
 */
export async function POST(req: NextRequest) {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const seller = await db.seller.findFirst({
        where: {
            OR: [
                { userId: user.userId },
                ...(user.email ? [{ ownerEmail: user.email }] : []),
            ],
        },
        select: { id: true, instagramAccessToken: true, instagramUserId: true, instagramTokenExpiry: true },
    });

    if (!seller) return NextResponse.json({ error: "No seller account" }, { status: 404 });

    const { instagramAccessToken: token, instagramUserId: igUserId } = seller;
    if (!token || !igUserId) {
        return NextResponse.json({ error: "Instagram not connected — connect it under Integrations first." }, { status: 400 });
    }
    const expiry = seller.instagramTokenExpiry;
    if (expiry && expiry < new Date()) {
        return NextResponse.json({ error: "Your Instagram connection has expired — please reconnect." }, { status: 400 });
    }

    let body: { imageUrl?: string; caption?: string };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }

    const { imageUrl, caption, productId } = body as { imageUrl?: string; caption?: string; productId?: string };
    if (!imageUrl || !imageUrl.startsWith("http")) {
        return NextResponse.json({ error: "A public image URL is required to publish to Instagram." }, { status: 400 });
    }

    // Instagram is strict about aspect ratio (4:5 to 1.91:1), size and format, and
    // rejects violations deep in the container step with an opaque Graph error.
    // Checking first turns that into something the seller can actually fix.
    const media = await validateMediaForPlatform(imageUrl, "instagram");
    if (!media.ok) {
        return NextResponse.json({ error: media.error }, { status: 400 });
    }

    try {
        // Step 1: create a media container
        const containerRes = await fetch(
            `https://graph.instagram.com/${igUserId}/media`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    image_url: imageUrl,
                    caption: caption || "",
                    access_token: token,
                }),
            }
        );
        const containerData = await containerRes.json();
        if (containerData.error) {
            console.error("[IG publish] container error:", containerData.error);
            return NextResponse.json({ error: containerData.error.message || "Instagram rejected this image/caption." }, { status: 502 });
        }
        const creationId = containerData.id;
        if (!creationId) {
            return NextResponse.json({ error: "Instagram didn't return a media container." }, { status: 502 });
        }

        // Step 2: publish the container
        const publishRes = await fetch(
            `https://graph.instagram.com/${igUserId}/media_publish`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ creation_id: creationId, access_token: token }),
            }
        );
        const publishData = await publishRes.json();
        if (publishData.error) {
            console.error("[IG publish] publish error:", publishData.error);
            return NextResponse.json({ error: publishData.error.message || "Instagram rejected the publish step." }, { status: 502 });
        }

        const mediaId = publishData.id;

        // Best-effort permalink lookup — nice to have for "view the live post" but
        // not worth failing the whole publish over if this one call has a hiccup.
        let permalink: string | null = null;
        try {
            const permaRes = await fetch(`https://graph.instagram.com/${mediaId}?fields=permalink&access_token=${token}`);
            const permaData = await permaRes.json();
            permalink = permaData.permalink || null;
        } catch { /* non-fatal */ }

        // So "My Posts" can show live insights for exactly what FairPrice
        // published, not the seller's whole Instagram history.
        await db.instagramPost.create({
            data: { sellerId: seller.id, mediaId, permalink, caption: caption || null, productId: productId || null },
        }).catch((e) => console.error("[IG publish] failed to record post:", e));

        // Also mirror into the platform-agnostic table so the seller's post history
        // can show Instagram and Facebook together. instagramPost above is kept as
        // the IG-specific record (the boost ownership check and live IG insights
        // both read it), so this is an addition, not a replacement.
        db.socialPost.create({
            data: {
                sellerId: seller.id,
                platform: "instagram",
                productId: productId || null,
                caption: caption || null,
                imageUrl,
                status: "published",
                publishedAt: new Date(),
                externalId: mediaId,
                permalink,
            },
        }).catch((e) => console.error("[IG publish] failed to mirror post:", e));

        return NextResponse.json({ success: true, mediaId, permalink });
    } catch (err: any) {
        console.error("[IG publish] error:", err);
        return NextResponse.json({ error: "Failed to publish to Instagram." }, { status: 500 });
    }
}
