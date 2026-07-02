import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const IG_APP_ID     = process.env.INSTAGRAM_APP_ID || process.env.NEXT_PUBLIC_FACEBOOK_APP_ID!;
const IG_APP_SECRET = process.env.INSTAGRAM_APP_SECRET || process.env.FACEBOOK_APP_SECRET!;

function getBaseUrl(req: NextRequest): string {
    const envUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (envUrl) return envUrl.replace(/\/$/, "");
    const host  = req.headers.get("x-forwarded-host") || req.headers.get("host");
    const proto = req.headers.get("x-forwarded-proto") || "https";
    return host ? `${proto}://${host}` : "https://www.fairprice.ng";
}

/**
 * GET /api/seller/instagram/callback
 * Instagram Business Login OAuth callback (replaces deprecated Basic Display).
 * Token exchange: api.instagram.com → graph.instagram.com (NOT graph.facebook.com).
 */
export async function GET(req: NextRequest) {
    const code  = req.nextUrl.searchParams.get("code");
    const state = req.nextUrl.searchParams.get("state");
    const error = req.nextUrl.searchParams.get("error");

    const BASE_URL      = getBaseUrl(req);
    const REDIRECT_URI  = `${BASE_URL}/api/seller/instagram/callback`;
    const DASHBOARD_URL = `${BASE_URL}/seller/dashboard`;

    if (error || !code || !state) {
        console.error("[IG callback] OAuth denied:", { error, hasCode: !!code, state });
        return NextResponse.redirect(`${DASHBOARD_URL}?ig_error=denied`);
    }

    try {
        // 1. Exchange code for short-lived token
        const tokenRes = await fetch("https://api.instagram.com/oauth/access_token", {
            method:  "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                client_id:     IG_APP_ID,
                client_secret: IG_APP_SECRET,
                grant_type:    "authorization_code",
                redirect_uri:  REDIRECT_URI,
                code,
            }).toString(),
        });
        const tokenData = await tokenRes.json();
        if (!tokenData.access_token) {
            console.error("[IG callback] Token exchange failed:", tokenData);
            return NextResponse.redirect(`${DASHBOARD_URL}?ig_error=token_exchange`);
        }
        const shortToken = tokenData.access_token;
        const igUserId   = String(tokenData.user_id || "");

        // 2. Upgrade to long-lived token (~60 days)
        const longRes = await fetch(
            `https://graph.instagram.com/access_token?` +
            new URLSearchParams({
                grant_type:    "ig_exchange_token",
                client_secret: IG_APP_SECRET,
                access_token:  shortToken,
            })
        );
        const longData  = await longRes.json();
        const accessToken = longData.access_token || shortToken;
        const expiresIn   = longData.expires_in   || 5_183_944;

        // 3. Fetch username
        const meRes  = await fetch(`https://graph.instagram.com/me?fields=id,username&access_token=${accessToken}`);
        const meData = await meRes.json();
        if (meData.error || !meRes.ok) {
            console.error("[IG callback] /me fetch failed:", meData.error || meData);
        }
        const igUsername = meData.username || null;
        const resolvedUserId = igUserId || meData.id || null;

        // A connection without a resolved IG user id is useless — /api/seller/instagram/posts
        // requires it and will just report "not connected" on the very next load, which looks
        // to the seller like the connection silently failed (brief spinner then reverts to the
        // Connect card). Surface it as an explicit error instead of a misleading success redirect.
        if (!resolvedUserId) {
            console.error(`[IG callback] No Instagram user id resolved for seller ${state} — token_user_id="${igUserId}", meData=`, meData);
            return NextResponse.redirect(`${DASHBOARD_URL}?ig_error=incomplete_profile`);
        }

        // 4. Persist on Seller record
        await db.seller.update({
            where: { id: state },
            data: {
                instagramAccessToken: accessToken,
                instagramUserId:      resolvedUserId,
                instagramUsername:    igUsername,
                instagramTokenExpiry: new Date(Date.now() + expiresIn * 1000),
            } as any,
        });

        console.log(`[IG callback] Connected @${igUsername || resolvedUserId} to seller ${state}`);
        return NextResponse.redirect(
            `${DASHBOARD_URL}?ig_connected=1&ig_user=${encodeURIComponent(igUsername || resolvedUserId)}`
        );
    } catch (err: any) {
        console.error("[IG callback] Error:", err.message);
        return NextResponse.redirect(`${DASHBOARD_URL}?ig_error=server_error`);
    }
}
