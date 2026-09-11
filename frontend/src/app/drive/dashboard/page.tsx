"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Car, MapPin, Loader2, CheckCircle2 } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { formatPrice } from "@/lib/utils";
import { RideChat } from "@/components/ride/RideChat";
import { RideMap } from "@/components/ride/RideMap";
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
                setRides(list);
                setMyActiveRides(d?.myActiveRides || []);
                setVehicles(d?.vehicles || []);
                setNeedsApproval(!!d?.needsApprovedVehicle);
            })
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); const t = setInterval(load, 8000); return () => clearInterval(t); }, [user]);

    const [actingOnTrip, setActingOnTrip] = useState<string | null>(null);
    const runTripAction = async (rideId: string, action: "start" | "complete") => {
        setActingOnTrip(rideId);
        try {
            await fetch(`/api/rides/${rideId}/${action}`, { method: "POST", headers: authHeaders() });
            load();
        } finally {
            setActingOnTrip(null);
        }
    };

    const sendOffer = async (rideId: string) => {
        const fare = Number(offerInputs[rideId]);
        if (!fare || fare <= 0 || !vehicles[0]) return;
        setSending(rideId);
        try {
            await fetch(`/api/rides/${rideId}/offers`, {
                method: "POST",
                headers: { "Content-Type": "application/json", ...authHeaders() },
                body: JSON.stringify({ vehicleId: vehicles[0].id, offeredFare: fare }),
            });
            load();
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
                                <div key={ride.id} className="border border-gray-100 rounded-2xl p-5">
                                    <div className="flex items-start gap-2 mb-2">
                                        <MapPin className="h-4 w-4 text-brand-green-600 shrink-0 mt-0.5" />
                                        <p className="font-bold text-gray-900 text-sm">{ride.pickup} → {ride.dropoff}</p>
                                    </div>
                                    <p className="text-xs text-gray-500 mb-3">{ride.rider?.name} proposed {formatPrice(ride.proposedFare)}</p>

                                    {ride.offers?.length > 0 ? (
                                        <p className="text-xs font-bold text-amber-600">You offered {formatPrice(ride.offers[0].offeredFare)} — waiting on rider</p>
                                    ) : (
                                        <div className="flex gap-2">
                                            <Input
                                                placeholder="Your offer (₦)"
                                                type="number"
                                                value={offerInputs[ride.id] || ""}
                                                onChange={e => setOfferInputs(prev => ({ ...prev, [ride.id]: e.target.value }))}
                                                className="flex-1"
                                            />
                                            <Button onClick={() => sendOffer(ride.id)} disabled={sending === ride.id} className="bg-brand-green-600 hover:bg-brand-green-700 shrink-0">
                                                Send Offer
                                            </Button>
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
                            {myActiveRides.map(ride => (
                                <div key={ride.id} className="border border-emerald-100 bg-emerald-50/40 rounded-2xl p-5 space-y-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-2 text-sm text-emerald-700 font-bold">
                                            <CheckCircle2 className="h-4 w-4" /> {ride.pickup} → {ride.dropoff}
                                        </div>
                                        {ride.status === "matched" && (
                                            <Button
                                                size="sm"
                                                disabled={actingOnTrip === ride.id}
                                                onClick={() => runTripAction(ride.id, "start")}
                                                className="bg-brand-green-600 hover:bg-brand-green-700"
                                            >
                                                Start Trip
                                            </Button>
                                        )}
                                        {ride.status === "in_progress" && (
                                            <Button
                                                size="sm"
                                                disabled={actingOnTrip === ride.id}
                                                onClick={() => runTripAction(ride.id, "complete")}
                                                className="bg-brand-orange hover:bg-brand-orange/90"
                                            >
                                                Complete Trip
                                            </Button>
                                        )}
                                    </div>
                                    <ActiveRideMap rideId={ride.id} pickup={ride.pickup} dropoff={ride.dropoff} />
                                    {ride.conversationId && <RideChat conversationId={ride.conversationId} />}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
            <Footer />
        </div>
    );
}
