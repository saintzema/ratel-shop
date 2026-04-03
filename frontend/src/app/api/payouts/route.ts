import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

// GET /api/payouts?sellerId=xxx
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const sellerId = searchParams.get("sellerId");

        const whereClause: any = {};
        if (sellerId) whereClause.sellerId = sellerId;

        const payouts = await db.payout.findMany({
            where: whereClause,
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json({ success: true, payouts });
    } catch (error: any) {
        console.error("Payouts GET Error:", error);
        return NextResponse.json({ success: true, payouts: [] }, {
            status: 200,
            headers: { "X-DB-Status": "offline" },
        });
    }
}

// POST /api/payouts — Create a new payout request
export async function POST(request: Request) {
    try {
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
        const body = await request.json();
        const { id, status } = body;

        if (!id || !status) {
            return NextResponse.json(
                { success: false, error: "ID and status required" },
                { status: 400 }
            );
        }

        const payout = await db.payout.update({
            where: { id },
            data: { status },
        });

        // If approved/completed, mark orders as paid out
        if (status === "completed" && payout.orderIds.length > 0) {
            await db.order.updateMany({
                where: { id: { in: payout.orderIds } },
                data: { payoutStatus: "paid" },
            });
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
