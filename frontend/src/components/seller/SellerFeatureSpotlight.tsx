"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ArrowRight, X } from "lucide-react";
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
                className="relative overflow-hidden bg-gradient-to-br from-violet-600 via-indigo-600 to-indigo-700 rounded-3xl p-5 sm:p-6 text-white shadow-lg shadow-indigo-500/20 mb-6"
            >
                <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                <button
                    onClick={() => { markFeatureSeen(sellerId, feature.key); setDismissed(true); }}
                    className="absolute top-4 right-4 p-1 rounded-full hover:bg-white/10 transition-colors"
                    aria-label="Dismiss"
                >
                    <X className="h-4 w-4 text-white/70" />
                </button>
                <div className="relative flex items-start gap-3 pr-6">
                    <div className="p-2 bg-white/15 rounded-xl backdrop-blur-md shrink-0">
                        <Sparkles className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-widest text-indigo-200 mb-1">Have you tried this?</p>
                        <h3 className="font-bold text-white mb-1">{feature.label}</h3>
                        <p className="text-sm text-indigo-100 leading-snug mb-3">{feature.description}</p>
                        <Link
                            href={feature.href}
                            className="inline-flex items-center gap-1.5 text-sm font-bold bg-white text-indigo-700 rounded-full px-4 py-2 hover:bg-indigo-50 transition-colors"
                        >
                            Take a look <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
