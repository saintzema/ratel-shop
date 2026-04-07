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

    try {
        // 1. Fetch external image
        const response = await fetch(imageUrl, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }
        });

        if (!response.ok) {
            console.error(`GMC Proxy: Failed to fetch ${imageUrl}`);
            return NextResponse.redirect(new URL('/assets/images/placeholder.png', req.url));
        }

        const buffer = await response.arrayBuffer();

        // 2. Transform with Sharp (Standardize to JPEG/Progressive)
        const optimized = await sharp(Buffer.from(buffer))
            .resize(1000, 1000, { fit: 'inside', withoutEnlargement: true })
            .toFormat('jpeg', { quality: 85, progressive: true })
            .toBuffer();

        // 3. Return with proper Cache-Control and Content-Type for GMC
        return new NextResponse(optimized, {
            headers: {
                "Content-Type": "image/jpeg",
                "Cache-Control": "public, max-age=2592000, stale-while-revalidate=86400", // 30 days
            }
        });

    } catch (error) {
        console.error("GMC Proxy: Sharp processing failed:", error);
        // On failure, redirect to a static placeholder that Google can definitely see
        return NextResponse.redirect(new URL('/assets/images/placeholder.png', req.url));
    }
}
