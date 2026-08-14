import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserFromRequest } from "@/lib/jwt";
import { validateMediaForPlatform } from "@/lib/social-media-validate";

/**
 * Scheduled social post worker.
 * Frequency: every 15 minutes (vercel.json).
 *
 * Picks up SocialPost rows in "scheduled" whose time has passed and publishes
 * them. Runs the same media validation as an immediate publish, because a
 * scheduled post is exactly the case where a silent platform rejection is worst
 * — nobody is watching when it fires.
 *
 * Each post is attempted independently: one seller's expired token must not
 * stop everyone else's queue from going out.
 */

const FB_API_VERSION = "v21.0";
/** Don't fire a post that's been stuck so long it's no longer relevant. */
const MAX_LATE_MS = 24 * 60 * 60 * 1000;

async function publishFacebook(seller: any, post: any) {
    if (!seller.facebookPageId || !seller.facebookPageAccessToken) {
        throw new Error("Facebook Page no longer connected");
    }
    const res = await fetch(`https://graph.facebook.com/${FB_API_VERSION}/${seller.facebookPageId}/photos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            url: post.imageUrl,
            caption: post.caption || "",
            access_token: seller.facebookPageAccessToken,
        }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message || "Facebook rejected the post");
    const externalId = data.post_id || data.id || null;
    return { externalId, permalink: externalId ? `https://www.facebook.com/${externalId}` : null };
}

async function publishInstagram(seller: any, post: any) {
    const token = seller.instagramAccessToken;
    const igUserId = seller.instagramUserId;
    if (!token || !igUserId) throw new Error("Instagram no longer connected");
    if (seller.instagramTokenExpiry && seller.instagramTokenExpiry < new Date()) {
        throw new Error("Instagram connection expired — reconnect to resume scheduled posts");
    }

    const containerRes = await fetch(`https://graph.instagram.com/${igUserId}/media`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_url: post.imageUrl, caption: post.caption || "", access_token: token }),
    });
    const container = await containerRes.json();
    if (container.error) throw new Error(container.error.message || "Instagram rejected the image");
    if (!container.id) throw new Error("Instagram returned no media container");

    const publishRes = await fetch(`https://graph.instagram.com/${igUserId}/media_publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creation_id: container.id, access_token: token }),
    });
    const published = await publishRes.json();
    if (published.error) throw new Error(published.error.message || "Instagram rejected the publish");

    let permalink: string | null = null;
    try {
        const permaRes = await fetch(`https://graph.instagram.com/${published.id}?fields=permalink&access_token=${token}`);
        permalink = (await permaRes.json()).permalink || null;
    } catch { /* non-fatal */ }

    // Keep the IG-specific record in sync too — it's what the boost ownership
    // check and live insights read.
    await db.instagramPost.create({
        data: {
            sellerId: seller.id,
            mediaId: published.id,
            permalink,
            caption: post.caption || null,
            productId: post.productId || null,
        },
    }).catch(() => { /* mirror only */ });

    return { externalId: published.id, permalink };
}

export async function GET(request: Request) {
    // Same auth shape as the other crons: Vercel's cron secret, or an admin
    // triggering it by hand.
    const authHeader = request.headers.get("authorization");
    if (process.env.NODE_ENV === "production") {
        const isCron = authHeader === `Bearer ${process.env.CRON_SECRET}`;
        const user = isCron ? null : getUserFromRequest(request);
        if (!isCron && user?.role !== "admin") {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }
    }

    const now = new Date();

    try {
        const due = await db.socialPost.findMany({
            where: { status: "scheduled", scheduledAt: { lte: now } },
            orderBy: { scheduledAt: "asc" },
            take: 50, // bounded so one run can't exceed the function timeout
        });

        if (due.length === 0) {
            return NextResponse.json({ success: true, processed: 0 });
        }

        const sellerIds = [...new Set(due.map(p => p.sellerId))];
        const sellers = await db.seller.findMany({
            where: { id: { in: sellerIds } },
            select: {
                id: true,
                facebookPageId: true,
                facebookPageAccessToken: true,
                instagramAccessToken: true,
                instagramUserId: true,
                instagramTokenExpiry: true,
            },
        });
        const sellerById = new Map(sellers.map(s => [s.id, s]));

        let published = 0;
        let failed = 0;

        for (const post of due) {
            const fail = async (reason: string) => {
                failed++;
                await db.socialPost.update({
                    where: { id: post.id },
                    data: { status: "failed", failureReason: reason },
                }).catch(() => {});
            };

            try {
                if (post.scheduledAt && now.getTime() - post.scheduledAt.getTime() > MAX_LATE_MS) {
                    await fail("Skipped — more than 24 hours overdue, so it was no longer timely.");
                    continue;
                }

                const seller = sellerById.get(post.sellerId);
                if (!seller) {
                    await fail("Seller account not found.");
                    continue;
                }
                if (!post.imageUrl) {
                    await fail("No image on the scheduled post.");
                    continue;
                }

                const platform = post.platform === "instagram" ? "instagram" : "facebook";
                const media = await validateMediaForPlatform(post.imageUrl, platform);
                if (!media.ok) {
                    await fail(media.error || "The image is no longer valid for this platform.");
                    continue;
                }

                const result = platform === "instagram"
                    ? await publishInstagram(seller, post)
                    : await publishFacebook(seller, post);

                await db.socialPost.update({
                    where: { id: post.id },
                    data: {
                        status: "published",
                        publishedAt: new Date(),
                        externalId: result.externalId,
                        permalink: result.permalink,
                        failureReason: null,
                    },
                });
                published++;
            } catch (err: any) {
                await fail(err?.message || "Publishing failed.");
            }
        }

        return NextResponse.json({ success: true, processed: due.length, published, failed });
    } catch (err: any) {
        console.error("[social-scheduler] run failed:", err);
        return NextResponse.json({ success: false, error: "Scheduler run failed" }, { status: 500 });
    }
}
