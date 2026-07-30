import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/jwt";
import { db } from "@/lib/db";
import { put } from "@vercel/blob";

/**
 * Instagram's media CDN URLs (scontent-*.cdninstagram.com) are signed and
 * time-limited — they expire within days. Storing that URL directly as a
 * product's imageUrl meant the image (and, downstream, the og:image used for
 * every WhatsApp/X/Facebook share preview) silently broke everywhere on
 * FairPrice — PDP, search results, cards, shared links — the moment the
 * signed link expired, with no error anywhere to catch it. Re-hosting the
 * bytes on our own Blob storage at import time makes the URL permanent.
 * Falls back to the original (still-live-for-now) URL if the fetch/upload
 * fails, rather than blocking the import entirely.
 */
async function rehostImage(igUrl: string, seedId: string): Promise<string> {
    try {
        const res = await fetch(igUrl);
        if (!res.ok) return igUrl;
        const contentType = res.headers.get("content-type") || "image/jpeg";
        if (!contentType.startsWith("image/")) return igUrl;
        const buffer = await res.arrayBuffer();
        const ext = contentType.includes("png") ? "png" : "jpg";
        const blob = await put(`products/instagram/${seedId}.${ext}`, buffer, {
            access: "public",
            contentType,
        });
        return blob.url;
    } catch (err: any) {
        console.error("[IG import] Re-host failed, keeping original URL:", err.message);
        return igUrl;
    }
}

/**
 * POST /api/seller/instagram/import
 * Creates real Product records from selected Instagram posts.
 *
 * Body: { products: Array<{ igPostId, name, description, price, category, stock, imageUrl }> }
 */
export async function POST(req: NextRequest) {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const seller = await db.seller.findFirst({
        where: { userId: user.userId },
        select: { id: true, businessName: true, status: true },
    });

    if (!seller) return NextResponse.json({ error: "No seller account" }, { status: 404 });

    const { products } = await req.json();
    if (!Array.isArray(products) || products.length === 0) {
        return NextResponse.json({ error: "products array required" }, { status: 400 });
    }

    const isSellerActive = seller.status === "active";
    const created: string[] = [];
    const errors: string[] = [];

    for (const prod of products) {
        if (!prod.name || !prod.imageUrl) {
            errors.push(`Skipped: missing name or image`);
            continue;
        }
        try {
            const productId = `ig_${prod.igPostId || Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
            const trimmedId = productId.length > 50 ? productId.slice(0, 50) : productId;

            const stableImageUrl = await rehostImage(prod.imageUrl, trimmedId);

            await db.product.create({
                data: {
                    id: trimmedId,
                    sellerId: seller.id,
                    sellerName: seller.businessName,
                    name: String(prod.name).trim(),
                    description: String(prod.description || prod.name).trim(),
                    price: parseFloat(prod.price) || 0,
                    category: prod.category || "Fashion",
                    imageUrl: stableImageUrl,
                    images: [],
                    stock: parseInt(prod.stock) || 10,
                    isActive: isSellerActive && parseFloat(prod.price) > 0,
                    highlights: [],
                    tags: ["instagram"],
                    specs: { Color: "Multicolor" },
                } as any,
            });
            created.push(trimmedId);
        } catch (err: any) {
            console.error("[IG import] Product create error:", err.message);
            errors.push(`${prod.name}: ${err.message}`);
        }
    }

    return NextResponse.json({
        success: true,
        created: created.length,
        errors: errors.length,
        errorDetails: errors,
        isActive: isSellerActive,
        message: isSellerActive
            ? `${created.length} product(s) published to your store.`
            : `${created.length} product(s) saved. They will go live once your seller account is approved.`,
    });
}
