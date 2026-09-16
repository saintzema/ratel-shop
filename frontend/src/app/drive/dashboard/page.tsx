"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Car, MapPin, Loader2, CheckCircle2, CreditCard } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { formatPrice } from "@/lib/utils";
import { RideChat } from "@/components/ride/RideChat";
import { RideMap } from "@/components/ride/RideMap";
import { MaskedCallButton } from "@/components/ride/MaskedCallButton";
import { SlideToConfirm } from "@/components/ride/SlideToConfirm";
import { PaystackCheckout } from "@/components/payment/PaystackCheckout";
import { useLocationBroadcast } from "@/hooks/useLocationBroadcast";
import { playDingSound } from "@/lib/audio";

/** A driver's open-request board — send a counter-offer on any ride, inDrive-style. */
/** One per active ride, so useLocationBroadcast's hook call stays valid inside the .map() below. */
function ActiveRideMap({ rideId, pickup, dropoff }: { rideId: string; pickup: string; dropoff: string }) {
    useLocationBroadcast(rideId, true);
    return <RideMap rideId={rideId} pickup={pickup} dropoff={dropoff} trackRole="rider" active />;
}

export default function DriveDashboardPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [rides, setRides] = useState<any[]>([]);
    const [vehicles, setVehicles] = useState<any[]>([]);
    const [needsApproval, setNeedsApproval] = useState(false);
    const [loading, setLoading] = useState(true);
    const [offerInputs, setOfferInputs] = useState<Record<string, string>>({});
    const [sending, setSending] = useState<string | null>(null);
    const [myActiveRides, setMyActiveRides] = useState<any[]>([]);
    const seenRideIds = useRef<Set<string> | null>(null);
    const knownFares = useRef<Record<string, number>>({});
    // Rider tapped + a few times waiting for a driver — flash "Fare increased"
    // on that card for a bit rather than silently updating the number, which
    // is the whole point of a rider being able to sweeten an offer.
    const [justRaised, setJustRaised] = useState<Record<string, boolean>>({});

    const authHeaders = (): Record<string, string> => {
        const tok = typeof window !== "undefined" ? localStorage.getItem("fp_token") : null;
        return tok ? { Authorization: `Bearer ${tok}` } : {};
    };

    const load = () => {
        if (!user) { setLoading(false); return; }
        fetch("/api/rides?mode=driver", { headers: authHeaders() })
            .then(r => r.ok ? r.json() : null)
            .then(d => {
                const list = d?.rides || [];
                // Ding on a genuinely new open request — skip the very first load
                // so opening the dashboard doesn't ding for every existing request.
                if (seenRideIds.current) {
                    if (list.some((r: any) => !seenRideIds.current!.has(r.id))) playDingSound();
                } else {
                    seenRideIds.current = new Set();
                }
                seenRideIds.current = new Set(list.map((r: any) => r.id));

                const raisedIds: string[] = [];
                for (const r of list) {
                    const prevFare = knownFares.current[r.id];
                    if (prevFare != null && r.proposedFare > prevFare) raisedIds.push(r.id);
                    knownFares.current[r.id] = r.proposedFare;
                }
                if (raisedIds.length) {
                    playDingSound();
                    setJustRaised(prev => {
                        const next = { ...prev };
                        raisedIds.forEach(id => { next[id] = true; });
                        return next;
                    });
                    setTimeout(() => {
                        setJustRaised(prev => {
                            const next = { ...prev };
                            raisedIds.forEach(id => { delete next[id]; });
                            return next;
                        });
                    }, 5000);
                }

                setRides(list);
                setMyActiveRides(d?.myActiveRides || []);
                setVehicles(d?.vehicles || []);
                setNeedsApproval(!!d?.needsApprovedVehicle);
            })
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); const t = setInterval(load, 8000); return () => clearInterval(t); }, [user]);

    const [startCodeInputs, setStartCodeInputs] = useState<Record<string, string>>({});
    const [startCodeErrors, setStartCodeErrors] = useState<Record<string, string>>({});
    // The slider itself owns its own "confirming" spinner state — this just
    // needs to resolve/reject so SlideToConfirm knows whether to lock in the
    // "Done" state or snap back for another try (e.g. a wrong pickup code).
    const runTripAction = async (rideId: string, action: "start" | "complete", code?: string) => {
        setStartCodeErrors(prev => ({ ...prev, [rideId]: "" }));
        const res = await fetch(`/api/rides/${rideId}/${action}`, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...authHeaders() },
            body: JSON.stringify(code ? { code } : {}),
        });
        if (!res.ok) {
            const data = await res.json().catch(() => null);
            setStartCodeErrors(prev => ({ ...prev, [rideId]: data?.error || "Couldn't start the trip" }));
            throw new Error(data?.error || "failed");
        }
        load();
    };

    // The driver's own device can show the exact same Paystack checkout the
    // QR points to — e.g. a passenger without a working camera scanner can
    // just look at the driver's screen and pick Transfer or card themselves.
    const [showCheckoutFor, setShowCheckoutFor] = useState<string | null>(null);
    const [payingRideId, setPayingRideId] = useState<string | null>(null);
    const handleDriverSidePayment = async (rideId: string, reference: string) => {
        setShowCheckoutFor(null);
        setPayingRideId(rideId);
        try {
            await fetch(`/api/rides/${rideId}/pay`, {
                method: "POST",
                headers: { "Content-Type": "application/json", ...authHeaders() },
                body: JSON.stringify({ reference }),
            });
            load();
        } finally {
            setPayingRideId(null);
        }
    };

    const [offerErrors, setOfferErrors] = useState<Record<string, string>>({});
    const sendOffer = async (rideId: string, exactFare?: number) => {
        const fare = exactFare ?? Number(offerInputs[rideId]);
        if (!fare || fare <= 0 || !vehicles[0]) return;
        setSending(rideId);
        setOfferErrors(prev => ({ ...prev, [rideId]: "" }));
        try {
            // Previously this never checked the response — a rejected offer just
            // did nothing with zero feedback, reading exactly like a broken button.
            const res = await fetch(`/api/rides/${rideId}/offers`, {
                method: "POST",
                headers: { "Content-Type": "application/json", ...authHeaders() },
                body: JSON.stringify({ vehicleId: vehicles[0].id, offeredFare: fare }),
            });
            const data = await res.json().catch(() => null);
            if (!res.ok) {
                setOfferErrors(prev => ({ ...prev, [rideId]: data?.error || "Couldn't send that offer" }));
                return;
            }
            load();
        } catch {
            setOfferErrors(prev => ({ ...prev, [rideId]: "Couldn't reach the server — try again" }));
        } finally {
            setSending(null);
        }
    };

    if (!user) {
        return (
            <div className="min-h-screen flex flex-col">
                <Navbar />
                <div className="flex-1 flex items-center justify-center p-8 text-center">
                    <Button onClick={() => router.push("/login?redirect=/drive/dashboard")}>Sign In</Button>
                </div>
                <Footer />
            </div>
        );
    }

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>;
    }

    if (needsApproval) {
        return (
            <div className="min-h-screen bg-white font-sans">
                <Navbar />
                <div className="max-w-md mx-auto px-6 py-20 text-center">
                    <Car className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h1 className="text-xl font-black text-gray-900 mb-2">No approved vehicle yet</h1>
                    <p className="text-sm text-gray-500 mb-6">Register a vehicle and pass inspection to start seeing ride requests.</p>
                    <Button onClick={() => router.push("/drive/onboarding")} className="bg-brand-green-600 hover:bg-brand-green-700">Register a Vehicle</Button>
                </div>
                <Footer />
            </div>
        );
    }

    const open = rides;

    return (
        <div className="min-h-screen bg-white font-sans">
            <Navbar />
            <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
                <div className="flex items-center justify-between gap-3 mb-6">
                    <div className="flex items-center gap-3">
                        <Car className="h-6 w-6 text-brand-green-700" />
                        <h1 className="text-2xl font-black text-gray-900">Ride Requests</h1>
                    </div>
                    <div className="flex items-center bg-gray-100 rounded-full p-1 text-xs font-black shrink-0">
                        <button onClick={() => router.push("/ride")} className="px-3 py-1.5 rounded-full text-gray-500 hover:text-gray-700">
                            Passenger
                        </button>
                        <span className="px-3 py-1.5 rounded-full bg-white text-gray-900 shadow-sm">Driver</span>
                    </div>
                </div>

                {open.length === 0 ? (
                    <p className="text-center text-sm text-gray-400 py-10">No open ride requests right now — check back shortly.</p>
                ) : (
                    <div className="space-y-4">
                        {open.map(ride => {
                            return (
                                <div key={ride.id} className={`border rounded-2xl p-5 transition-colors ${justRaised[ride.id] ? "border-emerald-400 bg-emerald-50/60" : "border-gray-100"}`}>
                                    <div className="flex items-start gap-2 mb-2">
                                        <MapPin className="h-4 w-4 text-brand-green-600 shrink-0 mt-0.5" />
                                        <p className="font-bold text-gray-900 text-sm">{ride.pickup} → {ride.dropoff}</p>
                                    </div>
                                    <p className="text-xs text-gray-500 mb-3 flex items-center gap-1.5">
                                        {ride.rider?.name} proposed {formatPrice(ride.proposedFare)}
                                        {justRaised[ride.id] && (
                                            <span className="text-[10px] font-black text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-full uppercase tracking-wide animate-pulse">Fare increased!</span>
                                        )}
                                    </p>

                                    {ride.offers?.length > 0 ? (
                                        <p className="text-xs font-bold text-amber-600">You offered {formatPrice(ride.offers[0].offeredFare)} — waiting on rider</p>
                                    ) : (
                                        <div>
                                            {/* Happy with the rider's own named price? One tap instead of
                                                retyping the same number into the offer box below. */}
                                            <Button
                                                onClick={() => sendOffer(ride.id, ride.proposedFare)}
                                                disabled={sending === ride.id}
                                                variant="outline"
                                                className="w-full mb-2 border-brand-green-200 text-brand-green-700 hover:bg-brand-green-50"
                                            >
                                                {sending === ride.id ? <Loader2 className="h-4 w-4 animate-spin" /> : `Accept ${formatPrice(ride.proposedFare)} as offered`}
                                            </Button>
                                            <div className="flex gap-2">
                                                <Input
                                                    placeholder="Or counter with your own price (₦)"
                                                    type="number"
                                                    value={offerInputs[ride.id] || ""}
                                                    onChange={e => setOfferInputs(prev => ({ ...prev, [ride.id]: e.target.value }))}
                                                    className="flex-1"
                                                />
                                                <Button onClick={() => sendOffer(ride.id)} disabled={sending === ride.id} className="bg-brand-green-600 hover:bg-brand-green-700 shrink-0">
                                                    {sending === ride.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send Offer"}
                                                </Button>
                                            </div>
                                            {offerErrors[ride.id] && <p className="text-xs text-rose-600 font-semibold mt-1.5">{offerErrors[ride.id]}</p>}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {myActiveRides.length > 0 && (
                    <div className="mt-10">
                        <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4">Your Active Rides</h2>
                        <div className="space-y-6">
                            {myActiveRides.map(ride => {
                                const payUrl = typeof window !== "undefined" ? `${window.location.origin}/ride/${ride.id}/pay` : "";
                                return (
                                <div key={ride.id} className="border border-emerald-100 bg-emerald-50/40 rounded-2xl p-5 space-y-3">
                                    <div className="flex items-center justify-between gap-3 flex-wrap">
                                        <div className="flex items-center gap-2 text-sm text-emerald-700 font-bold">
                                            <CheckCircle2 className="h-4 w-4" /> {ride.pickup} → {ride.dropoff}
                                        </div>
                                        {ride.status !== "completed" && (
                                            <div className="shrink-0">
                                                <MaskedCallButton kind="ride" tripId={ride.id} label="Call Rider" />
                                            </div>
                                        )}
                                    </div>
                                    {/* Rider's contact only shown here — once matched to this
                                        driver — never on the open request board above. */}
                                    <p className="text-xs text-gray-600">
                                        <span className="font-bold text-gray-800">Rider:</span> {ride.rider?.name || "—"}{ride.rider?.whatsappNumber ? ` · ${ride.rider.whatsappNumber}` : ""}
                                    </p>

                                    {ride.status === "matched" && (
                                        <>
                                            <div className="bg-white rounded-xl p-3 flex items-center gap-2">
                                                <span className="text-xs font-bold text-gray-600 shrink-0">Ask rider for the last 2 digits of their code:</span>
                                                <Input
                                                    value={startCodeInputs[ride.id] || ""}
                                                    onChange={e => setStartCodeInputs(prev => ({ ...prev, [ride.id]: e.target.value.replace(/\D/g, "").slice(0, 2) }))}
                                                    placeholder="00"
                                                    className="w-16 text-center font-black tracking-widest"
                                                    maxLength={2}
                                                />
                                            </div>
                                            <SlideToConfirm
                                                label="Slide to start ride"
                                                confirmedLabel="Trip started"
                                                disabled={(startCodeInputs[ride.id] || "").length !== 2}
                                                onConfirm={() => runTripAction(ride.id, "start", startCodeInputs[ride.id])}
                                            />
                                        </>
                                    )}

                                    {ride.status === "in_progress" && (
                                        <SlideToConfirm
                                            label="Slide to end ride"
                                            confirmedLabel="Trip ended"
                                            color="orange"
                                            onConfirm={() => runTripAction(ride.id, "complete")}
                                        />
                                    )}

                                    {ride.status === "completed" && !ride.paidAt && (
                                        <div className="bg-white rounded-2xl p-4 space-y-3">
                                            <p className="text-sm font-black text-gray-900">Trip ended — collect ₦{ride.agreedFare?.toLocaleString()}</p>
                                            <p className="text-xs text-gray-500">Have the rider scan this to pay instantly in-app, or open the checkout yourself and show them the Transfer option.</p>
                                            <div className="flex items-center gap-4">
                                                {payUrl && (
                                                    <div className="p-2 bg-white rounded-xl border border-gray-100 shrink-0">
                                                        <QRCodeCanvas value={payUrl} size={110} level="H" marginSize={2} imageSettings={{ src: "/logo.png", height: 22, width: 22, excavate: true }} />
                                                    </div>
                                                )}
                                                <div className="flex-1 space-y-2">
                                                    <p className="text-2xl font-black text-gray-900">{formatPrice(ride.agreedFare)}</p>
                                                    <Button
                                                        size="sm"
                                                        disabled={payingRideId === ride.id}
                                                        onClick={() => setShowCheckoutFor(ride.id)}
                                                        className="bg-brand-green-600 hover:bg-brand-green-700 w-full flex items-center gap-1.5"
                                                    >
                                                        {payingRideId === ride.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />} Show Checkout on This Phone
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {startCodeErrors[ride.id] && <p className="text-xs text-rose-600 font-semibold px-1">{startCodeErrors[ride.id]}</p>}
                                    {ride.status !== "completed" && <ActiveRideMap rideId={ride.id} pickup={ride.pickup} dropoff={ride.dropoff} />}
                                    {ride.conversationId && ride.status !== "completed" && <RideChat conversationId={ride.conversationId} />}

                                    {showCheckoutFor === ride.id && (
                                        <PaystackCheckout
                                            amount={Math.round((ride.agreedFare || 0) * 100)}
                                            email={`ride-${ride.id}@fairprice.ng`}
                                            metadata={{ type: "ride_payment", ride_id: ride.id }}
                                            onSuccess={(reference) => handleDriverSidePayment(ride.id, reference)}
                                            onClose={() => setShowCheckoutFor(null)}
                                            autoStart={true}
                                        />
                                    )}
                                </div>
                            );})}
                        </div>
                    </div>
                )}
            </div>
            <Footer />
        </div>
    );
}
