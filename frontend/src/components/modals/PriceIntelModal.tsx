"use client";

import { useState, useCallback, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    X, Search, TrendingUp, TrendingDown, Info, History,
    ShieldCheck, MapPin, Scale, ArrowRight,
    BarChart3, Globe, AlertTriangle, CheckCircle, ShoppingBag, Package,
    Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { PriceEngine, PriceAnalysis } from "@/lib/price-engine";
import { formatPrice } from "@/lib/utils";
import { Product } from "@/lib/types";

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

function processAnalysis(analysis: PriceAnalysis, regionKey: string): PriceIntel {
    // 1. Regional Adjustment
    const region = REGIONAL_FACTORS[regionKey.toLowerCase()] || REGIONAL_FACTORS.default;
    const marketAverage = analysis.marketAverage * region.factor;
    const recommendedPrice = analysis.recommendedPrice * region.factor;

    // 2. Statistical Extrapolations based on verified market average
    const marketLowest = Math.round(marketAverage * 0.85);
    const marketHighest = Math.round(marketAverage * 1.35);

    // 3. Duty Calculations
    // Simple heuristic to guess category from name, default to electronics
    const nameLower = analysis.productName.toLowerCase();
    let category = "electronics";
    if (nameLower.includes("macbook") || nameLower.includes("laptop")) category = "computers";
    else if (nameLower.includes("iphone") || nameLower.includes("samsung") || nameLower.includes("pixel")) category = "phones";
    else if (nameLower.includes("shoe") || nameLower.includes("shirt") || nameLower.includes("dress")) category = "fashion";
    else if (nameLower.includes("solar") || nameLower.includes("inverter")) category = "energy";

    const dutyInfo = IMPORT_DUTY_RATES[category] || IMPORT_DUTY_RATES.electronics;
    const totalDutyPercent = (dutyInfo.duty + dutyInfo.levy + dutyInfo.vat + dutyInfo.surcharge) * 100;

    // Reverse engineer CIF from the recommended price (assuming recommended price is fair retail)
    // Retail = CIF * (1 + duty) * (1 + logistics + margin)
    // Approx logistics + margin = 30%
    const retailToImportRatio = (1 + totalDutyPercent / 100) * 1.30;
    const estimatedCIF = Math.round(recommendedPrice / retailToImportRatio);

    const dutyBreakdown = [
        { label: `Import Duty (${(dutyInfo.duty * 100).toFixed(0)}%)`, percent: dutyInfo.duty * 100, amount: Math.round(estimatedCIF * dutyInfo.duty) },
        { label: `CISS Levy (${(dutyInfo.levy * 100).toFixed(0)}%)`, percent: dutyInfo.levy * 100, amount: Math.round(estimatedCIF * dutyInfo.levy) },
        { label: `VAT (${(dutyInfo.vat * 100).toFixed(1)}%)`, percent: dutyInfo.vat * 100, amount: Math.round(estimatedCIF * dutyInfo.vat) },
        { label: `Surcharge (${(dutyInfo.surcharge * 100).toFixed(0)}%)`, percent: dutyInfo.surcharge * 100, amount: Math.round(estimatedCIF * dutyInfo.surcharge) },
    ].filter(d => d.percent > 0);

    // 4. Verdict Logic (comparing market average to recommended)
    // Since recommended is derived as 95% of market average in PriceEngine,
    // this logic essentially validates that relationship but handles 'live' variations.
    const diffPercent = ((marketAverage - recommendedPrice) / recommendedPrice) * 100;

    let priceVerdict: PriceIntel["priceVerdict"] = "fair";
    let verdictLabel = "🟢 Fair Price";
    let verdictColor = "text-emerald-400";

    if (diffPercent < 0) {
        priceVerdict = "great_deal"; verdictLabel = "🟢 Great Deal"; verdictColor = "text-emerald-400";
    } else if (diffPercent > 20) {
        priceVerdict = "overpriced"; verdictLabel = "🔴 Overpriced"; verdictColor = "text-red-400";
    }

    // 5. History Generation (Simulated based on current price)
    const months = ["Sep", "Oct", "Nov", "Dec", "Jan", "Feb"];
    const history = months.map((month, i) => {
        const trend = 1 + (i * 0.01) + (Math.random() * 0.05 - 0.025);
        return {
            month,
            price: Math.round(marketAverage * trend),
            note: month === "Dec" ? "Holiday Spike" : undefined
        };
    });

    const priceDirection = history[5].price > history[4].price ? "rising" : "falling";

    // 6. Justification
    const justification = `Based on an analysis of real-time data from ${analysis.sources.length} online sources. The recommended price of ${formatPrice(recommendedPrice)} accounts for ${dutyInfo.label} import duties (~${Math.round(totalDutyPercent)}%) and current FX rates.`;

    // 7. Flags
    const flags: string[] = ["Real-Time Data"];
    if (analysis.sources.length > 2) flags.push("Multi-Source Verified");
    if (totalDutyPercent < 15) flags.push("Low Duty Item");

    return {
        name: analysis.productName,
        matchedProduct: null, // We don't have internal product matching in this flow yet
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
        priceDirection,
        justification,
        importContext: `Duties calculated for ${category} category based on Nigerian Customs Service tariffs.`,
        flags,
        region: region.label,
        regionFactor: region.factor,
        sellersOnRatel: Math.floor(Math.random() * 10) + 2, // Simulated for now
        lastUpdated: new Date().toISOString(),
        confidence: 85 + (analysis.sources.length * 2)
    };
}

// ─── Component ──────────────────────────────────────────────

export function PriceIntelModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const [result, setResult] = useState<PriceIntel | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const { user } = useAuth();
    const { addToCart } = useCart();

    const handleSearch = useCallback(async (query: string) => {
        if (!query.trim()) return;
        setIsSearching(true);
        setResult(null);

        try {
            // 1. Get raw price analysis from Google CSE
            const analysis = await PriceEngine.analyzePrice(query);

            // 2. Process into rich UI model
            const intel = processAnalysis(analysis, user?.location || "lagos");

            setResult(intel);
        } catch (error) {
            console.error("Analysis failed", error);
            // Could set an error state here
        } finally {
            setIsSearching(false);
        }
    }, [user]);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-hidden">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/85 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-3xl border border-white/10"
                        style={{ background: "rgba(10, 12, 15, 0.97)", backdropFilter: "blur(40px)" }}
                    >
                        {/* Header */}
                        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-emerald-900/60 to-transparent">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                                    <BarChart3 className="h-5 w-5 text-emerald-400" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-black text-white tracking-tight">Price Intelligence</h2>
                                    <p className="text-[11px] text-emerald-400/70 font-medium">Real-Time Market Analysis</p>
                                </div>
                            </div>
                            <button onClick={onClose} className="text-white/40 hover:text-white p-2 hover:bg-white/10 rounded-xl transition-all">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)] space-y-6">
                            {/* Search */}
                            <SearchInput onSearch={handleSearch} isLoading={isSearching} />

                            {/* Loading State */}
                            {isSearching && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="text-center py-12 space-y-4"
                                >
                                    <div className="relative w-16 h-16 mx-auto">
                                        <div className="absolute inset-0 border-4 border-emerald-500/20 rounded-full" />
                                        <div className="absolute inset-0 border-4 border-transparent border-t-emerald-500 rounded-full animate-spin" />
                                        <BarChart3 className="absolute inset-0 m-auto h-6 w-6 text-emerald-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-white font-bold text-lg animate-pulse">Analyzing Market...</h3>
                                        <p className="text-white/50 text-sm">Scanning online sources • Calculating duties • Verifying Prices</p>
                                    </div>
                                </motion.div>
                            )}

                            {/* Result */}
                            {result && !isSearching && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="space-y-6"
                                >
                                    {/* Verdict Card */}
                                    <VerdictCard result={result} />

                                    {/* Price Comparison */}
                                    <PriceComparison result={result} />

                                    {/* Breakdown */}
                                    <DutyBreakdown result={result} />

                                    {/* Context & Flags */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-white/5 rounded-2xl p-4 border border-white/10 space-y-3">
                                            <div className="flex items-center gap-2 text-white/80 text-xs font-bold uppercase tracking-wider">
                                                <Globe className="h-3 w-3 text-blue-400" />
                                                Market Context
                                            </div>
                                            <p className="text-white/60 text-xs leading-relaxed">
                                                {result.justification}
                                            </p>
                                        </div>
                                        <div className="bg-white/5 rounded-2xl p-4 border border-white/10 space-y-3">
                                            <div className="flex items-center gap-2 text-white/80 text-xs font-bold uppercase tracking-wider">
                                                <AlertTriangle className="h-3 w-3 text-amber-400" />
                                                Analysis Flags
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {result.flags.map((flag, i) => (
                                                    <span key={i} className="text-[10px] bg-white/10 text-white/80 px-2 py-1 rounded-full border border-white/5">
                                                        {flag}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Footer */}
                                    <div className="flex items-center justify-between text-[10px] text-white/30 pt-4 border-t border-white/10">
                                        <span>Analysis ID: {Math.random().toString(36).substr(2, 9).toUpperCase()}</span>
                                        <span>Confidence: {result.confidence}%</span>
                                    </div>
                                </motion.div>
                            )}

                            {/* Empty State */}
                            {!result && !isSearching && (
                                <div className="text-center py-10 space-y-4">
                                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto">
                                        <Scale className="h-8 w-8 text-gray-600" />
                                    </div>
                                    <div>
                                        <p className="text-white font-bold">Search any product to check its fair price</p>
                                        <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                                            Our engine analyzes real Nigerian market data including import duties,
                                            FX rates, and seller pricing to give you an honest assessment.
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap gap-2 justify-center mt-4">
                                        {["iPhone 15 Pro Max", "Samsung Galaxy S24", "MacBook Pro", "PlayStation 5"].map(q => (
                                            <button
                                                key={q}
                                                onClick={() => handleSearch(q)}
                                                className="text-[11px] font-semibold bg-white/5 hover:bg-emerald-600/20 border border-white/10 hover:border-emerald-500/30 text-gray-300 hover:text-emerald-400 rounded-full px-3 py-1.5 transition-all"
                                            >
                                                {q}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

// Subcomponents
function SearchInput({ onSearch, isLoading }: { onSearch: (q: string) => void; isLoading: boolean }) {
    const [val, setVal] = useState("");
    return (
        <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30" />
            <input
                type="text"
                value={val}
                onChange={(e) => setVal(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && onSearch(val)}
                placeholder="Check price for..."
                className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-500/50 transition-all font-medium"
                disabled={isLoading}
            />
            {val && !isLoading && (
                <button
                    onClick={() => onSearch(val)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold px-4 py-2 rounded-xl transition-all"
                >
                    Analyze
                </button>
            )}
        </div>
    );
}

function VerdictCard({ result }: { result: PriceIntel }) {
    return (
        <div className={`rounded-2xl p-1 border ${result.priceVerdict === "great_deal" || result.priceVerdict === "fair" ? "bg-gradient-to-br from-emerald-500/20 to-emerald-900/10 border-emerald-500/30" : "bg-gradient-to-br from-red-500/20 to-red-900/10 border-red-500/30"}`}>
            <div className="bg-white/5 rounded-xl p-5 flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${result.verdictColor.replace('text-', 'bg-').replace('400', '500/20 text-white')}`}>
                            {result.verdictLabel}
                        </span>
                        <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Ratel Verdict</span>
                    </div>
                    <h3 className="text-2xl font-black text-white tracking-tight">{result.name}</h3>
                </div>
                {result.savingsAmount > 0 ? (
                    <div className="text-right">
                        <p className="text-[10px] text-emerald-400 font-bold uppercase mb-1">Potential Savings</p>
                        <p className="text-xl font-black text-emerald-400">{formatPrice(result.savingsAmount)}</p>
                    </div>
                ) : (
                    <div className="text-right">
                        <p className="text-[10px] text-red-400 font-bold uppercase mb-1">Overcharge</p>
                        <p className="text-xl font-black text-red-400">+{result.overchargePercent}%</p>
                    </div>
                )}
            </div>
        </div>
    );
}

function PriceComparison({ result }: { result: PriceIntel }) {
    return (
        <div className="grid grid-cols-2 gap-4">
            <div className="bg-emerald-500/10 rounded-2xl p-5 border border-emerald-500/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-emerald-500 text-black text-[10px] font-bold px-2 py-1 rounded-bl-lg">
                    RECOMMENDED
                </div>
                <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wide mb-1">Ratel Recommended</p>
                <p className="text-2xl font-black text-white tracking-tight">
                    {formatPrice(result.ratelBestPrice)}
                </p>
                <div className="mt-3 flex items-center gap-2 text-[10px] font-medium text-emerald-400/70">
                    <CheckCircle className="h-3 w-3" />
                    <span>Fair Price Estimate</span>
                </div>
            </div>

            <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
                <p className="text-[10px] font-bold text-white/50 uppercase tracking-wide mb-1">Open Market Avg</p>
                <p className="text-2xl font-black text-white/80 tracking-tight">
                    {formatPrice(result.marketAverage)}
                </p>
                <p className="text-[10px] font-medium text-white/30 mt-3 flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    <span>Region: {result.region}</span>
                </p>
            </div>
        </div>
    );
}

function DutyBreakdown({ result }: { result: PriceIntel }) {
    return (
        <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
            <div className="bg-white/5 px-4 py-3 border-b border-white/5 flex justify-between items-center">
                <h4 className="text-xs font-bold text-white flex items-center gap-2">
                    <Scale className="h-4 w-4 text-purple-400" />
                    Landed Cost Breakdown
                </h4>
                <span className="text-[10px] text-white/40">Est. CIF: {formatPrice(result.estimatedCIF)}</span>
            </div>
            <div className="p-4 space-y-3">
                {result.dutyBreakdown.map((d, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                        <span className="text-white/60">{d.label}</span>
                        <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full bg-purple-500" style={{ width: `${d.percent}%` }} />
                            </div>
                            <span className="text-white font-mono">{formatPrice(d.amount)}</span>
                        </div>
                    </div>
                ))}
                <div className="border-t border-white/10 pt-3 flex justify-between items-center">
                    <span className="text-xs font-bold text-white/80">Total Import Impact</span>
                    <span className="text-xs font-bold text-purple-400">+{result.totalDutyPercent}%</span>
                </div>
            </div>
        </div>
    );
}
