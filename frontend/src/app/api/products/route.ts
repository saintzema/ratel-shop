import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { broadcast } from "../realtime/route";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const includeInactive = searchParams.get("all") === "true";

        const whereClause: any = includeInactive
            ? {}
            : {
                isActive: true,
                seller: {
                    status: "active"
                }
            };

        const products = await db.product.findMany({
            where: whereClause,
            include: {
                seller: true
            },
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

export async function POST(req: Request) {
    try {
        const body = await req.json();

        // Enforce Seller Status: Products can only be active if the seller is active
        const seller = await db.seller.findUnique({
            where: { id: body.seller_id },
            select: { status: true }
        });

        const isSellerActive = seller?.status === "active";

        const productData = {
            id: body.id,
            sellerId: body.seller_id,
            sellerName: body.seller_name,
            name: body.name,
            description: body.description || "",
            price: body.price,
            originalPrice: body.original_price,
            recommendedPrice: body.recommended_price,
            category: body.category,
            imageUrl: body.image_url,
            images: body.images || [],
            stock: body.stock ?? 100,
            priceFlag: body.price_flag || "none",
            isSponsored: body.is_sponsored || false,
            isActive: isSellerActive ? (body.is_active !== false) : false,
            avgRating: body.avg_rating || 0,
            reviewCount: body.review_count || 0,
            soldCount: body.sold_count || 0,
            highlights: body.highlights || [],
            specs: body.specs || {},
            externalUrl: body.external_url,
        };

        const product = await db.product.upsert({
            where: { id: productData.id },
            update: productData,
            create: productData,
        });

        // Broadcast update for real-time sync
        broadcast({ type: "product_updated", id: product.id });

        return NextResponse.json(product);
    } catch (error: any) {
        console.error("Product creation error:", error);
        return NextResponse.json({ error: error.message || "Failed to create product" }, { status: 500 });
    }
}
