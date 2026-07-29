import { NextRequest, NextResponse } from "next/server";
import { verifyPaystackTransaction } from "@/lib/paystack-verify";

export const dynamic = "force-dynamic";

/**
 * Server-side Paystack transaction verification.
 *
 * The client hands back a transaction reference after the Paystack popup
 * closes, but a reference alone proves nothing — it must be confirmed against
 * Paystack's API with the SECRET key before any order is credited.
 *
 * POST /api/paystack/verify  { reference: string, expectedAmount?: number }
 * Returns: { ok, status, amount, currency, paid_at, channel, reference }
 *   ok === true  → Paystack confirms a successful, real charge
 *   ok === false → not paid / mock / invalid / amount mismatch (detail explains)
 */
export async function POST(req: NextRequest) {
    let body: { reference?: string; expectedAmount?: number };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
    }

    const reference = (body.reference || "").trim();
    if (!reference) {
        return NextResponse.json({ ok: false, error: "reference_required" }, { status: 400 });
    }

    const result = await verifyPaystackTransaction(reference);
    if (!result.ok) {
        if (result.error === "secret_key_missing") {
            console.error("[paystack/verify] PAYSTACK_SECRET_KEY is not set — cannot verify payments.");
        }
        return NextResponse.json(
            { ok: false, status: result.error === "mock_reference_rejected" ? "mock" : "verification_failed", error: result.error, detail: result.detail },
            { status: result.status }
        );
    }

    const tx = result.tx;
    const paid = tx.status === "success";

    // Optional amount check — guard against client tampering with the charged value.
    if (paid && typeof body.expectedAmount === "number" && tx.amount !== null) {
        // Allow exact match only (both in kobo).
        if (tx.amount < body.expectedAmount) {
            return NextResponse.json(
                {
                    ok: false,
                    status: "amount_mismatch",
                    detail: `charged ${tx.amount} < expected ${body.expectedAmount}`,
                    amount: tx.amount,
                },
                { status: 402 }
            );
        }
    }

    return NextResponse.json({
        ok: paid,
        status: tx.status,
        amount: tx.amount,
        currency: tx.currency,
        paid_at: tx.paid_at,
        channel: tx.channel,
        reference: tx.reference,
    });
}
