import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        
        if (!body.disputeId || !body.resolution) {
            return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
        }

        const escrowStatus = body.resolution === "resolved_refund" ? "refunded" : "released";

        // Start transaction to update both dispute and order safely
        const [updatedDispute, updatedOrder] = await db.$transaction([
            db.dispute.update({
                where: { id: body.disputeId },
                data: {
                    status: body.resolution,
                    resolvedAt: new Date(),
                    adminNotes: body.adminNotes || "Resolved by Admin",
                }
            }),
            db.order.update({
                where: { id: body.orderId },
                data: {
                    escrowStatus: escrowStatus,
                    escrowReleasedAt: new Date(),
                    status: escrowStatus === "refunded" ? "cancelled" : "delivered"
                }
            })
        ]);

        return NextResponse.json({ success: true, dispute: updatedDispute, order: updatedOrder });
    } catch (error: any) {
        console.error("Dispute Resolution API Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
