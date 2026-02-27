"use client";

import React from "react";
import { motion } from "framer-motion";
import { Sparkles, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface ZivaFairPriceButtonProps {
    query: string;
    className?: string;
    text?: string;
    subtitle?: string;
}

export function ZivaFairPriceButton({
    query,
    className,
    text = "See more results",
    subtitle = "View more Fair Prices via Ziva AI"
}: ZivaFairPriceButtonProps) {
    const router = useRouter();

    const handleClick = () => {
        router.push(`/search?q=${encodeURIComponent(query)}&mode=ai-fairprice`);
    };

    return (
        <motion.button
            whileHover={{ scale: 1.01, y: -1 }}
            whileTap={{ scale: 0.99 }}
            onClick={handleClick}
            className={cn(
                "relative group overflow-hidden rounded-2xl flex items-center justify-between px-6 py-4 w-full transition-all duration-500",
                "bg-white border border-emerald-100 shadow-sm",
                "hover:shadow-md hover:border-emerald-500/30",
                className
            )}
        >
            {/* Liquid Background Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-teal-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

            <div className="relative flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:rotate-12 transition-transform duration-500">
                    <Sparkles className="h-5 w-5 text-white animate-pulse" />
                </div>
                <div className="flex flex-col items-start text-left">
                    <span className="text-[15px] font-black text-gray-900 tracking-tight leading-tight">
                        {text} <span className="text-gray-400 font-medium ml-1">in catalogue</span>
                    </span>
                    <span className="text-[11px] text-emerald-600 font-bold uppercase tracking-wider mt-0.5">
                        {subtitle}
                    </span>
                    <span className="text-[9px] text-gray-400 font-black uppercase tracking-[0.2em] mt-1 opacity-60">
                        POWERED BY 2026 PRICE INTELLIG
                    </span>
                </div>
            </div>

            <div className="relative h-8 w-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-emerald-50 transition-colors">
                <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
            </div>
        </motion.button>
    );
}
