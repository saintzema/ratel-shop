import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/jwt";
import { db } from "@/lib/db";

const FB_APP_ID = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID!;

// Build the OAuth redirect URI from the ACTUAL request host so it matches whichever
// domain the seller is on (www.fairprice.ng vs fairprice.ng). Meta requires the
// redirect_uri to byte-match a whitelisted entry, and the same value must be reused
// in the callback's token exchange — deriving both from the request keeps them in sync.
function getRedirectUri(req: NextRequest): string {
    const envUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (envUrl) return `${envUrl.replace(/\/$/, "")}/api/seller/instagram/callback`;
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
    const proto = req.headers.get("x-forwarded-proto") || "https";
    const base = host ? `${proto}://${host}` : "https://www.fairprice.ng";
    return `${base}/api/seller/instagram/callback`;
}

/**
 * GET /api/seller/instagram/auth
 * Generates the Meta OAuth URL and redirects the seller to Facebook Login.
 * The `state` param carries the seller's DB id so the callback can store the token.
 *
 * Scopes requested:
 *  - pages_show_list            : list Facebook Pages the user manages
 *  - instagram_basic            : read IG business account info + media
 *  - instagram_content_publish  : (optional, for future post scheduling)
 */
export async function GET(req: NextRequest) {
    const user = getUserFromRequest(req);
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Resolve the seller record for this user — try userId first, then email as fallback
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
        return NextResponse.json({ error: "No seller account found. Complete seller onboarding first." }, { status: 404 });
    }

    const params = new URLSearchParams({
        client_id: FB_APP_ID,
        redirect_uri: getRedirectUri(req),
        scope: "pages_show_list,instagram_basic",
        response_type: "code",
        state: seller.id,              // verified in callback
        display: "popup",
    });

    const oauthUrl = `https://www.facebook.com/dialog/oauth?${params.toString()}`;

    // If client requests JSON (fetch from browser), return the URL instead of redirecting.
    // This lets the client send the Bearer token via fetch(), then redirect itself.
    const acceptHeader = req.headers.get("accept") || "";
    if (acceptHeader.includes("application/json")) {
        return NextResponse.json({ url: oauthUrl });
    }

    return NextResponse.redirect(oauthUrl);
}
