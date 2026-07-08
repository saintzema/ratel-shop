import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { notifyAdmins } from "@/lib/admin-notify";
import { broadcast } from "@/lib/realtime-service";
import { ADMIN_EMAILS } from "@/lib/constants";

export const dynamic = "force-dynamic";

/**
 * POST /api/whatsapp/order-intent
 *
 * Fired (best-effort, fire-and-forget) whenever a buyer clicks "Order via WhatsApp"
 * on a product page. The WhatsApp message itself already went straight to the
 * seller's own number when they have one on file, but FairPrice still needs
 * visibility to follow up and make sure the order actually gets delivered — so
 * this always alerts admin, and also alerts the seller's own dashboard when the
 * order was routed to them directly.
 */
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { product_id, product_name, product_url, price, seller_id, routed_to_seller } = body;

        const seller = seller_id
            ? await db.seller.findUnique({ where: { id: seller_id }, select: { id: true, userId: true, businessName: true } })
            : null;

        const sellerLabel = seller?.businessName || seller_id || "Unknown seller";
        const priceLabel = typeof price === "number" ? `₦${price.toLocaleString()}` : String(price || "");
        const message = `📦 WhatsApp order intent: *${product_name || "a product"}* (${priceLabel}) from ${sellerLabel}${routed_to_seller ? " — sent directly to the seller's WhatsApp" : " — sent to FairPrice's WhatsApp (seller has no WhatsApp on file)"}.`;

        await notifyAdmins(message, { type: "order", link: product_id ? `/product/${product_id}` : "/admin/whatsapp" });

        if (seller?.userId) {
            try {
                await db.notification.create({
                    data: {
                        userId: seller.userId,
                        type: "order",
                        message: routed_to_seller
                            ? `💬 A buyer just messaged you on WhatsApp about *${product_name || "your product"}* (${priceLabel}). Reply promptly to close the sale!`
                            : `💬 A buyer wanted to order *${product_name || "your product"}* (${priceLabel}) via WhatsApp — this went to FairPrice for now since you haven't activated Ziva WhatsApp yet. Set it up in Settings to receive these directly.`,
                        link: routed_to_seller ? "/seller/dashboard" : "/seller/settings",
                        read: false,
                    },
                });
                broadcast({ type: "notification", userId: seller.userId });
            } catch { /* non-critical */ }
        }

        const site = process.env.FAIRPRICE_URL || "https://www.fairprice.ng";
        for (const adminEmail of ADMIN_EMAILS) {
            fetch(`${site}/api/email`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    to: adminEmail,
                    type: "SYSTEM_ALERT",
                    payload: {
                        subject: `WhatsApp order intent — ${product_name || "product"} (${sellerLabel})`,
                        title: "Buyer clicked Order via WhatsApp",
                        message,
                        data: { productId: product_id, sellerId: seller_id, productUrl: product_url },
                        dashboardUrl: product_id ? `${site}/admin/products` : `${site}/admin/whatsapp`,
                    },
                }),
            }).catch(() => {});
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("[whatsapp/order-intent] error:", error);
        return NextResponse.json({ success: false }, { status: 500 });
    }
}
