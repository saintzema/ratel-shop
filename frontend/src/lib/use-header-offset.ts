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

        // ALSO observe the header itself once it exists.
        //
        // Body alone is not enough: the header changes its own height (the
        // sub-navigation row collapses on scroll), and that does not change the
        // body's size, so the body observer never fired. The offset stayed at
        // whatever the header measured on mount — verified on production at
        // mobile width, where a 120px header left the pills bar pinned 22px too
        // high, tucked behind it.
        let headerRO: ResizeObserver | null = null;
        const attachHeader = () => {
            const el = document.querySelector("header");
            if (!el || headerRO) return;
            headerRO = new ResizeObserver(read);
            headerRO.observe(el);
            read();
        };
        attachHeader();

        // The header mounts after hydration, so watch for it appearing and
        // attach the observer then. Also covers a header that is replaced.
        const mo = new MutationObserver(() => {
            if (!headerRO) attachHeader();
            else read();
        });
        mo.observe(document.body, { childList: true, subtree: true });

        // A collapsing header is driven by scroll, and a ResizeObserver reports
        // the change a frame late. Re-reading on scroll keeps the sticky offset
        // in step with a header that is mid-transition.
        const onScroll = () => read();
        window.addEventListener("scroll", onScroll, { passive: true });
        window.addEventListener("resize", read);
        window.addEventListener("orientationchange", read);
        return () => {
            ro.disconnect();
            headerRO?.disconnect();
            mo.disconnect();
            window.removeEventListener("scroll", onScroll);
            window.removeEventListener("resize", read);
            window.removeEventListener("orientationchange", read);
        };
    }, []);

    return offset;
}
