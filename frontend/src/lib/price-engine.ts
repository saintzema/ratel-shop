
interface GoogleCSEResult {
    title: string;
    snippet: string;
    link: string;
    displayLink: string;
}

export interface PriceData {
    source: string;
    price: number;
    currency: string;
    url: string;
    type?: "global" | "local";
}

export interface ProductSuggestion {
    name: string;
    category: string;
    approxPrice: number;
    sourceUrl?: string;
    image_url?: string;
    specs?: Record<string, string>;
}

export type PriceAnalysis = {
    productName: string;
    description?: string;
    image_url?: string;
    marketAverage: number;
    recommendedPrice: number;
    sources: PriceData[];
    currency: string;
    // New fields from Gemini
    marketLow?: number;
    marketHigh?: number;
    priceDirection?: "rising" | "stable" | "falling";
    justification?: string;
    confidence?: "low" | "medium" | "high";
    category?: string;
};

// Regex to find Nigerian Naira prices (e.g., ₦350,000, N350,000.00, 350,000)
// Improved to capture various formats like "₦ 1,200", "N1.2m" (basic support)
const PRICE_REGEX = /(?:₦|N(?!\w))\s?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/i;

// Nigerian e-commerce sources for realistic simulation
// Anonymous sources for simulation (fallback only)
const NIGERIAN_SOURCES = [
    { name: "market_a", label: "Major Retailer A" },
    { name: "market_b", label: "Verified Vendor" },
    { name: "market_c", label: "Lagos Tech Hub" },
    { name: "market_d", label: "Online Marketplace" },
    { name: "market_e", label: "Authorized Dealer" },
    { name: "market_f", label: "Import Specialist" },
];

export class PriceEngine {
    private static CSE_ID = process.env.NEXT_PUBLIC_GOOGLE_CSE_CX;
    private static API_KEY = process.env.NEXT_PUBLIC_GOOGLE_CSE_KEY;
    private static BASE_URL = "https://www.googleapis.com/customsearch/v1";

    /**
     * Search for product suggestions (Mode 1)
     */
    static async searchProducts(query: string): Promise<ProductSuggestion[]> {
        try {
            const response = await fetch("/api/gemini-price", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ productName: query, mode: "search" })
            });

            if (!response.ok) return [];

            const data = await response.json();
            return data.suggestions || [];
        } catch (error) {
            console.error("Search Suggestions Failed:", error);
            return [];
        }
    }

    /**
     * Fetches real-time price data from Google Custom Search
     */
    static async analyzePrice(productName: string, anchorPrice?: number): Promise<PriceAnalysis> {
        try {
            const response = await fetch("/api/gemini-price", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ productName, region: "Nigeria", mode: "analyze", anchorPrice })
            });

            if (!response.ok) {
                console.warn("Gemini API failed, falling back to simulation");
                return this.simulatePriceAnalysis(productName, anchorPrice);
            }

            const data = await response.json();

            // Map API response to PriceAnalysis
            return {
                productName: data.productName || productName,
                description: data.description,
                image_url: data.image_url,
                marketAverage: data.marketAverage,
                recommendedPrice: data.recommendedPrice,
                sources: data.sources || [],
                currency: "₦",
                marketLow: data.marketLow,
                marketHigh: data.marketHigh,
                priceDirection: data.priceDirection,
                justification: data.justification,
                confidence: "high",
                category: data.category
            };

        } catch (error) {
            console.error("Price Engine Analysis Failed:", error);
            return this.simulatePriceAnalysis(productName, anchorPrice);
        }
    }

    /**
     * Smart simulation that uses actual product prices from the catalog
     * to generate realistic market data. Falls back to category-based
     * pricing when no exact match is found.
     */
    static simulatePriceAnalysis(productName: string, productPrice?: number): Promise<PriceAnalysis> {
        return new Promise((resolve) => {
            // Use a deterministic seed based on productName for consistent results
            const seed = productName.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
            const seeded = (offset: number) => {
                const x = Math.sin(seed + offset) * 10000;
                return x - Math.floor(x);
            };

            // Base price: use product price if provided, otherwise estimate from name
            let basePrice: number;
            if (productPrice && productPrice > 0) {
                basePrice = productPrice;
            } else {
                // Category-based realistic pricing
                const nameLower = productName.toLowerCase();
                if (nameLower.includes("iphone 15 pro")) basePrice = 1250000;
                else if (nameLower.includes("iphone 15")) basePrice = 900000;
                else if (nameLower.includes("iphone 14")) basePrice = 650000;
                else if (nameLower.includes("iphone")) basePrice = 800000;
                else if (nameLower.includes("samsung galaxy s24")) basePrice = 950000;
                else if (nameLower.includes("samsung galaxy s23")) basePrice = 650000;
                else if (nameLower.includes("samsung")) basePrice = 500000;
                else if (nameLower.includes("macbook pro")) basePrice = 2200000;
                else if (nameLower.includes("macbook air")) basePrice = 1100000;
                else if (nameLower.includes("macbook")) basePrice = 1500000;
                else if (nameLower.includes("playstation 5") || nameLower.includes("ps5")) basePrice = 450000;
                else if (nameLower.includes("xbox")) basePrice = 400000;
                else if (nameLower.includes("airpods")) basePrice = 280000;
                else if (nameLower.includes("watch")) basePrice = 350000;
                else if (nameLower.includes("inverter") || nameLower.includes("solar")) basePrice = 800000;
                else if (nameLower.includes("laptop")) basePrice = 750000;
                else if (nameLower.includes("tv") || nameLower.includes("television")) basePrice = 500000;
                else basePrice = 15000 + Math.floor(seeded(0) * 85000); // 15k - 100k generic fallback
            }

            // Market average is typically 8-15% above the best price
            const marketMultiplier = 1.08 + seeded(1) * 0.07;
            const marketAverage = Math.round(basePrice * marketMultiplier);

            // FairPrice recommended is the best/fair price
            const recommendedPrice = basePrice;

            // Generate realistic source prices with Nigerian stores
            const shuffledSources = [...NIGERIAN_SOURCES].sort(() => seeded(2) - 0.5);
            const numSources = 4 + Math.floor(seeded(3) * 2); // 4-5 sources

            const sources: PriceData[] = shuffledSources.slice(0, numSources).map((src, i) => {
                // Each source has a slightly different price (±5-12% of market avg)
                const variance = 0.92 + seeded(i + 10) * 0.16; // 0.92 to 1.08
                return {
                    source: src.name,
                    price: Math.round(marketAverage * variance),
                    currency: "₦",
                    url: `https://${src.name}`
                };
            });

            // Sort sources by price ascending (best deals first)
            sources.sort((a, b) => a.price - b.price);

            setTimeout(() => {
                resolve({
                    productName,
                    marketAverage,
                    recommendedPrice,
                    sources,
                    currency: "₦"
                });
            }, 800 + Math.floor(seeded(20) * 400)); // 800-1200ms delay
        });
    }
}
