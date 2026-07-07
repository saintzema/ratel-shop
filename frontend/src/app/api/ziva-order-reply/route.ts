import { NextResponse } from "next/server";
import { fireworksChat, isFireworksEnabled } from "@/lib/fireworks";

export const dynamic = "force-dynamic";

/**
 * POST /api/ziva-order-reply
 *
 * Ziva's order-tracking replies used to be a rigid hardcoded template — accurate, but not
 * a real conversation. The order LOOKUP stays 100% local/deterministic (never let a model
 * invent order facts); only the PHRASING of the real, already-fetched data becomes
 * AI-generated. Falls back to null on any failure so the caller can use its existing
 * template — this never blocks or breaks order tracking.
 */
export async function POST(req: Request) {
    try {
        const { userInput, orders } = await req.json();

        if (!isFireworksEnabled()) {
            return NextResponse.json({ message: null });
        }

        const system = `You are Ziva, FairPrice's warm and helpful AI order concierge. You are given a customer's message and their REAL order data as JSON. Write a short, natural, conversational reply (2-4 sentences, markdown allowed) that answers what they actually asked, using ONLY the facts in the order data provided. Never invent details (no fake delivery dates, no fake carrier names) that aren't in the data. If the data doesn't answer their specific question, say so plainly and suggest they check back or contact support — don't guess.`;

        const prompt = `Customer said: "${userInput}"\n\nTheir order data:\n${JSON.stringify(orders, null, 2)}`;

        const message = await fireworksChat({
            system,
            prompt,
            temperature: 0.6,
            maxTokens: 300,
        });

        return NextResponse.json({ message });
    } catch (error: any) {
        console.error("[ziva-order-reply] error:", error?.message);
        return NextResponse.json({ message: null });
    }
}
