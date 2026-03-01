import { NextResponse } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

export async function POST(req: Request) {
    if (!GEMINI_API_KEY) {
        return NextResponse.json({ error: "Gemini API key not configured" }, { status: 500 });
    }

    try {
        const { productName, region, mode = "analyze", anchorPrice } = await req.json();

        if (!productName) {
            return NextResponse.json({ error: "Product name is required" }, { status: 400 });
        }

        let prompt = "";

        if (mode === "search") {
            // Mode 1: Search Suggestions
            prompt = `
            You are a shopping assistant for FairPrice Nigeria. Current year: 2026.
            User Query: "${productName}"
            
            Task: Find 8-10 distinct, real products that match this query.
            
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
            
            CRITICAL SPECS:
            - Include a "specs" object with 5-8 key specifications for each product.
            - For vehicles: Engine, Horsepower, Fuel Type, Transmission, Drive Type, Range/Mileage, Seating, Year.
            - For phones: Screen Size, Processor, RAM, Storage, Battery, Camera.
            - For hair/beauty: Length, Texture, Material, Origin, Weight, Color.
            - For fashion: Size Range, Material, Color, Brand.
            - For electronics: Key technical specs relevant to the product.
            
            ANONYMIZATION & LINKS (CRITICAL): 
            - NEVER mention any real store name in the product *name*.
            - YOU HAVE GOOGLE SEARCH ENABLED. You MUST utilize it to find REAL products that match the query, preferably from global wholesale/retail platforms like Alibaba, AliExpress, Amazon, Jiji, or official manufacturer sites.
            - For the \`sourceUrl\`, provide the REAL product link you found during your search (e.g., https://www.alibaba.com/product-detail/...).
            - For the \`image_url\`, provide the REAL direct image link from the product page (e.g., https://s.alicdn.com/@sc04/kf/...jpg or https://m.media-amazon.com/...jpg). DO NOT hallucinate image URLs. If you cannot extract a real valid image URL, leave it as an empty string "".
            
            Return JSON:
            {
                "suggestions": [
                    { "name": "Full Descriptive Product Name (including year for vehicles)", "category": "Category", "approxPrice": number (Naira), "condition": "new" | "foreign-used" | "nigerian-used" | "refurbished", "sourceUrl": "https://www.alibaba.com/product-detail/...", "image_url": "https://s.alicdn.com/.../image.jpg", "specs": { "Key": "Value" } }
                ]
            }

            CRITICAL RULES:
            - The 'approxPrice' MUST be a realistic market value in Naira. It CANNOT be 0.
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
               - Highlight that our transparent 6-10% margin makes us cheaper than the inflated prices often seen on competitors.
            
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
                "description": "A very detailed, 2-3 sentence description of the product.",
                "image_url": "A direct URL to a high-quality image of this exact product. MUST be a direct .jpg/.png retail link. MUST NOT be a vertexaisearch.cloud.google.com or grounding-api-redirect link.",
                "marketAverage": number,
                "marketLow": number,
                "marketHigh": number,
                "recommendedPrice": number,
                "currency": "₦",
                "sources": [
                    { "source": "Global Stores (Direct Source)", "price": number, "type": "global", "url": "https://..." },
                    { "source": "Local Vendor (Verified Local Vendor)", "price": number, "type": "local", "url": "https://..." }
                ],
                "priceDirection": "rising" | "stable" | "falling",
                "justification": "Be TRANSPARENT but NEVER mention store names or specific price numbers. State whether FairPrice is competitive and WHY using relative language only.",
                "condition": "new" | "foreign-used" | "nigerian-used" | "refurbished" | "used",
                "confidence": "high" | "medium" | "low",
                "category": "phones" | "computers" | "fashion" | "cars" | "energy" | "other",
                "specs": {
                    "Key1": "Value1",
                    "Key2": "Value2"
                }
            }
            
            SPECS TABLE (CRITICAL):
            - Return a "specs" object with 6-10 key-value pairs of the most important specifications.
            - For vehicles: Year, Engine, Horsepower, Fuel Type, Transmission, Drive Type, Range/Mileage, Seating Capacity, Top Speed, Dimensions.
            - For phones: Screen Size, Processor, RAM, Storage, Battery, Main Camera, Selfie Camera, OS.
            - For electronics: Relevant technical specs for the product type.
            - For fashion/general: Material, Size Range, Color Options, Origin, etc.
            
            CRITICAL:
            - NEVER mention any store, vendor, website name, or vendor country in ANY field including justification, description, and sources.
            - NEVER mention specific price numbers in the justification field.
            - marketAverage MUST be a realistic non-zero number.
            - Use "Global Stores" for international sources and "Verified Local Vendor" for local sources.
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
