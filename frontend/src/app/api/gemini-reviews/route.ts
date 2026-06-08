import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateText, isAIConfigured } from "@/lib/ai-text";

const RL_MAP = new Map<string, { count: number; reset: number }>();
const RL_MAX = 20; // Increased from 10
const RL_WINDOW_MS = 60_000;

// Cache TTL: 7 days for reviews (they don't change often)
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

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

function getMockReviews(productName: string) {
    const names = ["Chidi O.", "Amaka N.", "Tunde B.", "Funke A.", "Mustapha I.", "Efe M.", "Blessing J.", "Ibrahim S."];
    const titles = ["Legit deal", "No stories", "Standard item", "Sharp delivery", "Very okay", "Good quality"];
    const bodies = [
        `Received my ${productName} today. The quality is standard and the delivery was very sharp. No stories at all.`,
        `FairPrice.ng is legit. I was worried about my money but their escrow system gave me peace of mind. Highly recommended.`,
        `The ${productName} works perfectly. Faster delivery than I expected. No wahala throughout the process.`,
        `Standard product. Best price I found online in Nigeria. Verified fair price is definitely real.`,
        `I've tried other marketplaces but FairPrice service is just different. Very transparent and safe.`,
    ];

    const count = 3 + Math.floor(Math.random() * 3);
    const reviews = [];
    const usedNames = new Set();

    for (let i = 0; i < count; i++) {
        let name = names[Math.floor(Math.random() * names.length)];
        while (usedNames.has(name)) {
            name = names[Math.floor(Math.random() * names.length)];
        }
        usedNames.add(name);

        reviews.push({
            user_name: name,
            rating: 4 + Math.floor(Math.random() * 2),
            title: titles[Math.floor(Math.random() * titles.length)],
            body: bodies[Math.floor(Math.random() * bodies.length)],
            verified_purchase: true,
            created_at: new Date(Date.now() - Math.random() * 20 * 24 * 60 * 60 * 1000).toISOString()
        });
    }
    return { reviews };
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
        const cacheKey = `reviews:${productName.trim().toLowerCase()}`;
        try {
            const cached = await db.searchCache.findUnique({ where: { query: cacheKey } });
            if (cached && Date.now() - cached.updatedAt.getTime() < CACHE_TTL_MS) {
                return NextResponse.json(cached.products as any, { headers: { "X-Cache": "HIT" } });
            }
        } catch (e) {
            console.warn("[gemini-reviews] cache read failed");
        }

        const prompt = `
        You are an expert e-commerce review curator for FairPrice.ng — Nigeria's most trusted marketplace.
        Product Name: "${productName}"
        Category: "${category || 'General'}"
        
        Task: Create 3 to 5 high-quality, authentic-sounding customer reviews for this product.
        
        Output MUST be valid JSON matching this exact structure:
        {
            "reviews": [
                {
                    "user_name": "A Nigerian-sounding name (e.g. Chidi O., Amaka N., Tunde B., Funke A., Mustapha I., Efe M.)",
                    "rating": 5,
                    "title": "A short, punchy title in Nigerian context (e.g. 'Standard item', 'Sharp delivery', 'Legit deal', 'No stories')",
                    "body": "A short, authentic review (2-3 sentences). Praise FairPrice.ng's service, fast delivery, or escrow safety. Mention how it's better than other online stores regarding price transparency or security. Use common Nigerian English markers like 'legit', 'standard', 'sharp', 'no wahala' where appropriate, but keep it professional. AVOID naming specific competitors like Jumia or Konga — just say 'other marketplaces' or 'elsewhere online'.",
                    "verified_purchase": true,
                    "created_at": "ISO Date string within the last 30 days"
                }
            ]
        }
        
        CRITICAL RULES:
        - Output ONLY raw, valid JSON. NO markdown.
        - Generate 3 to 5 unique reviews.
        `;

        // Qwen (qwen-max) by default; AI_PROVIDER=gemini flips back. On any failure
        // we fall back to realistic mock reviews so the PDP never renders empty.
        let text: string;
        try {
            text = await generateText(prompt, { temperature: 0.8 });
        } catch (err) {
            console.error("AI reviews generation failed, using mock:", err);
            const mock = getMockReviews(productName);
            db.searchCache.upsert({
                where: { query: cacheKey },
                create: { query: cacheKey, products: mock as any },
                update: { products: mock as any },
            }).catch(() => {});
            return NextResponse.json(mock, { headers: { "X-Fallback": "MOCK" } });
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
        console.error("Error in gemini-reviews route:", error);
        // ABSOLUTE FAILSAFE
        try {
            const { productName } = await req.json();
            return NextResponse.json(getMockReviews(productName || "Product"), { status: 200 });
        } catch {
            return NextResponse.json({ error: "Failed to generate reviews" }, { status: 500 });
        }
    }
}
