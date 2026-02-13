"use client";

import React, { useState } from "react";
// Trigger rebuild
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Product } from "@/lib/types";
import { formatPrice } from "@/lib/utils";
import { ShieldCheck, MessageSquare, Tag } from "lucide-react";
import { DemoStore } from "@/lib/demo-store";

interface NegotiationModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: Product;
}

export function NegotiationModal({ isOpen, onClose, product }: NegotiationModalProps) {
    const [proposedPrice, setProposedPrice] = useState<string>("");
    const [message, setMessage] = useState<string>("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        // Logic to simulate API call
        await new Promise(resolve => setTimeout(resolve, 800));

        // Create new negotiation
        const newNegotiation = {
            id: `neg_${Date.now()}`,
            product_id: product.id,
            customer_id: "u1", // Hardcoded demo user
            customer_name: "Demo Buyer",
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
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px] bg-white text-black border-zinc-200">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                        <Tag className="h-5 w-5 text-ratel-green-600" />
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

                        <div className="space-y-2">
                            <Label htmlFor="price" className="text-sm font-bold">Your Proposed Price (₦)</Label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-bold">₦</span>
                                <Input
                                    id="price"
                                    type="number"
                                    placeholder="e.g. 45000"
                                    className="pl-8 bg-zinc-50 border-zinc-200 rounded-lg focus:ring-ratel-green-600 focus:border-ratel-green-600"
                                    value={proposedPrice}
                                    onChange={(e) => setProposedPrice(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="message" className="text-sm font-bold">Message for Seller (Optional)</Label>
                            <Textarea
                                id="message"
                                placeholder="Explain why you are suggesting this price..."
                                className="bg-zinc-50 border-zinc-200 rounded-lg min-h-[100px] focus:ring-ratel-green-600 focus:border-ratel-green-600"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                            />
                        </div>

                        <div className="bg-blue-50 p-3 rounded-lg flex gap-3 text-xs text-blue-700">
                            <ShieldCheck className="h-4 w-4 shrink-0" />
                            <p>If accepted, your payment will be held in **Escrow** until you confirm delivery of the item.</p>
                        </div>

                        <DialogFooter>
                            <Button
                                type="submit"
                                className="w-full bg-ratel-green-600 hover:bg-ratel-green-700 text-white rounded-full font-bold h-11"
                                disabled={isSubmitting || !proposedPrice}
                            >
                                {isSubmitting ? "Sending Request..." : "Send Negotiation Request"}
                            </Button>
                        </DialogFooter>
                    </form>
                ) : (
                    <div className="py-8 text-center space-y-4">
                        <div className="w-16 h-16 bg-ratel-green-100 rounded-full flex items-center justify-center mx-auto">
                            <MessageSquare className="h-8 w-8 text-ratel-green-600" />
                        </div>
                        <h3 className="text-xl font-bold">Request Sent!</h3>
                        <p className="text-zinc-500 text-sm px-4">
                            We've sent your offer of **{formatPrice(Number(proposedPrice))}** to the seller. We'll notify you once they accept or reject it.
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
