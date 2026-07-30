import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/jwt";
import { fireworksJSON, isFireworksEnabled, fireworksModel } from "@/lib/fireworks";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

interface QuoteDraft {
    title: string;
    items: { description: string; qty: number; unitPrice: number }[];
    notes: string;
}

/**
 * POST /api/seller/quotes/generate  { request: string }
 *
 * Turns a natural-language ask ("quote for a 3.5KVA solar installation with
 * workmanship") into structured, editable line items with the AI's best
 * estimate of real current Nigerian market prices. This is a starting draft,
 * not a live pricing feed — the seller is expected to review/edit every price
 * before sending, and the UI must say so; the AI can get a market price wrong
 * and we never want a client charged on a hallucinated figure without the
 * seller's eyes on it first.
 */
export async function POST(req: NextRequest) {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let body: { request?: string };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }

    const ask = (body.request || "").trim();
    if (!ask) return NextResponse.json({ error: "Describe what the quote is for" }, { status: 400 });

    const prompt = `You are helping a Nigerian small-business seller draft a price quote to send a client.

Client request: "${ask}"

Break this down into realistic, itemized line items (materials, components, labor/workmanship, delivery/logistics if relevant — whatever genuinely applies to this request) with your best current estimate of REAL Nigerian market prices in Naira (NGN) for each item as of now. Be specific and realistic, not round guesses — e.g. actual known price ranges for real equipment/materials/services in Nigeria.

Output ONLY this JSON:
{
    "title": "Short quote title, e.g. '3.5KVA Solar Installation'",
    "items": [
        { "description": "specific item or service", "qty": 1, "unitPrice": 000000 }
    ],
    "notes": "One short sentence of context/assumptions the seller should double check (e.g. 'Assumes standard rooftop mounting; site survey may change wiring costs')."
}

RULES:
- unitPrice is in NGN, a plain number (no currency symbol, no commas).
- Include AT LEAST 3 line items for anything involving installation/import/service work (materials/goods + labor + any logistics), not just one lump sum.
- Never invent a brand-specific price you're not reasonably confident about — use a realistic market range's midpoint instead.
- Output raw JSON only, no markdown fences.`;

    let draft: QuoteDraft | null = null;

    if (isFireworksEnabled()) {
        const fw = await fireworksJSON<QuoteDraft>({
            system: "Output ONLY one valid JSON object, no markdown, no explanation.",
            prompt,
            temperature: 0.4,
            // "AT LEAST 3 line items" with realistic multi-clause descriptions
            // (materials + specs) plus a notes field routinely needs more than
            // 1000 tokens for a 6-7 item quote — a live example truncated mid-
            // response, which produced syntactically-valid-but-empty leading
            // items (missing description/price) once JSON.parse recovered
            // what it could. 2000 gives real headroom without being unbounded.
            maxTokens: 2000,
        });
        if (fw?.items?.length) draft = fw;
    }

    if (!draft && GEMINI_API_KEY) {
        try {
            const res = await fetch(`${API_URL}?key=${GEMINI_API_KEY}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { temperature: 0.4 },
                }),
            });
            if (res.ok) {
                const data = await res.json();
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) {
                    const clean = text.replace(/```json\s?/g, "").replace(/```/g, "").trim();
                    draft = JSON.parse(clean);
                }
            }
        } catch { /* fall through to error below */ }
    }

    // Real observed model failure modes this sanitizes:
    //  1. Some items come back with description/unitPrice entirely missing
    //     (blank name, ₦0) — useless line items that leaked straight into a
    //     client-facing quote/PDF before this existed.
    //  2. Some items echo the JSON field name into its own value —
    //     `"description": "description: 2000W Brushless DC Hub Motor..."` —
    //     so the literal word "description:" showed up in the rendered quote.
    const cleanedItems = (draft?.items || [])
        .map(i => {
            let description = String(i?.description || "").trim();
            description = description.replace(/^description\s*:\s*/i, "").trim();
            return {
                description,
                qty: Math.max(1, Number(i?.qty) || 1),
                unitPrice: Math.max(0, Number(i?.unitPrice) || 0),
            };
        })
        // A blank description is never usable; a genuinely free line item
        // (unitPrice 0) is rare enough in this context that combined with no
        // description it's reliably a malformed entry, not an intentional freebie.
        .filter(i => i.description.length > 0 && !(i.unitPrice === 0 && i.description.length < 3));

    if (!draft || cleanedItems.length === 0) {
        return NextResponse.json({ error: "Couldn't draft a quote from that — try describing it with more detail." }, { status: 502 });
    }

    return NextResponse.json({
        title: draft.title || ask.slice(0, 60),
        items: cleanedItems,
        notes: draft.notes || "",
    });
}
