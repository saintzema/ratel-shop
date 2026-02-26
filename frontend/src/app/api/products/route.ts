import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

// GET /api/products
// Fetch products, with optional search and category filters
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const category = searchParams.get("category");
        const query = searchParams.get("q");
        const limitParams = searchParams.get("limit");

        const limit = limitParams ? parseInt(limitParams) : 50;

        const whereClause: any = {
            isActive: true,
        };

        if (category && category !== "all") {
            whereClause.category = category;
        }

        if (query) {
            whereClause.OR = [
                { name: { contains: query, mode: 'insensitive' } },
                { description: { contains: query, mode: 'insensitive' } },
            ];
        }

        const products = await db.product.findMany({
            where: whereClause,
            take: limit,
            orderBy: {
                soldCount: 'desc',
            }
        });

        return NextResponse.json({ success: true, products });
    } catch (error: any) {
        console.error("Products API Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// POST /api/products
// Create a new product (Seller/Admin only)
export async function POST(request: Request) {
    try {
        const body = await request.json();

        // In a real app, verify user auth & role (Seller/Admin) here
        // const session = await auth();

        const newProduct = await db.product.create({
            data: {
                sellerId: body.sellerId,
                sellerName: body.sellerName,
                name: body.name,
                description: body.description,
                price: body.price,
                category: body.category,
                imageUrl: body.imageUrl,
                images: body.images || [body.imageUrl],
                stock: body.stock || 1,
                condition: body.condition || 'brand_new',
                specs: body.specs || {},
            },
        });

        return NextResponse.json({ success: true, product: newProduct });
    } catch (error: any) {
        console.error("Products POST Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
