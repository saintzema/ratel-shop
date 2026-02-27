"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../ui/dialog";
import { Button } from "../ui/button";
import { formatPrice } from "@/lib/utils";
import { ShieldCheck, Truck, CheckCircle, PackageSearch, CreditCard, ShoppingCart } from "lucide-react";

interface RequestDepositModalProps {
    isOpen: boolean;
    onClose: () => void;
    productName: string;
    targetPrice: number;
    sourceUrl?: string;
}

export function RequestDepositModal({ isOpen, onClose, productName, targetPrice, sourceUrl, onConfirm }: RequestDepositModalProps & { onConfirm?: () => void }) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    // Standard local delivery fee for external sourcing
    const deliveryFee = 5000;
    const totalDeposit = targetPrice + deliveryFee;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        if (onConfirm) {
            onConfirm();
            return; // onConfirm navigates away
        }

        // Fallback simulation
        await new Promise(resolve => setTimeout(resolve, 1500));
        setIsSubmitting(false);
        setSubmitted(true);
    };

    const handleReset = () => {
        setSubmitted(false);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleReset()}>
            <DialogContent className="sm:max-w-[425px] bg-white text-black border-zinc-200 p-0 overflow-hidden">
                {!submitted ? (
                    <>
                        <div className="bg-zinc-50 p-6 border-b border-zinc-100 flex flex-col items-center text-center space-y-3">
                            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                                <PackageSearch className="h-6 w-6" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-bold">Request External Product</DialogTitle>
                                <DialogDescription className="text-zinc-500 mt-1">
                                    We will source this product specifically for you.
                                </DialogDescription>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            <div className="space-y-4">
                                <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                                    <p className="font-bold text-sm text-zinc-800 line-clamp-2">{productName}</p>
                                    <p className="text-xs text-zinc-500 mt-1">Sourced via Global Stores</p>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 text-sm text-zinc-700">
                                        <Truck className="h-4 w-4 text-emerald-600" />
                                        <span>Estimated Delivery: <strong>7 Working Days</strong></span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-zinc-700">
                                        <ShieldCheck className="h-4 w-4 text-blue-600" />
                                        <span>Payment held in <strong>Escrow</strong> until delivery</span>
                                    </div>
                                </div>

                                <div className="border-t border-zinc-100 pt-4 space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-zinc-500">Product Price</span>
                                        <span className="font-medium">{formatPrice(targetPrice)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-zinc-500">Standard Delivery</span>
                                        <span className="font-medium">{formatPrice(deliveryFee)}</span>
                                    </div>
                                    <div className="flex justify-between text-base font-bold pt-2">
                                        <span>Required Deposit</span>
                                        <span>{formatPrice(totalDeposit)}</span>
                                    </div>
                                </div>
                            </div>

                            <DialogFooter>
                                <Button
                                    type="submit"
                                    className="w-full bg-black hover:bg-zinc-800 text-white rounded-full font-bold h-12"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        "Processing payment..."
                                    ) : (
                                        <span className="flex items-center gap-2">
                                            <ShoppingCart className="h-4 w-4" />
                                            Start Order & Checkout
                                        </span>
                                    )}
                                </Button>
                            </DialogFooter>
                        </form>
                    </>
                ) : (
                    <div className="p-8 text-center space-y-4">
                        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                            <CheckCircle className="h-8 w-8 text-emerald-600" />
                        </div>
                        <h3 className="text-2xl font-bold">Order Received!</h3>
                        <p className="text-zinc-500 text-sm">
                            Your deposit of {formatPrice(totalDeposit)} has been secured in Escrow.
                            We will source <strong>{productName}</strong> and deliver it within 7 working days.
                        </p>
                        <p className="text-xs text-zinc-400 bg-zinc-50 p-3 rounded-lg mt-4">
                            You can cancel this request at any time before shipping for a full refund.
                        </p>
                        <Button
                            onClick={handleReset}
                            className="w-full bg-black text-white rounded-full font-bold h-11 mt-6"
                        >
                            Back to Shop
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
