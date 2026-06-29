/**
 * Client polling utilities — built for scale & cost control.
 *
 * At thousands of concurrent users, the biggest source of wasted Vercel function
 * invocations and DB load is polling that keeps firing in backgrounded / idle
 * browser tabs. These helpers ensure:
 *   1. Polls PAUSE entirely when the tab is hidden (document.hidden).
 *   2. A poll fires once immediately when the tab becomes visible again (freshness).
 *   3. Shared resources (notifications) are fetched ONCE and fanned out to every
 *      subscriber, instead of each component opening its own interval.
 */

/** True when the tab is foregrounded (or in non-browser/SSR contexts, optimistically true). */
export function isTabVisible(): boolean {
    if (typeof document === "undefined") return true;
    return document.visibilityState !== "hidden";
}

/**
 * setInterval that skips ticks while the tab is hidden and fires once on re-focus.
 * Returns a cleanup function. `fn` is never called while hidden, so no API spend
 * is incurred for backgrounded tabs.
 */
export function visibleInterval(fn: () => void, ms: number): () => void {
    if (typeof window === "undefined") return () => {};

    const tick = () => { if (isTabVisible()) fn(); };
    const id = setInterval(tick, ms);

    let wasHidden = document.visibilityState === "hidden";
    const onVisibility = () => {
        const hidden = document.visibilityState === "hidden";
        // Fire once immediately when coming back to the foreground.
        if (wasHidden && !hidden) fn();
        wasHidden = hidden;
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
        clearInterval(id);
        document.removeEventListener("visibilitychange", onVisibility);
    };
}

/**
 * Shared notification hub — a single DB poll fed to every subscriber (Navbar bell
 * count + NotificationBell dropdown). Without this, every page mounted TWO intervals
 * (Navbar 30s + Bell 15s) hitting /api/notifications per user. Now it's ONE poll,
 * paused while hidden, deduped against in-flight requests.
 */
type NotifListener = (dbNotifs: any[]) => void;

const POLL_MS = 30_000;
const MIN_GAP_MS = 8_000; // hard floor between network fetches regardless of callers

let listeners = new Set<NotifListener>();
let currentEmail: string | null = null;
let latest: any[] = [];
let lastFetch = 0;
let inflight: Promise<void> | null = null;
let timerCleanup: (() => void) | null = null;

function fanout() { listeners.forEach((l) => l(latest)); }

function fetchNow(force = false): Promise<void> {
    if (typeof window === "undefined" || !currentEmail) return Promise.resolve();
    if (!force && !isTabVisible()) return Promise.resolve();
    const now = Date.now();
    if (!force && now - lastFetch < MIN_GAP_MS) return Promise.resolve();
    if (inflight) return inflight;

    lastFetch = now;
    inflight = (async () => {
        try {
            const res = await fetch(`/api/notifications?user_email=${encodeURIComponent(currentEmail!)}`);
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data)) { latest = data; fanout(); }
            }
        } catch {
            /* offline — subscribers keep their last value + local notifications */
        } finally {
            inflight = null;
        }
    })();
    return inflight;
}

function ensureTimer() {
    if (timerCleanup) return;
    timerCleanup = visibleInterval(() => fetchNow(false), POLL_MS);
}

function stopTimer() {
    if (timerCleanup) { timerCleanup(); timerCleanup = null; }
}

export const NotificationHub = {
    /** Subscribe to shared DB notifications. Returns an unsubscribe function. */
    subscribe(email: string | null | undefined, cb: NotifListener): () => void {
        listeners.add(cb);
        if (email) currentEmail = email;
        ensureTimer();
        if (latest.length) cb(latest);   // hand over cached value instantly
        fetchNow(true);                   // and refresh (deduped if already in flight)
        return () => {
            listeners.delete(cb);
            if (listeners.size === 0) stopTimer();
        };
    },
    /** Force an immediate refresh (e.g. after the user marks all read). */
    refresh(): Promise<void> { return fetchNow(true); },
    getLatest(): any[] { return latest; },
};
