import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { broadcast } from "../realtime/route";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const sellerId = searchParams.get("seller_id");

        if (!sellerId) {
            return NextResponse.json({ error: "Seller ID required" }, { status: 400 });
        }

        const discounts = await db.discount.findMany({
            where: { sellerId },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json(discounts);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch discounts" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { code, type, value, usageLimit, expiry, sellerId } = body;

        if (!code || !type || !value || !sellerId) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const discount = await db.discount.create({
            data: {
                code: code.toUpperCase(),
                type: type.toLowerCase(),
                value: parseFloat(value),
                usageLimit: usageLimit ? parseInt(usageLimit) : null,
                expiry: expiry ? new Date(expiry) : null,
                sellerId,
                status: "active",
            },
        });

        broadcast({ type: "discount_updated", sellerId });

        return NextResponse.json(discount);
    } catch (error: any) {
        console.error("Discount creation error:", error);
        return NextResponse.json({ error: error.message || "Failed to create discount" }, { status: 500 });
    }
}
