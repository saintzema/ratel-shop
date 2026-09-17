"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Package, MapPin, Loader2, CheckCircle2, Minus, Plus, X, Star, ShieldCheck, ArrowUpDown } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { formatPrice, cn } from "@/lib/utils";
import { RideChat } from "@/components/ride/RideChat";
import { RideMap } from "@/components/ride/RideMap";
import { BookingMap } from "@/components/ride/BookingMap";
import { MaskedCallButton } from "@/components/ride/MaskedCallButton";
import { PaystackCheckout } from "@/components/payment/PaystackCheckout";
import { useLocationBroadcast } from "@/hooks/useLocationBroadcast";
import { usePlacesAutocomplete } from "@/hooks/usePlacesAutocomplete";
import { loadGoogleMaps, hasGoogleMapsKey } from "@/lib/google-maps";
import { cachedGeocode, cachedDirections } from "@/lib/geo-cache";
import { freeGeocode, approxRoadKm, freeReverseGeocode } from "@/lib/free-distance";
import { useHeaderOffset } from "@/lib/use-header-offset";

// A flat ₦/km rate is fine for a short in-city run but wildly overpriced for
// a real interstate haul — a flat ₦120/km put Abuja → Awka (~480km) at
// ~₦72,000, when real Nigerian courier pricing for exactly that route runs
// ₦15,000-₦20,000. Real logistics pricing is degressive: the rate per km
// drops sharply as distance grows (fixed costs amortize, and long routes are
// this industry's actual bread and butter, priced to be worth taking).
// Tiered instead of one flat rate: ₦150/km for the first 20km (in-city),
// ₦80/km for the next 80km (regional), ₦25/km beyond that (interstate) — a
// 480km trip now lands at ~₦19,200, right in the middle of the real range
// above, instead of nearly 4x it.
const SIZE_MULTIPLIER: Record<string, number> = { small: 1, medium: 1.3, large: 1.6 };
const FRAGILE_MULTIPLIER = 1.25;
const TIER_1_KM = 20, TIER_1_RATE = 150;
const TIER_2_KM = 100, TIER_2_RATE = 80;
const TIER_3_RATE = 25;
function distanceCost(distanceKm: number): number {
    if (distanceKm <= TIER_1_KM) return distanceKm * TIER_1_RATE;
    if (distanceKm <= TIER_2_KM) return TIER_1_KM * TIER_1_RATE + (distanceKm - TIER_1_KM) * TIER_2_RATE;
    return TIER_1_KM * TIER_1_RATE + (TIER_2_KM - TIER_1_KM) * TIER_2_RATE + (distanceKm - TIER_2_KM) * TIER_3_RATE;
}
function estimateFare(distanceKm: number, size: string, fragile: boolean): number {
    const raw = (300 + distanceCost(distanceKm)) * (SIZE_MULTIPLIER[size] || 1) * (fragile ? FRAGILE_MULTIPLIER : 1);
    return Math.max(500, Math.round(raw / 100) * 100);
}

const SIZES = [
    { value: "small", label: "Small (envelope, small box)" },
    { value: "medium", label: "Medium (shoebox, bag)" },
    { value: "large", label: "Large (multiple boxes, furniture)" },
];

const CANCEL_REASONS = ["Found another courier", "Taking too long", "Wrong pickup or drop-off", "Changed my mind", "Other"];
const FARE_STEP = 200;

/**
 * The logistics side of the same inDrive-style marketplace as /ride: the
 * SENDER names what they're willing to pay, any signed-in user can counter
 * with their own price as courier, the sender picks whichever offer they
 * want. No live map yet — same lean-first approach ride-hailing itself
 * started with before RideMap was added.
 */
export default function SendPackagePage() {
    const { user } = useAuth();
    const router = useRouter();
    const headerOffset = useHeaderOffset();

    const [pickup, setPickup] = useState("");
    const [dropoff, setDropoff] = useState("");
    // Shows "My Location" in the field while `pickup` itself still holds the
    // real address underneath — see the identical pattern on /ride.
    const [pickupIsMyLocation, setPickupIsMyLocation] = useState(false);
    // The picked suggestion's own lat/lng — see the identical fix (and full
    // rationale) on /ride, which traced a 64km/₦44,700 fare on an actual
    // 11km trip to re-geocoding a synthesized "<name>, <formatted address>"
    // string instead of using the coordinates already resolved by the
    // dropdown pick.
    const [pickupCoords, setPickupCoords] = useState<{ lat: number; lng: number } | undefined>(undefined);
    const [dropoffCoords, setDropoffCoords] = useState<{ lat: number; lng: number } | undefined>(undefined);
    const pickupAutocomplete = usePlacesAutocomplete((address, coords) => { setPickup(address); setPickupIsMyLocation(false); setPickupCoords(coords); });
    const dropoffAutocomplete = usePlacesAutocomplete((address, coords) => { setDropoff(address); setDropoffCoords(coords); });

    // Prefill pickup with the sender's actual precise location — see the
    // identical effect on /ride for the full rationale. Only fills an EMPTY
    // field and fails silently.
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

    const [packageDescription, setPackageDescription] = useState("");
    const [packageSize, setPackageSize] = useState("small");
    const [isFragile, setIsFragile] = useState(false);
    const [recipientName, setRecipientName] = useState("");
    const [recipientPhone, setRecipientPhone] = useState("");
    const [fare, setFare] = useState(1000);
    const [suggestedFare, setSuggestedFare] = useState<number | null>(null);
    const [routeDistanceKm, setRouteDistanceKm] = useState<number | null>(null);
    // Once the sender touches the +/- controls themselves, stop silently
    // overwriting their choice every time the route recalculates.
    const [fareTouched, setFareTouched] = useState(false);
    const [autoAccept, setAutoAccept] = useState(false);
    const [posting, setPosting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [deliveries, setDeliveries] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [cancelTarget, setCancelTarget] = useState<string | null>(null);

    const authHeaders = (): Record<string, string> => {
        const tok = typeof window !== "undefined" ? localStorage.getItem("fp_token") : null;
        return tok ? { Authorization: `Bearer ${tok}` } : {};
    };

    const loadDeliveries = () => {
        fetch("/api/deliveries", { headers: authHeaders() })
            .then(r => r.ok ? r.json() : null)
            .then(d => setDeliveries(d?.deliveries || []))
            .finally(() => setLoading(false));
    };

    useEffect(() => { loadDeliveries(); const t = setInterval(loadDeliveries, 6000); return () => clearInterval(t); }, [user]);

    const [hasCourierHistory, setHasCourierHistory] = useState(false);
    useEffect(() => {
        if (!user) return;
        fetch("/api/deliveries?mode=courier", { headers: authHeaders() })
            .then(r => r.ok ? r.json() : null)
            .then(d => setHasCourierHistory(Array.isArray(d?.myActiveDeliveries) && d.myActiveDeliveries.length > 0))
            .catch(() => {});
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    // Recompute the distance-based suggestion as pickup/dropoff/size/fragility
    // settle. Tries Google Maps first (if a key is configured — it never was
    // in this app, which is the real reason this used to never fire at all),
    // then falls back to a free, no-key distance estimate so the price
    // actually moves regardless.
    useEffect(() => {
        if (pickup.trim().length < 4 || dropoff.trim().length < 4) return;
        let cancelled = false;
        const t = setTimeout(async () => {
            let km: number | null = null;

            if (hasGoogleMapsKey) {
                const g = await loadGoogleMaps()?.catch(() => null);
                if (g && window.google?.maps) {
                    const geocoder = new window.google.maps.Geocoder();
                    // Prefer the coordinates already resolved by the Places dropdown
                    // pick over re-geocoding the address STRING — see the pickupCoords
                    // comment above and the identical /ride fix for why that string
                    // re-geocode can land on the wrong place entirely.
                    const [pickupLoc, dropoffLoc] = await Promise.all([
                        pickupCoords ?? cachedGeocode(geocoder, `${pickup}, Nigeria`),
                        dropoffCoords ?? cachedGeocode(geocoder, `${dropoff}, Nigeria`),
                    ]);
                    if (pickupLoc && dropoffLoc) {
                        const directionsService = new window.google.maps.DirectionsService();
                        const route = await cachedDirections(directionsService, pickupLoc, dropoffLoc, window.google.maps.TravelMode.DRIVING);
                        if (route) km = route.distanceMeters / 1000;
                    }
                }
            }

            if (km == null) {
                const [pickupLoc, dropoffLoc] = await Promise.all([
                    pickupCoords ?? freeGeocode(`${pickup}, Nigeria`),
                    dropoffCoords ?? freeGeocode(`${dropoff}, Nigeria`),
                ]);
                if (pickupLoc && dropoffLoc) km = approxRoadKm(pickupLoc, dropoffLoc);
            }

            if (cancelled || km == null) return;
            setRouteDistanceKm(km);
            const suggestion = estimateFare(km, packageSize, isFragile);
            setSuggestedFare(suggestion);
            if (!fareTouched) setFare(suggestion);
        }, 800);
        return () => { cancelled = true; clearTimeout(t); };
    }, [pickup, dropoff, packageSize, isFragile, fareTouched, pickupCoords, dropoffCoords]);

    const postDelivery = async () => {
        setError(null);
        if (!pickup || !dropoff) { setError("Enter pickup and drop-off"); return; }
        if (!packageDescription) { setError("Describe what you're sending"); return; }
        setPosting(true);
        try {
            const res = await fetch("/api/deliveries", {
                method: "POST",
                headers: { "Content-Type": "application/json", ...authHeaders() },
                body: JSON.stringify({
                    pickup, dropoff,
                    // Flagged in the description so the courier sees it before
                    // accepting — no dedicated fragile column on DeliveryRequest,
                    // and this is exactly the kind of handling note that belongs
                    // in a description anyway.
                    packageDescription: isFragile ? `⚠️ Fragile/Electronics — ${packageDescription}` : packageDescription,
                    packageSize,
                    recipientName: recipientName || undefined, recipientPhone: recipientPhone || undefined,
                    proposedFare: fare, autoAcceptMax: autoAccept ? fare : undefined,
                }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error || "Something went wrong"); return; }
            setPickup(""); setDropoff(""); setPackageDescription(""); setRecipientName(""); setRecipientPhone(""); setIsFragile(false);
            loadDeliveries();
        } finally {
            setPosting(false);
        }
    };

    const acceptOffer = async (deliveryId: string, offerId: string) => {
        await fetch(`/api/deliveries/${deliveryId}/offers/${offerId}/accept`, { method: "POST", headers: authHeaders() });
        loadDeliveries();
    };

    const [payingDelivery, setPayingDelivery] = useState<any | null>(null);
    const confirmDeliveryPayment = async (reference: string) => {
        if (!payingDelivery) return;
        await fetch(`/api/deliveries/${payingDelivery.id}/pay`, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...authHeaders() },
            body: JSON.stringify({ reference }),
        });
        setPayingDelivery(null);
        loadDeliveries();
    };

    const [ratingTarget, setRatingTarget] = useState<string | null>(null);
    const rateDelivery = async (deliveryId: string, rating: number) => {
        await fetch(`/api/deliveries/${deliveryId}/rate`, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...authHeaders() },
            body: JSON.stringify({ rating }),
        });
        setRatingTarget(null);
        loadDeliveries();
    };

    const raiseFare = async (delivery: any, step: number) => {
        await fetch(`/api/deliveries/${delivery.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", ...authHeaders() },
            body: JSON.stringify({ proposedFare: delivery.proposedFare + step }),
        });
        loadDeliveries();
    };

    const cancelDelivery = async (deliveryId: string, reason: string) => {
        await fetch(`/api/deliveries/${deliveryId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", ...authHeaders() },
            body: JSON.stringify({ status: "cancelled", cancelReason: reason }),
        });
        setCancelTarget(null);
        loadDeliveries();
    };

    const activeDeliveries = deliveries.filter(d => d.status !== "delivered" && d.status !== "cancelled");
    const pastDeliveries = deliveries.filter(d => d.status === "delivered" || d.status === "cancelled");
    // Share MY position for whichever delivery is actually matched, so the
    // courier's map can show where I am too — same two-way tracking as rides.
    //
    // This hook (and the computations feeding it) MUST run before the
    // `!user` early return below. A hook called on only SOME renders of the
    // same mounted component — here, only once `user` becomes truthy after
    // AuthContext resolves asynchronously — is a hard React crash
    // ("Rendered more hooks than during the previous render"), not a lint
    // nitpick. That crash is exactly what a real signed-in visitor hit in
    // production on this page (and the identical /ride page, same bug).
    const matchedDelivery = activeDeliveries.find(d => d.status === "matched" || d.status === "picked_up");
    useLocationBroadcast(matchedDelivery?.id || null, !!matchedDelivery, "delivery");

    if (!user) {
        return (
            <div className="min-h-screen flex flex-col">
                <Navbar />
                <div className="flex-1 flex items-center justify-center p-8 text-center" style={{ paddingTop: headerOffset }}>
                    <Button onClick={() => router.push("/login?redirect=/send-package")}>Sign In to Send a Package</Button>
                </div>
                <Footer />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white font-sans">
            <Navbar />

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
                                        onClick={() => cancelDelivery(cancelTarget, r)}
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

            <div className="max-w-2xl mx-auto px-4 sm:px-6 pb-8" style={{ paddingTop: headerOffset + 24 }}>
                <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-3">
                        <Package className="h-6 w-6 text-brand-green-700" />
                        <h1 className="text-2xl font-black text-gray-900">Send a Package</h1>
                    </div>
                    <div className="flex items-center bg-gray-100 rounded-full p-1 text-xs font-black shrink-0">
                        <span className="px-3 py-1.5 rounded-full bg-white text-gray-900 shadow-sm">Sender</span>
                        <button onClick={() => router.push("/deliver/dashboard")} className="px-3 py-1.5 rounded-full text-gray-500 hover:text-gray-700">
                            Courier
                        </button>
                    </div>
                </div>
                <p className="text-sm text-gray-500 mb-6">Name your price. Nearby couriers will send you offers — you pick the one you want.</p>
                {!hasCourierHistory && (
                    <p className="text-xs text-gray-400 -mt-4 mb-6">
                        Going somewhere anyway? <button onClick={() => router.push("/deliver/dashboard")} className="text-brand-green-600 font-bold underline">Carry a package</button> and earn on your route.
                    </p>
                )}

                <BookingMap pickup={pickup} dropoff={dropoff} pickupCoords={pickupCoords} dropoffCoords={dropoffCoords} />

                <div className="bg-gray-50 rounded-2xl p-5 space-y-3 mb-8">
                    <div className="relative bg-white rounded-2xl border border-gray-200 pr-12">
                        <div className="divide-y divide-gray-100">
                            <div className="relative flex items-center">
                                <MapPin fill="currentColor" strokeWidth={1.5} className="absolute left-3 h-4 w-4 text-brand-green-600 pointer-events-none" />
                                <Input
                                    ref={pickupAutocomplete.inputRef}
                                    placeholder="Pickup location"
                                    value={pickupIsMyLocation ? "My Location" : pickup}
                                    onFocus={() => { if (pickupIsMyLocation) setPickupIsMyLocation(false); }}
                                    onChange={e => { setPickup(e.target.value); setPickupIsMyLocation(false); setPickupCoords(undefined); }}
                                    className={cn("pl-9 border-0 bg-transparent focus-visible:ring-0", pickupIsMyLocation && "text-brand-green-700 font-bold")}
                                />
                            </div>
                            <div className="relative flex items-center">
                                <MapPin fill="currentColor" strokeWidth={1.5} className="absolute left-3 h-4 w-4 text-rose-500 pointer-events-none" />
                                <Input ref={dropoffAutocomplete.inputRef} placeholder="Where's it going?" value={dropoff} onChange={e => { setDropoff(e.target.value); setDropoffCoords(undefined); }} className="pl-9 border-0 bg-transparent focus-visible:ring-0 placeholder:font-bold placeholder:text-gray-900" />
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => { setPickup(dropoff); setDropoff(pickup); setPickupCoords(dropoffCoords); setDropoffCoords(pickupCoords); setPickupIsMyLocation(false); }}
                            title="Swap pickup and drop-off"
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-gray-50 hover:bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-500 active:scale-90 transition-transform"
                        >
                            <ArrowUpDown className="h-3.5 w-3.5" />
                        </button>
                    </div>
                    {!pickupAutocomplete.supported && (
                        <p className="text-[11px] text-amber-600 -mt-1">
                            Address suggestions are unavailable right now — type the full address instead.
                        </p>
                    )}
                    <Input placeholder="What are you sending? (e.g. documents, a phone)" value={packageDescription} onChange={e => setPackageDescription(e.target.value)} className="bg-white" />
                    <div className="grid grid-cols-3 gap-2">
                        {SIZES.map(s => (
                            <button
                                key={s.value}
                                onClick={() => setPackageSize(s.value)}
                                className={cn(
                                    "px-2 py-2 rounded-xl text-[11px] font-bold border",
                                    packageSize === s.value ? "bg-brand-green-600 text-white border-brand-green-600" : "bg-white text-gray-600 border-gray-200"
                                )}
                            >
                                {s.label.split(" (")[0]}
                            </button>
                        ))}
                    </div>
                    <button
                        type="button"
                        onClick={() => setIsFragile(v => !v)}
                        className={cn(
                            "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold border text-left",
                            isFragile ? "bg-amber-50 border-amber-300 text-amber-700" : "bg-white border-gray-200 text-gray-600"
                        )}
                    >
                        <span>Contains electronics or fragile items (phone, laptop, glass, etc.)</span>
                        <span className={cn("shrink-0 h-5 w-9 rounded-full relative transition-colors ml-2", isFragile ? "bg-amber-500" : "bg-gray-200")}>
                            <span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform", isFragile ? "translate-x-4" : "translate-x-0.5")} />
                        </span>
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                        <Input placeholder="Recipient name (optional)" value={recipientName} onChange={e => setRecipientName(e.target.value)} className="bg-white" />
                        <Input placeholder="Recipient phone (optional)" value={recipientPhone} onChange={e => setRecipientPhone(e.target.value)} className="bg-white" />
                    </div>

                    <div className="bg-white rounded-xl px-4 py-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-gray-700">What you'll pay</span>
                            <div className="flex items-center gap-3">
                                <button onClick={() => { setFareTouched(true); setFare(f => Math.max(200, f - 100)); }} className="h-7 w-7 rounded-full bg-gray-100 flex items-center justify-center"><Minus className="h-3.5 w-3.5" /></button>
                                <span className="font-black text-gray-900 w-20 text-center">{formatPrice(fare)}</span>
                                <button onClick={() => { setFareTouched(true); setFare(f => f + 100); }} className="h-7 w-7 rounded-full bg-gray-100 flex items-center justify-center"><Plus className="h-3.5 w-3.5" /></button>
                            </div>
                        </div>
                        {suggestedFare != null && routeDistanceKm != null && (
                            <p className="text-[11px] text-gray-400 mt-1.5">
                                Suggested {formatPrice(suggestedFare)} for {routeDistanceKm.toFixed(1)} km
                                {fareTouched && fare !== suggestedFare && (
                                    <button onClick={() => { setFareTouched(false); setFare(suggestedFare); }} className="ml-1.5 text-brand-green-600 font-bold underline">Use suggested</button>
                                )}
                            </p>
                        )}
                    </div>
                    <label className="flex items-center gap-2 text-xs text-gray-500 px-1">
                        <input type="checkbox" checked={autoAccept} onChange={e => setAutoAccept(e.target.checked)} />
                        Auto-accept the first offer at or below this price
                    </label>

                    {error && <p className="text-xs text-rose-600 font-semibold px-1">{error}</p>}
                    <Button onClick={postDelivery} disabled={posting} className="w-full bg-brand-green-600 hover:bg-brand-green-700 h-11">
                        {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Find a Courier"}
                    </Button>
                </div>

                {loading ? (
                    <div className="py-10 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-gray-300" /></div>
                ) : activeDeliveries.length > 0 && (
                    <div className="space-y-6 mb-10">
                        {activeDeliveries.map(delivery => (
                            <div key={delivery.id} className="border border-gray-100 rounded-2xl p-5">
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <p className="font-bold text-gray-900 text-sm">{delivery.pickup} → {delivery.dropoff}</p>
                                        <p className="text-xs text-gray-500 mt-0.5">{delivery.packageDescription} · You proposed <span className="font-bold text-gray-700">{formatPrice(delivery.proposedFare)}</span></p>
                                    </div>
                                    <span className={cn(
                                        "text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full",
                                        delivery.status === "searching" ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"
                                    )}>
                                        {delivery.status === "searching" ? "Waiting for offers" : delivery.status.replace("_", " ")}
                                    </span>
                                </div>

                                {delivery.status === "searching" && (
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 text-[11px] text-gray-500">
                                            <Package className="h-3.5 w-3.5 text-brand-green-600" />
                                            {delivery.offers?.length > 0
                                                ? `${delivery.offers.filter((o: any) => o.status === "pending").length} pending offer(s)`
                                                : "No offers yet — nearby couriers will see this shortly"}
                                        </div>
                                        <AnimatePresence initial={false}>
                                            {delivery.offers?.filter((o: any) => o.status === "pending").map((offer: any) => (
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
                                                        <p className="text-[11px] text-gray-500">{offer.courier?.name}</p>
                                                        {offer.message && <p className="text-[11px] text-gray-400 mt-0.5">"{offer.message}"</p>}
                                                    </div>
                                                    <Button size="sm" onClick={() => acceptOffer(delivery.id, offer.id)} className="bg-brand-green-600 hover:bg-brand-green-700">Accept</Button>
                                                </motion.div>
                                            ))}
                                        </AnimatePresence>
                                        <div className="flex items-center gap-2 pt-1">
                                            <Button size="sm" variant="outline" onClick={() => raiseFare(delivery, FARE_STEP)} className="flex-1 text-xs">
                                                Raise fare +{formatPrice(FARE_STEP)}
                                            </Button>
                                            <Button size="sm" variant="outline" onClick={() => setCancelTarget(delivery.id)} className="text-xs border-rose-200 text-rose-600 hover:bg-rose-50">
                                                Cancel
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {(delivery.status === "matched" || delivery.status === "picked_up") && delivery.courier && (
                                    <div className="space-y-3">
                                        {delivery.status === "matched" && delivery.pickupCode && (
                                            <div className="bg-gray-900 rounded-xl px-4 py-3 flex items-center justify-between">
                                                <div>
                                                    <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Pickup Code</p>
                                                    <p className="text-xl font-black text-white tracking-[0.2em]">{delivery.pickupCode}</p>
                                                </div>
                                                <p className="text-[11px] text-gray-400 max-w-[160px] text-right">Read the last 2 digits to your courier when they arrive</p>
                                            </div>
                                        )}
                                        <div className="flex items-center justify-between gap-2 flex-wrap">
                                            <div className="flex items-center gap-2 text-sm text-emerald-700 font-bold">
                                                <CheckCircle2 className="h-4 w-4" />
                                                {delivery.status === "picked_up" ? "Package picked up" : "Matched"} with {delivery.courier.name} · {formatPrice(delivery.agreedFare)}
                                            </div>
                                            <MaskedCallButton kind="delivery" tripId={delivery.id} label="Call Courier" />
                                        </div>
                                        {delivery.escrowStatus === "held" || delivery.escrowStatus === "released" ? (
                                            <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-3 py-2 rounded-xl">
                                                <ShieldCheck className="h-3.5 w-3.5" />
                                                {delivery.escrowStatus === "released" ? "Payment released to courier" : `${formatPrice(delivery.agreedFare)} paid into escrow`}
                                            </div>
                                        ) : (
                                            <Button size="sm" onClick={() => setPayingDelivery(delivery)} className="w-full bg-brand-green-600 hover:bg-brand-green-700">
                                                <ShieldCheck className="h-4 w-4 mr-1.5" /> Pay {formatPrice(delivery.agreedFare)} into Escrow
                                            </Button>
                                        )}
                                        <RideMap rideId={delivery.id} pickup={delivery.pickup} dropoff={delivery.dropoff} trackRole="courier" kind="delivery" active />
                                        {delivery.conversationId && <RideChat conversationId={delivery.conversationId} />}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {pastDeliveries.filter(d => d.status === "delivered" && d.rating == null).map(delivery => (
                    <div key={delivery.id} className="border border-amber-100 bg-amber-50/50 rounded-2xl p-5 mb-4">
                        <p className="text-sm font-bold text-gray-900 mb-2">Rate your delivery: {delivery.pickup} → {delivery.dropoff}</p>
                        <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map(n => (
                                <button key={n} onClick={() => rateDelivery(delivery.id, n)}>
                                    <Star className="h-6 w-6 text-amber-400 hover:fill-amber-400 transition-colors" />
                                </button>
                            ))}
                        </div>
                    </div>
                ))}

                <p className="text-center text-xs text-gray-400 mt-10">
                    Have a route to run? <a href="/deliver/dashboard" className="text-brand-green-600 font-bold underline">Carry a package</a> and earn along the way.
                </p>
            </div>
            {payingDelivery && (
                <PaystackCheckout
                    amount={Math.round(payingDelivery.agreedFare * 100)}
                    email={user.email}
                    metadata={{ deliveryId: payingDelivery.id, kind: "delivery_escrow" }}
                    onSuccess={confirmDeliveryPayment}
                    onClose={() => setPayingDelivery(null)}
                />
            )}
            <Footer />
        </div>
    );
}
