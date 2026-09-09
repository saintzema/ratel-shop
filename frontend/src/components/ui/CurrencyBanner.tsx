"use client";

import React, { useEffect, useState } from 'react';
import { Globe, X, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCurrency } from '@/context/CurrencyContext';
import { CURRENCY_SYMBOLS } from '@/lib/currency';

/**
 * Was reading a `fp_location` cookie that nothing in this codebase ever sets
 * (no middleware writes it) — this banner has never shown for a single
 * visitor. Its exchange rate was also hardcoded and went stale the moment it
 * was written. Now driven by CurrencyContext: real IP-based country
 * detection (/api/geo) and a real, live NGN-base rate table
 * (/api/exchange-rate) — the same source every converted product price on
 * the site uses.
 */
export function CurrencyBanner() {
    const { currencyCode, ready, nairaPerUnit } = useCurrency();
    const [isVisible, setIsVisible] = useState(false);
    const [dismissedThisSession] = useState(() =>
        typeof window !== "undefined" && !!sessionStorage.getItem('fp_currency_banner_dismissed')
    );

    useEffect(() => {
        if (!ready || !currencyCode || !nairaPerUnit || dismissedThisSession) return;
        const t = setTimeout(() => setIsVisible(true), 2000);
        return () => clearTimeout(t);
    }, [ready, currencyCode, nairaPerUnit, dismissedThisSession]);

    const handleDismiss = () => {
        setIsVisible(false);
        sessionStorage.setItem('fp_currency_banner_dismissed', 'true');
    };

    if (!isVisible || !currencyCode || !nairaPerUnit) return null;

    const symbol = CURRENCY_SYMBOLS[currencyCode] || currencyCode + " ";

    return (
    <AnimatePresence>
        {isVisible && (
            <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                className="fixed bottom-6 left-0 right-0 z-[1000] px-4"
            >
                <div className="max-w-5xl mx-auto">
                    <div className="bg-black/95 backdrop-blur-2xl border border-emerald-500/30 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-3 flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/20">
                                <Globe className="h-4 w-4 text-emerald-400" />
                            </div>
                            <div>
                                <p className="text-[13px] md:text-sm font-bold text-white leading-tight">
                                    Shopping from outside Nigeria?
                                </p>
                                <p className="text-[11px] text-gray-400 font-medium">
                                    Prices are charged in ₦aira. We've added a {currencyCode} estimate next to each one — approximately <span className="text-white font-bold">{symbol}1.00 ≈ ₦{nairaPerUnit.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 w-full md:w-auto">
                            <div className="flex-1 md:flex-none h-9 px-4 bg-emerald-500/10 text-emerald-400 rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center gap-2 border border-emerald-500/20">
                                <Zap className="h-3 w-3" />
                                Live Rate
                            </div>
                            <button
                                onClick={handleDismiss}
                                className="p-2 rounded-xl bg-white/5 text-gray-400 hover:text-white transition-colors"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>
        )}
    </AnimatePresence>
);
}
