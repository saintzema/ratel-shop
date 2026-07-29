import { db } from "@/lib/db";

/**
 * Charges a previously-saved Paystack card authorization (no card entry, no
 * popup — the buyer already authorized this card in an earlier checkout).
 * Every call is logged to ChargeAttempt regardless of outcome, since this is
 * money moving without the buyer looking at a payment form in the moment —
 * the audit trail is the only thing standing between "the agent charged the
 * right amount" and "we have no idea what happened."
 */
export async function chargeSavedCard(params: {
    savedCardId: string;
    userId: string;
    amount: number; // in kobo
    reason: string; // e.g. "order:ORD123" — human-readable context for the audit log
    initiatedBy: string; // "ziva-chat" | "whatsapp" | "admin:<id>" etc.
}): Promise<
    | { success: true; reference: string }
    | { success: false; error: string; status: number }
> {
    const { savedCardId, userId, amount, reason, initiatedBy } = params;

    const card = await db.savedCard.findUnique({ where: { id: savedCardId } });
    if (!card || card.userId !== userId) {
        return { success: false, error: "Card not found", status: 404 };
    }

    const user = await db.user.findUnique({ where: { id: userId }, select: { email: true } });
    if (!user?.email) {
        return { success: false, error: "User email not found", status: 404 };
    }

    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) {
        return { success: false, error: "Paystack not configured on this server.", status: 500 };
    }

    const logAttempt = (status: string, detail?: string, reference?: string) =>
        db.chargeAttempt.create({
            data: { savedCardId, userId, amount, reason, initiatedBy, status, detail, reference },
        }).catch(() => { /* never let logging failure mask the charge result */ });

    try {
        const res = await fetch("https://api.paystack.co/transaction/charge_authorization", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${secret}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                authorization_code: card.authorizationCode,
                email: user.email,
                amount,
            }),
        });
        const data = await res.json().catch(() => ({}));

        if (!res.ok || !data?.status || data.data?.status !== "success") {
            const detail = data.data?.gateway_response || data.message || "Charge failed";
            await logAttempt("failed", detail, data.data?.reference);
            return { success: false, error: detail, status: 402 };
        }

        await logAttempt("success", undefined, data.data.reference);
        return { success: true, reference: data.data.reference };
    } catch (err: any) {
        await logAttempt("error", err?.message || String(err));
        return { success: false, error: "Charge request failed", status: 502 };
    }
}
