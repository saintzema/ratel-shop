import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserFromRequest } from "@/lib/jwt";
import { EscrowService } from "@/lib/escrow-service";

export const runtime = "nodejs";

export async function POST(request: Request) {
    try {
        const user = getUserFromRequest(request);
        if (!user || user.role !== "admin") {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();

        if (!body.disputeId || !body.resolution) {
            return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
        }

        const isRefund = body.resolution === "resolved_refund";

        // "Release to seller" must go through EscrowService.releaseFunds — it's the
        // single source of truth for commission deduction and Payout-row creation
        // (see resolveCommissionRate). A raw order.update here used to skip both,
        // silently shorting the seller out of a real payout for a dispute the admin
        // just ruled in their favor.
        if (!isRefund && body.orderId) {
            await EscrowService.releaseFunds(body.orderId, user.userId);
        } else if (body.orderId) {
            // Refund path: no payment-provider refund integration exists yet — this
            // only flips order/dispute status. A real money-movement refund still
            // needs to be issued manually via Paystack until that's built.
            await db.order.update({
                where: { id: body.orderId },
                data: {
                    escrowStatus: "refunded",
                    escrowReleasedAt: new Date(),
                    status: "cancelled",
                },
            });
        }

        const updatedDispute = await db.dispute.update({
            where: { id: body.disputeId },
            data: {
                status: body.resolution,
                resolvedAt: new Date(),
                adminNotes: body.adminNotes || "Resolved by Admin",
            },
        });

        return NextResponse.json({ success: true, dispute: updatedDispute });
    } catch (error: any) {
        console.error("Dispute Resolution API Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
