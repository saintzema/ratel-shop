"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, Instagram, Share2 } from "lucide-react";

/**
 * Persistent nudge toward the Social Composer on the seller dashboard.
 *
 * Deliberately connection-aware rather than one static banner: the first-run
 * job ("connect your accounts") and the everyday job ("post this product
 * everywhere") are different asks, and a seller who has already connected
 * shouldn't keep being told to connect. Once accounts are linked it becomes a
 * plain shortcut into the composer.
 *
 * Renders nothing until the status probes settle, so it can't flash the wrong
 * message on load.
 */
export function SocialComposerAlert() {
    const [igConnected, setIgConnected] = useState<boolean | null>(null);
    const [fbConnected, setFbConnected] = useState<boolean | null>(null);

    useEffect(() => {
        const tok = typeof window !== "undefined" ? localStorage.getItem("fp_token") : null;
        const headers = { "Content-Type": "application/json", ...(tok ? { Authorization: `Bearer ${tok}` } : {}) };

        fetch("/api/seller/instagram/posts", { headers })
            .then(r => (r.ok ? r.json() : null))
            .then(d => setIgConnected(!!d?.connected))
            .catch(() => setIgConnected(false));

        fetch("/api/seller/facebook/status", { headers })
            .then(r => (r.ok ? r.json() : null))
            .then(d => setFbConnected(!!d?.connected))
            .catch(() => setFbConnected(false));
    }, []);

    if (igConnected === null || fbConnected === null) return null;

    const connectedCount = Number(igConnected) + Number(fbConnected);
    const allConnected = connectedCount === 2;

    const copy = allConnected
        ? {
            title: "Post a product to Instagram & Facebook in one tap",
            body: "Pick a product, let AI write the caption, and publish to both — or schedule it for later.",
        }
        : connectedCount === 1
            ? {
                title: `Connect ${igConnected ? "Facebook" : "Instagram"} to post everywhere at once`,
                body: `${igConnected ? "Instagram is" : "Facebook is"} already linked. Add the other and one tap posts to both.`,
            }
            : {
                title: "Connect Instagram & Facebook to auto-post your products",
                body: "Link your accounts once, then post any product to both — captions written for you, formatted per platform.",
            };

    return (
        <Link
            href="/seller/social"
            className="flex items-center justify-between gap-3 bg-gradient-to-r from-fuchsia-50 to-indigo-50 border border-fuchsia-200 rounded-3xl p-4 shadow-sm hover:from-fuchsia-100/70 hover:to-indigo-100/70 transition-colors"
        >
            <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-2xl bg-white flex items-center justify-center shrink-0 shadow-sm">
                    {allConnected ? (
                        <Share2 className="h-5 w-5 text-fuchsia-600" />
                    ) : (
                        <Instagram className="h-5 w-5 text-fuchsia-600" />
                    )}
                </div>
                <div className="min-w-0">
                    <p className="text-sm font-black text-fuchsia-900">{copy.title}</p>
                    <p className="text-xs font-semibold text-fuchsia-700/80 mt-0.5">{copy.body}</p>
                </div>
            </div>
            <ChevronRight className="h-4 w-4 text-fuchsia-400 shrink-0" />
        </Link>
    );
}
