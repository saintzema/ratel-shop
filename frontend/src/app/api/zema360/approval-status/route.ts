/**
 * GET /api/zema360/approval-status?id=<approvalId>
 *
 * Polling endpoint for the Python orchestrator on Alibaba Function Compute.
 * After sending a HITL WhatsApp, the agent polls here until status != "pending".
 *
 * Auth: Bearer ZEMA_SERVICE_TOKEN
 *
 * Returns:
 *   { id, runId, status: "pending"|"approved"|"rejected", resolvedAt, agentDecision }
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireZemaAuth } from "@/lib/zema-auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
    const authError = requireZemaAuth(request);
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
        return NextResponse.json({ error: "id query param is required" }, { status: 400 });
    }

    try {
        const record = await db.zemaApprovalRequest.findUnique({
            where: { id },
            select: {
                id: true,
                runId: true,
                status: true,
                resolvedAt: true,
                approvedBy: true,
                agentDecision: true,
                orderId: true,
                sellerId: true,
                buyerId: true,
                productId: true,
                createdAt: true,
            },
        });

        if (!record) {
            return NextResponse.json({ error: "Approval request not found" }, { status: 404 });
        }

        return NextResponse.json(record);
    } catch (err: any) {
        console.error("[approval-status] error:", err);
        return NextResponse.json(
            { error: err?.message ?? "Lookup failed" },
            { status: 500 }
        );
    }
}
