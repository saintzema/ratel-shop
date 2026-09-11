"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Car } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { formatPrice } from "@/lib/utils";

const POLL_MS = 15000;

interface ActiveRide {
    id: string;
    status: "matched" | "in_progress";
    pickup: string;
    dropoff: string;
    agreedFare: number | null;
    asRole: "driver" | "rider";
    otherPartyName: string | null;
}

/**
 * The closest a Capacitor remote-webview app can get to iOS's Dynamic
 * Island / Lock Screen live activity for an active ride, without native
 * ActivityKit code (a separate, native-only engineering project this
 * component deliberately does not pretend to be). A dark pill, docked at
 * the very top of the screen above the Navbar, visible on EVERY page —
 * not just /ride — for as long as a ride is matched or in progress, so
 * neither rider nor driver loses track of an active trip while browsing
 * the rest of the app.
 */
export function GlobalTripBar() {
    const { user } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [ride, setRide] = useState<ActiveRide | null>(null);

    useEffect(() => {
        if (!user) { setRide(null); return; }
        let cancelled = false;
        const authHeaders = (): Record<string, string> => {
            const tok = typeof window !== "undefined" ? localStorage.getItem("fp_token") : null;
            return tok ? { Authorization: `Bearer ${tok}` } : {};
        };
        const poll = () => {
            fetch("/api/rides/active", { headers: authHeaders() })
                .then(r => r.ok ? r.json() : null)
                .then(d => { if (!cancelled) setRide(d?.ride || null); })
                .catch(() => {});
        };
        poll();
        const t = setInterval(poll, POLL_MS);
        return () => { cancelled = true; clearInterval(t); };
    }, [user]);

    // Already on the ride page itself — its own map/status card shows all of
    // this in full, so the compact top pill would just be a redundant twin.
    if (!ride || pathname === "/ride") return null;

    const label = ride.status === "in_progress" ? "Trip in progress" : "Driver matched";
    const withWhom = ride.asRole === "driver" ? `Rider: ${ride.otherPartyName || "—"}` : `Driver: ${ride.otherPartyName || "—"}`;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: -30, scale: 0.85 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -30, scale: 0.85 }}
                transition={{ type: "spring", damping: 22, stiffness: 300 }}
                onClick={() => router.push("/ride")}
                className="fixed left-1/2 -translate-x-1/2 z-[110] cursor-pointer"
                style={{ top: "calc(var(--pwa-banner-h, 0px) + 8px)" }}
            >
                <div
                    className="flex items-center gap-2.5 pl-3 pr-4 py-2 rounded-full text-white shadow-[0_8px_24px_rgba(0,0,0,0.35)]"
                    style={{ background: "rgba(10,10,10,0.92)", backdropFilter: "blur(20px)" }}
                >
                    <span className="relative flex h-2 w-2 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-green-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-green-500" />
                    </span>
                    <Car className="h-3.5 w-3.5 text-brand-green-400 shrink-0" />
                    <div className="flex flex-col leading-tight">
                        <span className="text-[10px] font-black uppercase tracking-wide text-brand-green-400">{label}</span>
                        <span className="text-[11px] font-bold text-white/90 max-w-[220px] truncate">
                            {withWhom}{ride.agreedFare ? ` · ${formatPrice(ride.agreedFare)}` : ""}
                        </span>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
