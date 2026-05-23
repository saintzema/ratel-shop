import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/jwt";
import { WhatsAppService } from "@/lib/whatsapp-service";

/**
 * Extracts all Nigerian phone numbers from a raw string (handles WA chat exports,
 * mixed text, timestamps, names, messages, etc.)
 * Supports: +2348..., 2348..., 08..., 0703..., spaces/dashes between digits
 */
function extractPhoneNumbers(raw: string): string[] {
    // Match Nigerian numbers in any format within arbitrary text
    const regex = /(?:\+?234|0)[\s\-]?[7-9][01][\s\-]?\d[\s\-]?\d[\s\-]?\d[\s\-]?\d[\s\-]?\d[\s\-]?\d[\s\-]?\d/g;
    const matches = raw.match(regex) || [];
    // Clean up spaces/dashes and deduplicate
    const seen = new Set<string>();
    const out: string[] = [];
    for (const m of matches) {
        const clean = m.replace(/[\s\-]/g, "");
        if (!seen.has(clean)) { seen.add(clean); out.push(clean); }
    }
    return out;
}

/**
 * POST /api/admin/whatsapp/bulk-import
 * Accepts either:
 *   { rawText: string }  — extracts all phone numbers from unstructured text (WA chat dump)
 *   { numbers: string[] } — array of pre-extracted numbers
 * Skips numbers that already exist. Returns a summary.
 */
export async function POST(req: NextRequest) {
    try {
        const admin = getUserFromRequest(req);
        if (!admin || (admin as any).role !== 'admin') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();

        // Accept raw text OR pre-split array
        let numbers: string[];
        if (body.rawText) {
            numbers = extractPhoneNumbers(String(body.rawText));
        } else if (Array.isArray(body.numbers)) {
            // Still run extraction on each element in case lines contain full messages
            const combined = body.numbers.join("\n");
            numbers = extractPhoneNumbers(combined);
        } else {
            return NextResponse.json({ error: "rawText or numbers array required" }, { status: 400 });
        }

        if (numbers.length === 0) {
            return NextResponse.json({ error: "No valid Nigerian phone numbers found in input" }, { status: 400 });
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
                total: numbers.length,   // extracted phone number count
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
