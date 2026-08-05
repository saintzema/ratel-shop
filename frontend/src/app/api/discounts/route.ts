import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getUserFromRequest } from "@/lib/jwt";
import { broadcast } from "@/lib/realtime-service";

export async function GET(req: NextRequest) {
    try {
        const sellerId = req.nextUrl.searchParams.get("seller_id");

        if (!sellerId) {
            return NextResponse.json({ error: "Seller ID required" }, { status: 400 });
        }

        // Promo codes + usages (customer names) are seller-private data — this used
        // to accept any caller's seller_id with no auth check at all.
        const user = getUserFromRequest(req);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        if (user.role !== "admin" && user.staffOf !== sellerId) {
            const owningSeller = await db.seller.findUnique({ where: { id: sellerId }, select: { userId: true } });
            if (!owningSeller || owningSeller.userId !== user.userId) {
                return NextResponse.json({ error: "Forbidden" }, { status: 403 });
            }
        }

        const discounts = await (db as any).discount.findMany({
            where: { sellerId },
            include: {
                usages: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true
                                // NO EMAIL PER USER REQUEST
                            }
                        }
                    },
                    orderBy: { createdAt: "desc" }
                }
            },
            orderBy: { createdAt: "desc" },
        });

        // Normalise: expose createdAt as usedAt so the frontend display works
        const normalised = discounts.map((d: any) => ({
            ...d,
            usages: d.usages.map((u: any) => ({ ...u, usedAt: u.usedAt ?? u.createdAt }))
        }));

        return NextResponse.json(normalised);
    } catch (error: any) {
        console.error("[discounts GET]", error);
        return NextResponse.json({ error: "Failed to fetch discounts" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const user = getUserFromRequest(req);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { code, type, value, usageLimit, expiry, sellerId } = body;

        if (!code || !type || !value || !sellerId) {
            return NextResponse.json({ error: "Missing required fields: code, type, value, sellerId" }, { status: 400 });
        }

        // Verify the seller belongs to the authenticated user
        const seller = await db.seller.findUnique({
            where: { id: sellerId },
            select: { userId: true }
        });
        if (!seller || seller.userId !== user.userId) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const discount = await (db as any).discount.create({
            data: {
                code: code.toUpperCase().trim(),
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
        console.error("[discounts POST]", error);
        // Surface duplicate code error clearly
        if (error.code === "P2002") {
            return NextResponse.json({ error: "A promo code with this name already exists. Choose a different code." }, { status: 409 });
        }
        return NextResponse.json({ error: error.message || "Failed to create discount" }, { status: 500 });
    }
}
