import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/jwt";
import { WhatsAppService } from "@/lib/whatsapp-service";

const PHONE_RE = /(?:\+?234|0)[\s\-]?[7-9][01][\s\-]?\d[\s\-]?\d[\s\-]?\d[\s\-]?\d[\s\-]?\d[\s\-]?\d[\s\-]?\d/g;

/** Looks like a real person name: 2+ words, letters/spaces/hyphens only, no digits */
function looksLikeName(s: string): boolean {
    const t = s.trim();
    return /^[A-Za-zÀ-ÖØ-öø-ÿ]+([\s\-'][A-Za-zÀ-ÖØ-öø-ÿ]+)+$/.test(t) && t.length >= 3 && t.length <= 60;
}

/**
 * Extracts Nigerian phone numbers + best-effort contact names from raw text.
 * Handles: WA chat exports, vCard dumps, contact lists, plain number lists.
 *
 * Name extraction heuristics (in priority order):
 *  1. vCard  — FN: before the TEL: for the same contact block
 *  2. WA chat export — "[date] Name: message" → name on same line as phone, or adjacent sender line
 *  3. Adjacent lines — name-only line immediately before or after a phone line
 *  4. Inline  — "Name +2348..." or "+2348... Name" on same line
 */
function extractContactsFromText(raw: string): { phone: string; name: string }[] {
    const phoneToName = new Map<string, string>();

    // ── 1. vCard blocks ──────────────────────────────────────────────────────
    const vcardBlocks = raw.split(/BEGIN:VCARD/i);
    for (const block of vcardBlocks) {
        const fnMatch = block.match(/^FN[;:][^\n]*?:?([^\n]+)/mi);
        const telMatch = block.match(PHONE_RE);
        if (fnMatch && telMatch) {
            const candidateName = fnMatch[1]?.trim();
            const phone = telMatch[0].replace(/[\s\-]/g, "");
            if (candidateName && looksLikeName(candidateName)) {
                phoneToName.set(phone, candidateName);
            }
        }
    }

    const lines = raw.split(/\r?\n/);

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const phoneMatches = [...line.matchAll(new RegExp(PHONE_RE.source, "g"))];
        if (phoneMatches.length === 0) continue;

        for (const match of phoneMatches) {
            const phone = match[0].replace(/[\s\-]/g, "");
            if (phoneToName.has(phone)) continue; // already resolved via vCard

            // ── 2. WA chat export: "[date, time] Name: message" ──────────────
            const waLineMatch = line.match(/\[\d{1,2}\/\d{1,2}\/\d{2,4},\s*\d{1,2}:\d{2}(?::\d{2})?(?:\s*[APap][Mm])?\]\s*([^:]+):/);
            if (waLineMatch) {
                const candidate = waLineMatch[1].trim();
                if (looksLikeName(candidate)) { phoneToName.set(phone, candidate); continue; }
            }

            // ── 3. Adjacent line (line before or after) ──────────────────────
            const prevLine = i > 0 ? lines[i - 1].trim() : "";
            const nextLine = i < lines.length - 1 ? lines[i + 1].trim() : "";
            if (looksLikeName(prevLine) && !PHONE_RE.test(prevLine)) {
                phoneToName.set(phone, prevLine); continue;
            }
            if (looksLikeName(nextLine) && !PHONE_RE.test(nextLine)) {
                phoneToName.set(phone, nextLine); continue;
            }

            // ── 4. Inline name on same line (before or after the number) ─────
            const stripped = line.replace(match[0], "").replace(/[\-:,|]/g, " ").trim();
            if (looksLikeName(stripped)) {
                phoneToName.set(phone, stripped);
            }
        }
    }

    // Collect all phone numbers preserving order, with names where found
    const seen = new Set<string>();
    const result: { phone: string; name: string }[] = [];
    for (const m of raw.matchAll(new RegExp(PHONE_RE.source, "g"))) {
        const phone = m[0].replace(/[\s\-]/g, "");
        if (!seen.has(phone)) {
            seen.add(phone);
            result.push({ phone, name: phoneToName.get(phone) || "" });
        }
    }
    return result;
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
        let contacts: { phone: string; name: string }[];
        if (body.rawText) {
            contacts = extractContactsFromText(String(body.rawText));
        } else if (Array.isArray(body.numbers)) {
            contacts = extractContactsFromText(body.numbers.join("\n"));
        } else {
            return NextResponse.json({ error: "rawText or numbers array required" }, { status: 400 });
        }

        if (contacts.length === 0) {
            return NextResponse.json({ error: "No valid Nigerian phone numbers found in input" }, { status: 400 });
        }
        if (contacts.length > 5000) {
            return NextResponse.json({ error: "Max 5000 numbers per batch" }, { status: 400 });
        }

        const results = { created: 0, skipped: 0, errors: 0, details: [] as string[] };

        for (const contact of contacts) {
            const phone = String(contact.phone).trim().replace(/\s/g, "");
            if (!phone) continue;

            try {
                const normalized = WhatsAppService.normalizePhoneNumber(phone);
                if (!normalized) { results.errors++; continue; }

                const displayName = contact.name?.trim() || "WhatsApp User";

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
                    select: { id: true, name: true }
                });

                if (existing) {
                    // Update name if we now have a real name and they still have the generic one
                    if (existing.name === "WhatsApp User" && displayName !== "WhatsApp User") {
                        await prisma.user.update({ where: { id: existing.id }, data: { name: displayName } });
                    }
                    results.skipped++;
                    continue;
                }

                const userId = `wa_import_${normalized}_${Date.now().toString(36)}`;
                await prisma.user.create({
                    data: {
                        id: userId,
                        email: `wa_${normalized}@fairprice.ng`,
                        whatsappNumber: normalized,
                        name: displayName,
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
                total: contacts.length,
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
