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

    // Give the ₦50 back as FairPrice credit.
    //
    // Paystack verifies a card by charging it, so saving a card costs the
    // customer real money — a tester went to save her card and was asked to
    // pay ₦50 she had not agreed to, which is a fair thing to be upset about.
    // The charge can't be avoided, but it can be returned: the same credit
    // ledger daily check-in uses, spendable on any order, ride or delivery.
    // Keyed on the Paystack reference so a replayed callback can't mint it
    // twice.
    const alreadyCredited = await db.adRewardCredit.findFirst({
        where: { userId: user.userId, source: `card_verification:${reference}` },
        select: { id: true },
    }).catch(() => null);

    let creditRefunded = 0;
    if (!alreadyCredited) {
        const amount = Math.round((tx.amount ?? 0) / 100);
        if (amount > 0) {
            await db.adRewardCredit.create({
                data: {
                    userId: user.userId,
                    amount,
                    source: `card_verification:${reference}`,
                    status: "active",
                    expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
                },
            }).catch(() => null);
            creditRefunded = amount;
        }
    }

    return NextResponse.json({
        success: true,
        creditRefunded,
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
