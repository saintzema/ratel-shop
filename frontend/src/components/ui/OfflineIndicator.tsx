"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CloudOff } from "lucide-react";

export function OfflineIndicator() {
    const [isOffline, setIsOffline] = useState(false);

    useEffect(() => {
        const handleOffline = () => setIsOffline(true);
        const handleOnline = () => setIsOffline(false);
        
        if (typeof navigator !== "undefined") {
            setIsOffline(!navigator.onLine);
        }

        window.addEventListener("offline", handleOffline);
        window.addEventListener("online", handleOnline);

        return () => {
            window.removeEventListener("offline", handleOffline);
            window.removeEventListener("online", handleOnline);
        };
    }, []);

    return (
        <AnimatePresence>
            {isOffline && (
                <motion.div
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 50, opacity: 0 }}
                    className="fixed bottom-24 sm:bottom-6 left-1/2 -translate-x-1/2 z-[100] pointer-events-none"
                >
                    <div className="bg-amber-900 border border-amber-500/30 shadow-xl text-amber-50 px-4 py-2.5 rounded-full flex items-center gap-2 backdrop-blur-md">
                        <CloudOff className="h-4 w-4" />
                        <span className="text-sm font-semibold tracking-tight">Offline Mode — Actions saved locally</span>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
