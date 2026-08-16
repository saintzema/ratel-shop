import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/jwt";
import { db } from "@/lib/db";
import { instagramRedirectUri } from "@/lib/meta-oauth-redirect";

// Instagram Business Login uses a separate App ID from the Facebook App ID.
// Found in: Meta Developer Console → Your App → Use Cases → Instagram API → Instagram app ID
const IG_APP_ID = process.env.INSTAGRAM_APP_ID || process.env.NEXT_PUBLIC_FACEBOOK_APP_ID!;

// Pinned in production — see lib/meta-oauth-redirect.ts. Header-derived values
// break on preview deployments and bare-domain hits.

/**
 * GET /api/seller/instagram/auth
 *
 * Generates an Instagram Business Login OAuth URL and returns it to the client.
 * Uses the new Instagram Business Login flow (not the deprecated Basic Display API
 * which was shut down on December 4, 2024).
 *
 * OAuth endpoint : https://www.instagram.com/oauth/authorize
 * Scopes         : instagram_business_basic (read profile + media)
 *                  instagram_business_manage_comments (optional)
 *                  instagram_business_manage_messages (optional)
 */
export async function GET(req: NextRequest) {
    const user = getUserFromRequest(req);
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Resolve seller — try userId first, then ownerEmail fallback
    const seller = await db.seller.findFirst({
        where: {
            OR: [
                { userId: user.userId },
                ...(user.email ? [{ ownerEmail: user.email }] : []),
            ],
        },
        select: { id: true },
    });

    if (!seller) {
        return NextResponse.json(
            { error: "No seller account found. Complete seller onboarding first." },
            { status: 404 }
        );
    }

    const params = new URLSearchParams({
        client_id:     IG_APP_ID,
        redirect_uri:  instagramRedirectUri(req),
        response_type: "code",
        scope: [
            "instagram_business_basic",
            "instagram_business_manage_messages",
            "instagram_business_manage_comments",
        ].join(","),
        state: seller.id, // verified in callback to prevent CSRF
    });

    const oauthUrl = `https://www.instagram.com/oauth/authorize?${params.toString()}`;

    // Client sends the Bearer token via fetch() then redirects itself to the OAuth URL.
    const acceptHeader = req.headers.get("accept") || "";
    if (acceptHeader.includes("application/json")) {
        return NextResponse.json({ url: oauthUrl });
    }
    return NextResponse.redirect(oauthUrl);
}
