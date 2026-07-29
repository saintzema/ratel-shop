import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPaystackTransaction } from "@/lib/paystack-verify";

export const dynamic = "force-dynamic";

// POST /api/quotes/:id/pay  { reference, amount }
// PUBLIC — the client paying a quote never has a FairPrice account. The
// Paystack reference is verified server-side exactly like regular checkout;
// nothing here trusts the client-supplied amount without that check.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    let body: { reference?: string };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }

    const reference = (body.reference || "").trim();
    if (!reference) return NextResponse.json({ error: "reference_required" }, { status: 400 });

    const quote = await db.quote.findUnique({ where: { id } });
    if (!quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 });

    const result = await verifyPaystackTransaction(reference);
    if (!result.ok || result.tx.status !== "success") {
        return NextResponse.json({ error: "Payment could not be verified" }, { status: 402 });
    }

    const paidNaira = (result.tx.amount || 0) / 100;
    const existing = await db.quotePayment.findUnique({ where: { reference } });
    if (existing) {
        // Already recorded — return current state instead of double-crediting.
        const current = await db.quote.findUnique({ where: { id } });
        return NextResponse.json({ success: true, quote: current });
    }

    const newAmountPaid = quote.amountPaid + paidNaira;
    const balanceRemaining = quote.total - newAmountPaid;
    const newStatus = balanceRemaining <= 0.5 ? "paid" : quote.depositRequired && newAmountPaid >= (quote.depositAmount || 0) ? "deposit_paid" : quote.status;

    const [, updated] = await db.$transaction([
        db.quotePayment.create({ data: { quoteId: id, amount: paidNaira, reference } }),
        db.quote.update({ where: { id }, data: { amountPaid: newAmountPaid, status: newStatus } }),
    ]);

    return NextResponse.json({ success: true, quote: updated });
}
