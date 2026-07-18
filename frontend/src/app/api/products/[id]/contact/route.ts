import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserFromRequest } from "@/lib/jwt";

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

    return NextResponse.json({
        business_name: product.seller.businessName,
        whatsapp_number: product.seller.whatsappNumber || null,
        phone_number: product.seller.phoneNumber || null,
        verified: product.seller.verified,
    });
}
