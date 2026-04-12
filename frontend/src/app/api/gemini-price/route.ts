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
            
            CRITICAL — QUERY INTERPRETATION & YEAR VARIETY:
            - ALWAYS treat the FULL query as a single concept/product. Do NOT split it into individual words.
            - If the User Query contains a specific YEAR (e.g., "2025"), PRIORITIZE that year in the top results.
            - HOWEVER, you MAY also return earlier model years (e.g., 2022, 2023) to provide variety on the Search Results Page (SRP).
            
            VEHICLE & CONDITION RULES:
            - For cars/vehicles: ALWAYS include the YEAR in the product name (e.g., "2025 Toyota Vios 1.3 XLE A/T").
            - For NEW or 2022-2025 models: Prices in Nigeria are significantly higher due to duties and logistical costs.
            - BENCHMARK: A 2022 Toyota Vios in the Nigerian market is approx ₦19,500,000. 
            - Therefore, a 2025 Toyota Vios MUST be estimated higher (approx ₦22M - ₦28M) depending on trim.
            - Include different conditions: Brand New, Foreign Used (Tokunbo), Nigerian Used.
            - If user doesn't specify new/used, default to the FAIREST PRICE for a NEW unit from 2024 onwards.
            
            *** CRITICAL PRICING RULES — READ CAREFULLY ***
            - The 'approxPrice' MUST reflect the TRUE REAL AVERAGE MARKET FAIRPRICE in Nigeria.
            - We are a FAIRPrice platform: Our goal is transparency and value. Do NOT overcharge, but do NOT underprice.
            - ACCURACY OVER MARGIN: ALWAYS aim for the most realistic median market rate found in your Google Search results.
            - SOURCE-AWARE DUTIES:
                - If the source is GLOBAL (e.g., Alibaba, Global Stores): You MUST factor in a 70-100% markup for import duties and clearing in Nigeria to reach a realistic landed price.
                - If the source is LOCAL (e.g., Jiji, Nigerian Market): The price is already "landed" and "cleared," so do NOT add the 70-100% markup.
            - Add a MODEST 6-10% FairPrice marketplace margin (profit) on top of the landed cost.
            - Do NOT quote artificially inflated or deflated prices. The final price should be what an informed buyer would consider "Fair" and "Realistic" in current Nigerian market conditions.

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
            - FOR GLOBAL SOURCED PRODUCTS: Factor in import duties, shipping, and clearing costs.
            - FOR LOCAL SOURCED PRODUCTS: Use existing localized pricing.
            - REMOVE any mention of an online store name from the product name.
            
            PRICING LOGIC & COMPETITIVE BENCHMARKING (CRITICAL):
            1. **Determine Our Baseline Cost (Global sourcing or Local Wholesale)**:
               - *** CRITICAL EXCEPTION FOR "REFURBISHED" / "MASTER COPY" DEVICES ***: If the product is a high-end phone (like an iPhone 15/16) and the user specified "refurbished", "copy", or "replica", you MUST base the cost on the Asian Counterfeit/Replica market price ($150 - $350) + shipping, resulting in a baseline of ₦150,000 to ₦350,000. DO NOT use the genuine retail price. 
               - For vehicles: Factor in 70-100% of the base price for customs and clearing in Nigeria ONLY IF THE SOURCE IS GLOBAL (e.g., Alibaba). 
               - If the source is LOCAL (e.g., Jiji), the price is already "landed" and "cleared."
               - For normal Global Imports (electronics, fashion, imports): Global price + Shipping (₦5k small to ₦30k large, or ₦500k-₦2M for cars) + Import Duties (20-70%).
               
            2. **Calculate Our \`recommendedPrice\`**:
               - Add a FAIR margin of exactly 6% to 10% on top of the Baseline Cost. 
               - ALWAYS favor the higher end of searched results for vehicles to ensure realism.
 
            3. **Determine Competitor Market Prices (Jumia, Jiji, etc.)**:
               - YOU MUST actively search competitors for this EXACT product.
               - For vehicles (Toyota Vios, Corolla, etc.), search Jiji specifically to find current dealer rates.
               - Set \`marketHigh\` to the HIGHEST verifiable competitor price you can find.
               - EXTREMELY IMPORTANT: Ensure our \`recommendedPrice\` is realistic. For example, a 2022 Toyota Vios is ₦19.5M+ on Jiji, so a 2025 model MUST be north of that.
               - Our highly efficient 6-10% margin should routinely beat standard market retail prices.
               
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
                    const PART_KEYWORDS = /\b(part|spare|filter|oil|brake|pad|tire|tyre|wheel|rim|bumper|headlight|taillight|mirror|sensor|plug|belt|gasket|radiator|alternator|starter|bearing|cable|fuse|relay|wiper|muffler|exhaust|caliper|rotor|hose|seal|cap|cover|mount|arm|link|joint|boot|liner|mat|key|fob|charger|adapter|case|phone|smartphone|tablet|earphone|earbuds|headphone|watch|smart\s*watch|powerbank|speaker|laptop|notebook|scooter|bicycle|bike|motorcycle|accessory|accessories)\b/i;
                    const WHOLE_VEHICLE = /\b(sedan|suv|hatchback|coupe|convertible|pickup|truck|van|minivan|crossover|wagon|limo|limousine|roadster|model\s*[s3xy]|model\s*3|model\s*y|song\s*plus|song\s*pro|han|tang|seal|dolphin|atto|seagull|camry|corolla|rav4|highlander|prado|land\s*cruiser|fortuner|hilux|civic|accord|cr-?v|hr-?v|pilot|tucson|santa\s*fe|elantra|sonata|creta|venue|seltos|sportage|sorento|carnival|forte|3008|2008|5008|partner|expert|range\s*rover|defender|discovery|evoque|velar|x[1-7]|[1-8]\s*series|a[1-8]|q[2-8]|tt|r8|e-?tron|mustang|explorer|escape|bronco|f-?150|ranger|malibu|equinox|trailblazer|tahoe|suburban|silverado|uni-?[tkv]|jetour|dasheng|coolray|emgrand|azkarra|okavango|haval|jolion|cannon|tank|gwm|changan|cs[0-9]+|eado|uni-?[tkv]|trumpchi|gs[0-9]|ga[0-9]|m[68]|empow|geely|avatr|zeekr|lynk|nio|es[0-9]|et[0-9]|ec[0-9]|p7|g[369]|g9|xpeng|xiaomi\s*su7|su7|smart\s*#[0-9]|wey|ora|thunder|s7|seres|voyah|dongfeng|jac|foton|tata|mahindra|chery|tiggo|arrizo|omoda|jaecoo|dm-?i|phev|bev|hybrid)\b/i;

                    if (price >= VEHICLE_FLOOR) return true;
                    if (PART_KEYWORDS.test(name)) return true;

                    const isVehicleCategory = cat.includes("car") || cat.includes("vehicle") || cat.includes("auto");
                    const isWholeVehicle = WHOLE_VEHICLE.test(name);

                    if ((isVehicleCategory || isWholeVehicle) && !PART_KEYWORDS.test(name) && price < VEHICLE_FLOOR) {
                        console.warn(`🚫 PRICE HALLUCINATION BLOCKED: "${item.name}" at ₦${price.toLocaleString()} (floor: ₦${VEHICLE_FLOOR.toLocaleString()})`);
                        return false;
                    }

                    return true;
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
