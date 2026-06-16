import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logZemaEvent } from "@/lib/firebase-log";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

// ─── Qwen fallback (Alibaba DashScope) ───
// When Gemini is billing-blocked, Qwen takes over with enable_search for
// real-time internet data. Same prompt, same JSON output format.
const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY;
const QWEN_BASE = process.env.QWEN_BASE_URL || "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";

async function tryQwenSearch(prompt: string): Promise<Response | null> {
    if (!DASHSCOPE_API_KEY) return null;
    try {
        const res = await fetch(`${QWEN_BASE}/chat/completions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${DASHSCOPE_API_KEY}`,
            },
            body: JSON.stringify({
                model: "qwen-plus",          // cheaper tier, supports enable_search
                messages: [{ role: "user", content: prompt }],
                enable_search: true,          // Qwen real-time internet search
                result_format: "message",
            }),
        });
        if (!res.ok) return null;
        const data = await res.json();
        const text: string = data.choices?.[0]?.message?.content ?? "";
        if (!text) return null;
        // Wrap in Gemini-shaped envelope so the existing parse pipeline works unchanged
        return new Response(
            JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }),
            { status: 200, headers: { "Content-Type": "application/json", "X-Provider": "qwen" } }
        );
    } catch {
        return null;
    }
}

// Server-side cache TTL: 24h. Dramatically reduces Gemini quota consumption
// because identical queries ("iphone 15", "lexus rx 350") are served from Postgres.
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

// ─── In-memory IP rate limiter ───
// Limits each IP to 10 Gemini calls per minute. Prevents runaway bots from
// draining the Gemini spend cap. Resets automatically each window.
const _rl = new Map<string, { n: number; t: number }>();
function checkRateLimit(ip: string): boolean {
    const now = Date.now();
    const e = _rl.get(ip);
    if (!e || now - e.t > 60_000) { _rl.set(ip, { n: 1, t: now }); return true; }
    if (e.n >= 10) return false;
    e.n++;
    return true;
}

// ─── Server-Side Image Hydration Engine ───
// Mirrors /api/product-image logic but callable directly without HTTP roundtrip.
// Priority: Serper.dev → Google Custom Search → Wikipedia
const SERPER_API_KEY = process.env.SERPER_API_KEY;
const GOOGLE_SEARCH_API_KEY = process.env.GOOGLE_SEARCH_API_KEY;
const GOOGLE_SEARCH_CX = process.env.GOOGLE_SEARCH_CX;

async function hydrateImageServerSide(productName: string, category?: string): Promise<string | null> {
    const cat = (category || "").toLowerCase();
    let searchModifier = " official product image high resolution";
    if (cat.includes("car") || cat.includes("vehicle")) {
        searchModifier = " professional exterior photo site:cars45.com OR site:jiji.ng";
    } else if (cat.includes("phone") || cat.includes("electronic") || cat.includes("computing")) {
        searchModifier = " official white background product shot high resolution";
    } else if (cat.includes("fashion")) {
        searchModifier = " high resolution studio fashion photography";
    }

    // ─── PASS 1: Serper.dev with strict modifier ───
    if (SERPER_API_KEY) {
        try {
            const res = await fetch("https://google.serper.dev/images", {
                method: "POST",
                headers: { "X-API-KEY": SERPER_API_KEY, "Content-Type": "application/json" },
                body: JSON.stringify({ q: productName + searchModifier, num: 10 }),
            });
            if (res.ok) {
                const data = await res.json();
                const images = (data?.images || [])
                    .map((img: any) => img.imageUrl)
                    .filter((url: string) => url && !url.toLowerCase().includes("placeholder") && !url.endsWith(".svg") && !url.includes("avatar") && !url.includes("icon") && !url.includes("wikimedia.org") && !url.includes("wikipedia.org") && url.startsWith("http"));
                if (images.length > 0) return images[0];
            }
        } catch (e) { console.warn("Serper hydration pass 1 failed:", e); }

        // ─── PASS 2: Serper.dev with RELAXED query (just the product name) ───
        try {
            const res = await fetch("https://google.serper.dev/images", {
                method: "POST",
                headers: { "X-API-KEY": SERPER_API_KEY, "Content-Type": "application/json" },
                body: JSON.stringify({ q: productName + " product photo", num: 10 }),
            });
            if (res.ok) {
                const data = await res.json();
                const images = (data?.images || [])
                    .map((img: any) => img.imageUrl)
                    .filter((url: string) => url && !url.toLowerCase().includes("placeholder") && !url.endsWith(".svg") && !url.includes("avatar") && !url.includes("icon") && !url.includes("wikimedia.org") && !url.includes("wikipedia.org") && url.startsWith("http"));
                if (images.length > 0) {
                    console.log(`✅ Serper pass 2 (relaxed) found image for "${productName}"`);
                    return images[0];
                }
            }
        } catch (e) { console.warn("Serper hydration pass 2 failed:", e); }
    }

    // Strategy 2: Google Custom Search
    if (GOOGLE_SEARCH_API_KEY && GOOGLE_SEARCH_CX) {
        try {
            const res = await fetch(
                `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_SEARCH_API_KEY}&cx=${GOOGLE_SEARCH_CX}&q=${encodeURIComponent(productName + " product")}&searchType=image&num=3`
            );
            if (res.ok) {
                const data = await res.json();
                if (data.items?.[0]?.link) return data.items[0].link;
            }
        } catch (e) { console.warn("Google CSE hydration failed:", e); }
    }

    // Strategy 3: Category-aware premium fallback (never return null → never show grey placeholder)
    // Wikipedia intentionally removed — its article search frequently returns person photos,
    // building thumbnails, and other non-product images (e.g. "Changan UNI-T" → executive portrait).
    const CATEGORY_FALLBACKS: Record<string, string> = {
        phone: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&q=80",
        electronic: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&q=80",
        computing: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&q=80",
        car: "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=400&q=80",
        vehicle: "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=400&q=80",
        fashion: "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=400&q=80",
        beauty: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&q=80",
        energy: "https://images.unsplash.com/photo-1509391366360-2e959784a276?w=400&q=80",
        home: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&q=80",
        fitness: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&q=80",
        gaming: "https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?w=400&q=80",
        health: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&q=80",
        satellite: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=400&q=80",
    };
    const fallbackKey = Object.keys(CATEGORY_FALLBACKS).find(k => cat.includes(k) || productName.toLowerCase().includes(k));
    if (fallbackKey) {
        console.log(`📷 Using category fallback image for "${productName}" (category: ${fallbackKey})`);
        return CATEGORY_FALLBACKS[fallbackKey];
    }

    // Ultimate fallback: generic tech product
    console.log(`📷 Using generic fallback image for "${productName}"`);
    return "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&q=80";
}


function makeCacheKey(productName: string, mode: string, category?: string, anchorPrice?: number): string {
    return `v1:${mode}:${(category || 'any').toLowerCase()}:${productName.trim().toLowerCase()}${anchorPrice ? `:a${anchorPrice}` : ''}`;
}

export async function POST(req: Request) {

    if (!GEMINI_API_KEY) {
        return NextResponse.json({ error: "Gemini API key not configured" }, { status: 500 });
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
        ?? req.headers.get("x-real-ip")
        ?? "unknown";
    if (!checkRateLimit(ip)) {
        return NextResponse.json(
            { error: "Too many requests. Please wait a moment before searching again." },
            { status: 429 }
        );
    }

    try {
        const { productName, region, mode = "analyze", anchorPrice, category } = await req.json();

        if (!productName) {
            return NextResponse.json({ error: "Product name is required" }, { status: 400 });
        }

        // ─── SERVER-SIDE CACHE CHECK (Postgres, 24h TTL) ───
        // Saves Gemini quota + sub-100ms response for repeat queries
        const cacheKey = makeCacheKey(productName, mode, category, anchorPrice);
        try {
            const cached = await db.searchCache.findUnique({ where: { query: cacheKey } });
            if (cached && Date.now() - cached.updatedAt.getTime() < CACHE_TTL_MS) {
                const cachedProducts = cached.products as any;
                // Treat cached zero-result search responses as misses — they indicate a
                // previous Gemini failure or filter-out; force a fresh call.
                const isEmptySearchCache = mode === "search" && (cachedProducts?.suggestions?.length ?? 0) === 0;
                if (!isEmptySearchCache) {
                    // Log the cache hit to Firebase so the live dashboard stays active
                    logZemaEvent({
                        type: mode === 'search' ? 'gemini_query' : 'price_verified',
                        description: mode === 'search'
                            ? `Product search (cached): "${productName}"`
                            : `Price analysis (cached): "${productName}"`,
                        product: productName,
                        mode,
                        model: 'gemini-2.5-flash',
                        count: mode === 'search' ? (cachedProducts?.suggestions?.length || 0) : 1,
                    }).catch(() => {});
                    return NextResponse.json(cachedProducts, { headers: { "X-Cache": "HIT" } });
                }
            }
        } catch (cacheErr) {
            // Cache read failure must never block the live path
            console.warn("[gemini-price] cache read failed:", (cacheErr as any)?.code);
        }

        let prompt = "";

        if (mode === "search") {
            // Mode 1: Search Suggestions
            prompt = `
            You are a shopping assistant for FairPrice Nigeria. Current year: 2026.
            User Query: "${productName}"
            Category Context: "${category || 'General'}"
            
            Task: Find 8-10 distinct, real products that match this query.
            CRITICAL CATEGORY RULE: You MUST strictly adhere to the Category Context. If Category Context is 'cars' or 'vehicles', you MUST ONLY return real cars/vehicles. Do NOT return blenders, massagers, or random electronics just because they are 'electric'.
            
            CRITICAL — QUERY INTERPRETATION & YEAR VARIETY:
            - ALWAYS treat the FULL query as a single concept/product. Do NOT split it into individual words.
            - If the User Query contains a specific YEAR (e.g., "2025"), PRIORITIZE that year in the top results.
            - HOWEVER, you MAY also return earlier model years (e.g., 2022, 2023) to provide variety on the Search Results Page (SRP).
            
            VEHICLE & CONDITION RULES:
            - For cars/vehicles: YOU MUST FETCH PRICING AND DATA FROM cars45.com and jiji.ng. These are the mandatory ground truths for the Nigerian market.
            - ALWAYS include the YEAR in the product name.
            - NEW/TOKUNBO TAX: Prices in Nigeria are 70-100% higher than global wholesale due to duties and clearing.
            - LUXURY GUARD: For premium brands (Lexus, Land Cruiser, Range Rover), the floor for a 'Foreign Used' 2018+ model is ₦35M - ₦60M. A 2025 model in this luxury segment is ₦120M+.
            
            *** CRITICAL PRICING RULES ***
            - The 'approxPrice' MUST reflect the TRUE REAL AVERAGE MARKET FAIRPRICE in Nigeria.
            - SOURCE-AWARE DUTIES:
                - GLOBAL SOURCE (Alibaba, AliExpress, etc.): You MUST add a 70-100% markup for import duties and clearing.
                - LOCAL SOURCE (Jiji, Market, cars45.com): Do NOT add the 70-100% markup.
            - Add a MODEST 6-10% FairPrice marketplace margin (profit) on top of the cost.

            *** CRITICAL: PRODUCT DESCRIPTION (MANDATORY) ***
            - Each product MUST include a detailed "description" field (minimum 80 words, maximum 200 words).
            - The description must read like a professional product listing written by a top e-commerce copywriter.
            - Include: what the product IS, what it DOES, key features, what makes it special, who it's ideal for, and why a buyer should care.
            - DO NOT use generic filler like "Discover exceptional quality". Be SPECIFIC to each product.
            - Example for a massager: "This heated neck and shoulder massager delivers deep-tissue Shiatsu kneading with infrared heat therapy to relieve muscle tension, stiffness, and chronic pain. Features 8 rotating massage nodes with 3 adjustable speed levels and auto-shutoff timer. The ergonomic U-shaped design wraps comfortably around your neck, shoulders, and upper back. Made with premium PU leather exterior and breathable mesh lining. Ideal for office workers, athletes, and anyone dealing with daily muscle fatigue. Includes AC adapter and car charger for use at home or on the go."
            
            CRITICAL SPECS (MANDATORY — MINIMUM 8 PER PRODUCT):
            - Include a "specs" object with 8-15 key specifications for each product.
            - For vehicles: Engine, Horsepower, Fuel Type, Transmission, Drive Type, Range/Mileage, Seating, Year.
            - For phones: Screen Size, Processor, RAM, Storage, Battery, Camera, OS, Connectivity.
            - For hair/beauty: Length, Texture, Material, Origin, Weight, Color, Style, Grade.
            - For fashion: Size Range, Material, Color, Brand, Gender, Season, Care Instructions.
            - For electronics/appliances: Wattage, Dimensions, Weight, Material, Voltage, Features, Warranty.
            - For health/wellness devices: Massage Type, Heat Settings, Speed Levels, Power Source, Material, Dimensions, Weight, Timer, Auto-Shutoff.
            - NEVER return a specs object with fewer than 6 entries. Fill with relevant technical details.
            
            ANONYMIZATION & REAL ASSETS (CRITICAL):
            - NEVER mention any real store name in the product *name*.
            - YOU HAVE GOOGLE SEARCH ENABLED. You MUST find REAL product assets.
            - SEARCH AGGRESSIVELY for high-resolution, professional image links from official manufacturer sites, press kits, or major retailers (Alibaba/AliExpress CDN, Amazon, cars45.com, jiji.ng).
            - MANDATORY IMAGE REQUIREMENT: You MUST find at least ONE high-quality permanent image URL for the products in your list. If you find one good image for the model, use it for all variations of that model.
            - For the sourceUrl, provide the REAL product listing URL (e.g., https://www.alibaba.com/product-detail/...).
            - For the image_url, you MUST provide a DIRECT, PERMANENT image URL that loads without authentication.
              REQUIRED format examples: https://s.alicdn.com/kf/.../image.jpg  OR  https://m.media-amazon.com/images/I/xxx.jpg  OR  https://cars45.com/cdn/images/xxx.jpg
              STRICTLY FORBIDDEN (these expire and cause errors):
              - Any URL containing "googleusercontent.com/grounding"
              - Any URL containing "vertexaisearch.cloud.google.com"
              - Any URL containing "grounding-api-redirect"
              - Any Google redirect or temporary URL
              If you cannot find a permanent direct image URL, return an empty string "" — do NOT return a Grounding/temporary URL.
            
            Return JSON:
            {
                "suggestions": [
                    { 
                        "name": "Full Descriptive Product Name (including year for vehicles)", 
                        "category": "Category", 
                        "subcategory": "Precise Subcategory",
                        "tags": ["Tag1", "Tag2", "Tag3", "Tag4", "Tag5"],
                        "approxPrice": number (Naira), 
                        "condition": "new" | "foreign-used" | "nigerian-used" | "refurbished", 
                        "sourceUrl": "https://www.alibaba.com/product-detail/...", 
                        "image_url": "https://s.alicdn.com/.../image.jpg", 
                        "description": "Detailed 80-200 word product description covering features, benefits, use cases, materials, and ideal buyer profile.", 
                        "specs": { "Key1": "Value1", "Key2": "Value2", "...": "Minimum 8 key-value pairs" } 
                    }
                ]
            }

            CRITICAL RULES:
            - The 'approxPrice' MUST be a realistic market value in Naira. It CANNOT be 0.
            - The 'description' MUST be specific and detailed, NOT generic filler text. MINIMUM 80 words.
            - The 'specs' MUST have at least 8 key-value pairs with real technical data.
            - Output ONLY raw, valid JSON. NO markdown.
            `;
        } else {
            // Mode 2: Deep Analysis (Temu/Global First)
            const anchorContext = anchorPrice
                ? `\n            PRICE ANCHOR (CRITICAL): The user was previously quoted approximately ₦${anchorPrice.toLocaleString()} for this product. Your recommendedPrice MUST be within 30% of this anchor (between ₦${Math.round(anchorPrice * 0.7).toLocaleString()} and ₦${Math.round(anchorPrice * 1.3).toLocaleString()}). DO NOT return a price wildly different from the anchor. The anchor was generated by YOUR OWN previous search — consistency is mandatory.\n`
                : "";

            prompt = `
            You are a price intelligence engine for FairPrice Nigeria.
            Product: "${productName}"
            ${anchorContext}
            Task: Determine the "Fair Price" for this product in Nigeria.
            
            CRITICAL SOURCING (MANDATORY):
            - YOU MUST USE cars45.com AND jiji.ng AS THE PRIMARY MANDATORY SOURCES FOR VEHICLE PRICING.
            - Fetch current listings and verify real-world selling prices on the Nigerian market.
            
            *** ASSET QUALITY & IMAGES (MANDATORY) ***
            - ALWAYS PRIORITIZE HIGH-RESOLUTION, PROFESSIONAL IMAGES.
            - For vehicles: Prefer images from cars45.com or official manufacturer press kits.
            
            CRITICAL VEHICLE PRICING (LUXURY GUARD):
            - A 2018-2022 Lexus RX 350 (Nigerian/Foreign Used) costs ₦35M to ₦60M.
            - A 2018+ Land Cruiser/Prado costs ₦65M - ₦130M+.
            - NEVER return a price below ₦12M for a whole functional vehicle from 2018 onwards.
            - IF the user ANCHOR is 43M and your search says 75k, you are LIKELY looking at a TOY or SPARE PART. STICK TO THE 43M RANGE.
            
            CRITICAL SOURCING RULES:
            - YOU MUST USE cars45.com AND jiji.ng AS THE PRIMARY MANDATORY SOURCES FOR VEHICLE PRICING.
            - GLOBAL SOURCE: Factor in 70-100% import duties/clearing markup.
            - LOCAL SOURCE (cars45.com, jiji.ng): Use landed market prices.
default to NEW from 2024 onwards.
            
            Return JSON:
            {
                "productName": "The actual full specific name with year for vehicles, without store prefixes.",
                "category": "phones" | "computers" | "fashion" | "cars" | "energy" | "other",
                "subcategory": "A precise string (e.g., 'SUV', 'Gaming Laptop', 'Smart Watch')",
                "tags": ["Tag1", "Tag2", "Tag3", "Tag4", "Tag5", "Tag6"],
                "shortDescription": "A concise, 1-2 sentence overview focusing on the product's primary value proposition.",
                "highlights": [
                    "A detailed bulleted list of 5-8 unique selling points.",
                    "Focus on quality, reliability, and specific premium features.",
                    "Each highlight should be informative and valuable to a buyer."
                ],
                "image_url": "A direct URL to a high-quality image of this exact product.",
                "marketAverage": number,
                "marketLow": number,
                "marketHigh": number,
                "recommendedPrice": number,
                "currency": "₦",
                "sources": [
                    { "source": "Global Stores (Direct Source)", "price": number, "type": "global", "url": "https://..." }
                ],
                "priceDirection": "rising" | "stable" | "falling",
                "justification": "Transparency on FairPrice pricing compared to market.",
                "condition": "new" | "foreign-used" | "nigerian-used" | "refurbished",
                "confidence": "high",
                "specs": {
                    "Key": "Value"
                }
            }
            
            SPECS TABLE (CRITICAL):
            - Return a "specs" object with 15-25 key-value pairs for Vehicles/Electronics, and 10-15 for other categories.
            - Provide EVERY detail a buyer would want (Power, dimensions, materials, certifications, etc.).
            - For vehicles: Year, Engine, Horsepower, Torque, Fuel Type, Transmission, Drive Type, Range/Mileage, Seating Capacity, Top Speed, Dimensions, Cargo Space, Safety Features, and any other unique technical details.
            - For phones/laptops: Processor, Clock Speed, RAM Type, Storage Type, Display Resolution, Refresh Rate, Battery Wh/mAh, Charging Speed, Camera Sensors, OS Version, Build Materials, Ports, and any other technical value.
            
            CRITICAL:
            - NEVER mention store names or specific prices in justification.
            - Ensure "shortDescription" is NOT just a repeat of the brand name or the "highlights".
            - Output ONLY raw, valid JSON.
            `;
        }

        // Retry with exponential backoff for Gemini 429 (free tier: 15 RPM).
        // Grounding (google_search) is a billing multiplier — only enable it for
        // deep-analyze mode where real-time web prices are essential. Search-mode
        // suggestions come from Gemini's trained knowledge which is accurate enough
        // and ~40% cheaper without grounding.
        const fetchWithRetry = async (attempt = 0, useGrounding = mode === "analyze"): Promise<Response> => {
            const body: any = {
                contents: [{ parts: [{ text: prompt }] }]
            };

            // Only use grounding if specified (to allow fallback when grounding hits limits)
            if (useGrounding) {
                body.tools = [{ google_search: {} }];
            }

            const res = await fetch(`${API_URL}?key=${GEMINI_API_KEY}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            });

            // Retry on 429 (rate limit) or 503 (overloaded) up to 5 times,
            // but fail fast if the 429 is a billing/spend-cap block (no retries will help).
            if ((res.status === 429 || res.status === 503) && attempt < 5) {
                const errText = await res.clone().text().catch(() => "");
                const isBillingBlock = /quota|billing|spend.?cap|payment|budget/i.test(errText);
                if (isBillingBlock) return res; // fail fast — retrying won't help

                const backoffMs = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
                await new Promise(r => setTimeout(r, backoffMs));

                // If we've hit 429 multiple times with grounding, try one without grounding as a last resort
                const nextUseGrounding = (attempt >= 3 && res.status === 429) ? false : useGrounding;
                return fetchWithRetry(attempt + 1, nextUseGrounding);
            }
            return res;
        };

        let response = await fetchWithRetry();

        if (!response.ok) {
            const errorText = await response.text();
            const isBillingBlock = /quota|billing|spend.?cap|payment|budget/i.test(errorText);

            if (response.status === 429 && isBillingBlock) {
                // Gemini spend cap exceeded — fall back to Qwen with real-time internet search
                console.warn("Gemini billing block detected; falling back to Qwen search.");
                const qwenRes = await tryQwenSearch(prompt);
                if (qwenRes) {
                    response = qwenRes; // Qwen returns Gemini-shaped JSON — parse path below works unchanged
                } else {
                    return NextResponse.json(
                        { error: "AI search is currently unavailable. Please try again shortly." },
                        { status: 503 }
                    );
                }
            } else {
                console.error("Gemini API Error:", response.status, errorText);
                if (response.status === 429) {
                    return NextResponse.json(
                        { error: "AI search is currently busy. Please try again in 30 seconds." },
                        { status: 429 }
                    );
                }
                return NextResponse.json({ error: "Failed to fetch from Gemini" }, { status: response.status });
            }
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

            // ─── INTELLIGENT PRODUCT PRICE HALLUCINATION DEFENSE (zero-latency) ───
            if (mode === "search" && parsedData.suggestions && Array.isArray(parsedData.suggestions)) {
                const queryYearMatch = productName.match(/\b(202[0-9]|20[0-1][0-9]|19[0-9]{2})\b/);
                const queryYear = queryYearMatch ? parseInt(queryYearMatch[0], 10) : null;

                parsedData.suggestions = parsedData.suggestions.filter((item: any) => {
                    const name = (item.name || "").toLowerCase();
                    const cat = (item.category || "").toLowerCase();
                    const price = item.approxPrice || 0;

                    const itemYearMatch = name.match(/\b(202[0-9]|20[0-1][0-9]|19[0-9]{2})\b/);
                    const itemYear = itemYearMatch ? parseInt(itemYearMatch[0], 10) : null;

                    // ─── VEHICLE HALLUCINATION FLOOR ───
                    // 2022+ cars should never be below 18M. 2015-2021 should never be below 8M. Older cars at 5M.
                    const VEHICLE_FLOOR = (itemYear && itemYear >= 2022) ? 18_000_000 : (itemYear && itemYear >= 2015) ? 8_000_000 : 5_000_000;
                    
                    // ─── PREMIUM PHONE FLOOR (iPhone 13+, Galaxy S22+) ───
                    const isPremiumPhone = /\b(iphone\s*(13|14|15|16)|galaxy\s*s(22|23|24|25|26))\b/i.test(name);
                    const PHONE_FLOOR = (name.includes("pro max") || name.includes("ultra") || name.includes("fold")) ? 650_000 : 350_000;

                    const PART_KEYWORDS = /\b(part|spare|filter|oil|brake|pad|tire|tyre|wheel|rim|bumper|headlight|taillight|mirror|sensor|plug|belt|gasket|radiator|alternator|starter|bearing|cable|fuse|relay|wiper|muffler|exhaust|caliper|rotor|hose|seal|cap|cover|mount|arm|link|joint|boot|liner|mat|key|fob|charger|adapter|case|phone|smartphone|tablet|earphone|earbuds|headphone|watch|smart\s*watch|powerbank|speaker|laptop|notebook|scooter|bicycle|bike|motorcycle|accessory|accessories|iron|serum|tv|television|smart\s*tv|screen|display|monitor|inverter|battery\s*system|solar|kit|toy|scale\s*model|diecast|miniature)\b/i;
                    const WHOLE_VEHICLE = /\b(sedan|suv|hatchback|coupe|convertible|pickup|truck|van|minivan|crossover|wagon|limo|limousine|roadster|model\s*[s3xy]|song\s*plus|song\s*pro|han|tang|seal|dolphin|atto|seagull|camry|corolla|rav4|highlander|prado|land\s*cruiser|fortuner|hilux|civic|accord|cr-?v|tucson|santa\s*fe|elantra|sonata|creta|venue|seltos|sportage|sorento|range\s*rover|defender|discovery|evoque|velar|mustang|explorer|escape|bronco|f-?150|ranger|malibu|equinox|trailblazer|tahoe|suburban|silverado|uni-?[tkv]|jetour|dasheng|coolray|emgrand|azkarra|okavango|haval|jolion|cannon|tank|gwm|changan|cs[0-9]+|tiggo|omoda|jaecoo|dm-?i|phev|bev|hybrid|xiaomi\s*su7|su7|lexus|rx\s*350|gx\s*460|lx\s*570|lx\s*600|benz|mercedes|bmw|audi|porsche)\b/i;

                    const isVehicleCategory = cat.includes("car") || cat.includes("vehicle") || cat.includes("auto");
                    const isWholeVehicle = WHOLE_VEHICLE.test(name);

                    // Block suspicious whole vehicle prices
                    if (isWholeVehicle && !PART_KEYWORDS.test(name) && price < VEHICLE_FLOOR) {
                        console.warn(`🚫 PRICE HALLUCINATION BLOCKED: "${item.name}" at ₦${price.toLocaleString()} (floor: ₦${VEHICLE_FLOOR.toLocaleString()})`);
                        return false;
                    }

                    // Block suspicious premium phone prices
                    if (isPremiumPhone && !PART_KEYWORDS.test(name) && price < PHONE_FLOOR) {
                         console.warn(`🚫 PHONE PRICE HALLUCINATION BLOCKED: "${item.name}" at ₦${price.toLocaleString()} (floor: ₦${PHONE_FLOOR.toLocaleString()})`);
                         return false;
                    }

                    // Generic sanity check: Nothing over ₦100,000 should be called a "toy" or "replica" if it's meant to be a real product
                    if (price > 100_000 && (name.includes("toy") || name.includes("replica") || name.includes("model car"))) {
                        console.warn(`🚫 TOY/REPLICA BLOCKED: "${item.name}" at ₦${price.toLocaleString()}`);
                        return false;
                    }

                    return true;
                });

                // ─── SERVER-SIDE GROUNDING URL SANITIZATION ───
                // Gemini sometimes returns Google's Grounding/VertexAI redirect URLs as image_url.
                // These expire in minutes and cause proxy timeouts on the client. Strip them here
                // so the client falls straight to background image hydration via /api/product-image.
                const GROUNDING_PATTERNS = [
                    'googleusercontent.com/grounding',
                    'vertexaisearch.cloud.google.com',
                    'grounding-api-redirect',
                    'googleapis.com/download',
                    'google.com/imgres',
                ];
                parsedData.suggestions = parsedData.suggestions.map((item: any) => {
                    const imgUrl = item.image_url || '';
                    const lower = imgUrl.toLowerCase();
                    if (GROUNDING_PATTERNS.some(p => lower.includes(p))) {
                        item.image_url = '';
                    }
                    return item;
                });

                // ─── IMAGE SHARING FALLBACK (Zero-latency) ───
                // If some results have valid permanent images and others don't, share the valid
                // image among variants of the same search query (related products).
                const isValidPermanentUrl = (url: any) =>
                    url && typeof url === 'string' && url.trim() !== '' &&
                    url.startsWith('http') &&
                    !url.toLowerCase().includes('no photo') &&
                    !url.toLowerCase().includes('n/a') &&
                    !url.toLowerCase().includes('placeholder') &&
                    !GROUNDING_PATTERNS.some(p => url.toLowerCase().includes(p));

                const validImages = parsedData.suggestions
                    .map((item: any) => item.image_url)
                    .filter(isValidPermanentUrl);

                if (validImages.length > 0) {
                    // Use the most frequent valid image or the first one
                    const fallbackImage = validImages[0];
                    parsedData.suggestions = parsedData.suggestions.map((item: any) => {
                        if (!isValidPermanentUrl(item.image_url)) {
                            item.image_url = fallbackImage;
                        }
                        return item;
                    });
                } else {
                    // ─── POWER FIX: Server-Side Image Hydration via Serper/Google CSE ───
                    // Gemini returned ZERO valid images. Call our image search pipeline
                    // server-side (no Gemini quota used) to fetch a real product image.
                    console.log(`🔍 No Gemini images for "${productName}". Hydrating via Serper...`);
                    try {
                        const hydratedImage = await hydrateImageServerSide(productName, category);
                        if (hydratedImage) {
                            // CDN-wrap the image so it routes through our domain
                            const cdnImage = hydratedImage.startsWith('http')
                                ? `/api/image-cdn?url=${encodeURIComponent(hydratedImage)}`
                                : hydratedImage;
                            // Propagate to ALL suggestions
                            parsedData.suggestions = parsedData.suggestions.map((item: any) => {
                                if (!isValidPermanentUrl(item.image_url)) {
                                    item.image_url = cdnImage;
                                }
                                return item;
                            });
                            console.log(`✅ Hydrated ${parsedData.suggestions.length} products with image from Serper`);
                        }
                    } catch (imgErr) {
                        console.warn(`⚠️ Server-side image hydration failed:`, imgErr);
                    }
                }

                // ─── CDN-WRAP ALL IMAGES (ensure every image routes through our domain) ───
                parsedData.suggestions = parsedData.suggestions.map((item: any) => {
                    if (item.image_url && item.image_url.startsWith('http') && !item.image_url.includes('/api/image-cdn')) {
                        item.image_url = `/api/image-cdn?url=${encodeURIComponent(item.image_url)}`;
                    }
                    return item;
                });
            }

            // Post-processing: Clamp prices to anchor if provided (prevents hallucination)
            if (anchorPrice && mode === "analyze" && parsedData.recommendedPrice) {
                const ratio = parsedData.recommendedPrice / anchorPrice;
                // If Gemini's price deviates more than 50% from anchor, force-align it
                if (ratio > 1.5 || ratio < 0.5) {
                    console.warn(`Price clamp triggered: Gemini returned ₦${parsedData.recommendedPrice} vs anchor ₦${anchorPrice}. Clamping.`);
                    parsedData.recommendedPrice = anchorPrice;
                    // Also align market prices proportionally
                    parsedData.marketAverage = Math.round(anchorPrice * 1.15);
                    parsedData.marketLow = Math.round(anchorPrice * 0.85);
                    parsedData.marketHigh = Math.round(anchorPrice * 1.5);
                    // Align source prices
                    if (parsedData.sources) {
                        parsedData.sources = parsedData.sources.map((s: any, i: number) => ({
                            ...s,
                            price: Math.round(anchorPrice * (0.9 + (i * 0.1)))
                        }));
                    }
                }
            }

            // ─── WRITE THROUGH TO SERVER CACHE (fire-and-forget) ───
            // Skip caching zero-result search responses — an empty result set
            // would poison the cache for 24h, making all subsequent queries return nothing.
            const shouldCache = !(mode === "search" && parsedData.suggestions?.length === 0);
            if (shouldCache) {
                db.searchCache.upsert({
                    where: { query: cacheKey },
                    create: { query: cacheKey, products: parsedData as any },
                    update: { products: parsedData as any },
                }).catch((e) => console.warn("[gemini-price] cache write failed:", (e as any)?.message || e));
            }

            // ─── FIRE-AND-FORGET: Backfill DB product images ───
            // SAFETY: Only updates global-partners products that CURRENTLY have a
            // placeholder image. Never touches other sellers or manually-updated images.
            if (mode === "search" && parsedData.suggestions) {
                for (const item of parsedData.suggestions) {
                    if (item.image_url && !item.image_url.includes('placeholder')) {
                        const slug = (item.name || "").toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 80);
                        const productId = `global-${slug}`;
                        db.product.updateMany({
                            where: {
                                id: { startsWith: productId.slice(0, 30) },
                                sellerId: 'global-partners',
                                imageUrl: { contains: 'placeholder' },
                            },
                            data: { imageUrl: item.image_url },
                        }).catch(() => {}); // Silent — best effort
                    }
                }
            }


            // Fire-and-forget: log to Firebase (Google Cloud) for ZEMA 360 live ops dashboard
            logZemaEvent({
                type: mode === 'search' ? 'gemini_query' : 'price_verified',
                description: mode === 'search'
                    ? `Product search: "${productName}"`
                    : `Price analysis: "${productName}"`,
                product: productName,
                mode,
                model: 'gemini-2.5-flash',
                count: mode === 'search' ? (parsedData.suggestions?.length || 0) : 1,
            }).catch(() => {});

            return NextResponse.json(parsedData, { headers: { "X-Cache": "MISS" } });
        } catch (parseError) {
            console.error("Failed to parse Gemini JSON. Raw text:", textResponse);
            return NextResponse.json({ error: "Invalid JSON from Gemini" }, { status: 500 });
        }

    } catch (error) {
        console.error("API Route Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
