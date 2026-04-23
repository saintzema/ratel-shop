"use client";

import React, { useEffect, useState } from 'react';
import { Globe, X, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Currency Conversion Estimates (Approximate for Trust Signaling)
 * These values can be updated by an admin API.
 */
const CONVERSION_RATES: Record<string, { rate: number, symbol: string, label: string }> = {
    'US': { rate: 1550, symbol: '$', label: 'USD' },
    'GB': { rate: 1950, symbol: '£', label: 'GBP' },
    'CA': { rate: 1140, symbol: 'CA$', label: 'CAD' },
    'EU': { rate: 1680, symbol: '€', label: 'EUR' },
    'DE': { rate: 1680, symbol: '€', label: 'EUR' },
    'FR': { rate: 1680, symbol: '€', label: 'EUR' },
    'AE': { rate: 422, symbol: 'AED', label: 'AED' },
};

export function CurrencyBanner() {
    const [location, setLocation] = useState<{ city: string; country: string } | null>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        // 1. Check if user dismissed it this session
        const isDismissed = sessionStorage.getItem('fp_currency_banner_dismissed');
        if (isDismissed) return;

        // 2. Parse location from cookie set by Middleware
        const cookies = document.cookie.split('; ');
        const locCookie = cookies.find(c => c.startsWith('fp_location='));
        
        if (locCookie) {
            try {
                const data = JSON.parse(decodeURIComponent(locCookie.split('=')[1]));
                // Only show for non-Nigerian IPs or specific test overrides
                if (data.country && data.country !== 'NG') {
                    setLocation(data);
                    // Show after a short delay for premium feel
                    setTimeout(() => setIsVisible(true), 2000);
                }
            } catch (e) {
                console.error("Failed to parse location cookie", e);
            }
        }
    }, []);

    const handleDismiss = () => {
        setIsVisible(false);
        sessionStorage.setItem('fp_currency_banner_dismissed', 'true');
    };

    if (!location || !isVisible) return null;

    const currencyInfo = CONVERSION_RATES[location.country] || CONVERSION_RATES['US'];
    const cityName = location.city || "your location";

    return (
    <AnimatePresence>
        {isVisible && (
            <motion.div
                initial={{ y: -100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -100, opacity: 0 }}
                // Added mt-20 (80px) to clear the Navbar. Adjust based on your header height.
                className="fixed top-0 left-0 right-0 z-[1000] px-4 py-2 mt-20"
            >
                <div className="max-w-5xl mx-auto">
                    {/* Added a stronger shadow and slight border glow for visibility */}
                    <div className="bg-black/95 backdrop-blur-2xl border border-emerald-500/30 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-3 flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/20">
                                <Globe className="h-4 w-4 text-emerald-400" />
                            </div>
                            <div>
                                <p className="text-[13px] md:text-sm font-bold text-white leading-tight">
                                    Visiting from <span className="text-emerald-400">{cityName}</span>?
                                </p>
                                <p className="text-[11px] text-gray-400 font-medium">
                                    Buying for family in Nigeria? Prices are shown in ₦aira. Approximately <span className="text-white font-bold">{currencyInfo.symbol}1.00 ≈ ₦{currencyInfo.rate.toLocaleString()}</span>.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 w-full md:w-auto">
                            <div className="flex-1 md:flex-none h-9 px-4 bg-emerald-500/10 text-emerald-400 rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center gap-2 border border-emerald-500/20">
                                <Zap className="h-3 w-3" />
                                Diaspora Verified
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