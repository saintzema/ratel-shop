"use client";

import { useEffect, useRef } from "react";

/**
 * While a ride is matched/in_progress, quietly shares MY device's own
 * position to /api/rides/[id]/location so the other party's map can show
 * where I am — the "driver approaching pickup" / "rider isn't where I
 * expected, let me follow the map to them" experience.
 *
 * watchPosition fires often; throttled to one POST per ~4s so this doesn't
 * hammer the API on every GPS tick. No-ops silently if geolocation is
 * denied — the ride still works, the map on the other end just won't show
 * this side's live pin (never a hard failure over an optional feature).
 */
export function useLocationBroadcast(rideId: string | null, active: boolean) {
    const lastSentAt = useRef(0);
    const watchId = useRef<number | null>(null);

    useEffect(() => {
        if (!rideId || !active || typeof navigator === "undefined" || !navigator.geolocation) return;

        const authHeaders = (): Record<string, string> => {
            const tok = localStorage.getItem("fp_token");
            return tok ? { Authorization: `Bearer ${tok}` } : {};
        };

        watchId.current = navigator.geolocation.watchPosition(
            (pos) => {
                const now = Date.now();
                if (now - lastSentAt.current < 4000) return;
                lastSentAt.current = now;
                fetch(`/api/rides/${rideId}/location`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", ...authHeaders() },
                    body: JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                }).catch(() => {});
            },
            () => { /* permission denied or unavailable — ride continues without this side's live pin */ },
            { enableHighAccuracy: true, maximumAge: 3000, timeout: 8000 }
        );

        return () => {
            if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
        };
    }, [rideId, active]);
}
