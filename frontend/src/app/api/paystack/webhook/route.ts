import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { broadcast } from "@/lib/realtime-service";
import { initiatePaystackTransfer, notifySellerPayout, emailSellerPayout } from "@/lib/payout-transfer";
import { notifyAdmins } from "@/lib/admin-notify";
import { WhatsAppService } from "@/lib/whatsapp-service";
import crypto from "crypto";

// Auto-payouts at or below this amount go out instantly (no human step — that's the whole
// point of auto-payout for high-volume/QR sellers like restaurants). Above it, a WhatsApp
// HITL approval is required before the transfer fires, same governance model as ZEMA 360's
// marketplace escrow release, just for direct/QR payments. Configurable via env so it can be
// tuned without a redeploy of business logic.
const PAYOUT_HITL_THRESHOLD = Number(process.env.PAYOUT_HITL_THRESHOLD_NGN || 50_000);
const ZEMA_APPROVER_WHATSAPP = process.env.ZEMA_APPROVER_WHATSAPP || "+2348162816305";

export const runtime = "nodejs";

/**
 * Paystack Webhook Handler
 * This endpoint processes asynchronous events from Paystack (Live & Test).
 * Ensure the PAYSTACK_SECRET_KEY is set in Vercel environment variables.
 */
export async function POST(req: Request) {
    try {
        const body = await req.text();
        const signature = req.headers.get("x-paystack-signature");

        if (!signature) {
            return NextResponse.json({ error: "No signature" }, { status: 400 });
        }

        // 1. Verify Paystack Signature
        const secret = process.env.PAYSTACK_SECRET_KEY;
        if (!secret) {
            console.error("❌ Paystack Secret Key is missing in environment variables.");
            return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
        }

        const hash = crypto
            .createHmac("sha512", secret)
            .update(body)
            .digest("hex");

        if (hash !== signature) {
            console.warn("⚠️ Invalid Paystack Webhook signature detected.");
            return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
        }

        const event = JSON.parse(body);
        const data = event.data;

        console.log(`✅ Paystack Webhook received: ${event.event}`);

        // 2. Process Events
        switch (event.event) {
            case "charge.success":
                await handleChargeSuccess(data);
                break;
            
            case "transfer.success":
                await handleTransferSuccess(data);
                break;

            case "transfer.failed":
            case "transfer.reversed":
                await handleTransferFailed(data);
                break;

            default:
                console.log(`ℹ️ Event ${event.event} not explicitly handled.`);
        }

        return NextResponse.json({ status: "success" });
    } catch (error: any) {
        console.error("🚨 Webhook Processing Error:", error);
        return NextResponse.json({ error: "Webhook Error" }, { status: 500 });
    }
}

async function handleChargeSuccess(data: any) {
    const { reference, metadata, amount, customer } = data;
    const type = metadata?.type || "order";

    console.log(`💰 Payment Successful [${reference}] - Type: ${type}`);

    try {
        if (type === "order") {
            const orderId = metadata?.order_id;
            const orderIds = metadata?.order_ids; // Support multiple orders in one payment
            
            const idsToUpdate = orderIds ? (Array.isArray(orderIds) ? orderIds : orderIds.split(',')) : (orderId ? [orderId] : []);

            for (const id of idsToUpdate) {
                await db.order.update({
                    where: { id: id.trim() },
                    data: {
                        status: "processing",
                        escrowStatus: "held",
                        // So the payout approval flow can later verify a real Paystack
                        // charge actually funded this order before transferring money out.
                        paymentReference: reference,
                    }
                }).catch(err => console.error(`❌ Failed to update order ${id}:`, err));
                
                broadcast({ type: "order_updated", id: id.trim() });
                console.log(`📦 Order ${id} marked as processing.`);
            }
        }
        // ─────────────────────────────────────────────────────────────────────
        // QR PAYMENT — Instant Payment via Seller QR Code
        // ─────────────────────────────────────────────────────────────────────
        else if (type === "qr_payment") {
            const sellerId = metadata?.seller_id;
            const label = metadata?.label || "QR Payment";
            const amountNaira = amount / 100; // Paystack sends kobo

            if (!sellerId) {
                console.error("❌ QR Payment missing seller_id in metadata");
                return;
            }

            console.log(`📱 QR Payment received: ₦${amountNaira} for seller ${sellerId} — "${label}"`);

            // 1. Fetch seller with bank details
            const seller = await db.seller.findUnique({
                where: { id: sellerId },
                select: {
                    id: true,
                    businessName: true,
                    bankName: true,
                    accountNumber: true,
                    accountName: true,
                    commissionRate: true,
                    autoPayoutEnabled: true,
                    ownerEmail: true,
                    userId: true,
                }
            });

            if (!seller) {
                console.error(`❌ Seller ${sellerId} not found in database`);
                return;
            }

            // 2. Calculate commission and net amount
            const commissionRate = seller.commissionRate ?? 2.5;
            const commissionAmount = Math.round(amountNaira * (commissionRate / 100) * 100) / 100;
            const netAmount = Math.round((amountNaira - commissionAmount) * 100) / 100;

            console.log(`📊 QR Settlement: Gross ₦${amountNaira} | Commission ${commissionRate}% (₦${commissionAmount}) | Net ₦${netAmount}`);

            // 3. Create Payout record (always — for audit trail)
            const payout = await db.payout.create({
                data: {
                    sellerId: seller.id,
                    amount: netAmount,
                    bankName: seller.bankName || "Unknown",
                    accountNumber: seller.accountNumber || "",
                    accountName: seller.accountName || seller.businessName,
                    orderIds: [], // QR payments don't have order IDs
                    paymentReference: reference,
                    isAutoPayout: seller.autoPayoutEnabled,
                    status: seller.autoPayoutEnabled ? "processing" : "pending",
                }
            });

            console.log(`📝 Payout record created: ${payout.id} (auto: ${seller.autoPayoutEnabled})`);

            // Broadcast to admin dashboard
            broadcast({ type: "payout_created", payoutId: payout.id, sellerId: seller.id });

            // 4. Notify admins about the incoming QR payment. (Was previously written with
            //    no userId → orphaned row, invisible to everyone. notifyAdmins fans it out to
            //    every admin user so it actually shows in the admin bell.)
            await notifyAdmins(
                `📱 QR Payment received: ₦${amountNaira.toLocaleString()} from customer → ${seller.businessName}. Net payout: ₦${netAmount.toLocaleString()} (${seller.autoPayoutEnabled ? "AUTO" : "MANUAL"})`,
                { type: "order", link: "/admin/payouts" }
            );

            // 5. Auto-payout flow (if enabled AND bank details are verified)
            if (seller.autoPayoutEnabled && seller.bankName && seller.accountNumber) {

                // Above the threshold: require a WhatsApp HITL approval before the transfer
                // fires — same governance pattern as ZEMA 360's marketplace escrow release.
                // At/below it: instant transfer, no human in the loop (this is the point of
                // auto-payout for high-volume QR sellers like restaurants).
                if (netAmount > PAYOUT_HITL_THRESHOLD) {
                    console.log(`⏸️ Auto-payout ₦${netAmount} exceeds ₦${PAYOUT_HITL_THRESHOLD} HITL threshold for ${seller.businessName} — requesting WhatsApp approval...`);

                    const runId = `PAY-${Date.now().toString(36).toUpperCase()}`;
                    await db.zemaApprovalRequest.create({
                        data: {
                            runId,
                            orderId: payout.id, // reusing this column to link the Payout — no FK, plain string
                            status: "pending",
                            agentDecision: JSON.stringify({
                                type: "payout",
                                payoutId: payout.id,
                                sellerId: seller.id,
                                amount: netAmount,
                                bankName: seller.bankName,
                                accountNumber: seller.accountNumber,
                                accountName: seller.accountName || seller.businessName,
                                paymentReference: reference,
                            }),
                        },
                    });

                    await WhatsAppService.sendMessage(ZEMA_APPROVER_WHATSAPP,
                        `🛑 *High-Value Payout — Approval Required*\n\n` +
                        `Seller: *${seller.businessName}*\n` +
                        `Amount: *₦${netAmount.toLocaleString()}*\n` +
                        `Bank: ${seller.bankName} ••${(seller.accountNumber || "").slice(-4)}\n\n` +
                        `Reply:\n✅ *approve ${runId}*\n❌ *reject ${runId}*`
                    );
                    await notifyAdmins(
                        `🛑 Payout of ₦${netAmount.toLocaleString()} to ${seller.businessName} needs WhatsApp approval (${runId}) — exceeds the ₦${PAYOUT_HITL_THRESHOLD.toLocaleString()} auto-payout threshold.`,
                        { type: "system", link: "/admin/payouts" }
                    );
                    await notifySellerPayout(seller.id, netAmount, "processing", payout.id);
                    return; // handleChargeSuccess is void — the caller (POST) sends its own response
                }

                console.log(`🚀 Auto-payout ENABLED for ${seller.businessName} — initiating instant transfer...`);

                const result = await initiatePaystackTransfer({
                    payoutId: payout.id,
                    amount: netAmount,
                    bankName: seller.bankName,
                    accountNumber: seller.accountNumber,
                    accountName: seller.accountName || seller.businessName,
                    sellerId: seller.id,
                    paymentReference: reference,
                    isAutoPayout: true
                });

                if (result.success) {
                    console.log(`✅ Auto-payout completed for ${seller.businessName}: ₦${netAmount}`);
                    await notifySellerPayout(seller.id, netAmount, "completed", payout.id);
                    await emailSellerPayout(seller.id, netAmount, "completed");
                    // Admin visibility: every auto-payout that actually moves money is logged
                    // to the admin bell (previously there was NO admin record on success).
                    await notifyAdmins(
                        `✅ Auto-payout SENT: ₦${netAmount.toLocaleString()} → ${seller.businessName} (${seller.bankName} ••${(seller.accountNumber || "").slice(-4)}). Ref ${payout.id}.`,
                        { type: "order", link: "/admin/payouts" }
                    );
                } else {
                    console.error(`❌ Auto-payout FAILED for ${seller.businessName}: ${result.message}`);
                    await notifySellerPayout(seller.id, netAmount, "failed", payout.id);
                    await emailSellerPayout(seller.id, netAmount, "failed");
                    // Was an orphaned (userId-less) row → invisible. Now fans out to all admins.
                    await notifyAdmins(
                        `🔴 Auto-payout FAILED for ${seller.businessName}: ₦${netAmount.toLocaleString()}. Reason: ${result.message}. Requires manual review.`,
                        { type: "system", link: "/admin/payouts" }
                    );
                }
            } else {
                // Manual mode — notify seller that funds are pending admin approval
                console.log(`⏳ Manual payout mode for ${seller.businessName} — awaiting admin approval`);
                await notifySellerPayout(seller.id, netAmount, "processing", payout.id);

                if (!seller.bankName || !seller.accountNumber) {
                    console.warn(`⚠️ Seller ${seller.businessName} has incomplete bank details — auto-payout skipped`);
                }
            }
        }
        else if (type === "sponsored_ad") {
            const productId = metadata?.product_id;
            if (productId) {
                await db.product.update({
                    where: { id: productId },
                    data: { isSponsored: true }
                });
                broadcast({ type: "product_updated", id: productId });
                console.log(`🚀 Product ${productId} is now Sponsored.`);
            }
        }
        else if (type === "account_upgrade") {
            const userId = metadata?.user_id;
            const targetRole = metadata?.role || "customer";
            const plan = metadata?.plan || "Pro";
            const expiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

            if (userId) {
                if (targetRole === "customer") {
                    await db.user.update({
                        where: { id: userId },
                        data: { 
                            role: "customer",
                            // @ts-ignore - Field added in pending schema migration
                            isPremium: true,
                            // @ts-ignore - Field added in pending schema migration
                            premiumExpiresAt: expiry
                        }
                    });
                } else if (targetRole === "seller") {
                    // Update the user role first
                    await db.user.update({
                        where: { id: userId },
                        data: { role: "seller" }
                    });
                    // Then update all sellers for this user to the new plan
                    await db.seller.updateMany({
                        where: { userId: userId },
                        data: { 
                            // @ts-ignore
                            subscriptionPlan: plan as any,
                            // @ts-ignore
                            planExpiryDate: expiry,
                            status: "active"
                        }
                    });
                }
                
                broadcast({ type: "user_updated", id: userId });
                console.log(`⭐ User ${userId} upgraded/renewed as ${targetRole} (${plan}).`);
            }
        }
    } catch (err) {
        console.error(`❌ Failed to update database for payment ${reference}:`, err);
    }
}

async function handleTransferSuccess(data: any) {
    const { reference, amount, recipient } = data;
    console.log(`💸 Payout Successful [${reference}] - Sent ₦${amount / 100} to ${recipient?.name || "Recipient"}`);
    
    try {
        // Match by our custom reference format: fp_payout_<payoutId>
        let payout = null;
        if (reference?.startsWith("fp_payout_")) {
            const payoutId = reference.replace("fp_payout_", "");
            payout = await db.payout.findUnique({ where: { id: payoutId } });
        }

        // Fallback: search by transfer code
        if (!payout) {
            payout = await db.payout.findFirst({
                where: { transferCode: { not: null } }
            });
        }

        if (payout) {
            await db.payout.update({
                where: { id: payout.id },
                data: { status: "completed" }
            });

            // Notify the seller about successful transfer
            await notifySellerPayout(payout.sellerId, payout.amount, "completed", payout.id);
            await emailSellerPayout(payout.sellerId, payout.amount, "completed");
            await notifyAdmins(
                `✅ Bank transfer confirmed: ₦${payout.amount.toLocaleString()} payout ${payout.id} settled.`,
                { type: "order", link: "/admin/payouts" }
            );

            broadcast({ type: "payout_completed", sellerId: payout.sellerId, payoutId: payout.id });
            console.log(`✅ Payout ${payout.id} marked as completed.`);
        }
    } catch (err) {
        console.error("❌ Payout update error:", err);
    }
}

async function handleTransferFailed(data: any) {
    const { reference, reason } = data;
    console.error(`🔴 Payout Failed [${reference}]: ${reason}`);
    
    try {
        // Match by our custom reference format
        if (reference?.startsWith("fp_payout_")) {
            const payoutId = reference.replace("fp_payout_", "");
            const payout = await db.payout.findUnique({ where: { id: payoutId } });

            if (payout) {
                await db.payout.update({
                    where: { id: payout.id },
                    data: { status: "failed" }
                });

                // Notify seller and admin
                await notifySellerPayout(payout.sellerId, payout.amount, "failed", payout.id);
                await emailSellerPayout(payout.sellerId, payout.amount, "failed");

                // Admin alert
                const seller = await db.seller.findUnique({
                    where: { id: payout.sellerId },
                    select: { businessName: true }
                });

                await notifyAdmins(
                    `🔴 Bank transfer FAILED for ${seller?.businessName || payout.sellerId}: ₦${payout.amount.toLocaleString()}. Reason: ${reason || "Unknown"}`,
                    { type: "system", link: "/admin/payouts" }
                );

                console.log(`❌ Payout ${payout.id} marked as failed.`);
            }
        }
    } catch (err) {
        console.error("❌ Transfer failure handling error:", err);
    }
}
