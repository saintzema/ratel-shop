import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPaystackTransaction } from "@/lib/paystack-verify";
import { notifyAdmins } from "@/lib/admin-notify";

export const dynamic = "force-dynamic";

// POST /api/quotes/:id/pay  { reference, amount }
// PUBLIC — the client paying a quote never has a FairPrice account. The
// Paystack reference is verified server-side exactly like regular checkout;
// nothing here trusts the client-supplied amount without that check.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    let body: { reference?: string; payerEmail?: string };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }

    const reference = (body.reference || "").trim();
    const payerEmail = (body.payerEmail || "").trim().toLowerCase();
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
        db.quote.update({
            where: { id },
            data: {
                amountPaid: newAmountPaid,
                status: newStatus,
                // Keep the paying email on the quote when we didn't already have a
                // contact — it's the only way the seller can reach this client back.
                ...(payerEmail && !quote.clientContact ? { clientContact: payerEmail } : {}),
            },
        }),
    ]);

    // ─── Everything below is post-payment bookkeeping ───
    // The money is already captured and the quote already updated. None of this
    // may throw back to the payer: a failed notification must never look like a
    // failed payment. Each step is independently guarded.
    const isDeposit = newStatus === "deposit_paid";
    const label = isDeposit ? "Deposit" : balanceRemaining <= 0.5 ? "Full payment" : "Part-payment";
    const amountText = `₦${Math.round(paidNaira).toLocaleString()}`;

    try {
        const seller = await db.seller.findUnique({
            where: { id: quote.sellerId },
            select: { id: true, userId: true, businessName: true, ownerEmail: true },
        });

        // 1. Register the payer as a real customer. A guest paying an invoice was
        //    previously invisible — no account, nothing on any dashboard, no way
        //    to see who had paid. Upsert so a repeat payer isn't duplicated.
        let payerUserId: string | null = null;
        if (payerEmail) {
            const existingUser = await db.user.findUnique({ where: { email: payerEmail }, select: { id: true } });
            if (existingUser) {
                payerUserId = existingUser.id;
            } else {
                const created = await db.user.create({
                    data: {
                        id: `u_quote_${Date.now()}`,
                        email: payerEmail,
                        name: quote.clientName || payerEmail.split("@")[0],
                        role: "customer",
                    },
                    select: { id: true },
                });
                payerUserId = created.id;
            }
        }

        // 2. Tell the seller, in-app, so it lands on their dashboard alerts.
        if (seller?.userId) {
            await db.notification.create({
                data: {
                    userId: seller.userId,
                    type: "order",
                    message: `💰 ${label} of ${amountText} received on "${quote.title}"${payerEmail ? ` from ${payerEmail}` : ""}.${balanceRemaining > 0.5 ? ` Balance outstanding: ₦${Math.round(balanceRemaining).toLocaleString()}.` : " Fully paid."}`,
                    link: `/seller/quotes/${id}`,
                },
            });
        }

        // 3. Receipt to the payer.
        if (payerEmail) {
            await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "https://www.fairprice.ng"}/api/email`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    to: payerEmail,
                    type: "QUOTE_PAYMENT_RECEIPT",
                    payload: {
                        title: quote.title,
                        amount: amountText,
                        sellerName: seller?.businessName || "the seller",
                        balance: balanceRemaining > 0.5 ? `₦${Math.round(balanceRemaining).toLocaleString()}` : null,
                        quoteUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://www.fairprice.ng"}/quote/${id}`,
                    },
                }),
            }).catch(() => { /* receipt is best-effort */ });
        }

        // 4. Admin visibility — money moved on the platform.
        await notifyAdmins(
            `💰 ${label} of ${amountText} on quote "${quote.title}" (${seller?.businessName || quote.sellerId})${payerEmail ? ` — payer ${payerEmail}` : ""}.`,
            { type: "system", link: `/admin/quotes` }
        );
    } catch (e) {
        console.error("[quote pay] post-payment bookkeeping failed:", e);
    }

    return NextResponse.json({ success: true, quote: updated });
}
