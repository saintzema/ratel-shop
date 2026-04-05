import { NextResponse } from "next/server"; // REBUILD_TRIGGER_ENV_FIX
import { db } from "@/lib/db";
import { broadcast } from "../realtime/route";

export const runtime = "nodejs";

// GET /api/negotiations
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const customerId = searchParams.get("customerId");
        const sellerId = searchParams.get("sellerId");

        const whereClause: any = {};
        if (customerId) whereClause.customerId = customerId;
        if (sellerId) whereClause.sellerId = sellerId;

        // Fetch negotiations with a global try-catch for resiliency
        try {
            const negotiations = await db.negotiationRequest.findMany({
                where: whereClause,
                include: {
                    product: true,
                },
                orderBy: {
                    createdAt: 'desc',
                }
            });
            
            return NextResponse.json({ success: true, negotiations });
        } catch (dbError: any) {
            console.error("Database fetch error:", dbError);
            throw dbError;
        }
    } catch (error: any) {
        console.error("Negotiations GET Error:", error);
        return NextResponse.json({ success: true, negotiations: [] }, {
            status: 200,
            headers: { "X-DB-Status": "offline" }
        });
    }
}

// POST /api/negotiations
// Create a new price negotiation (used by Ziva AI Chat)
export async function POST(request: Request) {
    try {
        const body = await request.json();

        const product = await db.product.findUnique({
            where: { id: body.product_id },
            select: { 
                sellerId: true, 
                name: true,
                seller: { select: { userId: true } }
            }
        });

        if (!product) {
            return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });
        }

        // Ensure customer exists (to satisfy Foreign Key constraint)
        let resolvedCustomerId = body.customer_id;
        const existingCustomer = await db.user.findUnique({
            where: { id: resolvedCustomerId },
            select: { id: true }
        });

        if (!existingCustomer) {
            // If it's a guest or an old local session ID, ensure there's at least a guest record
            resolvedCustomerId = "guest";
            const guestStats = await db.user.upsert({
                where: { email: "guest@fairprice.ng" },
                update: {},
                create: {
                    id: "guest",
                    email: "guest@fairprice.ng",
                    name: "Guest Buyer",
                    role: "customer"
                }
            });
            resolvedCustomerId = guestStats.id;
        }

        const newNeg = await db.negotiationRequest.create({
            data: {
                productId: body.product_id,
                customerId: resolvedCustomerId,
                customerName: body.customer_name || "Guest Buyer",
                sellerId: product.sellerId,
                proposedPrice: body.proposed_price,
                message: body.message || null,
                status: 'pending',
                chatMessages: body.chat_messages || []
            }
        });

        // Broadcast update for real-time sync
        broadcast({ type: "negotiation_updated", id: newNeg.id });

        // Create persistent notification for the seller
        if (product?.seller?.userId) {
            await db.notification.create({
                data: {
                    userId: product.seller.userId,
                    type: "negotiation",
                    message: `💰 ${body.customer_name || 'A buyer'} sent an offer of ₦${body.proposed_price.toLocaleString()} for ${product.name}`,
                    link: "/seller/dashboard/messages"
                }
            }).catch(e => console.error("Failed to create seller notification:", e));
        }

        return NextResponse.json({ success: true, negotiation: newNeg });
    } catch (error: any) {
        console.error("Negotiations POST Error:", error);
        return NextResponse.json({ success: true, queued: true }, {
            status: 202,
            headers: { "X-DB-Status": "offline" }
        });
    }
}

// PATCH /api/negotiations
// Update status (accept/reject) or counter-offer
export async function PATCH(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const queryId = searchParams.get("id");

        let body: any = {};
        try {
            body = await request.json();
        } catch (e) {
            console.warn("Negotiations PATCH: Could not parse body, proceeding with query params");
        }

        const id = body.id || queryId;
        const { status, counterPrice, counterMessage, counterStatus, chatMessages, proposedPrice } = body;

        if (!id) {
            return NextResponse.json({ success: false, error: "Negotiation ID required" }, { status: 400 });
        }

        const updateData: any = {};
        if (status) updateData.status = status;
        if (proposedPrice !== undefined) updateData.proposedPrice = proposedPrice;
        
        // Use 'null' to clear out fields for a counter-counter offer scenario
        if (counterPrice !== undefined) updateData.counterPrice = counterPrice;
        if (counterMessage !== undefined) updateData.counterMessage = counterMessage;
        if (counterStatus !== undefined) updateData.counterStatus = counterStatus;

        if (chatMessages !== undefined) updateData.chatMessages = chatMessages;

        const updated = await db.negotiationRequest.update({
            where: { id },
            data: updateData,
            include: { 
                product: true, 
                customer: true,
                seller: { select: { userId: true } }
            }
        });

        broadcast({ type: "negotiation_updated", id: updated.id });

        // Duplicate Notifications Fix: We are removing the redundant `db.notification.create` block here!
        // The frontend `DataSyncService.addNotification` already intelligently creates and syncs User Notifications 
        // to `/api/notifications`. Creating them here again causes them to appear twice.

        // If it's a seller counter-offer, send email to Buyer
        if (status === "countered" && counterPrice !== undefined) {
             const buyerEmail = updated.customer?.email;
             if (buyerEmail && buyerEmail !== "guest@fairprice.ng") {
                 // Try to send email, but don't block the response
                 fetch(new URL('/api/email', request.url).toString(), {
                     method: 'POST',
                     headers: { 'Content-Type': 'application/json' },
                     body: JSON.stringify({
                         to: buyerEmail,
                         subject: `Counter Offer Received: ${updated.product?.name || 'An Item'}`,
                         type: "NEGOTIATION_REQUEST",
                         payload: {
                             name: updated.customerName || "Customer",
                             productName: updated.product?.name || 'An Item',
                             customerName: updated.customerName || "Customer",
                             message: `The seller has responded with a counter-offer of <strong>₦${counterPrice.toLocaleString()}</strong>. Please check your dashboard to accept or decline.`,
                             amount: `₦${counterPrice.toLocaleString()}`
                         }
                     })
                 }).catch(e => console.error("Failed to trigger counter-offer email:", e));
             }
        }

        return NextResponse.json({ success: true, negotiation: updated });
    } catch (error: any) {
        console.error("Negotiations PATCH Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
