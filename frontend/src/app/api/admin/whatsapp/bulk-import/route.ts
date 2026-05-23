import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/jwt";
import { WhatsAppService } from "@/lib/whatsapp-service";

/**
 * POST /api/admin/whatsapp/bulk-import
 * Imports a list of phone numbers as WA-placeholder user accounts.
 * Skips numbers that already exist. Returns a summary.
 */
export async function POST(req: NextRequest) {
    try {
        const admin = getUserFromRequest(req);
        if (!admin || (admin as any).role !== 'admin') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { numbers, source = "bulk_import", sendWelcome = false } = await req.json();

        if (!Array.isArray(numbers) || numbers.length === 0) {
            return NextResponse.json({ error: "numbers array required" }, { status: 400 });
        }
        if (numbers.length > 5000) {
            return NextResponse.json({ error: "Max 5000 numbers per batch" }, { status: 400 });
        }

        const results = { created: 0, skipped: 0, errors: 0, details: [] as string[] };

        for (const rawPhone of numbers) {
            const phone = String(rawPhone).trim().replace(/\s/g, "");
            if (!phone) continue;

            try {
                const normalized = WhatsAppService.normalizePhoneNumber(phone);
                if (!normalized) { results.errors++; continue; }

                // Build all possible email variants to check for duplicates
                const emailVariants: string[] = [
                    `wa_${normalized}@fairprice.ng`,
                    `wa-${normalized}@fairprice.ng`,
                ];

                // Check if user with any variant already exists
                const existing = await prisma.user.findFirst({
                    where: {
                        OR: [
                            { whatsappNumber: { in: [normalized, phone, `0${normalized.substring(3)}`] } },
                            { email: { in: emailVariants } },
                        ]
                    },
                    select: { id: true }
                });

                if (existing) {
                    results.skipped++;
                    continue;
                }

                const userId = `wa_import_${normalized}_${Date.now().toString(36)}`;
                await prisma.user.create({
                    data: {
                        id: userId,
                        email: `wa_${normalized}@fairprice.ng`,
                        whatsappNumber: normalized,
                        name: `WhatsApp User`,
                        role: "customer",
                        source: source,
                    } as any
                });
                results.created++;
                results.details.push(normalized);

            } catch (err: any) {
                results.errors++;
                console.error(`Bulk import error for ${phone}:`, err.message);
            }
        }

        return NextResponse.json({
            success: true,
            summary: {
                total: numbers.length,
                created: results.created,
                skipped: results.skipped,
                errors: results.errors,
            }
        });
    } catch (error: any) {
        console.error("Bulk import error:", error);
        return NextResponse.json({ error: "Import failed" }, { status: 500 });
    }
}
