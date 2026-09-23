import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isInlineImage } from "@/lib/inline-images";

/**
 * GET /api/products/[id]/image[?index=N]
 *
 * Serves a product photo that was saved into the database as a base64 data
 * URI, as real image bytes with a real cache header — so a 500 KB blob is
 * fetched once per browser, lazily, for the cards actually on screen, instead
 * of riding along inside every product-list JSON response. See
 * lib/inline-images.ts for why.
 *
 * Product images are public, so this is deliberately unauthenticated — it
 * returns exactly what the product card already shows.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const index = req.nextUrl.searchParams.get("index");

    const product = await db.product.findUnique({
        where: { id },
        select: { imageUrl: true, images: true },
    }).catch(() => null);
    if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const raw = index != null
        ? (Array.isArray(product.images) ? product.images[Number(index)] : null)
        : product.imageUrl;
    if (!isInlineImage(raw)) return NextResponse.json({ error: "Not an inline image" }, { status: 404 });

    // [\s\S] rather than the `s` flag — the compile target predates dotAll.
    const match = /^data:([^;,]+)(;base64)?,([\s\S]*)$/.exec(raw);
    if (!match) return NextResponse.json({ error: "Malformed image" }, { status: 422 });
    const [, contentType, isBase64, payload] = match;

    const body = isBase64
        ? Buffer.from(payload, "base64")
        : Buffer.from(decodeURIComponent(payload), "utf8");

    return new NextResponse(new Uint8Array(body), {
        headers: {
            "Content-Type": contentType || "application/octet-stream",
            "Content-Length": String(body.length),
            // The bytes for a given product id never change in place — a new
            // photo is a new write to imageUrl, and the card's URL is the same,
            // so keep the revalidation window modest rather than immutable.
            "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
        },
    });
}
