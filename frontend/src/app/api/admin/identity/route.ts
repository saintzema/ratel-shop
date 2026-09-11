import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/jwt";
import { db } from "@/lib/db";
import { notifyUser } from "@/lib/user-notify";

export const dynamic = "force-dynamic";

/**
 * GET   /api/admin/identity?status=pending — the NIN review queue.
 * PATCH /api/admin/identity { userId, status, rejectionReason? } — approve/reject.
 */
export async function GET(req: NextRequest) {
    const user = getUserFromRequest(req);
    if (!user || user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const validStatus = status && ["pending", "approved", "rejected"].includes(status) ? status : null;

    const users = await db.user.findMany({
        where: { ninStatus: validStatus ? (validStatus as any) : { not: "not_submitted" } },
        select: { id: true, name: true, email: true, whatsappNumber: true, ninNumber: true, ninStatus: true, ninSubmittedAt: true, ninReviewedAt: true, ninRejectionReason: true },
        orderBy: { ninSubmittedAt: "desc" },
    });
    return NextResponse.json({ users });
}

export async function PATCH(req: NextRequest) {
    const user = getUserFromRequest(req);
    if (!user || user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const { userId, status, rejectionReason } = body || {};
    if (!userId || !["approved", "rejected"].includes(String(status))) {
        return NextResponse.json({ error: "userId and a valid status are required" }, { status: 400 });
    }

    let updated;
    try {
        updated = await db.user.update({
            where: { id: userId },
            data: {
                ninStatus: status,
                ninReviewedAt: new Date(),
                ninRejectionReason: status === "rejected" ? (rejectionReason || "Could not be verified") : null,
            },
        });
    } catch {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    await notifyUser(updated.id,
        status === "approved"
            ? `✅ Your identity has been verified — you'll now see a Verified badge across FairPrice.`
            : `Your identity verification wasn't approved: ${updated.ninRejectionReason}`
    ).catch(() => {});

    return NextResponse.json({ success: true });
}
