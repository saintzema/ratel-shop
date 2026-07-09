"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Platform-wide "did my click register?" fix.
 *
 * Most buttons here navigate via `onClick={() => router.push(...)}` rather than
 * `<Link>`, and give zero visual feedback while the new route's RSC payload
 * streams in. On a slow connection/device that's a multi-hundred-ms-to-several-
 * second dead gap after a tap — indistinguishable from a broken button. Rather
 * than touch every one of the ~50 files doing this, patch history.pushState/
 * replaceState once here (both router.push and <Link> go through these) so
 * every navigation gets an immediate top progress bar, and hide it once the
 * new route has actually rendered (pathname/searchParams change).
 */
export function RouteProgressBar() {
    const [visible, setVisible] = useState(false);
    const [width, setWidth] = useState(0);
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const growTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    const hideTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const start = () => {
            if (growTimeout.current) clearTimeout(growTimeout.current);
            if (hideTimeout.current) clearTimeout(hideTimeout.current);
            setVisible(true);
            setWidth(20);
            growTimeout.current = setTimeout(() => setWidth(65), 150);
        };

        const origPush = window.history.pushState.bind(window.history);
        const origReplace = window.history.replaceState.bind(window.history);
        window.history.pushState = function (...args: Parameters<typeof origPush>) {
            start();
            return origPush(...args);
        };
        window.history.replaceState = function (...args: Parameters<typeof origReplace>) {
            start();
            return origReplace(...args);
        };

        return () => {
            window.history.pushState = origPush;
            window.history.replaceState = origReplace;
        };
    }, []);

    // The new route has actually rendered — finish and hide the bar.
    useEffect(() => {
        if (!visible) return;
        if (growTimeout.current) clearTimeout(growTimeout.current);
        setWidth(100);
        hideTimeout.current = setTimeout(() => {
            setVisible(false);
            setWidth(0);
        }, 250);
        return () => {
            if (hideTimeout.current) clearTimeout(hideTimeout.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pathname, searchParams]);

    if (!visible) return null;

    return (
        <div className="fixed top-0 left-0 right-0 z-[9999] h-[3px] pointer-events-none">
            <div
                className="h-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-600 shadow-[0_0_8px_rgba(16,185,129,0.6)] transition-all ease-out"
                style={{ width: `${width}%`, transitionDuration: width === 100 ? "200ms" : "400ms" }}
            />
        </div>
    );
}
