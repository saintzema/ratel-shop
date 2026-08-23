import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { broadcast } from "@/lib/realtime-service";
import { getUserFromRequest } from "@/lib/jwt";

export const runtime = "nodejs";

// GET /api/reviews
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const productId = searchParams.get("productId");
        const userId = searchParams.get("userId");
        const fetchAll = searchParams.get("all") === "true";

        const whereClause: any = {};
        if (!fetchAll) {
            if (productId) whereClause.productId = productId;
            if (userId) whereClause.userId = userId;
        }

        const reviews = await db.review.findMany({
            where: whereClause,
            include: {
                product: {
                    select: {
                        name: true,
                        imageUrl: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc',
            },
            ...(fetchAll ? { take: 100 } : {}),
        });

        // Map for frontend consistency
        const mapped = reviews.map(r => ({
            ...r,
            user_id: r.userId,
            user_name: r.userName,
            product_id: r.productId,
            product_name: r.product?.name,
            product_image: r.product?.imageUrl,
            created_at: r.createdAt,
        }));

        // Reviews are public, non-personalized data; the CDN caches per-URL so a
        // ?productId / ?userId / all=true read each get their own cache entry. Edge-caching
        // means review reads (incl. every full sync) hit the CDN, not Neon. New reviews
        // appear within ~30s (POST also broadcasts + the client adds it locally instantly).
        return NextResponse.json({ success: true, reviews: mapped }, {
            headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120" }
        });
    } catch (error: any) {
        console.error("Reviews API Error:", error);
        return NextResponse.json({ success: true, reviews: [] }, {
            status: 500,
            headers: { "X-DB-Status": "offline" }
        });
    }
}

// POST /api/reviews
//
// Reviews written here are published to Google as schema.org Review markup on
// the product page, so this endpoint is a structured-data surface, not just a
// UI feature. It used to be completely unauthenticated and took user_id,
// user_name AND verified_purchase straight from the request body — meaning
// anyone could post a review as any person, on any product, and mark it a
// verified purchase. That is a spam-injection path onto our own domain, and
// fabricated reviews risk a manual action against the whole site.
//
// Identity now comes from the token, and "verified purchase" is derived from
// actual order history rather than claimed by the client.
export async function POST(request: Request) {
    try {
        const user = getUserFromRequest(request);
        if (!user) {
            return NextResponse.json({ success: false, error: "Sign in to leave a review" }, { status: 401 });
        }

        const body = await request.json();

        const productId = String(body.product_id || "").trim();
        const rating = Number(body.rating);
        const title = String(body.title || "").trim();
        const reviewBody = String(body.body || "").trim();

        if (!productId) {
            return NextResponse.json({ success: false, error: "product_id is required" }, { status: 400 });
        }
        if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
            return NextResponse.json({ success: false, error: "Rating must be between 1 and 5" }, { status: 400 });
        }
        // Body is optional on purpose. The Ziva post-delivery concierge collects a
        // star rating with no written text, and a rating-only review is valid both
        // for us and for schema.org (reviewRating without reviewBody). Requiring
        // text here would have silently 400'd every rating left through that flow.

        // The product must exist — otherwise reviews can be attached to arbitrary
        // ids and surface as markup on pages that were never real.
        const product = await db.product.findUnique({ where: { id: productId }, select: { id: true } });
        if (!product) {
            return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });
        }

        // One review per person per product. Without this, a single user can
        // inflate a product's aggregateRating without limit.
        const existing = await db.review.findFirst({
            where: { productId, userId: user.userId },
            select: { id: true },
        });
        if (existing) {
            return NextResponse.json(
                { success: false, error: "You've already reviewed this product" },
                { status: 409 }
            );
        }

        // Resolve the display name from the account, never from the request.
        const account = await db.user.findUnique({
            where: { id: user.userId },
            select: { name: true, email: true },
        });
        const userName = (account?.name || account?.email?.split("@")[0] || "FairPrice Buyer").trim();

        // Earned, not claimed: true only if this user actually has a delivered or
        // completed order containing this product.
        let verifiedPurchase = false;
        try {
            const order = await db.order.findFirst({
                where: {
                    customerId: user.userId,
                    productId,
                    status: { in: ["delivered", "completed"] as any },
                },
                select: { id: true },
            });
            verifiedPurchase = !!order;
        } catch {
            // Never let this check fail the review — just don't claim verification.
            verifiedPurchase = false;
        }

        const newReview = await db.review.create({
            data: {
                userId: user.userId,
                userName,
                productId,
                rating: Math.round(rating),
                title: title || (reviewBody ? reviewBody.slice(0, 60) : `${Math.round(rating)}-star rating`),
                body: reviewBody,
                verifiedPurchase,
            }
        });

        broadcast({ type: "review_updated", id: newReview.id });

        return NextResponse.json({ success: true, review: newReview });
    } catch (error: any) {
        console.error("Reviews POST Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
