import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Path-param variant: GET /api/zema360/hitl-status/:id
// Mirrors the query-param variant at /api/zema360/hitl-status?id=...
// UiPath Autopilot may generate path-param URLs; both are supported.
export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    if (!id) {
        return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    // Resolve by runId (the short handle) OR the underlying cuid.
    const record = await db.zemaApprovalRequest.findFirst({
        where: { OR: [{ runId: id }, { runId: id.toUpperCase() }, { id }] },
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
