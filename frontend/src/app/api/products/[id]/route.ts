import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mapDbProductToClient } from "@/lib/product-mapper";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    try {
        const product = await db.product.findUnique({
            where: { id },
            include: {
                seller: {
                    select: {
                        businessName: true,
                        status: true,
                        verified: true,
                        rating: true,
                        trustScore: true,
                        createdAt: true,
                        subscriptionPlan: true
                    }
                }
            }
        });

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
