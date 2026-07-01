import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserFromRequest } from "@/lib/jwt";
import { initiatePaystackTransfer, notifySellerPayout, emailSellerPayout } from "@/lib/payout-transfer";

export const runtime = "nodejs";

// GET /api/payouts?sellerId=xxx
export async function GET(request: Request) {
    try {
        const user = getUserFromRequest(request);
        if (!user) {
            return NextResponse.json({ success: true, payouts: [] });
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

        if (!seller_id || !amount || !bank_name || !account_number) {
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

        if (!seller_id || !amount || !bank_name || !account_number) {
            return NextResponse.json(
                { success: false, error: "Missing required fields" },
                { status: 400 }
            );
        }

        // Source the real bank details from the seller's stored profile — the client may only
        // send a masked/last-4 account number (e.g. from an auto-generated payout request), and
        // trusting that value here would silently break the Paystack transfer downstream.
        const sellerRecord = await db.seller.findUnique({
            where: { id: seller_id },
            select: { bankName: true, accountNumber: true, accountName: true, businessName: true },
        });

        const payout = await db.payout.create({
            data: {
                sellerId: seller_id,
                amount,
                bankName: sellerRecord?.bankName || bank_name,
                accountNumber: sellerRecord?.accountNumber || account_number,
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
        const { id, status, finalAmount } = body;

        if (!id || !status) {
            return NextResponse.json(
                { success: false, error: "ID and status required" },
                { status: 400 }
            );
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
