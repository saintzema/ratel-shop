import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserFromRequest } from "@/lib/jwt";
import { notifyAdmins } from "@/lib/admin-notify";

/**
 * GET /api/products/:id/contact
 *
 * Reveals the selling seller's WhatsApp/phone contact for a signed-in buyer only.
 * Seller owner contact info is intentionally excluded from the public product/seller
 * payloads (see /api/sellers/[id]) to stop scraping by unauthenticated visitors — this
 * endpoint is the one deliberate, login-gated exception, backing the PDP's
 * "Show Contact" button.
 */
export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const requester = getUserFromRequest(req);
    if (!requester) {
        return NextResponse.json({ error: "Sign in to view seller contact info" }, { status: 401 });
    }

    const { id } = await params;
    const product = await db.product.findUnique({
        where: { id },
        select: {
            name: true,
            seller: {
                select: {
                    businessName: true,
                    whatsappNumber: true,
                    phoneNumber: true,
                    verified: true,
                },
            },
        },
    });

    if (!product?.seller) {
        return NextResponse.json({ error: "Product or seller not found" }, { status: 404 });
    }

    // A buyer who reveals a seller's direct contact may go on to complete the deal
    // entirely off-platform — that transaction never creates an Order row here, so
    // there's nothing to retroactively tag "off-platform" in order details. This is
    // the one traceable signal that actually exists: log it so admin can see when a
    // buyer went this route, distinct from a real on-platform order/checkout.
    notifyAdmins(
        `👀 Buyer revealed contact for *${product.name}* — may be completing this deal off-platform.`,
        { type: "system", link: `/product/${id}` }
    ).catch(() => { /* non-critical */ });

    return NextResponse.json({
        business_name: product.seller.businessName,
        whatsapp_number: product.seller.whatsappNumber || null,
        phone_number: product.seller.phoneNumber || null,
        verified: product.seller.verified,
    });
}
