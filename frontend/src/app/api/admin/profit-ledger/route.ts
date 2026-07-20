import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserFromRequest } from "@/lib/jwt";
import { calculateTieredEscrowFee } from "@/lib/escrow-utils";

export const dynamic = "force-dynamic";

const SUBSCRIPTION_PRICES: Record<string, number> = {
    starter: 0,
    pro: 12000,
    growth: 35000,
    scale: 100000,
};

/**
 * GET /api/admin/profit-ledger
 *
 * Real DB-backed replacement for AdminProfitTable's previous client-side
 * approximation, which read DataSyncService.getOrders()/getSellers() — the
 * LOCAL browser cache. That cache is capped at 200 orders (the "all=true"
 * safety limit on /api/orders) and can be emptied entirely by a localStorage
 * quota "nuclear clear", so the admin dashboard's profit figures could be
 * wildly wrong or zero depending on what happened to be cached on that
 * specific device. This queries every non-cancelled order directly.
 */
export async function GET(req: NextRequest) {
    const admin = getUserFromRequest(req);
    if (!admin || (admin as any).role !== "admin") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const [orders, sellers, settings] = await Promise.all([
            db.order.findMany({
                where: { status: { not: "cancelled" } },
                select: { amount: true, shippingAddress: true },
            }),
            db.seller.findMany({ select: { subscriptionPlan: true } }),
            db.systemSetting.findUnique({ where: { id: "global" }, select: { doorstepFee: true } }),
        ]);

        const doorstepFee = settings?.doorstepFee ?? 4000;

        let escrowRevenue = 0;
        let deliveryRevenue = 0;
        for (const o of orders) {
            escrowRevenue += calculateTieredEscrowFee(o.amount);
            // Order has no dedicated deliveryMethod column — pickup orders are stamped
            // "Pickup: ..." into shippingAddress at checkout (see checkout/page.tsx),
            // everything else is a real doorstep address.
            if (!o.shippingAddress?.startsWith("Pickup")) {
                deliveryRevenue += doorstepFee;
            }
        }

        let subscriptionRevenue = 0;
        for (const s of sellers) {
            const plan = (s.subscriptionPlan || "Starter").toLowerCase();
            subscriptionRevenue += SUBSCRIPTION_PRICES[plan] ?? 0;
        }

        return NextResponse.json({
            escrowRevenue: Math.round(escrowRevenue),
            deliveryRevenue,
            subscriptionRevenue,
            totalOrders: orders.length,
            generatedAt: new Date().toISOString(),
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
