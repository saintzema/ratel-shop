"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, TrendingUp, AlertCircle, Info, History, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface PriceHistory {
    month: string;
    price: number;
}

interface PriceIntel {
    name: string;
    ratelPrice: number;
    marketPrice: number;
    history: PriceHistory[];
    justification: string;
    flags: string[];
}

export function PriceIntelModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const [query, setQuery] = useState("");
    const [result, setResult] = useState<PriceIntel | null>(null);
    const [isSearching, setIsSearching] = useState(false);

    const handleSearch = () => {
        if (!query.trim()) return;
        setIsSearching(true);
        // Simulate API delay
        setTimeout(() => {
            setResult({
                name: query,
                ratelPrice: 450000,
                marketPrice: 520000,
                history: [
                    { month: "Jan", price: 420000 },
                    { month: "Feb", price: 430000 },
                    { month: "Mar", price: 450000 },
                ],
                justification: "Our price is based on direct manufacturer sourcing and optimized logistics. The slightly higher historical trend is due to current 35% import duty hikes and FX volatility.",
                flags: ["Fair Price Certified", "Logistics Optimized"],
            });
            setIsSearching(false);
        }, 1500);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative w-full max-w-2xl glass-card overflow-hidden"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-ratel-green-900/50">
                            <div className="flex items-center gap-3 text-white">
                                <TrendingUp className="text-ratel-orange" />
                                <h2 className="text-xl font-bold">Ratel Price Intelligence</h2>
                            </div>
                            <button onClick={onClose} className="text-white/50 hover:text-white">
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Search Box */}
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                        placeholder="Enter product name (e.g. iPhone 15 Pro)..."
                                        className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500 rounded-xl"
                                        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                                    />
                                </div>
                                <Button
                                    onClick={handleSearch}
                                    disabled={isSearching}
                                    className="bg-ratel-orange text-black hover:bg-amber-500 rounded-xl font-bold"
                                >
                                    {isSearching ? "Analyzing..." : "Check"}
                                </Button>
                            </div>

                            {/* Results */}
                            {result && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="space-y-6"
                                >
                                    {/* Comparison Cards */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="p-4 rounded-xl bg-ratel-green-900/50 border border-ratel-green-500/50">
                                            <span className="text-xs text-ratel-green-100 uppercase font-bold tracking-wider">Ratel Fair Price</span>
                                            <div className="text-3xl font-extrabold text-white mt-1 drop-shadow-sm">
                                                ₦{result.ratelPrice.toLocaleString()}
                                            </div>
                                            <div className="flex items-center gap-1 text-[11px] text-ratel-green-400 mt-2 font-bold">
                                                <ShieldAlert className="h-4 w-4" /> VDM Certified Fair
                                            </div>
                                        </div>
                                        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                                            <span className="text-xs text-gray-300 uppercase font-bold tracking-wider">Market Average</span>
                                            <div className="text-3xl font-bold text-gray-200 mt-1">
                                                ₦{result.marketPrice.toLocaleString()}
                                            </div>
                                            <div className="flex items-center gap-1 text-[11px] text-red-500 dark:text-red-400 mt-2 font-bold">
                                                <AlertCircle className="h-4 w-4" /> +15.5% Over Ratel
                                            </div>
                                        </div>
                                    </div>

                                    {/* History & Reason */}
                                    <div className="space-y-4">
                                        <div className="p-4 rounded-xl bg-blue-900/30 border border-blue-500/40">
                                            <div className="flex items-center gap-2 text-blue-300 mb-2">
                                                <Info className="h-5 w-5" />
                                                <span className="text-sm font-black uppercase tracking-widest">Pricing Intelligence Report</span>
                                            </div>
                                            <p className="text-sm text-blue-900 dark:text-blue-50 leading-relaxed font-semibold">
                                                "{result.justification}"
                                            </p>
                                        </div>

                                        <div className="p-4 rounded-xl bg-white/10 border border-white/20">
                                            <div className="flex items-center gap-2 text-ratel-orange mb-4">
                                                <History className="h-5 w-5" />
                                                <span className="text-sm font-bold uppercase">3-Month Price Index</span>
                                            </div>
                                            <div className="flex justify-between items-end h-24 gap-4 px-2">
                                                {result.history.map((h, i) => (
                                                    <div key={i} className="flex-1 flex flex-col items-center">
                                                        <div
                                                            className="w-full bg-ratel-orange/40 rounded-t-sm relative group"
                                                            style={{ height: `${(h.price / 450000) * 100}%` }}
                                                        >
                                                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                                                ₦{h.price.toLocaleString()}
                                                            </div>
                                                        </div>
                                                        <span className="text-[10px] text-gray-900 dark:text-gray-300 mt-2 font-black uppercase tracking-tighter">{h.month}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <Button className="w-full py-6 bg-white text-black hover:bg-gray-200 rounded-xl font-bold text-lg">
                                        Shop verified listings for "{query}"
                                    </Button>
                                </motion.div>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
