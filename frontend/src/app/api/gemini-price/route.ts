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
            
            Return JSON:
            {
                "suggestions": [
                    { "name": "Full Product Name", "category": "Category", "approxPrice": number (Naira) }
                ]
            }
            `;
        } else {
            // Mode 2: Deep Analysis (Temu/Global First)
            prompt = `
            You are a price intelligence engine for RatelShop Nigeria (2025).
            Product: "${productName}"
            
            Task: Determine the "Fair Price" for this product in Nigeria.
            
            logic:
            1. **Global Sourcing (Temu/AliExpress)**: Check the global price (USD/CNY). Convert to Naira (₦1500/$).
               - Add Shipping: ~₦30,000 for small items, ~₦150,000 for heavy items.
               - Add Ratel Margin: 15%.
               - This is the "Global Direct Price".
               
            2. **Local Sourcing**: Check current Nigerian market prices (Jumia, Konga, slots, real-world markets).
            
            3. **Recommendation**: 
               - If Global Direct Price < Local Price, recommend Global (labeled "Ratel Global").
               - If Local is cheaper, recommend Local.
            
            Return JSON:
            {
                "productName": "${productName}",
                "marketAverage": number,
                "marketLow": number,
                "marketHigh": number,
                "recommendedPrice": number,
                "currency": "₦",
                "sources": [
                    { "source": "Ratel Global (Temu Source)", "price": number, "type": "global" },
                    { "source": "Local Market Vendor", "price": number, "type": "local" }
                ],
                "priceDirection": "rising" | "stable" | "falling",
                "justification": "Explain why this price is fair (e.g. 'Cheaper to import via Ratel Global than buy locally' or 'Local market has excess stock').",
                "category": "phones" | "computers" | "fashion" | "cars" | "energy" | "other"
            }
            
            CRITICAL:
            - ANONYMIZE local store names (use "Verified Local Vendor").
            - IF sources include Temu/AliExpress, label them as "Ratel Global".
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
        const jsonString = textResponse.replace(/```json/g, "").replace(/```/g, "").trim();

        try {
            const parsedData = JSON.parse(jsonString);
            return NextResponse.json(parsedData);
        } catch (parseError) {
            console.error("Failed to parse Gemini JSON:", textResponse);
            return NextResponse.json({ error: "Invalid JSON from Gemini" }, { status: 500 });
        }

    } catch (error) {
        console.error("API Route Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
