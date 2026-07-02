"use client";

import { useEffect } from "react";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { RefreshCw, Home, AlertCircle } from "lucide-react";

/**
 * Root Error Boundary - Apple-level Resilience
 * Catches production errors and provides a smooth recovery path for users.
 */
export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to an error reporting service or console for admin awareness
        console.error("Platform Error Captured:", error);
    }, [error]);

    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
            <div className="mb-8">
                <Logo />
            </div>
            
            <div className="max-w-md w-full bg-red-50/50 border border-red-100 rounded-3xl p-8 shadow-sm">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <AlertCircle className="h-8 w-8 text-red-600" />
                </div>
                
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Something isn't right</h1>
                <p className="text-gray-600 mb-8 leading-relaxed">
                    We encountered an unexpected glitch while loading this page. Don't worry, your data and orders are safe.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button
                        onClick={() => {
                            // reset() alone can leave whatever broke the render still broken
                            // (same bad state, same crash) — and if enough of the app is
                            // wedged that Next's own router can't recover, a plain client
                            // navigation won't either. Try the React reset first, then fall
                            // back to a hard reload of the same URL, which always works
                            // since it's a full browser navigation, not dependent on any
                            // in-page JS state.
                            reset();
                            setTimeout(() => window.location.reload(), 150);
                        }}
                        className="bg-black text-white hover:bg-gray-900 rounded-xl px-6 py-6 h-auto font-bold flex items-center gap-2"
                    >
                        <RefreshCw className="h-4 w-4" /> Try Again
                    </Button>

                    <Button
                        variant="outline"
                        onClick={() => { window.location.href = "/"; }}
                        className="bg-white border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl px-6 py-6 h-auto font-bold flex items-center gap-2 w-full sm:w-auto"
                    >
                        <Home className="h-4 w-4" /> Go Home
                    </Button>
                </div>
            </div>
            
            <p className="mt-8 text-xs text-gray-400 font-medium uppercase tracking-[0.2em]">
                Error ID: {error.digest || 'FP_GENERAL_FLT'}
            </p>
        </div>
    );
}
