"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Car, MapPin, ChevronDown, Loader2, CheckCircle2, Minus, Plus, X, ShieldCheck, Star, ArrowUpDown } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { useLocation } from "@/context/LocationContext";
import { formatPrice, cn } from "@/lib/utils";
import { RideChat } from "@/components/ride/RideChat";
import { RideMap } from "@/components/ride/RideMap";
import { RideDriverPanel } from "@/components/ride/RideDriverPanel";
import { BookingMap } from "@/components/ride/BookingMap";
import { MaskedCallButton } from "@/components/ride/MaskedCallButton";
import { useLocationBroadcast } from "@/hooks/useLocationBroadcast";
import { playDingSound } from "@/lib/audio";
import { NIGERIAN_STATES } from "@/lib/nigerian-states";
import { usePlacesAutocomplete } from "@/hooks/usePlacesAutocomplete";
import { useHeaderOffset } from "@/lib/use-header-offset";
import { loadGoogleMaps, hasGoogleMapsKey } from "@/lib/google-maps";
import { cachedGeocode, cachedDirections } from "@/lib/geo-cache";
import { freeRouteDistanceKm, freeReverseGeocode } from "@/lib/free-distance";

// ₦500 base + a tiered/degressive per-km rate — a flat ₦550/km priced an
// 11km Abuja trip at ~₦6,660 and, when a route glitch inflated the distance,
// a genuinely short cross-town trip at ₦44,700 for what should be a normal
// fare. Real Nigerian ride-hailing (Bolt/inDrive) charges more per km on a
// short trip and progressively less as distance grows, so the first few km
// cost more per-km than km 50. A pricier vehicle class costs more per trip,
// same as Bolt/inDrive's own Comfort/XL tiers — "Any vehicle" and "Standard"
// both price at the base rate since neither commits the rider to the
// pricier tiers.
const CLASS_FARE_MULTIPLIER: Record<string, number> = { "": 1, standard: 1, newer: 1.15, ev: 1.25 };
const RIDE_TIER_1_KM = 10, RIDE_TIER_1_RATE = 180;
const RIDE_TIER_2_KM = 30, RIDE_TIER_2_RATE = 130;
const RIDE_TIER_3_RATE = 80;
function rideDistanceCost(km: number): number {
    if (km <= RIDE_TIER_1_KM) return km * RIDE_TIER_1_RATE;
    if (km <= RIDE_TIER_1_KM + RIDE_TIER_2_KM) {
        return RIDE_TIER_1_KM * RIDE_TIER_1_RATE + (km - RIDE_TIER_1_KM) * RIDE_TIER_2_RATE;
    }
    return RIDE_TIER_1_KM * RIDE_TIER_1_RATE + RIDE_TIER_2_KM * RIDE_TIER_2_RATE + (km - RIDE_TIER_1_KM - RIDE_TIER_2_KM) * RIDE_TIER_3_RATE;
}
function estimateRideFare(distanceKm: number, vehicleClass: string = ""): number {
    const raw = (500 + rideDistanceCost(distanceKm)) * (CLASS_FARE_MULTIPLIER[vehicleClass] ?? 1);
    return Math.max(800, Math.round(raw / 100) * 100);
}

const CLASSES = [
    { value: "", label: "Any vehicle", hint: "Fastest pickup — any approved car" },
    { value: "standard", label: "Standard", hint: "Everyday rides" },
    { value: "newer", label: "Newer", hint: "Newer, more comfortable cars" },
    { value: "ev", label: "EV", hint: "Quiet electric cars" },
];

const CANCEL_REASONS = ["Found another ride", "Taking too long", "Wrong pickup or drop-off", "Changed my mind", "Other"];

const FARE_STEP = 200;

/**
 * inDrive-style booking: the RIDER sets the price they're willing to pay, not
 * an algorithmic quote — no surge-pricing shock, and no distance/GPS math
 * fabricated from data we don't have (a live moving map needs a Maps SDK,
 * which is a separate integration, not something to fake here). Drivers see
 * the request and counter with their own price; the rider picks whichever
 * offer they want, or sets an auto-accept ceiling and lets the first
 * qualifying offer win.
 */
// A dynamic array of stops can't each call usePlacesAutocomplete() directly
// in a .map() — hooks can't run a variable number of times per render. Each
// <StopInput> is its own component instance, so each gets its own hook call
// (and its own attached Autocomplete widget) legitimately. This is what was
// missing before — pickup/drop-off had suggestions, stops never did.
function StopInput({ value, onChange, onRemove, placeholder }: { value: string; onChange: (v: string, coords?: { lat: number; lng: number }) => void; onRemove: () => void; placeholder: string }) {
    const autocomplete = usePlacesAutocomplete((address, coords) => onChange(address, coords));
    return (
        <div className="relative flex items-center gap-1.5 pr-2">
            <MapPin fill="currentColor" strokeWidth={1.5} className="absolute left-3 h-4 w-4 text-amber-500 pointer-events-none" />
            <Input
                ref={autocomplete.inputRef}
                placeholder={placeholder}
                value={value}
                onChange={e => onChange(e.target.value, undefined)}
                className="pl-9 border-0 bg-transparent focus-visible:ring-0"
            />
            <button
                type="button"
                onClick={onRemove}
                className="shrink-0 h-7 w-7 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:text-gray-700"
            >
                <X className="h-3.5 w-3.5" />
            </button>
        </div>
    );
}

export default function RidePage() {
    const { user } = useAuth();
    const router = useRouter();
    const { location, setLocation } = useLocation();
    const headerOffset = useHeaderOffset();

    const [confirmingCity, setConfirmingCity] = useState(true);
    const [pickingState, setPickingState] = useState(false);

    const [pickup, setPickup] = useState("");
    const [dropoff, setDropoff] = useState("");
    // Extra drop points for a shared ride (e.g. multiple people booked together
    // with different drop-offs). Folded into the single `dropoff` string the
    // API already accepts ("Stop A → Stop B → Final") rather than a schema
    // change — every place that already renders a ride's dropoff (RideMap,
    // driver's offer list, trip history) shows the full route for free.
    const [stops, setStops] = useState<{ address: string; coords?: { lat: number; lng: number } }[]>([]);
    // The pickup FIELD shows "My Location" (like Uber/Bolt) while `pickup`
    // itself still holds the real resolved address underneath — the rider
    // doesn't need to see their own street address, just confirmation
    // it's using where they are. Cleared the moment they edit the field
    // manually or pick a different address, so it never lies about what's
    // actually going to the driver.
    const [pickupIsMyLocation, setPickupIsMyLocation] = useState(false);
    // The picked suggestion's own lat/lng, straight from the Places dropdown —
    // used instead of re-geocoding the address STRING for distance/route
    // calculations. Re-geocoding matters because a landmark address is often
    // synthesized as "<name>, <formatted_address>" (e.g. "Kuje Area Council,
    // 3C5F+XJ7, Utako, Abuja") when the two genuinely differ — geocoding that
    // combined, self-contradictory string back can resolve to the WRONG one
    // of the two places, which is exactly how an 11km trip got quoted a
    // 64km/₦44,700 fare: the map used the correct picked coordinates, but the
    // fare calc separately re-geocoded the string and landed somewhere else
    // entirely. Cleared the moment the field is hand-typed or the address is
    // otherwise edited, since the coordinates no longer match at that point.
    const [pickupCoords, setPickupCoords] = useState<{ lat: number; lng: number } | undefined>(undefined);
    const [dropoffCoords, setDropoffCoords] = useState<{ lat: number; lng: number } | undefined>(undefined);
    // No-ops to plain typing if NEXT_PUBLIC_GOOGLE_MAPS_API_KEY isn't set — see
    // usePlacesAutocomplete's own comment for how to turn this on.
    const pickupAutocomplete = usePlacesAutocomplete((address, coords) => { setPickup(address); setPickupIsMyLocation(false); setPickupCoords(coords); });
    const dropoffAutocomplete = usePlacesAutocomplete((address, coords) => { setDropoff(address); setDropoffCoords(coords); });

    // Prefill pickup with the rider's actual precise location, the way a
    // real ride app does — instead of leaving them to type out their own
    // address every single time. Only ever fills an EMPTY field (never
    // overwrites something already typed) and fails completely silently:
    // if location is denied or unavailable, pickup just stays blank exactly
    // as it always has.
    useEffect(() => {
        if (pickup || typeof navigator === "undefined" || !navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const point = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                let address: string | null = null;
                if (hasGoogleMapsKey) {
                    const g = await loadGoogleMaps()?.catch(() => null);
                    if (g && window.google?.maps) {
                        const geocoder = new window.google.maps.Geocoder();
                        address = await new Promise((resolve) => {
                            geocoder.geocode({ location: point }, (results: any, status: string) => {
                                resolve(status === "OK" && results?.[0] ? results[0].formatted_address : null);
                            });
                        });
                    }
                }
                if (!address) address = await freeReverseGeocode(point);
                if (address) {
                    setPickup((current) => current || address!);
                    setPickupIsMyLocation(true);
                    setPickupCoords(point);
                }
            },
            () => { /* denied/unavailable — pickup just stays blank, as before */ },
            { timeout: 8000, maximumAge: 5 * 60 * 1000 }
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const [fare, setFare] = useState(2000);
    const [suggestedFare, setSuggestedFare] = useState<number | null>(null);
    const [routeDistanceKm, setRouteDistanceKm] = useState<number | null>(null);
    // Once the rider touches +/- themselves, stop silently overwriting their
    // choice every time the route recalculates.
    const [fareTouched, setFareTouched] = useState(false);
    const [autoAccept, setAutoAccept] = useState(false);
    const [vehicleClassPref, setVehicleClassPref] = useState("");
    const [posting, setPosting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastVisibleDrivers, setLastVisibleDrivers] = useState<number | null>(null);

    const [rides, setRides] = useState<any[]>([]);
    const [liveByRide, setLiveByRide] = useState<Record<string, { km: number; min: number; arrived: boolean }>>({});
    const [loading, setLoading] = useState(true);
    const [cancelTarget, setCancelTarget] = useState<string | null>(null);
    const offerCountRef = useRef<Record<string, number>>({});
    // Whether this account already has an approved vehicle — decides where the
    // "Driver" side of the mode switch sends them: straight to the open-request
    // board if they can already drive, or to registration if they can't yet.
    const [hasApprovedVehicle, setHasApprovedVehicle] = useState(false);

    const authHeaders = (): Record<string, string> => {
        const tok = typeof window !== "undefined" ? localStorage.getItem("fp_token") : null;
        return tok ? { Authorization: `Bearer ${tok}` } : {};
    };

    // Tracks each ride's last-seen status so a fresh "completed" transition —
    // the driver just slid to end the trip — can be told apart from a ride
    // that was already sitting completed on a previous poll (which shouldn't
    // yank the rider into checkout again on every 6s refresh).
    const lastStatusRef = useRef<Record<string, string>>({});

    const loadRides = () => {
        if (!user) { setLoading(false); return; }
        fetch("/api/rides", { headers: authHeaders() })
            .then(r => r.ok ? r.json() : null)
            .then(d => {
                const list = d?.rides || [];
                // A ding when a NEW offer lands — polling-diff based, not a push
                // socket, but real: it fires exactly once per genuinely new offer.
                for (const r of list) {
                    const count = (r.offers || []).length;
                    const prev = offerCountRef.current[r.id] ?? count;
                    if (count > prev) playDingSound();
                    offerCountRef.current[r.id] = count;
                }

                // The driver just slid to end this exact trip — take the rider
                // straight to checkout instead of making them notice a
                // notification and tap it themselves.
                for (const r of list) {
                    const prevStatus = lastStatusRef.current[r.id];
                    if (prevStatus && prevStatus !== "completed" && r.status === "completed" && !r.paidAt) {
                        router.push(`/ride/${r.id}/pay`);
                    }
                    lastStatusRef.current[r.id] = r.status;
                }

                setRides(list);
            })
            .finally(() => setLoading(false));
    };

    useEffect(() => { loadRides(); const t = setInterval(loadRides, 6000); return () => clearInterval(t); }, [user]);

    useEffect(() => {
        if (!user) return;
        fetch("/api/rides?mode=driver", { headers: authHeaders() })
            .then(r => r.ok ? r.json() : null)
            .then(d => setHasApprovedVehicle(!!d && !d.needsApprovedVehicle))
            .catch(() => {});
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    // Recompute the distance-based fare suggestion as pickup/dropoff/stops/
    // vehicle class settle. Stops used to be silently dropped from this calc
    // entirely — a 3-stop trip priced identically to a direct one — so this
    // now sums each leg (pickup → stop 1 → ... → dropoff) instead of just
    // the endpoints. Tries Google Maps first (if a key is configured), then
    // falls back to a free, no-key distance estimate — the Maps key was
    // never actually provisioned in this app, which is the real reason the
    // price never used to adjust at all, not a data problem.
    useEffect(() => {
        const validStops = stops.filter(s => s.address.trim().length > 0);
        // Each leg carries its own already-resolved coords (pickup/dropoff/stop)
        // when the rider picked it from the suggestions dropdown — see the
        // pickupCoords comment below for why re-geocoding the address STRING
        // instead is what caused the 64km/₦44,700 fare bug.
        const route: { address: string; coords?: { lat: number; lng: number } }[] = [
            { address: pickup.trim(), coords: pickupCoords },
            ...validStops.map(s => ({ address: s.address.trim(), coords: s.coords })),
            { address: dropoff.trim(), coords: dropoffCoords },
        ];
        const routeAddresses = route.map(r => r.address);
        if (routeAddresses.some(a => a.length < 4)) return;
        let cancelled = false;
        const t = setTimeout(async () => {
            let km: number | null = null;

            if (hasGoogleMapsKey) {
                const g = await loadGoogleMaps()?.catch(() => null);
                if (g && window.google?.maps) {
                    const geocoder = new window.google.maps.Geocoder();
                    // Pickup/dropoff/stop use the exact coordinates the rider picked
                    // from the suggestions dropdown when available, instead of
                    // re-geocoding the address STRING — that string can be a
                    // synthesized "<landmark name>, <formatted address>" combo
                    // (see usePlacesAutocomplete) that reads as two different
                    // places at once, and re-geocoding it can resolve to the
                    // wrong one.
                    const points = await Promise.all(
                        route.map(r => r.coords ? Promise.resolve(r.coords) : cachedGeocode(geocoder, `${r.address}, Nigeria`))
                    );
                    if (!points.some(p => !p)) {
                        const directionsService = new window.google.maps.DirectionsService();
                        let total = 0;
                        let ok = true;
                        for (let i = 0; i < points.length - 1; i++) {
                            const leg = await cachedDirections(directionsService, points[i]!, points[i + 1]!, window.google.maps.TravelMode.DRIVING);
                            if (!leg) { ok = false; break; }
                            total += leg.distanceMeters / 1000;
                        }
                        if (ok) km = total;
                    }
                }
            }

            if (km == null) {
                km = await freeRouteDistanceKm(routeAddresses);
            }

            if (cancelled || km == null) return;
            setRouteDistanceKm(km);
            const suggestion = estimateRideFare(km, vehicleClassPref);
            setSuggestedFare(suggestion);
            if (!fareTouched) setFare(suggestion);
        }, 800);
        return () => { cancelled = true; clearTimeout(t); };
    }, [pickup, dropoff, stops, vehicleClassPref, fareTouched, pickupCoords, dropoffCoords]);

    const swapPickupDropoff = () => {
        setPickup(dropoff);
        setDropoff(pickup);
        setPickupCoords(dropoffCoords);
        setDropoffCoords(pickupCoords);
        setPickupIsMyLocation(false);
    };

    const postRide = async () => {
        setError(null);
        if (!pickup || !dropoff) { setError("Enter pickup and drop-off."); return; }
        if (!fare || fare <= 0) { setError("Enter what you're willing to pay."); return; }
        setPosting(true);
        const validStops = stops.map(s => s.address.trim()).filter(Boolean);
        const combinedDropoff = validStops.length ? [...validStops, dropoff].join(" → ") : dropoff;
        try {
            const res = await fetch("/api/rides", {
                method: "POST",
                headers: { "Content-Type": "application/json", ...authHeaders() },
                body: JSON.stringify({
                    pickup, dropoff: combinedDropoff, proposedFare: fare,
                    vehicleClassPref: vehicleClassPref || undefined,
                    pickupState: location,
                    autoAcceptMax: autoAccept ? fare : undefined,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || "Could not post ride");
            setPickup(""); setDropoff(""); setStops([]);
            setLastVisibleDrivers(typeof data.visibleDrivers === "number" ? data.visibleDrivers : null);
            loadRides();
        } catch (e: any) {
            setError(e.message);
        } finally {
            setPosting(false);
        }
    };

    const acceptOffer = async (rideId: string, offerId: string) => {
        await fetch(`/api/rides/${rideId}/offers/${offerId}/accept`, { method: "POST", headers: authHeaders() });
        loadRides();
    };

    const [ratingSubmitting, setRatingSubmitting] = useState<string | null>(null);
    const rateRide = async (rideId: string, rating: number) => {
        setRatingSubmitting(rideId);
        try {
            await fetch(`/api/rides/${rideId}/rate`, {
                method: "POST",
                headers: { "Content-Type": "application/json", ...authHeaders() },
                body: JSON.stringify({ rating }),
            });
            loadRides();
        } finally {
            setRatingSubmitting(null);
        }
    };

    const raiseFare = async (ride: any, amount: number) => {
        const newFare = Math.max(FARE_STEP, ride.proposedFare + amount);
        setRides(prev => prev.map(r => r.id === ride.id ? { ...r, proposedFare: newFare } : r));
        await fetch(`/api/rides/${ride.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", ...authHeaders() },
            body: JSON.stringify({ proposedFare: newFare }),
        });
    };

    const cancelRide = async (rideId: string, reason: string) => {
        await fetch(`/api/rides/${rideId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", ...authHeaders() },
            body: JSON.stringify({ status: "cancelled", cancelReason: reason }),
        });
        setCancelTarget(null);
        loadRides();
    };

    const activeRides = rides.filter(r => r.status !== "completed" && r.status !== "cancelled");
    // Share MY position for whichever ride is actually matched, so the
    // driver's map can show where I am too — inDrive/AMap both do this
    // two-way, not just "watch the driver".
    //
    // This hook — and the computations feeding it — MUST run before the
    // `!user` early return below, not after it. A hook called only on some
    // renders of the same mounted component (here: only once `user` becomes
    // truthy, which happens asynchronously after AuthContext resolves) is a
    // hard React crash — "Rendered more hooks than during the previous
    // render" — not a lint nitpick. That crash is exactly what a real
    // signed-in visitor hit in production on this page.
    const matchedRide = activeRides.find(r => r.status === "matched" || r.status === "in_progress");
    useLocationBroadcast(matchedRide?.id || null, !!matchedRide);

    if (!user) {
        return (
            <div className="min-h-screen flex flex-col">
                <Navbar />
                <div className="flex-1 flex items-center justify-center p-8 text-center" style={{ paddingTop: headerOffset }}>
                    <div>
                        <p className="font-bold text-gray-900 mb-4">Sign in to book a ride</p>
                        <Button onClick={() => router.push("/login?redirect=/ride")}>Sign In</Button>
                    </div>
                </div>
                <Footer />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white font-sans">
            <Navbar />

            {/* City confirm — the one honest version of inDrive's "Are you in
                Lagos?" prompt we can build without a Maps SDK reverse-geocoding
                a live GPS fix: confirm the state already selected app-wide. */}
            <AnimatePresence>
                {confirmingCity && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-sm flex items-end sm:items-center justify-center"
                        onClick={() => setConfirmingCity(false)}
                    >
                        <motion.div
                            initial={{ y: 60 }} animate={{ y: 0 }} exit={{ y: 60 }}
                            className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl p-6 text-center"
                            style={{
                                background: "linear-gradient(145deg, rgba(255,255,255,0.92) 0%, rgba(240,253,244,0.9) 100%)",
                                backdropFilter: "blur(40px) saturate(180%)",
                                WebkitBackdropFilter: "blur(40px) saturate(180%)",
                                border: "1px solid rgba(255,255,255,0.7)",
                                boxShadow: "0 -8px 40px rgba(16,24,40,0.15)",
                            }}
                            onClick={e => e.stopPropagation()}
                        >
                            <Car className="h-10 w-10 text-brand-green-600 mx-auto mb-3" />
                            {pickingState ? (
                                <>
                                    <h2 className="text-lg font-black text-gray-900 mb-3">Which state are you in?</h2>
                                    <select
                                        value={location}
                                        onChange={e => { setLocation(e.target.value); setPickingState(false); setConfirmingCity(false); }}
                                        className="w-full h-11 px-3 rounded-xl border border-gray-200 text-sm mb-2"
                                        autoFocus
                                    >
                                        {NIGERIAN_STATES.map(s => <option key={s.state} value={s.state}>{s.state}</option>)}
                                    </select>
                                </>
                            ) : (
                                <>
                                    <h2 className="text-lg font-black text-gray-900 mb-1">Are you in {location}?</h2>
                                    <p className="text-xs text-gray-500 mb-5">We'll show you drivers based on this.</p>
                                    <div className="flex gap-2">
                                        <Button variant="outline" className="flex-1 h-11 rounded-xl" onClick={() => setPickingState(true)}>
                                            Change
                                        </Button>
                                        <Button className="flex-1 h-11 rounded-xl bg-brand-green-600 hover:bg-brand-green-700" onClick={() => setConfirmingCity(false)}>
                                            Yes, that's right
                                        </Button>
                                    </div>
                                </>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="max-w-2xl mx-auto px-4 sm:px-6 pb-8" style={{ paddingTop: headerOffset + 24 }}>
                <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-3">
                        <Car className="h-6 w-6 text-brand-green-700" />
                        <h1 className="text-2xl font-black text-gray-900">Book a Ride</h1>
                    </div>
                    <div className="flex items-center bg-gray-100 rounded-full p-1 text-xs font-black shrink-0">
                        <span className="px-3 py-1.5 rounded-full bg-white text-gray-900 shadow-sm">Passenger</span>
                        <button
                            onClick={() => router.push(hasApprovedVehicle ? "/drive/dashboard" : "/drive/onboarding")}
                            className="px-3 py-1.5 rounded-full text-gray-500 hover:text-gray-700"
                        >
                            Driver
                        </button>
                    </div>
                </div>
                <p className="text-sm text-gray-500 mb-6">Name your price. Nearby drivers will send you offers — you pick the one you want.</p>
                {!hasApprovedVehicle && (
                    <p className="text-xs text-gray-400 -mt-4 mb-6">
                        Going somewhere anyway? <button onClick={() => router.push("/drive/onboarding")} className="text-brand-green-600 font-bold underline">Register your car</button> and pick up riders headed your way.
                    </p>
                )}

                <BookingMap pickup={pickup} dropoff={dropoff} pickupCoords={pickupCoords} dropoffCoords={dropoffCoords} />

                <div className="bg-gray-50 rounded-2xl p-5 space-y-3 mb-8">
                    {/* Grouped like a real ride app's route card: pickup/stops/
                        drop-off stacked in one bordered box, with a swap and an
                        add-stop control docked on the right instead of a
                        standalone "Add stop" pill taking its own row. Swap only
                        ever exchanges pickup ↔ drop-off — stops keep their own
                        position in between either way. */}
                    <div className="relative bg-white rounded-2xl border border-gray-200 pr-12">
                        <div className="divide-y divide-gray-100">
                            <div className="relative flex items-center">
                                <MapPin fill="currentColor" strokeWidth={1.5} className="absolute left-3 h-4 w-4 text-brand-green-600 pointer-events-none" />
                                <Input
                                    ref={pickupAutocomplete.inputRef}
                                    placeholder="Pickup location"
                                    value={pickupIsMyLocation ? "My Location" : pickup}
                                    // Reveal the real address on focus so a keystroke edits
                                    // from there, not from the literal text "My Location" —
                                    // otherwise the first character typed would land inside
                                    // that label instead of a fresh, editable address.
                                    onFocus={() => { if (pickupIsMyLocation) setPickupIsMyLocation(false); }}
                                    onChange={e => { setPickup(e.target.value); setPickupIsMyLocation(false); setPickupCoords(undefined); }}
                                    className={cn("pl-9 border-0 bg-transparent focus-visible:ring-0", pickupIsMyLocation && "text-brand-green-700 font-bold")}
                                />
                            </div>

                            {/* Stop inputs render here — between pickup and drop-off,
                                matching the actual order a driver would visit them in. */}
                            {stops.map((stop, i) => (
                                <StopInput
                                    key={i}
                                    value={stop.address}
                                    placeholder={`Stop ${i + 1}`}
                                    onChange={(v, coords) => setStops(s => s.map((val, idx) => idx === i ? { address: v, coords } : val))}
                                    onRemove={() => setStops(s => s.filter((_, idx) => idx !== i))}
                                />
                            ))}

                            <div className="relative flex items-center">
                                <MapPin fill="currentColor" strokeWidth={1.5} className="absolute left-3 h-4 w-4 text-rose-500 pointer-events-none" />
                                <Input
                                    ref={dropoffAutocomplete.inputRef}
                                    placeholder="Where are you going?"
                                    value={dropoff}
                                    onChange={e => { setDropoff(e.target.value); setDropoffCoords(undefined); }}
                                    className="pl-9 border-0 bg-transparent focus-visible:ring-0 placeholder:font-bold placeholder:text-gray-900"
                                />
                            </div>
                        </div>

                        {/* Right-side action rail */}
                        <div className="absolute right-1.5 top-0 bottom-0 flex flex-col items-center justify-center gap-2">
                            <button
                                type="button"
                                onClick={swapPickupDropoff}
                                title="Swap pickup and drop-off"
                                className="h-8 w-8 rounded-full bg-gray-50 hover:bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-500 active:scale-90 transition-transform"
                            >
                                <ArrowUpDown className="h-3.5 w-3.5" />
                            </button>
                            <button
                                type="button"
                                onClick={() => setStops(s => [...s, { address: "" }])}
                                title="Add a stop"
                                className="h-8 w-8 rounded-full bg-gray-50 hover:bg-gray-100 border border-gray-200 flex items-center justify-center text-brand-green-700 active:scale-90 transition-transform"
                            >
                                <Plus className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    {!pickupAutocomplete.supported && (
                        <p className="text-[11px] text-amber-600 -mt-1">
                            Address suggestions are unavailable right now — type the full address instead.
                        </p>
                    )}

                    {/* Vehicle type cards with a live fare range, AMAP-style — picking one
                        re-prices the trip (via the same vehicleClassPref the fare effect
                        already watches) instead of hiding the difference in a dropdown. */}
                    <div className="space-y-2">
                        {CLASSES.map(c => {
                            const selected = vehicleClassPref === c.value;
                            const est = routeDistanceKm != null ? estimateRideFare(routeDistanceKm, c.value) : null;
                            return (
                                <button
                                    key={c.value || "any"}
                                    type="button"
                                    onClick={() => setVehicleClassPref(c.value)}
                                    className={cn(
                                        "w-full flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors",
                                        selected ? "border-brand-green-500 bg-brand-green-50/60 ring-1 ring-brand-green-500" : "border-gray-200 bg-white"
                                    )}
                                >
                                    <Car className={cn("h-7 w-7 shrink-0", selected ? "text-brand-green-600" : "text-gray-400")} />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-gray-900">{c.label}</p>
                                        <p className="text-[11px] text-gray-500">{c.hint}</p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        {est != null ? (
                                            <>
                                                <p className="text-sm font-black text-gray-900">{formatPrice(Math.round(est * 0.92 / 100) * 100)}–{formatPrice(Math.round(est * 1.12 / 100) * 100)}</p>
                                                <p className="text-[10px] text-gray-400">Est. fare</p>
                                            </>
                                        ) : <p className="text-[11px] text-gray-400">Set a route</p>}
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    <div className="bg-white rounded-xl p-4">
                        <div className="flex items-center justify-between">
                            <button onClick={() => { setFareTouched(true); setFare(f => Math.max(FARE_STEP, f - FARE_STEP)); }} className="h-9 w-9 rounded-full bg-gray-100 flex items-center justify-center">
                                <Minus className="h-4 w-4" />
                            </button>
                            <div className="text-center">
                                <p className="text-2xl font-black text-gray-900">{formatPrice(fare)}</p>
                                <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">What you'll pay</p>
                            </div>
                            <button onClick={() => { setFareTouched(true); setFare(f => f + FARE_STEP); }} className="h-9 w-9 rounded-full bg-gray-100 flex items-center justify-center">
                                <Plus className="h-4 w-4" />
                            </button>
                        </div>
                        {suggestedFare != null && routeDistanceKm != null && (
                            <p className="text-[11px] text-gray-400 text-center mt-2">
                                Recommended {formatPrice(suggestedFare)} for {routeDistanceKm.toFixed(1)} km
                                {fareTouched && fare !== suggestedFare && (
                                    <button onClick={() => { setFareTouched(false); setFare(suggestedFare); }} className="ml-1.5 text-brand-green-600 font-bold underline">Use recommended</button>
                                )}
                            </p>
                        )}
                    </div>

                    <label className="flex items-center justify-between bg-white rounded-xl p-3 cursor-pointer">
                        <span className="text-xs font-bold text-gray-700">Auto-accept the first offer at or below this price</span>
                        <input type="checkbox" checked={autoAccept} onChange={e => setAutoAccept(e.target.checked)} className="h-5 w-5 accent-brand-green-600" />
                    </label>

                    {error && <p className="text-sm text-rose-600 font-semibold">{error}</p>}
                    <Button onClick={postRide} disabled={posting} className="w-full h-11 rounded-xl bg-brand-green-600 hover:bg-brand-green-700 font-black">
                        {posting ? "Posting..." : "Find a Driver"}
                    </Button>
                </div>

                {lastVisibleDrivers !== null && (
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-6 -mt-4">
                        <ShieldCheck className="h-3.5 w-3.5 text-brand-green-600" />
                        {lastVisibleDrivers > 0
                            ? `Visible to ${lastVisibleDrivers} verified driver${lastVisibleDrivers === 1 ? "" : "s"} in ${location}`
                            : `No approved drivers in ${location} yet for this vehicle class — try "Any vehicle" or check back soon.`}
                    </div>
                )}

                {loading ? (
                    <div className="py-10 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>
                ) : activeRides.length === 0 ? (
                    <p className="text-center text-sm text-gray-400 py-10">No active ride requests.</p>
                ) : (
                    <div className="space-y-6">
                        {activeRides.map(ride => (
                            <div key={ride.id} className="border border-gray-100 rounded-2xl p-5">
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <p className="font-bold text-gray-900 text-sm">{ride.pickup} → {ride.dropoff}</p>
                                        <p className="text-xs text-gray-500 mt-0.5">You proposed <span className="font-bold text-gray-700">{formatPrice(ride.proposedFare)}</span></p>
                                    </div>
                                    <span className={cn(
                                        "text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full",
                                        ride.status === "searching" ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"
                                    )}>
                                        {ride.status === "searching" ? "Notifying drivers to respond…" : ride.status === "in_progress" ? "In Progress" : ride.status}
                                    </span>
                                </div>

                                {ride.status === "searching" && (
                                    <div className="space-y-3">
                                        <RideMap rideId={ride.id} pickup={ride.pickup} dropoff={ride.dropoff} trackRole="driver" active={false} searching />
                                        <div className="flex items-center gap-2 text-[11px] text-gray-500">
                                            <ShieldCheck className="h-3.5 w-3.5 text-brand-green-600" />
                                            {ride.offers?.length > 0
                                                ? `${ride.offers.filter((o: any) => o.status === "pending").length} pending offer(s)`
                                                : "No offers yet — nearby drivers will see this shortly"}
                                        </div>

                                        {/* Each new counter-offer "floats up" into place — the same
                                            surfacing moment inDrive's map-pin bubbles create, just in
                                            our own list layout (no map to float over without a Maps
                                            key — see the note on Google Maps below) and brand colors. */}
                                        <AnimatePresence initial={false}>
                                            {ride.offers?.filter((o: any) => o.status === "pending").map((offer: any) => (
                                                <motion.div
                                                    key={offer.id}
                                                    layout
                                                    initial={{ opacity: 0, y: 24, scale: 0.92 }}
                                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                                    exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
                                                    transition={{ type: "spring", stiffness: 400, damping: 28 }}
                                                    className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 border border-brand-green-100"
                                                >
                                                    <div>
                                                        <p className="font-black text-gray-900">{formatPrice(offer.offeredFare)}</p>
                                                        <p className="text-[11px] text-gray-500">{offer.driver?.name} · {offer.vehicle?.make} {offer.vehicle?.model} ({offer.vehicle?.vehicleClass})</p>
                                                        {offer.message && <p className="text-[11px] text-gray-400 mt-0.5">"{offer.message}"</p>}
                                                    </div>
                                                    <Button size="sm" onClick={() => acceptOffer(ride.id, offer.id)} className="bg-brand-green-600 hover:bg-brand-green-700">Accept</Button>
                                                </motion.div>
                                            ))}
                                        </AnimatePresence>

                                        <div className="flex items-center gap-2 pt-1">
                                            <Button size="sm" variant="outline" onClick={() => raiseFare(ride, FARE_STEP)} className="flex-1 text-xs">
                                                Raise fare +{formatPrice(FARE_STEP)}
                                            </Button>
                                            <Button size="sm" variant="outline" onClick={() => setCancelTarget(ride.id)} className="text-xs border-rose-200 text-rose-600 hover:bg-rose-50">
                                                Cancel
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {(ride.status === "matched" || ride.status === "in_progress") && ride.driver && (
                                    <div className="space-y-3">
                                        <RideMap
                                            rideId={ride.id} pickup={ride.pickup} dropoff={ride.dropoff} trackRole="driver" active
                                            plateNumber={ride.vehicle?.plateNumber} vehicleColor={ride.vehicle?.color}
                                            legToPickup={ride.status === "matched"}
                                            onLive={(info) => setLiveByRide(prev => {
                                                const p = prev[ride.id];
                                                return p && p.km === info.km && p.min === info.min && p.arrived === info.arrived ? prev : { ...prev, [ride.id]: info };
                                            })}
                                        />
                                        <RideDriverPanel ride={ride} live={liveByRide[ride.id] || null} onCancel={() => setCancelTarget(ride.id)} />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {rides.filter(r => r.status === "completed" && !r.paidAt).map(ride => (
                    <div key={`pay-${ride.id}`} className="border border-emerald-200 bg-emerald-50/60 rounded-2xl p-5 mt-4 text-center">
                        <p className="text-sm font-bold text-gray-900">Trip complete — pay {formatPrice(ride.agreedFare)}</p>
                        <p className="text-xs text-gray-500 mt-0.5 mb-3">{ride.pickup} → {ride.dropoff}</p>
                        <Button onClick={() => router.push(`/ride/${ride.id}/pay`)} className="bg-emerald-600 hover:bg-emerald-700 rounded-2xl h-11 px-8">
                            Pay Now
                        </Button>
                    </div>
                ))}

                {rides.filter(r => r.status === "completed" && r.rating == null).map(ride => (
                    <div key={ride.id} className="border border-amber-100 bg-amber-50/50 rounded-2xl p-5 mt-4 text-center">
                        <p className="text-sm font-bold text-gray-900">How was your trip with {ride.driver?.name}?</p>
                        <p className="text-xs text-gray-500 mt-0.5 mb-3">{ride.pickup} → {ride.dropoff}</p>
                        <div className="flex items-center justify-center gap-1">
                            {[1, 2, 3, 4, 5].map(n => (
                                <button
                                    key={n}
                                    disabled={ratingSubmitting === ride.id}
                                    onClick={() => rateRide(ride.id, n)}
                                    className="p-1"
                                >
                                    <Star className="h-7 w-7 text-amber-400 hover:fill-amber-400 transition-colors" />
                                </button>
                            ))}
                        </div>
                    </div>
                ))}

                <p className="text-center text-xs text-gray-400 mt-4">
                    Have a car? <a href="/drive/onboarding" className="text-brand-green-600 font-bold underline">Register to drive</a> and start sending offers.
                </p>
                <p className="text-center text-xs text-gray-400 mt-1.5">
                    Need to send something instead? <a href="/send-package" className="text-brand-green-600 font-bold underline">Send a Package</a>.
                </p>
            </div>

            {/* Cancel-with-reason */}
            <AnimatePresence>
                {cancelTarget && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-sm flex items-end sm:items-center justify-center"
                        onClick={() => setCancelTarget(null)}
                    >
                        <motion.div
                            initial={{ y: 60 }} animate={{ y: 0 }} exit={{ y: 60 }}
                            className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl p-6"
                            style={{
                                background: "linear-gradient(145deg, rgba(255,255,255,0.92) 0%, rgba(240,253,244,0.9) 100%)",
                                backdropFilter: "blur(40px) saturate(180%)",
                                WebkitBackdropFilter: "blur(40px) saturate(180%)",
                                border: "1px solid rgba(255,255,255,0.7)",
                                boxShadow: "0 -8px 40px rgba(16,24,40,0.15)",
                            }}
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="font-black text-gray-900">Why cancel?</h2>
                                <button onClick={() => setCancelTarget(null)}><X className="h-5 w-5 text-gray-400" /></button>
                            </div>
                            <div className="space-y-2">
                                {CANCEL_REASONS.map(r => (
                                    <button
                                        key={r}
                                        onClick={() => cancelRide(cancelTarget, r)}
                                        className="w-full text-left px-4 py-3 rounded-xl bg-gray-50 hover:bg-gray-100 text-sm font-semibold text-gray-700"
                                    >
                                        {r}
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <Footer />
        </div>
    );
}
