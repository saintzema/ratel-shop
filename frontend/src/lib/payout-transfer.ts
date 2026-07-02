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

/**
 * The admin-editable HITL threshold (Settings > Security > "Auto-Payout HITL
 * Threshold") — payouts at/below this go instantly, above it require a WhatsApp
 * approval before any transfer fires. Previously the QR-payment webhook read a
 * hardcoded env var here instead of this setting, so changing it in the admin UI
 * silently did nothing. Falls back to the env var, then ₦50,000, if the DB is
 * unreachable or the row doesn't exist yet.
 */
export async function getPayoutHitlThreshold(): Promise<number> {
    try {
        const settings = await db.systemSetting.findUnique({ where: { id: "global" }, select: { payoutHitlThreshold: true } });
        if (settings?.payoutHitlThreshold !== undefined && settings.payoutHitlThreshold !== null) {
            return settings.payoutHitlThreshold;
        }
    } catch { /* fall through to env/default */ }
    return Number(process.env.PAYOUT_HITL_THRESHOLD_NGN || 50_000);
}

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

interface VerifyResult {
    verified: boolean;
    amountNaira?: number;
    message?: string;
}

/**
 * Confirm a Paystack charge reference is a real, successful transaction before
 * a payout is allowed to transfer money out for it. Without this, approving a
 * payout for an order that was never actually paid through Paystack (COD,
 * WhatsApp, demo data, a different processor) would send real platform funds
 * to a seller for revenue the platform never actually collected.
 */
export async function verifyPaystackReference(reference: string): Promise<VerifyResult> {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) return { verified: false, message: "Paystack secret key not configured" };

    try {
        const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
            headers: { Authorization: `Bearer ${secret}` },
        });
        const data = await res.json();

        if (!data.status || data.data?.status !== "success") {
            return { verified: false, message: data.data?.gateway_response || data.message || "Transaction not found or not successful" };
        }

        return { verified: true, amountNaira: (data.data.amount || 0) / 100 };
    } catch (err: any) {
        return { verified: false, message: err.message };
    }
}

interface PwTResult {
    success: boolean;
    accountNumber?: string;
    bankName?: string;
    accountName?: string;
    expiresAt?: string;
    reference?: string;
    message?: string;
}

/**
 * Pay-with-Transfer: create a Paystack charge on the bank_transfer channel and
 * return the temporary account number it allocates (the same ~30-minute account
 * the Paystack modal shows when a customer picks "Transfer"). Metadata is set to
 * type "qr_payment" so, when the customer's transfer lands, charge.success flows
 * through the existing webhook branch — seller/admin dashboards, notifications,
 * and the auto-payout / WhatsApp-HITL threshold pipeline all behave exactly as
 * if the customer had scanned a FairPay QR.
 *
 * NOTE: API-initiated PwT must be enabled on the Paystack business. If it isn't,
 * Paystack returns an error and we surface a clear message instead of an account.
 */
export async function createPayWithTransferCharge(opts: {
    sellerId: string;
    amountNaira: number;
    label: string;
    customerEmail: string; // charge requires an email; the seller's works for in-person sales
}): Promise<PwTResult> {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) return { success: false, message: "Paystack secret key not configured" };

    try {
        const res = await fetch("https://api.paystack.co/charge", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${secret}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                email: opts.customerEmail,
                amount: Math.round(opts.amountNaira * 100), // kobo
                metadata: {
                    type: "qr_payment",
                    seller_id: opts.sellerId,
                    label: opts.label,
                    channel_hint: "whatsapp_pwt",
                },
                bank_transfer: {},
            }),
        });
        const json = await res.json();
        const d = json?.data || {};

        // Paystack has shipped this payload under slightly different shapes over
        // time — check the known locations rather than assuming one.
        const accountNumber = d.account_number || d.bank_transfer?.account_number;
        const bankName = d.bank?.name || d.bank_transfer?.bank?.name || d.bank_name;
        const accountName = d.account_name || d.bank_transfer?.account_name;
        const expiresAt = d.account_expires_at || d.bank_transfer?.account_expires_at;

        if (!json.status || !accountNumber) {
            console.error("PwT charge failed:", json.message, d);
            return { success: false, message: json.message || d.gateway_response || "Pay-with-Transfer not available on this Paystack account" };
        }

        return {
            success: true,
            accountNumber,
            bankName: bankName || "Paystack Titan",
            accountName: accountName || "FairPrice Checkout",
            expiresAt,
            reference: d.reference,
        };
    } catch (err: any) {
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
