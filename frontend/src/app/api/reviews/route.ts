import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { broadcast } from "@/lib/realtime-service";

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

        return NextResponse.json({ success: true, reviews: mapped });
    } catch (error: any) {
        console.error("Reviews API Error:", error);
        return NextResponse.json({ success: true, reviews: [] }, {
            status: 503,
            headers: { "X-DB-Status": "offline" }
        });
    }
}

// POST /api/reviews
export async function POST(request: Request) {
    try {
        const body = await request.json();
        
        const newReview = await db.review.create({
            data: {
                userId: body.user_id,
                userName: body.user_name,
                productId: body.product_id,
                rating: body.rating,
                title: body.title,
                body: body.body,
                verifiedPurchase: body.verified_purchase || false,
            }
        });

        broadcast({ type: "review_updated", id: newReview.id });

        return NextResponse.json({ success: true, review: newReview });
    } catch (error: any) {
        console.error("Reviews POST Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
