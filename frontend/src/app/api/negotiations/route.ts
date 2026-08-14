import { NextResponse } from "next/server"; // REBUILD_TRIGGER_ENV_FIX
import { db } from "@/lib/db";
import { broadcast } from "@/lib/realtime-service";
import { WhatsAppService } from "@/lib/whatsapp-service";
import { moderateMessageText } from "@/lib/content-moderation";
import { notifyAdmins } from "@/lib/admin-notify";

export const runtime = "nodejs";

// GET /api/negotiations
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const customerId = searchParams.get("customerId");
        const sellerId = searchParams.get("sellerId");
        const fetchAll = searchParams.get("all") === "true";

        // Negotiations carry PII (customer names, chat messages, offer prices). Scope every
        // read to the requester's own records. A seller who also buys passes BOTH ids and we
        // OR them (incoming offers on their store + their own outgoing offers). Only an
        // explicit all=true (admin sync) returns the full table — and that response is never
        // shared-cached. Previously an unscoped call returned EVERY user's negotiations and
        // cached them publicly: a data-exposure bug, now closed.
        let whereClause: any;
        if (customerId && sellerId) {
            whereClause = { OR: [{ customerId }, { sellerId }] };
        } else if (customerId) {
            whereClause = { customerId };
        } else if (sellerId) {
            whereClause = { sellerId };
        } else if (fetchAll) {
            whereClause = {}; // admin full view
        } else {
            // No scope and not an explicit admin request — return nothing rather than leak.
            return NextResponse.json({ success: true, negotiations: [] }, {
                headers: { "Cache-Control": "no-store" }
            });
        }

        // Scoped reads may be cached in the user's OWN browser only; the admin all=true blob
        // is PII and must never touch a shared CDN.
        const cacheHeader = fetchAll && !(customerId || sellerId)
            ? "no-store"
            : "private, max-age=15";

        // Fetch negotiations with a global try-catch for resiliency
        try {
            const negotiations = await db.negotiationRequest.findMany({
                where: whereClause,
                select: {
                    id: true,
                    productId: true,
                    customerId: true,
                    customerName: true,
                    sellerId: true,
                    proposedPrice: true,
                    message: true,
                    status: true,
                    chatMessages: true,
                    counterPrice: true,
                    counterMessage: true,
                    counterStatus: true,
                    createdAt: true,
                    updatedAt: true,
                    product: {
                        select: {
                            name: true,
                            imageUrl: true,
                            price: true
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc',
                },
                take: 100 // Optimization: Limit to most recent records
            });
            
            return NextResponse.json({ success: true, negotiations }, {
                headers: { "Cache-Control": cacheHeader }
            });
        } catch (dbError: any) {
            console.error("Database fetch error:", dbError);
            throw dbError;
        }
    } catch (error: any) {
        console.error("Negotiations GET Error:", error);
        return NextResponse.json({ success: true, negotiations: [] }, {
            status: 500,
            headers: { 
                "X-DB-Status": "offline",
                "Cache-Control": "no-store"
            }
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

        // A negotiation opening IS the "chat started" signal on this marketplace —
        // it's the per-listing engagement number the seller sees next to views and
        // phone reveals. Non-blocking: never fail the negotiation over a counter.
        db.product
            .update({ where: { id: body.product_id }, data: { chatCount: { increment: 1 } } })
            .catch(() => { /* non-critical */ });

        // Ensure customer exists (to satisfy Foreign Key constraint)
        let resolvedCustomerId = body.customer_id || "guest";
        
        // --- Unique Guest Identity Support ---
        // We avoid crashing if specific user is not found, instead we create a transient shell user
        const existingCustomer = await db.user.findUnique({
            where: { id: resolvedCustomerId },
            select: { id: true }
        });

        if (!existingCustomer) {
            // If it's a unique guest ID or an old session ID, ensure there's a unique guest record
            // Use a pattern: guest_[id]@fairprice.ng to ensure unique constraint
            const guestEmail = `guest_${resolvedCustomerId.replace(/[^a-zA-Z0-9]/g, '')}@fairprice.ng`;
            
            const guestStats = await db.user.upsert({
                where: { email: guestEmail },
                update: { 
                    name: body.customer_name || "Guest Buyer"
                },
                create: {
                    id: resolvedCustomerId,
                    email: guestEmail,
                    name: body.customer_name || "Guest Buyer",
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
                customerWhatsapp: body.customer_whatsapp || null,
                chatMessages: body.chat_messages || []
            } as any
        });

        // Trigger WhatsApp Confirmation
        if (body.customer_whatsapp) {
            await WhatsAppService.sendNegotiationStarted(body.customer_whatsapp, {
                productName: product.name,
                proposedPrice: body.proposed_price,
                negotiationId: newNeg.id
            }).catch(e => console.error("WhatsApp Notification Error:", e));
        }

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

            // --- WhatsApp Direct DM Routing (PREMIUM) ---
            const sellerFull = await (db.seller as any).findUnique({
                where: { id: product.sellerId },
                select: { whatsappNumber: true, whatsappDirectDM: true, tier: true, subscriptionPlan: true }
            });

            const isPremium = sellerFull?.subscriptionPlan !== "Starter";
            if ((sellerFull as any)?.whatsappDirectDM && sellerFull.whatsappNumber && isPremium) {
                const waRes = await WhatsAppService.sendSellerNegotiationDM(sellerFull.whatsappNumber, {
                    customerName: body.customer_name || "A buyer",
                    productName: product.name,
                    proposedPrice: body.proposed_price,
                    negotiationId: newNeg.id
                });

                if (waRes?.messages?.[0]?.id) {
                    await (db as any).whatsAppNegotiationSession.create({
                        data: {
                            sellerId: product.sellerId,
                            negotiationId: newNeg.id,
                            sellerPhone: WhatsAppService.normalizePhoneNumber(sellerFull.whatsappNumber),
                            customerPhone: body.customer_whatsapp || null,
                            lastMessageId: waRes.messages[0].id
                        }
                    }).catch((e: any) => console.error("Failed to create WA session:", e));
                }
            }
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

        if (chatMessages !== undefined) {
            // The client always PATCHes the FULL message array (append-then-send), so
            // the last entry is the newly-added message — that's the only one that
            // needs moderating on this call; everything before it already passed
            // moderation on the PATCH that originally added it.
            const newest = Array.isArray(chatMessages) ? chatMessages[chatMessages.length - 1] : null;
            if (newest?.text) {
                const result = moderateMessageText(newest.text);
                if (result.blocked) {
                    notifyAdmins(
                        `🚩 A chat message was auto-blocked (${result.reason}) on negotiation ${id}.`,
                        { type: "system", link: "/admin/governance" }
                    ).catch(() => {});
                    return NextResponse.json({
                        success: false,
                        error: "This message can't be sent — it may violate our chat guidelines (harassment, or asking to pay outside FairPrice's protected checkout).",
                        moderationReason: result.reason,
                    }, { status: 422 });
                }
            }
            updateData.chatMessages = chatMessages;
        }

        const updated = await db.negotiationRequest.update({
            where: { id },
            data: updateData,
            include: { 
                product: true, 
                customer: true,
                seller: { select: { businessName: true, userId: true } }
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

             // --- WhatsApp Notification for Counter ---
             const customerNum = (updated as any).customerWhatsapp;
             if (customerNum) {
                 await WhatsAppService.sendNegotiationUpdate(customerNum, {
                     productName: updated.product?.name || "Product",
                     newPrice: counterPrice,
                     sellerName: (updated.seller as any)?.businessName || "Seller",
                     negotiationId: updated.id
                 }).catch(e => console.error("WhatsApp Counter-Offer Alert Error:", e));
             }
        }

        return NextResponse.json({ success: true, negotiation: updated });
    } catch (error: any) {
        console.error("Negotiations PATCH Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
