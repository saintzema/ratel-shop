import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

// GET /api/orders
// Fetch orders for a specific user or seller
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const customerId = searchParams.get("customerId");
        const sellerId = searchParams.get("sellerId");

        const whereClause: any = {};
        if (customerId) whereClause.customerId = customerId;
        if (sellerId) whereClause.sellerId = sellerId;

        const orders = await db.order.findMany({
            where: whereClause,
            include: {
                product: true,
            },
            orderBy: {
                createdAt: 'desc',
            }
        });

        return NextResponse.json({ success: true, orders });
    } catch (error: any) {
        console.error("Orders API Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// POST /api/orders
// Create a new order after checkout
export async function POST(request: Request) {
    try {
        const body = await request.json();

        const newOrder = await db.order.create({
            data: {
                id: body.tracking_id || `RATEL-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
                customerId: body.customer_id,
                customerName: body.customer_name,
                productId: body.product_id,
                sellerId: body.seller_id,
                sellerName: body.seller_name,
                amount: body.amount,
                quantity: body.quantity || 1,
                shippingAddress: body.shipping_address,
                paymentMethod: body.payment_method || 'paystack',
                status: 'pending',
                escrowStatus: 'held',
            },
            include: {
                product: true
            }
        });

        return NextResponse.json({ success: true, order: newOrder });
    } catch (error: any) {
        console.error("Orders POST Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
