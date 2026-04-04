import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
    const url = request.nextUrl;
    const hostname = request.headers.get("host") || "";

    // ─── Geo-Location Detection (for Diaspora Currency Banner) ───
    const city = request.headers.get('x-vercel-ip-city') || '';
    const country = request.headers.get('x-vercel-ip-country') || '';
    const latitude = request.headers.get('x-vercel-ip-latitude') || '';
    const longitude = request.headers.get('x-vercel-ip-longitude') || '';

    // We'll set a cookie so the client-side CurrencyBanner can read location
    let geoResponse: NextResponse | null = null;
    if (city && country) {
        // Will be applied to the final response below
        geoResponse = NextResponse.next();
        geoResponse.cookies.set('fp_location', JSON.stringify({ city, country, latitude, longitude }), {
            path: '/',
            maxAge: 60 * 60 * 24 * 7,
            sameSite: 'lax',
        });
    }

    // Define allowed domains (including localhost for development)
    // In production, you would add your actual domain(s) here, e.g., 'fairprice.ng', 'fairprice.ai'
    const currentHost =
        process.env.NODE_ENV === "production" && process.env.VERCEL === "1"
            ? hostname.replace(`.vercel.app`, "")
            : hostname.replace(`.localhost:3000`, "");

    // Remove port if present
    const hostMatch = hostname.match(/^([^:]+)(:\d+)?$/);
    const hostWithoutPort = hostMatch ? hostMatch[1] : hostname;

    // We are checking if the current host is a subdomain
    // If it's localhost or the main domain, subdomain will be empty or www
    const isLocalhost = hostWithoutPort === "localhost" || hostWithoutPort.endsWith(".local");
    const isIpAddress = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(hostWithoutPort);

    // This is a basic example. You'll need to adjust based on your actual production domain
    let subdomain = "";

    if (isIpAddress) {
        // Do nothing, IP addresses cannot have subdomains
        subdomain = "";
    } else if (isLocalhost) {
        const parts = hostWithoutPort.split('.');
        if (parts.length >= 2 && parts[0] !== 'www') {
            subdomain = parts[0];
        }
    } else {
        // Skip Vercel deployment URLs entirely — they are NOT subdomains
        const isVercel = hostWithoutPort.endsWith('.vercel.app');
        if (!isVercel) {
            // Handling production domains (e.g., store.fairprice.ng)
            const mainDomainChunks = 2; // e.g. fairprice.ng
            const parts = hostWithoutPort.split('.');
            if (parts.length > mainDomainChunks && parts[0] !== 'www') {
                // This assumes the subdomain is always the first part.
                // e.g. "seller1.fairprice.ng" -> "seller1"
                subdomain = parts[0];
            }
        }
    }

    // If there's a valid subdomain and it's not the main app or www
    if (subdomain && subdomain !== "www") {
        // Rewrite to the store dynamic route
        // e.g., seller1.localhost:3000/about -> /store/seller1/about
        const rewriteResponse = NextResponse.rewrite(new URL(`/store/${subdomain}${url.pathname}${url.search}`, request.url));
        // Attach geo cookie if available
        if (city && country) {
            rewriteResponse.cookies.set('fp_location', JSON.stringify({ city, country, latitude, longitude }), {
                path: '/', maxAge: 60 * 60 * 24 * 7, sameSite: 'lax',
            });
        }
        return rewriteResponse;
    }

    // Default: pass through with geo cookie if available
    if (geoResponse) return geoResponse;
    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico, sitemap.xml, robots.txt (metadata files)
         */
        "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
    ],
};
