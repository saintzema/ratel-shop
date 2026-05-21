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

        // Serialize document metadata only (not the actual File objects, which can't cross the wire)
        const documentsJson = body.documents
            ? JSON.stringify(
                Object.fromEntries(
                    Object.entries(body.documents as Record<string, unknown>).map(([k, v]) => [
                        k,
                        v && typeof v === 'object' && 'name' in v
                            ? {
                                name: (v as Record<string, unknown>)['name'] as string,
                                size: (v as Record<string, unknown>)['size'] as number ?? 0,
                              }
                            : null,
                    ])
                )
            )
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
