import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(request: Request) {
    try {
        // Fetch sponsored products as promotions
        const promotions = await db.product.findMany({
            where: { isSponsored: true, isActive: true },
            take: 20,
            orderBy: { updatedAt: "desc" },
        });

        return NextResponse.json(promotions);
    } catch (error: any) {
        console.error("Promotions GET Error:", error);
        return NextResponse.json([], { status: 200 }); // Return empty array on error to prevent 500s on client
    }
}
