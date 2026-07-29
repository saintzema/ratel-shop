// Shared low-level Paystack transaction verification — used by both the
// checkout payment-verify route and card-on-file (which needs the full
// `authorization` object a checkout charge already produced, no separate
// "add card" transaction required).
export interface PaystackTransaction {
    status: string;
    amount: number | null;
    currency: string;
    paid_at: string | null;
    channel: string | null;
    reference: string;
    authorization?: {
        authorization_code: string;
        bin: string;
        last4: string;
        exp_month: string;
        exp_year: string;
        card_type: string;
        bank: string;
        reusable: boolean;
        signature: string;
    } | null;
}

export type VerifyResult =
    | { ok: true; tx: PaystackTransaction }
    | { ok: false; status: number; error: string; detail?: string };

export async function verifyPaystackTransaction(reference: string): Promise<VerifyResult> {
    if (reference.startsWith("mock_ref_") || reference.startsWith("mock_")) {
        return { ok: false, status: 402, error: "mock_reference_rejected" };
    }

    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) {
        return { ok: false, status: 500, error: "secret_key_missing" };
    }

    try {
        const res = await fetch(
            `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
            { method: "GET", headers: { Authorization: `Bearer ${secret}` }, cache: "no-store" }
        );
        const data = await res.json().catch(() => ({}));

        if (!res.ok || !data?.status) {
            return { ok: false, status: 402, error: "verification_failed", detail: data?.message || `http_${res.status}` };
        }

        const tx = data.data || {};
        return {
            ok: true,
            tx: {
                status: tx.status,
                amount: typeof tx.amount === "number" ? tx.amount : null,
                currency: tx.currency ?? "NGN",
                paid_at: tx.paid_at ?? null,
                channel: tx.channel ?? null,
                reference: tx.reference ?? reference,
                authorization: tx.authorization ?? null,
            },
        };
    } catch (err: any) {
        return { ok: false, status: 502, error: "verify_request_failed", detail: err?.message };
    }
}
