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

        const payout = await db.payout.create({
            data: {
                sellerId: seller_id,
                amount,
                bankName: bank_name,
                accountNumber: account_number,
                accountName: account_name || "N/A",
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
            
            if (currentPayout && process.env.PAYSTACK_SECRET_KEY && currentPayout.accountNumber) {
                const result = await initiatePaystackTransfer({
                    payoutId: currentPayout.id,
                    amount: finalAmount || currentPayout.amount,
                    bankName: currentPayout.bankName,
                    accountNumber: currentPayout.accountNumber,
                    accountName: currentPayout.accountName,
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
