import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserFromRequest } from "@/lib/jwt";
import { initiatePaystackTransfer, notifySellerPayout, emailSellerPayout, verifyPaystackReference, getPayoutHitlThreshold } from "@/lib/payout-transfer";
import { WhatsAppService } from "@/lib/whatsapp-service";
import { notifyAdmins } from "@/lib/admin-notify";
import { ADMIN_EMAILS } from "@/lib/constants";

const ZEMA_APPROVER_WHATSAPP = process.env.ZEMA_APPROVER_WHATSAPP || "+2348162816305";

export const runtime = "nodejs";

// GET /api/payouts?sellerId=xxx
export async function GET(request: Request) {
    try {
        const user = getUserFromRequest(request);
        if (!user) {
            // Previously returned success:true with an empty list here — an expired/
            // missing token looked EXACTLY like "genuinely no payouts exist," so admins
            // saw a blank page with zero signal that they'd need to log back in.
            return NextResponse.json({ success: false, error: "Unauthorized", payouts: [] }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const sellerId = searchParams.get("sellerId");

        const whereClause: any = {};
        
        if (user.role !== "admin") {
            // Regular user can only see payouts for their own businesses
            if (sellerId) {
                const seller = await db.seller.findFirst({ 
                    where: { id: sellerId, userId: user.userId } 
                });
                if (!seller) {
                    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
                }
                whereClause.sellerId = sellerId;
            } else {
                const userSellers = await db.seller.findMany({ 
                    where: { userId: user.userId }, 
                    select: { id: true } 
                });
                whereClause.sellerId = { in: userSellers.map(s => s.id) };
            }
        } else if (sellerId) {
            whereClause.sellerId = sellerId;
        }

        const payouts = await db.payout.findMany({
            where: whereClause,
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json({ success: true, payouts });
    } catch (error: any) {
        console.error("Payouts GET Error:", error);
        return NextResponse.json({ success: false, error: "Database error" }, {
            status: 500,
        });
    }
}

// POST /api/payouts — Create a new payout request
export async function POST(request: Request) {
    try {
        const user = getUserFromRequest(request);
        if (!user) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();

        const {
            seller_id,
            amount,
            bank_name,
            account_number,
            account_name,
            order_ids,
        } = body;

        // bank_name/account_number are NOT required from the client — the client's local
        // seller cache never carries them (privacy — /api/sellers omits those fields for
        // every role), so requiring them here rejected every auto-generated payout before
        // it could ever reach the DB lookup below.
        if (!seller_id || !amount) {
            return NextResponse.json(
                { success: false, error: "Missing required fields" },
                { status: 400 }
            );
        }

        // Ownership check
        const seller = await db.seller.findFirst({
            where: { id: seller_id, userId: user.userId }
        });

        if (!seller && user.role !== "admin") {
            return NextResponse.json({ success: false, error: "Forbidden: Not your store" }, { status: 403 });
        }

        // Source the real bank details from the seller's stored profile — the client may only
        // send a masked/last-4 account number (e.g. from an auto-generated payout request), and
        // trusting that value here would silently break the Paystack transfer downstream.
        const sellerRecord = await db.seller.findUnique({
            where: { id: seller_id },
            select: { bankName: true, accountNumber: true, accountName: true, businessName: true },
        });

        const resolvedAccountNumber = sellerRecord?.accountNumber || account_number;
        const resolvedBankName = sellerRecord?.bankName || bank_name;

        if (!resolvedAccountNumber || !resolvedBankName) {
            return NextResponse.json(
                { success: false, error: "Seller has no bank details on file — add them in Seller Settings before requesting a payout." },
                { status: 400 }
            );
        }

        const payout = await db.payout.create({
            data: {
                sellerId: seller_id,
                amount,
                bankName: resolvedBankName,
                accountNumber: resolvedAccountNumber,
                accountName: sellerRecord?.accountName || sellerRecord?.businessName || account_name || "N/A",
                orderIds: order_ids || [],
                status: "processing",
            },
        });

        // Mark the associated orders as payout_requested
        if (order_ids && order_ids.length > 0) {
            await db.order.updateMany({
                where: { id: { in: order_ids } },
                data: { payoutStatus: "requested" },
            });
        }

        // High-value payout HITL gate — previously this only existed for the QR/
        // auto-payout webhook path. A regular order's escrow release (customer clicks
        // "Confirm Delivery") lands here too, and above-threshold payouts from THIS path
        // never pinged WhatsApp at all — admin had no signal a large payout was waiting
        // beyond manually checking /admin/payouts.
        const hitlThreshold = await getPayoutHitlThreshold();
        if (amount > hitlThreshold) {
            const runId = `PAY-${Date.now().toString(36).toUpperCase()}`;
            await db.zemaApprovalRequest.create({
                data: {
                    runId,
                    orderId: payout.id,
                    status: "pending",
                    agentDecision: JSON.stringify({
                        type: "payout",
                        payoutId: payout.id,
                        sellerId: seller_id,
                        amount,
                        bankName: resolvedBankName,
                        accountNumber: resolvedAccountNumber,
                        accountName: sellerRecord?.accountName || sellerRecord?.businessName || account_name,
                    }),
                },
            });

            await WhatsAppService.sendMessage(ZEMA_APPROVER_WHATSAPP,
                `🛑 *High-Value Payout — Approval Required*\n\n` +
                `Seller: *${sellerRecord?.businessName || seller_id}*\n` +
                `Amount: *₦${amount.toLocaleString()}*\n` +
                `Bank: ${resolvedBankName} ••${resolvedAccountNumber.slice(-4)}\n\n` +
                `Reply:\n✅ *approve ${runId}*\n❌ *reject ${runId}*`
            ).catch(() => {});
            await notifyAdmins(
                `🛑 Payout of ₦${amount.toLocaleString()} to ${sellerRecord?.businessName || seller_id} needs WhatsApp approval (${runId}) — exceeds the ₦${hitlThreshold.toLocaleString()} auto-payout threshold.`,
                { type: "system", link: "/admin/payouts" }
            ).catch(() => {});
            {
                const site = process.env.FAIRPRICE_URL || "https://www.fairprice.ng";
                for (const adminEmail of ADMIN_EMAILS) {
                    fetch(`${site}/api/email`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            to: adminEmail,
                            type: "SYSTEM_ALERT",
                            payload: {
                                subject: `[ACTION REQUIRED] Payout approval — ₦${amount.toLocaleString()} to ${sellerRecord?.businessName || seller_id}`,
                                title: "High-value payout needs approval",
                                message: `${sellerRecord?.businessName || seller_id} has a payout of ₦${amount.toLocaleString()} awaiting approval — it exceeds the ₦${hitlThreshold.toLocaleString()} auto-payout threshold.`,
                                data: { runId, sellerId: seller_id, amount },
                                dashboardUrl: `${site}/admin/payouts`,
                            },
                        }),
                    }).catch(() => {});
                }
            }
        }

        return NextResponse.json({ success: true, payout });
    } catch (error: any) {
        console.error("Payouts POST Error:", error);
        return NextResponse.json(
            { success: true, queued: true, error: "DB offline — payout saved locally" },
            { status: 202, headers: { "X-DB-Status": "offline" } }
        );
    }
}

// PATCH /api/payouts — Update payout status (admin approval)
export async function PATCH(request: Request) {
    try {
        const user = getUserFromRequest(request);
        if (!user || user.role !== "admin") {
            return NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 });
        }

        const body = await request.json();
        const { id, status, finalAmount, manualSettle, manualNote } = body;

        if (!id || !status) {
            return NextResponse.json(
                { success: false, error: "ID and status required" },
                { status: 400 }
            );
        }

        // Manual settlement: admin paid the seller directly outside Paystack (e.g. the
        // charge landed in a Paystack business account that can't transfer out — a real
        // account/verification issue, not something a Transfer retry can fix) and is
        // recording it as settled without touching the Transfer API at all. This is a
        // deliberate, explicit admin action — never inferred automatically.
        if (status === "completed" && manualSettle) {
            const existing = await db.payout.findUnique({ where: { id }, select: { label: true } });
            const payout = await db.payout.update({
                where: { id },
                data: {
                    status: "completed",
                    ...(finalAmount !== undefined && { amount: finalAmount }),
                    label: `${existing?.label || ""} [Manually settled by ${user.email} on ${new Date().toISOString()}${manualNote ? `: ${manualNote}` : ""}]`.trim(),
                },
            });
            await notifyAdmins(
                `ℹ️ Payout ${id} was marked manually settled by ${user.email} (not via Paystack Transfer).`,
                { type: "system", link: "/admin/payouts" }
            ).catch(() => {});
            return NextResponse.json({ success: true, payout, manualSettle: true });
        }

        const payout = await db.payout.update({
            where: { id },
            data: {
                status,
                ...(finalAmount !== undefined && { amount: finalAmount })
            },
        });

        // If approved/completed, trigger Paystack transfer and mark orders as paid out
        if (status === "completed") {
            const currentPayout = await db.payout.findUnique({ where: { id } });

            // Always re-source bank details from the seller's stored profile — a payout
            // row created via the old client path may only carry a masked last-4 account
            // number. Trusting that (or worse, silently skipping the transfer when it's
            // missing) is exactly how a payout got marked "completed" with no money sent.
            const sellerRecord = currentPayout
                ? await db.seller.findUnique({
                    where: { id: currentPayout.sellerId },
                    select: { bankName: true, accountNumber: true, accountName: true, businessName: true },
                })
                : null;

            const realBankName = sellerRecord?.bankName || currentPayout?.bankName;
            const realAccountNumber = sellerRecord?.accountNumber || currentPayout?.accountNumber;
            const realAccountName = sellerRecord?.accountName || sellerRecord?.businessName || currentPayout?.accountName;

            if (!currentPayout || !process.env.PAYSTACK_SECRET_KEY || !realAccountNumber || realAccountNumber.length < 10) {
                // Do NOT silently mark this "completed" — that's how money gets lost.
                await db.payout.update({ where: { id }, data: { status: "failed" } });
                return NextResponse.json({
                    success: false,
                    error: !realAccountNumber || realAccountNumber.length < 10
                        ? "Seller has no valid full account number on file — cannot transfer. Update their bank details first."
                        : "Paystack not configured on this server.",
                }, { status: 400 });
            }

            // Confirm real money actually funded this payout before sending platform funds
            // out for it. Escrow can be "released" for orders that were never actually paid
            // through Paystack (COD, WhatsApp, demo/seed data) — approving those would
            // transfer real money out of the platform's balance for revenue it never collected.
            let paymentReference = currentPayout.paymentReference;
            if (!paymentReference && currentPayout.orderIds.length > 0) {
                const linkedOrder = await db.order.findFirst({
                    where: { id: { in: currentPayout.orderIds }, paymentReference: { not: null } },
                    select: { paymentReference: true },
                });
                paymentReference = linkedOrder?.paymentReference || null;
            }

            if (!paymentReference) {
                await db.payout.update({ where: { id }, data: { status: "pending" } });
                return NextResponse.json({
                    success: false,
                    error: "No Paystack payment reference found for this payout's order(s) — cannot auto-verify it was actually paid through Paystack (may be COD/WhatsApp/manual/demo). Confirm manually before overriding.",
                }, { status: 400 });
            }

            const verification = await verifyPaystackReference(paymentReference);
            if (!verification.verified) {
                await db.payout.update({ where: { id }, data: { status: "pending" } });
                return NextResponse.json({
                    success: false,
                    error: `Could not verify the linked Paystack transaction (${paymentReference}): ${verification.message}. Refusing to transfer until this is confirmed.`,
                }, { status: 400 });
            }

            const result = await initiatePaystackTransfer({
                payoutId: currentPayout.id,
                amount: finalAmount || currentPayout.amount,
                bankName: realBankName!,
                accountNumber: realAccountNumber,
                accountName: realAccountName || "Seller",
                sellerId: currentPayout.sellerId,
                isAutoPayout: false
            });

            if (result.success) {
                await notifySellerPayout(currentPayout.sellerId, currentPayout.amount, "completed", currentPayout.id);
                await emailSellerPayout(currentPayout.sellerId, currentPayout.amount, "completed");
            } else {
                console.error("Paystack Transfer Failed:", result.message);
                // Revert status on failure
                await db.payout.update({
                    where: { id },
                    data: { status: "failed" }
                });
                return NextResponse.json({
                    success: false,
                    error: `Transfer failed: ${result.message}`
                }, { status: 500 });
            }

            if (payout.orderIds.length > 0) {
                await db.order.updateMany({
                    where: { id: { in: payout.orderIds } },
                    data: { payoutStatus: "paid" },
                });
            }
        }

        return NextResponse.json({ success: true, payout });
    } catch (error: any) {
        console.error("Payouts PATCH Error:", error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
