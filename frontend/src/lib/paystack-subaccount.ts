import { db } from "@/lib/db";
import { resolveBankCode } from "@/lib/bank-codes";

/**
 * Provisions a Paystack Subaccount for a seller using their on-file bank details, and
 * stores the returned subaccount_code. Once set, QR/direct-payment checkouts route the
 * seller's exact cut there via Paystack's split at the moment of payment — Paystack
 * settles it to their bank automatically, no Transfer API call ever fires for that
 * seller again.
 *
 * Shared by the admin-triggered endpoint (/api/sellers/[id]/subaccount) and automatic
 * creation the moment a seller saves bank details that resolve correctly.
 *
 * IMPORTANT: the /bank/resolve check below only catches a mistyped account number —
 * it does NOT prevent Paystack's separate "Unverified" subaccount state. Paystack
 * intentionally holds the FIRST payout to any new (or updated) subaccount indefinitely
 * as an anti-fraud safeguard against a hijacked account redirecting payouts, and there
 * is no API to bypass or automate this — it's a deliberate manual, human-in-the-loop
 * control, done once per subaccount from the Subaccounts page of Paystack's own
 * dashboard (select it, click "Verify Subaccounts"). After that one-time step, every
 * future payout to that subaccount processes automatically on the normal schedule.
 *

 * percentage_charge is Paystack's "percentage the MAIN account receives" — NOT the
 * subaccount's cut. Set to 0 so the safe default favors the seller (they get 100%
 * unless we explicitly carve out our fee via transaction_charge at checkout time,
 * since our platform fee is tiered/variable, not a fixed %). Setting this to 100
 * would mean any charge that somehow skips the transaction_charge override sends the
 * seller NOTHING and the platform gets it all — the wrong direction to fail safe in.
 */
export async function createSubaccountForSeller(
    sellerId: string
): Promise<{ success: true; subaccountCode: string } | { success: false; error: string; status: number }> {
    const seller = await db.seller.findUnique({
        where: { id: sellerId },
        select: { id: true, businessName: true, bankName: true, accountNumber: true, accountName: true, ownerEmail: true, paystackSubaccountCode: true },
    });

    if (!seller) {
        return { success: false, error: "Seller not found", status: 404 };
    }
    if (seller.paystackSubaccountCode) {
        return { success: false, error: "Seller already has a subaccount", status: 409 };
    }
    if (!seller.bankName || !seller.accountNumber) {
        return { success: false, error: "Seller has no bank details on file — cannot create a subaccount.", status: 400 };
    }

    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) {
        return { success: false, error: "Paystack not configured on this server.", status: 500 };
    }

    const bankCode = resolveBankCode(seller.bankName);
    if (!bankCode) {
        return { success: false, error: `Unrecognized bank "${seller.bankName}" — cannot resolve a Paystack bank code.`, status: 400 };
    }

    // Resolve the account number against the bank BEFORE creating the subaccount —
    // the single most common cause of a subaccount sitting "Unverified" on Paystack
    // indefinitely is a wrong digit in the account number or a bank-code mismatch that
    // nothing ever caught before creating it anyway.
    const resolveRes = await fetch(
        `https://api.paystack.co/bank/resolve?account_number=${seller.accountNumber}&bank_code=${bankCode}`,
        { headers: { Authorization: `Bearer ${secret}` } }
    );
    const resolveData = await resolveRes.json().catch(() => ({}));
    if (!resolveRes.ok || !resolveData?.status) {
        return {
            success: false,
            error: `Could not verify this account with ${seller.bankName}: ${resolveData?.message || "account number/bank mismatch"}.`,
            status: 400,
        };
    }

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
            percentage_charge: 0,
            primary_contact_email: seller.ownerEmail || undefined,
            settlement_schedule: "AUTO",
        }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data?.status) {
        return { success: false, error: data?.message || "Paystack rejected the subaccount request", status: 502 };
    }

    const subaccountCode = data.data?.subaccount_code;
    if (!subaccountCode) {
        return { success: false, error: "Paystack did not return a subaccount code", status: 502 };
    }

    await db.seller.update({
        where: { id: seller.id },
        data: { paystackSubaccountCode: subaccountCode },
    });

    return { success: true, subaccountCode };
}
