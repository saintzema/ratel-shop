import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { DEMO_SELLERS, DEMO_PRODUCTS } from "../src/lib/data";
import bcrypt from "bcryptjs";
import * as dotenv from "dotenv";

// Explicitly load .env.local since that's where DATABASE_URL is
dotenv.config({ path: ".env.local" });
dotenv.config(); // fallback to .env just in case

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log("Starting seed...");

    // 0. Seed Admin Superuser
    const adminPassword = await bcrypt.hash("admin123", 12);
    await prisma.user.upsert({
        where: { email: "techzema@gmail.com" },
        update: { role: "admin", password: adminPassword },
        create: {
            id: "admin_1",
            email: "techzema@gmail.com",
            name: "Tech Zema",
            role: "admin",
            password: adminPassword,
        },
    });
    console.log("Seeded admin user: techzema@gmail.com");

    // 1. Create Sellers
    const processedUserIds = new Set<string>();
    const usedSellerUserIds = new Set<string>();

    for (const s of DEMO_SELLERS) {
        let userId = s.user_id || `user_${s.id}`;

        // If this userId is already taken by another seller, we must use a different one
        // because the schema has a @unique constraint on Seller.userId
        if (usedSellerUserIds.has(userId)) {
            userId = `${userId}_${s.id}`;
        }
        usedSellerUserIds.add(userId);

        // Ensure user exists (upsert by ID)
        await prisma.user.upsert({
            where: { id: userId },
            update: {},
            create: {
                id: userId,
                email: s.owner_email || `${s.id}_owner@fairprice.ng`,
                name: s.business_name,
                role: "seller",
            },
        });

        await prisma.seller.upsert({
            where: { id: s.id },
            update: {},
            create: {
                id: s.id,
                userId: userId,
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
                accountName: s.account_name,
                createdAt: s.created_at ? new Date(s.created_at) : new Date(),
            },
        });
        console.log(`Synced seller: ${s.business_name} (User: ${userId})`);
    }

    // 2. Create Products
    for (const p of DEMO_PRODUCTS) {
        await prisma.product.upsert({
            where: { id: p.id },
            update: {
                isSponsored: p.is_sponsored || false,
                isTrending: p.is_trending || false,
                priceFlag: (p.price_flag as any) || "none",
                isActive: p.is_active !== false,
            },
            create: {
                id: p.id,
                sellerId: p.seller_id,
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

    // 3. Create mock orders so Admin Dashboard stats aren't 0
    console.log("Seeding mock orders...");
    
    // Ensure a dummy buyer exists
    await prisma.user.upsert({
        where: { email: "buyer_test@example.com" },
        update: {},
        create: {
            id: "buyer_123",
            name: "Test Buyer",
            email: "buyer_test@example.com",
            role: "customer"
        }
    });

    const statusMap = [
        { status: "delivered", escrow: "released" },
        { status: "shipped", escrow: "held" },
        { status: "pending", escrow: "held" },
        { status: "delivered", escrow: "disputed" }
    ];

    for (let i = 0; i < 5; i++) {
        const product = DEMO_PRODUCTS[i % DEMO_PRODUCTS.length];
        const statusObj = statusMap[i % statusMap.length];
        
        await prisma.order.upsert({
            where: { id: `FP-DEMO-ORD-${i}` },
            update: {},
            create: {
                id: `FP-DEMO-ORD-${i}`,
                customerId: "buyer_123",
                customerName: "Test Buyer",
                productId: product.id,
                sellerId: product.seller_id,
                sellerName: product.seller_name,
                amount: product.price,
                quantity: 1,
                shippingAddress: "123 Mock Street, Lagos",
                paymentMethod: "paystack",
                status: statusObj.status,
                escrowStatus: statusObj.escrow,
                createdAt: new Date(Date.now() - (i * 24 * 60 * 60 * 1000))
            }
        });
    }

    console.log("Seed complete!");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
