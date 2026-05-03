"use client";

import { useEffect, useState } from "react";
import { X, Share, PlusSquare, Download, ExternalLink, Apple, Play } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { usePushNotifications } from "@/hooks/usePushNotifications";

export function PwaManager() {
    usePushNotifications(); // Initialize scheduled marketing & price drop alerts

    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [showInstallBanner, setShowInstallBanner] = useState(false);
    const [showInstructions, setShowInstructions] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [isInAppBrowser, setIsInAppBrowser] = useState(false);

    useEffect(() => {
        // Detect environment
        const ua = window.navigator.userAgent;
        const isIOSDevice = /iPhone|iPad|iPod/.test(ua);
        const isInstagram = ua.includes('Instagram');
        const isFacebook = ua.includes('FBAN') || ua.includes('FBAV');
        
        setIsIOS(isIOSDevice);
        setIsInAppBrowser(isInstagram || isFacebook);

        // Check if already installed
        if (typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches) {
            setShowInstallBanner(false);
            return;
        }

        // Register Service Worker
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js').catch(err => {
                    console.error('ServiceWorker registration failed: ', err);
                });
            });
        }

        // Listen for PWA install prompt (Android/Chrome)
        const handler = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);

            // Only show prompt if they haven't dismissed it recently
            if (!localStorage.getItem("pwa_prompt_dismissed")) {
                setTimeout(() => setShowInstallBanner(true), 3000); 
            }
        };

        window.addEventListener('beforeinstallprompt', handler);

        // For iOS or In-App Browsers, show banner manually
        if ((isIOSDevice || isInstagram || isFacebook) && !localStorage.getItem("pwa_prompt_dismissed")) {
            setTimeout(() => setShowInstallBanner(true), 4000);
        }

        return () => {
            window.removeEventListener('beforeinstallprompt', handler);
        };
    }, []);

    const handleInstallClick = async () => {
        if (isIOS || isInAppBrowser) {
            setShowInstructions(true);
            return;
        }

        if (!deferredPrompt) {
            setShowInstructions(true);
            return;
        }

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            setShowInstallBanner(false);
        }
        setDeferredPrompt(null);
    };

    const handleDismiss = () => {
        setShowInstallBanner(false);
        localStorage.setItem("pwa_prompt_dismissed", "true");
    };

    if (!showInstallBanner) return null;

    return (
        <div className="fixed top-0 left-0 right-0 z-[2000] flex flex-col items-center pointer-events-none">
            {/* Premium Top Banner */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between gap-3 shadow-[0_2px_15px_rgba(0,0,0,0.06)] pointer-events-auto"
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center shadow-lg shrink-0 overflow-hidden">
                        <img src="/logo.png" alt="FairPrice" className="h-7 w-7 object-contain" />
                    </div>
                    <div className="flex flex-col">
                        <h4 className="text-[13px] font-black text-gray-900 leading-tight">FairPrice Market App</h4>
                        <p className="text-[10px] text-gray-500 font-medium">Verified deals & instant alerts.</p>
                    </div>
                </div>

                <div className="flex items-center gap-1.5">
                    <button 
                        onClick={handleInstallClick}
                        className="bg-brand-green-600 text-white px-4 py-1.5 rounded-lg text-xs font-black hover:bg-brand-green-700 transition-all active:scale-95 shadow-sm"
                    >
                        GET APP
                    </button>
                    <button 
                        onClick={handleDismiss}
                        className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X className="h-5 w-5 stroke-[2.5]" />
                    </button>
                </div>
            </motion.div>

            {/* Dark Instructional Tooltip */}
            <AnimatePresence>
                {showInstructions && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        className="mt-3 w-[94%] max-w-sm bg-black rounded-2xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.4)] pointer-events-auto relative"
                    >
                        <div className="absolute -top-1.5 right-14 w-3 h-3 bg-black rotate-45" />

                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-white font-black text-sm">Download & Install</h3>
                            <button onClick={() => setShowInstructions(false)} className="text-gray-500 hover:text-white">
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Store Buttons */}
                        <div className="grid grid-cols-2 gap-3 mb-6">
                            <button 
                                onClick={() => window.open('https://apps.apple.com/app/fairprice-ng', '_blank')}
                                className="flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white border border-white/10 rounded-xl p-2.5 transition-all text-left"
                            >
                                <Apple className="h-5 w-5 fill-white" />
                                <div className="flex flex-col">
                                    <span className="text-[7px] uppercase font-bold opacity-60">Download on the</span>
                                    <span className="text-[10px] font-black leading-none">App Store</span>
                                </div>
                            </button>
                            <button 
                                onClick={() => window.open('https://play.google.com/store/apps/details?id=ng.fairprice', '_blank')}
                                className="flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white border border-white/10 rounded-xl p-2.5 transition-all text-left"
                            >
                                <Play className="h-5 w-5 fill-white" />
                                <div className="flex flex-col">
                                    <span className="text-[7px] uppercase font-bold opacity-60">Get it on</span>
                                    <span className="text-[10px] font-black leading-none">Google Play</span>
                                </div>
                            </button>
                        </div>

                        <div className="h-px bg-white/10 w-full mb-6" />

                        <h4 className="text-white font-bold text-xs mb-4">Or Add to Home Screen:</h4>
                        
                        <div className="space-y-5 mb-2">
                            <div className="flex items-start gap-4">
                                <div className="w-6 h-6 rounded-full bg-brand-green-600 flex items-center justify-center shrink-0 mt-0.5">
                                    <span className="text-white text-[11px] font-black">1</span>
                                </div>
                                <p className="text-white/90 text-xs leading-relaxed">
                                    {isInAppBrowser 
                                        ? <>Tap the <span className="font-bold text-blue-400 flex inline-flex items-center gap-1">three dots (...) <ExternalLink className="h-3 w-3" /></span> and select <b>"Open in Browser"</b>.</>
                                        : <>Tap the <span className="font-bold text-blue-400 flex inline-flex items-center gap-1">Share button <Share className="h-3 w-3" /></span> (square with arrow).</>
                                    }
                                </p>
                            </div>

                            <div className="flex items-start gap-4">
                                <div className="w-6 h-6 rounded-full bg-brand-green-600 flex items-center justify-center shrink-0 mt-0.5">
                                    <span className="text-white text-[11px] font-black">2</span>
                                </div>
                                <p className="text-white/90 text-xs leading-relaxed">
                                    Scroll down and tap <span className="font-bold text-white flex inline-flex items-center gap-1">"Add to Home Screen" <PlusSquare className="h-3 w-3" /></span>.
                                </p>
                            </div>
                        </div>

                        <button 
                            onClick={() => setShowInstructions(false)}
                            className="w-full mt-6 py-3 bg-brand-green-600 hover:bg-brand-green-700 text-white rounded-xl text-xs font-black transition-all shadow-lg"
                        >
                            Got it!
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
