import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const FB_APP_ID = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID!;
const FB_APP_SECRET = process.env.FACEBOOK_APP_SECRET!;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://fairprice.ng";
const REDIRECT_URI = `${APP_URL}/api/seller/instagram/callback`;

/**
 * GET /api/seller/instagram/callback
 * Meta redirects here after the seller approves Facebook Login.
 *
 * Steps:
 *  1. Exchange `code` for a short-lived user access token
 *  2. Extend to a long-lived token (60-day expiry)
 *  3. Get the seller's Facebook Pages
 *  4. For each page, check for a connected Instagram Business Account
 *  5. Store the token + IG user ID on the Seller record
 *  6. Redirect back to the seller dashboard
 */
export async function GET(req: NextRequest) {
    const code = req.nextUrl.searchParams.get("code");
    const state = req.nextUrl.searchParams.get("state");  // sellerId
    const error = req.nextUrl.searchParams.get("error");

    const dashboardUrl = `${APP_URL}/seller/integrations/meta`;

    if (error || !code || !state) {
        console.error("[IG callback] OAuth denied or missing params:", { error, code: !!code, state });
        return NextResponse.redirect(`${dashboardUrl}?ig_error=denied`);
    }

    try {
        // 1. Exchange code for short-lived token
        const tokenRes = await fetch(
            `https://graph.facebook.com/v20.0/oauth/access_token?` +
            new URLSearchParams({
                client_id: FB_APP_ID,
                client_secret: FB_APP_SECRET,
                redirect_uri: REDIRECT_URI,
                code,
            })
        );
        const tokenData = await tokenRes.json();
        if (!tokenData.access_token) {
            console.error("[IG callback] Token exchange failed:", tokenData);
            return NextResponse.redirect(`${dashboardUrl}?ig_error=token_exchange`);
        }

        // 2. Exchange for long-lived token (60-day)
        const longTokenRes = await fetch(
            `https://graph.facebook.com/v20.0/oauth/access_token?` +
            new URLSearchParams({
                grant_type: "fb_exchange_token",
                client_id: FB_APP_ID,
                client_secret: FB_APP_SECRET,
                fb_exchange_token: tokenData.access_token,
            })
        );
        const longTokenData = await longTokenRes.json();
        const accessToken = longTokenData.access_token || tokenData.access_token;
        const expiresIn = longTokenData.expires_in || 5183944; // ~60 days default

        // 3. Get Facebook Pages managed by this user
        const pagesRes = await fetch(
            `https://graph.facebook.com/v20.0/me/accounts?fields=id,name,instagram_business_account&access_token=${accessToken}`
        );
        const pagesData = await pagesRes.json();
        const pages: any[] = pagesData.data || [];

        // 4. Find first page with a connected Instagram Business Account
        let igUserId: string | null = null;
        let igUsername: string | null = null;

        for (const page of pages) {
            const igAccountId = page.instagram_business_account?.id;
            if (igAccountId) {
                // Fetch username
                const igInfoRes = await fetch(
                    `https://graph.facebook.com/v20.0/${igAccountId}?fields=id,username&access_token=${accessToken}`
                );
                const igInfo = await igInfoRes.json();
                igUserId = igInfo.id || igAccountId;
                igUsername = igInfo.username || null;
                break;
            }
        }

        if (!igUserId) {
            // No IG Business account found — save token anyway so they can retry or connect later
            console.warn("[IG callback] No Instagram Business account found for seller:", state);
            await db.seller.update({
                where: { id: state },
                data: {
                    instagramAccessToken: accessToken,
                    instagramTokenExpiry: new Date(Date.now() + expiresIn * 1000),
                } as any,
            });
            return NextResponse.redirect(`${dashboardUrl}?ig_error=no_ig_account`);
        }

        // 5. Store everything on the Seller record
        await db.seller.update({
            where: { id: state },
            data: {
                instagramAccessToken: accessToken,
                instagramUserId: igUserId,
                instagramUsername: igUsername,
                instagramTokenExpiry: new Date(Date.now() + expiresIn * 1000),
            } as any,
        });

        console.log(`[IG callback] Connected IG @${igUsername} (${igUserId}) to seller ${state}`);
        return NextResponse.redirect(`${dashboardUrl}?ig_connected=1&ig_user=${encodeURIComponent(igUsername || igUserId)}`);

    } catch (err: any) {
        console.error("[IG callback] Unexpected error:", err.message);
        return NextResponse.redirect(`${dashboardUrl}?ig_error=server`);
    }
}
