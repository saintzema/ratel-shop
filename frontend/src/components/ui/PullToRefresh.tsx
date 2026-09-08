"use client";

import { useEffect, useState } from "react";
import { isNative } from "@/lib/native-bridge";

const THRESHOLD = 72;
const MAX_PULL = 120;

/**
 * Swipe-down-to-refresh for the native app.
 *
 * Mobile Safari/Chrome already do their own pull-to-refresh on the web, so
 * this only runs inside the Capacitor shell (isNative) — the WKWebView has
 * rubber-band scrolling (capacitor.config's scrollEnabled) but nothing wired
 * to an actual refresh action, which is why swiping down on the native app
 * never refreshed anything.
 *
 * Deliberately a hard reload rather than re-running DataSyncService.autoSync:
 * every dashboard screen reads a mix of localStorage cache and in-flight
 * fetches, and a full reload is the one guarantee that what's on screen after
 * pulling down actually matches the database right now.
 */
export function PullToRefresh() {
    const [distance, setDistance] = useState(0);
    const [pulling, setPulling] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        if (!isNative) return;

        let startY: number | null = null;

        const onTouchStart = (e: TouchEvent) => {
            if (window.scrollY > 0 || refreshing) { startY = null; return; }
            startY = e.touches[0].clientY;
        };

        const onTouchMove = (e: TouchEvent) => {
            if (startY === null || refreshing) return;
            const delta = e.touches[0].clientY - startY;
            if (delta > 0 && window.scrollY === 0) {
                setPulling(true);
                setDistance(Math.min(delta * 0.5, MAX_PULL));
            }
        };

        const onTouchEnd = () => {
            if (startY === null) return;
            startY = null;
            setPulling(false);
            setDistance(prev => {
                if (prev > THRESHOLD) {
                    setRefreshing(true);
                    window.location.reload();
                    return THRESHOLD;
                }
                return 0;
            });
        };

        window.addEventListener("touchstart", onTouchStart, { passive: true });
        window.addEventListener("touchmove", onTouchMove, { passive: true });
        window.addEventListener("touchend", onTouchEnd, { passive: true });
        return () => {
            window.removeEventListener("touchstart", onTouchStart);
            window.removeEventListener("touchmove", onTouchMove);
            window.removeEventListener("touchend", onTouchEnd);
        };
    }, [refreshing]);

    if (!isNative) return null;

    return (
        <div
            aria-hidden
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                zIndex: 200,
                display: "flex",
                justifyContent: "center",
                alignItems: "flex-end",
                height: distance,
                overflow: "hidden",
                transition: pulling ? "none" : "height 0.25s ease",
                pointerEvents: "none",
            }}
        >
            <div
                style={{
                    width: 26,
                    height: 26,
                    marginBottom: 10,
                    borderRadius: "50%",
                    border: "3px solid #16a34a",
                    borderTopColor: "transparent",
                    opacity: Math.min(distance / THRESHOLD, 1),
                    transform: refreshing ? undefined : `rotate(${distance * 3}deg)`,
                    animation: refreshing || distance >= THRESHOLD ? "fp-ptr-spin 0.6s linear infinite" : "none",
                }}
            />
            <style>{`@keyframes fp-ptr-spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
