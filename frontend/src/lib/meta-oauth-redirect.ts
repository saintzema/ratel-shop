/**
 * Canonical Meta OAuth redirect URIs.
 *
 * Facebook enforces an EXACT string match against the app's "Valid OAuth
 * Redirect URIs" list (Strict Mode). Deriving this from request headers or from
 * NEXT_PUBLIC_APP_URL means the value can silently differ from what's
 * whitelisted — a non-`www` host, a `*.vercel.app` preview domain, or an env var
 * pointing somewhere else all produce "URL Blocked / redirect URI is not
 * whitelisted", which is exactly the failure seen in production.
 *
 * So: pin it. In production this is always the canonical apex-www origin,
 * regardless of which hostname served the request. Local development still
 * derives from the request so the flow is testable against localhost.
 *
 * CRITICAL: the auth route and the callback route must send the SAME string.
 * Facebook re-validates redirect_uri during the code→token exchange, so a
 * mismatch between the two fails the exchange even after the user consents.
 * Both import from here for that reason — do not inline this anywhere.
 */

/** Must match an entry in the Meta app's Valid OAuth Redirect URIs, character for character. */
export const CANONICAL_ORIGIN = "https://www.fairprice.ng";

function originFor(req: Request): string {
    // Only fall back to the request host outside production, so a preview
    // deployment or a bare-domain hit can never produce an unwhitelisted URI.
    if (process.env.NODE_ENV === "production") return CANONICAL_ORIGIN;

    const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
    if (!host) return CANONICAL_ORIGIN;
    const proto = host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https";
    return `${proto}://${host}`;
}

export function facebookRedirectUri(req: Request): string {
    return `${originFor(req)}/api/seller/facebook/callback`;
}

export function instagramRedirectUri(req: Request): string {
    return `${originFor(req)}/api/seller/instagram/callback`;
}

/** Where to send the seller back to once the OAuth round-trip finishes. */
export function appBaseUrl(req: Request): string {
    return originFor(req);
}
