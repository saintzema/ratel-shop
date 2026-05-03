import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { broadcast } from "@/lib/realtime-service";

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const params = await context.params;
        const product = await db.product.findUnique({
            where: { id: params.id },
            select: { isTrending: true }
        });

        if (!product) {
            return NextResponse.json({ error: "Product not found" }, { status: 404 });
        }

        const updatedProduct = await db.product.update({
            where: { id: params.id },
            data: { isTrending: !product.isTrending }
        });

        // Broadcast to existing clients (Web, Android, iOS)
        broadcast({ type: "product_updated", id: updatedProduct.id });

        return NextResponse.json({
            success: true,
            isTrending: updatedProduct.isTrending
        });
    } catch (error: any) {
        console.error("Error toggling trending status:", error);
        return NextResponse.json({ error: "Failed to update trending status" }, { status: 500 });
    }
}
