import { NextResponse } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

const RL_MAP = new Map<string, { count: number; reset: number }>();
const RL_MAX = 10;
const RL_WINDOW_MS = 60_000;

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
        - Ensure names and tones vary (different genders and Nigerian ethnic backgrounds).
        - Focus on user perspective and authenticity.
        - One of the reviews should mention the 'Fair Price' verification or 'Escrow' specifically.
        - Reviews should vary in length but remain concise.
        `;

        const response = await fetch(`${API_URL}?key=${GEMINI_API_KEY}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.8 }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Gemini API Error:", errorText);
            throw new Error(`Gemini API failed with status ${response.status} `);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
            throw new Error("No text returned from Gemini");
        }

        const cleanText = text.replace(/```json\s?/g, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(cleanText);

        return NextResponse.json(parsed);

    } catch (error) {
        console.error("Error in gemini-reviews route:", error);
        return NextResponse.json(
            { error: "Failed to generate reviews", details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}
