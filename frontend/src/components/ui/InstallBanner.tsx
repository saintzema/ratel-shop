"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Download, Smartphone, X, Share, PlusSquare } from "lucide-react";
import { useState, useEffect } from "react";

export function InstallBanner() {
    const [isVisible, setIsVisible] = useState(true);
    const [showInstructions, setShowInstructions] = useState(false);
    const [isIOS, setIsIOS] = useState(false);

    useEffect(() => {
        // Detect iOS for specific instructions
        const ua = window.navigator.userAgent;
        const isIOSDevice = /iPhone|iPad|iPod/.test(ua);
        setIsIOS(isIOSDevice);

        // Check if already installed
        if (typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches) {
            setIsVisible(false);
        }
    }, []);

    if (!isVisible) return null;

    return (
        /* On mobile: sit directly on top of the bottom nav (h-16 = 64px + 2px gap = 66px).
           On md+: float near the bottom-right corner (no bottom nav present). */
        <div className="fixed bottom-[66px] md:bottom-6 left-0 right-0 md:left-auto md:right-6 md:max-w-sm z-[999] flex flex-col-reverse items-center pointer-events-none px-3 md:px-0">
            {/* Install Banner */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full bg-white border border-gray-100 rounded-2xl px-4 py-3 flex items-center justify-between gap-3 shadow-[0_10px_40px_rgba(0,0,0,0.12)] pointer-events-auto"
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center shadow-lg shrink-0">
                        <img src="/assets/images/image_v2.png" alt="FairPrice" className="h-6 w-6 object-contain" />
                    </div>
                    <div className="flex flex-col">
                        <h4 className="text-[13px] font-black text-gray-900 leading-tight">Install FairPrice App</h4>
                        <p className="text-[10px] text-gray-500 font-medium">Fastest way to manage your business.</p>
                    </div>
                </div>

                <div className="flex items-center gap-1.5">
                    <button 
                        onClick={() => setShowInstructions(!showInstructions)}
                        className="bg-black text-white px-4 py-1.5 rounded-lg text-xs font-black hover:bg-gray-800 transition-all active:scale-95 shadow-sm"
                    >
                        {showInstructions ? "Dismiss" : "Install"}
                    </button>
                    <button 
                        onClick={() => setIsVisible(false)}
                        className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X className="h-5 w-5 stroke-[2.5]" />
                    </button>
                </div>
            </motion.div>

            {/* Instructional Tooltip - Dark Premium Style from Screenshot */}
            <AnimatePresence>
                {showInstructions && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="mb-2 w-full bg-black rounded-2xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.3)] pointer-events-auto relative"
                    >
                        {/* Pointer arrow pointing down toward the banner */}
                        <div className="absolute -bottom-1.5 left-8 w-3 h-3 bg-black rotate-45" />

                        <h3 className="text-white font-black text-sm mb-5">How to install FairPrice on your device:</h3>
                        
                        <div className="space-y-6">
                            <div className="flex items-start gap-4">
                                <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                                    <span className="text-white text-[11px] font-black">1</span>
                                </div>
                                <p className="text-white/90 text-xs leading-relaxed font-medium">
                                    Tap the <span className="font-bold text-blue-400 underline decoration-2 underline-offset-2 flex inline-flex items-center gap-1">Share button <Share className="h-3 w-3" /></span> (square with up arrow) in your browser.
                                </p>
                            </div>

                            <div className="flex items-start gap-4">
                                <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                                    <span className="text-white text-[11px] font-black">2</span>
                                </div>
                                <p className="text-white/90 text-xs leading-relaxed font-medium">
                                    Scroll down and tap <span className="font-bold text-white border-b border-white/40 pb-0.5 flex inline-flex items-center gap-1">"Add to Home Screen" <PlusSquare className="h-3 w-3" /></span>.
                                </p>
                            </div>
                        </div>

                        <button 
                            onClick={() => setShowInstructions(false)}
                            className="w-full mt-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-black transition-all active:scale-[0.98]"
                        >
                            Got it, thanks!
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
