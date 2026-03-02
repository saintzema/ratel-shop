import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
    try {
        const sellers = await db.seller.findMany({
            where: { status: "active" },
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
            created_at: s.createdAt.toISOString(),
            owner_email: s.ownerEmail, // and other fields if they exist in schema
        }));

        return NextResponse.json(mappedSellers);
    } catch (error) {
        console.error("Database fetch error:", error);
        return NextResponse.json({ error: "Failed to fetch sellers" }, { status: 500 });
    }
}
