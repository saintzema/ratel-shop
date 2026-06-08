import { NextResponse } from 'next/server';
import { SEED_PRODUCTS } from '@/lib/data';
import { db } from '@/lib/db';
import { chat, isQwenConfigured, extractJson, QWEN_MODELS, type QwenTool, type QwenMessage } from '@/lib/qwen';

/* ──────────────────────────────────────────────────────────
   Server-Side Tool Implementations
   (Inspired by Google ADK Personalized Shopping Agent)
   ────────────────────────────────────────────────────────── */

async function searchCatalog(keywords: string, maxBudget?: number): Promise<any> {
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

    // Fetch live products directly from the database
    let allProducts: any[] = [];
    try {
        const dbProducts = await db.product.findMany({
            where: { isActive: true },
            take: 300, 
            select: { id: true, name: true, price: true, category: true, description: true }
        });
        allProducts = dbProducts.map(p => ({ ...p, _src: 'catalog' }));
    } catch (e) {
        // Fallback to Seed if database is offline
        allProducts = SEED_PRODUCTS.map(p => ({ ...p, _src: 'catalog' }));
    }

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

async function exploreProduct(productName: string): Promise<any> {
    const q = productName.toLowerCase();
    let allProducts: any[] = [];
    try {
        const dbProducts = await db.product.findMany({
            where: { isActive: true },
            take: 300
        });
        // We remap camelCase from Prisma back into Ziva's expected format
        allProducts = dbProducts.map(p => ({ ...p, original_price: p.originalPrice, avg_rating: p.avgRating, review_count: p.reviewCount, seller_id: p.sellerId, seller_name: p.sellerName, price_flag: p.priceFlag }));
    } catch {
        allProducts = SEED_PRODUCTS;
    }

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

async function comparePrices(productNames: string[]): Promise<any> {
    let allProducts: any[] = [];
    try {
        const dbProducts = await db.product.findMany({
            where: { isActive: true },
            take: 300
        });
        allProducts = dbProducts.map(p => ({ ...p, original_price: p.originalPrice, avg_rating: p.avgRating, price_flag: p.priceFlag }));
    } catch {
        allProducts = SEED_PRODUCTS;
    }

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
   Qwen Tool Definitions (OpenAI-compatible function schema)
   ────────────────────────────────────────────────────────── */

const ZIVA_TOOLS: QwenTool[] = [
    {
        type: "function",
        function: {
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
        }
    },
    {
        type: "function",
        function: {
            name: "explore_product",
            description: "Get detailed information about a specific product including specs, description, price, reviews, and seller info. Use this when the user wants to know more about a particular product.",
            parameters: {
                type: "object",
                properties: {
                    product_name: { type: "string", description: "The product name to explore" }
                },
                required: ["product_name"]
            }
        }
    },
    {
        type: "function",
        function: {
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
    }
];

/* Dispatch a tool call by name to its server-side implementation. */
async function runZivaTool(name: string, args: any): Promise<any> {
    switch (name) {
        case "search_catalog":
            return searchCatalog(args.keywords, args.max_budget);
        case "explore_product":
            return exploreProduct(args.product_name);
        case "compare_prices":
            return comparePrices(args.product_names || []);
        default:
            return { error: `Unknown tool: ${name}` };
    }
}

/* ──────────────────────────────────────────────────────────
   Provider switch
   ──────────────────────────────────────────────────────────
   Ziva runs on Qwen by default. Admin can flip back to Gemini
   instantly by setting AI_PROVIDER=gemini (env / Vercel) — no
   code change, no redeploy of logic. Both code paths share the
   same ZIVA_TOOLS definitions and the same local fallback.
   ────────────────────────────────────────────────────────── */
function activeProvider(): "qwen" | "gemini" {
    return (process.env.AI_PROVIDER || "qwen").toLowerCase() === "gemini" ? "gemini" : "qwen";
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

// Gemini speaks `function_declarations`; derive them from the canonical
// OpenAI-shaped ZIVA_TOOLS so there's a single source of truth.
const GEMINI_TOOL_DECLARATIONS = [{ function_declarations: ZIVA_TOOLS.map(t => t.function) }];

/* Original Gemini tool-calling path, preserved for instant rollback. */
async function runZivaGemini(systemPrompt: string, history: any[], message: string): Promise<any> {
    if (!GEMINI_API_KEY) throw new Error("Gemini not configured");

    const contents = [
        { role: "user", parts: [{ text: systemPrompt }] },
        { role: "model", parts: [{ text: '{"message":"Understood. I am Ziva, ready to help with shopping using my tools.","intent":"greeting","shouldEscalate":false}' }] },
        ...history.map((msg: any) => ({
            role: msg.sender === "user" ? "user" : "model",
            parts: [{ text: msg.text }]
        })),
        { role: "user", parts: [{ text: message }] }
    ];

    const gen = { temperature: 0.7, responseMimeType: "application/json" };

    let response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents, tools: GEMINI_TOOL_DECLARATIONS, generationConfig: gen })
    });
    if (!response.ok) throw new Error(`Gemini API Error: ${response.statusText}`);

    let data = await response.json();
    let parts = data.candidates?.[0]?.content?.parts || [];
    const functionCall = parts.find((p: any) => p.functionCall);

    if (functionCall) {
        const { name, args } = functionCall.functionCall;
        const toolResult = await runZivaTool(name, args);
        const updatedContents = [
            ...contents,
            { role: "model", parts: [{ functionCall: { name, args } }] },
            { role: "user", parts: [{ functionResponse: { name, response: toolResult } }] }
        ];
        response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: updatedContents, tools: GEMINI_TOOL_DECLARATIONS, generationConfig: gen })
        });
        if (!response.ok) throw new Error(`Gemini API Error (tool follow-up): ${response.statusText}`);
        data = await response.json();
        parts = data.candidates?.[0]?.content?.parts || [];
    }

    const textPart = parts.find((p: any) => p.text);
    if (!textPart) return { message: "I found something but had trouble formatting it. Could you try asking again? 🧠", intent: "error", shouldEscalate: false };

    try {
        return extractJson(textPart.text);
    } catch {
        return { message: textPart.text, intent: "general", shouldEscalate: false, suggestedProducts: [] };
    }
}

/* ──────────────────────────────────────────────────────────
   Main API Handler
   ────────────────────────────────────────────────────────── */

export async function POST(req: Request) {
    const { message, history, userName, catalogue, searchCache, browsingHistory } = await req.json();

    try {
        const productsToUse = catalogue || SEED_PRODUCTS;
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
- CRITICAL FIRST-RESPONSE RULE: If the user asks ANY question about finding a product, checking a price, or asking if we have an item (e.g. "do you have the iPhone?", "price of samsung?"), YOU MUST IMMEDIATELY call the \`search_catalog\` or \`explore_product\` tool in your VERY FIRST RESPONSE before answering them. DO NOT ask clarifying questions first. Search first, then talk! The UI will automatically display the products returned.
- Use the exact product names from tool results in suggestedProducts
- Be proactive: if they ask about a product, explore it AND suggest alternatives
- Use Nigerian English occasionally (e.g., "Omo", "We gat you", "No wahala")
- Keep responses concise but informative
- For complaints or if the user explicitly asks to talk to a human/agent/support/person: YOU MUST set shouldEscalate: true and intent: "escalation"
- VERY IMPORTANT: If the user asks for a picture or image of a product, DO NOT say you cannot send images. Instead, tell them you are sending the product details and include the exact product name in the suggestedProducts array. The UI will automatically render the product card with its image for them.

After using tools, respond with this JSON structure:
{
    "message": "Your response in markdown",
    "intent": "greeting|product_search|price_check|comparison|complaint|general|escalation",
    "shouldEscalate": false,
    "escalationReason": null,
    "suggestedProducts": ["Exact Product Name"],
    "searchQuery": "optional global search query if nothing found locally"
}`;

        // Provider switch: admin can flip to Gemini via AI_PROVIDER=gemini.
        if (activeProvider() === "gemini") {
            return NextResponse.json(await runZivaGemini(systemPrompt, history, message));
        }

        // Ziva runs on Qwen (qwen-max via Alibaba Cloud Model Studio). If the key
        // isn't set yet we throw straight to the local catalog fallback below.
        if (!isQwenConfigured()) {
            throw new Error("Qwen not configured — using local fallback");
        }

        // Build the OpenAI-style message thread: system + prior turns + new turn.
        const messages: QwenMessage[] = [
            { role: "system", content: systemPrompt },
            ...history.map((msg: any) => ({
                role: (msg.sender === "user" ? "user" : "assistant") as QwenMessage["role"],
                content: msg.text
            })),
            { role: "user", content: message }
        ];

        // Agentic tool loop — let Qwen call search/explore/compare across up to
        // 4 rounds before it composes the final answer. (The old Gemini path
        // only ever did a single hop.)
        let finalContent: string | null = null;
        const MAX_ROUNDS = 4;

        for (let round = 0; round < MAX_ROUNDS; round++) {
            const { content, toolCalls } = await chat({
                model: QWEN_MODELS.reason,
                messages,
                tools: ZIVA_TOOLS,
                toolChoice: "auto",
                temperature: 0.7,
            });

            // No tool calls → Qwen is done, this is the final answer.
            if (!toolCalls || toolCalls.length === 0) {
                finalContent = content;
                break;
            }

            // Record the assistant turn that requested the tools, then run each
            // tool and feed results back in as role:"tool" messages.
            messages.push({ role: "assistant", content: content ?? "", tool_calls: toolCalls });

            for (const call of toolCalls) {
                let args: any = {};
                try { args = JSON.parse(call.function.arguments || "{}"); } catch { args = {}; }
                const toolResult = await runZivaTool(call.function.name, args);
                messages.push({
                    role: "tool",
                    tool_call_id: call.id,
                    content: JSON.stringify(toolResult)
                });
            }
        }

        if (!finalContent) {
            return NextResponse.json({
                message: "I found something but had trouble formatting it. Could you try asking again? 🧠",
                intent: "error",
                shouldEscalate: false
            });
        }

        try {
            const result = extractJson(finalContent);
            return NextResponse.json(result);
        } catch {
            // If Qwen returned prose instead of JSON, wrap it gracefully.
            return NextResponse.json({
                message: finalContent,
                intent: "general",
                shouldEscalate: false,
                suggestedProducts: []
            });
        }

    } catch (error: any) {
        console.error("Ziva Chat Qwen Error (Falling back to local):", error);

        // FALLBACK LOGIC: If Qwen is unavailable (no key, rate limit, etc.), fulfill the request locally
        try {
            const lowerMsg = message.toLowerCase();
            
            // 1. Simple Intent Detection
            if (lowerMsg.includes('compare') || (lowerMsg.includes('difference between') && lowerMsg.split(' ').length > 4)) {
                // Try to extract 2 names
                const words = lowerMsg.replace('compare', '').replace('difference between', '').split(/and|vs|,/).map((w: string) => w.trim());
                if (words.length >= 2) {
                    const result = await comparePrices(words.slice(0, 3));
                    return NextResponse.json({
                        message: `I'm currently operating in offline mode, but I've compared those for you! 🧠✨\n\n${result.summary}`,
                        intent: "comparison",
                        shouldEscalate: false,
                        suggestedProducts: result.products.filter((p: any) => !p.notFound).map((p: any) => p.name)
                    });
                }
            }

            if (lowerMsg.includes('price') || lowerMsg.includes('how much') || lowerMsg.includes('cost')) {
                // Treat as explore or search
                const query = lowerMsg.replace(/price of|how much is|cost of|what is the price of/g, '').trim();
                const result = await searchCatalog(query);
                return NextResponse.json({
                    message: `I'm having some trouble with my advanced brain, but I've checked our local price list for "${query}". 💰\n\n${result.summary}`,
                    intent: "price_check",
                    shouldEscalate: false,
                    suggestedProducts: result.products.map((p: any) => p.name)
                });
            }

            // Default: treat as search
            const searchResult = await searchCatalog(message);
            if (searchResult.found > 0) {
                return NextResponse.json({
                    message: `My advanced AI is resting, but my catalog access is 100% online! Here's what I found for "${message}":`,
                    intent: "product_search",
                    shouldEscalate: false,
                    suggestedProducts: searchResult.products.map((p: any) => p.name)
                });
            }

            return NextResponse.json({
                message: "I'm having a little trouble connecting to my full brain right now, and I couldn't find a direct match in the catalog. 🧠✨ Please try again in a moment or try searching for something else!",
                intent: "error",
                shouldEscalate: false
            });
        } catch (fallbackError) {
            return NextResponse.json({
                message: "I'm having a little trouble connecting to my brain right now. 🧠✨ Please try again in a moment.",
                intent: "error",
                shouldEscalate: false
            }, { status: 500 });
        }
    }
}
