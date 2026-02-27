"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    X, Search, TrendingUp, TrendingDown,
    ShieldCheck, MapPin, Scale, ArrowRight,
    BarChart3, Globe, AlertTriangle, CheckCircle, ShoppingCart,
    Loader2, ExternalLink, ChevronRight, Box, Heart,
    Phone, Monitor, Sofa, Home as HomeIcon, Zap, ShoppingBag, Car, Gamepad, Shirt, Baby, Dumbbell, BookOpen, Wrench, Paintbrush, Package
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useFavorites } from "@/context/FavoritesContext";
import { RequestDepositModal } from "./RequestDepositModal";
import { PriceEngine, PriceAnalysis, PriceData, ProductSuggestion } from "@/lib/price-engine";
import { formatPrice } from "@/lib/utils";
import { Product } from "@/lib/types";
import { DEMO_PRODUCTS } from "@/lib/data";
import { DemoStore } from "@/lib/demo-store";
import { RecommendedProducts } from "@/components/ui/RecommendedProducts";

// ─── Constants ──────────────────────────────────────────────

const CURRENT_FX_RATE = 1580; // Approx ₦/USD
const FX_VOLATILITY_RANGE = 0.08; // ±8% monthly variation

const IMPORT_DUTY_RATES: Record<string, { duty: number; levy: number; vat: number; surcharge: number; label: string }> = {
    phones: { duty: 0.20, levy: 0.05, vat: 0.075, surcharge: 0.05, label: "Electronics (CKD/SKD)" },
    computers: { duty: 0.10, levy: 0.05, vat: 0.075, surcharge: 0.02, label: "IT Equipment" },
    electronics: { duty: 0.20, levy: 0.05, vat: 0.075, surcharge: 0.05, label: "General Electronics" },
    smartwatch: { duty: 0.20, levy: 0.05, vat: 0.075, surcharge: 0.05, label: "Wearable Electronics" },
    fashion: { duty: 0.20, levy: 0.10, vat: 0.075, surcharge: 0.03, label: "Textile & Apparel" },
    beauty: { duty: 0.20, levy: 0.05, vat: 0.075, surcharge: 0.02, label: "Cosmetics & Personal Care" },
    home: { duty: 0.20, levy: 0.05, vat: 0.075, surcharge: 0.02, label: "Household Goods" },
    cars: { duty: 0.35, levy: 0.15, vat: 0.075, surcharge: 0.10, label: "Motor Vehicles (CBU)" },
    energy: { duty: 0.05, levy: 0.0, vat: 0.075, surcharge: 0.0, label: "Solar/Renewable Energy (Incentivized)" },
    gaming: { duty: 0.20, levy: 0.05, vat: 0.075, surcharge: 0.05, label: "Gaming Electronics" },
    fitness: { duty: 0.20, levy: 0.05, vat: 0.075, surcharge: 0.03, label: "Fitness Equipment" },
    office: { duty: 0.20, levy: 0.05, vat: 0.075, surcharge: 0.02, label: "Office Equipment" },
    furniture: { duty: 0.20, levy: 0.10, vat: 0.075, surcharge: 0.05, label: "Furniture (Import)" },
    grocery: { duty: 0.05, levy: 0.0, vat: 0.0, surcharge: 0.0, label: "Essential Food Items" },
    baby: { duty: 0.05, levy: 0.0, vat: 0.075, surcharge: 0.0, label: "Baby Products (Reduced)" },
    sports: { duty: 0.20, levy: 0.05, vat: 0.075, surcharge: 0.03, label: "Sports Equipment" },
    automotive: { duty: 0.35, levy: 0.15, vat: 0.075, surcharge: 0.10, label: "Automotive Parts" },
    solar: { duty: 0.05, levy: 0.0, vat: 0.075, surcharge: 0.0, label: "Solar Equipment (Incentivized)" },
    textiles: { duty: 0.20, levy: 0.10, vat: 0.075, surcharge: 0.05, label: "Textiles" },
};

const REGIONAL_FACTORS: Record<string, { factor: number; label: string }> = {
    lagos: { factor: 1.0, label: "Lagos" },
    abuja: { factor: 1.05, label: "Abuja (FCT)" },
    "port harcourt": { factor: 1.02, label: "Port Harcourt" },
    kano: { factor: 0.95, label: "Kano" },
    ibadan: { factor: 0.97, label: "Ibadan" },
    enugu: { factor: 0.98, label: "Enugu" },
    calabar: { factor: 0.96, label: "Calabar" },
    default: { factor: 1.0, label: "Nigeria (National)" },
};

// ─── Utilities ──────────────────────────────────────────────

export function getFallbackImage(cat: string = "") {
    // No longer using Unsplash fallbacks — use CategoryIconFallback instead
    return "";
}

// Category icon fallback component for PriceIntelModal

const MODAL_CATEGORY_ICONS: Record<string, React.ReactNode> = {
    phones: <Phone className="h-8 w-8" />,
    electronics: <Monitor className="h-8 w-8" />,
    computing: <Monitor className="h-8 w-8" />,
    fashion: <Shirt className="h-8 w-8" />,
    home: <HomeIcon className="h-8 w-8" />,
    furniture: <Sofa className="h-8 w-8" />,
    cars: <Car className="h-8 w-8" />,
    vehicles: <Car className="h-8 w-8" />,
    gaming: <Gamepad className="h-8 w-8" />,
    energy: <Zap className="h-8 w-8" />,
    baby: <Baby className="h-8 w-8" />,
    sports: <Dumbbell className="h-8 w-8" />,
    books: <BookOpen className="h-8 w-8" />,
    tools: <Wrench className="h-8 w-8" />,
    beauty: <Paintbrush className="h-8 w-8" />,
    grocery: <ShoppingBag className="h-8 w-8" />,
};

function getModalCategoryIcon(category: string) {
    const cat = category?.toLowerCase() || "";
    return Object.entries(MODAL_CATEGORY_ICONS).find(([key]) => cat.includes(key))?.[1] || <Package className="h-8 w-8" />;
}

function ProductImageWithFallback({ src, alt, category, className }: { src?: string; alt: string; category?: string; className?: string }) {
    const [imgError, setImgError] = React.useState(false);
    if (!src || imgError) {
        return (
            <div className={`w-full h-full rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white ${className || ''}`}>
                {getModalCategoryIcon(category || '')}
            </div>
        );
    }
    return (
        <img
            src={src}
            alt={alt}
            className={`w-full h-full object-contain mix-blend-normal transition-transform duration-300 group-hover:scale-105 pointer-events-none ${className || ''}`}
            onError={() => setImgError(true)}
        />
    );
}

// ─── Interfaces ─────────────────────────────────────────────

interface PriceHistory {
    month: string;
    price: number;
    note?: string;
}

interface PriceIntel {
    name: string;
    description?: string;
    image_url?: string;
    matchedProduct: Product | null;
    // Core pricing
    fairBestPrice: number;
    fairAvgPrice: number;
    marketLowest: number;
    marketAverage: number;
    marketHighest: number;
    // Analysis
    priceVerdict: "great_deal" | "fair" | "slightly_above" | "overpriced" | "too_low";
    verdictLabel: string;
    verdictColor: string;
    overchargePercent: number;
    savingsAmount: number;
    // Import & duty breakdown
    estimatedCIF: number;
    totalDutyPercent: number;
    dutyBreakdown: { label: string; percent: number; amount: number }[];
    // Market context
    history: PriceHistory[];
    sources: PriceData[];
    priceDirection: "rising" | "stable" | "falling";
    justification: string;
    importContext: string;
    flags: string[];
    // Regional
    region: string;
    regionFactor: number;
    // Metadata
    sellersOnPlatform: number;
    lastUpdated: string;
    confidence: number;
    category: string;
    specs?: Record<string, string>;
}

// ─── Logic Transformation ───────────────────────────────────

function processAnalysis(analysis: PriceAnalysis, regionKey: string, matchedProduct: Product | null, platformMarginPercent: number, anchorPrice?: number): PriceIntel {
    // 1. Regional Adjustment
    const region = REGIONAL_FACTORS[regionKey.toLowerCase()] || REGIONAL_FACTORS.default;

    // 2. Determine category first (needed for markup calculation)
    const nameLower = analysis.productName.toLowerCase();
    let category = "electronics";
    if (analysis.category) {
        if (analysis.category === "phones") category = "phones";
        else if (analysis.category === "computers") category = "computers";
        else if (analysis.category === "fashion") category = "fashion";
        else if (analysis.category === "cars") category = "cars";
        else if (analysis.category === "energy") category = "energy";
    } else {
        if (nameLower.includes("macbook") || nameLower.includes("laptop")) category = "computers";
        else if (nameLower.includes("iphone") || nameLower.includes("samsung") || nameLower.includes("pixel")) category = "phones";
        else if (nameLower.includes("shoe") || nameLower.includes("shirt") || nameLower.includes("dress")) category = "fashion";
        else if (nameLower.includes("solar") || nameLower.includes("inverter")) category = "energy";
        else if (nameLower.includes("car") || nameLower.includes("lexus") || nameLower.includes("toyota")) category = "cars";
    }

    // 3. Detect if this is a locally available product (food, drinks, herbal, traditional items)
    // These should NOT have import markups — they're already sold locally
    const baseRefPrice = anchorPrice || analysis.recommendedPrice;
    const isLocalProduct = (
        (category === "other" && baseRefPrice < 10000) ||
        /\b(food|drink|herbal|spice|seasoning|garri|rice|oil|soap|cream|lotion|malt|beer|wine|juice|water|snack|biscuit|noodle|semo|flour|yam|beans|pepper|tomato|milk|sugar|salt|tea|coffee|cocoa)\b/i.test(nameLower)
    );

    // 4. Calculate prices anchored to the search price when available
    let recommendedPrice: number;
    let marketAverage: number;
    let marketLowest: number;
    let marketHighest: number;

    if (isLocalProduct) {
        // LOCAL MODE: Use Gemini's prices directly without extra margins
        const geminiRecommended = anchorPrice || analysis.recommendedPrice;
        recommendedPrice = Math.round(geminiRecommended);
        marketAverage = analysis.marketAverage || Math.round(geminiRecommended * 1.05);
        marketLowest = analysis.marketLow || Math.round(geminiRecommended * 0.85);
        marketHighest = analysis.marketHigh || Math.round(geminiRecommended * 1.25);
    } else if (anchorPrice && anchorPrice > 0) {
        // ANCHORED MODE: Exact match of what the user clicked.
        const anchoredBase = anchorPrice * region.factor;
        recommendedPrice = Math.round(anchoredBase);
        marketAverage = Math.round(anchoredBase * 1.15 + 15000); // Default fallback, bypass overrides this
        marketLowest = Math.round(anchoredBase * 0.90);
        marketHighest = Math.round(anchoredBase * 1.50 + 15000);
    } else {
        // UNANCHORED MODE: Trust Gemini's output
        const basePlatformCost = analysis.recommendedPrice * region.factor;
        recommendedPrice = Math.round(basePlatformCost);
        marketAverage = Math.round(analysis.marketAverage * region.factor);
        marketLowest = analysis.marketLow
            ? Math.round(analysis.marketLow * region.factor)
            : Math.round(marketAverage * 0.85);
        marketHighest = analysis.marketHigh
            ? Math.round(analysis.marketHigh * region.factor)
            : Math.round(marketAverage * 1.35);
    }

    const dutyInfo = IMPORT_DUTY_RATES[category] || IMPORT_DUTY_RATES.electronics;
    const totalDutyPercent = (dutyInfo.duty + dutyInfo.levy + dutyInfo.vat + dutyInfo.surcharge) * 100;

    const retailToImportRatio = (1 + totalDutyPercent / 100) * 1.30;
    const estimatedCIF = Math.round(recommendedPrice / retailToImportRatio);

    const dutyBreakdown = [
        { label: `Import Duty`, percent: dutyInfo.duty * 100, amount: Math.round(estimatedCIF * dutyInfo.duty) },
        { label: `CISS Levy`, percent: dutyInfo.levy * 100, amount: Math.round(estimatedCIF * dutyInfo.levy) },
        { label: `VAT`, percent: dutyInfo.vat * 100, amount: Math.round(estimatedCIF * dutyInfo.vat) },
        { label: `Surcharge`, percent: dutyInfo.surcharge * 100, amount: Math.round(estimatedCIF * dutyInfo.surcharge) },
    ].filter(d => d.percent > 0);

    // 4. Verdict Logic (Simplified, removing Overpriced)
    const diffPercent = ((marketAverage - recommendedPrice) / recommendedPrice) * 100;

    let priceVerdict: PriceIntel["priceVerdict"] = "fair";
    let verdictLabel = "Fair Value";
    let verdictColor = "emerald";

    if (diffPercent > 10) {
        priceVerdict = "great_deal"; verdictLabel = "Great Deal"; verdictColor = "emerald";
    }

    // 5. History Generation (aligned with priceDirection)
    const months = ["Sep", "Oct", "Nov", "Dec", "Jan", "Feb"];
    const seed = analysis.productName.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const seeded = (offset: number) => {
        const x = Math.sin(seed + offset) * 10000;
        return x - Math.floor(x);
    };

    const direction = analysis.priceDirection || "stable";

    const history = months.map((month, i) => {
        // Create an artificial trend based on direction
        let trendBias = 0;
        if (direction === "rising") trendBias = (i - 5) * -0.02; // Past was lower
        if (direction === "falling") trendBias = (i - 5) * 0.02; // Past was higher

        const randomVar = (seeded(i + 50) - 0.5) * 0.08; // +/- 4% random
        const trend = 1 + trendBias + randomVar;

        return {
            month,
            price: Math.round(marketAverage * trend),
            note: month === "Dec" ? "Holiday Spike" : undefined
        };
    });

    // 6. Justification
    const justification = analysis.justification || `Based on analysis of real-time data from ${analysis.sources.length} online sources. The recommended price of ${formatPrice(recommendedPrice)} includes standard delivery and procurement margins.`;

    // 7. Flags
    const flags: string[] = ["Real-Time Data"];
    if (analysis.sources.length > 2) flags.push("Multi-Source Verified");
    if (totalDutyPercent < 15) flags.push("Low Duty Item");
    if (matchedProduct) flags.push("In-Store Product");
    if (analysis.confidence === "low") flags.push("Low Confidence Estimate");

    return {
        name: analysis.productName,
        description: analysis.description,
        image_url: analysis.image_url,
        matchedProduct,
        fairBestPrice: recommendedPrice,
        fairAvgPrice: Math.round(recommendedPrice * 1.05),
        marketLowest,
        marketAverage,
        marketHighest,
        priceVerdict,
        verdictLabel,
        verdictColor,
        overchargePercent: Math.max(0, Math.round(diffPercent)),
        savingsAmount: Math.max(0, marketAverage - recommendedPrice),
        estimatedCIF,
        totalDutyPercent: Math.round(totalDutyPercent),
        dutyBreakdown,
        history,
        sources: analysis.sources,
        priceDirection: analysis.priceDirection || (history[5].price > history[4].price ? "rising" : "falling"),
        justification,
        importContext: `Includes ${Math.round(platformMarginPercent)}% service charge and estimated delivery.`,
        flags,
        region: region.label,
        regionFactor: region.factor,
        sellersOnPlatform: Math.floor(seeded(100) * 10) + 2,
        lastUpdated: new Date().toISOString(),
        confidence: analysis.confidence === "high" ? 95 : analysis.confidence === "low" ? 65 : 85,
        category
    };
}

// ─── Component ──────────────────────────────────────────────

export function PriceIntelModal({ isOpen, onClose, initialQuery }: { isOpen: boolean; onClose: () => void; initialQuery?: string }) {
    const [platformMarginPercent, setPlatformMarginPercent] = useState(0.15); // Default fallback

    useEffect(() => {
        if (isOpen) {
            fetch("/api/admin/settings")
                .then(res => res.json())
                .then(data => {
                    if (data?.platformMargin) {
                        setPlatformMarginPercent(data.platformMargin / 100);
                    }
                })
                .catch(err => console.error("Failed to load platform margin", err));
        }
    }, [isOpen]);

    const [result, setResult] = useState<PriceIntel | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [requestModalOpen, setRequestModalOpen] = useState(false);
    const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([]);
    const [searchResults, setSearchResults] = useState<{ local: Product[], api: ProductSuggestion[] } | null>(null);
    const [searchQuery, setSearchQuery] = useState(initialQuery || "");
    const [selectedSourceUrl, setSelectedSourceUrl] = useState<string | null>(null);

    // initialQuery sync — moved after handleSearch to avoid TDZ
    const initialQueryTriggeredRef = useRef<string | null>(null);
    const { user } = useAuth();
    const { addToCart } = useCart();
    const router = useRouter();

    // Debounced fallback suggestions (only used when not showing search results)
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (searchQuery.length >= 2 && !result && !searchResults) {
                try {
                    const suggs = await PriceEngine.searchProducts(searchQuery);
                    setSuggestions(suggs);
                } catch (e) {
                    console.error("Failed fetching fallback suggestions", e);
                }
            }
        }, 600);
        return () => clearTimeout(timer);
    }, [searchQuery, result, searchResults]);

    const handleSearch = useCallback(async (query: string) => {
        if (!query.trim()) return;
        setIsSearching(true);
        setResult(null); // Clear deep analysis
        setSuggestions([]);

        try {
            // Local Match
            const local = DEMO_PRODUCTS.filter(p =>
                p.name.toLowerCase().includes(query.toLowerCase()) ||
                p.category.toLowerCase().includes(query.toLowerCase())
            );

            // API Match
            const api = await PriceEngine.searchProducts(query);

            setSearchResults({ local, api });
        } catch (error) {
            console.error("Search failed", error);
        } finally {
            setIsSearching(false);
        }
    }, []);

    // Sync initialQuery when modal opens — placed after handleSearch to avoid TDZ
    useEffect(() => {
        if (isOpen && initialQuery && initialQuery !== initialQueryTriggeredRef.current) {
            setSearchQuery(initialQuery);
            setResult(null);
            setSearchResults(null);
            initialQueryTriggeredRef.current = initialQuery;
            const timer = setTimeout(() => {
                handleSearch(initialQuery);
            }, 100);
            return () => clearTimeout(timer);
        }
        if (!isOpen) {
            initialQueryTriggeredRef.current = null;
        }
    }, [isOpen, initialQuery, handleSearch]);

    const handleAnalyze = useCallback(async (productName: string, product?: Product, sourceUrl?: string, approxPrice?: number, specs?: Record<string, string>) => {
        setIsAnalyzing(true);
        setSuggestions([]);

        // Capture searchResults before nulling UI state so we can read the competitor prices
        const activeSearchResults = searchResults;

        setSearchResults(null);
        setResult(null);
        setSelectedSourceUrl(sourceUrl || null);

        try {
            // Find matched product locally if possible for "Buy Now"
            let matchedProduct = product || DemoStore.getProducts().find(p => p.name.toLowerCase() === productName.toLowerCase()) || null;

            // Use the product's actual price as anchor if we have a catalog match
            const anchorPrice = product?.price || approxPrice;

            let intel: PriceIntel;

            if (anchorPrice && (sourceUrl || product || approxPrice)) {
                // VERY FAST TRACK: Skip Gemini deep analysis for search result clicks.
                // The price the user clicked is locked in immediately as the absolute Fair Price.
                const fairBestPrice = anchorPrice;

                // Find highest price in search results to use as market average
                let maxSearchPrice = 0;
                if (activeSearchResults) {
                    const localMax = activeSearchResults.local.reduce((max, p) => Math.max(max, p.price), 0);
                    const apiMax = activeSearchResults.api.reduce((max, s) => Math.max(max, s.approxPrice || 0), 0);
                    // Add standard 15k local delivery for competitors
                    maxSearchPrice = Math.max(localMax, apiMax) + 15000;
                }

                // Use the highest search result as the market anchor if it's higher. If it's somehow not higher, apply a minor 8% gap as a fallback.
                const marketAverage = maxSearchPrice > fairBestPrice * 1.05 ? maxSearchPrice : Math.round(fairBestPrice * 1.08);
                const marketLowest = Math.round(fairBestPrice * 1.02);
                const marketHighest = Math.round(marketAverage * 1.15);
                const savingsAmount = marketAverage - fairBestPrice;

                // Create a brief info-packed description if specs are available
                const specSummary = specs ? Object.entries(specs).map(([k, v]) => `${k}: ${v}`).join(" • ") : "";
                const generatedDesc = specSummary ? `${productName} featuring ${specSummary}` : `High-quality ${productName} sourced securely via global stores.`;

                intel = {
                    name: productName,
                    description: product?.description || generatedDesc,
                    image_url: product?.image_url || getFallbackImage(product?.category || "other"),
                    matchedProduct: matchedProduct,
                    specs: product?.specs || specs,
                    fairBestPrice,
                    fairAvgPrice: fairBestPrice,
                    marketLowest,
                    marketAverage,
                    marketHighest,
                    priceVerdict: savingsAmount > (fairBestPrice * 0.05) ? "great_deal" : "fair",
                    verdictLabel: savingsAmount > (fairBestPrice * 0.05) ? "Great Deal" : "Fair Value",
                    verdictColor: "emerald",
                    overchargePercent: Math.round((savingsAmount / fairBestPrice) * 100),
                    savingsAmount,
                    estimatedCIF: Math.round(fairBestPrice * 0.7),
                    totalDutyPercent: 20,
                    dutyBreakdown: [],
                    history: [
                        { month: "Sep", price: Math.round(marketAverage * 1.05) },
                        { month: "Oct", price: Math.round(marketAverage * 1.01) },
                        { month: "Nov", price: Math.round(marketAverage * 0.98) },
                        { month: "Dec", price: Math.round(marketAverage * 1.08), note: "Holiday Spike" },
                        { month: "Jan", price: Math.round(marketAverage * 1.02) },
                        { month: "Feb", price: marketAverage }
                    ],
                    sources: [
                        { source: "Direct Partner Source", price: fairBestPrice, type: "global", url: sourceUrl || "", currency: "NGN" },
                        { source: "Highest Market Online", price: marketAverage, type: "local", url: "", currency: "NGN" }
                    ],
                    priceDirection: "stable",
                    justification: `Price locked based on your selection. The market estimate reflects current competitor pricing including standard delivery.`,
                    importContext: "Sourced efficiently with priority international shipping.",
                    flags: ["Best Value Guaranteed", "Escrow Protection"],
                    region: user?.location || "lagos",
                    regionFactor: 1,
                    sellersOnPlatform: 1,
                    lastUpdated: new Date().toISOString(),
                    confidence: 99,
                    category: product?.category || "other"
                };
            } else {
                // Deep Analysis — only call Gemini for totally raw searches
                const analysis = await PriceEngine.analyzePrice(productName, anchorPrice);
                intel = processAnalysis(analysis, user?.location || "lagos", matchedProduct, platformMarginPercent, anchorPrice);
            }

            // Auto-save Global Searches to the local catalog
            if (!matchedProduct) {
                const newId = `global-${Date.now()}`;
                const newGlobalProduct: Product = {
                    id: newId,
                    seller_id: "global-partners",
                    seller_name: "Global Stores",
                    name: intel.name,
                    description: intel.description || `Global import sourced securely via real-time market analysis.`,
                    price: intel.fairBestPrice,
                    category: intel.category as any,
                    image_url: intel.image_url || getFallbackImage(intel.category || ""),
                    images: [],
                    stock: 999, // global stock
                    price_flag: "fair",
                    is_active: true,
                    avg_rating: 0,
                    review_count: 0,
                    sold_count: 0,
                    created_at: new Date().toISOString(),
                    external_url: sourceUrl || undefined,
                    specs: intel.specs
                };
                DemoStore.addRawProduct(newGlobalProduct);
                matchedProduct = newGlobalProduct; // Attach it so they can buy it directly!
                intel.matchedProduct = newGlobalProduct;
            }

            setResult(intel);
        } catch (error) {
            console.error("Analysis failed", error);
        } finally {
            setIsAnalyzing(false);
        }
    }, [user]);



    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <div className="fixed inset-0 z-[9999] flex items-center md:items-start pt-0 md:pt-[10vh] justify-center p-4 overflow-hidden">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={onClose}
                            className="absolute inset-0 bg-black/80 backdrop-blur-md"
                        />

                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="relative w-full max-w-2xl h-[85vh] md:h-auto max-h-[90vh] overflow-visible rounded-3xl flex flex-col"
                            style={{
                                background: "linear-gradient(145deg, rgba(255, 255, 255, 0.95), rgba(248, 250, 252, 0.98))",
                                backdropFilter: "blur(60px) saturate(1.5)",
                                border: "1px solid rgba(0,0,0,0.08)",
                                boxShadow: "0 40px 80px rgba(0,0,0,0.1), inset 0 1px 0 rgba(0,0,0,0.5)"
                            }}
                        >
                            {/* Header — Apple Liquid Glass */}
                            <div
                                className="px-6 py-5 flex items-center justify-between relative overflow-hidden rounded-t-3xl border-b border-white/20"
                                style={{
                                    background: "linear-gradient(135deg, rgba(6, 95, 70, 0.95), rgba(4, 120, 87, 0.85))",
                                    backdropFilter: "blur(20px)",
                                    WebkitBackdropFilter: "blur(20px)",
                                }}
                            >
                                {/* Decorative Mesh Background */}
                                <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.4) 1px, transparent 1px)", backgroundSize: "16px 16px" }} />
                                <div className="flex items-center gap-4 relative z-10">
                                    <div
                                        className="h-12 w-12 rounded-2xl flex items-center justify-center bg-white border border-gray-200 shadow-sm"
                                    >
                                        <BarChart3 className="h-6 w-6 text-gray-800" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-white tracking-tight">Price Intelligence</h2>
                                        <p className="text-xs text-white/80 font-medium mt-0.5">Real-Time Market Analysis</p>
                                    </div>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-2.5 rounded-full bg-white/10 hover:bg-red-500 text-white hover:text-white transition-all shadow-sm border border-transparent hover:border-red-400 relative z-[200]"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            {/* ── Search Bar ── */}
                            <div className="px-6 pt-6 pb-2 shrink-0 relative z-50" style={{ scrollbarWidth: "none" }}>
                                <SearchInput
                                    value={searchQuery}
                                    onChange={setSearchQuery}
                                    onSearch={handleSearch}
                                    onAnalyze={(q, p, s, price, specs) => handleAnalyze(q, p, s, price, specs)}
                                    isLoading={isSearching || isAnalyzing}
                                    hasResult={!!result}
                                    onReset={() => { setResult(null); setSearchQuery(""); setSelectedSourceUrl(null); }}
                                />
                            </div>

                            {/* ── Scrollable Content ── */}
                            <div className="px-6 pb-6 pt-2 overflow-y-auto flex-1 space-y-5 rounded-b-3xl" style={{ scrollbarWidth: "none" }}>

                                {/* Loading State */}
                                {(isSearching || isAnalyzing) && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="text-center py-12 space-y-4"
                                    >
                                        <div className="relative w-16 h-16 mx-auto">
                                            <div className="absolute inset-0 border-2 border-emerald-600/20 rounded-full" />
                                            <div className="absolute inset-0 border-2 border-transparent border-t-emerald-600 rounded-full animate-spin" />
                                            <BarChart3 className="absolute inset-0 m-auto h-6 w-6 text-emerald-600" />
                                        </div>
                                        <div>
                                            <h3 className="text-gray-900 font-semibold text-base animate-pulse">
                                                {isAnalyzing ? "Analyzing Market Data..." : "Searching Available Products..."}
                                            </h3>
                                            <p className="text-gray-600 text-xs mt-1">
                                                {isAnalyzing ? "Deep checking prices across stores" : "Fetching from catalog and global stores"}
                                            </p>
                                        </div>
                                    </motion.div>
                                )}

                                {/* Search Results List */}
                                {searchResults && !result && !isSearching && !isAnalyzing && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="space-y-6"
                                    >
                                        {/* Local Catalog */}
                                        {searchResults.local.length > 0 && (
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between px-1">
                                                    <h4 className="flex items-center gap-2 text-gray-700 text-[11px] font-bold uppercase tracking-wider">
                                                        <Box className="h-4 w-4 text-emerald-600" />
                                                        In FairPrice Catalog
                                                    </h4>
                                                    <span className="text-xs text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full font-bold">In Stock</span>
                                                </div>
                                                <div className="space-y-2">
                                                    {searchResults.local.map(product => (
                                                        <div key={product.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-gray-100 bg-white shadow-sm hover:bg-gray-100 transition-colors">
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-12 h-12 bg-gray-100 rounded-lg p-1.5 shrink-0 flex items-center justify-center overflow-hidden">
                                                                    {product.image_url ? (
                                                                        <img src={product.image_url} alt={product.name} className="w-full h-full object-contain" onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling && ((e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex'); }} />
                                                                    ) : null}
                                                                    <div className={`w-full h-full rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 ${product.image_url ? 'hidden' : 'flex'} items-center justify-center`}>
                                                                        <span className="text-white font-black text-sm">{product.name.charAt(0)}</span>
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <p className="font-bold text-sm text-gray-900">{product.name}</p>
                                                                    <p className="text-xs text-gray-500">{product.category}</p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                                                                <div className="text-left sm:text-right">
                                                                    <p className="font-bold text-emerald-600">{formatPrice(product.price)}</p>
                                                                </div>
                                                                <div className="flex gap-2">
                                                                    <button
                                                                        onClick={() => handleAnalyze(product.name, product)}
                                                                        className="h-9 px-3 text-xs font-bold text-gray-900 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-lg transition-colors flex items-center gap-1.5"
                                                                    >
                                                                        <BarChart3 className="h-3 w-3" />
                                                                        Compare
                                                                    </button>
                                                                    <button
                                                                        onClick={() => addToCart(product)}
                                                                        className="h-9 px-4 text-xs font-bold text-black bg-emerald-500 hover:bg-emerald-400 rounded-lg transition-colors flex items-center gap-1.5"
                                                                    >
                                                                        <ShoppingCart className="h-3 w-3" />
                                                                        Add
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* API Sources */}
                                        {searchResults.api.length > 0 && (
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between px-1">
                                                    <h4 className="flex items-center gap-2 text-gray-700 text-[11px] font-bold uppercase tracking-wider">
                                                        <Globe className="h-4 w-4 text-blue-600" />
                                                        Global Internet Sources
                                                    </h4>
                                                    <span className="text-xs text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full font-bold flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> Escrow Protected</span>
                                                </div>
                                                <div className="space-y-2">
                                                    {searchResults.api.map((s, i) => (
                                                        <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-gray-100 bg-white shadow-sm hover:border-blue-500/30 transition-colors">
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-12 h-12 bg-gray-100 rounded-lg shrink-0 flex items-center justify-center p-1.5 overflow-hidden">
                                                                    {s.image_url ? (
                                                                        <img
                                                                            src={s.image_url}
                                                                            alt={s.name}
                                                                            className="w-full h-full object-contain mix-blend-multiply"
                                                                            onError={(e) => {
                                                                                e.currentTarget.style.display = 'none';
                                                                                e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                                                            }}
                                                                        />
                                                                    ) : null}
                                                                    <Search className={`h-5 w-5 text-gray-400 ${s.image_url ? 'hidden' : ''}`} />
                                                                </div>
                                                                <div>
                                                                    <p className="font-bold text-sm text-gray-900">{s.name}</p>
                                                                    <p className="text-xs text-gray-500">{s.category}</p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                                                                <div className="text-left sm:text-right">
                                                                    <p className="text-[10px] text-gray-700 mb-0.5 uppercase tracking-wide font-bold">Est. Market Value</p>
                                                                    <p className="font-bold text-emerald-600">{formatPrice(s.approxPrice)}</p>
                                                                </div>
                                                                <button
                                                                    onClick={() => handleAnalyze(s.name, undefined, s.sourceUrl, s.approxPrice)}
                                                                    className="h-9 px-3 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
                                                                >
                                                                    <ShoppingCart className="h-3.5 w-3.5" />
                                                                    Get Fair Price
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {searchResults.local.length === 0 && searchResults.api.length === 0 && (
                                            <div className="text-center py-12">
                                                <Search className="h-8 w-8 text-gray-500 mx-auto mb-3" />
                                                <p className="text-gray-900 font-medium">No products found for "{searchQuery}"</p>
                                                <p className="text-gray-600 text-xs mt-1">Try a different or more generic term</p>
                                            </div>
                                        )}
                                    </motion.div>
                                )}

                                {/* Result (Deep Analysis) */}
                                {result && !isSearching && !isAnalyzing && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="space-y-5"
                                    >
                                        {/* Verdict Card */}
                                        <VerdictCard
                                            result={result}
                                            onAddToCart={(product) => {
                                                addToCart(product);
                                                onClose();
                                                router.push('/checkout');
                                            }}
                                            onRequestProduct={() => setRequestModalOpen(true)}
                                        />

                                        {/* Price Comparison */}
                                        <PriceComparison result={result} />

                                        {/* Price History Chart */}
                                        <PriceHistoryChart result={result} />

                                        {/* Context & Flags */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <GlassCard className="bg-white/95 shadow-md">
                                                <div className="flex items-center gap-2 text-gray-700 text-[10px] font-bold uppercase tracking-wider mb-2">
                                                    <Globe className="h-3 w-3 text-blue-600" />
                                                    Market Context
                                                </div>
                                                <p className="text-gray-900 text-[11px] leading-relaxed font-medium">
                                                    {result.justification}
                                                </p>
                                            </GlassCard>
                                            <GlassCard className="bg-white/95 shadow-md">
                                                <div className="flex items-center gap-2 text-gray-700 text-[10px] font-bold uppercase tracking-wider mb-2">
                                                    <AlertTriangle className="h-3 w-3 text-amber-500" />
                                                    Analysis Flags
                                                </div>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {result.flags.map((flag, i) => (
                                                        <span
                                                            key={i}
                                                            className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                                                            style={{
                                                                background: "rgba(0,0,0,0.04)",
                                                                border: "1px solid rgba(0,0,0,0.1)",
                                                                color: "rgba(0,0,0,0.8)"
                                                            }}
                                                        >
                                                            {flag}
                                                        </span>
                                                    ))}
                                                </div>
                                            </GlassCard>
                                        </div>

                                        <div className="flex items-center justify-between text-[10px] text-gray-500 font-bold pt-3" style={{ borderTop: "1px solid rgba(0,0,0,0.05)" }}>
                                            <span>Analysis ID: {Math.random().toString(36).substr(2, 9).toUpperCase()}</span>
                                            <span>Confidence: {result.confidence}%</span>
                                        </div>

                                        {/* Global Alternatives (Related items in same category) */}
                                        <div className="-mx-6 px-6 pt-4 pb-2 border-t border-gray-100 bg-gray-50/50">
                                            <RecommendedProducts
                                                products={[
                                                    ...DEMO_PRODUCTS.filter(p => p.category === result.category && p.id !== result.matchedProduct?.id).slice(0, 4),
                                                    ...DEMO_PRODUCTS.filter(p => p.category !== result.category && p.is_active).sort((a, b) => b.sold_count - a.sold_count).slice(0, 4)
                                                ].slice(0, 8)}
                                                title="Customers Also Bought"
                                                subtitle="Similar products and trending items"
                                                icon={<ShoppingCart className="h-4 w-4 text-emerald-600" />}
                                            />
                                        </div>
                                    </motion.div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {result && !result.matchedProduct && (
                <RequestDepositModal
                    isOpen={requestModalOpen}
                    onClose={() => setRequestModalOpen(false)}
                    productName={result.name}
                    targetPrice={result.fairBestPrice}
                    sourceUrl={selectedSourceUrl || undefined}
                    onConfirm={() => {
                        const sourcingProduct: Product = {
                            id: `source-${Date.now()}`,
                            seller_id: "global-partners",
                            seller_name: "Global Stores",
                            name: `[Sourcing Request] ${result.name}`,
                            description: result.description || `Special sourcing request for ${result.name}.`,
                            price: result.fairBestPrice,
                            category: result.category as any || "other",
                            image_url: result.matchedProduct?.image_url || result.image_url || getFallbackImage(result.category || ""),
                            images: [],
                            stock: 1,
                            price_flag: "fair",
                            is_active: true,
                            avg_rating: 0,
                            review_count: 0,
                            sold_count: 0,
                            created_at: new Date().toISOString()
                        };
                        addToCart(sourcingProduct, 1);
                        setRequestModalOpen(false);
                        onClose();
                        router.push("/checkout");
                    }}
                />
            )}
        </>
    );
}

// ─── Reusable Glass Card ────────────────────────────────────

function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return (
        <div
            className={`rounded-2xl p-4 bg-white/95 shadow-md ${className}`}
            style={{
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(0,0,0,0.06)",
            }}
        >
            {children}
        </div>
    );
}

// ─── Search Input with Hybrid Autocomplete ──────────────────

function SearchInput({ value, onChange, onSearch, onAnalyze, isLoading, hasResult, onReset }: { value: string, onChange: (v: string) => void, onSearch: (q: string) => void, onAnalyze: (q: string, product?: Product, sourceUrl?: string, approxPrice?: number, specs?: Record<string, string>) => void; isLoading: boolean; hasResult: boolean; onReset: () => void }) {
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [apiSuggestions, setApiSuggestions] = useState<ProductSuggestion[]>([]);
    const [localMatches, setLocalMatches] = useState<Product[]>([]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Force close suggestions when analysis starts or completes
    useEffect(() => {
        if (hasResult || isLoading) {
            setShowSuggestions(false);
        }
    }, [hasResult, isLoading]);

    // Debounced search for suggestions
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (value.length >= 2) {
                // 1. Local Search
                const local = DEMO_PRODUCTS.filter(p =>
                    p.name.toLowerCase().includes(value.toLowerCase()) ||
                    p.category.toLowerCase().includes(value.toLowerCase())
                ).slice(0, 7);
                setLocalMatches(local);

                // 2. API Search
                try {
                    const api = await PriceEngine.searchProducts(value);
                    setApiSuggestions(api);
                } catch (e) {
                    console.error("API Suggestion error", e);
                }
            } else {
                setLocalMatches([]);
                setApiSuggestions([]);
            }
        }, 300); // 300ms debounce

        return () => clearTimeout(timer);
    }, [value]);

    return (
        <div ref={containerRef} className="relative" onClick={(e) => e.stopPropagation()}>
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-900/25 z-10" />
            <input
                ref={inputRef}
                type="text"
                value={value}
                onChange={(e) => {
                    onChange(e.target.value);
                    setShowSuggestions(true);
                }}
                onKeyDown={(e) => {
                    if (e.key === "Enter") {
                        onSearch(value);
                        setShowSuggestions(false);
                    }
                }}
                onFocus={() => setShowSuggestions(true)}
                placeholder="Search any product (e.g. 'Tes' -> Tesla)..."
                className="w-full h-12 rounded-xl pl-11 pr-24 text-sm text-gray-900 placeholder:text-gray-900/25 focus:outline-none transition-all font-medium"
                style={{ background: "rgba(0,0,0,0.02)", border: "1px solid rgba(0,0,0,0.08)" }}
                disabled={isLoading}
                autoFocus
            />
            {value && !isLoading && !hasResult && (
                <button
                    onClick={() => {
                        onSearch(value);
                        setShowSuggestions(false);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold px-4 py-2 rounded-lg transition-all"
                >
                    Search
                </button>
            )}
            {hasResult && (
                <button
                    onClick={onReset}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-red-500 hover:bg-red-400 text-white text-xs font-bold px-4 py-2 rounded-lg transition-all shadow-sm"
                >
                    Clear
                </button>
            )}

            {/* Hybrid Dropdown */}
            {showSuggestions && value.length >= 2 && !isLoading && (
                <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-0 right-0 mt-2 rounded-2xl overflow-y-auto overflow-x-hidden z-50 shadow-[0_8px_30px_rgb(0,0,0,0.12)] max-h-[50vh]"
                    style={{ border: "1px solid rgba(0,0,0,0.06)", background: "rgba(255, 255, 255, 0.85)", backdropFilter: "blur(20px) saturate(1.5)", WebkitBackdropFilter: "blur(20px) saturate(1.5)" }}
                >
                    {/* Local Matches Section */}
                    {localMatches.length > 0 && (
                        <div>
                            <div className="px-4 py-2.5 bg-white/40 border-b border-gray-900/5 flex items-center gap-2">
                                <Box className="h-3 w-3 text-gray-500" />
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">In Catalog</span>
                            </div>
                            {localMatches.map((product) => (
                                <button
                                    key={product.id}
                                    onClick={() => {
                                        onChange(product.name);
                                        onAnalyze(product.name, product);
                                        setShowSuggestions(false);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-black/5 transition-colors border-b border-gray-900/5 last:border-0 text-left group"
                                >
                                    <div className="h-10 w-10 rounded-xl bg-white border border-gray-200 shadow-sm p-1.5 shrink-0 flex items-center justify-center overflow-hidden">
                                        {product.image_url ? (
                                            <img src={product.image_url} className="w-full h-full object-contain" alt="" onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling && ((e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex'); }} />
                                        ) : null}
                                        <div className={`w-full h-full rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 ${product.image_url ? 'hidden' : 'flex'} items-center justify-center`}>
                                            <span className="text-white font-black text-xs">{product.name.charAt(0)}</span>
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-900 truncate">{product.name}</p>
                                        <p className="text-[11px] text-emerald-600 font-bold mt-0.5">{formatPrice(product.price)}</p>
                                    </div>
                                    <div className="shrink-0 text-gray-400 group-hover:text-blue-500 transition-colors">
                                        <ArrowRight className="h-4 w-4" />
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* API Suggestions Section */}
                    {apiSuggestions.length > 0 && (
                        <div>
                            <div className="px-4 py-2.5 bg-white/40 border-b border-gray-900/5 flex items-center gap-2">
                                <Search className="h-3 w-3 text-gray-500" />
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Global Search</span>
                            </div>
                            {apiSuggestions.map((s, i) => (
                                <button
                                    key={i}
                                    onClick={() => {
                                        onChange(s.name);
                                        onAnalyze(s.name, undefined, s.sourceUrl, s.approxPrice, s.specs);
                                        setShowSuggestions(false);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-black/5 transition-colors border-b border-gray-900/5 last:border-0 text-left group"
                                >
                                    <div className="h-10 w-10 rounded-xl bg-gray-100 border border-gray-200 shrink-0 flex items-center justify-center">
                                        <Search className="h-4 w-4 text-gray-500" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-900 truncate">{s.name}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-[11px] text-gray-500 font-medium">{s.category}</span>
                                            <span className="text-[10px] text-emerald-600 font-bold drop-shadow-sm">~{formatPrice(s.approxPrice)}</span>
                                        </div>
                                    </div>
                                    <div className="shrink-0 text-gray-400 group-hover:text-blue-500 transition-colors">
                                        <ArrowRight className="h-4 w-4" />
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </motion.div>
            )}
        </div>
    );
}

// ─── Verdict Card ───────────────────────────────────────────

function VerdictCard({ result, onAddToCart, onRequestProduct }: { result: PriceIntel; onAddToCart: (p: Product, qty?: number) => void; onRequestProduct: () => void }) {
    const verdictColors: Record<string, { bg: string; border: string; dot: string }> = {
        emerald: { bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.3)", dot: "#10b981" },
        red: { bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.3)", dot: "#ef4444" },
        yellow: { bg: "rgba(234,179,8,0.12)", border: "rgba(234,179,8,0.3)", dot: "#eab308" },
    };
    const colors = verdictColors[result.verdictColor] || verdictColors.emerald;
    const { isFavorite, toggleFavorite } = useFavorites();
    const [liked, setLiked] = useState(false);
    const [showHeartAnim, setShowHeartAnim] = useState(false);
    const [showDetails, setShowDetails] = useState(false);

    const isFav = result.matchedProduct ? isFavorite(result.matchedProduct.id) : liked;

    const handleLike = (e?: React.MouseEvent) => {
        if (e) e.preventDefault();
        e?.stopPropagation();
        if (result.matchedProduct) {
            toggleFavorite(result.matchedProduct.id);
        } else {
            setLiked(!liked);
        }
    };

    const handleDoubleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        // Trigger animation
        setShowHeartAnim(true);
        setTimeout(() => setShowHeartAnim(false), 800);

        // Add to favorites if not already
        if (result.matchedProduct) {
            if (!isFavorite(result.matchedProduct.id)) {
                toggleFavorite(result.matchedProduct.id);
            }
        } else {
            if (!liked) setLiked(true);
        }
    };

    const imageUrl = result.matchedProduct ? result.matchedProduct.image_url : (result.image_url || getFallbackImage(result.category));

    return (
        <div
            className="rounded-2xl p-5"
            style={{ background: colors.bg, border: `1px solid ${colors.border}` }}
        >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4 flex-1 min-w-0">
                    {/* Product Image with Double-Click Like Action and Click Details Toggle */}
                    <div
                        className="relative w-24 h-24 rounded-xl bg-white border border-gray-100 flex-shrink-0 flex items-center justify-center p-2 shadow-sm group select-none cursor-pointer"
                        onDoubleClick={handleDoubleClick}
                        onClick={(e) => { e.preventDefault(); setShowDetails(!showDetails); }}
                    >
                        <ProductImageWithFallback src={imageUrl} alt={result.name} category={result.category} />

                        <AnimatePresence>
                            {showHeartAnim && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.3, y: 15 }}
                                    animate={{ opacity: 1, scale: 1.2, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.8, y: -15 }}
                                    transition={{ type: "spring", damping: 12, stiffness: 200, duration: 0.4 }}
                                    className="absolute inset-0 m-auto flex items-center justify-center drop-shadow-md z-20 pointer-events-none"
                                >
                                    <Heart className="h-10 w-10 text-red-500 fill-red-500" />
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <button
                            onClick={handleLike}
                            className="absolute top-1.5 right-1.5 p-1.5 bg-white/80 backdrop-blur-sm rounded-full shadow-sm hover:scale-110 transition-transform z-10"
                            aria-label="Like product"
                        >
                            <Heart className={`h-4 w-4 transition-colors ${isFav ? 'fill-red-500 text-red-500' : 'text-gray-400 hover:text-red-400'}`} />
                        </button>
                    </div>

                    <div className="flex-1 min-w-0">

                        {/* Product title — clickable if matched */}
                        {result.matchedProduct ? (
                            <button
                                onClick={(e) => { e.preventDefault(); setShowDetails(!showDetails); }}
                                className="text-lg sm:text-xl font-bold text-gray-900 hover:text-emerald-600 transition-colors inline-flex flex-wrap items-center gap-2 group line-clamp-2 text-left"
                            >
                                {result.name}
                                <ChevronRight className={`h-4 w-4 text-gray-400 group-hover:text-emerald-600 transition-transform ${showDetails ? 'rotate-90' : ''} shrink-0`} />
                            </button>
                        ) : (
                            <button
                                onClick={(e) => { e.preventDefault(); setShowDetails(!showDetails); }}
                                className="text-lg sm:text-xl font-bold text-gray-900 hover:text-emerald-600 transition-colors inline-flex flex-wrap items-center gap-2 group line-clamp-2 text-left w-full"
                            >
                                <span className="line-clamp-2">{result.name}</span>
                                <ChevronRight className={`h-4 w-4 text-gray-400 group-hover:text-emerald-600 transition-transform ${showDetails ? 'rotate-90' : ''} shrink-0`} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="w-full sm:w-auto shrink-0 flex justify-end">
                    {result.matchedProduct ? (
                        <button
                            onClick={() => result.matchedProduct && onAddToCart(result.matchedProduct)}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-5 py-3 sm:py-2.5 rounded-xl transition-all shadow-md hover:scale-105 active:scale-95"
                        >
                            <ShoppingCart className="h-3.5 w-3.5" />
                            Buy Now
                        </button>
                    ) : (
                        <button
                            onClick={onRequestProduct}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-5 py-3 sm:py-2.5 rounded-xl transition-all shadow-md hover:scale-105 active:scale-95"
                        >
                            <ShoppingCart className="h-3.5 w-3.5" />
                            Start Order
                        </button>
                    )}
                </div>
            </div>

            {/* EV / Car Financing Option */}
            {(result.category === "cars" || result.category === "vehicles") && result.fairBestPrice >= 5000000 && (() => {
                const price = result.fairBestPrice;
                const deposit = price * 0.5;
                const remaining = deposit;
                // 3/6/12 months with low interest rates
                const tier = price < 15000000 ? { months: 3, rate: 0.03, label: '3 months' }
                    : price < 30000000 ? { months: 6, rate: 0.05, label: '6 months' }
                        : { months: 12, rate: 0.08, label: '12 months' };
                const monthlyPayment = Math.round((remaining * (1 + tier.rate)) / tier.months);
                return (
                    <div className="mt-4 rounded-xl p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100">
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-md">
                                <Scale className="h-5 w-5 text-white" />
                            </div>
                            <div className="flex-1">
                                <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                    FairPrice Financing Available
                                    <span className="text-[9px] font-black bg-green-100 text-green-700 px-2 py-0.5 rounded-full">NEW</span>
                                </h4>
                                <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                                    Pay <strong className="text-blue-700">50% deposit</strong> of ₦{deposit.toLocaleString()} and finance the rest.
                                </p>
                                <div className="flex flex-wrap gap-3 mt-2.5">
                                    <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-lg">
                                        {tier.label} repayment
                                    </span>
                                    <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-lg">
                                        ~₦{monthlyPayment.toLocaleString()}/mo
                                    </span>
                                    <span className="text-[10px] font-bold text-green-700 bg-green-50 border border-green-100 px-2.5 py-1 rounded-lg">
                                        {(tier.rate * 100).toFixed(0)}% interest
                                    </span>
                                    <span className="text-[10px] font-bold text-gray-500 bg-gray-50 border border-gray-100 px-2.5 py-1 rounded-lg flex items-center gap-1">
                                        <ShieldCheck className="h-3 w-3 text-green-500" /> Concierge follow-up
                                    </span>
                                </div>
                                <button
                                    onClick={() => {
                                        window.open(`mailto:adeshop@protonmail.com?subject=Financing%20Inquiry%20-%20${encodeURIComponent(result.name)}&body=I%20would%20like%20to%20apply%20for%20financing%20for%20${encodeURIComponent(result.name)}%20at%20₦${price.toLocaleString()}.%0A%0ADeposit:%20₦${deposit.toLocaleString()}%0ARepayment:%20${tier.label}%0AMonthly:%20₦${monthlyPayment.toLocaleString()}/mo`, '_blank');
                                    }}
                                    className="mt-3 flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-md hover:shadow-lg active:scale-95"
                                >
                                    <Scale className="h-3.5 w-3.5" />
                                    Apply for Financing
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Inline Product Details Expansion */}
            <AnimatePresence>
                {showDetails && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-4 pt-4 border-t overflow-hidden"
                        style={{ borderColor: colors.border }}
                    >
                        {result.matchedProduct ? (
                            <>
                                <p className="text-sm text-gray-700 leading-relaxed mb-4 font-medium">
                                    {result.matchedProduct.description}
                                </p>
                                {result.specs && Object.keys(result.specs).length > 0 && (
                                    <div className="mb-4">
                                        <h5 className="text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-widest">Key Specifications</h5>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 p-3 bg-gray-50/50 rounded-xl border border-gray-100">
                                            {Object.entries(result.specs).map(([key, value]) => (
                                                <div key={key} className="flex flex-col">
                                                    <span className="text-[9px] text-gray-500 uppercase tracking-widest">{key}</span>
                                                    <span className="text-xs font-semibold text-gray-900 leading-snug">{String(value)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-gray-500 bg-white/50 p-3 rounded-xl border border-white/20">
                                    <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-emerald-500" /> Verified Seller</span>
                                    <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" /> Ship to {result.region}</span>
                                    <span>Stock: <strong className={result.matchedProduct.stock > 0 ? "text-emerald-600" : "text-red-500"}>{result.matchedProduct.stock > 0 ? 'Available' : 'Out of stock'}</strong></span>
                                </div>
                                <div className="mt-4 flex gap-3">
                                    <Link href={`/product/${result.matchedProduct.id}`} className="px-4 py-2 bg-white hover:bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-100 flex items-center gap-2 shadow-sm transition-all">
                                        View Full Page <ExternalLink className="h-3 w-3" />
                                    </Link>
                                </div>
                            </>
                        ) : (
                            <>
                                <p className="text-sm text-gray-800 leading-relaxed mb-4 font-medium">
                                    {result.description || "This product is currently not in the local FairPrice catalog. However, our Global Sourcing Partners can procure and deliver it to you securely based on the market estimation above."}
                                </p>
                                {result.specs && Object.keys(result.specs).length > 0 && (
                                    <div className="mb-4">
                                        <h5 className="text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-widest">Key Specifications</h5>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 p-3 bg-gray-50/50 rounded-xl border border-gray-100">
                                            {Object.entries(result.specs).map(([key, value]) => (
                                                <div key={key} className="flex flex-col">
                                                    <span className="text-[9px] text-gray-500 uppercase tracking-widest">{key}</span>
                                                    <span className="text-xs font-semibold text-gray-900 leading-snug">{String(value)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-gray-600 bg-white/50 p-3 rounded-xl border border-white/20">
                                    <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-blue-500" /> Escrow Protected</span>
                                    <span className="flex items-center gap-1.5"><Globe className="h-4 w-4" /> Global Sourcing</span>
                                    <span>Category: <strong className="text-gray-900 uppercase tracking-widest">{result.category}</strong></span>
                                </div>
                            </>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ─── Price Comparison ───────────────────────────────────────

function PriceComparison({ result }: { result: PriceIntel }) {
    return (
        <div className="grid grid-cols-2 gap-3">
            {/* FairPrice Recommended */}
            <div
                className="rounded-2xl p-4 relative overflow-hidden"
                style={{
                    background: "linear-gradient(145deg, rgba(16,185,129,0.1), rgba(16,185,129,0.03))",
                    border: "1px solid rgba(16,185,129,0.12)"
                }}
            >
                <div
                    className="absolute top-0 right-0 text-[10px] font-bold px-2 py-0.5 rounded-bl-lg"
                    style={{ background: "rgba(16,185,129,0.3)", color: "#10b981" }}
                >
                    BEST PRICE
                </div>
                <p className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wide mb-1">FairPrice Recommended</p>
                <p className="text-2xl font-bold text-gray-900 tracking-tight">
                    {formatPrice(result.fairBestPrice)}
                </p>

                {/* You Save — only show if savings > 0 */}
                {result.savingsAmount > 0 && (
                    <div className="mt-2 flex items-center gap-1.5">
                        <CheckCircle className="h-3 w-3 text-emerald-600" />
                        <span className="text-[11px] font-bold text-emerald-700">
                            You save {formatPrice(result.savingsAmount)}
                        </span>
                    </div>
                )}

                {!result.savingsAmount && (
                    <div className="mt-2 flex items-center gap-1.5 text-[10px] text-emerald-600">
                        <CheckCircle className="h-3 w-3" />
                        <span>Fair Price Estimate</span>
                    </div>
                )}
            </div>

            {/* Open Market Average */}
            <GlassCard>
                <p className="text-[10px] font-bold text-gray-700 uppercase tracking-wide mb-1">Market Estimate</p>
                <p className="text-2xl font-bold text-gray-900 tracking-tight">
                    {formatPrice(result.marketAverage)}
                </p>
                <p className="text-[10px] font-semibold text-gray-500 mt-2 flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-gray-600" />
                    <span>Region: {result.region}</span>
                </p>
            </GlassCard>
        </div>
    );
}

// ─── Price Sources Bar Chart ────────────────────────────────

function PriceSourcesChart({ result }: { result: PriceIntel }) {
    if (!result.sources || result.sources.length === 0) return null;

    // Find the max price for scaling bars
    const maxPrice = Math.max(...result.sources.map(s => s.price));
    const minPrice = Math.min(...result.sources.map(s => s.price));

    return (
        <GlassCard>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-gray-700 text-[10px] font-bold uppercase tracking-wider">
                    <BarChart3 className="h-3 w-3 text-blue-600" />
                    Price Across Stores
                </div>
                <span className="text-[10px] font-bold text-gray-500">{result.sources.length} sources</span>
            </div>
            <div className="space-y-2.5">
                {result.sources.map((source, i) => {
                    const barWidth = 30 + ((source.price - minPrice) / (maxPrice - minPrice || 1)) * 65; // 30-95%
                    const isCheapest = source.price === minPrice;
                    const barColor = isCheapest
                        ? "linear-gradient(90deg, rgba(16,185,129,0.5), rgba(16,185,129,0.8))"
                        : "linear-gradient(90deg, rgba(59,130,246,0.3), rgba(59,130,246,0.5))";

                    // Force anonymity if API leaks a domain or specific name
                    let displayName = source.source;
                    if (displayName.includes(".com") || displayName.includes(".ng") || displayName.toLowerCase().includes("jumia") || displayName.toLowerCase().includes("konga")) {
                        displayName = `Verified Vendor ${i + 1}`;
                    }

                    return (
                        <div key={i}>
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-[11px] text-gray-500 font-medium flex items-center gap-1.5">
                                    {displayName}
                                    {isCheapest && (
                                        <span className="text-[9px] font-bold text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded-full">
                                            LOWEST
                                        </span>
                                    )}
                                </span>
                                <span className={`text-[11px] font-bold ${isCheapest ? "text-emerald-400" : "text-gray-900/70"}`}>
                                    {formatPrice(source.price)}
                                </span>
                            </div>
                            <div
                                className="h-2 rounded-full overflow-hidden"
                                style={{ background: "rgba(255,255,255,0.04)" }}
                            >
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${barWidth}%` }}
                                    transition={{ duration: 0.6, delay: i * 0.1, ease: "easeOut" }}
                                    className="h-full rounded-full"
                                    style={{ background: barColor }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
            {/* FairPrice recommended line */}
            <div className="mt-3 pt-3 flex items-center justify-between" style={{ borderTop: "1px dashed rgba(0,0,0,0.1)" }}>
                <span className="text-[10px] text-emerald-700 font-medium flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3" />
                    FairPrice Estimate
                </span>
                <span className="text-[11px] font-bold text-emerald-700">{formatPrice(result.fairBestPrice)}</span>
            </div>
        </GlassCard>
    );
}

// ─── Price History Chart ────────────────────────────────────

// ─── Price History Chart (Apple-Style Area) ─────────────────

function PriceHistoryChart({ result }: { result: PriceIntel }) {
    const [hoverIndex, setHoverIndex] = useState<number | null>(null);

    const prices = result.history.map(h => h.price);
    const minPrice = Math.min(...prices) * 0.95; // 5% buffer bottom
    const maxPrice = Math.max(...prices) * 1.05; // 5% buffer top
    const range = maxPrice - minPrice || 1;
    const height = 120;
    const width = 500; // viewBox width

    // Generate SVG Path
    const points = result.history.map((h, i) => {
        const x = (i / (result.history.length - 1)) * width;
        const y = height - ((h.price - minPrice) / range) * height;
        return { x, y, price: h.price, month: h.month };
    });

    const pathPoints = points.map(p => `${p.x},${p.y}`).join(" ");

    // Basic smooth curve approximation (for "Apple" feel) using straight lines for robustness first
    // efficiently.
    const areaPath = `M0,${height} ${pathPoints.split(" ").map(p => `L${p}`).join(" ")} L${width},${height} Z`;
    const linePath = `M${pathPoints.split(" ").join(" L")}`;

    const isRising = result.priceDirection === "rising";
    const color = isRising ? "#ef4444" : "#10b981"; // Red or Emerald

    return (
        <GlassCard>
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-gray-700 text-[10px] font-bold uppercase tracking-wider">
                    {isRising ? (
                        <TrendingUp className="h-3 w-3 text-red-600" />
                    ) : (
                        <TrendingDown className="h-3 w-3 text-emerald-600" />
                    )}
                    6-Month Price Trend
                </div>
                <span className={`text-[10px] font-bold ${isRising ? "text-red-600" : "text-emerald-700"}`}>
                    {isRising ? "↑ Rising" : "↓ Falling"}
                </span>
            </div>

            <div className="relative h-28 w-full overflow-visible group">
                {/* Tooltip Overlay */}
                <AnimatePresence>
                    {hoverIndex !== null && (
                        <motion.div
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.15 }}
                            className="absolute z-20 pointer-events-none"
                            style={{
                                left: `${(hoverIndex / (result.history.length - 1)) * 100}%`,
                                top: `${(points[hoverIndex].y / height) * 100}%`,
                                transform: `translate(-50%, -130%)`
                            }}
                        >
                            <div className="bg-white border border-gray-200 shadow-xl rounded-lg px-2.5 py-1.5 flex flex-col items-center">
                                <span className="text-[9px] text-gray-600 font-bold uppercase tracking-wider">{points[hoverIndex].month}</span>
                                <span className="text-xs font-bold text-gray-900 whitespace-nowrap">{formatPrice(points[hoverIndex].price)}</span>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* SVG Chart */}
                <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
                    <defs>
                        <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
                        </linearGradient>
                    </defs>

                    {/* Area Fill */}
                    <path d={areaPath} fill="url(#chartGradient)" />

                    {/* Stroke Line */}
                    <path
                        d={linePath}
                        fill="none"
                        stroke={color}
                        strokeWidth="2.5"
                        vectorEffect="non-scaling-stroke"
                        shapeRendering="geometricPrecision"
                    />

                    {/* Dots for data points & Hover Targets */}
                    {points.map((p, i) => {
                        const isLast = i === result.history.length - 1;
                        const isHovered = hoverIndex === i;

                        return (
                            <g key={i}>
                                {/* Invisible larger circle for easier hovering */}
                                <circle
                                    cx={p.x}
                                    cy={p.y}
                                    r={15}
                                    fill="transparent"
                                    className="cursor-pointer"
                                    onMouseEnter={() => setHoverIndex(i)}
                                    onMouseLeave={() => setHoverIndex(null)}
                                />
                                {/* Visible dot */}
                                <circle
                                    cx={p.x}
                                    cy={p.y}
                                    r={isHovered ? 6 : (isLast ? 4 : 2)}
                                    fill={isHovered ? "#ffffff" : color}
                                    stroke={isHovered ? color : "none"}
                                    strokeWidth={isHovered ? 2 : 0}
                                    className="transition-all duration-300 pointer-events-none"
                                />
                            </g>
                        );
                    })}
                </svg>

                {/* X-Axis Labels positioned absolutely */}
                <div className="absolute bottom-0 left-0 right-0 flex justify-between px-1">
                    {result.history.map((h, i) => (
                        <span key={i} className="text-[9px] text-gray-600 font-bold">
                            {h.month}
                        </span>
                    ))}
                </div>
            </div>
        </GlassCard>
    );
}

// ─── Duty Breakdown ─────────────────────────────────────────

function DutyBreakdown({ result }: { result: PriceIntel }) {
    const totalDutyAmount = result.dutyBreakdown.reduce((sum, d) => sum + d.amount, 0);

    return (
        <GlassCard className="overflow-hidden !p-0">
            {/* Header */}
            <div
                className="px-6 py-4 flex items-center justify-between shrink-0 rounded-t-3xl bg-gray-50"
                style={{
                    borderBottom: "1px solid rgba(0,0,0,0.05)"
                }}
            >
                <h4 className="text-xs font-bold text-gray-900 flex items-center gap-2">
                    <Scale className="h-4 w-4 text-purple-600" />
                    Landed Cost Breakdown
                </h4>
                <div className="text-right">
                    <p className="text-[10px] text-gray-500">Base Import Cost (CIF)</p>
                    <p className="text-xs font-bold text-gray-900/70">{formatPrice(result.estimatedCIF)}</p>
                </div>
            </div>

            {/* Duty items */}
            <div className="px-5 py-4 space-y-4">
                {result.dutyBreakdown.map((d, i) => (
                    <div key={i}>
                        <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                                <span className="text-[11px] text-gray-500 font-medium">{d.label}</span>
                                <span
                                    className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                                    style={{ background: "rgba(168,85,247,0.12)", color: "rgba(168,85,247,0.8)" }}
                                >
                                    {d.percent.toFixed(d.percent % 1 ? 1 : 0)}%
                                </span>
                            </div>
                            <span className="text-[11px] font-bold text-gray-700">{formatPrice(d.amount)}</span>
                        </div>
                        <div
                            className="h-1.5 rounded-full overflow-hidden"
                            style={{ background: "rgba(255,255,255,0.04)" }}
                        >
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min((d.percent / 35) * 100, 100)}%` }}
                                transition={{ duration: 0.5, delay: i * 0.1 }}
                                className="h-full rounded-full"
                                style={{ background: "linear-gradient(90deg, rgba(168,85,247,0.4), rgba(168,85,247,0.7))" }}
                            />
                        </div>
                    </div>
                ))}

                {/* Total line */}
                <div className="pt-3 flex justify-between items-center" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                    <div>
                        <span className="text-xs font-bold text-gray-700">Total Import Duties</span>
                        <p className="text-[10px] text-gray-500 mt-0.5 max-w-[220px] leading-relaxed">Calculated based on Nigerian Customs Service tariffs for {result.category ?? "this category"}.</p>
                    </div>
                    <div className="text-right">
                        <span className="text-sm font-bold text-purple-400">+{result.totalDutyPercent}%</span>
                        <p className="text-[10px] text-gray-600">{formatPrice(totalDutyAmount)}</p>
                    </div>
                </div>
            </div>
        </GlassCard>
    );
}
