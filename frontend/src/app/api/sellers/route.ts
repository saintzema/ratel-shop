import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { broadcast } from "../realtime/route";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const includeInactive = searchParams.get("all") === "true";

        const whereClause = includeInactive ? {} : { status: "active" as const };

        const sellers = await db.seller.findMany({
            where: whereClause,
        });

        const mappedSellers = sellers.map(s => ({
            id: s.id,
            user_id: s.userId,
            business_name: s.businessName,
            description: s.description,
            logo_url: s.logoUrl,
            cover_image_url: s.coverImageUrl,
            category: s.category,
            verified: s.verified,
            rating: s.rating,
            trust_score: s.trustScore,
            status: s.status,
            kyc_status: s.kycStatus,
            bank_name: s.bankName,
            account_number: s.accountNumber,
            account_name: s.accountName,
            store_url: s.storeUrl,
            location: s.location,
            weekly_orders: s.weeklyOrders,
            currencies: s.currencies,
            staff_count: s.staffCount,
            physical_stores: s.physicalStores,
            created_at: s.createdAt.toISOString(),
            owner_name: s.ownerName,
            owner_email: s.ownerEmail,
        }));

        return NextResponse.json(mappedSellers);
    } catch (error) {
        console.error("Database fetch error:", error);
        return NextResponse.json({ error: "Failed to fetch sellers" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const userId = body.user_id || body.userId;

        if (!userId) {
            return NextResponse.json({ error: "User ID is required" }, { status: 400 });
        }

        // Ensure user exists first (basic check or creation)
        const user = await db.user.upsert({
            where: { id: userId },
            update: {
                role: "seller"
            },
            create: {
                id: userId,
                email: body.owner_email || `${body.id}_owner@fairprice.ng`,
                name: body.business_name || body.ownerName || "Seller",
                role: "seller",
            }
        });

        // Map snake_case to camelCase
        const sellerData = {
            id: body.id,
            userId: user.id,
            businessName: body.business_name,
            description: body.description || "",
            logoUrl: body.logo_url,
            coverImageUrl: body.cover_image_url,
            category: body.category || "other",
            verified: body.verified || false,
            rating: body.rating || 0,
            trustScore: body.trust_score || 50,
            status: body.status || "active",
            kycStatus: body.kyc_status || "not_submitted",
            bankName: body.bank_name,
            accountNumber: body.account_number,
            accountName: body.account_name,
            storeUrl: body.store_url,
            location: body.location,
            weeklyOrders: body.weekly_orders,
            currencies: body.currencies || [],
            staffCount: body.staff_count,
            physicalStores: body.physical_stores,
            ownerName: body.owner_name || user.name,
            ownerEmail: body.owner_email || user.email,
        };

        const seller = await db.seller.upsert({
            where: { userId: sellerData.userId },
            update: {
                ...sellerData,
                id: undefined, // Never overwrite the primary key on update
            },
            create: sellerData,
        });

        // Broadcast update for real-time sync
        broadcast({ type: "seller_updated", id: seller.id });

        return NextResponse.json(seller);
    } catch (error: any) {
        console.error("Seller creation error:", error);
        return NextResponse.json({ error: error.message || "Failed to create seller" }, { status: 500 });
    }
}
