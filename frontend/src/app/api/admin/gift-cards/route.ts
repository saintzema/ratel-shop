import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/jwt";

const GLOBAL_PARTNER_SELLER_ID = "global_partner";

function generateGiftCardCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No I, O, 0, 1 to avoid confusion
    const segment = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    return `FP2000-${segment()}-${segment()}`;
}

/**
 * GET /api/admin/gift-cards
 * List all gift card vouchers under global_partner
 */
export async function GET(req: NextRequest) {
    const admin = getUserFromRequest(req);
    if (!admin || (admin as any).role !== "admin") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const url = new URL(req.url);
        const status = url.searchParams.get("status") || "all";

        const discounts = await (prisma as any).discount.findMany({
            where: {
                sellerId: GLOBAL_PARTNER_SELLER_ID,
                type: "fixed",
                ...(status !== "all" ? { status } : {}),
            },
            include: {
                usages: {
                    include: { user: { select: { id: true, name: true, whatsappNumber: true } } },
                    orderBy: { createdAt: "desc" },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json(discounts);
    } catch (err: any) {
        console.error("Gift cards fetch error:", err);
        return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
    }
}

/**
 * POST /api/admin/gift-cards
 * Issue one or more ₦2,000 gift card codes
 * Body: { count?: number, amount?: number, usageLimit?: number, expiry?: string, recipientPhones?: string[] }
 */
export async function POST(req: NextRequest) {
    const admin = getUserFromRequest(req);
    if (!admin || (admin as any).role !== "admin") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const {
            count = 1,
            amount = 2000,
            usageLimit = 1,
            expiry,
            recipientPhones = [],
        } = await req.json();

        if (count > 500) {
            return NextResponse.json({ error: "Max 500 codes per batch" }, { status: 400 });
        }

        const total = Math.max(count, recipientPhones.length || 1);
        const created: { code: string; phone?: string }[] = [];
        const errors: string[] = [];

        for (let i = 0; i < total; i++) {
            let code = generateGiftCardCode();
            // Ensure uniqueness — retry up to 5x
            for (let attempt = 0; attempt < 5; attempt++) {
                const existing = await (prisma as any).discount.findUnique({ where: { code } });
                if (!existing) break;
                code = generateGiftCardCode();
            }

            try {
                await (prisma as any).discount.create({
                    data: {
                        code,
                        type: "fixed",
                        value: amount,
                        usageLimit,
                        usageCount: 0,
                        status: "active",
                        expiry: expiry ? new Date(expiry) : null,
                        sellerId: GLOBAL_PARTNER_SELLER_ID,
                    },
                });
                created.push({ code, phone: recipientPhones[i] ?? undefined });
            } catch (e: any) {
                errors.push(`Code ${code}: ${e.message}`);
            }
        }

        return NextResponse.json({
            success: true,
            created,
            errors,
            summary: { total, created: created.length, errors: errors.length },
        });
    } catch (err: any) {
        console.error("Gift card issue error:", err);
        return NextResponse.json({ error: "Failed to issue gift cards" }, { status: 500 });
    }
}
