import { db } from "@/lib/db";
import { resolveBankCode } from "@/lib/bank-codes";
import { broadcast } from "@/lib/realtime-service";

/**
 * Paystack Transfer Engine
 * 
 * Shared logic for initiating Paystack bank transfers.
 * Used by both Admin manual approval (PATCH /api/payouts) and
 * the automated QR payout flow (webhook handleChargeSuccess).
 */

interface TransferRequest {
    /** The Payout record ID in our database */
    payoutId: string;
    /** Amount in Naira (NOT kobo) */
    amount: number;
    /** Bank name (will be resolved to Paystack bank code) */
    bankName: string;
    /** Account number */
    accountNumber: string;
    /** Account holder name */
    accountName: string;
    /** Seller ID for audit/logging */
    sellerId: string;
    /** Optional: original Paystack charge reference for audit linking */
    paymentReference?: string;
    /** Whether this is an automated payout (vs manual admin approval) */
    isAutoPayout?: boolean;
}

interface TransferResult {
    success: boolean;
    transferCode?: string;
    message?: string;
}

export async function initiatePaystackTransfer(req: TransferRequest): Promise<TransferResult> {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) {
        console.error("❌ PAYSTACK_SECRET_KEY is missing — cannot initiate transfer.");
        return { success: false, message: "Paystack secret key not configured" };
    }

    const bankCode = resolveBankCode(req.bankName);

    try {
        // Step 1: Create Transfer Recipient
        console.log(`🏦 Creating transfer recipient: ${req.accountName} @ ${req.bankName} (${bankCode})`);
        const recipientRes = await fetch("https://api.paystack.co/transferrecipient", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${secret}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                type: "nuban",
                name: req.accountName,
                account_number: req.accountNumber,
                bank_code: bankCode,
                currency: "NGN"
            })
        });
        const recipientData = await recipientRes.json();

        if (!recipientData.status || !recipientData.data?.recipient_code) {
            console.error("❌ Paystack Recipient Creation Failed:", recipientData.message);
            await db.payout.update({
                where: { id: req.payoutId },
                data: { status: "failed" }
            });
            return { success: false, message: `Recipient creation failed: ${recipientData.message}` };
        }

        // Step 2: Initiate Transfer
        const transferReason = req.isAutoPayout
            ? `FairPrice Auto-Payout [QR] for seller ${req.sellerId}`
            : `FairPrice Payout for seller ${req.sellerId}`;

        console.log(`💸 Initiating transfer of ₦${req.amount} to ${recipientData.data.recipient_code}`);
        const transferRes = await fetch("https://api.paystack.co/transfer", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${secret}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                source: "balance",
                amount: Math.round(req.amount * 100), // Convert to kobo
                recipient: recipientData.data.recipient_code,
                reason: transferReason,
                reference: `fp_payout_${req.payoutId}` // Link back to our payout record
            })
        });
        const transferData = await transferRes.json();

        if (!transferData.status) {
            console.error("❌ Paystack Transfer Failed:", transferData.message);
            await db.payout.update({
                where: { id: req.payoutId },
                data: { status: "failed" }
            });
            return { success: false, message: `Transfer failed: ${transferData.message}` };
        }

        // Step 3: Update payout record with transfer code
        const transferCode = transferData.data?.transfer_code || "";
        await db.payout.update({
            where: { id: req.payoutId },
            data: {
                transferCode: transferCode,
                status: "completed"
            }
        });

        // Broadcast real-time update
        broadcast({ type: "payout_completed", sellerId: req.sellerId, payoutId: req.payoutId });

        console.log(`✅ Transfer initiated successfully [${transferCode}] — ₦${req.amount} → ${req.accountName}`);
        return { success: true, transferCode };

    } catch (err: any) {
        console.error("🚨 Paystack Transfer Error:", err);
        await db.payout.update({
            where: { id: req.payoutId },
            data: { status: "failed" }
        }).catch(() => {});
        return { success: false, message: err.message };
    }
}

/**
 * Create a notification for the seller about a payout event.
 * Uses the Prisma Notification model and broadcasts via SSE.
 */
export async function notifySellerPayout(
    sellerId: string,
    amount: number,
    status: "completed" | "failed" | "processing",
    payoutId: string
) {
    try {
        const seller = await db.seller.findUnique({
            where: { id: sellerId },
            select: { userId: true, businessName: true }
        });

        if (!seller) return;

        const messages: Record<string, string> = {
            completed: `💰 Payout of ₦${amount.toLocaleString()} has been sent to your bank account. Reference: ${payoutId}`,
            failed: `⚠️ Payout of ₦${amount.toLocaleString()} failed. Our team has been notified and will resolve this shortly.`,
            processing: `🔄 A payout of ₦${amount.toLocaleString()} is being processed to your bank account.`
        };

        await db.notification.create({
            data: {
                userId: seller.userId,
                type: "order",
                message: messages[status],
                link: "/seller/wallet",
                read: false
            }
        });

        broadcast({ type: "notification", userId: seller.userId });
    } catch (err) {
        console.error("Notification creation failed:", err);
    }
}

/**
 * Send an email notification about payout status.
 * Integrates with the existing email infrastructure.
 */
export async function emailSellerPayout(
    sellerId: string,
    amount: number,
    status: "completed" | "failed"
) {
    try {
        const seller = await db.seller.findUnique({
            where: { id: sellerId },
            select: { ownerEmail: true, businessName: true, user: { select: { email: true, name: true } } }
        });

        if (!seller) return;

        const email = seller.ownerEmail || seller.user.email;
        if (!email) return;

        // Fire-and-forget email via our notifications API
        // This leverages the existing email infrastructure
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
            ? `https://${process.env.VERCEL_URL}`
            : "http://localhost:3000";

        await fetch(`${baseUrl}/api/email`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                to: email,
                type: status === "completed" ? "SELLER_PAYOUT_COMPLETED" : "SELLER_PAYOUT_FAILED",
                payload: {
                    name: seller.user.name || seller.businessName,
                    amount,
                    sellerName: seller.businessName
                }
            })
        }).catch(err => console.warn("Email send failed (non-critical):", err.message));

    } catch (err) {
        console.error("Email notification error:", err);
    }
}
