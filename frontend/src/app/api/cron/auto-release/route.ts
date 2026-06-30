import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { buildEmailTemplate } from "@/lib/email-templates";
import { Resend } from "resend";
import { ADMIN_EMAILS } from "@/lib/constants";
import { notifyAdmins } from "@/lib/admin-notify";

const resend = new Resend(process.env.RESEND_API_KEY || 're_YxXYZ...');

/**
 * Automated Escrow Release Cron Job
 * Frequency: Every 1 hour (configured in vercel.json)
 * 
 * Logic:
 * 1. Find orders delivered > 24 hours ago that haven't been released.
 * 2. Update status to 'released'.
 * 3. Create a Payout record for the seller.
 * 4. Notify seller via Email & In-App notification.
 * 5. Notify Admins of the batch processing result.
 */
export async function GET(request: Request) {
    try {
        // 1. Security Check (Vercel Cron Secret)
        const authHeader = request.headers.get('authorization');
        if (process.env.NODE_ENV === 'production') {
            if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
                return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
            }
        }

        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        // 2. Find eligible orders
        const eligibleOrders = await db.order.findMany({
            where: {
                status: "delivered",
                escrowStatus: {
                    in: ["held", "seller_confirmed", "buyer_confirmed", "auto_release_eligible"]
                },
                deliveredAt: {
                    lte: twentyFourHoursAgo
                }
            },
            include: {
                seller: {
                    include: {
                        user: true
                    }
                },
                product: true
            }
        });

        if (eligibleOrders.length === 0) {
            return NextResponse.json({ 
                success: true, 
                processed: 0, 
                message: "No orders eligible for auto-release at this time." 
            });
        }

        const results: string[] = [];
        const errors: { id: string; error: string }[] = [];

        // 3. Process each order
        for (const order of eligibleOrders) {
            try {
                await db.$transaction(async (tx) => {
                    // Update Order
                    await tx.order.update({
                        where: { id: order.id },
                        data: {
                            escrowStatus: "released",
                            escrowReleasedAt: new Date(),
                            payoutStatus: "payoutable"
                        }
                    });

                    // Create Payout Record (if not already exists for this order)
                    const existingPayout = await tx.payout.findFirst({
                        where: {
                            orderIds: {
                                has: order.id
                            }
                        }
                    });

                    if (!existingPayout) {
                        await tx.payout.create({
                            data: {
                                sellerId: order.sellerId,
                                amount: order.amount,
                                status: "pending",
                                bankName: order.seller.bankName || "Saved Bank",
                                accountNumber: order.seller.accountNumber || "0000",
                                accountName: order.seller.accountName || order.seller.businessName,
                                orderIds: [order.id],
                                isAutoPayout: false
                            }
                        });
                    }

                    // Create Notification
                    await tx.notification.create({
                        data: {
                            userId: order.seller.userId,
                            type: "order",
                            message: `💰 Funds Released: ₦${order.amount.toLocaleString()} for "${order.product?.name || 'Order #' + order.id.substring(0,8)}" has been automatically released after 24 hours.`,
                            link: "/seller/wallet"
                        }
                    });
                });

                // 4. Send Email (Outside transaction to prevent blocking)
                const sellerEmail = order.seller.ownerEmail || order.seller.user?.email || `seller_${order.sellerId}@fairprice.ng`;
                const { subject, html } = buildEmailTemplate("ESCROW_RELEASED", {
                    sellerName: order.seller.businessName,
                    orderId: order.id,
                    productName: order.product?.name || "Product",
                    amount: order.amount
                });

                if (html) {
                    await resend.emails.send({
                        from: '🛍️ FairPrice Shop <hello@fairprice.ng>',
                        to: [sellerEmail],
                        subject: subject,
                        html: html
                    }).catch(e => console.error(`Email failed for order ${order.id}:`, e));
                }

                results.push(order.id);
            } catch (err: any) {
                console.error(`Failed to process auto-release for order ${order.id}:`, err);
                errors.push({ id: order.id, error: err.message });
            }
        }

        // 5. Log activity to Admins — in-app (bell) + email.
        if (results.length > 0) {
            const totalReleased = eligibleOrders
                .filter(o => results.includes(o.id))
                .reduce((sum, o) => sum + (o.amount || 0), 0);
            await notifyAdmins(
                `🤖 Escrow auto-release: ${results.length} order(s) released, ₦${totalReleased.toLocaleString()} now payoutable${errors.length ? ` · ${errors.length} error(s)` : ""}.`,
                { type: "order", link: "/admin/escrow" }
            );

            await resend.emails.send({
                from: '🤖 FairPrice System <system@fairprice.ng>',
                to: ADMIN_EMAILS,
                subject: `[CRON] Escrow Auto-Release: ${results.length} processed`,
                html: `
                    <h2>Auto-Release Worker Summary</h2>
                    <p>Processed ${results.length} orders successfully.</p>
                    <ul>
                        ${results.map(id => `<li>Order #${id}</li>`).join('')}
                    </ul>
                    ${errors.length > 0 ? `
                        <h3 style="color: red;">Errors:</h3>
                        <ul>
                            ${errors.map(e => `<li>Order #${e.id}: ${e.error}</li>`).join('')}
                        </ul>
                    ` : ''}
                `
            }).catch(() => {});
        }

        return NextResponse.json({
            success: true,
            processed: results.length,
            orderIds: results,
            errors: errors.length > 0 ? errors : undefined
        });

    } catch (error: any) {
        console.error("Critical Cron Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
