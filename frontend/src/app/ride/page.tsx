"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Car, MapPin, ChevronDown, Loader2, CheckCircle2, Minus, Plus, X, ShieldCheck, Star } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { useLocation } from "@/context/LocationContext";
import { formatPrice, cn } from "@/lib/utils";
import { RideChat } from "@/components/ride/RideChat";
import { RideMap } from "@/components/ride/RideMap";
import { MaskedCallButton } from "@/components/ride/MaskedCallButton";
import { useLocationBroadcast } from "@/hooks/useLocationBroadcast";
import { playDingSound } from "@/lib/audio";
import { NIGERIAN_STATES } from "@/lib/nigerian-states";
import { usePlacesAutocomplete } from "@/hooks/usePlacesAutocomplete";

const CLASSES = [
    { value: "", label: "Any vehicle" },
    { value: "ev", label: "EV" },
    { value: "newer", label: "Newer" },
    { value: "standard", label: "Standard" },
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
export default function RidePage() {
    const { user } = useAuth();
    const router = useRouter();
    const { location, setLocation } = useLocation();

    const [confirmingCity, setConfirmingCity] = useState(true);
    const [pickingState, setPickingState] = useState(false);

    const [pickup, setPickup] = useState("");
    const [dropoff, setDropoff] = useState("");
    // No-ops to plain typing if NEXT_PUBLIC_GOOGLE_MAPS_API_KEY isn't set — see
    // usePlacesAutocomplete's own comment for how to turn this on.
    const pickupAutocomplete = usePlacesAutocomplete(setPickup);
    const dropoffAutocomplete = usePlacesAutocomplete(setDropoff);
    const [fare, setFare] = useState(2000);
    const [autoAccept, setAutoAccept] = useState(false);
    const [vehicleClassPref, setVehicleClassPref] = useState("");
    const [posting, setPosting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastVisibleDrivers, setLastVisibleDrivers] = useState<number | null>(null);

    const [rides, setRides] = useState<any[]>([]);
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

    const postRide = async () => {
        setError(null);
        if (!pickup || !dropoff) { setError("Enter pickup and drop-off."); return; }
        if (!fare || fare <= 0) { setError("Enter what you're willing to pay."); return; }
        setPosting(true);
        try {
            const res = await fetch("/api/rides", {
                method: "POST",
                headers: { "Content-Type": "application/json", ...authHeaders() },
                body: JSON.stringify({
                    pickup, dropoff, proposedFare: fare,
                    vehicleClassPref: vehicleClassPref || undefined,
                    pickupState: location,
                    autoAcceptMax: autoAccept ? fare : undefined,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || "Could not post ride");
            setPickup(""); setDropoff("");
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

    if (!user) {
        return (
            <div className="min-h-screen flex flex-col">
                <Navbar />
                <div className="flex-1 flex items-center justify-center p-8 text-center">
                    <div>
                        <p className="font-bold text-gray-900 mb-4">Sign in to book a ride</p>
                        <Button onClick={() => router.push("/login?redirect=/ride")}>Sign In</Button>
                    </div>
                </div>
                <Footer />
            </div>
        );
    }

    const activeRides = rides.filter(r => r.status !== "completed" && r.status !== "cancelled");
    // Share MY position for whichever ride is actually matched, so the
    // driver's map can show where I am too — inDrive/AMap both do this
    // two-way, not just "watch the driver".
    const matchedRide = activeRides.find(r => r.status === "matched" || r.status === "in_progress");
    useLocationBroadcast(matchedRide?.id || null, !!matchedRide);

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

            <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
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

                <div className="bg-gray-50 rounded-2xl p-5 space-y-3 mb-8">
                    <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-green-600" />
                        <Input ref={pickupAutocomplete.inputRef} placeholder="Pickup location" value={pickup} onChange={e => setPickup(e.target.value)} className="pl-9 bg-white" />
                    </div>
                    <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-rose-500" />
                        <Input ref={dropoffAutocomplete.inputRef} placeholder="Drop-off location" value={dropoff} onChange={e => setDropoff(e.target.value)} className="pl-9 bg-white" />
                    </div>

                    <div className="relative">
                        <select
                            value={vehicleClassPref}
                            onChange={e => setVehicleClassPref(e.target.value)}
                            className="w-full h-10 pl-3 pr-8 rounded-md border border-input bg-white text-sm appearance-none"
                        >
                            {CLASSES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    </div>

                    <div className="bg-white rounded-xl p-4 flex items-center justify-between">
                        <button onClick={() => setFare(f => Math.max(FARE_STEP, f - FARE_STEP))} className="h-9 w-9 rounded-full bg-gray-100 flex items-center justify-center">
                            <Minus className="h-4 w-4" />
                        </button>
                        <div className="text-center">
                            <p className="text-2xl font-black text-gray-900">{formatPrice(fare)}</p>
                            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">What you'll pay</p>
                        </div>
                        <button onClick={() => setFare(f => f + FARE_STEP)} className="h-9 w-9 rounded-full bg-gray-100 flex items-center justify-center">
                            <Plus className="h-4 w-4" />
                        </button>
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
                                        <p className="text-xs text-gray-500 mt-0.5">You proposed {formatPrice(ride.proposedFare)}</p>
                                    </div>
                                    <span className={cn(
                                        "text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full",
                                        ride.status === "searching" ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"
                                    )}>
                                        {ride.status === "searching" ? "Waiting for offers" : ride.status === "in_progress" ? "In Progress" : ride.status}
                                    </span>
                                </div>

                                {ride.status === "searching" && (
                                    <div className="space-y-3">
                                        <RideMap rideId={ride.id} pickup={ride.pickup} dropoff={ride.dropoff} trackRole="driver" active={false} />
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
                                        <div className="flex items-center justify-between gap-2 flex-wrap">
                                            <div className="flex items-center gap-2 text-sm text-emerald-700 font-bold">
                                                <CheckCircle2 className="h-4 w-4" />
                                                {ride.status === "in_progress" ? "Trip in progress" : "Matched"} with {ride.driver.name} · {formatPrice(ride.agreedFare)}
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <MaskedCallButton kind="ride" tripId={ride.id} label="Call Driver" />
                                                <a
                                                    href={`https://wa.me/?text=${encodeURIComponent(
                                                        `🚗 My FairPrice ride details, for safety:\n\nDriver: ${ride.driver.name}\nVehicle: ${ride.vehicle?.make || ""} ${ride.vehicle?.model || ""} (${ride.vehicle?.plateNumber || "plate n/a"})\nFrom: ${ride.pickup}\nTo: ${ride.dropoff}\nFare: ${formatPrice(ride.agreedFare)}`
                                                    )}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-full flex items-center gap-1.5 shrink-0"
                                                >
                                                    <ShieldCheck className="h-3.5 w-3.5" /> Share trip for safety
                                                </a>
                                            </div>
                                        </div>
                                        <RideMap rideId={ride.id} pickup={ride.pickup} dropoff={ride.dropoff} trackRole="driver" active plateNumber={ride.vehicle?.plateNumber} />
                                        {ride.conversationId && <RideChat conversationId={ride.conversationId} />}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

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

                <p className="text-center text-xs text-gray-400 mt-10">
                    Have a car? <a href="/drive/onboarding" className="text-brand-green-600 font-bold underline">Register to drive</a> and start sending offers.
                </p>
                <p className="text-center text-xs text-gray-400 mt-2">
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
