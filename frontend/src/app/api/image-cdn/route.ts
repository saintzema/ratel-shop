import { NextResponse } from "next/server";

// Force dynamic — this is a per-URL proxy; Next.js must NOT cache responses at the
// framework level. Failed fetches (placeholder redirects) must never be served from
// cache on retries. Successful images are cached at the CDN level via Cache-Control
// headers on the response itself (30-day public cache).
export const dynamic = "force-dynamic";

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
        return NextResponse.redirect(new URL(PLACEHOLDER, req.url), {
            headers: { "Cache-Control": "no-store, must-revalidate" },
        });
    }

    // Thumbnail mode (NavSearch dropdown, product cards): redirect to source if HTTPS.
    // IF the source is HTTP, we MUST proxy it to avoid Mixed Content errors.
    if (isThumb && imageUrl.startsWith('https://')) {
        return NextResponse.redirect(imageUrl, {
            headers: { "Cache-Control": "public, max-age=2592000" },
        });
    }

    // Full proxy mode — fetch with realistic browser headers to pass hotlink protection
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8_000);

        // Derive the origin of the image URL to use as Referer (helps with hotlink checks)
        let referer = imageUrl;
        try {
            const parsed = new URL(imageUrl);
            referer = `${parsed.protocol}//${parsed.host}/`;
        } catch { /* malformed URL — use full URL as Referer */ }

        const upstream = await fetch(imageUrl, {
            headers: {
                // Use a generic browser UA instead of the branded FairPrice/1.0 string —
                // many CDNs/WordPress sites return 403 for custom UA strings.
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.9",
                "Referer": referer,
                "Sec-Fetch-Dest": "image",
                "Sec-Fetch-Mode": "no-cors",
                "Sec-Fetch-Site": "cross-site",
            },
            signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!upstream.ok) {
            return NextResponse.redirect(new URL(PLACEHOLDER, req.url), {
                headers: { "Cache-Control": "no-store, must-revalidate" },
            });
        }

        const contentType = upstream.headers.get("content-type") || "image/jpeg";

        // Guard: if the server returned HTML/text instead of an image, serve placeholder.
        // Happens when sites return an error page with a 200 status (soft 404).
        if (!contentType.startsWith("image/") && !contentType.startsWith("application/octet-stream")) {
            return NextResponse.redirect(new URL(PLACEHOLDER, req.url), {
                headers: { "Cache-Control": "no-store, must-revalidate" },
            });
        }

        // Stream raw bytes — no Sharp, no CPU cost
        return new NextResponse(upstream.body, {
            headers: {
                "Content-Type": contentType,
                "Cache-Control": "public, max-age=2592000, stale-while-revalidate=86400",
                "X-Content-Type-Options": "nosniff",
            },
        });
    } catch {
        return NextResponse.redirect(new URL(PLACEHOLDER, req.url), {
            headers: { "Cache-Control": "no-store, must-revalidate" },
        });
    }
}
