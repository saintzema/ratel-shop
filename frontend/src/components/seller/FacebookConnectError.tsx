"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";

/**
 * Surfaces a failed Facebook Page connection.
 *
 * The OAuth callback already redirected here with ?fb_error=... on failure, but
 * nothing ever read it — so a rejected connect looked exactly like never having
 * pressed the button, and the seller just tried again into the same wall.
 *
 * Note the common case this CANNOT catch: if Meta rejects the request outright
 * (unlisted redirect URI, app still in Development mode, unapproved scopes), the
 * seller is stranded on facebook.com's own error page and never returns here at
 * all. That's a Meta app-settings problem, not something the app can detect.
 */
export function FacebookConnectError() {
    const [reason, setReason] = useState<string | null>(null);

    useEffect(() => {
        if (typeof window === "undefined") return;
        const params = new URLSearchParams(window.location.search);
        const err = params.get("fb_error");
        if (!err) return;
        setReason(err);

        // Clear it from the URL so a refresh doesn't resurrect the banner.
        params.delete("fb_error");
        const qs = params.toString();
        window.history.replaceState({}, "", window.location.pathname + (qs ? `?${qs}` : ""));
    }, []);

    if (!reason) return null;

    const message = reason === "denied"
        ? "You cancelled the Facebook connection, or Facebook refused it. Nothing was changed."
        : reason === "no_pages"
            ? "That Facebook account doesn't manage any Pages. Auto-posting needs a Page — create one on Facebook, then connect again."
            : "We couldn't finish connecting your Facebook Page. Nothing was changed — please try again.";

    return (
        <div className="order-first flex items-start justify-between gap-3 bg-red-50 border border-red-200 rounded-3xl p-4">
            <div className="flex items-start gap-3 min-w-0">
                <div className="h-10 w-10 rounded-2xl bg-red-100 flex items-center justify-center shrink-0">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div className="min-w-0">
                    <p className="text-sm font-black text-red-900">Facebook connection didn&apos;t complete</p>
                    <p className="text-xs font-semibold text-red-700 mt-0.5">{message}</p>
                </div>
            </div>
            <button onClick={() => setReason(null)} className="p-1 rounded-full hover:bg-red-100 shrink-0" aria-label="Dismiss">
                <X className="h-4 w-4 text-red-400" />
            </button>
        </div>
    );
}
