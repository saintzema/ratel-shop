import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const code = searchParams.get("code");
        const userId = searchParams.get("userId");

        if (!code) {
            return NextResponse.json({ error: "Code required" }, { status: 400 });
        }

        const discount = await (db as any).discount.findFirst({
            where: { 
                code: code.toUpperCase(), 
                status: "active" 
            },
        });

        if (!discount) {
            return NextResponse.json({ error: "Invalid or expired discount code" }, { status: 404 });
        }

        // Check if expired
        if (discount.expiry && new Date(discount.expiry) < new Date()) {
            return NextResponse.json({ error: "This discount code has expired" }, { status: 400 });
        }

        // Check global usage limit
        if (discount.usageLimit && discount.usageCount >= discount.usageLimit) {
            return NextResponse.json({ error: "This discount code has reached its usage limit" }, { status: 400 });
        }

        // Check per-user usage (Konga-style security)
        if (userId) {
            const usage = await (db as any).userDiscountUsage.findUnique({
                where: {
                    userId_discountId: {
                        userId,
                        discountId: discount.id
                    }
                }
            });

            if (usage) {
                return NextResponse.json({ error: "You have already used this discount code" }, { status: 400 });
            }
        }

        return NextResponse.json(discount);
    } catch (error) {
        return NextResponse.json({ error: "Failed to validate discount" }, { status: 500 });
    }
}
