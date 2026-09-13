import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { recomputeSellerRating } from "@/lib/seller-rating";
import { notifyAdmins } from "@/lib/admin-notify";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/quotes/:id/review — PUBLIC. The client who paid an expert/service
// quote never has a FairPrice account (see pay/route.ts), so this can't gate
// on a JWT the way /api/reviews does. Instead it gates on the one fact that
// actually matters here: real money moved on this exact quote. That's a
// stronger signal than a login — it's a stronger signal than most e-commerce
// "verified purchase" checks, in fact, since it's synchronous with payment
// rather than inferred from order history days later.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    let body: { rating?: number; title?: string; body?: string; reviewerName?: string; reviewerEmail?: string };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }

    const rating = Number(body.rating);
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
        return NextResponse.json({ error: "Rating must be between 1 and 5" }, { status: 400 });
    }
    const reviewerEmail = (body.reviewerEmail || "").trim().toLowerCase();
    if (!reviewerEmail || !EMAIL_RE.test(reviewerEmail)) {
        return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
    }

    const quote = await db.quote.findUnique({ where: { id }, select: { id: true, sellerId: true, status: true, clientName: true, title: true } });
    if (!quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    if (quote.status !== "paid" && quote.status !== "deposit_paid") {
        return NextResponse.json({ error: "This quote hasn't been paid yet" }, { status: 403 });
    }

    const existing = await db.review.findUnique({ where: { quoteId: id }, select: { id: true } });
    if (existing) {
        return NextResponse.json({ error: "This engagement has already been reviewed" }, { status: 409 });
    }

    // Same guest-upsert pattern as pay/route.ts — the payer may or may not
    // already have a User row from paying.
    let userId: string;
    const existingUser = await db.user.findUnique({ where: { email: reviewerEmail }, select: { id: true } });
    if (existingUser) {
        userId = existingUser.id;
    } else {
        const created = await db.user.create({
            data: {
                id: `u_quote_${Date.now()}`,
                email: reviewerEmail,
                name: body.reviewerName || quote.clientName || reviewerEmail.split("@")[0],
                role: "customer",
            },
            select: { id: true },
        });
        userId = created.id;
    }

    const reviewBody = String(body.body || "").trim();
    const title = String(body.title || "").trim() || (reviewBody ? reviewBody.slice(0, 60) : `${Math.round(rating)}-star rating`);
    const userName = body.reviewerName || quote.clientName || reviewerEmail.split("@")[0];

    let review;
    try {
        review = await db.review.create({
            data: {
                userId,
                userName,
                sellerId: quote.sellerId,
                quoteId: quote.id,
                rating: Math.round(rating),
                title,
                body: reviewBody,
                verifiedPurchase: true,
            },
        });
    } catch (e: any) {
        // Race: two requests hit the unique quoteId constraint at once.
        if (e?.code === "P2002") {
            return NextResponse.json({ error: "This engagement has already been reviewed" }, { status: 409 });
        }
        throw e;
    }

    await recomputeSellerRating(quote.sellerId);

    try {
        const seller = await db.seller.findUnique({ where: { id: quote.sellerId }, select: { userId: true, businessName: true } });
        if (seller?.userId) {
            await db.notification.create({
                data: {
                    userId: seller.userId,
                    type: "system",
                    message: `⭐ ${userName} left a ${Math.round(rating)}-star review on "${quote.title}".`,
                    link: `/seller/quotes/${id}`,
                },
            });
        }
        await notifyAdmins(
            `⭐ New expert-hire review: ${Math.round(rating)}★ for ${seller?.businessName || quote.sellerId} on quote "${quote.title}".`,
            { type: "system", link: `/admin/quotes` }
        ).catch(() => {});
    } catch (e) {
        console.error("[quote review] notification failed:", e);
    }

    return NextResponse.json({ success: true, review });
}
