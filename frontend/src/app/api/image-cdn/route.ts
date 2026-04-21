import { NextResponse } from "next/server";
import sharp from "sharp";

export const dynamic = 'force-dynamic';

/**
 * Image CDN Proxy for Google Merchant Center (GMC) Compliance
 * - Converts all incoming images to standard JPEG (GMC's favorite)
 * - Resizes if necessary to avoid payload overhead
 * - Provides stable URLs for GMC's crawler
 */
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const imageUrl = searchParams.get("url");

    if (!imageUrl) {
        return new NextResponse("Missing URL", { status: 400 });
    }

    // Handle standard placeholder without external fetch
    if (imageUrl.startsWith('/assets/images/placeholder.png')) {
        return NextResponse.redirect(new URL('/assets/images/placeholder.png', req.url));
    }

    // Fail-fast for Google Grounding / VertexAI URLs — they expire quickly and always time out.
    // The client's background hydration will fetch a real image via /api/product-image instead.
    const lowerUrl = imageUrl.toLowerCase();
    if (
        lowerUrl.includes('googleusercontent.com/grounding') ||
        lowerUrl.includes('vertexaisearch.cloud.google.com') ||
        lowerUrl.includes('grounding-api-redirect') ||
        lowerUrl.includes('googleapis.com/download')
    ) {
        return NextResponse.redirect(new URL('/assets/images/placeholder.png', req.url));
    }

    try {
        // 1. Fetch external image with retry logic
        async function fetchWithRetry(url: string, retries = 3, backoff = 500) {
            for (let i = 0; i < retries; i++) {
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout per attempt
                    
                    const response = await fetch(url, {
                        headers: {
                            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                            "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8"
                        },
                        signal: controller.signal
                    });
                    clearTimeout(timeoutId);
                    
                    if (response.ok) return response;
                    if (response.status === 404) break; // Don't retry 404
                } catch (e) {
                    if (i === retries - 1) throw e;
                }
                await new Promise(res => setTimeout(res, backoff * Math.pow(2, i)));
            }
            return null;
        }

        const response = await fetchWithRetry(imageUrl);

        if (!response || !response.ok) {
            console.error(`GMC Proxy: Failed to fetch ${imageUrl} after multiple attempts`);
            return NextResponse.redirect(new URL('/assets/images/placeholder.png', req.url));
        }

        const buffer = await response.arrayBuffer();

        // 2. Transform with Sharp (Standardize to JPEG/Progressive)
        // Optimization: Slightly lower quality (75) to significantly reduce CPU/Memory usage
        const optimized = await sharp(Buffer.from(buffer))
            .resize(1000, 1000, { fit: 'inside', withoutEnlargement: true })
            .toFormat('jpeg', { quality: 75, progressive: true, mozjpeg: true })
            .toBuffer();

        // 3. Return with proper Cache-Control and Content-Type for GMC
        return new NextResponse(optimized as any, {
            headers: {
                "Content-Type": "image/jpeg",
                "Cache-Control": "public, max-age=2592000, stale-while-revalidate=86400", // 30 days
            }
        });

    } catch (error) {
        console.error("GMC Proxy: Sharp processing failed:", error);
        return NextResponse.redirect(new URL('/assets/images/placeholder.png', req.url));
    }
}
