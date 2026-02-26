import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

// GET /api/negotiations
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const customerId = searchParams.get("customerId");
        const sellerId = searchParams.get("sellerId");

        const whereClause: any = {};
        if (customerId) whereClause.customerId = customerId;
        if (sellerId) whereClause.sellerId = sellerId;

        const negotiations = await db.negotiationRequest.findMany({
            where: whereClause,
            include: {
                product: true,
            },
            orderBy: {
                createdAt: 'desc',
            }
        });

        return NextResponse.json({ success: true, negotiations });
    } catch (error: any) {
        console.error("Negotiations GET Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// POST /api/negotiations
// Create a new price negotiation (used by Ziva AI Chat)
export async function POST(request: Request) {
    try {
        const body = await request.json();

        const newNeg = await db.negotiationRequest.create({
            data: {
                productId: body.product_id,
                customerId: body.buyer_id,
                customerName: body.buyer_name,
                sellerId: body.seller_id,
                proposedPrice: body.target_price,
                status: 'pending',
            }
        });

        return NextResponse.json({ success: true, negotiation: newNeg });
    } catch (error: any) {
        console.error("Negotiations POST Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
