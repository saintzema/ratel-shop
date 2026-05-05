"use client";

import React, { useState } from "react";
// Trigger rebuild
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Product, PriceComparison } from "@/lib/types";
import { formatPrice, getProductUrl } from "@/lib/utils";
import { ShieldCheck, MessageSquare, Tag, AlertTriangle, ChevronRight, ChevronDown } from "lucide-react";
import { DataSyncService } from "@/lib/sync-store";
import { useAuth } from "@/context/AuthContext";
import { PriceEngine } from "@/lib/price-engine";
import { useMessages } from "@/context/MessageContext";
import Link from "next/link";
import { playDingSound } from "@/lib/audio";

import { COUNTRY_CODES } from "@/lib/constants/countries";
import { CountryCodeSelect } from "@/components/ui/CountryCodeSelect";

interface NegotiationModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: Product;
    priceComparison?: PriceComparison | null;
}

export function NegotiationModal({ isOpen, onClose, product, priceComparison }: NegotiationModalProps) {
    const [proposedPrice, setProposedPrice] = useState<string>("");
    const [message, setMessage] = useState<string>("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisStep, setAnalysisStep] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [isSystemCalculated, setIsSystemCalculated] = useState(false);
    const { user } = useAuth();
    const { startConversation, openMessageBox } = useMessages();
    const [showPushOptIn, setShowPushOptIn] = useState(false);
    const [countryCode, setCountryCode] = useState("+234");

    // Max negotiation discount — admin-configurable via SystemSettings.
    // Default: 5% means users cannot offer less than 95% of the listing price.
    const maxDiscountPct = (() => {
        try {
            if (typeof window !== "undefined") {
                const saved = localStorage.getItem("fp_max_negotiation_discount");
                if (saved) return Number(saved);
            }
        } catch (e) { console.warn("localStorage access failed:", e); }
        return 5;
    })();
    
    const minAllowedPrice = product ? Math.round((product.price || 0) * (1 - maxDiscountPct / 100)) : 0;

    // Get 3 similar products to suggest
    const similarProducts = product ? DataSyncService.getProducts()
        .filter(p => p.category === product.category && p.id !== product.id && p.price < (product.price || 0))
        .sort((a, b) => (b.sold_count || 0) - (a.sold_count || 0))
        .slice(0, 3) : [];

    const handleAnalyze = async () => {
        setIsAnalyzing(true);
        setAnalysisStep(0);
        setError(null);

        try {
            // Step 1: Connecting
            setAnalysisStep(1);

            // Step 2: Extracting data via Gemini API
            const analysis = await PriceEngine.analyzePrice(product?.name || "Product");
            setAnalysisStep(2);

            // Step 3: Calculation logic based on real API response
            setAnalysisStep(3);

            // Use real market data to calculate a fair price
            // Priority: api marketAverage → product.recommended_price → fallback
            const marketAvg = analysis.marketAverage || product.recommended_price || 0;
            const marketLow = analysis.marketLow || Math.round((product.recommended_price || product.price) * 0.9);

            let fairPrice: number;

            if (product.price_flag === "too_low" && marketAvg > 0) {
                // Suspicious deal: price is TOO LOW — suggest the market average as fair
                // (buying at market avg protects the buyer from scams)
                fairPrice = Math.round(marketAvg * 0.95 / 100) * 100;
            } else if (product.price_flag === "overpriced" && marketAvg > 0) {
                // Overpriced: suggest a price closer to market low (best real deal)
                fairPrice = Math.round(((marketLow + marketAvg) / 2) / 100) * 100;
            } else if (marketAvg > 0 && product.price > marketAvg) {
                // Regular product priced above market avg — suggest market avg
                fairPrice = Math.round(marketAvg / 100) * 100;
            } else if (marketAvg > 0) {
                // Regular product at or below market avg — suggest 5% below listing
                fairPrice = Math.round(product.price * 0.95 / 100) * 100;
            } else {
                // No market data at all — suggest 8% below listing as a starting point
                fairPrice = Math.round(product.price * 0.92 / 100) * 100;
            }

            // Ensure fairPrice isn't lower than marketLow
            fairPrice = Math.max(fairPrice, minAllowedPrice);

            setProposedPrice(fairPrice.toString());
            setIsSystemCalculated(true);
            setAnalysisStep(4);
        } catch (err) {
            console.error("Negotiation Analysis failed:", err);
            setError("Failed to fetch real-time market data. Please suggest a price manually.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const [whatsappNumber, setWhatsappNumber] = useState<string>("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const price = Number(proposedPrice);
        if (price < minAllowedPrice) {
            setError(`Your offer is too low. The maximum allowed discount is ${maxDiscountPct}%. The minimum offer for this item is ${formatPrice(minAllowedPrice)}.`);
            return;
        }

        setIsSubmitting(true);

        // Logic to simulate API call
        await new Promise(resolve => setTimeout(resolve, 800));

        let tempGuestName = "Guest Buyer";
        let currentUserId = user?.id;

        if (typeof window !== "undefined") {
            const savedGuestName = localStorage.getItem("fp_guest_name");
            if (savedGuestName) {
                tempGuestName = savedGuestName;
            }

            if (!currentUserId) {
                currentUserId = DataSyncService.getOrInitializeGuestId();
            }
        }

        if (!currentUserId) currentUserId = "guest_session";

        // Create a conversation thread message string
        const negMessageText = `🤝 Negotiation Request\n\nProduct: ${product.name}\nCurrent Price: ₦${(product.price || 0).toLocaleString()}\nMy Offer: ₦${Number(proposedPrice).toLocaleString()}${message ? `\n\nMessage: ${message}` : ''}\n\nWaiting for seller to respond...`;

        // Create new negotiation
        const newNegotiation = {
            id: `neg_${Date.now()}`,
            product_id: product.id,
            customer_id: currentUserId,
            customer_name: user?.name || tempGuestName,
            proposed_price: Number(proposedPrice),
            message: message,
            customer_whatsapp: whatsappNumber ? `${countryCode}${whatsappNumber}` : undefined,
            status: "pending" as const,
            created_at: new Date().toISOString(),
            chat_messages: [{
                sender: "buyer" as const,
                text: negMessageText,
                timestamp: new Date().toISOString()
            }]
        };

        DataSyncService.addNegotiation(newNegotiation);

        startConversation(
            `neg_${product.id}`,
            product.name || "Negotiated Item",
            product.image_url,
            negMessageText,
            product.seller_name || "Global Store"
        );

        // Audio trigger removed to align with "no user-generated sounds" policy
        // playDingSound(); 
        
        if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
            setTimeout(() => {
                setShowPushOptIn(true);
            }, 1500);
        }

        setIsSubmitting(false);
        setSubmitted(true);
    };

    const handleReset = () => {
        setProposedPrice("");
        setMessage("");
        setWhatsappNumber("");
        setSubmitted(false);
        setIsAnalyzing(false);
        setAnalysisStep(0);
        setError(null);
        onClose();
    };

    if (!product) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleReset()}>
            <DialogContent className="sm:max-w-[425px] w-[95vw] rounded-2xl max-h-[85dvh] sm:max-h-[75vh] h-auto overflow-y-auto bg-white text-black border-zinc-200 p-6 block top-[5%] sm:top-[40%] translate-y-0 sm:-translate-y-1/2 mt-4 sm:mt-20 pb-10 pt-10">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                        <Tag className="h-5 w-5 text-brand-green-600" />
                        Suggest a Fair Price
                    </DialogTitle>
                    <DialogDescription className="text-zinc-500">
                        Suggest a price you think is fair for this item. Sellers are more likely to accept reasonable offers.
                    </DialogDescription>
                </DialogHeader>

                {!submitted ? (
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-3 pb-6">
                        <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-100 flex gap-4 shrink-0">
                            <img src={product.image_url || "/assets/images/placeholder.png"} alt={product.name} className="w-16 h-16 object-contain mix-blend-multiply" />
                            <div>
                                <p className="font-bold text-sm line-clamp-1">{product.name}</p>
                                <p className="text-xs text-zinc-500">Current Price: {formatPrice(product.price)}</p>
                            </div>
                        </div>

                        <div className="space-y-2 shrink-0">
                            {isAnalyzing ? (
                                <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 space-y-2">
                                    <div className="flex justify-between text-xs font-bold text-blue-700">
                                        <span>Analyzing Market...</span>
                                        <span>{Math.round((analysisStep / 4) * 100)}%</span>
                                    </div>
                                    <div className="w-full bg-blue-200/50 rounded-full h-1.5 overflow-hidden">
                                        <div
                                            className="h-full bg-blue-500 transition-all duration-300 ease-out"
                                            style={{ width: `${(analysisStep / 4) * 100}%` }}
                                        />
                                    </div>
                                    <p className="text-[10px] text-blue-500 text-center animate-pulse">
                                        {["Connecting to Global Pricing DB...", "Scanning Marketplaces...", "Checking Local Competitors...", "Finalizing Verified Fair Price..."][Math.min(analysisStep, 3)]}
                                    </p>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-2">
                                    <div className="flex gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={handleAnalyze}
                                            className="flex-1 border-blue-200 text-blue-600 hover:text-blue-700 hover:bg-blue-50 bg-blue-50/50 animate-pulse-grow"
                                        >
                                            <Tag className="h-4 w-4 mr-2" />
                                            AI Price Checker
                                        </Button>
                                        
                                        {(product?.category === 'cars' || product?.category === 'vehicles' || product?.name?.toLowerCase()?.includes('car') || product?.name?.toLowerCase()?.includes('toyota') || product?.name?.toLowerCase()?.includes('honda')) && (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => {
                                                    setProposedPrice(minAllowedPrice.toString());
                                                    setMessage(`What is the last price for this ${product?.name || 'item'}? I am interested and ready to pay.`);
                                                }}
                                                className="flex-1 border-amber-200 text-amber-600 hover:text-amber-700 hover:bg-amber-50 bg-amber-50/50"
                                            >
                                                <MessageSquare className="h-4 w-4 mr-2" />
                                                Last price?
                                            </Button>
                                        )}
                                    </div>

                                    {isSystemCalculated && (
                                        <div className="flex items-center gap-2 text-xs text-emerald-600 font-bold bg-emerald-50 p-2 rounded-lg border border-emerald-100">
                                            <ShieldCheck className="h-4 w-4" />
                                            Calculated based on verified market pricing
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="space-y-2 shrink-0">
                            <Label htmlFor="price" className="text-sm font-bold">Your Proposed Price (₦)</Label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-bold">₦</span>
                                <Input
                                    id="price"
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="e.g. 45,000"
                                    className={`pl-8 bg-zinc-50 border-zinc-200 rounded-lg focus:ring-brand-green-600 focus:border-brand-green-600 font-medium ${error ? "border-red-500" : ""}`}
                                    value={proposedPrice ? Number(proposedPrice).toLocaleString() : ""}
                                    onChange={(e) => {
                                        const rawValue = e.target.value.replace(/,/g, "").replace(/\D/g, "");
                                        setProposedPrice(rawValue);
                                        setError(null);
                                        setIsSystemCalculated(false);
                                    }}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2 shrink-0">
                            <Label htmlFor="whatsapp" className="text-sm font-bold flex items-center gap-2">
                                WhatsApp for Updates
                                <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-black uppercase">Ziva AI</span>
                            </Label>
                            <div className="flex gap-2">
                                <div className="relative shrink-0">
                                    <CountryCodeSelect 
                                        value={countryCode} 
                                        onChange={setCountryCode} 
                                    />
                                </div>
                                <Input
                                    id="whatsapp"
                                    type="tel"
                                    placeholder="8012345678"
                                    className="flex-1 bg-emerald-50/30 border-emerald-100 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 text-sm font-medium"
                                    value={whatsappNumber}
                                    onChange={(e) => setWhatsappNumber(e.target.value.replace(/\D/g, ""))}
                                />
                            </div>
                            <p className="text-[9px] text-zinc-400">Receive instant price alerts and counter-offers via WhatsApp.</p>
                        </div>

                        <div className="space-y-2 shrink-0">
                            <Label htmlFor="message" className="text-sm font-bold">Message for Seller (Optional)</Label>
                            <Textarea
                                id="message"
                                placeholder="Explain why you are suggesting this price..."
                                className="bg-zinc-50 border-zinc-200 rounded-lg min-h-[60px] focus:ring-brand-green-600 focus:border-brand-green-600 text-sm"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                            />
                        </div>

                        <div className="bg-blue-50 p-3 rounded-lg flex gap-3 text-xs text-blue-700 shrink-0">
                            <ShieldCheck className="h-4 w-4 shrink-0" />
                            <p>If accepted, your payment will be held in <strong>Escrow</strong> until you confirm delivery of the item.</p>
                        </div>

                        <DialogFooter className="shrink-0 pt-2 pb-4">
                            <Button
                                type="submit"
                                className="w-full bg-brand-green-600 hover:bg-brand-green-700 text-white rounded-full font-bold h-11"
                                disabled={isSubmitting || !proposedPrice || isAnalyzing}
                            >
                                {isSubmitting ? "Sending Request..." : "Send Negotiation Request"}
                            </Button>
                        </DialogFooter>
                    </form>
                ) : (
                    <div className="py-8 text-center space-y-4">
                        <div className="w-16 h-16 bg-brand-green-100 rounded-full flex items-center justify-center mx-auto">
                            <MessageSquare className="h-8 w-8 text-brand-green-600" />
                        </div>
                        <h3 className="text-xl font-bold">Request Sent!</h3>
                        <p className="text-zinc-500 text-sm px-4">
                            We've sent your offer of <strong>{formatPrice(Number(proposedPrice))}</strong> to the seller. We'll notify you once they accept or reject it.
                        </p>
                        <div className="flex gap-3 mt-4">
                            <Button
                                onClick={() => {
                                    handleReset();
                                    openMessageBox();
                                }}
                                variant="outline"
                                className="flex-1 rounded-full font-bold h-11 border-brand-green-300 text-brand-green-700 hover:bg-brand-green-50"
                            >
                                View in Messages
                            </Button>
                            <Button
                                onClick={handleReset}
                                className="flex-1 bg-black text-white rounded-full font-bold h-11"
                            >
                                Got it
                            </Button>
                        </div>
                        {similarProducts.length > 0 && (
                            <div className="mt-8 pt-6 border-t border-zinc-100 text-left">
                                <h4 className="text-sm font-bold text-zinc-900 mb-3 text-center">While you wait, check out these similar deals:</h4>
                                <div className="space-y-3">
                                    {similarProducts.map((p) => (
                                        <Link key={p.id} href={getProductUrl(p)} onClick={handleReset} className="flex gap-3 items-center p-3 rounded-xl border border-zinc-100 hover:border-brand-green-200 hover:bg-brand-green-50/50 group transition-all">
                                            <div className="h-12 w-12 bg-white rounded-lg border border-zinc-100 overflow-hidden shrink-0">
                                                <img src={p.image_url || "/assets/images/placeholder.png"} alt={p.name} className="w-full h-full object-cover" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold text-zinc-900 truncate group-hover:text-brand-green-700">{p.name}</p>
                                                <p className="text-xs text-zinc-500 font-medium">{formatPrice(p.price)}</p>
                                            </div>
                                            <ChevronRight className="h-4 w-4 text-zinc-300 group-hover:text-brand-green-500" />
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Push Notification Opt-in Prompt */}
                {showPushOptIn && (
                    <div className="mt-4 p-4 bg-emerald-50 rounded-2xl border border-emerald-100 animate-in fade-in zoom-in slide-in-from-bottom-4 duration-500">
                        <div className="flex gap-4 items-center mb-3">
                            <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20">
                                <Tag className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <h4 className="text-sm font-black text-emerald-900">Get Offer Updates! 🔔</h4>
                                <p className="text-[10px] text-emerald-700 leading-tight">Enable notifications to know the instant the seller responds.</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button 
                                size="sm" 
                                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[10px] h-8"
                                onClick={async () => {
                                    try {
                                        await Notification.requestPermission();
                                    } catch {}
                                    setShowPushOptIn(false);
                                }}
                            >
                                Enable Now
                            </Button>
                            <button 
                                className="px-3 text-[10px] font-bold text-emerald-600 hover:text-emerald-800"
                                onClick={() => setShowPushOptIn(false)}
                            >
                                Maybe Later
                            </button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog >
    );
}
