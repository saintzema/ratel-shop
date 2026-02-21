import { NextResponse } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

export async function POST(req: Request) {
    if (!GEMINI_API_KEY) {
        return NextResponse.json({ error: "Gemini API key not configured" }, { status: 500 });
    }

    try {
        const { productName, region, mode = "analyze" } = await req.json();

        if (!productName) {
            return NextResponse.json({ error: "Product name is required" }, { status: 400 });
        }

        let prompt = "";

        if (mode === "search") {
            // Mode 1: Search Suggestions
            prompt = `
            You are a shopping assistant for RatelShop Nigeria.
            User Query: "${productName}"
            
            Task: Find 4-6 distinct, real products that match this query. 
            If the query is vague (e.g. "Tes"), suggest likely matches (e.g. "Tesla Model 3", "Tesla Cybertruck").
            If it's a category (e.g. "Phones"), list popular current models in Nigeria.
            CRITICAL SOURCING RULES:
            - If it's a car/vehicle (e.g. Tesla, Toyota): Search Jiji.ng, Cars45, or global export sites like Made-in-China, Alibaba, Temu.
            - If it's general electronics or everyday items: Search Jumia Nigeria, Konga, Slot.
            - For highly specific or long queries, extract the exact product intent.
            
            Return JSON:
            {
                "suggestions": [
                    { "name": "Full Product Name", "category": "Category", "approxPrice": number (Naira), "sourceUrl": "https://example.com/item" }
                ]
            }

            CRITICAL RULES:
            - The 'approxPrice' MUST be a realistic market value in Naira. It CANNOT be 0. We prefer quoting the highest likely market price so we don't under-promise.
            - Output ONLY raw, valid JSON. NO markdown. NO conversational text before or after the JSON.
            `;
        } else {
            // Mode 2: Deep Analysis (Temu/Global First)
            prompt = `
            You are a price intelligence engine for RatelShop Nigeria (Current Year).
            Product: "${productName}"
            
            Task: Determine the "Fair Price" for this product in Nigeria.
            
            CRITICAL SOURCING RULES:
            - For cars/vehicles: Prioritize Jiji.ng, Cars45, Made-in-China, Alibaba.
            - For electronics/everyday: Prioritize Jumia, Konga, Slot, PCPlace.
            
            logic:
            1. **Global Sourcing (Temu/AliExpress/Made-in-China)**: Check the global price (USD/CNY). Convert to Naira (₦1600/$).
               - Add Shipping: ~₦30,000 for small items, ~₦150,000 for heavy items.
               - Add Ratel Margin: 15%.
               - This is the "Global Direct Price".
               
            2. **Local Sourcing**: Check current Nigerian market prices (Jumia, Konga, slots, real-world markets).
               - Focus on the HIGHEST standard selling price that most vendors are listing it for.
            
            3. **Recommendation**: 
               - If Global Direct Price < Local Price, recommend Global (labeled "Ratel Global").
               - If Local is cheaper, recommend Local.
               - Ensure your "marketAverage" is reflective of the highest common price on the market, not artificially dragged down by outliers.
            
            Return JSON:
            {
                "productName": "${productName}",
                "marketAverage": number,
                "marketLow": number,
                "marketHigh": number,
                "recommendedPrice": number,
                "currency": "₦",
                "sources": [
                    { "source": "Ratel Global (Direct Source)", "price": number, "type": "global", "url": "https://..." },
                    { "source": "Verified Local Vendor", "price": number, "type": "local", "url": "https://..." }
                ],
                "priceDirection": "rising" | "stable" | "falling",
                "justification": "Explain why this price is fair (e.g. 'Cheaper to order via Ratel Global than buy locally' or 'Local market has excess stock').",
                "category": "phones" | "computers" | "fashion" | "cars" | "energy" | "other"
            }
            
            CRITICAL:
            - ANONYMIZE local store names (use "Verified Local Vendor").
            - IF sources include Temu/AliExpress/Made-in-China, label them as "Ratel Global".
            - Output ONLY raw, valid JSON. NO markdown. NO conversational text before or after the JSON. Start your response strictly with { and end with }. 
            `;
        }

        const response = await fetch(`${API_URL}?key=${GEMINI_API_KEY}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                tools: [{ google_search: {} }]
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Gemini API Error:", errorText);
            return NextResponse.json({ error: "Failed to fetch from Gemini" }, { status: response.status });
        }

        const data = await response.json();
        const candidates = data.candidates;

        if (!candidates || candidates.length === 0) {
            return NextResponse.json({ error: "No response from Gemini" }, { status: 500 });
        }

        const textResponse = candidates[0].content.parts[0].text;

        // Robust JSON extractor to ignore any accidental conversational text
        let jsonString = textResponse.replace(/```json/gi, "").replace(/```/g, "").trim();
        const jsonMatch = jsonString.match(/\{[\s\S]*\}|\[[\s\S]*\]/);

        if (jsonMatch) {
            jsonString = jsonMatch[0];
        }

        try {
            const parsedData = JSON.parse(jsonString);
            return NextResponse.json(parsedData);
        } catch (parseError) {
            console.error("Failed to parse Gemini JSON. Raw text:", textResponse);
            return NextResponse.json({ error: "Invalid JSON from Gemini" }, { status: 500 });
        }

    } catch (error) {
        console.error("API Route Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
