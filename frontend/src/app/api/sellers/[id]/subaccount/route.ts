import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserFromRequest } from "@/lib/jwt";
import { createSubaccountForSeller } from "@/lib/paystack-subaccount";
import { resolveCommissionRate } from "@/lib/commission";

export const dynamic = "force-dynamic";

/**
 * GET /api/sellers/:id/subaccount
 * Public, read-only — returns the subaccount code (an opaque Paystack
 * reference, not sensitive) so checkout can decide whether to route this
 * seller's payment through a split at charge time, plus their commission
 * rate so checkout can size that split's platform cut correctly.
 */
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const seller = await db.seller.findUnique({
        where: { id },
        select: { paystackSubaccountCode: true, commissionRate: true },
    });
    return NextResponse.json({
        subaccountCode: seller?.paystackSubaccountCode || null,
        commissionRate: await resolveCommissionRate(seller?.commissionRate),
    });
}

/**
 * POST /api/sellers/:id/subaccount
 * Admin-triggered manual creation — most sellers get this automatically the moment
 * they save bank details that resolve correctly (see createSubaccountForSeller call
 * in /api/sellers POST); this stays available for sellers who need a retry.
 */
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = getUserFromRequest(request);
    if (!user || user.role !== "admin") {
        return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { id } = await params;
    const result = await createSubaccountForSeller(id);
    if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ success: true, subaccountCode: result.subaccountCode });
}
