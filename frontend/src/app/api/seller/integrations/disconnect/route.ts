import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/jwt";
import { db } from "@/lib/db";
import { resolveSellerForUser } from "@/lib/resolve-seller";

export const dynamic = "force-dynamic";

/**
 * POST /api/seller/integrations/disconnect  { provider: "instagram" | "facebook" }
 *
 * Seller-initiated disconnect. Distinct from /instagram/deauthorize, which is
 * the webhook Meta calls when the user revokes access from Instagram's own
 * settings and carries no FairPrice session.
 *
 * Previously the integrations page had no such endpoint: its disconnect button
 * called the same handler as Connect, so tapping it re-ran the OAuth flow and
 * dropped the seller on Instagram's consent screen instead of disconnecting.
 */
export async function POST(req: NextRequest) {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const provider = String(body?.provider || "").toLowerCase();

    const seller = await resolveSellerForUser(user, { id: true });
    if (!seller) return NextResponse.json({ error: "Seller not found" }, { status: 404 });

    let data: Record<string, null | boolean>;
    switch (provider) {
        case "instagram":
            data = { instagramAccessToken: null, instagramUserId: null, instagramUsername: null, instagramTokenExpiry: null };
            break;
        case "facebook":
            data = { facebookPageId: null, facebookPageName: null, facebookPageAccessToken: null };
            break;
        case "whatsapp_direct":
            data = { whatsappDirectDM: false };
            break;
        default:
            return NextResponse.json({ error: "Unsupported provider" }, { status: 400 });
    }

    await db.seller.update({ where: { id: seller.id }, data: data as any });
    return NextResponse.json({ success: true, provider });
}
