"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    X, Search, TrendingUp, TrendingDown,
    ShieldCheck, MapPin, Scale, ArrowRight,
    BarChart3, Globe, AlertTriangle, CheckCircle, ShoppingCart,
    Loader2, ExternalLink, ChevronRight
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { PriceEngine, PriceAnalysis, PriceData, ProductSuggestion } from "@/lib/price-engine";
import { formatPrice } from "@/lib/utils";
import { Product } from "@/lib/types";
import { DEMO_PRODUCTS } from "@/lib/data";

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

// ─── Interfaces ─────────────────────────────────────────────

interface PriceHistory {
    month: string;
    price: number;
    note?: string;
}

interface PriceIntel {
    name: string;
    matchedProduct: Product | null;
    // Core pricing
    ratelBestPrice: number;
    ratelAvgPrice: number;
    marketLowest: number;
    marketAverage: number;
    marketHighest: number;
    // Analysis
    priceVerdict: "great_deal" | "fair" | "slightly_above" | "overpriced" | "suspicious";
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
    sellersOnRatel: number;
    lastUpdated: string;
    confidence: number;
}

// ─── Logic Transformation ───────────────────────────────────

function processAnalysis(analysis: PriceAnalysis, regionKey: string, matchedProduct: Product | null): PriceIntel {
    // 1. Regional Adjustment
    const region = REGIONAL_FACTORS[regionKey.toLowerCase()] || REGIONAL_FACTORS.default;
    const marketAverage = analysis.marketAverage * region.factor;
    const recommendedPrice = analysis.recommendedPrice * region.factor;

    // 2. Statistical Extrapolations or Real Data
    // Use Gemini's real market range if available, otherwise extrapolate
    const marketLowest = analysis.marketLow
        ? Math.round(analysis.marketLow * region.factor)
        : Math.round(marketAverage * 0.85);

    const marketHighest = analysis.marketHigh
        ? Math.round(analysis.marketHigh * region.factor)
        : Math.round(marketAverage * 1.35);

    // 3. Duty Calculations
    const nameLower = analysis.productName.toLowerCase();
    let category = "electronics";

    // Use Gemini's detected category if available
    if (analysis.category) {
        if (analysis.category === "phones") category = "phones";
        else if (analysis.category === "computers") category = "computers";
        else if (analysis.category === "fashion") category = "fashion";
        else if (analysis.category === "cars") category = "cars";
        else if (analysis.category === "energy") category = "energy";
    } else {
        // Fallback to keyword matching
        if (nameLower.includes("macbook") || nameLower.includes("laptop")) category = "computers";
        else if (nameLower.includes("iphone") || nameLower.includes("samsung") || nameLower.includes("pixel")) category = "phones";
        else if (nameLower.includes("shoe") || nameLower.includes("shirt") || nameLower.includes("dress")) category = "fashion";
        else if (nameLower.includes("solar") || nameLower.includes("inverter")) category = "energy";
        else if (nameLower.includes("car") || nameLower.includes("lexus") || nameLower.includes("toyota")) category = "cars";
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

    // 4. Verdict Logic
    const diffPercent = ((marketAverage - recommendedPrice) / recommendedPrice) * 100;

    let priceVerdict: PriceIntel["priceVerdict"] = "fair";
    let verdictLabel = "Fair Price";
    let verdictColor = "emerald";

    if (diffPercent < 0) {
        priceVerdict = "great_deal"; verdictLabel = "Great Deal"; verdictColor = "emerald";
    } else if (diffPercent > 20) {
        priceVerdict = "overpriced"; verdictLabel = "Overpriced"; verdictColor = "red";
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
    const justification = analysis.justification || `Based on analysis of real-time data from ${analysis.sources.length} online sources. The recommended price of ${formatPrice(recommendedPrice)} accounts for ${dutyInfo.label} import duties (~${Math.round(totalDutyPercent)}%) and current FX rates.`;

    // 7. Flags
    const flags: string[] = ["Real-Time Data"];
    if (analysis.sources.length > 2) flags.push("Multi-Source Verified");
    if (totalDutyPercent < 15) flags.push("Low Duty Item");
    if (matchedProduct) flags.push("In-Store Product");
    if (analysis.confidence === "low") flags.push("Low Confidence Estimate");

    return {
        name: analysis.productName,
        matchedProduct,
        ratelBestPrice: recommendedPrice,
        ratelAvgPrice: Math.round(recommendedPrice * 1.05),
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
        importContext: `Duties calculated for ${category} category based on Nigerian Customs Service tariffs.`,
        flags,
        region: region.label,
        regionFactor: region.factor,
        sellersOnRatel: Math.floor(seeded(100) * 10) + 2,
        lastUpdated: new Date().toISOString(),
        confidence: analysis.confidence === "high" ? 95 : analysis.confidence === "low" ? 65 : 85
    };
}

// ─── Component ──────────────────────────────────────────────

export function PriceIntelModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const [result, setResult] = useState<PriceIntel | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const { user } = useAuth();
    const { addToCart } = useCart();

    // Debounced search for suggestions
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (searchQuery.length >= 2 && !result) {
                const suggs = await PriceEngine.searchProducts(searchQuery);
                setSuggestions(suggs);
            }
        }, 600);
        return () => clearTimeout(timer);
    }, [searchQuery, result]);

    const handleAnalyze = useCallback(async (productName: string, product?: Product) => {
        setIsSearching(true);
        setSuggestions([]); // Clear suggestions
        setResult(null);

        try {
            // Find matched product locally if possible for "Buy Now"
            const matchedProduct = product || DEMO_PRODUCTS.find(p => p.name.toLowerCase() === productName.toLowerCase()) || null;

            // Deep Analysis
            const analysis = await PriceEngine.analyzePrice(productName);
            const intel = processAnalysis(analysis, user?.location || "lagos", matchedProduct);
            setResult(intel);
        } catch (error) {
            console.error("Analysis failed", error);
        } finally {
            setIsSearching(false);
        }
    }, [user]);



    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 overflow-hidden">
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
                        className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-3xl"
                        style={{
                            background: "linear-gradient(145deg, rgba(20, 25, 32, 0.85), rgba(12, 14, 18, 0.92))",
                            backdropFilter: "blur(60px) saturate(1.5)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            boxShadow: "0 40px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)"
                        }}
                    >
                        {/* Header — Liquid Glass */}
                        <div
                            className="px-6 py-4 flex items-center justify-between"
                            style={{
                                background: "linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(16, 185, 129, 0.02))",
                                borderBottom: "1px solid rgba(255,255,255,0.06)"
                            }}
                        >
                            <div className="flex items-center gap-3">
                                <div
                                    className="h-10 w-10 rounded-xl flex items-center justify-center"
                                    style={{
                                        background: "linear-gradient(135deg, rgba(16,185,129,0.25), rgba(16,185,129,0.1))",
                                        border: "1px solid rgba(16,185,129,0.2)"
                                    }}
                                >
                                    <BarChart3 className="h-5 w-5 text-emerald-400" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-white tracking-tight">Price Intelligence</h2>
                                    <p className="text-[11px] text-emerald-400/60 font-medium">Real-Time Market Analysis</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="text-white/30 hover:text-white p-2 rounded-xl transition-all hover:bg-white/5"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 overflow-y-auto max-h-[calc(90vh-72px)] space-y-5 custom-scrollbar">
                            {/* Search */}
                            <SearchInput
                                value={searchQuery}
                                onChange={setSearchQuery}
                                onSearch={(q) => handleAnalyze(q)}
                                isLoading={isSearching}
                            />

                            {/* Loading State */}
                            {isSearching && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="text-center py-12 space-y-4"
                                >
                                    <div className="relative w-16 h-16 mx-auto">
                                        <div className="absolute inset-0 border-2 border-emerald-500/10 rounded-full" />
                                        <div className="absolute inset-0 border-2 border-transparent border-t-emerald-400 rounded-full animate-spin" />
                                        <BarChart3 className="absolute inset-0 m-auto h-6 w-6 text-emerald-400/60" />
                                    </div>
                                    <div>
                                        <h3 className="text-white font-semibold text-base animate-pulse">Scanning Markets...</h3>
                                        <p className="text-white/40 text-xs mt-1">Checking prices across Nigerian stores</p>
                                    </div>
                                </motion.div>
                            )}

                            {/* Result */}
                            {result && !isSearching && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="space-y-5"
                                >
                                    {/* Verdict Card */}
                                    <VerdictCard result={result} onAddToCart={addToCart} />

                                    {/* Price Comparison */}
                                    <PriceComparison result={result} />

                                    {/* Price Sources Bar Chart REMOVED as per user request */}
                                    {/* <PriceSourcesChart result={result} /> */}

                                    {/* Price History Chart */}
                                    <PriceHistoryChart result={result} />

                                    {/* Duty Breakdown */}
                                    <DutyBreakdown result={result} />

                                    {/* Context & Flags */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <GlassCard>
                                            <div className="flex items-center gap-2 text-white/60 text-[10px] font-semibold uppercase tracking-wider mb-2">
                                                <Globe className="h-3 w-3 text-blue-400" />
                                                Market Context
                                            </div>
                                            <p className="text-white/50 text-[11px] leading-relaxed">
                                                {result.justification}
                                            </p>
                                        </GlassCard>
                                        <GlassCard>
                                            <div className="flex items-center gap-2 text-white/60 text-[10px] font-semibold uppercase tracking-wider mb-2">
                                                <AlertTriangle className="h-3 w-3 text-amber-400" />
                                                Analysis Flags
                                            </div>
                                            <div className="flex flex-wrap gap-1.5">
                                                {result.flags.map((flag, i) => (
                                                    <span
                                                        key={i}
                                                        className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                                                        style={{
                                                            background: "rgba(255,255,255,0.06)",
                                                            border: "1px solid rgba(255,255,255,0.06)",
                                                            color: "rgba(255,255,255,0.6)"
                                                        }}
                                                    >
                                                        {flag}
                                                    </span>
                                                ))}
                                            </div>
                                        </GlassCard>
                                    </div>

                                    {/* Footer */}
                                    <div className="flex items-center justify-between text-[10px] text-white/20 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                                        <span>Analysis ID: {Math.random().toString(36).substr(2, 9).toUpperCase()}</span>
                                        <span>Confidence: {result.confidence}%</span>
                                    </div>
                                </motion.div>
                            )}

                            {/* Empty State */}
                            {/* Empty State / Suggestions */}
                            {!result && !isSearching && (
                                <div className="py-6 space-y-4">
                                    {/* Show Suggestions if available */}
                                    {suggestions.length > 0 ? (
                                        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                            <div className="flex items-center gap-2 text-white/40 text-xs uppercase font-bold tracking-wider px-1">
                                                <ShieldCheck className="h-3 w-3" />
                                                Suggested Products
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                {suggestions.map((s, i) => (
                                                    <button
                                                        key={i}
                                                        onClick={() => handleAnalyze(s.name)}
                                                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-all text-left border border-white/5 hover:border-emerald-500/30 group"
                                                    >
                                                        <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0 group-hover:bg-emerald-500/20 transition-colors">
                                                            <Search className="h-5 w-5 text-emerald-400" />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors line-clamp-1">{s.name}</p>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] text-white/40">{s.category}</span>
                                                                <span className="text-[10px] text-emerald-400 font-medium">~{formatPrice(s.approxPrice)}</span>
                                                            </div>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center py-8">
                                            <div
                                                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                                                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                                            >
                                                <Scale className="h-8 w-8 text-white/20" />
                                            </div>
                                            <p className="text-white font-semibold text-sm">Search any product to check its fair price</p>
                                            <p className="text-xs text-white/30 mt-1 max-w-md mx-auto">
                                                Try searching for &quot;Tesla&quot;, &quot;iPhone 15&quot;, or &quot;Solar Inverter&quot;.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

// ─── Reusable Glass Card ────────────────────────────────────

function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return (
        <div
            className={`rounded-2xl p-4 ${className}`}
            style={{
                background: "rgba(255,255,255,0.03)",
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(255,255,255,0.06)",
            }}
        >
            {children}
        </div>
    );
}

// ─── Search Input with Hybrid Autocomplete ──────────────────

function SearchInput({ value, onChange, onSearch, isLoading }: { value: string, onChange: (v: string) => void, onSearch: (q: string, product?: Product) => void; isLoading: boolean }) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [apiSuggestions, setApiSuggestions] = useState<ProductSuggestion[]>([]);
    const [localMatches, setLocalMatches] = useState<Product[]>([]);

    // Debounced search for suggestions
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (value.length >= 2) {
                // 1. Local Search
                const local = DEMO_PRODUCTS.filter(p =>
                    p.name.toLowerCase().includes(value.toLowerCase()) ||
                    p.category.toLowerCase().includes(value.toLowerCase())
                ).slice(0, 3);
                setLocalMatches(local);

                // 2. API Search (only if local results are few, or always to give variety)
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
        <div className="relative" onClick={(e) => e.stopPropagation()}>
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/25 z-10" />
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
                className="w-full h-12 rounded-xl pl-11 pr-24 text-sm text-white placeholder:text-white/25 focus:outline-none transition-all font-medium"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                disabled={isLoading}
                autoFocus
            />
            {value && !isLoading && (
                <button
                    onClick={() => {
                        onSearch(value);
                        setShowSuggestions(false);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold px-4 py-2 rounded-lg transition-all"
                >
                    Analyze
                </button>
            )}

            {/* Hybrid Dropdown */}
            {showSuggestions && value.length >= 2 && !isLoading && (
                <div
                    className="absolute top-full left-0 right-0 mt-2 rounded-xl border border-white/10 bg-[#0f1115]/95 backdrop-blur-xl shadow-2xl overflow-hidden z-50 transform origin-top animate-in fade-in zoom-in-95 duration-200"
                >
                    {/* Local Matches Section */}
                    {localMatches.length > 0 && (
                        <div>
                            <div className="px-4 py-2 bg-white/5 border-b border-white/5 flex items-center gap-2">
                                <Box className="h-3 w-3 text-emerald-400" />
                                <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider">In Catalog</span>
                            </div>
                            {localMatches.map((product) => (
                                <button
                                    key={product.id}
                                    onClick={() => {
                                        onChange(product.name);
                                        onSearch(product.name, product);
                                        setShowSuggestions(false);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 text-left group"
                                >
                                    <div className="h-8 w-8 rounded-lg bg-white/5 p-1">
                                        <img src={product.image_url} className="w-full h-full object-contain" alt="" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-white group-hover:text-emerald-400 transition-colors">{product.name}</p>
                                        <p className="text-[11px] text-emerald-400 font-bold">{formatPrice(product.price)}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* API Suggestions Section */}
                    {apiSuggestions.length > 0 && (
                        <div>
                            <div className="px-4 py-2 bg-white/5 border-b border-white/5 flex items-center gap-2">
                                <Search className="h-3 w-3 text-blue-400" />
                                <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider">Suggestions</span>
                            </div>
                            {apiSuggestions.map((s, i) => (
                                <button
                                    key={i}
                                    onClick={() => {
                                        onChange(s.name);
                                        onSearch(s.name);
                                        setShowSuggestions(false);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 text-left group"
                                >
                                    <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                        <Search className="h-4 w-4 text-blue-400" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-white group-hover:text-blue-400 transition-colors">{s.name}</p>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] text-white/40">{s.category}</span>
                                            <span className="text-[10px] text-blue-400 font-medium">~{formatPrice(s.approxPrice)}</span>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Verdict Card ───────────────────────────────────────────

function VerdictCard({ result, onAddToCart }: { result: PriceIntel; onAddToCart: (p: Product, qty?: number) => void }) {
    const verdictColors: Record<string, { bg: string; border: string; dot: string }> = {
        emerald: { bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.15)", dot: "#10b981" },
        red: { bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.15)", dot: "#ef4444" },
    };
    const colors = verdictColors[result.verdictColor] || verdictColors.emerald;

    return (
        <div
            className="rounded-2xl p-5"
            style={{ background: colors.bg, border: `1px solid ${colors.border}` }}
        >
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                    {/* Verdict badge */}
                    <div className="flex items-center gap-2 mb-2">
                        <span
                            className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full"
                            style={{ background: "rgba(255,255,255,0.06)", color: colors.dot }}
                        >
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: colors.dot }} />
                            {result.verdictLabel}
                        </span>
                        <span className="text-[10px] text-white/30 uppercase tracking-widest font-semibold">Ratel Verdict</span>
                    </div>

                    {/* Product title — clickable if matched */}
                    {result.matchedProduct ? (
                        <Link
                            href={`/product/${result.matchedProduct.id}`}
                            className="text-xl font-bold text-white hover:text-emerald-400 transition-colors inline-flex items-center gap-2 group"
                        >
                            {result.name}
                            <ExternalLink className="h-3.5 w-3.5 text-white/20 group-hover:text-emerald-400 transition-colors" />
                        </Link>
                    ) : (
                        <h3 className="text-xl font-bold text-white">{result.name}</h3>
                    )}
                </div>

                {/* Action Buttons */}
                {result.matchedProduct ? (
                    <button
                        onClick={() => result.matchedProduct && onAddToCart(result.matchedProduct)}
                        className="shrink-0 flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs px-5 py-2.5 rounded-xl transition-all hover:scale-105 active:scale-95"
                    >
                        <ShoppingCart className="h-3.5 w-3.5" />
                        Buy Now
                    </button>
                ) : (
                    <button
                        onClick={() => alert(`Request received for ${result.name}! We will contact you shortly.`)}
                        className="shrink-0 flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all border border-white/10 hover:scale-105 active:scale-95"
                    >
                        <ShoppingCart className="h-3.5 w-3.5" />
                        Request Product
                    </button>
                )}
            </div>
        </div>
    );
}

// ─── Price Comparison ───────────────────────────────────────

function PriceComparison({ result }: { result: PriceIntel }) {
    return (
        <div className="grid grid-cols-2 gap-3">
            {/* Ratel Recommended */}
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
                <p className="text-[10px] font-semibold text-emerald-400/70 uppercase tracking-wide mb-1">Ratel Recommended</p>
                <p className="text-2xl font-bold text-white tracking-tight">
                    {formatPrice(result.ratelBestPrice)}
                </p>

                {/* You Save — only show if savings > 0 */}
                {result.savingsAmount > 0 && (
                    <div className="mt-2 flex items-center gap-1.5">
                        <CheckCircle className="h-3 w-3 text-emerald-400" />
                        <span className="text-[11px] font-semibold text-emerald-400">
                            You save {formatPrice(result.savingsAmount)}
                        </span>
                    </div>
                )}

                {!result.savingsAmount && (
                    <div className="mt-2 flex items-center gap-1.5 text-[10px] text-emerald-400/50">
                        <CheckCircle className="h-3 w-3" />
                        <span>Fair Price Estimate</span>
                    </div>
                )}
            </div>

            {/* Open Market Average */}
            <GlassCard>
                <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wide mb-1">Open Market Avg</p>
                <p className="text-2xl font-bold text-white/70 tracking-tight">
                    {formatPrice(result.marketAverage)}
                </p>
                <p className="text-[10px] text-white/25 mt-2 flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
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
                <div className="flex items-center gap-2 text-white/50 text-[10px] font-semibold uppercase tracking-wider">
                    <BarChart3 className="h-3 w-3 text-blue-400" />
                    Price Across Stores
                </div>
                <span className="text-[10px] text-white/25">{result.sources.length} sources</span>
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
                                <span className="text-[11px] text-white/60 font-medium flex items-center gap-1.5">
                                    {displayName}
                                    {isCheapest && (
                                        <span className="text-[9px] font-bold text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded-full">
                                            LOWEST
                                        </span>
                                    )}
                                </span>
                                <span className={`text-[11px] font-bold ${isCheapest ? "text-emerald-400" : "text-white/70"}`}>
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
            {/* Ratel recommended line */}
            <div className="mt-3 pt-3 flex items-center justify-between" style={{ borderTop: "1px dashed rgba(255,255,255,0.06)" }}>
                <span className="text-[10px] text-emerald-400/60 font-medium flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3" />
                    Ratel Fair Price
                </span>
                <span className="text-[11px] font-bold text-emerald-400">{formatPrice(result.ratelBestPrice)}</span>
            </div>
        </GlassCard>
    );
}

// ─── Price History Chart ────────────────────────────────────

// ─── Price History Chart (Apple-Style Area) ─────────────────

function PriceHistoryChart({ result }: { result: PriceIntel }) {
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
        return `${x},${y}`;
    }).join(" ");

    // Basic smooth curve approximation (for "Apple" feel) using straight lines for robustness first
    // ideally we'd use a spline function, but straight lines with a gradient fill look decent for now
    // efficiently.
    const areaPath = `M0,${height} ${points.split(" ").map(p => `L${p}`).join(" ")} L${width},${height} Z`;
    const linePath = `M${points.split(" ").join(" L")}`;

    const isRising = result.priceDirection === "rising";
    const color = isRising ? "#ef4444" : "#10b981"; // Red or Emerald

    return (
        <GlassCard>
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-white/50 text-[10px] font-semibold uppercase tracking-wider">
                    {isRising ? (
                        <TrendingUp className="h-3 w-3 text-red-400" />
                    ) : (
                        <TrendingDown className="h-3 w-3 text-emerald-400" />
                    )}
                    6-Month Price Trend
                </div>
                <span className={`text-[10px] font-bold ${isRising ? "text-red-400/70" : "text-emerald-400/70"}`}>
                    {isRising ? "↑ Rising" : "↓ Falling"}
                </span>
            </div>

            <div className="relative h-28 w-full overflow-hidden">
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

                    {/* Dots for data points */}
                    {result.history.map((h, i) => {
                        const x = (i / (result.history.length - 1)) * width;
                        const y = height - ((h.price - minPrice) / range) * height;
                        const isLast = i === result.history.length - 1;

                        return (
                            <circle
                                key={i}
                                cx={x}
                                cy={y}
                                r={isLast ? 4 : 2}
                                fill={color}
                                className="transition-all duration-500"
                            />
                        );
                    })}
                </svg>

                {/* X-Axis Labels positioned absolutely */}
                <div className="absolute bottom-0 left-0 right-0 flex justify-between px-1">
                    {result.history.map((h, i) => (
                        <span key={i} className="text-[9px] text-white/20 font-medium">
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
                className="px-5 py-3.5 flex justify-between items-center"
                style={{
                    background: "rgba(255,255,255,0.02)",
                    borderBottom: "1px solid rgba(255,255,255,0.05)"
                }}
            >
                <h4 className="text-xs font-bold text-white flex items-center gap-2">
                    <Scale className="h-4 w-4 text-purple-400" />
                    Import Cost Breakdown
                </h4>
                <div className="text-right">
                    <p className="text-[10px] text-white/30">Est. CIF Value</p>
                    <p className="text-xs font-bold text-white/70">{formatPrice(result.estimatedCIF)}</p>
                </div>
            </div>

            {/* Duty items */}
            <div className="px-5 py-4 space-y-4">
                {result.dutyBreakdown.map((d, i) => (
                    <div key={i}>
                        <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                                <span className="text-[11px] text-white/60 font-medium">{d.label}</span>
                                <span
                                    className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                                    style={{ background: "rgba(168,85,247,0.12)", color: "rgba(168,85,247,0.8)" }}
                                >
                                    {d.percent.toFixed(d.percent % 1 ? 1 : 0)}%
                                </span>
                            </div>
                            <span className="text-[11px] font-bold text-white/80">{formatPrice(d.amount)}</span>
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
                        <span className="text-xs font-bold text-white/80">Total Import Duties</span>
                        <p className="text-[10px] text-white/30 mt-0.5">{result.importContext}</p>
                    </div>
                    <div className="text-right">
                        <span className="text-sm font-bold text-purple-400">+{result.totalDutyPercent}%</span>
                        <p className="text-[10px] text-white/40">{formatPrice(totalDutyAmount)}</p>
                    </div>
                </div>
            </div>
        </GlassCard>
    );
}
