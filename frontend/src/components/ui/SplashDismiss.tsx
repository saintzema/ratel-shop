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
            const dismiss = () => {
                if (!splash.classList.contains("fp-hide")) {
                    splash.classList.add("fp-hide");
                    setTimeout(() => {
                        splash.style.display = "none";
                    }, 500);
                }
            };

            // Small delay to let the first paint settle
            requestAnimationFrame(() => dismiss());

            // Aggressive interval check in case of hydration hangs or UI freezes
            const interval = setInterval(() => {
                if (splash.classList.contains("fp-hide")) {
                    clearInterval(interval);
                    return;
                }
                dismiss();
            }, 2000);

            // Bulletproof secondary fail-safe
            const backup = setTimeout(dismiss, 5000);
            
            return () => {
                clearInterval(interval);
                clearTimeout(backup);
            };
        }
    }, []);

    return null;
}
