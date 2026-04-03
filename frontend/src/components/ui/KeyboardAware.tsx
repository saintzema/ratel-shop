"use client";

import { useEffect } from "react";
import { Keyboard } from "@capacitor/keyboard";
import { Capacitor } from "@capacitor/core";

/**
 * Global keyboard-aware scroll & layout fix for mobile browsers.
 *
 * Strategy (multi-layered):
 * 1. CSS variable `--kb-height` set on <html> from visualViewport delta,
 *    usable by any component via `var(--kb-height)`.
 * 2. On focusin, aggressively poll `scrollIntoView` during the keyboard
 *    slide-up animation to keep the active input centered.
 * 3. For inputs inside `position:fixed` containers, forcefully adjust
 *    the container's `bottom` or `transform` to dock above the keyboard.
 * 4. On visualViewport resize, re-scroll the active element into view.
 *
 * Mount ONCE in layout.tsx — fixes ALL inputs app-wide.
 */
export function KeyboardAware() {
    useEffect(() => {
        if (typeof window === "undefined") return;

        const html = document.documentElement;

        // ─── 1. Track keyboard height via visualViewport & Capacitor ───
        const updateKeyboardHeight = (height?: number) => {
            if (height !== undefined) {
                html.style.setProperty("--kb-height", `${height}px`);
                return;
            }

            if (!window.visualViewport) return;
            const vv = window.visualViewport;
            // The difference between the full window and the visual viewport
            // gives us the keyboard height (plus any browser chrome shift).
            const kbHeight = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
            html.style.setProperty("--kb-height", `${kbHeight}px`);
        };

        const handleVVEvent = () => updateKeyboardHeight();
        if (window.visualViewport) {
            window.visualViewport.addEventListener("resize", handleVVEvent);
            window.visualViewport.addEventListener("scroll", handleVVEvent);
        }

        // Add Native Capacitor listeners for 100% accuracy in the app
        let kbShowListener: any;
        let kbHideListener: any;

        if (Capacitor.isNativePlatform()) {
            Keyboard.addListener('keyboardWillShow', info => {
                updateKeyboardHeight(info.keyboardHeight);
            }).then(l => kbShowListener = l);

            Keyboard.addListener('keyboardWillHide', () => {
                updateKeyboardHeight(0);
            }).then(l => kbHideListener = l);
        }

        // ─── 2. On focus, scroll the element into view ───
        const isInputLike = (el: HTMLElement) =>
            el.tagName === "INPUT" ||
            el.tagName === "TEXTAREA" ||
            el.tagName === "SELECT" ||
            el.isContentEditable;

        // Find the nearest fixed-position ancestor
        const getFixedAncestor = (el: HTMLElement | null): HTMLElement | null => {
            while (el) {
                const style = window.getComputedStyle(el);
                if (style.position === "fixed") return el;
                el = el.parentElement;
            }
            return null;
        };

        const handleFocusIn = (e: FocusEvent) => {
            const target = e.target as HTMLElement;
            if (!target || !isInputLike(target)) return;

            const doScroll = () => {
                try {
                    const fixedParent = getFixedAncestor(target);
                    if (fixedParent) {
                        // For inputs inside fixed containers (chat modals, etc.),
                        // scrollIntoView doesn't work reliably. Instead, we ensure
                        // the fixed container is sized correctly, then scroll
                        // within the container itself.
                        const scrollableChild = fixedParent.querySelector(
                            "[class*='overflow-y-auto'], [class*='overflow-auto']"
                        ) as HTMLElement | null;
                        if (scrollableChild) {
                            scrollableChild.scrollTop = scrollableChild.scrollHeight;
                        }
                        // Also ensure the input itself is visible
                        target.scrollIntoView({ behavior: "smooth", block: "nearest" });
                    } else {
                        // Standard page inputs — center them in the viewport
                        target.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
                    }
                } catch (_) {}
            };

            // Aggressive polling during the ~400ms keyboard animation
            doScroll();
            const t1 = setTimeout(doScroll, 100);
            const t2 = setTimeout(doScroll, 250);
            const t3 = setTimeout(doScroll, 400);
            const t4 = setTimeout(doScroll, 600);
            const t5 = setTimeout(doScroll, 800);

            // Cleanup on blur (user moved away before animation finished)
            const cleanup = () => {
                clearTimeout(t1);
                clearTimeout(t2);
                clearTimeout(t3);
                clearTimeout(t4);
                clearTimeout(t5);
                target.removeEventListener("blur", cleanup);
            };
            target.addEventListener("blur", cleanup, { once: true });
        };

        document.addEventListener("focusin", handleFocusIn, { passive: true });

        // ─── 3. On viewport resize, re-scroll the active element ───
        let resizeTimeout: ReturnType<typeof setTimeout>;
        const handleViewportResize = () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                updateKeyboardHeight();
                const activeEl = document.activeElement as HTMLElement;
                if (activeEl && isInputLike(activeEl)) {
                    const fixedParent = getFixedAncestor(activeEl);
                    if (fixedParent) {
                        const scrollableChild = fixedParent.querySelector(
                            "[class*='overflow-y-auto'], [class*='overflow-auto']"
                        ) as HTMLElement | null;
                        if (scrollableChild) {
                            scrollableChild.scrollTop = scrollableChild.scrollHeight;
                        }
                        activeEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
                    } else {
                        activeEl.scrollIntoView({ behavior: "smooth", block: "center" });
                    }
                }
            }, 16);
        };

        if (window.visualViewport) {
            window.visualViewport.addEventListener("resize", handleViewportResize);
        }

        // ─── 4. Prevent iOS Safari from scrolling the body behind fixed modals ───
        // When keyboard opens on iOS, the browser sometimes scrolls <body> instead
        // of the modal. This keeps the body at top to prevent visual glitches.
        const preventBodyScroll = () => {
            const activeEl = document.activeElement as HTMLElement;
            if (activeEl && isInputLike(activeEl) && getFixedAncestor(activeEl)) {
                // Prevent the body from scrolling when modal input is focused
                window.scrollTo(0, 0);
            }
        };

        window.addEventListener("scroll", preventBodyScroll, { passive: true });

        return () => {
            document.removeEventListener("focusin", handleFocusIn);
            window.removeEventListener("scroll", preventBodyScroll);
            if (window.visualViewport) {
                window.visualViewport.removeEventListener("resize", handleVVEvent);
                window.visualViewport.removeEventListener("scroll", handleVVEvent);
                window.visualViewport.removeEventListener("resize", handleViewportResize);
            }
            if (kbShowListener) kbShowListener.remove();
            if (kbHideListener) kbHideListener.remove();
            
            html.style.removeProperty("--kb-height");
        };
    }, []);

    return null;
}
