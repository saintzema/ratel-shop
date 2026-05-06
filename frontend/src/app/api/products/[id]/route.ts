import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request, { params }: { params: { id: string } }) {
    try {
        const product = await db.product.findUnique({
            where: { id: params.id },
            include: {
                seller: {
                    select: {
                        businessName: true,
                        status: true,
                        verified: true,
                        rating: true,
                        trustScore: true,
                        createdAt: true,
                        subscriptionPlan: true
                    }
                }
            }
        });

        if (!product) {
            return NextResponse.json({ error: "Product not found" }, { status: 404 });
        }

        // Map to senior tech lead snake_case format
        const mapped = {
            ...product,
            seller_id: product.sellerId,
            seller_name: product.sellerName || product.seller?.businessName,
            original_price: product.originalPrice,
            recommended_price: product.recommendedPrice,
            image_url: product.imageUrl,
            price_flag: product.priceFlag,
            is_sponsored: product.isSponsored,
            is_trending: product.isTrending,
            is_active: product.isActive,
            financing_available: product.financingAvailable,
            avg_rating: product.avgRating,
            review_count: product.reviewCount,
            sold_count: product.soldCount,
            created_at: product.createdAt.toISOString(),
            updated_at: product.updatedAt.toISOString(),
            // Ensure seller data is included for the product detail page
            seller: product.seller ? {
                ...product.seller,
                business_name: product.seller.businessName,
                subscription_plan: product.seller.subscriptionPlan,
                trust_score: product.seller.trustScore,
                created_at: product.seller.createdAt.toISOString()
            } : null
        };

        return NextResponse.json(mapped);
    } catch (error: any) {
        console.error("Fetch product error:", error);
        return NextResponse.json({ error: "Failed to fetch product" }, { status: 500 });
    }
}
