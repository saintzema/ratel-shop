import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { broadcast } from "../../realtime/route";
import crypto from "crypto";

export const runtime = "nodejs";

/**
 * Paystack Webhook Handler
 * This endpoint processes asynchronous events from Paystack (Live & Test).
 * Ensure the PAYSTACK_SECRET_KEY is set in Vercel environment variables.
 */
export async function POST(req: Request) {
    try {
        const body = await req.text();
        const signature = req.headers.get("x-paystack-signature");

        if (!signature) {
            return NextResponse.json({ error: "No signature" }, { status: 400 });
        }

        // 1. Verify Paystack Signature
        const secret = process.env.PAYSTACK_SECRET_KEY;
        if (!secret) {
            console.error("❌ Paystack Secret Key is missing in environment variables.");
            return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
        }

        const hash = crypto
            .createHmac("sha512", secret)
            .update(body)
            .digest("hex");

        if (hash !== signature) {
            console.warn("⚠️ Invalid Paystack Webhook signature detected.");
            return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
        }

        const event = JSON.parse(body);
        const data = event.data;

        console.log(`✅ Paystack Webhook received: ${event.event}`);

        // 2. Process Events
        switch (event.event) {
            case "charge.success":
                await handleChargeSuccess(data);
                break;
            
            case "transfer.success":
                await handleTransferSuccess(data);
                break;

            case "transfer.failed":
            case "transfer.reversed":
                await handleTransferFailed(data);
                break;

            default:
                console.log(`ℹ️ Event ${event.event} not explicitly handled.`);
        }

        return NextResponse.json({ status: "success" });
    } catch (error: any) {
        console.error("🚨 Webhook Processing Error:", error);
        return NextResponse.json({ error: "Webhook Error" }, { status: 500 });
    }
}

async function handleChargeSuccess(data: any) {
    const { reference, metadata, amount, customer } = data;
    const type = metadata?.type || "order";

    console.log(`💰 Payment Successful [${reference}] - Type: ${type}`);

    try {
        if (type === "order") {
            const orderId = metadata?.order_id;
            const orderIds = metadata?.order_ids; // Support multiple orders in one payment
            
            const idsToUpdate = orderIds ? (Array.isArray(orderIds) ? orderIds : orderIds.split(',')) : (orderId ? [orderId] : []);

            for (const id of idsToUpdate) {
                await db.order.update({
                    where: { id: id.trim() },
                    data: {
                        status: "processing",
                        escrowStatus: "held",
                    }
                }).catch(err => console.error(`❌ Failed to update order ${id}:`, err));
                
                broadcast({ type: "order_updated", id: id.trim() });
                console.log(`📦 Order ${id} marked as processing.`);
            }
        } 
        else if (type === "sponsored_ad") {
            const productId = metadata?.product_id;
            if (productId) {
                await db.product.update({
                    where: { id: productId },
                    data: { isSponsored: true }
                });
                broadcast({ type: "product_updated", id: productId });
                console.log(`🚀 Product ${productId} is now Sponsored.`);
            }
        }
        else if (type === "account_upgrade") {
            const userId = metadata?.user_id;
            const targetRole = metadata?.role || "customer";
            const plan = metadata?.plan || "Pro";
            const expiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

            if (userId) {
                if (targetRole === "customer") {
                    await db.user.update({
                        where: { id: userId },
                        data: { 
                            role: "customer",
                            // @ts-ignore - Field added in pending schema migration
                            isPremium: true,
                            // @ts-ignore - Field added in pending schema migration
                            premiumExpiresAt: expiry
                        }
                    });
                } else if (targetRole === "seller") {
                    // Update the user role first
                    await db.user.update({
                        where: { id: userId },
                        data: { role: "seller" }
                    });
                    // Then update all sellers for this user to the new plan
                    await db.seller.updateMany({
                        where: { userId: userId },
                        data: { 
                            // @ts-ignore
                            subscriptionPlan: plan as any,
                            // @ts-ignore
                            planExpiryDate: expiry,
                            status: "active"
                        }
                    });
                }
                
                broadcast({ type: "user_updated", id: userId });
                console.log(`⭐ User ${userId} upgraded/renewed as ${targetRole} (${plan}).`);
            }
        }
    } catch (err) {
        console.error(`❌ Failed to update database for payment ${reference}:`, err);
    }
}

async function handleTransferSuccess(data: any) {
    const { reference, amount, recipient } = data;
    console.log(`💸 Payout Successful [${reference}] - Sent ₦${amount / 100} to ${recipient.name}`);
    
    // Attempt to update matching payout record if reference is known
    try {
        const payout = await db.payout.findFirst({
            where: { id: { contains: reference } } // Reference might be part of ID or custom field
        });

        if (payout) {
            await db.payout.update({
                where: { id: payout.id },
                data: { status: "completed" }
            });
            console.log(`✅ Payout ${payout.id} marked as completed.`);
        }
    } catch (err) {
        console.error("❌ Payout update error:", err);
    }
}

async function handleTransferFailed(data: any) {
    const { reference, reason } = data;
    console.error(`🔴 Payout Failed [${reference}]: ${reason}`);
    // Optionally notify admin or seller
}
