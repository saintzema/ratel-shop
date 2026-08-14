import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * POST /api/products/:id/track
 *
 * Fire-and-forget engagement counter for a listing. Backs the per-ad stats a
 * seller sees on their Products page (views / phone reveals / chats started),
 * which is what makes "is this listing actually working?" answerable — and
 * what a boost purchase is measured against.
 *
 * Deliberately unauthenticated: a view by a logged-out visitor is still a view,
 * and requiring a token here would undercount the majority of real traffic.
 * Nothing sensitive is returned and the only possible mutation is +1 on a
 * counter, so the blast radius of abuse is an inflated vanity number on the
 * seller's own dashboard.
 */

const FIELD_BY_TYPE = {
    view: "viewCount",
    phone: "phoneViewCount",
    chat: "chatCount",
} as const;

type TrackType = keyof typeof FIELD_BY_TYPE;

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await req.json().catch(() => ({}));
        const type: TrackType = body?.type;

        const field = FIELD_BY_TYPE[type];
        if (!field) {
            return NextResponse.json({ error: "Invalid type" }, { status: 400 });
        }

        await db.product.update({
            where: { id },
            data: { [field]: { increment: 1 } },
        });

        return NextResponse.json({ success: true });
    } catch (err: any) {
        // A missing product (P2025) is expected and uninteresting here — global/
        // AI search results carry ids that were never persisted as rows, and the
        // PDP fires a view for those too. Never surface it as an error.
        if (err?.code === "P2025") {
            return NextResponse.json({ success: true, skipped: true });
        }
        console.error("[track] failed:", err);
        return NextResponse.json({ error: "Tracking failed" }, { status: 500 });
    }
}
