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
            // Small delay to let the first paint settle, then fade out
            requestAnimationFrame(() => {
                splash.classList.add("fp-hide");
                setTimeout(() => {
                    splash.style.display = "none";
                }, 400);
            });
        }
    }, []);

    return null;
}
