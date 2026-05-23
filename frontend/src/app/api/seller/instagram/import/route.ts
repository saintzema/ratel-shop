import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/jwt";
import { db } from "@/lib/db";

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
        where: { userId: (user as any).id },
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

            await db.product.create({
                data: {
                    id: trimmedId,
                    sellerId: seller.id,
                    sellerName: seller.businessName,
                    name: String(prod.name).trim(),
                    description: String(prod.description || prod.name).trim(),
                    price: parseFloat(prod.price) || 0,
                    category: prod.category || "Fashion",
                    imageUrl: prod.imageUrl,
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
