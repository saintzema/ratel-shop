import { PrismaClient } from "@prisma/client";
import { SEED_SELLERS, SEED_PRODUCTS } from "../src/lib/data";
import bcrypt from "bcryptjs";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

/**
 * THE PROTECTIVE SMART SEEDER:
 * This script is designed to run against a database that ALREADY has live data.
 * It uses namespaced IDs (seed_*) to ensure it never collides with real users.
 */
const prisma = new PrismaClient();

async function main() {
    console.log("Starting Protective Smart Seed...");
    
    // 0. Seed Admin Superuser (Hardcoded safety)
    const adminPassword = await bcrypt.hash("admin123", 12);
    await prisma.user.upsert({
        where: { email: "techzema@gmail.com" },
        update: { role: "admin" },
        create: {
            id: "seed_admin_1",
            email: "techzema@gmail.com",
            name: "Tech Zema",
            role: "admin",
            password: adminPassword,
        },
    });

    // 1. Create Sellers with Namespaced IDs
    for (const s of SEED_SELLERS) {
        // We use 'seed_' prefix to avoid colliding with any REAL users on the live site
        const namespacedSellerId = s.id.startsWith('seed_') ? s.id : `seed_${s.id}`;
        const namespacedUserId = `user_${namespacedSellerId}`;

        // Ensure user exists
        await prisma.user.upsert({
            where: { id: namespacedUserId },
            update: {},
            create: {
                id: namespacedUserId,
                email: (s as any).owner_email || `${s.id}_seed_owner@fairprice.ng`,
                name: s.business_name,
                role: "seller",
            },
        });

        // Create/Update Seller
        await prisma.seller.upsert({
            where: { id: namespacedSellerId },
            update: {
                businessName: s.business_name,
                trustScore: s.trust_score,
                verified: s.verified,
                status: (s.status as any) || "active",
            },
            create: {
                id: namespacedSellerId,
                userId: namespacedUserId,
                businessName: s.business_name,
                description: s.description,
                logoUrl: s.logo_url,
                coverImageUrl: s.cover_image_url,
                category: s.category,
                verified: s.verified,
                rating: s.rating,
                trustScore: s.trust_score,
                status: (s.status as any) || "active",
                kycStatus: (s.kyc_status as any) || "not_submitted",
                bankName: s.bank_name,
                accountNumber: s.account_number,
                createdAt: s.created_at ? new Date(s.created_at) : new Date(),
            },
        });
        console.log(`Synced seed seller: ${s.business_name}`);
    }

    // 2. Create Products associated with the Namespaced Sellers
    console.log(`Injecting ${SEED_PRODUCTS.length} products associated with seed sellers...`);
    for (const p of SEED_PRODUCTS) {
        const namespacedSellerId = p.seller_id.startsWith('seed_') ? p.seller_id : `seed_${p.seller_id}`;
        
        // We use the original product ID because they are unique strings (hashes or slugs)
        await prisma.product.upsert({
            where: { id: p.id },
            update: {
                isSponsored: p.is_sponsored || false,
                isActive: p.is_active !== false,
                sellerId: namespacedSellerId, // Update link to namespaced seller
            },
            create: {
                id: p.id,
                sellerId: namespacedSellerId,
                sellerName: p.seller_name,
                name: p.name,
                description: p.description || "",
                price: p.price,
                originalPrice: p.original_price,
                recommendedPrice: p.recommended_price,
                category: p.category,
                imageUrl: p.image_url,
                images: p.images || [],
                stock: p.stock || 0,
                priceFlag: (p.price_flag as any) || "none",
                isSponsored: p.is_sponsored || false,
                isActive: p.is_active !== false,
                avgRating: p.avg_rating || 0,
                reviewCount: p.review_count || 0,
                soldCount: p.sold_count || 0,
                highlights: p.highlights || [],
                specs: (p.specs as any) || {},
                createdAt: p.created_at ? new Date(p.created_at) : new Date(),
            },
        });
    }

    console.log("Protective Smart Seed complete! 297 Products ready.");
}

main()
    .catch((e) => {
        console.error("Protective seed error:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
