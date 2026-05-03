import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { broadcast } from "@/lib/realtime-service";

export const runtime = "nodejs";

// GET /api/complaints
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get("userId");
        const sellerId = searchParams.get("sellerId");
        const fetchAll = searchParams.get("all") === "true";

        const whereClause: any = {};
        if (!fetchAll) {
            if (userId) whereClause.userId = userId;
            if (sellerId) whereClause.sellerId = sellerId;
        }

        const complaints = await db.complaint.findMany({
            where: whereClause,
            orderBy: {
                createdAt: 'desc',
            },
            ...(fetchAll ? { take: 100 } : {}),
        });

        // Map to ensure frontend field consistency
        const mapped = complaints.map(c => ({
            ...c,
            user_id: c.userId,
            user_name: c.userName,
            seller_id: c.sellerId,
            seller_name: c.sellerName,
            order_id: c.orderId,
            created_at: c.createdAt,
            updated_at: c.updatedAt,
        }));

        return NextResponse.json({ success: true, complaints: mapped });
    } catch (error: any) {
        console.error("Complaints API Error:", error);
        return NextResponse.json({ success: true, complaints: [] }, {
            status: 503,
            headers: { "X-DB-Status": "offline" }
        });
    }
}

// POST /api/complaints
export async function POST(request: Request) {
    try {
        const body = await request.json();
        
        const newComplaint = await db.complaint.create({
            data: {
                userId: body.user_id,
                userName: body.user_name,
                sellerId: body.seller_id,
                sellerName: body.seller_name,
                orderId: body.order_id,
                type: body.type,
                description: body.description,
                status: 'complaint_open',
            }
        });

        broadcast({ type: "complaint_updated", id: newComplaint.id });

        return NextResponse.json({ success: true, complaint: newComplaint });
    } catch (error: any) {
        console.error("Complaints POST Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
