import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fireworksJSON, isFireworksEnabled, fireworksModel } from "@/lib/fireworks";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

const RL_MAP = new Map<string, { count: number; reset: number }>();
const RL_MAX = 15;
const RL_WINDOW_MS = 60_000;

// Cache TTL: 30 days for product content (rarely changes)
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function checkRateLimit(req: Request): boolean {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const now = Date.now();
    const entry = RL_MAP.get(ip);
    if (!entry || now > entry.reset) {
        RL_MAP.set(ip, { count: 1, reset: now + RL_WINDOW_MS });
        return true;
    }
    entry.count++;
    return entry.count <= RL_MAX;
}

export async function POST(req: Request) {
    if (!checkRateLimit(req)) {
        return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    if (!GEMINI_API_KEY) {
        return NextResponse.json({ error: "Gemini API key not configured" }, { status: 500 });
    }

    try {
        const { productName, category } = await req.json();

        if (!productName) {
            return NextResponse.json({ error: "Product name is required" }, { status: 400 });
        }

        // ─── CACHE CHECK ───
        const cacheKey = `seller:${productName.trim().toLowerCase()}`;
        try {
            const cached = await db.searchCache.findUnique({ where: { query: cacheKey } });
            if (cached && Date.now() - cached.updatedAt.getTime() < CACHE_TTL_MS) {
                return NextResponse.json(cached.products as any, { headers: { "X-Cache": "HIT" } });
            }
        } catch (e) {
            console.warn("[gemini-seller] cache read failed");
        }

        const prompt = `
        You are an expert e-commerce copywriter for FairPrice Nigeria — Africa's most trusted marketplace.
        Product Name: "${productName}"
        Category: "${category || 'General'}"
        
        Task: Create a premium, Amazon/Temu-quality product listing with rich, detailed content.
        
        Output MUST be valid JSON matching this exact structure:
        {
            "description": "A compelling, 3-4 paragraph product description. Write like a top Amazon listing — authoritative, benefit-driven, and trust-building.",
            "highlights": ["Point 1", "Point 2", "Point 3", "Point 4", "Point 5", "Point 6"],
            "specs": { "Brand": "...", "Model": "...", "...": "..." },
            "subcategory": "string",
            "tags": ["tag1", "tag2", "tag3"],
            "colors": ["Color 1", "Color 2"]
        }
        
        CRITICAL RULES:
        - Output ONLY raw, valid JSON. NO markdown.
        - Description must be at least 150 words.
        `;

        // TEMP DIAGNOSTIC — remove after confirming why Fireworks isn't being called.
        // Deliberately exposes no credential material, only presence/length, since this
        // is a public unauthenticated endpoint.
        if (productName === "__DIAGNOSTIC__") {
            const key = process.env.FIREWORKS_API_KEY || "";
            return NextResponse.json({
                fireworksEnabled: isFireworksEnabled(),
                keyLength: key.length,
            });
        }

        // ── Fireworks AI (AMD GPUs) — PRIMARY provider ───────────────────────────
        // Generates the product listing on AMD-hosted inference when configured. Falls
        // through to Gemini on any failure so seller/admin auto-fill never breaks.
        if (isFireworksEnabled()) {
            const fw = await fireworksJSON<any>({
                system: "You are an expert Nigerian e-commerce copywriter. Output ONLY one valid JSON object, no markdown.",
                prompt,
                temperature: 0.7,
                maxTokens: 1600,
            });
            if (fw && fw.description) {
                db.searchCache.upsert({
                    where: { query: cacheKey },
                    create: { query: cacheKey, products: fw as any },
                    update: { products: fw as any },
                }).catch(() => {});
                return NextResponse.json(fw, {
                    headers: { "X-Cache": "MISS", "X-Provider": "fireworks", "X-Model": fireworksModel() },
                });
            }
        }

        const fetchWithRetry = async (attempt = 0): Promise<Response> => {
            const res = await fetch(`${API_URL}?key=${GEMINI_API_KEY}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { temperature: 0.7 }
                })
            });
            if ((res.status === 429 || res.status === 503) && attempt < 5) {
                const backoffMs = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
                await new Promise(r => setTimeout(r, backoffMs));
                return fetchWithRetry(attempt + 1);
            }
            return res;
        };

        const response = await fetchWithRetry();

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Gemini API Error:", response.status, errorText);
            if (response.status === 429) {
                return NextResponse.json(
                    { error: "AI service is currently at capacity. Please try again in 30 seconds." },
                    { status: 429 }
                );
            }
            throw new Error(`Gemini API failed with status ${response.status}`);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
            throw new Error("No text returned from Gemini");
        }

        const cleanText = text.replace(/```json\s?/g, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(cleanText);

        // WRITE TO CACHE
        db.searchCache.upsert({
            where: { query: cacheKey },
            create: { query: cacheKey, products: parsed as any },
            update: { products: parsed as any },
        }).catch(() => {});

        return NextResponse.json(parsed, { headers: { "X-Cache": "MISS" } });

    } catch (error) {
        console.error("Error in gemini-seller route:", error);
        return NextResponse.json(
            { error: "Failed to generate content", details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}
