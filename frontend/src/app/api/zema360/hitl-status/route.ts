import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// UiPath Maestro polls this endpoint to check if a human approval has been resolved.
// GET /api/zema360/hitl-status?id=<approvalId>
// Returns: { status: "pending" | "approved" | "rejected", approval_id, run_id, resolved_at }
export async function GET(req: NextRequest) {
    const id = req.nextUrl.searchParams.get("id")
        || req.nextUrl.searchParams.get("approvalId")
        || req.nextUrl.searchParams.get("approval_id");
    if (!id) {
        return NextResponse.json({ error: "id or approvalId is required" }, { status: 400 });
    }

    const record = await db.zemaApprovalRequest.findUnique({
        where: { id },
        select: { id: true, runId: true, status: true, resolvedAt: true, approvedBy: true },
    });

    if (!record) {
        return NextResponse.json({ error: "approval_not_found" }, { status: 404 });
    }

    return NextResponse.json({
        approval_id: record.id,
        run_id: record.runId,
        status: record.status,
        resolved_at: record.resolvedAt ?? null,
        approved_by: record.approvedBy ?? null,
    });
}
