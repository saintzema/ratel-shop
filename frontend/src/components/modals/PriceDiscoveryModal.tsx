"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, Sparkles, Globe, History, ChevronRight, Package, Loader2, TrendingUp, AlertTriangle, Check } from "lucide-react";
import { PriceEngine, ProductSuggestion } from "@/lib/price-engine";
import { formatPrice, getProxiedImageUrl } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface PriceDiscoveryModalProps {
    isOpen: boolean;
    onClose: () => void;
    productName: string;
    onSelect: (suggestion: ProductSuggestion) => void;
}

export function PriceDiscoveryModal({ isOpen, onClose, productName, onSelect }: PriceDiscoveryModalProps) {
    const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState(productName);
    const [error, setError] = useState<string | null>(null);

    const performSearch = async (query: string) => {
        if (!query.trim()) return;
        setIsLoading(true);
        setError(null);
        try {
            const results = await PriceEngine.searchProducts(query);
            setSuggestions(results);
        } catch (err) {
            setError("Failed to fetch market data. Please try again.");
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen && productName) {
            setSearchQuery(productName);
            performSearch(productName);
        }
    }, [isOpen, productName]);

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden bg-white/95 backdrop-blur-2xl border-none shadow-2xl rounded-[32px]">
                {/* Header — Liquid Glass Style */}
                <div className="bg-gradient-to-r from-emerald-600 to-emerald-800 p-6 text-white relative overflow-hidden">
                    <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)", backgroundSize: "24px 24px" }} />
                    <div className="relative z-10 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/30">
                                <Sparkles className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-black tracking-tight text-white">Market Intel</DialogTitle>
                                <p className="text-xs text-emerald-100/80 font-medium">Real-time platform pricing benchmark</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/80 hover:text-white">
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Search Bar in Header */}
                    <div className="mt-6 relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-200" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && performSearch(searchQuery)}
                            placeholder="Fine-tune search query..."
                            className="w-full bg-white/10 border border-white/20 rounded-2xl py-3.5 pl-11 pr-4 text-sm font-semibold placeholder:text-emerald-100/50 text-white focus:outline-none focus:ring-2 focus:ring-white/30 transition-all backdrop-blur-sm"
                        />
                    </div>
                </div>

                <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar bg-gray-50/50">
                    {isLoading ? (
                        <div className="py-20 flex flex-col items-center justify-center gap-4">
                            <div className="relative h-12 w-12">
                                <div className="absolute inset-0 border-4 border-emerald-100 rounded-full" />
                                <div className="absolute inset-0 border-4 border-transparent border-t-emerald-600 rounded-full animate-spin" />
                            </div>
                            <div className="text-center">
                                <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest">Scanning Global Markets</h4>
                                <p className="text-[10px] text-gray-400 font-bold mt-1 animate-pulse">Benchmarking against verified retail nodes...</p>
                            </div>
                        </div>
                    ) : suggestions.length > 0 ? (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between mb-4 px-1">
                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                                    <TrendingUp className="h-3.5 w-3.5" /> Best Matches Found
                                </span>
                                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                                    {suggestions.length} Results
                                </span>
                            </div>
                            {suggestions.map((suggestion, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => onSelect(suggestion)}
                                    className="w-full flex items-center gap-4 p-4 bg-white hover:bg-emerald-50 rounded-[24px] border border-gray-100 hover:border-emerald-200 transition-all group text-left shadow-sm hover:shadow-md"
                                >
                                    <div className="h-16 w-16 bg-gray-50 rounded-2xl overflow-hidden p-1.5 border border-gray-100 group-hover:scale-105 transition-transform shrink-0">
                                        <img
                                            src={getProxiedImageUrl(suggestion.image_url)}
                                            alt={suggestion.name}
                                            className="w-full h-full object-contain mix-blend-multiply"
                                            onError={(e) => { e.currentTarget.src = "/assets/images/placeholder.png"; }}
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-gray-900 text-sm line-clamp-1 group-hover:text-emerald-700 transition-colors">{suggestion.name}</h4>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-lg font-black text-emerald-600">{formatPrice(suggestion.approxPrice)}</span>
                                            <span className="text-[10px] font-bold text-gray-400 uppercase bg-gray-100 px-2 py-0.5 rounded-lg">{suggestion.category}</span>
                                        </div>
                                        {suggestion.specs && (
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                {Object.entries(suggestion.specs).slice(0, 3).map(([k, v]) => (
                                                    <span key={k} className="text-[9px] font-semibold text-gray-500 bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100">
                                                        {v}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                                        <Check className="h-5 w-5 text-emerald-600" />
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : !error ? (
                        <div className="py-16 text-center">
                            <div className="h-16 w-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Package className="h-8 w-8 text-gray-200" />
                            </div>
                            <h4 className="text-sm font-bold text-gray-900">No Market Data Found</h4>
                            <p className="text-xs text-gray-400 mt-1">Try refining the product name for better accuracy.</p>
                            <button 
                                onClick={() => performSearch(searchQuery)}
                                className="mt-4 px-6 py-2 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-700 transition-colors"
                            >
                                Retry Search
                            </button>
                        </div>
                    ) : (
                        <div className="py-16 text-center">
                            <div className="h-16 w-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-100">
                                <AlertTriangle className="h-8 w-8 text-rose-500" />
                            </div>
                            <h4 className="text-sm font-bold text-gray-900">Search Failed</h4>
                            <p className="text-xs text-gray-400 mt-1">{error}</p>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-emerald-50/50 border-t border-emerald-100/50 flex items-center justify-center gap-2">
                    <Globe className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="text-[10px] font-bold text-emerald-700/70 uppercase tracking-widest">Pricing engine synchronized with verified Nigerian retail nodes</span>
                </div>
            </DialogContent>
        </Dialog>
    );
}
