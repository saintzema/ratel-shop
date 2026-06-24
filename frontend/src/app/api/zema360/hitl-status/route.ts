import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// UiPath Maestro polls this endpoint to check if a human approval has been resolved.
//
// Two ways to call it:
//   GET /api/zema360/hitl-status?id=<approvalId|code>   — resolve a specific approval
//   GET /api/zema360/hitl-status?orderId=<orderId>      — resolve the latest approval
//                                                          for an order (recommended:
//                                                          orderId is always populated
//                                                          in the BPMN, no fragile
//                                                          approval-id variable passing).
// Returns: { status: "pending" | "approved" | "rejected", approval_id, run_id, resolved_at }
export async function GET(req: NextRequest) {
    const sp = req.nextUrl.searchParams;
    const id = sp.get("id") || sp.get("approvalId") || sp.get("approval_id");
    const orderId = sp.get("orderId") || sp.get("order_id");

    if (!id && !orderId) {
        return NextResponse.json({ error: "id, approvalId, or orderId is required" }, { status: 400 });
    }

    // Prefer a specific handle (runId or cuid); otherwise fall back to the most
    // recent approval for the given order.
    const record = id
        ? await db.zemaApprovalRequest.findFirst({
            where: { OR: [{ runId: id }, { runId: id.toUpperCase() }, { id }] },
            select: { id: true, runId: true, status: true, resolvedAt: true, approvedBy: true },
        })
        : await db.zemaApprovalRequest.findFirst({
            where: { orderId: orderId! },
            orderBy: { createdAt: "desc" },
            select: { id: true, runId: true, status: true, resolvedAt: true, approvedBy: true },
        });

    if (!record) {
        return NextResponse.json({ error: "approval_not_found" }, { status: 404 });
    }

    return NextResponse.json({
        approval_id: record.runId,
        run_id: record.runId,
        status: record.status,
        resolved_at: record.resolvedAt ?? null,
        approved_by: record.approvedBy ?? null,
    });
}
