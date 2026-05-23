import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/jwt";

/**
 * Save or update a draft financing application (multi-step form progress).
 * Called on "Save Progress" in Step 3, and automatically on Step 4 entry.
 */
export async function POST(req: NextRequest) {
    try {
        const user = getUserFromRequest(req);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const {
            productId,
            applicantType,
            contract,
            currentStep,
            applicationId,
        } = body;

        // Serialize document metadata only (File objects can't cross the wire).
        // Handles both single File and File[] (e.g. CAC Form 1 & 2).
        const serializeDoc = (v: unknown) => {
            if (!v) return null;
            if (Array.isArray(v)) {
                return v.map(f => ({ name: (f as any).name as string, size: (f as any).size as number ?? 0 }));
            }
            if (typeof v === 'object' && 'name' in v) {
                return { name: (v as any).name as string, size: (v as any).size as number ?? 0 };
            }
            return null;
        };
        const documentsJson = body.documents
            ? JSON.stringify(Object.fromEntries(
                Object.entries(body.documents as Record<string, unknown>).map(([k, v]) => [k, serializeDoc(v)])
            ))
            : null;

        const upsertData = {
            userId: user.userId,
            productId: productId || null,
            applicationType: applicantType ?? null,
            contractType: contract?.contractType ?? null,
            currentStep: currentStep ?? 1,
            documentsJson,
            status: 'draft' as const,
            // Loan details from contract selection
            loanAmount: contract?.fundedAmount ?? 0,
            depositAmount: contract?.depositAmount ?? 0,
            tenureMonths: contract?.tenure ?? 12,
            monthlyRepayment: contract?.monthlyPayment ?? 0,
            interestRate: contract?.interestRate ? parseFloat(contract.interestRate) : 0,
            type: applicantType === 'business_owner' ? 'business' : 'individual',
            source: 'web',
        } as const;

        let app;

        if (applicationId) {
            // Update existing draft
            app = await (prisma as any).financingApplication.update({
                where: { id: applicationId },
                data: upsertData,
            });
        } else {
            // Upsert by (userId, productId) — one draft per product per user
            const existing = productId
                ? await (prisma as any).financingApplication.findFirst({
                    where: {
                        userId: user.userId,
                        productId,
                        status: 'draft',
                    },
                })
                : null;

            if (existing) {
                app = await (prisma as any).financingApplication.update({
                    where: { id: existing.id },
                    data: upsertData,
                });
            } else {
                app = await (prisma as any).financingApplication.create({ data: upsertData });
            }
        }

        return NextResponse.json({ success: true, applicationId: app.id });
    } catch (err) {
        console.error('[financing/save-progress] error:', err);
        return NextResponse.json({ error: "Failed to save progress" }, { status: 500 });
    }
}

/**
 * GET /api/financing/save-progress?productId=xxx
 * Returns the most recent draft for this user+product so the UI can restore step/data.
 */
export async function GET(req: NextRequest) {
    try {
        const user = getUserFromRequest(req);
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const productId = req.nextUrl.searchParams.get("productId");
        if (!productId) return NextResponse.json({ error: "productId required" }, { status: 400 });

        const draft = await (prisma as any).financingApplication.findFirst({
            where: { userId: user.userId, productId, status: 'draft' },
            orderBy: { updatedAt: 'desc' },
            select: {
                id: true,
                applicationType: true,
                contractType: true,
                currentStep: true,
                loanAmount: true,
                depositAmount: true,
                tenureMonths: true,
                monthlyRepayment: true,
                interestRate: true,
                documentsJson: true,
            },
        });

        if (!draft) return NextResponse.json({ draft: null });

        // Reconstruct a partial contract object so FinancingFlow can pre-populate Step 2
        const contract = draft.contractType ? {
            contractType: draft.contractType,
            tenure: draft.tenureMonths,
            monthlyPayment: draft.monthlyRepayment,
            depositAmount: draft.depositAmount,
            interestRate: String(draft.interestRate ?? 36),
            fundedAmount: draft.loanAmount,
        } : null;

        return NextResponse.json({
            applicationId: draft.id,
            currentStep: draft.currentStep ?? 1,
            applicantType: draft.applicationType ?? null,
            contract,
        });
    } catch (err) {
        console.error('[financing/save-progress GET] error:', err);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
