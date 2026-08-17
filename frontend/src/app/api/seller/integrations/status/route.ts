import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/jwt";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/seller/integrations/status
 *
 * The single source of truth for "is this integration connected?".
 *
 * The integrations page and the Meta Business Suite panel used to derive this
 * from DataSyncService.getCurrentSeller() — the localStorage snapshot. OAuth
 * tokens are written server-side by the callback and never make it into that
 * snapshot, so a seller who had just connected Instagram (and could already
 * publish to it) still saw "Not Connected" and a "Connect App" button.
 */
export async function GET(req: NextRequest) {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const seller = await db.seller.findFirst({
        where: { OR: [{ userId: user.userId }, ...(user.email ? [{ ownerEmail: user.email }] : [])] },
        select: {
            id: true,
            bankName: true,
            accountNumber: true,
            storeUrl: true,
            whatsappNumber: true,
            whatsappEnabled: true,
            whatsappDirectDM: true,
            instagramAccessToken: true,
            instagramUsername: true,
            instagramTokenExpiry: true,
            facebookPageId: true,
            facebookPageName: true,
        },
    });

    if (!seller) return NextResponse.json({ error: "Seller not found" }, { status: 404 });

    // A token that has already expired is not a working connection — say so
    // rather than showing "Connected" on something that will fail on publish.
    const igExpired = !!seller.instagramTokenExpiry && seller.instagramTokenExpiry.getTime() < Date.now();

    return NextResponse.json({
        sellerId: seller.id,
        integrations: {
            paystack: { connected: !!(seller.bankName && seller.accountNumber), detail: seller.bankName || null },
            instagram: {
                connected: !!seller.instagramAccessToken && !igExpired,
                expired: igExpired,
                detail: seller.instagramUsername ? `@${seller.instagramUsername}` : null,
            },
            facebook: { connected: !!seller.facebookPageId, detail: seller.facebookPageName || null },
            whatsapp: { connected: !!seller.whatsappNumber, detail: seller.whatsappNumber || null },
            whatsapp_direct: { connected: !!seller.whatsappDirectDM, detail: null },
            custom_domain: { connected: !!seller.storeUrl, detail: seller.storeUrl || null },
        },
    });
}
