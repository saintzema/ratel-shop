import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/jwt";
import { db } from "@/lib/db";
import { validateMediaForPlatform } from "@/lib/social-media-validate";

/**
 * Seller-facing scheduling for social posts.
 * The worker that actually publishes these is /api/cron/social-scheduler.
 */

async function resolveSeller(userId: string, email?: string) {
    return db.seller.findFirst({
        where: { OR: [{ userId }, ...(email ? [{ ownerEmail: email }] : [])] },
        select: { id: true },
    });
}

/** GET — this seller's post history and queue (both platforms). */
export async function GET(req: NextRequest) {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const seller = await resolveSeller(user.userId, user.email);
    if (!seller) return NextResponse.json({ error: "No seller account" }, { status: 404 });

    const posts = await db.socialPost.findMany({
        where: { sellerId: seller.id },
        orderBy: [{ scheduledAt: "desc" }, { createdAt: "desc" }],
        take: 100,
    });

    return NextResponse.json({
        posts: posts.map(p => ({
            id: p.id,
            platform: p.platform,
            productId: p.productId,
            caption: p.caption,
            imageUrl: p.imageUrl,
            status: p.status,
            scheduledAt: p.scheduledAt?.toISOString() || null,
            publishedAt: p.publishedAt?.toISOString() || null,
            permalink: p.permalink,
            failureReason: p.failureReason,
        })),
    });
}

/** POST { platforms: string[], caption, imageUrl, productId?, scheduledAt } */
export async function POST(req: NextRequest) {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const seller = await resolveSeller(user.userId, user.email);
    if (!seller) return NextResponse.json({ error: "No seller account" }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const { platforms, caption, imageUrl, productId, scheduledAt } = body as {
        platforms?: string[]; caption?: string; imageUrl?: string; productId?: string; scheduledAt?: string;
    };

    const targets = (platforms || []).filter(p => p === "facebook" || p === "instagram");
    if (targets.length === 0) {
        return NextResponse.json({ error: "Pick at least one platform that supports scheduling (Facebook or Instagram)." }, { status: 400 });
    }
    if (!imageUrl) {
        return NextResponse.json({ error: "A product photo is required." }, { status: 400 });
    }

    const when = scheduledAt ? new Date(scheduledAt) : null;
    if (!when || isNaN(when.getTime())) {
        return NextResponse.json({ error: "Pick a valid date and time." }, { status: 400 });
    }
    // The worker runs every 15 minutes, so anything less than that ahead would
    // fire almost immediately and surprise the seller — publish now instead.
    if (when.getTime() < Date.now() + 5 * 60 * 1000) {
        return NextResponse.json({ error: "Pick a time at least 5 minutes from now, or post it right away instead." }, { status: 400 });
    }

    // Validate up front rather than letting it fail unattended at 6am.
    for (const platform of targets) {
        const media = await validateMediaForPlatform(imageUrl, platform as "instagram" | "facebook");
        if (!media.ok) {
            return NextResponse.json(
                { error: `${platform === "instagram" ? "Instagram" : "Facebook"}: ${media.error}` },
                { status: 400 }
            );
        }
    }

    const created = await db.$transaction(
        targets.map(platform =>
            db.socialPost.create({
                data: {
                    sellerId: seller.id,
                    platform,
                    productId: productId || null,
                    caption: caption || null,
                    imageUrl,
                    status: "scheduled",
                    scheduledAt: when,
                },
            })
        )
    );

    return NextResponse.json({
        success: true,
        scheduled: created.length,
        scheduledAt: when.toISOString(),
        ids: created.map(c => c.id),
    });
}

/** DELETE ?id= — cancel a queued post (only while it's still scheduled). */
export async function DELETE(req: NextRequest) {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const seller = await resolveSeller(user.userId, user.email);
    if (!seller) return NextResponse.json({ error: "No seller account" }, { status: 404 });

    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    // Scoped to this seller so one can't cancel another's queue, and limited to
    // "scheduled" so an already-published post can't be silently erased.
    const result = await db.socialPost.deleteMany({
        where: { id, sellerId: seller.id, status: "scheduled" },
    });
    if (result.count === 0) {
        return NextResponse.json({ error: "That post is no longer scheduled — it may have already gone out." }, { status: 404 });
    }

    return NextResponse.json({ success: true });
}
