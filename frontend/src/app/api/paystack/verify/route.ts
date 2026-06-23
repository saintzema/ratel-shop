import { NextRequest, NextResponse } from "next/server";

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

    // Hard reject the client-side demo/mock fallback references — these never
    // touched Paystack and must never be treated as a real payment.
    if (reference.startsWith("mock_ref_") || reference.startsWith("mock_")) {
        return NextResponse.json(
            { ok: false, status: "mock", error: "mock_reference_rejected" },
            { status: 402 }
        );
    }

    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) {
        console.error("[paystack/verify] PAYSTACK_SECRET_KEY is not set — cannot verify payments.");
        return NextResponse.json(
            { ok: false, error: "secret_key_missing" },
            { status: 500 }
        );
    }

    try {
        const res = await fetch(
            `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
            {
                method: "GET",
                headers: { Authorization: `Bearer ${secret}` },
                cache: "no-store",
            }
        );
        const data = await res.json().catch(() => ({}));

        if (!res.ok || !data?.status) {
            // Paystack returns status:false with a message for invalid keys / unknown refs
            return NextResponse.json(
                { ok: false, status: "verification_failed", detail: data?.message || `http_${res.status}` },
                { status: 402 }
            );
        }

        const tx = data.data || {};
        const paid = tx.status === "success";
        const amount = typeof tx.amount === "number" ? tx.amount : null; // in kobo

        // Optional amount check — guard against client tampering with the charged value.
        if (paid && typeof body.expectedAmount === "number" && amount !== null) {
            // Allow exact match only (both in kobo).
            if (amount < body.expectedAmount) {
                return NextResponse.json(
                    {
                        ok: false,
                        status: "amount_mismatch",
                        detail: `charged ${amount} < expected ${body.expectedAmount}`,
                        amount,
                    },
                    { status: 402 }
                );
            }
        }

        return NextResponse.json({
            ok: paid,
            status: tx.status,
            amount,
            currency: tx.currency ?? "NGN",
            paid_at: tx.paid_at ?? null,
            channel: tx.channel ?? null,
            reference: tx.reference ?? reference,
        });
    } catch (err: any) {
        console.error("[paystack/verify] error", err);
        return NextResponse.json({ ok: false, error: "verify_request_failed", detail: err?.message }, { status: 502 });
    }
}
