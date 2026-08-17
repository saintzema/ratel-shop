"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Rocket, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PaystackCheckout } from "@/components/payment/PaystackCheckout";
import { BOOST_TIERS, BOOST_ADDONS, calculateBoostTotal } from "@/lib/boost-packages";
import { DataSyncService } from "@/lib/sync-store";
import { formatPrice, cn } from "@/lib/utils";

/**
 * Jiji-style boost picker: choose a package, optionally stack add-ons, pay,
 * and the listing's placement is applied server-side after Paystack verifies
 * the charge (see /api/seller/boost).
 */
export function BoostPackageModal({
    product,
    isOpen,
    onClose,
    onBoosted,
}: {
    product: any;
    isOpen: boolean;
    onClose: () => void;
    onBoosted?: () => void;
}) {
    const [selectedTier, setSelectedTier] = useState<string>("premium");
    const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
    const [paying, setPaying] = useState(false);
    const [activating, setActivating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen || !product) return null;

    const totalNaira = calculateBoostTotal(selectedTier, selectedAddOns);
    const user = DataSyncService.getCurrentUser();

    const toggleAddOn = (id: string) =>
        setSelectedAddOns(prev => (prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]));

    const handlePaid = async (reference: string) => {
        setPaying(false);
        setActivating(true);
        setError(null);
        try {
            const token = typeof window !== "undefined" ? localStorage.getItem("fp_token") : null;
            const res = await fetch("/api/seller/boost", {
                method: "POST",
                headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                body: JSON.stringify({
                    productId: product.id,
                    tierId: selectedTier,
                    addOnIds: selectedAddOns,
                    paystackReference: reference,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || "Boost could not be activated. Contact support with reference " + reference);
                return;
            }

            const sellerId = DataSyncService.getCurrentSellerId();
            if (sellerId) {
                DataSyncService.addNotification({
                    userId: sellerId,
                    type: "system",
                    title: "Boost activated 🚀",
                    message: data.message || `Your boost on "${product.name}" is live.`,
                    link: `/seller/products`,
                });
            }

            // The on-platform boost succeeded, but the Meta ad portion is
            // best-effort — if it didn't start, keep the seller on this screen and
            // say so plainly rather than closing on a green tick they didn't get.
            if (data.meta?.attempted && !data.meta.ok) {
                setError(data.message);
                onBoosted?.();
                return;
            }

            onBoosted?.();
            onClose();
        } catch {
            setError("Network error while activating the boost. Your payment went through — contact support if it doesn't appear shortly.");
        } finally {
            setActivating(false);
        }
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ y: 40, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 40, opacity: 0 }}
                    onClick={e => e.stopPropagation()}
                    className="bg-white w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl max-h-[92vh] overflow-y-auto"
                >
                    <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
                        <div>
                            <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
                                <Rocket className="h-5 w-5 text-brand-orange" /> Boost this listing
                            </h2>
                            <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[260px] sm:max-w-none">{product.name}</p>
                        </div>
                        <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100">
                            <X className="h-5 w-5 text-gray-400" />
                        </button>
                    </div>

                    <div className="p-6 space-y-6">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {BOOST_TIERS.map(tier => (
                                <button
                                    key={tier.id}
                                    onClick={() => setSelectedTier(tier.id)}
                                    className={cn(
                                        "text-left rounded-2xl border-2 p-4 transition-all",
                                        selectedTier === tier.id
                                            ? "border-brand-orange bg-amber-50/50 shadow-md"
                                            : "border-gray-200 hover:border-gray-300"
                                    )}
                                >
                                    <div className={cn("inline-block text-[9px] font-black uppercase tracking-widest text-white px-2 py-0.5 rounded-full bg-gradient-to-r mb-2", tier.accent)}>
                                        {tier.label}
                                    </div>
                                    <p className="text-lg font-black text-gray-900">{formatPrice(tier.priceNaira)}</p>
                                    <p className="text-[11px] font-bold text-gray-400">
                                        {tier.days} days · up to {tier.maxListings} listing{tier.maxListings === 1 ? "" : "s"}
                                    </p>
                                    <p className="text-[11px] text-gray-600 leading-snug mt-1.5">{tier.tagline}</p>
                                </button>
                            ))}
                        </div>

                        <div className="bg-gray-50 rounded-2xl p-4">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">What you get</p>
                            <ul className="space-y-2">
                                {(BOOST_TIERS.find(t => t.id === selectedTier)?.perks || []).map(perk => (
                                    <li key={perk} className="flex items-start gap-2 text-sm text-gray-700">
                                        <Check className="h-4 w-4 text-brand-green-600 shrink-0 mt-0.5" />
                                        {perk}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Add-ons (optional)</p>
                            <div className="space-y-2">
                                {BOOST_ADDONS.map(addon => (
                                    <button
                                        key={addon.id}
                                        onClick={() => toggleAddOn(addon.id)}
                                        className={cn(
                                            "w-full flex items-center gap-3 text-left rounded-xl border p-3 transition-all",
                                            selectedAddOns.includes(addon.id)
                                                ? "border-brand-green-600 bg-emerald-50/50"
                                                : "border-gray-200 hover:border-gray-300"
                                        )}
                                    >
                                        <div className={cn(
                                            "h-5 w-5 rounded-md border-2 flex items-center justify-center shrink-0",
                                            selectedAddOns.includes(addon.id) ? "bg-brand-green-600 border-brand-green-600" : "border-gray-300"
                                        )}>
                                            {selectedAddOns.includes(addon.id) && <Check className="h-3 w-3 text-white" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-gray-900">{addon.label}</p>
                                            <p className="text-[11px] text-gray-500 leading-snug">{addon.description}</p>
                                        </div>
                                        <span className="text-sm font-black text-gray-900 shrink-0">{formatPrice(addon.priceNaira)}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {error && (
                            <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">
                                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                                <span>{error}</span>
                            </div>
                        )}
                    </div>

                    <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex items-center justify-between gap-4">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Total</p>
                            <p className="text-2xl font-black text-gray-900">{formatPrice(totalNaira)}</p>
                        </div>
                        {paying ? (
                            <PaystackCheckout
                                amount={totalNaira * 100}
                                email={user?.email || ""}
                                autoStart
                                metadata={{ purpose: "listing_boost", productId: product.id, tierId: selectedTier }}
                                onSuccess={handlePaid}
                                onClose={() => setPaying(false)}
                            />
                        ) : (
                            <Button
                                onClick={() => { setError(null); setPaying(true); }}
                                disabled={activating || !user?.email}
                                className="bg-gradient-to-b from-[#fbbf24] to-brand-orange text-black font-black rounded-full px-8 h-12"
                            >
                                {activating ? (<><Loader2 className="h-4 w-4 animate-spin mr-2" /> Activating...</>) : "Boost now"}
                            </Button>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
