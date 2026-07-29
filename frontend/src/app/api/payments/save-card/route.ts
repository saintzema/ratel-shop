import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserFromRequest } from "@/lib/jwt";
import { verifyPaystackTransaction } from "@/lib/paystack-verify";

export const dynamic = "force-dynamic";

/**
 * POST /api/payments/save-card  { reference }
 *
 * We never collect a raw card number ourselves — this takes a transaction
 * reference from a Paystack Inline charge the buyer just completed (either a
 * real checkout, or the small card-verification charge from Account > Payments)
 * and, only if Paystack confirms it succeeded AND returned a reusable card
 * authorization, saves that authorization_code for future use. Nothing here
 * ever sees or stores a PAN/CVV — Paystack's own popup collected those.
 */
export async function POST(req: NextRequest) {
    const user = getUserFromRequest(req);
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: { reference?: string };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }

    const reference = (body.reference || "").trim();
    if (!reference) {
        return NextResponse.json({ error: "reference_required" }, { status: 400 });
    }

    const result = await verifyPaystackTransaction(reference);
    if (!result.ok) {
        return NextResponse.json({ error: result.error, detail: result.detail }, { status: result.status });
    }

    const tx = result.tx;
    if (tx.status !== "success") {
        return NextResponse.json({ error: "Payment was not successful" }, { status: 402 });
    }
    if (tx.channel !== "card" || !tx.authorization) {
        return NextResponse.json({ error: "This transaction did not use a card, so there's nothing to save" }, { status: 400 });
    }
    if (!tx.authorization.reusable) {
        return NextResponse.json({ error: "This card cannot be saved for future charges (not reusable)" }, { status: 400 });
    }

    const existingCount = await db.savedCard.count({ where: { userId: user.userId } });

    const saved = await db.savedCard.upsert({
        where: { authorizationCode: tx.authorization.authorization_code },
        create: {
            userId: user.userId,
            authorizationCode: tx.authorization.authorization_code,
            last4: tx.authorization.last4,
            expMonth: tx.authorization.exp_month,
            expYear: tx.authorization.exp_year,
            cardType: tx.authorization.card_type,
            bank: tx.authorization.bank,
            signature: tx.authorization.signature,
            isDefault: existingCount === 0,
        },
        update: {
            last4: tx.authorization.last4,
            expMonth: tx.authorization.exp_month,
            expYear: tx.authorization.exp_year,
        },
    });

    return NextResponse.json({
        success: true,
        card: {
            id: saved.id,
            last4: saved.last4,
            expMonth: saved.expMonth,
            expYear: saved.expYear,
            cardType: saved.cardType,
            bank: saved.bank,
            isDefault: saved.isDefault,
        },
    });
}
