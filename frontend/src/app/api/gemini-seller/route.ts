import { NextResponse } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

export async function POST(req: Request) {
    if (!GEMINI_API_KEY) {
        return NextResponse.json({ error: "Gemini API key not configured" }, { status: 500 });
    }

    try {
        const { productName, category } = await req.json();

        if (!productName) {
            return NextResponse.json({ error: "Product name is required" }, { status: 400 });
        }

        const prompt = `
        You are an expert e-commerce copywriter for FairPrice Nigeria.
        Product Name: "${productName}"
        Category: "${category || 'General'}"
        
        Task: Create a high-converting, professional product listing.
        
        Output MUST be valid JSON matching this exact structure:
        {
            "description": "A compelling, 2-3 paragraph product description highlighting value, quality, and use cases.",
            "highlights": [
                "Key selling point 1",
                "Key selling point 2",
                "Key selling point 3",
                "Key selling point 4",
                "Key selling point 5"
            ],
            "specs": {
                "Brand/Material": "...",
                "Key Feature": "...",
                "Dimensions/Size": "...",
                "Warranty": "..."
            },
            "subcategory": "A specific subcategory string (e.g. 'Smartphones', 'Laptops', 'Men\\'s Shoes')",
            "colors": ["Color 1", "Color 2", "Color 3"]
        }
        
        CRITICAL RULES:
        - Output ONLY raw, valid JSON. NO markdown formatting. NO conversational text.
        - The JSON must begin with { and end with }.
        - Keep the highlights punchy.
        - Generate 4 to 6 relevant key-value pairs for the specs based on what the product likely is.
        - Suggest 2-4 standard colors if applicable to the product type, otherwise empty array.
        `;

        const response = await fetch(`${API_URL}?key=${GEMINI_API_KEY}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.7 }
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
        console.error("Error in gemini-seller route:", error);
        return NextResponse.json(
            { error: "Failed to generate content", details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}
