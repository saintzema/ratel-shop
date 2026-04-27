import { NextResponse } from "next/server";
import { db } from "@/lib/db";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

// Server-side cache TTL: 24h. Dramatically reduces Gemini quota consumption
// because identical queries ("iphone 15", "lexus rx 350") are served from Postgres.
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function makeCacheKey(productName: string, mode: string, category?: string, anchorPrice?: number): string {
    return `v1:${mode}:${(category || 'any').toLowerCase()}:${productName.trim().toLowerCase()}${anchorPrice ? `:a${anchorPrice}` : ''}`;
}

export async function POST(req: Request) {

    if (!GEMINI_API_KEY) {
        return NextResponse.json({ error: "Gemini API key not configured" }, { status: 500 });
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
                return NextResponse.json(cached.products as any, {
                    headers: { "X-Cache": "HIT" }
                });
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

        // Retry with exponential backoff for Gemini 429 (free tier: 15 RPM)
        const fetchWithRetry = async (attempt = 0): Promise<Response> => {
            const res = await fetch(`${API_URL}?key=${GEMINI_API_KEY}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    tools: [{ google_search: {} }]
                })
            });
            // Retry on 429 (Gemini rate limit) or 503 (overloaded) up to 5 times
            if ((res.status === 429 || res.status === 503) && attempt < 5) {
                const backoffMs = Math.pow(2, attempt) * 1000 + Math.random() * 1000; // 1s, 2s, 4s, 8s, 16s + jitter
                await new Promise(r => setTimeout(r, backoffMs));
                return fetchWithRetry(attempt + 1);
            }
            return res;
        };

        const response = await fetchWithRetry();

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Gemini API Error:", response.status, errorText);
            // Surface Gemini's rate limit clearly to the client so the UI can show a helpful message
            if (response.status === 429) {
                return NextResponse.json(
                    { error: "AI search is rate-limited right now. Please wait a moment and try again." },
                    { status: 429 }
                );
            }
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

            // ─── INTELLIGENT VEHICLE PRICE HALLUCINATION DEFENSE (zero-latency) ───
            if (mode === "search" && parsedData.suggestions && Array.isArray(parsedData.suggestions)) {
                const queryYearMatch = productName.match(/\b(202[0-9]|20[0-1][0-9]|19[0-9]{2})\b/);
                const queryYear = queryYearMatch ? parseInt(queryYearMatch[0], 10) : null;

                parsedData.suggestions = parsedData.suggestions.filter((item: any) => {
                    const name = (item.name || "").toLowerCase();
                    const cat = (item.category || "").toLowerCase();
                    const price = item.approxPrice || 0;

                    const itemYearMatch = name.match(/\b(202[0-9]|20[0-1][0-9]|19[0-9]{2})\b/);
                    const itemYear = itemYearMatch ? parseInt(itemYearMatch[0], 10) : null;

                    // ─── YEAR FILTER ───
                    // Prioritize queryYear, but allow variety on the SRP (Don't auto-block older models)
                    // if (queryYear && itemYear && itemYear < queryYear) {
                    //     console.warn(`🚫 YEAR MISMATCH BLOCKED: Query=${queryYear}, Result=${itemYear} for "${item.name}"`);
                    //     return false;
                    // }

                    // ─── VEHICLE HALLUCINATION FLOOR ───
                    const VEHICLE_FLOOR = (itemYear && itemYear >= 2020) ? 12_000_000 : 5_000_000;
                    const PART_KEYWORDS = /\b(part|spare|filter|oil|brake|pad|tire|tyre|wheel|rim|bumper|headlight|taillight|mirror|sensor|plug|belt|gasket|radiator|alternator|starter|bearing|cable|fuse|relay|wiper|muffler|exhaust|caliper|rotor|hose|seal|cap|cover|mount|arm|link|joint|boot|liner|mat|key|fob|charger|adapter|case|phone|smartphone|tablet|earphone|earbuds|headphone|watch|smart\s*watch|powerbank|speaker|laptop|notebook|scooter|bicycle|bike|motorcycle|accessory|accessories|iron|serum|tv|television|smart\s*tv|screen|display|monitor|inverter|battery\s*system|solar|kit)\b/i;
                    const WHOLE_VEHICLE = /\b(sedan|suv|hatchback|coupe|convertible|pickup|truck|van|minivan|crossover|wagon|limo|limousine|roadster|model\s*[s3xy]|model\s*3|model\s*y|song\s*plus|song\s*pro|han|tang|seal|dolphin|atto|seagull|camry|corolla|rav4|highlander|prado|land\s*cruiser|fortuner|hilux|civic|accord|cr-?v|hr-?v|pilot|tucson|santa\s*fe|elantra|sonata|creta|venue|seltos|sportage|sorento|carnival|forte|3008|2008|5008|partner|expert|range\s*rover|defender|discovery|evoque|velar|mustang|explorer|escape|bronco|f-?150|ranger|malibu|equinox|trailblazer|tahoe|suburban|silverado|uni-?[tkv]|jetour|dasheng|coolray|emgrand|azkarra|okavango|haval|jolion|cannon|tank|gwm|changan|cs[0-9]+|eado|uni-?[tkv]|trumpchi|gs[0-9]|ga[0-9]|m[68]|empow|geely|avatr|zeekr|lynk|nio|es[0-9]|et[0-9]|ec[0-9]|p7|g[69]|g9|xpeng|xiaomi\s*su7|su7|smart\s*#[0-9]|wey|ora|thunder|s7|seres|voyah|dongfeng|jac|foton|tata|mahindra|chery|tiggo|arrizo|omoda|jaecoo|dm-?i|phev|bev|hybrid)\b/i;

                    if (price >= VEHICLE_FLOOR) return true;
                    if (PART_KEYWORDS.test(name)) return true;

                    const isVehicleCategory = cat.includes("car") || cat.includes("vehicle") || cat.includes("auto");
                    const isWholeVehicle = WHOLE_VEHICLE.test(name);

                    if (isVehicleCategory && isWholeVehicle && !PART_KEYWORDS.test(name) && price < VEHICLE_FLOOR) {
                        console.warn(`🚫 PRICE HALLUCINATION BLOCKED: "${item.name}" at ₦${price.toLocaleString()} (floor: ₦${VEHICLE_FLOOR.toLocaleString()})`);
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
                    !url.toLowerCase().includes('no photo') &&
                    !url.toLowerCase().includes('n/a') &&
                    !GROUNDING_PATTERNS.some(p => url.toLowerCase().includes(p));

                const validImages = parsedData.suggestions
                    .map((item: any) => item.image_url)
                    .filter(isValidPermanentUrl);

                if (validImages.length > 0) {
                    const fallbackImage = validImages[0];
                    parsedData.suggestions = parsedData.suggestions.map((item: any) => {
                        if (!isValidPermanentUrl(item.image_url)) {
                            item.image_url = fallbackImage;
                        }
                        return item;
                    });
                }
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
            db.searchCache.upsert({
                where: { query: cacheKey },
                create: { query: cacheKey, products: parsedData as any },
                update: { products: parsedData as any },
            }).catch((e) => console.warn("[gemini-price] cache write failed:", (e as any)?.message || e));

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
