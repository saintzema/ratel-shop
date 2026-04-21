import { NextResponse } from "next/server";

// Cache at the edge for 30 days — images almost never change
export const dynamic = 'force-dynamic';

/**
 * Lightweight image proxy.
 *
 * Strategy (in order):
 *  1. Grounding / expired Google URLs  → placeholder (immediate, 0 CPU)
 *  2. ?thumb=1 (NavSearch thumbnails)  → 302 redirect to source (0 CPU, browser caches)
 *  3. External HTTP URLs               → stream raw bytes, set long cache headers
 *
 * Sharp is intentionally NOT used here. Processing every external image through
 * Sharp costs ~50-200 MB RAM and 100-400ms CPU per call. At 711K+ invocations this
 * was the primary cause of Vercel CPU/Memory overage. Browsers handle decoding fine.
 * GMC can crawl the original CDN URLs directly (they don't require JPEG conversion).
 */

const GROUNDING_PATTERNS = [
    'googleusercontent.com/grounding',
    'vertexaisearch.cloud.google.com',
    'grounding-api-redirect',
    'googleapis.com/download',
];

const PLACEHOLDER = '/assets/images/placeholder.png';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const imageUrl = searchParams.get("url");
    const isThumb = searchParams.get("thumb") === "1";

    if (!imageUrl) {
        return new NextResponse("Missing URL", { status: 400 });
    }

    // Already a local asset — redirect immediately
    if (imageUrl.startsWith('/')) {
        return NextResponse.redirect(new URL(imageUrl, req.url));
    }

    const lower = imageUrl.toLowerCase();

    // Expired Grounding URLs — instant placeholder, no network call
    if (GROUNDING_PATTERNS.some(p => lower.includes(p))) {
        return NextResponse.redirect(new URL(PLACEHOLDER, req.url));
    }

    // Thumbnail mode (NavSearch dropdown, product cards): just redirect.
    // Browser fetches the source CDN directly; no server CPU used at all.
    if (isThumb) {
        return NextResponse.redirect(imageUrl, {
            headers: { "Cache-Control": "public, max-age=2592000" },
        });
    }

    // Full proxy mode (for CORS-blocked sources or GMC feed images)
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8_000);

        const upstream = await fetch(imageUrl, {
            headers: {
                "User-Agent": "Mozilla/5.0 (compatible; FairPrice/1.0; +https://fairprice.ng)",
                "Accept": "image/*,*/*;q=0.8",
            },
            signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!upstream.ok) {
            return NextResponse.redirect(new URL(PLACEHOLDER, req.url));
        }

        const contentType = upstream.headers.get("content-type") || "image/jpeg";

        // Stream raw bytes — no Sharp, no CPU cost
        return new NextResponse(upstream.body, {
            headers: {
                "Content-Type": contentType,
                "Cache-Control": "public, max-age=2592000, stale-while-revalidate=86400",
                "X-Content-Type-Options": "nosniff",
            },
        });
    } catch {
        return NextResponse.redirect(new URL(PLACEHOLDER, req.url));
    }
}
