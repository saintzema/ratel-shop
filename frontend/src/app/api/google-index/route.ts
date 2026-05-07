import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

/**
 * POST /api/google-index
 * 
 * Submits URLs to Google for indexing via the Indexing API.
 * Also pings Google's sitemap crawler so the updated sitemap.xml is re-crawled.
 * 
 * Body: { urls: string[] } — array of absolute URLs to index.
 * 
 * This is called when:
 *  1. A product is promoted from search cache to the live catalog.
 *  2. The admin triggers a manual re-index from the Catalog dashboard.
 * 
 * If no Google service account credentials are configured, it falls back
 * to a lightweight sitemap ping (no-auth, limited but free).
 */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.fairprice.ng";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const urls: string[] = body.urls || [];
        
        if (urls.length === 0) {
            return NextResponse.json({ error: "No URLs provided" }, { status: 400 });
        }

        const results: { url: string; status: string; error?: string }[] = [];

        // ─── Strategy 1: Google Indexing API (if service account is configured) ───
        const googleServiceAccountKey = process.env.GOOGLE_INDEXING_SERVICE_ACCOUNT_KEY;
        
        if (googleServiceAccountKey) {
            try {
                // The Google Indexing API requires OAuth2 bearer token from a service account.
                // Parse the JSON key, create a JWT, exchange for access token.
                const key = JSON.parse(googleServiceAccountKey);
                const token = await getGoogleAccessToken(key);
                
                if (token) {
                    for (const url of urls) {
                        try {
                            const fullUrl = url.startsWith("http") ? url : `${SITE_URL}${url}`;
                            const res = await fetch("https://indexing.googleapis.com/v3/urlNotifications:publish", {
                                method: "POST",
                                headers: {
                                    "Content-Type": "application/json",
                                    "Authorization": `Bearer ${token}`,
                                },
                                body: JSON.stringify({
                                    url: fullUrl,
                                    type: "URL_UPDATED",
                                }),
                            });
                            
                            if (res.ok) {
                                results.push({ url: fullUrl, status: "indexed" });
                            } else {
                                const errText = await res.text();
                                results.push({ url: fullUrl, status: "failed", error: errText });
                            }
                        } catch (e) {
                            results.push({ url, status: "error", error: String(e) });
                        }
                    }
                }
            } catch (e) {
                console.error("Google Indexing API auth failed:", e);
            }
        }
        
        // ─── Strategy 2: Sitemap Ping (free, no auth required) ───
        // Always ping Google and Bing to re-crawl the sitemap after any catalog changes.
        const sitemapUrl = `${SITE_URL}/sitemap.xml`;
        
        const pingUrls = [
            `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`,
            `https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`,
        ];
        
        for (const pingUrl of pingUrls) {
            try {
                await fetch(pingUrl, { method: "GET" });
            } catch (e) {
                console.warn("Sitemap ping failed for:", pingUrl);
            }
        }

        return NextResponse.json({
            success: true,
            indexed: results.filter(r => r.status === "indexed").length,
            failed: results.filter(r => r.status !== "indexed").length,
            sitemapPinged: true,
            results,
        });
        
    } catch (error) {
        console.error("Google indexing error:", error);
        return NextResponse.json(
            { error: "Indexing failed", details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}

/**
 * Creates a Google OAuth2 access token from a service account JSON key.
 * This is used for the Google Indexing API.
 * If the key is not available, returns null.
 */
async function getGoogleAccessToken(key: any): Promise<string | null> {
    try {
        const now = Math.floor(Date.now() / 1000);
        const header = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" }));
        const payload = btoa(JSON.stringify({
            iss: key.client_email,
            scope: "https://www.googleapis.com/auth/indexing",
            aud: "https://oauth2.googleapis.com/token",
            iat: now,
            exp: now + 3600,
        }));
        
        // For edge/serverless environments without Node crypto, we need the Web Crypto API
        const encoder = new TextEncoder();
        const signingInput = encoder.encode(`${header}.${payload}`);
        
        // Import the RSA private key
        const pemKey = key.private_key
            .replace(/-----BEGIN PRIVATE KEY-----/, "")
            .replace(/-----END PRIVATE KEY-----/, "")
            .replace(/\n/g, "");
        const binaryKey = Uint8Array.from(atob(pemKey), c => c.charCodeAt(0));
        
        const cryptoKey = await crypto.subtle.importKey(
            "pkcs8",
            binaryKey,
            { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
            false,
            ["sign"]
        );
        
        const signature = await crypto.subtle.sign(
            "RSASSA-PKCS1-v1_5",
            cryptoKey,
            signingInput
        );
        
        const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
            .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
        
        const jwt = `${header}.${payload}.${signatureB64}`;
        
        // Exchange JWT for access token
        const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
        });
        
        if (tokenRes.ok) {
            const tokenData = await tokenRes.json();
            return tokenData.access_token;
        }
    } catch (e) {
        console.error("Failed to get Google access token:", e);
    }
    return null;
}
