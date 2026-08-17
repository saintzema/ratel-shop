"use client";

import { useEffect, useState } from "react";

/**
 * The distance from the top of the viewport to the bottom of the fixed header,
 * as a plain number of pixels.
 *
 * Navbar publishes this as the --fp-header-h custom property, and the sticky
 * category-pills bar used `top: calc(var(--pwa-banner-h,0px) + var(--fp-header-h,96px))`.
 * Measured on production that element resolved to 96px — the *fallback* — while
 * an identical calc on a probe element in the same document resolved to 98px.
 * The element's offset was computed before Navbar set the property and never
 * got re-resolved, so the pills bar pinned 2px too high and, more visibly,
 * ignored the taller header inside the native WebView.
 *
 * Reading the value in JS and handing the element a concrete `top: 98px`
 * sidesteps that invalidation entirely: a number can't fail to resolve.
 */
export function useHeaderOffset(fallback = 96): number {
    const [offset, setOffset] = useState(fallback);

    useEffect(() => {
        const read = () => {
            const cs = getComputedStyle(document.documentElement);
            const header = parseFloat(cs.getPropertyValue("--fp-header-h")) || 0;
            const banner = parseFloat(cs.getPropertyValue("--pwa-banner-h")) || 0;
            // Prefer a direct measurement — it is authoritative even if the
            // property has not been published yet on this paint.
            const el = document.querySelector("header");
            const measured = el ? Math.round(el.getBoundingClientRect().height) : 0;
            const next = (measured || header) + banner;
            if (next > 0) setOffset(prev => (prev === next ? prev : next));
        };

        read();

        const el = document.querySelector("header");
        const ro = el ? new ResizeObserver(read) : null;
        if (el && ro) ro.observe(el);
        window.addEventListener("resize", read);
        window.addEventListener("orientationchange", read);
        return () => {
            ro?.disconnect();
            window.removeEventListener("resize", read);
            window.removeEventListener("orientationchange", read);
        };
    }, []);

    return offset;
}
