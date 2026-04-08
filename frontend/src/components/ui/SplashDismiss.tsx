"use client";

import { useEffect } from "react";

/**
 * Dismisses the branded splash screen (#fp-splash) after React has fully hydrated.
 * This avoids hydration mismatches caused by inline scripts modifying the DOM.
 */
export function SplashDismiss() {
    useEffect(() => {
        const splash = document.getElementById("fp-splash");
        if (splash) {
            // Standard hydration-based dismissal
            const dismiss = () => {
                if (!splash.classList.contains("fp-hide")) {
                    splash.classList.add("fp-hide");
                    setTimeout(() => {
                        splash.style.display = "none";
                    }, 500);
                }
            };

            // Small delay to let the first paint settle
            requestAnimationFrame(() => {
                dismiss();
            });

            // Bulletproof secondary fail-safe (redundant with layout.tsx but safe for client-side)
            const backup = setTimeout(dismiss, 5000);
            return () => clearTimeout(backup);
        }
    }, []);

    return null;
}
