import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { broadcast } from "../realtime/route";

export const runtime = "nodejs";

// GET /api/orders
// Fetch orders for a specific user or seller
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const customerId = searchParams.get("customerId");
        const sellerId = searchParams.get("sellerId");
        const fetchAll = searchParams.get("all") === "true";

        const whereClause: any = {};
        if (!fetchAll) {
            if (customerId) whereClause.customerId = customerId;
            if (sellerId) whereClause.sellerId = sellerId;
        }

        const orders = await db.order.findMany({
            where: whereClause,
            include: {
                product: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
            ...(fetchAll ? { take: 200 } : {}), // Limit for admin sync to prevent overload
        });

        return NextResponse.json({ success: true, orders });
    } catch (error: any) {
        console.error("Orders API Error:", error);
        // Return empty array so client falls back to local orders
        return NextResponse.json({ success: true, orders: [] }, {
            status: 200,
            headers: { "X-DB-Status": "offline" }
        });
    }
}

// POST /api/orders
// Create a new order after checkout
export async function POST(request: Request) {
    try {
        const body = await request.json();

        // Ensure user exists first (prevents FK constraint violation)
        const userId = body.customer_id;
        const userEmail = body.customer_email || `${userId}@fairprice.ng`;
        const userName = body.customer_name || "Customer";

        await db.user.upsert({
            where: { id: userId },
            update: { name: userName },
            create: {
                id: userId,
                email: userEmail,
                name: userName,
                role: "customer",
            }
        }).catch(async () => {
            // If upsert by ID fails (e.g. email conflict), try by email
            await db.user.upsert({
                where: { email: userEmail },
                update: { name: userName },
                create: {
                    id: userId,
                    email: userEmail,
                    name: userName,
                    role: "customer",
                }
            }).catch(() => { /* ignore — order will save locally */ });
        });

        const newOrder = await db.order.create({
            data: {
                id: body.tracking_id || `FP-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
                customerId: userId,
                customerName: userName,
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

        // Broadcast update for real-time sync
        broadcast({ type: "order_updated", id: newOrder.id });

        return NextResponse.json({ success: true, order: newOrder });
    } catch (error: any) {
        console.error("Orders POST Error:", error);
        // Acknowledge receipt — the client-side offline queue will retry
        return NextResponse.json({ success: true, queued: true, error: "DB offline — order saved locally" }, {
            status: 202,
            headers: { "X-DB-Status": "offline" }
        });
    }
}
