import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { broadcast } from "@/lib/realtime-service";

export const runtime = "nodejs";

// GET /api/disputes
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const buyerId = searchParams.get("buyerId");
        const sellerId = searchParams.get("sellerId");
        const fetchAll = searchParams.get("all") === "true";

        const whereClause: any = {};
        if (!fetchAll) {
            if (buyerId) whereClause.buyerId = buyerId;
            if (sellerId) whereClause.sellerId = sellerId;
        }

        const disputes = await db.dispute.findMany({
            where: whereClause,
            include: {
                order: {
                    include: {
                        product: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc',
            },
            ...(fetchAll ? { take: 100 } : {}),
        });

        // Map to ensure frontend field consistency if needed
        const mappedDisputes = disputes.map(d => ({
            ...d,
            order_id: d.orderId,
            buyer_id: d.buyerId,
            seller_id: d.sellerId,
            product_name: d.productName,
            created_at: d.createdAt,
            resolved_at: d.resolvedAt,
        }));

        return NextResponse.json({ success: true, disputes: mappedDisputes });
    } catch (error: any) {
        console.error("Disputes API Error:", error);
        // Fallback to empty disputes to prevent UI issues if the table is missing or migrating
        return NextResponse.json(
            { success: false, disputes: [], error: "Failed to fetch disputes", details: error.message },
            { status: 200 }
        );
    }
}

// POST /api/disputes
export async function POST(request: Request) {
    try {
        const body = await request.json();
        
        const newDispute = await db.dispute.create({
            data: {
                orderId: body.order_id,
                buyerId: body.buyer_id,
                buyerName: body.buyer_name,
                buyerEmail: body.buyer_email,
                sellerId: body.seller_id,
                sellerName: body.seller_name,
                productName: body.product_name,
                amount: body.amount,
                reason: body.reason,
                description: body.description,
                status: 'open',
            }
        });

        broadcast({ type: "dispute_updated", id: newDispute.id });

        return NextResponse.json({ success: true, dispute: newDispute });
    } catch (error: any) {
        console.error("Disputes POST Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
