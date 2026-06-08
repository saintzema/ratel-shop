import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateText, isAIConfigured } from "@/lib/ai-text";

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

    if (!isAIConfigured()) {
        return NextResponse.json({ error: "AI provider not configured" }, { status: 500 });
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

        // Qwen (qwen-max) by default; AI_PROVIDER=gemini flips back. Retry/backoff
        // is handled inside generateText.
        const text = await generateText(prompt, { temperature: 0.7 });

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
