import { NextResponse } from 'next/server';
import { DEMO_PRODUCTS } from '@/lib/data';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

/* ──────────────────────────────────────────────────────────
   Server-Side Tool Implementations
   (Inspired by Google ADK Personalized Shopping Agent)
   ────────────────────────────────────────────────────────── */

function searchCatalog(keywords: string, catalogue: any[], searchCache: any[], maxBudget?: number): any {
    const q = keywords.toLowerCase();
    const tokens = q.split(/\s+/).filter(t => t.length > 2);

    // Category synonym map — maps generic terms to specific brand/product keywords
    const synonymMap: Record<string, string[]> = {
        'phone': ['iphone', 'samsung', 'galaxy', 'pixel', 'xiaomi', 'redmi', 'oppo', 'vivo', 'tecno', 'infinix', 'itel', 'huawei', 'oneplus', 'smartphone', 'android'],
        'phones': ['iphone', 'samsung', 'galaxy', 'pixel', 'xiaomi', 'redmi', 'oppo', 'vivo', 'tecno', 'infinix', 'itel', 'huawei', 'oneplus', 'smartphone', 'android'],
        'laptop': ['macbook', 'thinkpad', 'dell', 'hp', 'lenovo', 'asus', 'acer', 'surface', 'chromebook', 'notebook'],
        'laptops': ['macbook', 'thinkpad', 'dell', 'hp', 'lenovo', 'asus', 'acer', 'surface', 'chromebook', 'notebook'],
        'earbuds': ['airpods', 'buds', 'earphone', 'headphone', 'headset', 'beats', 'jbl'],
        'headphones': ['airpods', 'buds', 'earphone', 'earbuds', 'headset', 'beats', 'jbl', 'sony wh'],
        'watch': ['smartwatch', 'apple watch', 'galaxy watch', 'fitbit', 'garmin'],
        'watches': ['smartwatch', 'apple watch', 'galaxy watch', 'fitbit', 'garmin'],
        'console': ['playstation', 'xbox', 'nintendo', 'ps4', 'ps5', 'switch'],
        'gaming': ['playstation', 'xbox', 'nintendo', 'ps4', 'ps5', 'gaming laptop', 'gaming phone'],
        'tablet': ['ipad', 'samsung tab', 'galaxy tab', 'fire tablet', 'surface pro'],
        'tv': ['television', 'smart tv', 'led tv', 'oled', 'samsung tv', 'lg tv'],
    };

    // Expand search tokens with synonyms
    const expandedTokens = new Set(tokens);
    for (const token of tokens) {
        const syns = synonymMap[token];
        if (syns) {
            syns.forEach(s => expandedTokens.add(s));
        }
    }

    const score = (p: any) => {
        const name = (p.name || '').toLowerCase();
        const cat = (p.category || '').toLowerCase();
        const desc = (p.description || '').toLowerCase();
        let s = 0;
        // Exact full-query match
        if (name.includes(q)) s += 50;
        // Original token matching
        for (const t of tokens) {
            if (name.includes(t)) s += 15;
            if (cat.includes(t)) s += 10;
            if (desc.includes(t)) s += 5;
        }
        // Synonym-expanded matching (check if product matches any expanded term)
        for (const syn of expandedTokens) {
            if (!tokens.includes(syn)) { // Only score synonyms, not original tokens (already scored)
                if (name.includes(syn)) s += 12;
                if (cat.includes(syn)) s += 8;
            }
        }
        // Category-level boost: if user asked for "phone" and product category IS "phones"
        if (cat === 'phones' && (tokens.includes('phone') || tokens.includes('phones'))) s += 20;
        if (cat === 'laptops' && (tokens.includes('laptop') || tokens.includes('laptops'))) s += 20;
        return s;
    };

    // Search both catalog and cache
    const allProducts = [
        ...catalogue.map(p => ({ ...p, _src: 'catalog' })),
        ...searchCache.map(p => ({ ...p, _src: 'cache' }))
    ];

    let results = allProducts
        .map(p => ({ ...p, _score: score(p) }))
        .filter(p => p._score > 10)
        .sort((a, b) => b._score - a._score);

    if (maxBudget && maxBudget > 0) {
        results = results.filter(p => p.price <= maxBudget);
    }

    const top = results.slice(0, 8);

    return {
        found: top.length,
        products: top.map(p => ({
            name: p.name,
            price: p.price,
            category: p.category,
            source: p._src,
            id: p.id
        })),
        summary: top.length > 0
            ? `Found ${top.length} product${top.length > 1 ? 's' : ''} matching "${keywords}".`
            : `No products found matching "${keywords}" in our catalog or recent searches.`
    };
}

function exploreProduct(productName: string, catalogue: any[], searchCache: any[]): any {
    const q = productName.toLowerCase();
    const allProducts = [...catalogue, ...searchCache];
    const match = allProducts.find(p => (p.name || '').toLowerCase().includes(q)) ||
        allProducts.find(p => {
            const tokens = q.split(/\s+/).filter(t => t.length > 2);
            return tokens.every(t => (p.name || '').toLowerCase().includes(t));
        });

    if (!match) {
        return { found: false, message: `Could not find "${productName}" in our catalog. Try searching for it first.` };
    }

    return {
        found: true,
        product: {
            name: match.name,
            price: match.price,
            originalPrice: match.original_price || null,
            category: match.category,
            description: match.description || 'No description available.',
            specs: match.specs || {},
            rating: match.avg_rating || 0,
            reviewCount: match.review_count || 0,
            sellerId: match.seller_id,
            sellerName: match.seller_name || 'Unknown Seller',
            priceFlag: match.price_flag || 'unknown',
            id: match.id
        }
    };
}

function comparePrices(productNames: string[], catalogue: any[], searchCache: any[]): any {
    const allProducts = [...catalogue, ...searchCache];
    const products = productNames.map(name => {
        const q = name.toLowerCase();
        const match = allProducts.find(p => (p.name || '').toLowerCase().includes(q)) ||
            allProducts.find(p => {
                const tokens = q.split(/\s+/).filter(t => t.length > 2);
                return tokens.length > 0 && tokens.every(t => (p.name || '').toLowerCase().includes(t));
            });
        return match ? {
            name: match.name,
            price: match.price,
            originalPrice: match.original_price || null,
            category: match.category,
            rating: match.avg_rating || 0,
            priceFlag: match.price_flag || 'unknown',
            id: match.id
        } : { name, price: null, notFound: true };
    });

    const found = products.filter(p => !p.notFound);
    const cheapest = found.length > 0 ? found.reduce((a, b) => (a.price! < b.price! ? a : b)) : null;

    return {
        products,
        cheapest: cheapest ? cheapest.name : null,
        summary: found.length > 0
            ? `Compared ${found.length} products. ${cheapest ? `Best price: ${cheapest.name} at ₦${cheapest.price?.toLocaleString()}.` : ''}`
            : 'Could not find any of the requested products for comparison.'
    };
}

/* ──────────────────────────────────────────────────────────
   Gemini Function Declarations (Tool Definitions)
   ────────────────────────────────────────────────────────── */

const toolDeclarations = [
    {
        function_declarations: [
            {
                name: "search_catalog",
                description: "Search the FairPrice product catalog and cached search results for products matching keywords. Use this when the user wants to find, browse, or discover products.",
                parameters: {
                    type: "object",
                    properties: {
                        keywords: { type: "string", description: "Search keywords (e.g. 'iPhone 15', 'gaming laptop under 500k')" },
                        max_budget: { type: "number", description: "Optional maximum budget in Naira" }
                    },
                    required: ["keywords"]
                }
            },
            {
                name: "explore_product",
                description: "Get detailed information about a specific product including specs, description, price, reviews, and seller info. Use this when the user wants to know more about a particular product.",
                parameters: {
                    type: "object",
                    properties: {
                        product_name: { type: "string", description: "The product name to explore" }
                    },
                    required: ["product_name"]
                }
            },
            {
                name: "compare_prices",
                description: "Compare prices and features of multiple products side by side. Use this when the user wants to compare options or find the best deal.",
                parameters: {
                    type: "object",
                    properties: {
                        product_names: {
                            type: "array",
                            items: { type: "string" },
                            description: "List of product names to compare (2-4 products)"
                        }
                    },
                    required: ["product_names"]
                }
            }
        ]
    }
];

/* ──────────────────────────────────────────────────────────
   Main API Handler
   ────────────────────────────────────────────────────────── */

export async function POST(req: Request) {
    try {
        const { message, history, userName, catalogue, searchCache, browsingHistory } = await req.json();

        const productsToUse = catalogue || DEMO_PRODUCTS;
        const cacheToUse = searchCache || [];

        // Build product context summary (compact)
        const productSummary = productsToUse.slice(0, 30).map((p: any) =>
            `${p.name} (${p.category}) ₦${p.price?.toLocaleString()}`
        ).join(" | ");

        const cacheSummary = cacheToUse.length > 0
            ? `\nCached: ${cacheToUse.slice(0, 15).map((p: any) => `${p.name} ₦${p.price?.toLocaleString()}`).join(" | ")}`
            : '';

        const historySummary = browsingHistory && browsingHistory.length > 0
            ? `\nRecently viewed: ${browsingHistory.slice(0, 5).map((p: any) => p.name).join(", ")}`
            : '';

        const systemPrompt = `You are Ziva, the advanced AI shopping assistant for FairPrice (Nigeria's First AI-Regulated Marketplace). You work like Amazon Rufus — a brilliant shopping concierge powered by tools.

User: ${userName || "Valued Customer"}

AVAILABLE TOOLS:
- search_catalog: Search our product catalog + cached results. Use for ANY product search/browse request.
- explore_product: Get detailed specs, reviews, price analysis. Use when user asks about a specific product.
- compare_prices: Compare 2-4 products side by side. Use when user wants to compare options.

CATALOG SNAPSHOT: ${productSummary}${cacheSummary}${historySummary}

INTERACTION FLOW (follow this like the Google Shopping Agent):
1. UNDERSTAND what the user wants (product type, budget, features)
2. SEARCH using search_catalog tool if they want to find products
3. PRESENT results clearly with prices and key details
4. EXPLORE deeper if they pick a product (use explore_product)
5. COMPARE if they're deciding between options (use compare_prices)

RULES:
- ALWAYS use your tools for product queries — don't guess or hallucinate products
- Use the exact product names from tool results in suggestedProducts
- Be proactive: if they ask about a product, explore it AND suggest alternatives
- Use Nigerian English occasionally (e.g., "Omo", "We gat you", "No wahala")
- Keep responses concise but informative
- For complaints or if the user explicitly asks to talk to a human/agent/support/person: YOU MUST set shouldEscalate: true and intent: "escalation"

After using tools, respond with this JSON structure:
{
    "message": "Your response in markdown",
    "intent": "greeting|product_search|price_check|comparison|complaint|general|escalation",
    "shouldEscalate": false,
    "escalationReason": null,
    "suggestedProducts": ["Exact Product Name"],
    "searchQuery": "optional global search query if nothing found locally"
}`;

        // Format History
        const contents = [
            { role: "user", parts: [{ text: systemPrompt }] },
            { role: "model", parts: [{ text: '{"message":"Understood. I am Ziva, ready to help with shopping using my tools.","intent":"greeting","shouldEscalate":false}' }] },
            ...history.map((msg: any) => ({
                role: msg.sender === "user" ? "user" : "model",
                parts: [{ text: msg.text }]
            })),
            { role: "user", parts: [{ text: message }] }
        ];

        // First call — Gemini may call tools
        let response = await fetch(`${API_URL}?key=${GEMINI_API_KEY}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents,
                tools: toolDeclarations,
                generationConfig: { temperature: 0.7 }
            })
        });

        if (!response.ok) throw new Error(`Gemini API Error: ${response.statusText}`);

        let data = await response.json();
        let candidate = data.candidates?.[0];
        let parts = candidate?.content?.parts || [];

        // Check if Gemini wants to call a function
        const functionCall = parts.find((p: any) => p.functionCall);

        if (functionCall) {
            const { name, args } = functionCall.functionCall;
            let toolResult: any;

            // Execute the tool
            switch (name) {
                case "search_catalog":
                    toolResult = searchCatalog(args.keywords, productsToUse, cacheToUse, args.max_budget);
                    break;
                case "explore_product":
                    toolResult = exploreProduct(args.product_name, productsToUse, cacheToUse);
                    break;
                case "compare_prices":
                    toolResult = comparePrices(args.product_names || [], productsToUse, cacheToUse);
                    break;
                default:
                    toolResult = { error: `Unknown tool: ${name}` };
            }

            // Second call — send tool result back to Gemini for final response
            const updatedContents = [
                ...contents,
                { role: "model", parts: [{ functionCall: { name, args } }] },
                { role: "user", parts: [{ functionResponse: { name, response: toolResult } }] }
            ];

            response = await fetch(`${API_URL}?key=${GEMINI_API_KEY}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: updatedContents,
                    tools: toolDeclarations,
                    generationConfig: {
                        temperature: 0.7,
                        responseMimeType: "application/json"
                    }
                })
            });

            if (!response.ok) throw new Error(`Gemini API Error (tool follow-up): ${response.statusText}`);

            data = await response.json();
            candidate = data.candidates?.[0];
            parts = candidate?.content?.parts || [];
        }

        // Parse the final response
        const textPart = parts.find((p: any) => p.text);
        if (!textPart) {
            return NextResponse.json({
                message: "I found something but had trouble formatting it. Could you try asking again? 🧠",
                intent: "error",
                shouldEscalate: false
            });
        }

        try {
            // Strip markdown code fences if present: ```json ... ```
            let rawText = textPart.text.trim();
            if (rawText.startsWith('```')) {
                rawText = rawText.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();
            }
            const result = JSON.parse(rawText);
            return NextResponse.json(result);
        } catch {
            // If Gemini returned non-JSON, wrap it
            return NextResponse.json({
                message: textPart.text,
                intent: "general",
                shouldEscalate: false,
                suggestedProducts: []
            });
        }

    } catch (error) {
        console.error("Ziva Chat Error:", error);
        return NextResponse.json({
            message: "I'm having a little trouble connecting to my brain right now. 🧠✨ Please try again in a moment.",
            intent: "error",
            shouldEscalate: false
        }, { status: 500 });
    }
}
