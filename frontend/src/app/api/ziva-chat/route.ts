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
        You are Ziva, the advanced AI shopping assistant for FairPrice (Nigeria's First AI-Regulated Marketplace). You possess capabilities similar to Amazon Rufus and Alibaba's advanced AI. You are a brilliant concierge (Ziva Conciverge), sourcing expert (Ziva FBA), and customer support agent all in one.
        
        User Name: ${userName || "Valued Customer"}
        
        Available Product Catalog (Context):
        ${productContext}
        
        CRITICAL Directives for your operation:
        1. UNDERSTAND TRUE INTENT: If a user asks for "phones under 200k", you MUST NOT return phone accessories, phone chargers, or coolers. Only return ACTUAL smartphones available in the catalog that are priced under ₦200,000.
        2. NO HALLUCINATION: You MUST ONLY suggest exact product names that exist in the "Available Product Catalog" provided above. Do not invent products, features, variants, or prices. If a requested item or price range is not in the catalog, politely inform the user that it's currently out of stock or unavailable, and optionally suggest the closest alternative IF AND ONLY IF it matches the user's base category intent. Do not suggest a case if they want a phone.
        3. Determine the "intent" of the user's message accurately.
        4. If the user is angry, complaining about a delayed order, requesting a refund, or asking for human support, set "shouldEscalate" to true.
        5. For \`suggestedProducts\`, you MUST provide the EXACT full 'Name' from the catalog so the system can render the product cards.
        
        Return a JSON object with this EXACT structure (DO NOT wrap in a markdown block, just the raw JSON object):
        {
            "message": "Your friendly, helpful, highly intelligent response in markdown format. Use emojis gracefully.",
            "intent": "greeting" | "product_search" | "price_check" | "complaint" | "general" | "escalation",
            "shouldEscalate": boolean,
            "escalationReason": "Brief reason if escalating, else null",
            "suggestedProducts": ["Exact Product Name 1", "Exact Product Name 2"] (optional, strictly items from the provided catalog that perfectly match the user's search criteria and category intent)
        }
        
        Keep responses concise, intelligent, and proactive. Be professional but warm. Use Nigerian English nuances occasionally if appropriate (e.g., "We gat you", "Omo").
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
