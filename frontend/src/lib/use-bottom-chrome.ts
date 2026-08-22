"use client";

import { useEffect, useState } from "react";

/**
 * How many pixels up from the bottom of the viewport are already occupied by
 * persistent UI — the mobile bottom nav, a message composer, and anything else
 * marked `data-bottom-chrome`.
 *
 * The floating notification pill was pinned at a hardcoded `bottom-32` (128px).
 * That number was picked to clear the bottom nav alone, so on any screen with a
 * composer above the nav — the message thread being the obvious one — the pill
 * landed directly on top of the reply box and the Ziva avatar. It is
 * pointer-events-none so taps still worked, but it covered what the user was
 * typing.
 *
 * Measuring instead of guessing means the pill clears whatever is actually
 * there, on any page, at any viewport, including when the composer grows.
 */
export function useBottomChromeOffset(minimum = 24): number {
    const [offset, setOffset] = useState(minimum);

    useEffect(() => {
        const read = () => {
            const vh = window.innerHeight;
            let occupied = 0;

            document.querySelectorAll<HTMLElement>("[data-bottom-chrome]").forEach(el => {
                const r = el.getBoundingClientRect();
                // Ignore anything hidden or scrolled off — a display:none bottom
                // nav on desktop has a zero-height rect.
                if (r.height <= 0 || r.bottom <= 0) return;
                // How far this element's top edge sits above the viewport bottom.
                const fromBottom = vh - r.top;
                if (fromBottom > occupied) occupied = fromBottom;
            });

            const next = Math.round(Math.max(minimum, occupied + 12));
            setOffset(prev => (prev === next ? prev : next));
        };

        read();

        const ro = new ResizeObserver(read);
        ro.observe(document.body);
        // Chrome mounts/unmounts per route, so watch the tree as well.
        const mo = new MutationObserver(read);
        mo.observe(document.body, { childList: true, subtree: true });

        window.addEventListener("resize", read);
        window.addEventListener("orientationchange", read);
        window.addEventListener("scroll", read, { passive: true });
        return () => {
            ro.disconnect();
            mo.disconnect();
            window.removeEventListener("resize", read);
            window.removeEventListener("orientationchange", read);
            window.removeEventListener("scroll", read);
        };
    }, [minimum]);

    return offset;
}
