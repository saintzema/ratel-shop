"use client";

import { useEffect, useState } from "react";
import { X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PwaManager() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [showInstallPrompt, setShowInstallPrompt] = useState(false);

    useEffect(() => {
        // Register Service Worker
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js').catch(err => {
                    console.error('ServiceWorker registration failed: ', err);
                });
            });
        }

        // Listen for PWA install prompt
        const handler = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);

            // Only show prompt if they haven't dismissed it recently
            if (!localStorage.getItem("pwa_prompt_dismissed")) {
                setTimeout(() => setShowInstallPrompt(true), 3000); // Wait 3s before prompting
            }
        };

        window.addEventListener('beforeinstallprompt', handler);

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            setShowInstallPrompt(false);
        }
        setDeferredPrompt(null);
    };

    const handleDismiss = () => {
        setShowInstallPrompt(false);
        localStorage.setItem("pwa_prompt_dismissed", "true");
    };

    if (!showInstallPrompt) return null;

    return (
        <div className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-96 bg-white rounded-2xl shadow-fp-glow border border-gray-200 p-4 z-50 flex flex-col gap-3 animate-in slide-in-from-bottom-5">
            <button
                onClick={handleDismiss}
                className="absolute top-3 right-3 text-gray-400 hover:text-black"
            >
                <X className="h-4 w-4" />
            </button>
            <div className="flex gap-4 items-center pr-6">
                <div className="h-12 w-12 bg-brand-green-900 rounded-xl flex items-center justify-center shrink-0">
                    <Download className="h-6 w-6 text-brand-green-400" />
                </div>
                <div>
                    <h3 className="font-bold text-sm text-black">Install FairPrice App</h3>
                    <p className="text-xs text-gray-500">Fast access, offline browsing & notifications</p>
                </div>
            </div>
            <div className="flex gap-2 w-full">
                <Button
                    variant="outline"
                    className="flex-1 rounded-xl h-9 text-xs font-bold"
                    onClick={handleDismiss}
                >
                    Maybe Later
                </Button>
                <Button
                    className="flex-1 rounded-xl h-9 text-xs font-bold bg-brand-green-600 hover:bg-brand-green-700 text-white"
                    onClick={handleInstall}
                >
                    Install Now
                </Button>
            </div>
        </div>
    );
}
