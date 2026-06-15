import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserFromRequest } from "@/lib/jwt";

const NGN_TO_USD = 1620; // approximate rate — update as needed

export async function GET(req: NextRequest) {
    const admin = getUserFromRequest(req);
    if (!admin || (admin as any).role !== "admin") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // All platform orders
        const orders = await db.order.findMany({
            select: {
                id: true,
                amount: true,
                status: true,
                paymentMethod: true,
                isDirectPayment: true,
                createdAt: true,
                customerName: true,
                sellerName: true,
                product: { select: { name: true } },
            },
            orderBy: { createdAt: "desc" },
        });

        // All manually logged offline transactions
        const offline = await (db as any).offlineTransaction.findMany({
            orderBy: { transactionDate: "desc" },
        });

        // Aggregate order totals
        const orderTotal = orders.reduce((s: number, o: any) => s + (o.amount || 0), 0);
        const offlineTotal = offline.reduce((s: number, t: any) => s + (t.amount || 0), 0);
        const grandTotal = orderTotal + offlineTotal;

        // Monthly breakdown (last 12 months)
        const monthly: Record<string, { orders: number; offline: number }> = {};
        for (const o of orders) {
            const key = o.createdAt.toISOString().slice(0, 7); // YYYY-MM
            if (!monthly[key]) monthly[key] = { orders: 0, offline: 0 };
            monthly[key].orders += o.amount || 0;
        }
        for (const t of offline) {
            const key = new Date(t.transactionDate).toISOString().slice(0, 7);
            if (!monthly[key]) monthly[key] = { orders: 0, offline: 0 };
            monthly[key].offline += t.amount || 0;
        }

        return NextResponse.json({
            orders: {
                list: orders,
                total: orderTotal,
                count: orders.length,
            },
            offline: {
                list: offline,
                total: offlineTotal,
                count: offline.length,
            },
            combined: {
                total: grandTotal,
                count: orders.length + offline.length,
                usd: Math.round(grandTotal / NGN_TO_USD),
            },
            monthly,
            generatedAt: new Date().toISOString(),
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
