import { PrismaClient } from "@prisma/client";
import { SEED_SELLERS, SEED_PRODUCTS } from "../src/lib/data";
import bcrypt from "bcryptjs";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

/**
 * THE PROTECTIVE SMART SEEDER (RE-HOME VERSION):
 * This version uses namespaced IDs for mock sellers, 
 * but maps 'Global Stores' products directly to your REAL live account.
 */
const prisma = new PrismaClient();

async function main() {
    console.log("Starting Protective Smart Seed...");
    
    // 0. Seed Admin Superuser
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

    // 1. Create Sellers with Namespaced IDs (except for your real one)
    for (const s of SEED_SELLERS) {
        // DETECT YOUR REAL ACCOUNT: If it's global-partners, use the real ID
        const isRealAccount = s.id === 'global-partners' || s.business_name.includes("Global Stores");
        const namespacedSellerId = isRealAccount ? 'global-partners' : (s.id.startsWith('seed_') ? s.id : `seed_${s.id}`);
        const namespacedUserId = isRealAccount ? 'global_partner' : `user_${namespacedSellerId}`;

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
        console.log(`Synced seller: ${s.business_name} (ID: ${namespacedSellerId})`);
    }

    // 2. Create Products
    console.log(`Injecting ${SEED_PRODUCTS.length} products...`);
    for (const p of SEED_PRODUCTS) {
        const isRealAccount = p.seller_id === 'global-partners' || p.seller_name.includes("Global Stores");
        const namespacedSellerId = isRealAccount ? 'global-partners' : (p.seller_id.startsWith('seed_') ? p.seller_id : `seed_${p.seller_id}`);
        
        await prisma.product.upsert({
            where: { id: p.id },
            update: {
                isSponsored: p.is_sponsored || false,
                isActive: p.is_active !== false,
                sellerId: namespacedSellerId,
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

    console.log("Protective Smart Seed complete! Live and Seed data harmonized.");
}

main()
    .catch((e) => {
        console.error("Protective seed error:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
