"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Car, Package } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { formatPrice } from "@/lib/utils";
import { loadGoogleMaps, hasGoogleMapsKey } from "@/lib/google-maps";
import { cachedGeocode } from "@/lib/geo-cache";
import { distanceMeters } from "@/lib/geo-math";

const POLL_MS = 6000; // fast enough to read as "live" without hammering the location endpoint

interface ActiveTrip {
    id: string;
    kind: "ride" | "delivery";
    status: "matched" | "in_progress" | "picked_up";
    pickup: string;
    dropoff: string;
    agreedFare: number | null;
    asRole: "driver" | "rider" | "courier" | "sender";
    otherPartyName: string | null;
}

const authHeaders = (): Record<string, string> => {
    const tok = typeof window !== "undefined" ? localStorage.getItem("fp_token") : null;
    return tok ? { Authorization: `Bearer ${tok}` } : {};
};

/**
 * The closest a Capacitor remote-webview app can get to iOS's Dynamic
 * Island / Lock Screen live activity for an active ride or delivery,
 * without native ActivityKit code (a separate, native-only engineering
 * project this component deliberately does not pretend to be). A dark
 * pill, docked at the very top of the screen above the Navbar, visible on
 * EVERY page — not just /ride or /send-package — for the whole trip.
 *
 * What it actually animates: a live, real distance-remaining figure and a
 * progress bar, computed from the moving party's real GPS fixes (the same
 * ones RideMap already polls) against the geocoded pickup/dropoff — not a
 * fabricated ETA. This is the honest web equivalent of "the lock screen
 * shows distance and progress ticking down" — it ticks down because the
 * underlying position genuinely is.
 */
export function GlobalTripBar() {
    const { user } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [trip, setTrip] = useState<ActiveTrip | null>(null);
    const [remainingKm, setRemainingKm] = useState<number | null>(null);
    const [progressPct, setProgressPct] = useState<number | null>(null);

    const pickupCoordRef = useRef<{ lat: number; lng: number } | null>(null);
    const dropoffCoordRef = useRef<{ lat: number; lng: number } | null>(null);
    const geocodedForTripRef = useRef<string | null>(null);
    const initialRemainingRef = useRef<number | null>(null);
    const lastTargetRef = useRef<"pickup" | "dropoff" | null>(null);

    // Who/what is on this trip.
    useEffect(() => {
        if (!user) { setTrip(null); return; }
        let cancelled = false;
        const poll = () => {
            fetch("/api/trips/active", { headers: authHeaders() })
                .then(r => r.ok ? r.json() : null)
                .then(d => { if (!cancelled) setTrip(d?.trip || null); })
                .catch(() => {});
        };
        poll();
        const t = setInterval(poll, 15000);
        return () => { cancelled = true; clearInterval(t); };
    }, [user]);

    // Live distance/progress — geocode pickup+dropoff once per trip, then poll
    // the moving party's real position and shrink the remaining distance.
    useEffect(() => {
        if (!trip || !hasGoogleMapsKey) { setRemainingKm(null); setProgressPct(null); return; }
        let cancelled = false;

        // A ride "matched"/delivery "matched" phase moves toward pickup; a ride
        // "in_progress"/delivery "picked_up" phase moves toward the drop-off.
        const target: "pickup" | "dropoff" = (trip.status === "in_progress" || trip.status === "picked_up") ? "dropoff" : "pickup";
        if (lastTargetRef.current !== target) {
            initialRemainingRef.current = null; // phase changed — restart the progress baseline
            lastTargetRef.current = target;
        }

        const ensureCoords = async () => {
            if (geocodedForTripRef.current === trip.id && pickupCoordRef.current && dropoffCoordRef.current) return;
            const loaded = loadGoogleMaps();
            if (!loaded) return;
            await loaded;
            if (cancelled || !window.google?.maps) return;
            const geocoder = new window.google.maps.Geocoder();
            const [p, d] = await Promise.all([
                cachedGeocode(geocoder, `${trip.pickup}, Nigeria`),
                cachedGeocode(geocoder, `${trip.dropoff}, Nigeria`),
            ]);
            pickupCoordRef.current = p;
            dropoffCoordRef.current = d;
            geocodedForTripRef.current = trip.id;
        };

        const poll = async () => {
            await ensureCoords();
            if (cancelled) return;
            const targetCoord = target === "pickup" ? pickupCoordRef.current : dropoffCoordRef.current;
            if (!targetCoord) return;

            const apiBase = trip.kind === "delivery" ? "/api/deliveries" : "/api/rides";
            const movingKey = trip.kind === "delivery" ? "courier" : "driver";
            try {
                const res = await fetch(`${apiBase}/${trip.id}/location`, { headers: authHeaders() });
                if (!res.ok) return;
                const data = await res.json();
                const point = data?.[movingKey];
                if (!point) return;

                const remaining = distanceMeters({ lat: point.lat, lng: point.lng }, targetCoord);
                if (initialRemainingRef.current == null || remaining > initialRemainingRef.current) {
                    initialRemainingRef.current = remaining;
                }
                const baseline = initialRemainingRef.current || remaining || 1;
                const pct = Math.max(0, Math.min(100, (1 - remaining / baseline) * 100));

                if (!cancelled) {
                    setRemainingKm(remaining / 1000);
                    setProgressPct(pct);
                }
            } catch { /* one missed poll is fine */ }
        };

        poll();
        const t = setInterval(poll, POLL_MS);
        return () => { cancelled = true; clearInterval(t); };
    }, [trip?.id, trip?.status, trip?.kind, trip?.pickup, trip?.dropoff]);

    // Already on the trip's own page — its own map/status card shows all of
    // this in full, so the compact top pill would just be a redundant twin.
    const onOwnPage = (trip?.kind === "ride" && pathname === "/ride") || (trip?.kind === "delivery" && pathname === "/send-package");
    if (!trip || onOwnPage) return null;

    const isDelivery = trip.kind === "delivery";
    const movingLabel = trip.status === "in_progress" || trip.status === "picked_up" ? "to destination" : "to pickup";
    const label = trip.status === "in_progress" ? "Trip in progress"
        : trip.status === "picked_up" ? "Package picked up"
        : isDelivery ? "Courier matched" : "Driver matched";
    const withWhom = (trip.asRole === "driver" || trip.asRole === "courier")
        ? `${isDelivery ? "Sender" : "Rider"}: ${trip.otherPartyName || "—"}`
        : `${isDelivery ? "Courier" : "Driver"}: ${trip.otherPartyName || "—"}`;
    const ownPage = isDelivery ? "/send-package" : "/ride";

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: -30, scale: 0.85 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -30, scale: 0.85 }}
                transition={{ type: "spring", damping: 22, stiffness: 300 }}
                onClick={() => router.push(ownPage)}
                className="fixed left-1/2 -translate-x-1/2 z-[110] cursor-pointer"
                style={{ top: "calc(var(--pwa-banner-h, 0px) + 8px)" }}
            >
                <div
                    className="flex flex-col gap-1.5 pl-3 pr-4 py-2 rounded-[20px] text-white shadow-[0_8px_24px_rgba(0,0,0,0.35)] min-w-[200px]"
                    style={{ background: "rgba(10,10,10,0.92)", backdropFilter: "blur(20px)" }}
                >
                    <div className="flex items-center gap-2.5">
                        <span className="relative flex h-2 w-2 shrink-0">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-green-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-green-500" />
                        </span>
                        {isDelivery ? <Package className="h-3.5 w-3.5 text-brand-green-400 shrink-0" /> : <Car className="h-3.5 w-3.5 text-brand-green-400 shrink-0" />}
                        <div className="flex flex-col leading-tight">
                            <span className="text-[10px] font-black uppercase tracking-wide text-brand-green-400">{label}</span>
                            <span className="text-[11px] font-bold text-white/90 max-w-[220px] truncate">
                                {withWhom}{trip.agreedFare ? ` · ${formatPrice(trip.agreedFare)}` : ""}
                            </span>
                        </div>
                    </div>

                    {remainingKm != null && progressPct != null && (
                        <div className="flex items-center gap-2 pl-4">
                            <div className="flex-1 h-1 rounded-full bg-white/15 overflow-hidden">
                                <motion.div
                                    className="h-full rounded-full bg-brand-green-500"
                                    animate={{ width: `${progressPct}%` }}
                                    transition={{ duration: POLL_MS / 1000, ease: "linear" }}
                                />
                            </div>
                            <span className="text-[10px] font-bold text-white/70 shrink-0 tabular-nums">
                                {remainingKm < 1 ? `${Math.round(remainingKm * 1000)}m` : `${remainingKm.toFixed(1)}km`} {movingLabel}
                            </span>
                        </div>
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
