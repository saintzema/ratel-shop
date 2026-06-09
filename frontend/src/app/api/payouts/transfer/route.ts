/**
 * POST /api/payouts/transfer
 *
 * Initiate a Paystack bank transfer to a seller after escrow release.
 * Called by the ZEMA Finance agent to complete payment settlement.
 *
 * Auth: Bearer ZEMA_SERVICE_TOKEN
 *
 * Body:
 *   {
 *     sellerId: string;
 *     amount: number;          // NGN
 *     orderId: string;
 *     bankAccount?: {          // optional — uses seller's saved payout details if omitted
 *       accountNumber: string;
 *       bankName: string;
 *       accountName: string;
 *     }
 *   }
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { initiatePaystackTransfer } from "@/lib/payout-transfer";
import { requireZemaAuth } from "@/lib/zema-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
    const authError = requireZemaAuth(request);
    if (authError) return authError;

    try {
        const body = await request.json();
        const { sellerId, amount, orderId, bankAccount } = body as {
            sellerId?: string;
            amount?: number;
            orderId?: string;
            bankAccount?: {
                accountNumber?: string;
                bankName?: string;
                accountName?: string;
            };
        };

        if (!sellerId || !amount || !orderId) {
            return NextResponse.json(
                { error: "sellerId, amount, and orderId are required" },
                { status: 400 }
            );
        }

        // ── Resolve bank details (use provided or look up from DB) ──
        let accountNumber: string;
        let bankName: string;
        let accountName: string;

        if (bankAccount?.accountNumber && bankAccount?.bankName && bankAccount?.accountName) {
            accountNumber = bankAccount.accountNumber;
            bankName = bankAccount.bankName;
            accountName = bankAccount.accountName;
        } else {
            // Load seller's saved payout configuration from DB
            const seller = await db.seller.findUnique({
                where: { id: sellerId },
                select: {
                    accountNumber: true,
                    bankName: true,
                    accountName: true,
                    businessName: true,
                },
            });
            if (!seller?.accountNumber || !seller?.bankName) {
                return NextResponse.json(
                    { error: "Seller has no saved payout bank details" },
                    { status: 422 }
                );
            }
            accountNumber = seller.accountNumber;
            bankName = seller.bankName;
            accountName = seller.accountName ?? seller.businessName ?? sellerId;
        }

        // ── Create a payout record for audit trail ──
        const payout = await db.payout.create({
            data: {
                sellerId,
                amount,
                status: "pending",
                accountNumber,
                bankName,
                accountName,
                orderIds: [orderId],
                paymentReference: `zema-${orderId}-${Date.now()}`,
                isAutoPayout: true,
            },
        });

        const result = await initiatePaystackTransfer({
            payoutId: payout.id,
            amount,
            bankName,
            accountNumber,
            accountName,
            sellerId,
            paymentReference: orderId,
            isAutoPayout: true,
        });

        return NextResponse.json({
            success: result.success,
            payoutId: payout.id,
            transferCode: result.transferCode,
            message: result.message,
        });
    } catch (err: any) {
        console.error("[payouts/transfer] error:", err);
        return NextResponse.json(
            { error: err?.message ?? "Payout transfer failed" },
            { status: 500 }
        );
    }
}
