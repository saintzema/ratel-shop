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

        // Observe <body>, not <header>. This page can take seconds to hydrate,
        // so on the first run the header often isn't in the DOM yet: querying it
        // returned null, we skipped the update AND never attached an observer,
        // leaving the offset pinned to the fallback forever. Watching body means
        // we re-measure when the header finally mounts. read() re-queries the
        // header each time, so it self-heals.
        const ro = new ResizeObserver(read);
        ro.observe(document.body);

        // Body resizes cover layout shifts, but not a header that mounts at the
        // same size the body already had — watch the tree for it appearing too.
        const mo = new MutationObserver(() => {
            if (document.querySelector("header")) read();
        });
        mo.observe(document.body, { childList: true, subtree: true });

        window.addEventListener("resize", read);
        window.addEventListener("orientationchange", read);
        return () => {
            ro.disconnect();
            mo.disconnect();
            window.removeEventListener("resize", read);
            window.removeEventListener("orientationchange", read);
        };
    }, []);

    return offset;
}
