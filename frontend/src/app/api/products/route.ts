import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
    try {
        const products = await db.product.findMany({
            where: { isActive: true },
            orderBy: { createdAt: "desc" },
        });

        // Map camelCase DB fields back to snake_case for the frontend types if needed
        const mappedProducts = products.map(p => ({
            id: p.id,
            seller_id: p.sellerId,
            seller_name: p.sellerName,
            name: p.name,
            description: p.description,
            price: p.price,
            original_price: p.originalPrice,
            recommended_price: p.recommendedPrice,
            category: p.category,
            image_url: p.imageUrl,
            images: p.images,
            stock: p.stock,
            price_flag: p.priceFlag,
            is_sponsored: p.isSponsored,
            is_active: p.isActive,
            avg_rating: p.avgRating,
            review_count: p.reviewCount,
            sold_count: p.soldCount,
            highlights: p.highlights,
            specs: p.specs,
            created_at: p.createdAt.toISOString(),
        }));

        return NextResponse.json(mappedProducts);
    } catch (error) {
        console.error("Database fetch error:", error);
        return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
    }
}
