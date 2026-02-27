"use client";

import React, { useState } from "react";
// Trigger rebuild
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Product, PriceComparison } from "@/lib/types";
import { formatPrice } from "@/lib/utils";
import { ShieldCheck, MessageSquare, Tag, AlertTriangle } from "lucide-react";
import { DemoStore } from "@/lib/demo-store";
import { useAuth } from "@/context/AuthContext";
import { PriceEngine } from "@/lib/price-engine";

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

    // Calculate minimum allowed price (market low)
    const minAllowedPrice = priceComparison?.market_low || Math.round(product.price * 0.5); // Fallback to 50% if no data

    const handleAnalyze = async () => {
        setIsAnalyzing(true);
        setAnalysisStep(0);
        setError(null);

        try {
            // Step 1: Connecting
            setAnalysisStep(1);

            // Step 2: Extracting data via Gemini API
            const analysis = await PriceEngine.analyzePrice(product.name);
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const price = Number(proposedPrice);
        if (price < minAllowedPrice) {
            setError(`Your offer is too low. The lowest recorded market price for this item is ${formatPrice(minAllowedPrice)}. Please suggest a fair value within market range.`);
            return;
        }

        setIsSubmitting(true);

        // Logic to simulate API call
        await new Promise(resolve => setTimeout(resolve, 800));

        // Create new negotiation
        const newNegotiation = {
            id: `neg_${Date.now()}`,
            product_id: product.id,
            customer_id: user?.id || "guest",
            customer_name: user?.name || "Guest Buyer",
            proposed_price: Number(proposedPrice),
            message: message,
            status: "pending" as const,
            created_at: new Date().toISOString()
        };

        DemoStore.addNegotiation(newNegotiation);

        setIsSubmitting(false);
        setSubmitted(true);
    };

    const handleReset = () => {
        setProposedPrice("");
        setMessage("");
        setSubmitted(false);
        setIsAnalyzing(false);
        setAnalysisStep(0);
        setError(null);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleReset()}>
            <DialogContent className="sm:max-w-[425px] bg-white text-black border-zinc-200">
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
                    <form onSubmit={handleSubmit} className="space-y-6 py-4">
                        <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-100 flex gap-4">
                            <img src={product.image_url} alt={product.name} className="w-16 h-16 object-contain mix-blend-multiply" />
                            <div>
                                <p className="font-bold text-sm line-clamp-1">{product.name}</p>
                                <p className="text-xs text-zinc-500">Current Price: {formatPrice(product.price)}</p>
                            </div>
                        </div>

                        {/* Market Analysis Button */}
                        {/* Market Analysis Button */}
                        <div className="space-y-2">
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
                                <div className="space-y-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={handleAnalyze}
                                        className="w-full border-blue-200 text-blue-600 hover:text-blue-700 hover:bg-blue-50 bg-blue-50/50"
                                    >
                                        <Tag className="h-4 w-4 mr-2" />
                                        {proposedPrice ? "Recalculate Fair Price" : "Auto-Calculate Fair Price"}
                                    </Button>

                                    {isSystemCalculated && (
                                        <div className="flex items-center gap-2 text-xs text-emerald-600 font-bold bg-emerald-50 p-2 rounded-lg border border-emerald-100">
                                            <ShieldCheck className="h-4 w-4" />
                                            Calculated based on verified market pricing
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="price" className="text-sm font-bold">Your Proposed Price (₦)</Label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-bold">₦</span>
                                <Input
                                    id="price"
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="e.g. 45,000"
                                    className={`pl-8 bg-zinc-50 border-zinc-200 rounded-lg focus:ring-brand-green-600 focus:border-brand-green-600 font-medium ${error ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}`}
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
                            {error && (
                                <div className="flex items-start gap-1 text-xs text-red-600 mt-1 animate-in fade-in slide-in-from-top-1">
                                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}
                            <p className="text-[10px] text-zinc-400">
                                Market Low: {formatPrice(minAllowedPrice)}
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="message" className="text-sm font-bold">Message for Seller (Optional)</Label>
                            <Textarea
                                id="message"
                                placeholder="Explain why you are suggesting this price..."
                                className="bg-zinc-50 border-zinc-200 rounded-lg min-h-[100px] focus:ring-brand-green-600 focus:border-brand-green-600"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                            />
                        </div>

                        <div className="bg-blue-50 p-3 rounded-lg flex gap-3 text-xs text-blue-700">
                            <ShieldCheck className="h-4 w-4 shrink-0" />
                            <p>If accepted, your payment will be held in <strong>Escrow</strong> until you confirm delivery of the item.</p>
                        </div>

                        <DialogFooter>
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
                        <Button
                            onClick={handleReset}
                            className="w-full bg-black text-white rounded-full font-bold h-11 mt-4"
                        >
                            Got it
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
