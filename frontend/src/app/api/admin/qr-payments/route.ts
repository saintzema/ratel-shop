import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserFromRequest } from "@/lib/jwt";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/qr-payments
 *
 * QR/direct-payment products are ephemeral checkout artifacts (see the public
 * /api/products filter), so they never showed up anywhere a seller or admin
 * could track how a given QR code was actually performing. This aggregates
 * existing Product/Order data (no schema change — just a read) into a usage
 * table: times scanned, successful payments, and payout status per QR.
 *
 * Admin gets every seller's QR codes; a seller only gets their own.
 */
export async function GET(req: Request) {
    try {
        const user = getUserFromRequest(req);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const whereClause: any = { isDirectPayment: true };
        if (user.role !== "admin") {
            const sellers = await db.seller.findMany({ where: { userId: user.userId }, select: { id: true } });
            const sellerIds = sellers.map((s) => s.id);
            if (!sellerIds.length) {
                return NextResponse.json([]);
            }
            whereClause.sellerId = { in: sellerIds };
        }

        const products = await db.product.findMany({
            where: whereClause,
            select: {
                id: true,
                name: true,
                sellerId: true,
                sellerName: true,
                price: true,
                createdAt: true,
                orders: {
                    select: { id: true, amount: true, escrowStatus: true, payoutStatus: true, createdAt: true },
                },
            },
            orderBy: { createdAt: "desc" },
            take: 500,
        });

        const result = products.map((p) => {
            const orders = p.orders;
            const paidOrders = orders.filter((o) => o.escrowStatus !== "held" || o.payoutStatus !== "none");
            const payoutStatus = orders.some((o) => o.payoutStatus === "cashed_out")
                ? "paid_out"
                : orders.some((o) => o.escrowStatus === "released" || o.escrowStatus === "buyer_confirmed")
                ? "pending_payout"
                : orders.length > 0
                ? "awaiting_delivery_confirmation"
                : "no_orders_yet";

            return {
                id: p.id,
                name: p.name,
                seller_id: p.sellerId,
                seller_name: p.sellerName,
                price: p.price,
                created_at: p.createdAt.toISOString(),
                times_used: orders.length,
                successful_payments: paidOrders.length,
                total_collected: paidOrders.reduce((sum, o) => sum + o.amount, 0),
                payout_status: payoutStatus,
            };
        });

        return NextResponse.json(result);
    } catch (error: any) {
        console.error("[admin/qr-payments] error:", error);
        return NextResponse.json({ error: "Failed to fetch QR payment data" }, { status: 500 });
    }
}
