import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserFromRequest } from "@/lib/jwt";
import { createSubaccountForSeller } from "@/lib/paystack-subaccount";

export const dynamic = "force-dynamic";

/**
 * GET /api/sellers/:id/subaccount
 * Public, read-only — returns just the subaccount code (an opaque Paystack
 * reference, not sensitive) so checkout can decide whether to route this
 * seller's payment through a split at charge time.
 */
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const seller = await db.seller.findUnique({
        where: { id },
        select: { paystackSubaccountCode: true },
    });
    return NextResponse.json({ subaccountCode: seller?.paystackSubaccountCode || null });
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

/**
 * DELETE /api/sellers/:id/subaccount
 * Clears the stored subaccount reference so a seller stuck with a broken/unverified
 * subaccount (e.g. one created before the resolve-check existed) can get a fresh one —
 * the "Instant Payout Enabled" state otherwise has no way back once set, permanently
 * hiding the create button even when the underlying subaccount never actually verified.
 * Does not delete anything on Paystack's side (no API for that); the old subaccount is
 * simply orphaned there, harmless since it's never referenced by an order again.
 */
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = getUserFromRequest(request);
    if (!user || user.role !== "admin") {
        return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { id } = await params;
    await db.seller.update({
        where: { id },
        data: { paystackSubaccountCode: null },
    });
    return NextResponse.json({ success: true });
}
