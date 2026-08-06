"use client";

import { useEffect, useRef } from "react";
import { AD_CONFIG, isAdSenseConfigured } from "@/lib/ad-config";

/**
 * A single native/in-feed AdSense unit meant to be dropped into a product
 * grid every N cards (see search/page.tsx). Renders nothing at all until
 * NEXT_PUBLIC_ADSENSE_CLIENT_ID / NEXT_PUBLIC_ADSENSE_INFEED_SLOT_ID are set —
 * no broken placeholder box before the real AdSense account exists.
 */
export function InFeedNativeAd({ className }: { className?: string }) {
    const insRef = useRef<HTMLModElement | null>(null);
    const pushed = useRef(false);

    useEffect(() => {
        if (!isAdSenseConfigured() || pushed.current) return;
        try {
            ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
            pushed.current = true;
        } catch {
            // AdSense script not loaded yet / blocked by an ad blocker — fail silent,
            // this is a revenue nice-to-have, never something that should break the feed.
        }
    }, []);

    if (!isAdSenseConfigured()) return null;

    return (
        <div className={className}>
            <span className="block text-[9px] font-bold text-gray-300 uppercase tracking-widest mb-1 px-1">
                Sponsored
            </span>
            <ins
                ref={insRef}
                className="adsbygoogle block"
                style={{ display: "block" }}
                data-ad-client={AD_CONFIG.adsense.clientId}
                data-ad-slot={AD_CONFIG.adsense.inFeedSlotId}
                data-ad-format="fluid"
                data-ad-layout-key="-fb+5w+4e-db+86"
            />
        </div>
    );
}
