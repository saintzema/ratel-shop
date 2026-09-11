import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/jwt";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET  /api/account/identity — the caller's own NIN verification status.
 * POST /api/account/identity { ninNumber } — submit for review.
 *
 * No live NIMC/NIN lookup happens here — that requires an official
 * government data-sharing agreement FairPrice doesn't have yet, so this
 * just records the submission as "pending" for manual admin review, the
 * same shape as the existing seller KYC and vehicle-inspection queues.
 */
export async function GET(req: NextRequest) {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const record = await db.user.findUnique({
        where: { id: user.userId },
        select: { ninStatus: true, ninSubmittedAt: true, ninReviewedAt: true, ninRejectionReason: true, ninNumber: true },
    });
    if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({
        status: record.ninStatus,
        submittedAt: record.ninSubmittedAt,
        reviewedAt: record.ninReviewedAt,
        rejectionReason: record.ninRejectionReason,
        // Masked — never hand a full NIN back to the client that submitted it.
        ninMasked: record.ninNumber ? `${"*".repeat(Math.max(0, record.ninNumber.length - 4))}${record.ninNumber.slice(-4)}` : null,
    });
}

export async function POST(req: NextRequest) {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const nin = String(body?.ninNumber || "").replace(/\s+/g, "");
    if (!/^\d{11}$/.test(nin)) {
        return NextResponse.json({ error: "Enter your 11-digit National Identification Number" }, { status: 400 });
    }

    const existing = await db.user.findUnique({ where: { id: user.userId }, select: { ninStatus: true } });
    if (existing?.ninStatus === "approved") {
        return NextResponse.json({ error: "Your identity is already verified" }, { status: 400 });
    }

    await db.user.update({
        where: { id: user.userId },
        data: { ninNumber: nin, ninStatus: "pending", ninSubmittedAt: new Date(), ninReviewedAt: null, ninRejectionReason: null },
    });

    return NextResponse.json({ success: true });
}
