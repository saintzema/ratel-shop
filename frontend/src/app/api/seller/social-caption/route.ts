import { NextResponse } from "next/server";
import { aiJSON } from "@/lib/ai-provider";
import { getUserFromRequest } from "@/lib/jwt";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

const RL_MAP = new Map<string, { count: number; reset: number }>();
const RL_MAX = 15;
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

/**
 * POST /api/seller/social-caption
 * Generates a short, human-sounding social caption for a product a seller
 * wants to post — deliberately NOT the same prompt as gemini-seller's PDP
 * copy (that's 150+ words of Amazon-style listing copy; a caption needs to
 * read like a person wrote it in 20 seconds, not marketing copy).
 */
export async function POST(req: Request) {
    // This spends real Gemini/Fireworks credits per call. The IP rate limit below
    // is in-memory and per-instance, so it resets on every cold start and doesn't
    // hold across the serverless fleet — on its own it was not meaningful
    // protection against anyone burning the AI budget from an open endpoint.
    // Only signed-in users can generate captions.
    const user = getUserFromRequest(req);
    if (!user) {
        return NextResponse.json({ error: "Sign in to generate captions" }, { status: 401 });
    }

    if (!checkRateLimit(req)) {
        return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    try {
        const { productName, price, description, platform } = await req.json();
        if (!productName) {
            return NextResponse.json({ error: "Product name is required" }, { status: 400 });
        }

        const platformNote = platform
            ? `Target platform: ${platform}. Match its normal tone (e.g. WhatsApp is more direct/personal, Instagram/Facebook can be a little more descriptive, X/TikTok should be short and punchy).`
            : "";

        const prompt = `Write a short social media caption to sell this product, for a Nigerian small-business seller posting on their own page.

Product: "${productName}"
${price ? `Price: ₦${Number(price).toLocaleString()}` : ""}
${description ? `Details: ${description.slice(0, 300)}` : ""}
${platformNote}

CRITICAL RULES:
- Sound like a real human wrote it in one take — NOT like AI marketing copy. No "Introducing...", no "Elevate your...", no corporate buzzwords.
- Do NOT use emojis at all. None. Not even one.
- Keep it 2-4 short sentences, casual Nigerian English is fine (e.g. "still available", "no wahala", "sharp sharp") but don't force it.
- Mention the price naturally if given, and ALWAYS write it with the naira symbol
  in front of the figure — "₦10,500,000". Never write it as the word "naira"
  lowercase after the number ("10.5 million naira"), which reads as sloppy. If you
  do spell it out for readability, capitalise it: "₦10.5 million".
- End with a simple, direct call to action (e.g. "DM to order" or "WhatsApp me to grab yours").
- Output ONLY the caption text. No quotes, no markdown, no labels like "Caption:".`;

        const ai = await aiJSON<{ caption: string }>({
            system: "Output ONLY one valid JSON object: {\"caption\": \"...\"}. No markdown, no extra text.",
            prompt: prompt + '\n\nReturn as JSON: {"caption": "the caption text"}',
            temperature: 0.8,
            maxTokens: 300,
        });
        if (!ai?.data?.caption) {
            return NextResponse.json({ error: "AI caption service is temporarily unavailable." }, { status: 502 });
        }
        return NextResponse.json({ caption: ai.data.caption.trim() }, { headers: { "X-Provider": ai.provider } });
    } catch (error: any) {
        console.error("[social-caption] error:", error);
        return NextResponse.json({ error: "Failed to generate caption" }, { status: 500 });
    }
}
