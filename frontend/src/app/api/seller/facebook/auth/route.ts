import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/jwt";
import { db } from "@/lib/db";

const FB_APP_ID = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID!;
const API_VERSION = "v21.0";

function getRedirectUri(req: NextRequest): string {
    const envUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (envUrl) return `${envUrl.replace(/\/$/, "")}/api/seller/facebook/callback`;
    const host  = req.headers.get("x-forwarded-host") || req.headers.get("host");
    const proto = req.headers.get("x-forwarded-proto") || "https";
    const base  = host ? `${proto}://${host}` : "https://www.fairprice.ng";
    return `${base}/api/seller/facebook/callback`;
}

/**
 * GET /api/seller/facebook/auth
 * Standard Facebook Login for Business — separate flow/App-ID-usage from
 * Instagram Business Login (that one hits instagram.com; this hits
 * facebook.com and asks for Page permissions, not Instagram ones).
 */
export async function GET(req: NextRequest) {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const seller = await db.seller.findFirst({
        where: { OR: [{ userId: user.userId }, ...(user.email ? [{ ownerEmail: user.email }] : [])] },
        select: { id: true },
    });
    if (!seller) {
        return NextResponse.json({ error: "No seller account found. Complete seller onboarding first." }, { status: 404 });
    }

    const params = new URLSearchParams({
        client_id: FB_APP_ID,
        redirect_uri: getRedirectUri(req),
        response_type: "code",
        scope: [
            "pages_show_list",
            "pages_read_engagement",
            "pages_manage_posts",
        ].join(","),
        state: seller.id, // verified in callback to prevent CSRF
    });

    const oauthUrl = `https://www.facebook.com/${API_VERSION}/dialog/oauth?${params.toString()}`;

    const acceptHeader = req.headers.get("accept") || "";
    if (acceptHeader.includes("application/json")) {
        return NextResponse.json({ url: oauthUrl });
    }
    return NextResponse.redirect(oauthUrl);
}
