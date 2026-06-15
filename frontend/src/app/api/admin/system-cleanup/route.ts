import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { broadcast } from "@/lib/realtime-service";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        
        // Safety check for administrative authorization (basic)
        if (body.confirm !== "EXECUTE_DEEP_CLEANUP_2026") {
            return NextResponse.json({ error: "Invalid confirmation code" }, { status: 403 });
        }

        const PROTECTED_EMAILS = [
            "emezeji98@gmail.com",
            "info.godswillazubike@gmail.com",
            "ZemedicAI.com@gmail.com",
            "techzema@gmail.com",
            "Obifedike@gmail.com",
            "apple-review@fairprice.app",
            "dev.swtstay@gmail.com"
        ];

        const GLOBAL_SELLER_ID = "global-partners";
        const GLOBAL_USER_ID = "global-user"; // or the ID of emezeji98@gmail.com if it exists

        console.log("🚀 Starting Marketplace Consolidation...");

        // 1. Ensure Global Seller exists
        let globalUser = await db.user.findUnique({ where: { email: "emezeji98@gmail.com" } });
        if (!globalUser) {
            globalUser = await db.user.upsert({
                where: { id: GLOBAL_USER_ID },
                update: { email: "emezeji98@gmail.com", name: "Global Stores", role: "admin" },
                create: {
                    id: GLOBAL_USER_ID,
                    email: "emezeji98@gmail.com",
                    name: "Global Stores",
                    role: "admin"
                }
            });
        }

        await db.seller.upsert({
            where: { id: GLOBAL_SELLER_ID },
            update: { status: "active", userId: globalUser.id },
            create: {
                id: GLOBAL_SELLER_ID,
                userId: globalUser.id,
                businessName: "Global Stores",
                ownerEmail: "emezeji98@gmail.com",
                description: "Official Global Sourcing Partners for FairPrice Marketplace.",
                category: "All",
                status: "active",
                verified: true,
                rating: 5.0,
                trustScore: 100.0
            }
        });

        // 2. Reassign ALL products to Global Store
        const productUpdate = await db.product.updateMany({
            data: {
                sellerId: GLOBAL_SELLER_ID,
                sellerName: "Global Stores"
            }
        });
        console.log(`✅ Reassigned ${productUpdate.count} products to Global Store.`);

        // 3. Delete Negotiations and Orders for demo sellers to avoid foreign key issues or stale UI
        // We only keep data for protected sellers (none except global)
        await db.negotiationRequest.deleteMany({
            where: {
                sellerId: { not: GLOBAL_SELLER_ID }
            }
        });

        // 4. Delete Unprotected Sellers (Cascade will handle products if I didn't reassign, but I did)
        const sellerDelete = await db.seller.deleteMany({
            where: {
                id: { not: GLOBAL_SELLER_ID }
            }
        });
        console.log(`✅ Purged ${sellerDelete.count} demo stores.`);

        // 5. Delete Unprotected Users
        const userDelete = await db.user.deleteMany({
            where: {
                email: { notIn: PROTECTED_EMAILS },
                id: { not: GLOBAL_USER_ID }
            }
        });
        console.log(`✅ Purged ${userDelete.count} demo users.`);

        // 6. Final Sync & Broadcast
        broadcast({ type: "system_update", message: "Marketplace consolidation complete. Purged legacy demo data." });

        return NextResponse.json({
            success: true,
            summary: {
                reassignedProducts: productUpdate.count,
                deletedSellers: sellerDelete.count,
                deletedUsers: userDelete.count
            }
        });

    } catch (error: any) {
        console.error("Cleanup error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
