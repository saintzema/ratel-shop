import { NextResponse } from 'next/server';
import { SEED_PRODUCTS } from '@/lib/data';
import { db } from '@/lib/db';
import { fireworksChat, isFireworksEnabled } from '@/lib/fireworks';
import { generateCompliantId } from '@/lib/utils';

// FairPrice is a GLOBAL marketplace — products absent from the local DB catalog are
// not "unavailable," they just haven't been sourced into our database yet. This calls
// the SAME global-search engine NavSearch/SRP use (Gemini-powered worldwide product
// discovery with AI-estimated FairPrice pricing + a real image) so Ziva never has to
// say "we don't sell that." Best-effort: returns [] on any failure.
const SITE = process.env.FAIRPRICE_URL || "https://www.fairprice.ng";

async function globalSearch(productName: string, category?: string): Promise<any[]> {
    try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 12_000);
        const res = await fetch(`${SITE}/api/gemini-price`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productName, mode: "search", category }),
            signal: ctrl.signal,
        }).finally(() => clearTimeout(t));
        if (!res.ok) return [];
        const data = await res.json();
        return Array.isArray(data?.suggestions) ? data.suggestions : [];
    } catch {
        return [];
    }
}

// Converts a raw Gemini search suggestion into a full product-shaped object — same
// fields the client renders product cards from (id/name/price/image_url/specs/etc).
function suggestionToProduct(s: any): any {
    return {
        id: generateCompliantId(s.name),
        name: s.name,
        price: s.approxPrice || 0,
        category: s.category || "General",
        subcategory: s.subcategory || "",
        image_url: s.image_url || "",
        description: s.description || "",
        specs: s.specs || {},
        tags: s.tags || [],
        condition: s.condition || "new",
        source: "global",
    };
}

// ── Provider switch ───────────────────────────────────────────────────────────
// Priority: DB setting (admin/settings toggle) → VERCEL env var → default "qwen"
// Cached for 60 s to avoid a DB hit on every chat message.
let _cachedProvider: string | null = null;
let _cacheExpiry = 0;
async function getAIProvider(): Promise<string> {
    if (Date.now() < _cacheExpiry && _cachedProvider) return _cachedProvider;
    try {
        const s = await db.systemSetting.findUnique({ where: { id: "global" }, select: { aiProvider: true } });
        _cachedProvider = (s?.aiProvider || process.env.AI_PROVIDER || 'qwen').toLowerCase();
    } catch {
        _cachedProvider = (process.env.AI_PROVIDER || 'qwen').toLowerCase();
    }
    _cacheExpiry = Date.now() + 60_000;
    return _cachedProvider!;
}

// Gemini
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

// Qwen (DashScope OpenAI-compatible)
const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY;
const QWEN_BASE = process.env.QWEN_BASE_URL || 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1';
const QWEN_URL = `${QWEN_BASE}/chat/completions`;
// qwen-max is retiring; qwen3-max is the current flagship with agent/tool-call support
const QWEN_MODEL = process.env.QWEN_MODEL || 'qwen3-max';

/* ──────────────────────────────────────────────────────────
   Server-Side Tool Implementations
   ────────────────────────────────────────────────────────── */

async function searchCatalog(keywords: string, maxBudget?: number): Promise<any> {
    const q = keywords.toLowerCase();
    const tokens = q.split(/\s+/).filter(t => t.length > 2);

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

    const expandedTokens = new Set(tokens);
    for (const token of tokens) {
        const syns = synonymMap[token];
        if (syns) syns.forEach(s => expandedTokens.add(s));
    }

    const score = (p: any) => {
        const name = (p.name || '').toLowerCase();
        const cat = (p.category || '').toLowerCase();
        const desc = (p.description || '').toLowerCase();
        let s = 0;
        if (name.includes(q)) s += 50;
        for (const t of tokens) {
            if (name.includes(t)) s += 15;
            if (cat.includes(t)) s += 10;
            if (desc.includes(t)) s += 5;
        }
        for (const syn of expandedTokens) {
            if (!tokens.includes(syn)) {
                if (name.includes(syn)) s += 12;
                if (cat.includes(syn)) s += 8;
            }
        }
        if (cat === 'phones' && (tokens.includes('phone') || tokens.includes('phones'))) s += 20;
        if (cat === 'laptops' && (tokens.includes('laptop') || tokens.includes('laptops'))) s += 20;
        return s;
    };

    let allProducts: any[] = [];
    try {
        const dbProducts = await db.product.findMany({
            where: { isActive: true },
            take: 300,
            select: { id: true, name: true, price: true, category: true, description: true }
        });
        allProducts = dbProducts.map(p => ({ ...p, _src: 'catalog' }));
    } catch {
        allProducts = SEED_PRODUCTS.map(p => ({ ...p, _src: 'catalog' }));
    }

    let results = allProducts
        .map(p => ({ ...p, _score: score(p) }))
        .filter(p => p._score > 10)
        .sort((a, b) => b._score - a._score);

    let nearBudget = false;
    if (maxBudget && maxBudget > 0) {
        const withinBudget = results.filter(p => p.price <= maxBudget);
        if (withinBudget.length > 0) {
            results = withinBudget;
        } else {
            // Nothing in budget — return nearest results up to 60% over budget so
            // Qwen has real catalog names to reference (prevents hallucinated/shortened names).
            results = results.filter(p => p.price <= maxBudget * 1.6);
            nearBudget = true;
        }
    }

    let top = results.slice(0, 8);

    // Nothing in our local DB — FairPrice is a GLOBAL marketplace, so fall back to live
    // global search (same engine as NavSearch) instead of telling the user we don't have it.
    let globalProducts: any[] = [];
    if (top.length === 0) {
        const suggestions = await globalSearch(keywords);
        globalProducts = suggestions.slice(0, 5).map(suggestionToProduct);
    }

    return {
        found: top.length || globalProducts.length,
        nearBudget,
        products: top.map(p => ({ name: p.name, price: p.price, category: p.category, source: p._src, id: p.id }))
            .concat(globalProducts.map(g => ({ name: g.name, price: g.price, category: g.category, source: 'global', id: g.id }))),
        globalProducts, // full objects (image/specs) — surfaced to the client, not echoed verbatim to the model
        summary: top.length > 0
            ? nearBudget
                ? `No products found at exactly ₦${maxBudget?.toLocaleString()} — here are the closest matches (slightly above budget): ${top.map(p => p.name).join(', ')}.`
                : `Found ${top.length} product${top.length > 1 ? 's' : ''} matching "${keywords}".`
            : globalProducts.length > 0
                ? `Not in our local catalog, but found ${globalProducts.length} on FairPrice's global marketplace: ${globalProducts.map(g => g.name).join(', ')}. Present these with their FairPrice pricing.`
                : `No products found matching "${keywords}" anywhere.`
    };
}

async function exploreProduct(productName: string): Promise<any> {
    const q = productName.toLowerCase();
    let allProducts: any[] = [];
    try {
        const dbProducts = await db.product.findMany({ where: { isActive: true }, take: 300 });
        allProducts = dbProducts.map(p => ({ ...p, original_price: p.originalPrice, avg_rating: p.avgRating, review_count: p.reviewCount, seller_id: p.sellerId, seller_name: p.sellerName, price_flag: p.priceFlag }));
    } catch {
        allProducts = SEED_PRODUCTS;
    }

    const match = allProducts.find(p => (p.name || '').toLowerCase().includes(q)) ||
        allProducts.find(p => {
            const tokens = q.split(/\s+/).filter(t => t.length > 2);
            return tokens.every(t => (p.name || '').toLowerCase().includes(t));
        });

    if (!match) return { found: false, message: `Could not find "${productName}" in our catalog.` };

    return {
        found: true,
        product: {
            name: match.name, price: match.price, originalPrice: match.original_price || null,
            category: match.category, description: match.description || 'No description available.',
            specs: match.specs || {}, rating: match.avg_rating || 0, reviewCount: match.review_count || 0,
            sellerId: match.seller_id, sellerName: match.seller_name || 'Unknown Seller',
            priceFlag: match.price_flag || 'unknown', id: match.id
        }
    };
}

async function comparePrices(productNames: string[]): Promise<any> {
    let allProducts: any[] = [];
    try {
        const dbProducts = await db.product.findMany({ where: { isActive: true }, take: 300 });
        allProducts = dbProducts.map(p => ({ ...p, original_price: p.originalPrice, avg_rating: p.avgRating, price_flag: p.priceFlag }));
    } catch {
        allProducts = SEED_PRODUCTS;
    }

    const localMatches = productNames.map(name => {
        const q = name.toLowerCase();
        const match = allProducts.find(p => (p.name || '').toLowerCase().includes(q)) ||
            allProducts.find(p => {
                const tokens = q.split(/\s+/).filter(t => t.length > 2);
                return tokens.length > 0 && tokens.every(t => (p.name || '').toLowerCase().includes(t));
            });
        // Include specs so the model can do a true side-by-side spec comparison, not just price.
        return match
            ? { name: match.name, price: match.price, originalPrice: match.original_price || null, category: match.category, rating: match.avg_rating || 0, priceFlag: match.price_flag || 'unknown', specs: match.specs || null, id: match.id, source: 'catalog' as const }
            : { name, price: null, notFound: true as const };
    });

    // FairPrice is a GLOBAL marketplace — anything not in our local DB still goes through
    // the same global-search engine NavSearch uses, so comparisons never dead-end into
    // "we don't sell that." Run all missing lookups concurrently.
    const globalProducts: any[] = [];
    const products = await Promise.all(localMatches.map(async (p) => {
        if (!p.notFound) return p;
        const suggestions = await globalSearch(p.name);
        if (suggestions.length === 0) return p;
        const g = suggestionToProduct(suggestions[0]);
        globalProducts.push(g);
        return { name: g.name, price: g.price, originalPrice: null, category: g.category, rating: 0, priceFlag: 'unknown', specs: g.specs, id: g.id, source: 'global' as const };
    }));

    const found = products.filter((p): p is Exclude<typeof p, { notFound: true }> => !('notFound' in p));
    const cheapest = found.length > 0 ? found.reduce((a, b) => (a.price! < b.price! ? a : b)) : null;

    return {
        products,
        globalProducts, // full objects (image/description) for genuinely missing products — surfaced to the client
        cheapest: cheapest ? cheapest.name : null,
        notFoundCount: products.length - found.length,
        summary: found.length > 0
            ? `Compared ${found.length} products${globalProducts.length > 0 ? ` (${globalProducts.length} sourced live from FairPrice's global marketplace)` : ''}. ${cheapest ? `Best price: ${cheapest.name} at ₦${cheapest.price?.toLocaleString()}.` : ''}`
            : 'Could not find or source any of these products. Answer using your own general product knowledge — clearly note FairPrice does not currently have pricing for them.'
    };
}

/* ──────────────────────────────────────────────────────────
   Tool definitions (OpenAI format — used by Qwen)
   ────────────────────────────────────────────────────────── */
const OPENAI_TOOLS = [
    {
        type: "function",
        function: {
            name: "search_catalog",
            description: "Search FairPrice's local catalog AND, if nothing matches locally, its global marketplace (worldwide sourcing, real FairPrice pricing + image). Use this when the user wants to find, browse, or discover products — including items you're not sure we stock locally.",
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
            description: "Get detailed information about a specific product. Use when the user wants to know more about a particular product.",
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
            description: "Compare price, rating and specs of 2-4 products side by side. Use when the user wants to compare options — including general spec comparisons (e.g. phone A vs phone B), even if you're not sure the items are sold on FairPrice. The tool tells you which ones it found.",
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

/* ──────────────────────────────────────────────────────────
   Gemini tool declarations (Gemini format — used only when AI_PROVIDER=gemini)
   ────────────────────────────────────────────────────────── */
const GEMINI_TOOLS = [
    {
        function_declarations: OPENAI_TOOLS.map(t => ({
            name: t.function.name,
            description: t.function.description,
            parameters: t.function.parameters
        }))
    }
];

/* ──────────────────────────────────────────────────────────
   Execute tool by name
   ────────────────────────────────────────────────────────── */
async function executeTool(name: string, args: any): Promise<any> {
    switch (name) {
        case "search_catalog": return searchCatalog(args.keywords, args.max_budget);
        case "explore_product": return exploreProduct(args.product_name);
        case "compare_prices": return comparePrices(args.product_names || []);
        default: return { error: `Unknown tool: ${name}` };
    }
}

/* ──────────────────────────────────────────────────────────
   Qwen chat (OpenAI-compatible)
   ────────────────────────────────────────────────────────── */
async function callQwen(messages: any[], opts: { disableTools?: boolean } = {}): Promise<{ toolCall?: { name: string; args: any; id: string }; text?: string }> {
    const body: Record<string, any> = {
        model: QWEN_MODEL,
        messages,
        temperature: 0.7,
        // Disable qwen3 extended thinking — it puts output in reasoning_content
        // instead of content, returning content:null and breaking JSON extraction.
        enable_thinking: false,
    };
    if (!opts.disableTools) body.tools = OPENAI_TOOLS;

    const res = await fetch(QWEN_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${DASHSCOPE_API_KEY}`
        },
        body: JSON.stringify(body)
    });

    if (!res.ok) {
        const body = await res.text().catch(() => res.statusText);
        throw new Error(`Qwen API ${res.status}: ${body.slice(0, 400)}`);
    }

    const data = await res.json();
    const msg = data.choices?.[0]?.message;
    if (!msg) throw new Error('Qwen returned no message');

    if (msg.tool_calls?.length) {
        const tc = msg.tool_calls[0];
        const args = typeof tc.function.arguments === 'string'
            ? JSON.parse(tc.function.arguments)
            : tc.function.arguments;
        return { toolCall: { name: tc.function.name, args, id: tc.id } };
    }

    // qwen3 thinking mode may put the answer in reasoning_content with content:null
    return { text: msg.content || msg.reasoning_content || '' };
}

/* ──────────────────────────────────────────────────────────
   Gemini chat
   ────────────────────────────────────────────────────────── */
async function callGemini(contents: any[]): Promise<{ toolCall?: { name: string; args: any }; text?: string }> {
    const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents, tools: GEMINI_TOOLS, generationConfig: { temperature: 0.7 } })
    });

    if (!res.ok) {
        const body = await res.text().catch(() => res.statusText);
        throw new Error(`Gemini API ${res.status}: ${body.slice(0, 400)}`);
    }

    const data = await res.json();
    const parts = data.candidates?.[0]?.content?.parts || [];
    const fc = parts.find((p: any) => p.functionCall);
    if (fc) return { toolCall: { name: fc.functionCall.name, args: fc.functionCall.args } };

    const textPart = parts.find((p: any) => p.text);
    return { text: textPart?.text || '' };
}

/* ──────────────────────────────────────────────────────────
   Parse JSON response from AI text
   ────────────────────────────────────────────────────────── */
function parseAiJson(text: string) {
    let raw = text.trim();
    // Qwen3 thinking mode wraps reasoning in <think> tags before the JSON
    raw = raw.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    // Strip markdown fences
    if (raw.startsWith('```')) {
        raw = raw.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();
    }
    try {
        return JSON.parse(raw);
    } catch {
        // Extract first {...} block from mixed text+JSON responses
        const match = raw.match(/\{[\s\S]*\}/);
        if (match) return JSON.parse(match[0]);
        throw new Error('No JSON object found in response');
    }
}

/* ──────────────────────────────────────────────────────────
   Main API Handler
   ────────────────────────────────────────────────────────── */
export async function POST(req: Request) {
    const { message, history, userName, catalogue, searchCache, browsingHistory } = await req.json();

    // Request-scoped (not module-level — safe under concurrent invocations) collector for
    // full global-marketplace product objects surfaced by any tool call this turn, so the
    // final response can render real cards (image + FairPrice price) for products the model
    // only refers to by name in suggestedProducts.
    const collectedGlobalProducts: any[] = [];

    try {
        const productsToUse = catalogue || SEED_PRODUCTS;
        const cacheToUse = searchCache || [];

        // Cap history to last 8 messages — prevents unbounded token growth in long
        // conversations (each extra turn adds ~200 tokens to every subsequent call).
        const cappedHistory = (history || []).slice(-8);

        // 20 products covers all common searches; trimmed from 30 to save ~150 tokens/call.
        const productSummary = productsToUse.slice(0, 20).map((p: any) =>
            `${p.name} (${p.category}) ₦${p.price?.toLocaleString()}`
        ).join(" | ");

        const cacheSummary = cacheToUse.length > 0
            ? `\nCached: ${cacheToUse.slice(0, 10).map((p: any) => `${p.name} ₦${p.price?.toLocaleString()}`).join(" | ")}`
            : '';

        const historySummary = browsingHistory?.length > 0
            ? `\nRecently viewed: ${browsingHistory.slice(0, 5).map((p: any) => p.name).join(", ")}`
            : '';

        const systemPrompt = `You are Ziva, the advanced AI shopping assistant for FairPrice — Nigeria's First AI-Regulated Marketplace, AND a GLOBAL marketplace: if a product isn't in our local catalog yet, our tools automatically search FairPrice's worldwide sourcing network and return a real FairPrice price + image. You work like Amazon Rufus — a brilliant shopping concierge powered by tools.

User: ${userName || "Valued Customer"}

AVAILABLE TOOLS:
- search_catalog: Search our LOCAL catalog first; if nothing matches, it automatically searches FairPrice's GLOBAL marketplace too. Use for ANY product search/browse request.
- explore_product: Get detailed specs, reviews, price analysis. Use when user asks about a specific product.
- compare_prices: Compare 2-4 products side by side (price + specs). Also searches globally for items not in our local catalog — use it even for products you're not sure we sell.

CART & CHECKOUT (you can act, not just talk):
- If the user clearly asks you to add a specific product to their cart (e.g. "add the iPhone 15 to my cart", "get me 2 of those"), set cartAction to {"type":"add_to_cart","product":"Exact Product Name","quantity":1} using the EXACT product name from search results or the catalog snapshot — never a name you haven't verified exists.
- If the user says they're ready to pay / check out / complete the order (e.g. "let's checkout", "I'm ready to pay", "proceed to payment"), set cartAction to {"type":"checkout"}. Only do this after they've actually confirmed intent to pay — never navigate to checkout just because a product was discussed.
- If neither applies, omit cartAction or set it to null. When in doubt, ask a clarifying question instead of guessing which product to add.

CATALOG SNAPSHOT: ${productSummary}${cacheSummary}${historySummary}

INTERACTION FLOW:
1. UNDERSTAND what the user wants (product type, budget, features)
2. SEARCH using search_catalog tool if they want to find products
3. PRESENT results clearly with prices and key details
4. EXPLORE deeper if they pick a product (use explore_product)
5. COMPARE if they're deciding between options (use compare_prices)

RULES:
- ALWAYS use your tools for product queries — don't guess or hallucinate PRICES or claim something is sold on FairPrice when it isn't
- CRITICAL: If the user asks ANY question about finding a product, checking a price, or asking if we have an item, call the search_catalog or explore_product tool IMMEDIATELY in your FIRST RESPONSE. Do NOT ask clarifying questions first. Search first, then talk!
- COMPARISONS (e.g. "compare X and Y specs"): ALWAYS call compare_prices once, even for products you suspect aren't in our local catalog — it automatically searches FairPrice's global marketplace for them too and returns a real price + specs. Present whatever it finds (local or global) as genuine FairPrice products — do NOT say "we don't sell that." Only if the tool truly finds nothing anywhere should you fall back to your own general knowledge, clearly noting FairPrice doesn't have current pricing for it. NEVER refuse and NEVER call the same tool again — answer in the JSON format below using what the tool returned.
- search_catalog and compare_prices both search GLOBALLY when there's no local match — never tell a user a product isn't available just because it's not in the local catalog snapshot above.
- Use the exact product names from tool results in suggestedProducts
- Be proactive: if they ask about a product, explore it AND suggest alternatives
- Use Nigerian English occasionally (e.g., "Omo", "We gat you", "No wahala")
- Keep responses concise but informative
- For complaints or if the user explicitly asks to talk to a human/agent/support/person: set shouldEscalate: true and intent: "escalation"
- If the user asks for a picture/image of a product, include the exact product name in suggestedProducts — the UI renders the product card with image automatically.

After using tools, respond with ONLY this JSON (no markdown fences):
{
    "message": "Your response in markdown",
    "intent": "greeting|product_search|price_check|comparison|complaint|general|escalation",
    "shouldEscalate": false,
    "escalationReason": null,
    "suggestedProducts": ["Exact Product Name"],
    "searchQuery": "optional global search query if nothing found locally",
    "cartAction": null
}`;

        const AI_PROVIDER = await getAIProvider();
        let resultText: string | null = null;

        // ── Fireworks AI (AMD GPUs): primary when AI_PROVIDER=fireworks ───────
        // Runs Ziva's reasoning on AMD-hosted inference. Produces the structured JSON
        // response directly from the system prompt (which defines the schema). Any failure
        // falls through to the Qwen path below, so the assistant never goes dark.
        if (AI_PROVIDER === 'fireworks' && isFireworksEnabled()) {
            const convo = [
                ...cappedHistory.map((m: any) => `${m.sender === 'user' ? 'User' : 'Ziva'}: ${m.text}`),
                `User: ${message}`,
            ].join('\n');
            resultText = await fireworksChat({
                system: systemPrompt,
                prompt: convo,
                jsonMode: true,
                temperature: 0.5,
                maxTokens: 800,
            });
        }

        // ── Try Gemini when configured ───────────────────────────────────────
        // If Gemini is down (billing/quota), the catch silently falls through to Qwen.
        // Once the Gemini bill is paid, this path auto-recovers — no config change needed.
        if (AI_PROVIDER === 'gemini' && GEMINI_API_KEY) {
            try {
                const contents = [
                    { role: "user", parts: [{ text: systemPrompt }] },
                    { role: "model", parts: [{ text: '{"message":"Understood. I am Ziva, ready to help.","intent":"greeting","shouldEscalate":false}' }] },
                    ...cappedHistory.map((msg: any) => ({
                        role: msg.sender === "user" ? "user" : "model",
                        parts: [{ text: msg.text }]
                    })),
                    { role: "user", parts: [{ text: message }] }
                ];

                let result = await callGemini(contents);

                if (result.toolCall) {
                    const toolResult = await executeTool(result.toolCall.name, result.toolCall.args);
                    if (Array.isArray(toolResult?.globalProducts)) collectedGlobalProducts.push(...toolResult.globalProducts);
                    const { globalProducts: _gp, ...toolResultForModel } = toolResult || {};
                    result = await callGemini([
                        ...contents,
                        { role: "model", parts: [{ functionCall: { name: result.toolCall.name, args: result.toolCall.args } }] },
                        { role: "user", parts: [{ functionResponse: { name: result.toolCall.name, response: toolResultForModel } }] }
                    ]);
                }

                // Empty text means Gemini hit quota/billing — treat as failure and fall through
                if (!result.text) throw new Error('Gemini returned empty response (quota/billing?)');
                resultText = result.text;
            } catch (geminiErr: any) {
                console.warn('[Ziva] Gemini unavailable, recalibrating to Qwen:', geminiErr?.message);
            }
        }

        // ── Qwen path: primary when AI_PROVIDER=qwen, or Gemini fallback ────
        if (!resultText && DASHSCOPE_API_KEY) {
            let messages: any[] = [
                { role: "system", content: systemPrompt },
                ...cappedHistory.map((msg: any) => ({
                    role: msg.sender === "user" ? "user" : "assistant",
                    content: msg.text
                })),
                { role: "user", content: message }
            ];

            let result = await callQwen(messages);

            // Qwen3 can chain multiple tool calls; loop up to 3 rounds.
            // disableTools on rounds ≥1 forces the model to emit text, not another tool call.
            for (let round = 0; round < 3 && result.toolCall; round++) {
                const toolResult = await executeTool(result.toolCall.name, result.toolCall.args);
                if (Array.isArray(toolResult?.globalProducts)) collectedGlobalProducts.push(...toolResult.globalProducts);
                // Don't echo full global product objects (descriptions/specs) back into the
                // model's context — it only needs the lean summary; the real objects are
                // attached to the HTTP response separately via collectedGlobalProducts.
                const { globalProducts: _gp, ...toolResultForModel } = toolResult || {};
                messages = [
                    ...messages,
                    { role: "assistant", content: null, tool_calls: [{ id: result.toolCall.id, type: "function", function: { name: result.toolCall.name, arguments: JSON.stringify(result.toolCall.args) } }] },
                    { role: "tool", tool_call_id: result.toolCall.id, content: JSON.stringify(toolResultForModel) }
                ];
                result = await callQwen(messages, { disableTools: round >= 1 });
            }

            // Safety net: if the loop exhausted (still requesting tools) or returned empty
            // text, force ONE final answer-only call before giving up. Without this, queries
            // about products the model isn't sure are in our catalog (e.g. "compare phone A
            // vs phone B specs") could leave resultText empty and surface the generic
            // "had trouble formatting" error even though a perfectly good answer was possible.
            if (!result.text) {
                const forced = await callQwen([
                    ...messages,
                    { role: "user", content: "Answer now using the JSON format from your instructions. If a product wasn't found in our catalog, use your own general knowledge to give a real, useful answer — do not refuse and do not call any more tools." }
                ], { disableTools: true });
                result = forced.text ? forced : result;
            }

            if (result.text) resultText = result.text;
        }

        if (!resultText) {
            return NextResponse.json({ message: "I found something but had trouble formatting it. Try again?", intent: "error", shouldEscalate: false });
        }

        // Dedupe any global-marketplace products surfaced this turn by id.
        const globalProducts = Array.from(
            new Map(collectedGlobalProducts.map((p: any) => [p.id, p])).values()
        );

        try {
            const parsed = parseAiJson(resultText);
            return NextResponse.json(globalProducts.length > 0 ? { ...parsed, globalProducts } : parsed);
        } catch {
            return NextResponse.json({
                message: resultText, intent: "general", shouldEscalate: false, suggestedProducts: [],
                ...(globalProducts.length > 0 ? { globalProducts } : {}),
            });
        }

    } catch (error: any) {
        console.error(`Ziva Chat AI Error (falling back to local):`, error?.message || error);

        // Local catalog fallback when AI is unavailable
        try {
            const lowerMsg = message.toLowerCase();

            if (lowerMsg.includes('compare') || lowerMsg.includes('difference between')) {
                const words = lowerMsg.replace('compare', '').replace('difference between', '').split(/and|vs|,/).map((w: string) => w.trim());
                if (words.length >= 2) {
                    const result = await comparePrices(words.slice(0, 3));
                    return NextResponse.json({ message: `I'm in backup mode, but here's the comparison! 🧠\n\n${result.summary}`, intent: "comparison", shouldEscalate: false, suggestedProducts: result.products.filter((p: any) => !p.notFound).map((p: any) => p.name) });
                }
            }

            if (lowerMsg.includes('price') || lowerMsg.includes('how much') || lowerMsg.includes('cost')) {
                const query = lowerMsg.replace(/price of|how much is|cost of|what is the price of/g, '').trim();
                const result = await searchCatalog(query);
                return NextResponse.json({ message: `My AI brain is temporarily resting, but I checked the catalog for you! 💰\n\n${result.summary}`, intent: "price_check", shouldEscalate: false, suggestedProducts: result.products.map((p: any) => p.name) });
            }

            const searchResult = await searchCatalog(message);
            if (searchResult.found > 0) {
                return NextResponse.json({ message: `My advanced AI is resting, but my catalog access is 100% online! Here's what I found for "${message}":`, intent: "product_search", shouldEscalate: false, suggestedProducts: searchResult.products.map((p: any) => p.name) });
            }

            return NextResponse.json({ message: "I'm having trouble connecting to my brain right now. Please try again in a moment!", intent: "error", shouldEscalate: false });
        } catch {
            return NextResponse.json({ message: "I'm having a little trouble right now. Please try again in a moment.", intent: "error", shouldEscalate: false }, { status: 500 });
        }
    }
}
