import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserFromRequest } from "@/lib/jwt";
import { resolveBankCode } from "@/lib/bank-codes";

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
 *
 * Provisions a Paystack Subaccount for this seller using their on-file bank
 * details, and stores the returned subaccount_code. Once set, QR/direct-
 * payment checkouts route the seller's exact cut there via Paystack's split
 * at the moment of payment — Paystack settles it to their bank automatically,
 * no Transfer API call ever fires for that seller again.
 *
 * percentage_charge is set to 100 (main account keeps nothing by default);
 * the actual per-transaction split is overridden via transaction_charge at
 * checkout time, since our platform fee is tiered/variable, not a fixed %.
 */
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = getUserFromRequest(request);
        if (!user || user.role !== "admin") {
            return NextResponse.json({ error: "Admin access required" }, { status: 403 });
        }

        const { id } = await params;
        const seller = await db.seller.findUnique({
            where: { id },
            select: { id: true, businessName: true, bankName: true, accountNumber: true, accountName: true, ownerEmail: true, paystackSubaccountCode: true },
        });

        if (!seller) {
            return NextResponse.json({ error: "Seller not found" }, { status: 404 });
        }
        if (seller.paystackSubaccountCode) {
            return NextResponse.json({ error: "Seller already has a subaccount", subaccountCode: seller.paystackSubaccountCode }, { status: 409 });
        }
        if (!seller.bankName || !seller.accountNumber) {
            return NextResponse.json({ error: "Seller has no bank details on file — cannot create a subaccount." }, { status: 400 });
        }

        const secret = process.env.PAYSTACK_SECRET_KEY;
        if (!secret) {
            return NextResponse.json({ error: "Paystack not configured on this server." }, { status: 500 });
        }

        const bankCode = resolveBankCode(seller.bankName);

        const res = await fetch("https://api.paystack.co/subaccount", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${secret}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                business_name: seller.accountName || seller.businessName,
                settlement_bank: bankCode,
                account_number: seller.accountNumber,
                percentage_charge: 100, // overridden per-transaction via transaction_charge
                primary_contact_email: seller.ownerEmail || undefined,
                settlement_schedule: "AUTO", // T+1
            }),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok || !data?.status) {
            return NextResponse.json(
                { error: data?.message || "Paystack rejected the subaccount request", detail: data },
                { status: 502 }
            );
        }

        const subaccountCode = data.data?.subaccount_code;
        if (!subaccountCode) {
            return NextResponse.json({ error: "Paystack did not return a subaccount code" }, { status: 502 });
        }

        await db.seller.update({
            where: { id: seller.id },
            data: { paystackSubaccountCode: subaccountCode },
        });

        return NextResponse.json({ success: true, subaccountCode });
    } catch (error: any) {
        console.error("[subaccount] creation error:", error);
        return NextResponse.json({ error: "Failed to create subaccount", detail: error?.message }, { status: 500 });
    }
}
