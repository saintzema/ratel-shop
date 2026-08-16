import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { facebookRedirectUri, appBaseUrl } from "@/lib/meta-oauth-redirect";

const FB_APP_ID = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID!;
const FB_APP_SECRET = process.env.FACEBOOK_APP_SECRET!;
const API_VERSION = "v21.0";

// Must resolve to the SAME string the auth route sent, or Facebook rejects the
// code→token exchange even after the seller consents.

/**
 * GET /api/seller/facebook/callback
 * Exchanges the OAuth code for a user token, then lists the Pages that user
 * manages and connects the first one. A seller managing multiple Pages only
 * gets the first for now — picking among them is a real gap, not silently
 * "good enough forever," just out of scope for this pass.
 */
export async function GET(req: NextRequest) {
    const code  = req.nextUrl.searchParams.get("code");
    const state = req.nextUrl.searchParams.get("state");
    const error = req.nextUrl.searchParams.get("error");

    const BASE_URL      = appBaseUrl(req);
    const REDIRECT_URI  = facebookRedirectUri(req);
    const DASHBOARD_URL = `${BASE_URL}/seller/dashboard`;

    if (error || !code || !state) {
        console.error("[FB callback] OAuth denied:", { error, hasCode: !!code, state });
        return NextResponse.redirect(`${DASHBOARD_URL}?fb_error=denied`);
    }

    try {
        // 1. Exchange code for a user access token
        const tokenRes = await fetch(
            `https://graph.facebook.com/${API_VERSION}/oauth/access_token?` +
            new URLSearchParams({
                client_id: FB_APP_ID,
                client_secret: FB_APP_SECRET,
                redirect_uri: REDIRECT_URI,
                code,
            })
        );
        const tokenData = await tokenRes.json();
        if (!tokenData.access_token) {
            console.error("[FB callback] Token exchange failed:", tokenData);
            return NextResponse.redirect(`${DASHBOARD_URL}?fb_error=token_exchange`);
        }
        const userToken = tokenData.access_token;

        // 2. List the Pages this user manages — each entry already includes its
        // own long-lived Page access token (doesn't need separate exchange).
        const pagesRes = await fetch(`https://graph.facebook.com/${API_VERSION}/me/accounts?access_token=${userToken}`);
        const pagesData = await pagesRes.json();
        const page = pagesData?.data?.[0];

        if (!page?.id || !page?.access_token) {
            console.error(`[FB callback] No manageable Page found for seller ${state}:`, pagesData);
            return NextResponse.redirect(`${DASHBOARD_URL}?fb_error=no_page`);
        }

        await db.seller.update({
            where: { id: state },
            data: {
                facebookPageId: page.id,
                facebookPageName: page.name || null,
                facebookPageAccessToken: page.access_token,
            },
        });

        console.log(`[FB callback] Connected Page "${page.name}" to seller ${state}`);
        return NextResponse.redirect(`${DASHBOARD_URL}?fb_connected=1&fb_page=${encodeURIComponent(page.name || page.id)}`);
    } catch (err: any) {
        console.error("[FB callback] Error:", err.message);
        return NextResponse.redirect(`${DASHBOARD_URL}?fb_error=server_error`);
    }
}
