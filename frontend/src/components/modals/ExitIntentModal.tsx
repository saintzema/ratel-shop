"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Tag, ArrowRight, Gift, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePathname } from "next/navigation";

export function ExitIntentModal() {
    const [isVisible, setIsVisible] = useState(false);
    const [hasBeenShown, setHasBeenShown] = useState(false);
    const pathname = usePathname();

    useEffect(() => {
        // Only run on client
        if (typeof window === "undefined") return;

        // Check if already shown this session
        const storedShown = sessionStorage.getItem("fp_exit_intent_shown");
        if (storedShown) {
            setHasBeenShown(true);
            return;
        }

        // 1. Mouse leave attempt (Desktop)
        const handleMouseLeave = (e: MouseEvent) => {
            if (e.clientY <= 0 && !hasBeenShown) {
                triggerModal();
            }
        };

        // 2. Back button attempt (Mobile/General)
        // Note: Pushing a dummy state allows us to intercept the first 'back' action
        const handlePopState = () => {
            if (!hasBeenShown) {
                triggerModal();
                // Push state again so the user doesn't actually leave yet
                window.history.pushState(null, document.title, window.location.href);
            }
        };

        const triggerModal = () => {
            setIsVisible(true);
            setHasBeenShown(true);
            sessionStorage.setItem("fp_exit_intent_shown", "true");
        };

        // Initialize mobile back-button trap safely
        if (!storedShown) {
            window.history.pushState(null, document.title, window.location.href);
            window.addEventListener("popstate", handlePopState);
            document.addEventListener("mouseleave", handleMouseLeave);
        }

        return () => {
            document.removeEventListener("mouseleave", handleMouseLeave);
            window.removeEventListener("popstate", handlePopState);
        };
    }, [hasBeenShown, pathname]);

    const handleClose = () => {
        setIsVisible(false);
    };

    const handleCopyCode = () => {
        navigator.clipboard.writeText("SAVE2000");
        const btn = document.getElementById("copy-btn-text");
        if (btn) {
            btn.innerText = "COPIED!";
            setTimeout(() => { btn.innerText = "COPY CODE"; }, 2000);
        }
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleClose}
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                    />

                    {/* Apple Liquid Glass Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="relative w-full max-w-md overflow-hidden rounded-[32px] bg-white/70 backdrop-blur-xl border border-white/40 shadow-2xl shadow-emerald-900/10"
                    >
                        {/* Shimmer Effect overlay */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/60 via-white/10 to-transparent pointer-events-none" />

                        {/* Top decorative banner */}
                        <div className="h-32 bg-gradient-to-br from-emerald-500 to-teal-700 relative overflow-hidden">
                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20 mix-blend-overlay"></div>
                            {/* Glow orbs */}
                            <div className="absolute -top-10 -right-10 w-32 h-32 bg-yellow-300 rounded-full mix-blend-screen filter blur-2xl opacity-50 animate-pulse"></div>
                            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-emerald-300 rounded-full mix-blend-screen filter blur-2xl opacity-50"></div>
                            
                            <button
                                onClick={handleClose}
                                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-black/20 text-white hover:bg-black/40 backdrop-blur-md transition-colors"
                            >
                                <X className="h-4 w-4" />
                            </button>

                            <div className="absolute inset-0 flex items-center justify-center flex-col text-white pb-2">
                                <motion.div 
                                    initial={{ rotate: -10, scale: 0.8 }}
                                    animate={{ rotate: 0, scale: 1 }}
                                    transition={{ type: "spring", delay: 0.2 }}
                                    className="bg-white/20 p-3 rounded-2xl backdrop-blur-md shadow-xl border border-white/30"
                                >
                                    <Gift className="h-8 w-8 text-yellow-300 drop-shadow-lg" />
                                </motion.div>
                            </div>
                        </div>

                        {/* Content area */}
                        <div className="p-8 relative z-10 text-center space-y-6">
                            <div className="space-y-2">
                                <h2 className="text-3xl font-black tracking-tight text-gray-900 leading-tight">
                                    Leaving so soon?
                                </h2>
                                <p className="text-gray-600 font-medium">
                                    Complete your order right now and get <strong className="text-emerald-600">₦2,000 off</strong> instantly!
                                </p>
                            </div>

                            <div className="bg-emerald-50 border border-emerald-100/50 rounded-2xl p-5 relative overflow-hidden group">
                                <div className="absolute inset-0 bg-gradient-to-r from-emerald-200/0 via-emerald-200/50 to-emerald-200/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 -translate-x-full group-hover:translate-x-full ease-in-out" />
                                
                                <p className="text-xs font-bold uppercase tracking-widest text-emerald-800 mb-2 flex items-center justify-center gap-1">
                                    <Sparkles className="h-3 w-3 text-emerald-500" /> Use Promo Code
                                </p>
                                <div className="flex items-center justify-between bg-white border border-emerald-200 rounded-xl p-2 pl-4 shadow-sm">
                                    <span className="font-extrabold text-2xl tracking-widest text-gray-900 select-all">SAVE2000</span>
                                    <button 
                                        onClick={handleCopyCode}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 px-4 rounded-lg shadow-md transition-all active:scale-95 flex items-center gap-1"
                                    >
                                        <span id="copy-btn-text">COPY CODE</span>
                                    </button>
                                </div>
                            </div>

                            <div className="pt-2 space-y-3">
                                <Button 
                                    onClick={handleClose}
                                    className="w-full h-14 rounded-2xl bg-black hover:bg-gray-900 text-white font-bold text-lg shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.2)] transition-all flex items-center justify-center gap-2"
                                >
                                    Continue Checkout <ArrowRight className="h-5 w-5" />
                                </Button>
                                <button 
                                    onClick={() => {
                                        setIsVisible(false);
                                        window.history.back(); // Physically allow the back to happen
                                    }}
                                    className="text-sm font-semibold text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    No thanks, I'll pay full price later
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
