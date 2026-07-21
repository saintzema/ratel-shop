import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserFromRequest } from "@/lib/jwt";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/subaccounts
 *
 * QR/direct-payment orders never touch our own Payout/Transfer system at all —
 * Paystack splits the seller's cut into their subaccount at the moment of payment
 * and settles it to their bank on its own schedule (T+1, AUTO). That left admin
 * with zero visibility into this money flow from inside FairPrice: no record of
 * whether a seller's subaccount is even verified, which is exactly the kind of
 * thing that silently delays or blocks settlement (a real "Unverified" subaccount
 * was found live on this platform's own Paystack dashboard). This endpoint fetches
 * live status per subaccount directly from Paystack so admin can see it here
 * instead of having to check the Paystack dashboard by hand.
 */
export async function GET(req: Request) {
    const user = getUserFromRequest(req);
    if (!user || user.role !== "admin") {
        return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) {
        return NextResponse.json({ error: "Paystack not configured on this server." }, { status: 500 });
    }

    const sellers = await db.seller.findMany({
        where: { paystackSubaccountCode: { not: null } },
        select: {
            id: true,
            businessName: true,
            bankName: true,
            accountNumber: true,
            accountName: true,
            paystackSubaccountCode: true,
        },
    });

    const results = await Promise.all(
        sellers.map(async (seller) => {
            try {
                const res = await fetch(`https://api.paystack.co/subaccount/${seller.paystackSubaccountCode}`, {
                    headers: { Authorization: `Bearer ${secret}` },
                });
                const data = await res.json().catch(() => ({}));
                const sub = data?.data;
                return {
                    sellerId: seller.id,
                    businessName: seller.businessName,
                    bankName: seller.bankName,
                    accountNumber: seller.accountNumber,
                    accountName: seller.accountName,
                    subaccountCode: seller.paystackSubaccountCode,
                    // Paystack doesn't expose a single boolean — active + a settled bank
                    // account together is what "verified" means in the dashboard's own UI.
                    active: sub?.active ?? null,
                    verified: !!(sub?.active && sub?.settlement_bank),
                    settlementSchedule: sub?.settlement_schedule || null,
                    percentageCharge: sub?.percentage_charge ?? null,
                    fetchError: !res.ok ? (data?.message || "Could not reach Paystack") : null,
                };
            } catch (e: any) {
                return {
                    sellerId: seller.id,
                    businessName: seller.businessName,
                    bankName: seller.bankName,
                    accountNumber: seller.accountNumber,
                    accountName: seller.accountName,
                    subaccountCode: seller.paystackSubaccountCode,
                    active: null,
                    verified: false,
                    settlementSchedule: null,
                    percentageCharge: null,
                    fetchError: e?.message || "Network error reaching Paystack",
                };
            }
        })
    );

    return NextResponse.json({ subaccounts: results });
}
