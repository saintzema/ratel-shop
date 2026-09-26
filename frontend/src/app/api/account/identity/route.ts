import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/jwt";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const ID_TYPES = ["nin", "drivers_license", "voters_card", "passport"] as const;
type IdTypeValue = (typeof ID_TYPES)[number];

/**
 * GET  /api/account/identity — the caller's own verification status.
 * POST /api/account/identity { ninNumber, documentUrl, documentType } — submit.
 *
 * No live NIMC/NIN lookup happens here — that requires an official
 * government data-sharing agreement FairPrice doesn't have yet, so this
 * records the submission as "pending" for manual admin review, the same
 * shape as the existing seller KYC and vehicle-inspection queues. Which is
 * exactly why a DOCUMENT matters: with nothing to check the number against,
 * a typed 11 digits is a claim and the scan is the only actual evidence the
 * reviewer has.
 */

/**
 * Someone who already passed KYC as a seller has, by definition, had a
 * government ID checked and approved by an admin. Asking them to do the whole
 * thing again on the buyer side is pointless friction, so a seller's approved
 * KYC counts here too — and a pending one shows as pending rather than as
 * "you have not started".
 */
async function sellerKycFor(userId: string) {
    const sellers = await db.seller.findMany({
        where: { userId },
        select: {
            id: true, businessName: true, kycStatus: true, idDocumentUrl: true,
            kycSubmissions: {
                orderBy: { createdAt: "desc" },
                take: 1,
                select: { status: true, createdAt: true, reviewedAt: true, reviewNotes: true, idType: true },
            },
        },
    });
    if (sellers.length === 0) return null;

    // Best status across their stores — approved beats pending beats the rest.
    const rank = (s: string) => (s === "approved" ? 3 : s === "pending" ? 2 : s === "rejected" ? 1 : 0);
    const best = sellers.reduce((a, b) => (rank(b.kycStatus) > rank(a.kycStatus) ? b : a));
    if (rank(best.kycStatus) === 0 && !best.kycSubmissions.length) return null;

    const submission = best.kycSubmissions[0];
    return {
        storeName: best.businessName,
        status: best.kycStatus,
        idType: submission?.idType ?? null,
        submittedAt: submission?.createdAt ?? null,
        reviewedAt: submission?.reviewedAt ?? null,
        hasDocument: !!(best.idDocumentUrl || submission),
    };
}

export async function GET(req: NextRequest) {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [record, sellerKyc] = await Promise.all([
        db.user.findUnique({
            where: { id: user.userId },
            select: {
                ninStatus: true, ninSubmittedAt: true, ninReviewedAt: true,
                ninRejectionReason: true, ninNumber: true,
                ninDocumentUrl: true, ninDocumentType: true,
            },
        }),
        // Never let a store lookup break the identity page — that page
        // rendering nothing at all is the bug we just fixed.
        sellerKycFor(user.userId).catch(() => null),
    ]);
    if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // The seller's approved KYC carries the account, so a verified vendor
    // isn't told to verify all over again.
    const effectiveStatus =
        record.ninStatus === "approved" ? "approved"
            : sellerKyc?.status === "approved" ? "approved"
                : record.ninStatus !== "not_submitted" ? record.ninStatus
                    : sellerKyc?.status === "pending" ? "pending"
                        : record.ninStatus;

    return NextResponse.json({
        status: effectiveStatus,
        ownStatus: record.ninStatus,
        submittedAt: record.ninSubmittedAt,
        reviewedAt: record.ninReviewedAt,
        rejectionReason: record.ninRejectionReason,
        hasDocument: !!record.ninDocumentUrl,
        documentType: record.ninDocumentType,
        // Masked — never hand a full NIN back to the client that submitted it.
        ninMasked: record.ninNumber ? `${"*".repeat(Math.max(0, record.ninNumber.length - 4))}${record.ninNumber.slice(-4)}` : null,
        sellerKyc,
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

    const documentUrl = String(body?.documentUrl || "").trim();
    if (!documentUrl) {
        return NextResponse.json({ error: "Upload a photo of your ID so we can verify it" }, { status: 400 });
    }
    // Only our own Blob storage, never an arbitrary link — a reviewer opening
    // a submitted URL should not be able to be pointed at someone else's site.
    if (!/^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\//i.test(documentUrl)) {
        return NextResponse.json({ error: "Upload the document through this page" }, { status: 400 });
    }

    const rawType = String(body?.documentType || "nin");
    const documentType: IdTypeValue = (ID_TYPES as readonly string[]).includes(rawType)
        ? (rawType as IdTypeValue)
        : "nin";

    const existing = await db.user.findUnique({ where: { id: user.userId }, select: { ninStatus: true } });
    if (existing?.ninStatus === "approved") {
        return NextResponse.json({ error: "Your identity is already verified" }, { status: 400 });
    }

    await db.user.update({
        where: { id: user.userId },
        data: {
            ninNumber: nin,
            ninDocumentUrl: documentUrl,
            ninDocumentType: documentType,
            ninStatus: "pending",
            ninSubmittedAt: new Date(),
            ninReviewedAt: null,
            ninRejectionReason: null,
        },
    });

    return NextResponse.json({ success: true });
}
