import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserFromRequest } from "@/lib/jwt";
import { buildEmailTemplate } from "@/lib/email-templates";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || 're_YxXYZ...');

export async function POST(request: Request) {
    try {
        const user = getUserFromRequest(request);
        if (!user || user.role !== "admin") {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        // Find orders that are delivered, not yet released, and were delivered > 24h ago
        const eligibleOrders = await db.order.findMany({
            where: {
                status: "delivered",
                escrowStatus: "held",
                deliveredAt: {
                    lte: twentyFourHoursAgo
                },
                payoutStatus: "none"
            },
            include: {
                seller: true,
                customer: true
            }
        });

        if (eligibleOrders.length === 0) {
            return NextResponse.json({ success: true, count: 0, message: "No orders eligible for auto-release" });
        }

        const results = [];

        for (const order of eligibleOrders) {
            // Update order status to auto_release_eligible (or just release it)
            // The user wants it to "auto resolve into payoutable"
            await db.order.update({
                where: { id: order.id },
                data: { 
                    escrowStatus: "released",
                    payoutStatus: "payoutable" // Custom status indicating it's ready for withdrawal
                }
            });

            // Notify Seller
            const sellerEmail = order.seller.ownerEmail || `seller_${order.sellerId}@fairprice.ng`;
            const { subject, html } = buildEmailTemplate("SELLER_PAYOUT_COMPLETED", {
                name: order.seller.businessName,
                amount: order.amount * 0.975, // Assuming 2.5% commission
                orderId: order.id,
                businessName: order.seller.businessName
            });

            if (html) {
                await resend.emails.send({
                    from: '🛍️ FairPrice Shop <hello@fairprice.ng>',
                    to: [sellerEmail],
                    subject: `Funds Released: Order #${order.id.substring(0, 8)} is now payoutable`,
                    html: html.replace("successfully processed", "automatically released and is now payoutable")
                });
            }

            // Internal notification
            await db.notification.create({
                data: {
                    userId: order.seller.userId,
                    type: "order",
                    message: `Funds for Order #${order.id.substring(0, 8)} have been automatically released after 24 hours.`,
                    link: "/seller/dashboard/payouts"
                }
            });

            results.push(order.id);
        }

        return NextResponse.json({ 
            success: true, 
            count: results.length, 
            orderIds: results 
        });

    } catch (error: any) {
        console.error("Escrow Reconcile Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
