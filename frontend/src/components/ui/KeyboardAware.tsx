"use client";

import { useEffect } from "react";

/**
 * Global keyboard-aware scroll fix for iOS / Capacitor.
 * When ANY input or textarea receives focus on mobile, this component
 * scrolls the focused element into the center of the visible viewport,
 * ensuring the keyboard never obscures what the user is typing.
 *
 * Mount this ONCE in layout.tsx — it fixes ALL inputs across the entire app.
 */
export function KeyboardAware() {
    useEffect(() => {
        if (typeof window === "undefined") return;

        const handleFocusIn = (e: FocusEvent) => {
            const target = e.target as HTMLElement;
            if (
                target &&
                (target.tagName === "INPUT" ||
                    target.tagName === "TEXTAREA" ||
                    target.tagName === "SELECT" ||
                    target.isContentEditable)
            ) {
                // Small delay to let iOS keyboard fully appear
                setTimeout(() => {
                    target.scrollIntoView({
                        behavior: "smooth",
                        block: "center",
                        inline: "nearest",
                    });
                }, 350);
            }
        };

        document.addEventListener("focusin", handleFocusIn, { passive: true });

        return () => {
            document.removeEventListener("focusin", handleFocusIn);
        };
    }, []);

    return null;
}
