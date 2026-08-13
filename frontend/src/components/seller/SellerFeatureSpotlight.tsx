"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ChevronRight, X } from "lucide-react";
import { getNextUnseenFeature, markFeatureSeen, FeatureTourItem } from "@/lib/seller-feature-tour";

// A single, rotating "have you tried..." nudge on the seller dashboard —
// points at one real feature at a time (never more, to avoid nagging) that
// this seller hasn't opened yet. Dismissing marks it seen without requiring
// them to actually visit it, so it never nags about the same thing twice.
export function SellerFeatureSpotlight({ sellerId }: { sellerId: string | undefined }) {
    const [feature, setFeature] = useState<FeatureTourItem | null>(null);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        if (!sellerId) return;
        setFeature(getNextUnseenFeature(sellerId));
    }, [sellerId]);

    if (!feature || dismissed || !sellerId) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                className="relative"
            >
                <Link
                    href={feature.href}
                    onClick={() => markFeatureSeen(sellerId, feature.key)}
                    className="flex items-center justify-between gap-3 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-3xl p-4 shadow-sm hover:brightness-105 transition-all pr-11"
                >
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
                            <Sparkles className="h-5 w-5 text-white" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-black text-white truncate">{feature.label}</p>
                            <p className="text-xs font-semibold text-indigo-100 mt-0.5 truncate">{feature.description}</p>
                        </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-indigo-200 shrink-0" />
                </Link>
                <button
                    onClick={() => { markFeatureSeen(sellerId, feature.key); setDismissed(true); }}
                    className="absolute top-1/2 -translate-y-1/2 right-4 p-1 rounded-full hover:bg-white/10 transition-colors"
                    aria-label="Dismiss"
                >
                    <X className="h-4 w-4 text-white/70" />
                </button>
            </motion.div>
        </AnimatePresence>
    );
}
