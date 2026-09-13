import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mapDbProductToClient } from "@/lib/product-mapper";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    try {
        const sellerSelect = {
            businessName: true,
            status: true,
            verified: true,
            rating: true,
            trustScore: true,
            createdAt: true,
            subscriptionPlan: true,
            // Public contact info for spot/service listings — already exposed
            // the same way by the list endpoint (/api/products), which is
            // what the Discover board's Call button has always relied on;
            // this single-product route just didn't select it yet.
            phoneNumber: true,
            whatsappNumber: true,
        } as const;

        let product = await db.product.findUnique({
            where: { id },
            include: { seller: { select: sellerSelect } },
        });

        // A seller's product-list "Edit" link is sometimes built from a slug
        // rather than the real id (e.g. an older row, or a link constructed
        // from the PDP's slug-based URL) — the plain id lookup above 404s for
        // those even though the product genuinely exists, so fall back to a
        // slug match before giving up.
        if (!product) {
            product = await db.product.findFirst({
                where: { slug: id },
                include: { seller: { select: sellerSelect } },
            });
        }

        if (!product) {
            return NextResponse.json({ error: "Product not found" }, { status: 404 });
        }

        // Map to client snake_case format (shared mapper — single source of truth)
        const mapped = mapDbProductToClient(product);

        return NextResponse.json(mapped);
    } catch (error: any) {
        console.error("Fetch product error:", error);
        return NextResponse.json({ error: "Failed to fetch product" }, { status: 500 });
    }
}
