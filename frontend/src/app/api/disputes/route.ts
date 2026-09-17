import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { broadcast } from "@/lib/realtime-service";
import { getUserFromRequest } from "@/lib/jwt";

export const runtime = "nodejs";

// GET /api/disputes
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const buyerId = searchParams.get("buyerId");
        const sellerId = searchParams.get("sellerId");
        // Trusting a client-supplied all=true with no role check let anyone pull
        // every dispute (buyer/seller PII included) platform-wide — mirrors the
        // same fix already applied to /api/orders.
        const requestedAll = searchParams.get("all") === "true";
        const fetchAll = requestedAll && getUserFromRequest(request)?.role === "admin";

        const whereClause: any = {};
        if (!fetchAll) {
            if (buyerId) whereClause.buyerId = buyerId;
            if (sellerId) whereClause.sellerId = sellerId;

            // Without fetchAll, at least one scoping filter is required — an empty
            // whereClause here matches every dispute, which is exactly the unscoped
            // "all" query this gate exists to block.
            if (!buyerId && !sellerId) {
                return NextResponse.json({ success: true, disputes: [] });
            }
        }

        const disputes = await db.dispute.findMany({
            where: whereClause,
            include: {
                order: {
                    include: {
                        product: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc',
            },
            ...(fetchAll ? { take: 100 } : {}),
        });

        // Map to ensure frontend field consistency if needed
        const mappedDisputes = disputes.map(d => ({
            ...d,
            order_id: d.orderId,
            buyer_id: d.buyerId,
            seller_id: d.sellerId,
            product_name: d.productName,
            created_at: d.createdAt,
            resolved_at: d.resolvedAt,
        }));

        return NextResponse.json({ success: true, disputes: mappedDisputes });
    } catch (error: any) {
        console.error("Disputes API Error:", error);
        // Fallback to empty disputes to prevent UI issues if the table is missing or migrating
        return NextResponse.json(
            { success: false, disputes: [], error: "Failed to fetch disputes", details: error.message },
            { status: 200 }
        );
    }
}

// POST /api/disputes
//
// This used to be the ONLY server-side dispute path, but nothing in the app
// actually called it — the buyer-facing "raise a dispute" flow
// (DataSyncService.raiseDispute) only ever wrote to localStorage: a real
// Dispute row was never created, and Order.escrowStatus in the actual
// database never flipped to "disputed". The auto-release cron reads
// escrowStatus straight from Postgres (src/app/api/cron/auto-release), so a
// disputed order could still auto-release to the seller 24h after delivery
// while the buyer's own screen showed "payment is frozen" — a real
// money-safety gap, not a cosmetic one. Fixed two ways: (1) this route now
// also flips the order's escrowStatus, atomically with creating the
// dispute, so "disputed" is something the cron actually sees; (2) it now
// requires the caller to be the order's own buyer or an admin — previously
// anyone could file a dispute (and freeze escrow) on any order with no auth
// at all.
export async function POST(request: Request) {
    try {
        const user = getUserFromRequest(request);
        if (!user) return NextResponse.json({ success: false, error: "Sign in to file a dispute" }, { status: 401 });

        const body = await request.json();
        const orderId = body.order_id;
        if (!orderId) return NextResponse.json({ success: false, error: "order_id is required" }, { status: 400 });

        const order = await db.order.findUnique({ where: { id: orderId }, select: { customerId: true, sellerId: true, escrowStatus: true } });
        if (!order) return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
        if (order.customerId !== user.userId && user.role !== "admin") {
            return NextResponse.json({ success: false, error: "You can only dispute your own orders" }, { status: 403 });
        }
        if (order.escrowStatus === "released" || order.escrowStatus === "refunded") {
            return NextResponse.json({ success: false, error: "This order's payment has already been settled and can no longer be disputed here — contact support." }, { status: 400 });
        }

        const [newDispute] = await db.$transaction([
            db.dispute.create({
                data: {
                    orderId,
                    buyerId: body.buyer_id || user.userId,
                    buyerName: body.buyer_name,
                    buyerEmail: body.buyer_email,
                    sellerId: body.seller_id,
                    sellerName: body.seller_name,
                    productName: body.product_name,
                    amount: body.amount,
                    reason: body.reason,
                    description: body.description,
                    status: 'open',
                }
            }),
            // The actual freeze: this is what keeps the auto-release cron's
            // query (escrowStatus in held/seller_confirmed/buyer_confirmed/
            // auto_release_eligible) from matching this order anymore.
            db.order.update({ where: { id: orderId }, data: { escrowStatus: "disputed" } }),
        ]);

        broadcast({ type: "dispute_updated", id: newDispute.id });

        return NextResponse.json({ success: true, dispute: newDispute });
    } catch (error: any) {
        console.error("Disputes POST Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
