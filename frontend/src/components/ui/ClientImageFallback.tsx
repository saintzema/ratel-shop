"use client";

import { useEffect } from "react";

export function ClientImageFallback() {
    useEffect(() => {
        const handleError = (e: ErrorEvent) => {
            const target = e.target as HTMLElement;
            if (target && target.tagName === "IMG") {
                const img = target as HTMLImageElement;
                // Avoid infinite loops if the placeholder itself is broken
                if (!img.src.includes("/assets/images/placeholder.png")) {
                    img.src = "/assets/images/placeholder.png";
                }
            }
        };

        // Use capture phase (true) to catch the non-bubbling 'error' events on images
        window.addEventListener("error", handleError, true);

        return () => {
            window.removeEventListener("error", handleError, true);
        };
    }, []);

    return null;
}
