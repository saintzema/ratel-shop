// @ts-nocheck
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function migrate() {
    console.log("🚀 Starting One-Time Product ID Migration (Google Compliance)...");

    try {
        // 1. Find all products with IDs longer than 50 characters
        const longProducts = await prisma.product.findMany({});

        const targets = longProducts.filter(p => p.id.length > 50);
        console.log(`🔍 Found ${targets.length} products with IDs > 50 characters.`);

        if (targets.length === 0) {
            console.log("✅ No long IDs found. Database is already compliant.");
            return;
        }

        for (const product of targets) {
            const oldId = product.id;
            let safeId = oldId.slice(0, 50).replace(/-+$/, "");

            console.log(`📦 Migrating [${oldId}] -> [${safeId}]...`);

            // Check for potential collision
            let collision = await prisma.product.findUnique({ where: { id: safeId } });
            let suffix = 1;
            const originalSafeId = safeId;
            
            while (collision && collision.id !== oldId) {
                const suffixStr = `-${suffix}`;
                safeId = originalSafeId.slice(0, 50 - suffixStr.length) + suffixStr;
                collision = await prisma.product.findUnique({ where: { id: safeId } });
                suffix++;
            }

            // Perform migration in a single transaction
            await prisma.$transaction(async (tx) => {
                // 1. Create the new product (copy of old)
                const { id, ...data } = product;
                await tx.product.create({
                    data: {
                        ...(data as any),
                        id: safeId
                    }
                });

                // 2. Update all related tables
                await (tx.orderItem as any).updateMany({
                    where: { productId: oldId },
                    data: { productId: safeId }
                });

                await tx.negotiation.updateMany({
                    where: { productId: oldId },
                    data: { productId: safeId }
                });

                await tx.review.updateMany({
                    where: { productId: oldId },
                    data: { productId: safeId }
                });

                await tx.favorite.updateMany({
                    where: { productId: oldId },
                    data: { productId: safeId }
                });

                await tx.browsingHistory.updateMany({
                    where: { productId: oldId },
                    data: { productId: safeId }
                });

                // 3. Delete the old product
                await tx.product.delete({
                    where: { id: oldId }
                });
            });

            console.log(`✅ Successfully migrated: ${product.name}`);
        }

        console.log("\n==================================");
        console.log(`🎉 MIGRATION COMPLETE!`);
        console.log(`Total Migrated: ${targets.length}`);
        console.log("==================================");

    } catch (error) {
        console.error("❌ Migration failed:", error);
    } finally {
        await prisma.$disconnect();
    }
}

migrate();
