import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const dynamic = 'force-dynamic';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

/**
 * GET /api/economic-trends
 * Fetches the latest 5 Nigerian economic trends using Gemini.
 */
export async function GET() {
    try {
        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json({ error: "Gemini API Key missing" }, { status: 500 });
        }

        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.0-flash-exp",
            tools: [{ googleSearch: {} } as any] // Enabled search grounding
        });

        const prompt = `
            Act as a Nigerian economic analyst. Provide exactly 5 punchy, real-time economic trend points for Nigeria for mid-April 2026.
            Focus on:
            1. Current Petrol (Fuel) pump price estimate in major cities.
            2. USD/NGN Exchange rate (Official and Parallel/Black Market).
            3. Latest GDP growth projections or IMF updates for Nigeria.
            4. Food inflation or general consumer price index trends.
            5. Any major recent policy change affecting trade or imports (e.g. customs duties).

            Format each point as a short, catchy sentence (max 15 words) that a shopper or seller would find relevant.
            Return a JSON object: { "trends": ["string", "string", "string", "string", "string"] }
            Ensure the data is as real-time as possible.
        `;

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        
        // Extract JSON from response (handling potential markdown formatting)
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const data = JSON.parse(jsonMatch[0]);
            return NextResponse.json(data);
        }

        return NextResponse.json({ error: "Failed to parse trends" }, { status: 500 });
    } catch (error) {
        console.error("Economic trends fetch failed:", error);
        return NextResponse.json(
            { error: "Failed to fetch trends", details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}
