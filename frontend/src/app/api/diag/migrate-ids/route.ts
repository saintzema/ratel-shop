import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: Request) {
    try {
        console.log("🚀 Starting One-Time Product ID Migration (Google Compliance)...");

        // 1. Find all products
        const allProducts = await db.product.findMany({});
        const targets = allProducts.filter(p => p.id.length > 50);
        
        console.log(`🔍 Found ${targets.length} products with IDs > 50 characters.`);

        if (targets.length === 0) {
            return NextResponse.json({ 
                success: true, 
                message: "No long IDs found. Database is already compliant." 
            });
        }

        const results = [];

        for (const product of targets) {
            const oldId = product.id;
            let safeId = oldId.slice(0, 50).replace(/-+$/, "");

            // Check for potential collision
            let collision = await db.product.findUnique({ where: { id: safeId } });
            let suffix = 1;
            const originalSafeId = safeId;
            
            while (collision && collision.id !== oldId) {
                const suffixStr = `-${suffix}`;
                safeId = originalSafeId.slice(0, 50 - suffixStr.length) + suffixStr;
                collision = await db.product.findUnique({ where: { id: safeId } });
                suffix++;
            }

            // Perform migration in a single transaction
            await db.$transaction(async (tx) => {
                // 1. Create the new product (copy of old)
                const { id, ...data } = product;
                await tx.product.create({
                    data: {
                        ...(data as any),
                        id: safeId
                    }
                });

                // 2. Update all related tables based on actual schema names
                // Note: productId exists directly on Order, NegotiationRequest, and Review
                
                await tx.order.updateMany({
                    where: { productId: oldId },
                    data: { productId: safeId }
                });

                await tx.negotiationRequest.updateMany({
                    where: { productId: oldId },
                    data: { productId: safeId }
                });

                await tx.review.updateMany({
                    where: { productId: oldId },
                    data: { productId: safeId }
                });

                // Deal table also references productId
                await tx.deal.updateMany({
                    where: { productId: oldId },
                    data: { productId: safeId }
                });

                // 3. Delete the old product
                await tx.product.delete({
                    where: { id: oldId }
                });
            });

            results.push({ oldId, safeId, name: product.name });
        }

        return NextResponse.json({ 
            success: true, 
            message: `Migration complete. Migrated ${targets.length} products.`,
            migrated: results
        });

    } catch (error: any) {
        console.error("❌ Migration failed:", error);
        return NextResponse.json({ 
            success: false, 
            error: error.message 
        }, { status: 500 });
    }
}
