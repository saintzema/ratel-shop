import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
    try {
        const productCount = await db.product.count();
        const activeProductCount = await db.product.count({ where: { isActive: true } });
        const sellerCount = await db.seller.count();
        const userCount = await db.user.count();
        
        // Get sample IDs to check length
        const sampleProducts = await db.product.findMany({
            take: 5,
            select: { id: true }
        });

        const longIds = sampleProducts.filter(p => p.id.length > 50);

        return NextResponse.json({
            success: true,
            counts: {
                totalProducts: productCount,
                activeProducts: activeProductCount,
                totalSellers: sellerCount,
                totalUsers: userCount
            },
            diagnostics: {
                hasLongIds: longIds.length > 0,
                sampleIds: sampleProducts.map(p => ({ id: p.id, length: p.id.length })),
                databaseUrl: process.env.DATABASE_URL ? "Configured" : "Missing"
            }
        });
    } catch (error: any) {
        return NextResponse.json({
            success: false,
            error: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}
