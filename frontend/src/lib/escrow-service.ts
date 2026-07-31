import { db } from "@/lib/db";
import { buildEmailTemplate } from "@/lib/email-templates";
import { resolveCommissionRate } from "@/lib/commission";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || 're_YxXYZ...');

export class EscrowService {
    /**
     * Releasing funds to a seller after an order is completed/confirmed.
     * This moves the order status to 'released', updates timestamps,
     * creates a payout record, and notifies the parties.
     */
    static async releaseFunds(orderId: string, adminId?: string) {
        console.log(`💸 EscrowService: Releasing funds for order ${orderId}...`);

        const order = await db.order.findUnique({
            where: { id: orderId },
            include: {
                seller: {
                    include: {
                        user: true
                    }
                },
                customer: true,
                product: true
            }
        });

        if (!order) {
            throw new Error(`Order ${orderId} not found`);
        }

        if (order.escrowStatus === "released") {
            console.log(`⚠️ Order ${orderId} already released. Skipping.`);
            return order;
        }

        // 1. Update Order Status
        const updatedOrder = await db.order.update({
            where: { id: orderId },
            data: {
                escrowStatus: "released",
                escrowReleasedAt: new Date(),
                payoutStatus: "payoutable",
                updatedAt: new Date()
            }
        });

        // 2. Create Payout Record
        // Commission rate: the live admin Settings value is authoritative for
        // every seller by default (see resolveCommissionRate) — this used to
        // read the seller's own frozen commissionRate column directly, which
        // an admin changing Settings never actually affected.
        const commissionRate = await resolveCommissionRate(order.seller.commissionRate);
        const payoutAmount = order.amount * (1 - commissionRate / 100);

        // We use the payout-transfer engine or just create a record for admin approval
        await db.payout.create({
            data: {
                sellerId: order.sellerId,
                amount: payoutAmount,
                status: "pending",
                bankName: order.seller.bankName || "Unknown",
                accountNumber: order.seller.accountNumber || "0000000000",
                accountName: order.seller.accountName || order.seller.businessName,
                orderIds: [orderId],
                isAutoPayout: false
            }
        });

        // 3. Notify Seller (Email & In-App)
        const sellerEmail = order.seller.ownerEmail || order.seller.user.email;
        if (sellerEmail) {
            const { subject, html } = buildEmailTemplate("SELLER_PAYOUT_COMPLETED", {
                name: order.seller.businessName,
                amount: payoutAmount,
                orderId: order.id,
                businessName: order.seller.businessName
            });

            if (html) {
                await resend.emails.send({
                    from: '🛍️ FairPrice Shop <hello@fairprice.ng>',
                    to: [sellerEmail],
                    subject: subject || `Funds Released: Order #${order.id.substring(0, 8)}`,
                    html: html
                }).catch(err => console.error("Failed to send seller release email:", err));
            }
        }

        await db.notification.create({
            data: {
                userId: order.seller.userId,
                type: "order",
                message: `Funds for Order #${order.id.substring(0, 8)} (${order.product.name}) have been released and are now payoutable.`,
                link: "/seller/wallet"
            }
        });

        // 4. Notify Buyer (Order Completed)
        if (order.customer.email) {
            const { subject, html } = buildEmailTemplate("ORDER_COMPLETED", {
                name: order.customer.name,
                productName: order.product.name,
                orderId: order.id
            });

            if (html) {
                await resend.emails.send({
                    from: '🛍️ FairPrice Shop <hello@fairprice.ng>',
                    to: [order.customer.email],
                    subject: subject || `Order Completed: #${order.id.substring(0, 8)}`,
                    html: html
                }).catch(err => console.error("Failed to send buyer completion email:", err));
            }
        }

        return updatedOrder;
    }

    /**
     * Scans for orders that have been in 'seller_confirmed' status for > 24 hours
     * without being disputed or released, and automatically releases them.
     */
    static async processAutoReleases() {
        console.log("🔄 EscrowService: Running auto-release worker...");

        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const eligibleOrders = await db.order.findMany({
            where: {
                escrowStatus: "seller_confirmed",
                sellerConfirmedAt: {
                    lte: twentyFourHoursAgo
                },
                status: {
                    not: "cancelled"
                }
            },
            select: { id: true }
        });

        console.log(`📈 Found ${eligibleOrders.length} orders eligible for auto-release.`);

        const results = {
            processed: 0,
            failed: 0,
            ids: [] as string[]
        };

        for (const order of eligibleOrders) {
            try {
                await this.releaseFunds(order.id);
                results.processed++;
                results.ids.push(order.id);
            } catch (err) {
                console.error(`❌ Failed to auto-release order ${order.id}:`, err);
                results.failed++;
            }
        }

        return results;
    }
}
