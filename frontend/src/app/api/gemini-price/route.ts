import { NextResponse } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

export async function POST(req: Request) {
    if (!GEMINI_API_KEY) {
        return NextResponse.json({ error: "Gemini API key not configured" }, { status: 500 });
    }

    try {
        const { productName, region, mode = "analyze", anchorPrice, category } = await req.json();

        if (!productName) {
            return NextResponse.json({ error: "Product name is required" }, { status: 400 });
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
            
            CRITICAL — QUERY INTERPRETATION:
            - ALWAYS treat the FULL query as a single concept/product. Do NOT split it into individual words.
            - Example: "bone straight human hair" → This is a type of HAIR EXTENSION/WIG, NOT anything related to bones or fertilizer.
            - Example: "red bottom shoes" → Christian Louboutin-style shoes, NOT red-colored shoe soles.
            - Example: "Brazilian body wave" → Hair weave/extension style, NOT anything about Brazil or ocean waves.
            - Example: "magic bullet" → Blender/food processor, NOT ammunition.
            - ALWAYS prioritize the most common consumer shopping intent for the phrase.
            - When in doubt, consider: what would a Nigerian shopper MOST LIKELY be looking for with this exact phrase?
            
            CRITICAL PRODUCT ORDERING:
            - The FIRST result MUST be the EXACT main product the user is looking for.
            - Results 2-4: Closely related variants, trims, or conditions of the same product.
            - Results 5-10: Related products, alternatives, or complementary items.
            - Do NOT fill results with unrelated products that only match individual words from the query.
            
            VEHICLE & CONDITION RULES:
            - For cars/vehicles: ALWAYS include the YEAR in the product name (e.g., "2024 JETOUR Dasheng 1.6 TGDI").
            - Include different conditions: Brand New, Foreign Used (Tokunbo), Nigerian Used.
            - If user doesn't specify new/used, default to the FAIREST PRICE for a NEW unit from 2024 onwards.
            - For phones/electronics: Include variants like "New", "Refurbished", "Open Box" when applicable.
            
            *** CRITICAL: 'REFURBISHED' / 'COPY' ELECTRONICS IN NIGERIA ***
            - In the Nigerian market, when users search for a "refurbished", "master copy", "clone", or "replica" of a high-end device (e.g., iPhone 15 Pro Max, Samsung S24 Ultra), they are almost always looking for the COUNTERFEIT/ASIAN CLONE version sourced from wholesale hubs like Alibaba or Shenzhen.
            - These clones cost roughly $150 to $350 USD globally.
            - Therefore, the landed price in Nigeria for a "Refurbished/Copy iPhone 15 Pro Max" should be roughly ₦150,000 to ₦350,000 NGN.
            - DO NOT return the genuine Apple/Samsung refurbished price (which would be ₦1,000,000+). ALWAYS use the counterfeit/clone price bracket for these specific query types.
            
            *** CRITICAL PRICING RULES — READ CAREFULLY ***
            - The 'approxPrice' MUST reflect the ACTUAL landed/delivered price in Nigeria, as found on real marketplaces like Alibaba, Jiji, CarXus, Autochek, or Nigerian car dealers.
            - Do NOT separately add import duties, shipping, or customs clearing on top of market prices. The price should be what a Nigerian buyer would ACTUALLY pay at a dealer or on a marketplace.
            - Add a reasonable 6-10% FairPrice marketplace margin (profit).
            
            VEHICLE PRICE CALIBRATION (use as reference — these are LANDED prices in Nigeria):
            - Chinese SUVs (Changan UNI-T, JETOUR, Geely, BYD, GWM) Brand New incl. delivery: ₦15,000,000 – ₦35,000,000
            - Chinese SUVs Foreign Used: ₦10,000,000 – ₦20,000,000
            - Toyota Camry 2024 Brand New: ₦28,000,000 – ₦38,000,000
            - Toyota RAV4 2024 Brand New: ₦32,000,000 – ₦45,000,000
            - Lexus RX 2024 Brand New: ₦45,000,000 – ₦65,000,000
            - iPhone 16 Pro Max: ₦1,200,000 – ₦1,800,000
            - Samsung Galaxy S25 Ultra: ₦900,000 – ₦1,400,000
            
            - For local Nigerian products (food, drinks, herbal): Use local market prices only.
            - Do NOT quote artificially inflated prices. When in doubt, use the LOWER end of the price range.

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
            
            ANONYMIZATION & LINKS (CRITICAL): 
            - NEVER mention any real store name in the product *name*.
            - YOU HAVE GOOGLE SEARCH ENABLED. You MUST utilize it to find REAL products that match the query, preferably from global wholesale/retail platforms like Alibaba, AliExpress, Amazon, Jiji, or official manufacturer sites.
            - Search aggressively for high-resolution images for EVERY product. If you invoke Google Search, explicitly hunt for image URLs.
            - For the \`sourceUrl\`, provide the REAL product link you found during your search (e.g., https://www.alibaba.com/product-detail/...).
            - For the \`image_url\`, provide the REAL direct image link from the product page (e.g., https://s.alicdn.com/@sc04/kf/...jpg or https://m.media-amazon.com/...jpg). DO NOT hallucinate image URLs. If you cannot extract a real valid image URL, leave it as an empty string "".
            
            Return JSON:
            {
                "suggestions": [
                    { "name": "Full Descriptive Product Name (including year for vehicles)", "category": "Category", "approxPrice": number (Naira), "condition": "new" | "foreign-used" | "nigerian-used" | "refurbished", "sourceUrl": "https://www.alibaba.com/product-detail/...", "image_url": "https://s.alicdn.com/.../image.jpg", "description": "Detailed 80-200 word product description covering features, benefits, use cases, materials, and ideal buyer profile.", "specs": { "Key1": "Value1", "Key2": "Value2", "...": "Minimum 8 key-value pairs" } }
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
            You are a price intelligence engine for FairPrice Nigeria (Current Year).
            Product: "${productName}"
            ${anchorContext}
            Task: Determine the "Fair Price" for this product in Nigeria.
            
            CRITICAL SOURCING RULES:
            - For cars/vehicles: Factor in import duties, shipping, and clearing costs.
            - For electronics/everyday: Check Nigerian e-commerce platforms.
            - For LOCAL Nigerian products (food, herbal, traditional): These are NOT imported. Price them based on LOCAL MARKET prices only. Do NOT add international shipping or import duties.
            - REMOVE any mention of an online store name from the product name.
            
            PRICING LOGIC & COMPETITIVE BENCHMARKING (CRITICAL):
            1. **Determine Our Baseline Cost (Global sourcing or Local Wholesale)**:
               - *** CRITICAL EXCEPTION FOR "REFURBISHED" / "MASTER COPY" DEVICES ***: If the product is a high-end phone (like an iPhone 15/16) and the user specified "refurbished", "copy", or "replica", you MUST base the cost on the Asian Counterfeit/Replica market price ($150 - $350) + shipping, resulting in a baseline of ₦150,000 to ₦350,000. DO NOT use the genuine retail price. 
               - For normal Global Imports (electronics, fashion, imports): Global price + Shipping (₦5k small to ₦30k large, or ₦500k-₦2M for cars) + Import Duties (20-70%).
               - For LOCALLY available products (food, drinks, cosmetics, standard retail items): Use local wholesale or base tracking cost. NEVER add international shipping/duties to items easily found in Nigerian markets.
               
            2. **Calculate Our \`recommendedPrice\`**:
               - Add a FAIR margin of exactly 6% to 10% on top of the Baseline Cost. 
               - This is what our users will pay ("FairPrice").

            3. **Determine Competitor Market Prices (Jumia, Ubuy, Konga, Jiji, etc.)**:
               - YOU MUST actively search competitors for this EXACT product.
               - To highlight our fair pricing, set \`marketHigh\` to the HIGHEST verifiable competitor price you can find (e.g., premium listings on Ubuy, Jumia, or established dealers).
               - Set \`marketAverage\` strongly towards this high range (e.g., 80-90% of the marketHigh).
               - Set \`marketLow\` to a standard competitor price. 
               - EXTREMELY IMPORTANT: Ensure our \`recommendedPrice\` looks like an EXCELLENT DEAL compared to the \`marketAverage\` and \`marketHigh\`. Our highly efficient 6-10% margin should routinely beat standard market retail prices.
               
            4. **TRANSPARENCY (CRITICAL)**:
               - Explain whether FairPrice is higher or lower than market and WHY.
               - Do NOT mention specific price numbers in the justification text. Instead use relative language like "highly competitive", "significantly below market average", "includes import costs".
               - Highlight that our transparent 5-10% margin makes us cheaper than the inflated prices often seen on competitors.
            
            ABSOLUTE ANONYMIZATION RULES (CRITICAL — VIOLATION = FAILURE):
            - NEVER mention ANY specific store, website, vendor, or marketplace name ANYWHERE in your response.
            - This includes: Jumia, Konga, Jiji, Shop9ja, NaijaMart, AliExpress, Temu, Amazon, eBay, Alibaba, Made-in-China, Slot, PCPlace, Cars45, Ubuy, or ANY other store.
            - Do NOT mention any country or region where a vendor is based (e.g., "a South African vendor").
            - Use ONLY these labels: "Global Stores", "Verified Local Vendor", "local market", "authorized distributor", "online marketplace".
            - The justification MUST NOT reference any real store name or specific prices. Say "available from verified local vendors at competitive rates" instead.
            
            VEHICLE & CONDITION RULES:
            - For cars/vehicles: ALWAYS include the YEAR in productName.
            - Include condition: "new", "foreign-used", "nigerian-used", or "refurbished".
            - If user doesn't specify, default to NEW from 2024 onwards.
            
            Return JSON:
            {
                "productName": "The actual full specific name with year for vehicles, without store prefixes.",
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
                "category": "phones" | "computers" | "fashion" | "cars" | "energy" | "other",
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

            // ─── INTELLIGENT VEHICLE PRICE HALLUCINATION DEFENSE (zero-latency) ───
            // This runs pure in-memory string checks — adds <1ms to response time.
            if (mode === "search" && parsedData.suggestions && Array.isArray(parsedData.suggestions)) {
                const VEHICLE_FLOOR = 5_000_000; // ₦5M — even cheapest Chinese EVs land above this in Nigeria

                // Words that indicate this is a PART, ACCESSORY, or NON-VEHICLE product — NOT a whole car
                const PART_KEYWORDS = /\b(part|spare|filter|oil|brake|pad|tire|tyre|wheel|rim|bumper|headlight|taillight|mirror|sensor|plug|belt|gasket|radiator|alternator|starter|bearing|cable|fuse|relay|wiper|muffler|exhaust|caliper|rotor|hose|seal|cap|cover|mount|arm|link|joint|boot|liner|mat|key|fob|charger|adapter|case|phone|smartphone|tablet|earphone|earbuds|headphone|watch|smart\s*watch|powerbank|speaker|laptop|notebook|scooter|bicycle|bike|motorcycle|accessory|accessories)\b/i;

                // Words that indicate this IS a whole vehicle (model names, body types)
                const WHOLE_VEHICLE = /\b(sedan|suv|hatchback|coupe|convertible|pickup|truck|van|minivan|crossover|wagon|limo|limousine|roadster|model\s*[s3xy]|model\s*3|model\s*y|song\s*plus|song\s*pro|han|tang|seal|dolphin|atto|seagull|camry|corolla|rav4|highlander|prado|land\s*cruiser|fortuner|hilux|civic|accord|cr-?v|hr-?v|pilot|tucson|santa\s*fe|elantra|sonata|creta|venue|seltos|sportage|sorento|carnival|forte|3008|2008|5008|partner|expert|range\s*rover|defender|discovery|evoque|velar|x[1-7]|[1-8]\s*series|a[1-8]|q[2-8]|tt|r8|e-?tron|mustang|explorer|escape|bronco|f-?150|ranger|malibu|equinox|trailblazer|tahoe|suburban|silverado|uni-?[tkv]|jetour|dasheng|coolray|emgrand|azkarra|okavango|haval|jolion|cannon|tank|gwm|changan|cs[0-9]+|eado|uni-?[tkv]|trumpchi|gs[0-9]|ga[0-9]|m[68]|empow|geely|avatr|zeekr|lynk|nio|es[0-9]|et[0-9]|ec[0-9]|p7|g[369]|g9|xpeng|xiaomi\s*su7|su7|smart\s*#[0-9]|wey|ora|thunder|s7|seres|voyah|dongfeng|jac|foton|tata|mahindra|chery|tiggo|arrizo|omoda|jaecoo|dm-?i|phev|bev|hybrid)\b/i;

                parsedData.suggestions = parsedData.suggestions.filter((item: any) => {
                    const name = (item.name || "").toLowerCase();
                    const cat = (item.category || "").toLowerCase();
                    const price = item.approxPrice || 0;

                    // Skip check if price is already above the floor — fast path
                    if (price >= VEHICLE_FLOOR) return true;

                    // Skip check if this contains part/accessory/phone keywords — it's NOT a whole car
                    if (PART_KEYWORDS.test(name)) return true;

                    // Only apply floor if this looks like a WHOLE VEHICLE
                    const isVehicleCategory = cat.includes("car") || cat.includes("vehicle") || cat.includes("auto");
                    const isWholeVehicle = WHOLE_VEHICLE.test(name);

                    if ((isVehicleCategory || isWholeVehicle) && !PART_KEYWORDS.test(name) && price < VEHICLE_FLOOR) {
                        console.warn(`🚫 PRICE HALLUCINATION BLOCKED: "${item.name}" at ₦${price.toLocaleString()} (floor: ₦${VEHICLE_FLOOR.toLocaleString()})`);
                        return false; // Remove this hallucinated result
                    }

                    return true;
                });

                // ─── IMAGE SHARING FALLBACK (Zero-latency) ───
                // If some results have valid HD images and others don't, share the valid image among them
                // since they are all highly related variants of the same core search query.
                const validImages = parsedData.suggestions
                    .map((item: any) => item.image_url)
                    .filter((url: any) => url && typeof url === 'string' && url.trim() !== '' && !url.toLowerCase().includes('no photo') && !url.toLowerCase().includes('n/a'));

                if (validImages.length > 0) {
                    const fallbackImage = validImages[0];
                    parsedData.suggestions = parsedData.suggestions.map((item: any) => {
                        const currentImg = (item.image_url || "").toLowerCase();
                        if (!currentImg || currentImg === "" || currentImg.includes('no photo') || currentImg.includes('n/a')) {
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
