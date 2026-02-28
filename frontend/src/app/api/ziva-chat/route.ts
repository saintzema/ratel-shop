import { NextResponse } from 'next/server';
import { DEMO_PRODUCTS } from '@/lib/data';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

export async function POST(req: Request) {
    try {
        const { message, history, userName, catalogue } = await req.json();

        // 1. Prepare Product Context (simplified catalog for prompt)
        const productsToUse = catalogue || DEMO_PRODUCTS;
        const productContext = productsToUse.map((p: any) =>
            `- ID: ${p.id} | Name: ${p.name} (${p.category}) - ₦${p.price.toLocaleString()} ${p.description ? `- ${p.description.substring(0, 50)}...` : ''}`
        ).join("\n");

        const systemPrompt = `
        You are Ziva, the AI assistant for FairPrice (Nigeria's First AI-Regulated Marketplace).
        Your goal is to help users find products, check prices, and resolve issues.
        
        User Name: ${userName || "Valued Customer"}
        
        Current Product Catalog (Context):
        ${productContext}
        
        Capabilities:
        1. Answer questions about FairPrice products and prices using the context above.
        2. VERY IMPORTANT: You must ONLY suggest exact product names that exist in the "Current Product Catalog" above. Do not hallucinate or make up products, features, variants or prices. If a user asks for something not in the catalogue, simply say you do not have it in stock.
        3. Determine the "intent" of the user's message.
        4. If the user is angry, complaining about an order, requesting a refund, or asks for human support, set "shouldEscalate" to true.
        5. For suggested products, MUST provide the exact full Name from the catalogue so the system can link them.
        
        Return a JSON object with this EXACT structure (no markdown):
        {
            "message": "Your friendly, helpful response in markdown format. Use emojis!",
            "intent": "greeting" | "product_search" | "price_check" | "complaint" | "general" | "escalation",
            "shouldEscalate": boolean,
            "escalationReason": "Brief reason if escalating, else null",
            "suggestedProducts": ["Exact Product Name 1", "Exact Product Name 2"] (optional, only if relevant)
        }
        
        Keep responses concise (under 3 sentences unless explaining details).
        Be professional but warm. Use Nigerian English nuances occasionally if appropriate (e.g. "We gat you").
        `;

        // 2. Format History for Gemini
        const contents = [
            { role: "user", parts: [{ text: systemPrompt }] },
            ...history.map((msg: any) => ({
                role: msg.sender === "user" ? "user" : "model",
                parts: [{ text: msg.text }]
            })),
            { role: "user", parts: [{ text: message }] }
        ];

        // 3. Call Gemini
        const response = await fetch(`${API_URL}?key=${GEMINI_API_KEY}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents,
                generationConfig: { responseMimeType: "application/json" }
            })
        });

        if (!response.ok) {
            throw new Error(`Gemini API Error: ${response.statusText}`);
        }

        const data = await response.json();
        const text = data.candidates[0].content.parts[0].text;
        const result = JSON.parse(text);

        return NextResponse.json(result);

    } catch (error) {
        console.error("Ziva Chat Error:", error);
        return NextResponse.json({
            message: "I'm having a little trouble connecting to my brain right now. 🧠✨ Please try again in a moment.",
            intent: "error",
            shouldEscalate: false
        }, { status: 500 });
    }
}
