// @ts-nocheck
import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

const prisma = new PrismaClient();
const SELLER_ID = "global-partners";
const BUYER_ID = "buyer_123";

async function main() {
    console.log("📈 Restoring Marketplace History (Revenue & Negotiations)...");

     // 1. Clear any existing orders/negotiations for a clean history sync
     await prisma.order.deleteMany({});
     await prisma.negotiationRequest.deleteMany({});

    // 2. Restore ₦4,046,800 Revenue (Historical Completed Orders)
    // We'll create 20 completed orders totaling this exact amount
    const totalRevenue = 4046800;
    const baseSalePrice = Math.floor(totalRevenue / 20);
    const lastSalePrice = totalRevenue - (baseSalePrice * 19);

    console.log(`💰 Recreating ₦${totalRevenue.toLocaleString()} Revenue...`);
    for (let i = 0; i < 20; i++) {
        const amount = i === 19 ? lastSalePrice : baseSalePrice;
        await prisma.order.create({
            data: {
                id: `hist_order_${i}`,
                customerId: BUYER_ID,
                sellerId: SELLER_ID,
                productId: "instant-pot-duo-plus-6-quart-9-in-1-pressure-cooke", // Consistent product
                amount,
                status: "delivered",
                escrowStatus: "released",
                shippingAddress: "Lagos, Nigeria",
                customerName: "Test Buyer",
                sellerName: "Global Stores",
                createdAt: new Date(Date.now() - (i + 1) * 24 * 60 * 60 * 1000) // Spread over last 20 days
            }
        });
    }

    // 3. Restore 8 Pending Orders
    console.log("📦 Recreating 8 Pending Orders...");
    for (let i = 0; i < 8; i++) {
        await prisma.order.create({
            data: {
                id: `pending_order_${i}`,
                customerId: BUYER_ID,
                sellerId: SELLER_ID,
                productId: "nj_p39",
                amount: 390000,
                status: "pending",
                escrowStatus: "held",
                shippingAddress: "Lagos, Nigeria",
                customerName: "Test Buyer",
                sellerName: "Global Stores"
            }
        });
    }

    // 4. Restore 65 Negotiations
    console.log("💬 Recreating 65 Negotiations...");
    for (let i = 0; i < 65; i++) {
        await prisma.negotiationRequest.create({
            data: {
                id: `neg_${i}`,
                productId: "instant-pot-duo-plus-6-quart-9-in-1-pressure-cooke",
                customerId: BUYER_ID,
                customerName: "Test Buyer",
                sellerId: SELLER_ID,
                proposedPrice: 55000 + (i * 10),
                status: i < 40 ? "accepted" : i < 60 ? "pending" : "rejected",
                createdAt: new Date(Date.now() - i * 12 * 60 * 60 * 1000)
            }
        });
    }

    console.log("✨ Marketplace History Restored Successfully!");
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
