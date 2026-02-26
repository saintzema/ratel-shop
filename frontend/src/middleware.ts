import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
    const url = request.nextUrl;
    const hostname = request.headers.get("host") || "";

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

    // This is a basic example. You'll need to adjust based on your actual production domain
    let subdomain = "";

    if (isLocalhost) {
        const parts = hostWithoutPort.split('.');
        if (parts.length >= 2 && parts[0] !== 'www') {
            subdomain = parts[0];
        }
    } else {
        // Handling production domains (e.g., store.fairprice.ng)
        const mainDomainChunks = 2; // e.g. fairprice.ng
        const parts = hostWithoutPort.split('.');
        if (parts.length > mainDomainChunks && parts[0] !== 'www') {
            // This assumes the subdomain is always the first part.
            // e.g. "seller1.fairprice.ng" -> "seller1"
            subdomain = parts[0];
        }
    }


    // If there's a valid subdomain and it's not the main app or www
    if (subdomain && subdomain !== "www") {
        // Rewrite to the store dynamic route
        // e.g., seller1.localhost:3000/about -> /store/seller1/about
        return NextResponse.rewrite(new URL(`/store/${subdomain}${url.pathname}${url.search}`, request.url));
    }

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
