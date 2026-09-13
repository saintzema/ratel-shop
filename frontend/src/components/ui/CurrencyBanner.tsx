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
        const showTimer = setTimeout(() => setIsVisible(true), 2000);
        // Auto-dismiss — this was sitting on screen indefinitely, tall enough
        // on mobile (two lines of text) to cover the bottom nav bar until a
        // visitor noticed and closed it themselves.
        const hideTimer = setTimeout(() => setIsVisible(false), 10000);
        return () => { clearTimeout(showTimer); clearTimeout(hideTimer); };
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
                className="fixed left-0 right-0 z-[1000] px-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] md:bottom-6"
            >
                <div className="max-w-5xl mx-auto">
                    <div className="bg-black/95 backdrop-blur-2xl border border-emerald-500/30 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                            <div className="h-8 w-8 shrink-0 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/20">
                                <Globe className="h-4 w-4 text-emerald-400" />
                            </div>
                            <p className="text-[11px] md:text-[13px] font-bold text-white leading-tight truncate">
                                Shopping from outside Nigeria? <span className="text-gray-400 font-medium">{symbol}1 ≈ ₦{nairaPerUnit.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                            </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                            <div className="hidden sm:flex h-9 px-4 bg-emerald-500/10 text-emerald-400 rounded-xl text-[11px] font-black uppercase tracking-wider items-center gap-2 border border-emerald-500/20">
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
