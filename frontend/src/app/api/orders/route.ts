import { NextResponse } from "next/server";
import { after } from "next/server";
import { db } from "@/lib/db";
import { broadcast } from "@/lib/realtime-service";
import { triggerZema360 } from "@/lib/zema-trigger";
import { getUserFromRequest } from "@/lib/jwt";
import { verifyPaystackReference } from "@/lib/payout-transfer";

export const runtime = "nodejs";

// GET /api/orders
// Fetch orders for a specific user or seller
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const customerId = searchParams.get("customerId");
        const customerEmail = searchParams.get("customerEmail");
        const sellerId = searchParams.get("sellerId");
        // all=true was honored purely from the client-supplied query param with zero
        // server-side check — any caller could request every order on the platform.
        // It also meant an admin session that briefly failed a client-side role check
        // (e.g. stale cached user object) silently fell back to a customerId-scoped
        // query returning nothing, instead of the admin's full view.
        const requestedAll = searchParams.get("all") === "true";
        const verifiedUser = getUserFromRequest(request);
        const fetchAll = requestedAll && verifiedUser?.role === "admin";

        const whereClause: any = {};
        if (!fetchAll) {
            if (customerId && customerEmail) {
                whereClause.OR = [
                    { customerId: customerId },
                    { customerId: customerEmail }
                ];
            } else if (customerId) {
                whereClause.customerId = customerId;
            } else if (customerEmail) {
                whereClause.customerId = customerEmail;
            }
            
            if (sellerId) whereClause.sellerId = sellerId;
        }

        const orders = await db.order.findMany({
            where: whereClause,
            select: {
                id: true,
                customerId: true,
                customerName: true,
                productId: true,
                sellerId: true,
                sellerName: true,
                amount: true,
                quantity: true,
                shippingAddress: true,
                paymentMethod: true,
                status: true,
                escrowStatus: true,
                payoutStatus: true,
                createdAt: true,
                product: {
                    select: {
                        name: true,
                        imageUrl: true,
                        price: true
                    }
                },
                chatMessages: true,
                zivaActive: true,
                // statusNote/paymentReference added in schema — Prisma client regenerated on Vercel build
                ...({ statusNote: true, trackingId: true, carrier: true, trackingSteps: true, trackingStatus: true, paymentReference: true } as any),
            },
            orderBy: {
                createdAt: 'desc',
            },
            take: fetchAll ? 200 : 100, // Safety limit
        });

        return NextResponse.json({ success: true, orders }, {
            headers: {
                "Cache-Control": "public, s-maxage=1, stale-while-revalidate=5"
            }
        });
    } catch (error: any) {
        console.error("Orders API Error:", error);
        return NextResponse.json({ success: true, orders: [] }, {
            status: 500,
            headers: { 
                "X-DB-Status": "offline",
                "Cache-Control": "no-store"
            }
        });
    }
}

// POST /api/orders
// Create a new order after checkout
export async function POST(request: Request) {
    try {
        const body = await request.json();

        // Ensure user exists first (prevents FK constraint violation)
        const userId = body.customer_id;
        const userEmail = body.customer_email || `${userId}@fairprice.ng`;
        const userName = body.customer_name || "Customer";

        let resolvedUserId = userId;
        try {
            const user = await db.user.upsert({
                where: { id: userId },
                update: { name: userName },
                create: {
                    id: userId,
                    email: userEmail,
                    name: userName,
                    role: "customer",
                }
            });
            resolvedUserId = user.id;
        } catch (err) {
            // If upsert by ID fails (e.g. email conflict), try by email to link to existing account
            try {
                const user = await db.user.upsert({
                    where: { email: userEmail },
                    update: { name: userName },
                    create: {
                        id: userId,
                        email: userEmail,
                        name: userName,
                        role: "customer",
                    }
                });
                resolvedUserId = user.id;
            } catch (err2) {
                /* ignore — order will save with guest ID */
            }
        }

        // ─── POWER FIX: Just-in-Time Product Hydration ───
        // If this is a global product or from a seller not yet in the DB, 
        // we must hydrate it before creating the order to satisfy FK constraints.
        if (body.product_id && body.product) {
            const p = body.product;
            try {
                // Ensure global seller exists if needed
                if (p.seller_id === 'global-partners') {
                    const globalUser = await db.user.upsert({
                        where: { id: 'global-user' },
                        update: {},
                        create: {
                            id: 'global-user',
                            email: 'global@fairprice.app',
                            name: 'FairPrice Global',
                            role: 'admin'
                        }
                    });

                    await db.seller.upsert({
                        where: { id: 'global-partners' },
                        update: { status: 'active' },
                        create: {
                            id: 'global-partners',
                            userId: globalUser.id,
                            businessName: 'Global Stores',
                            ownerEmail: 'global@fairprice.app',
                            description: 'Global Sourcing Partners',
                            category: 'All',
                            status: 'active',
                            verified: true,
                            rating: 5.0,
                            trustScore: 100.0
                        }
                    });
                }

                // Hydrate the product itself
                await db.product.upsert({
                    where: { id: body.product_id },
                    update: {}, // Don't overwrite if exists
                    create: {
                        id: body.product_id,
                        sellerId: p.seller_id || 'global-partners',
                        sellerName: p.seller_name || 'Global Store',
                        name: p.name,
                        description: p.description || "",
                        price: p.price,
                        category: p.category || "General",
                        imageUrl: p.image_url || p.imageUrl || "/placeholder.png",
                        images: p.images || [],
                        stock: p.stock || 100,
                        isActive: true
                    }
                });
            } catch (hydrationErr) {
                console.warn("JIT Hydration failed (continuing anyway):", hydrationErr);
            }
        }

        const newOrder = await db.$transaction(async (tx) => {
            // 1. Create the order
            const order = await tx.order.create({
                data: {
                    id: body.tracking_id || `FP-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
                    customerId: resolvedUserId,
                    customerName: userName,
                    productId: body.product_id,
                    sellerId: body.seller_id,
                    sellerName: body.seller_name,
                    amount: body.amount,
                    quantity: body.quantity || 1,
                    shippingAddress: body.shipping_address,
                    paymentMethod: body.payment_method || 'paystack',
                    status: 'pending',
                    escrowStatus: 'held',
                },
                include: {
                    product: true
                }
            });

            // 2. Decrement stock — prevent overselling
            if (body.product_id) {
                await tx.product.update({
                    where: { id: body.product_id },
                    data: { stock: { decrement: body.quantity || 1 } },
                }).catch(() => { /* skip if product is virtual / not in DB */ });
            }

            // 3. Increment product soldCount
            if (body.product_id) {
                await tx.product.update({
                    where: { id: body.product_id },
                    data: { soldCount: { increment: body.quantity || 1 } },
                }).catch(() => {});
            }

            // 4. Record Discount Usage if applicable
            if (body.discount_id) {
                await tx.discount.update({
                    where: { id: body.discount_id },
                    data: { usageCount: { increment: 1 } }
                }).catch(() => { /* skip if discount deleted */ });

                await tx.userDiscountUsage.create({
                    data: {
                        userId: userId,
                        discountId: body.discount_id
                    }
                }).catch(() => {});
            }

            return order;
        });

        // Notify the seller via persistent DB notification + email
        if (body.seller_id) {
            const productName = (newOrder as any).product?.name || "a product";
            const amount = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(body.amount || 0);

            // Notification.userId must be a real User.id — /api/notifications joins on
            // it to resolve the seller's email. seller_id is the Seller record's own id
            // (a different value), so notifications keyed on it were silently orphaned
            // and never showed up in the seller's alerts/bell.
            const notifySeller = await db.seller.findUnique({ where: { id: body.seller_id }, select: { userId: true } });

            // Bell notification
            db.notification.create({
                data: {
                    userId: notifySeller?.userId || body.seller_id,
                    type: "order",
                    message: `New Order! 🎉 ${userName} ordered ${productName} for ${amount}. Check your dashboard to confirm.`,
                    link: `/seller/orders`,
                    read: false,
                }
            }).catch(() => { /* non-critical */ });

            // Email notification — fire-and-forget
            db.seller.findUnique({ where: { id: body.seller_id }, select: { ownerEmail: true, businessName: true } })
                .then(seller => {
                    const email = seller?.ownerEmail || body.seller_email;
                    if (!email) return;
                    fetch(`${process.env.NEXTAUTH_URL || 'https://www.fairprice.ng'}/api/email`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            to: email,
                            type: 'SELLER_NEW_ORDER',
                            payload: {
                                sellerName: seller?.businessName || body.seller_name || 'Seller',
                                buyerName: userName,
                                productName,
                                amount,
                                orderId: newOrder.id,
                                orderLink: `${process.env.NEXTAUTH_URL || 'https://www.fairprice.ng'}/seller/orders`,
                                quantity: body.quantity || 1,
                                shippingAddress: body.shipping_address || '',
                            }
                        })
                    }).catch(() => { /* non-critical */ });
                }).catch(() => { /* non-critical */ });
        }

        // Broadcast update for real-time sync
        broadcast({ type: "order_updated", id: newOrder.id });

        // Kick off the ZEMA 360 autonomous pipeline (UiPath Maestro BPMN).
        // Runs after the response is sent — never blocks or fails the order.
        after(() => triggerZema360(newOrder.id));

        return NextResponse.json({ success: true, order: newOrder });
    } catch (error: any) {
        console.error("Orders POST Error:", error);
        // Acknowledge receipt — the client-side offline queue will retry
        return NextResponse.json({ success: true, queued: true, error: "DB offline — order saved locally" }, {
            status: 202,
            headers: { "X-DB-Status": "offline" }
        });
    }
}
// PATCH /api/orders
// Update existing order status or payoutStatus
export async function PATCH(request: Request) {
    try {
        const body = await request.json();
        const { id, ...updates } = body;

        if (!id) {
            return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
        }

        const prismaUpdates: any = {};
        if (updates.status) prismaUpdates.status = updates.status;
        if (updates.escrow_status) prismaUpdates.escrowStatus = updates.escrow_status;
        if (updates.payout_status) prismaUpdates.payoutStatus = updates.payout_status;
        // Escrow lifecycle timestamps — needed for auto-release eligibility to persist
        if (updates.seller_confirmed_at) prismaUpdates.sellerConfirmedAt = new Date(updates.seller_confirmed_at);
        if (updates.buyer_confirmed_at)  prismaUpdates.buyerConfirmedAt  = new Date(updates.buyer_confirmed_at);
        if (updates.escrow_status === "released") prismaUpdates.escrowReleasedAt = new Date();
        if (updates.tracking_status) prismaUpdates.trackingStatus = updates.tracking_status;
        if (updates.tracking_id) prismaUpdates.trackingId = updates.tracking_id;
        if (updates.carrier) prismaUpdates.carrier = updates.carrier;
        if (updates.tracking_steps) prismaUpdates.trackingSteps = updates.tracking_steps;
        // Seller status note (e.g. "held in customs", "awaiting clearance")
        if (updates.status_note !== undefined) prismaUpdates.statusNote = updates.status_note || null;

        if (updates.status === 'delivered') {
            prismaUpdates.deliveredAt = new Date();
        }

        // Admin-only, verified reconciliation of a missing/incorrect payment reference —
        // e.g. an order whose webhook delivery was missed. Requires admin auth AND an
        // independent Paystack lookup confirming the reference is a real, successful
        // transaction before it's trusted. This is what a payout approval later checks
        // before releasing platform funds, so it must never be settable on faith.
        if (updates.payment_reference !== undefined) {
            const user = getUserFromRequest(request);
            if (!user || user.role !== "admin") {
                return NextResponse.json({ error: "Admin access required to link a payment reference" }, { status: 403 });
            }
            const reference = String(updates.payment_reference).trim();
            if (!reference) {
                return NextResponse.json({ error: "payment_reference cannot be empty" }, { status: 400 });
            }
            const verification = await verifyPaystackReference(reference);
            if (!verification.verified) {
                return NextResponse.json({
                    error: `Could not verify this reference on Paystack: ${verification.message}`,
                }, { status: 400 });
            }
            prismaUpdates.paymentReference = reference;
        }

        const order = await db.order.update({
            where: { id },
            data: prismaUpdates,
        });

        broadcast({ type: "order_updated", id: id });

        return NextResponse.json({ success: true, order });
    } catch (error: any) {
        console.error("Orders PATCH Error:", error);
        return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
    }
}
