"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Package, MapPin, Loader2, CheckCircle2 } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { formatPrice } from "@/lib/utils";
import { RideChat } from "@/components/ride/RideChat";
import { playDingSound } from "@/lib/audio";

/** A courier's open-request board — send a counter-offer on any delivery, no vehicle-approval gate. */
export default function DeliverDashboardPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [deliveries, setDeliveries] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [offerInputs, setOfferInputs] = useState<Record<string, string>>({});
    const [sending, setSending] = useState<string | null>(null);
    const [myActiveDeliveries, setMyActiveDeliveries] = useState<any[]>([]);
    const seenIdsRef = useRef<Set<string> | null>(null);

    const authHeaders = (): Record<string, string> => {
        const tok = typeof window !== "undefined" ? localStorage.getItem("fp_token") : null;
        return tok ? { Authorization: `Bearer ${tok}` } : {};
    };

    const load = () => {
        if (!user) { setLoading(false); return; }
        fetch("/api/deliveries?mode=courier", { headers: authHeaders() })
            .then(r => r.ok ? r.json() : null)
            .then(d => {
                const list = d?.deliveries || [];
                if (seenIdsRef.current) {
                    if (list.some((x: any) => !seenIdsRef.current!.has(x.id))) playDingSound();
                } else {
                    seenIdsRef.current = new Set();
                }
                seenIdsRef.current = new Set(list.map((x: any) => x.id));
                setDeliveries(list);
                setMyActiveDeliveries(d?.myActiveDeliveries || []);
            })
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); const t = setInterval(load, 8000); return () => clearInterval(t); }, [user]);

    const [actingOn, setActingOn] = useState<string | null>(null);
    const runAction = async (deliveryId: string, action: "pickup" | "deliver") => {
        setActingOn(deliveryId);
        try {
            await fetch(`/api/deliveries/${deliveryId}/${action}`, { method: "POST", headers: authHeaders() });
            load();
        } finally {
            setActingOn(null);
        }
    };

    const sendOffer = async (deliveryId: string) => {
        const fare = Number(offerInputs[deliveryId]);
        if (!fare || fare <= 0) return;
        setSending(deliveryId);
        try {
            await fetch(`/api/deliveries/${deliveryId}/offers`, {
                method: "POST",
                headers: { "Content-Type": "application/json", ...authHeaders() },
                body: JSON.stringify({ offeredFare: fare }),
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
                    <Button onClick={() => router.push("/login?redirect=/deliver/dashboard")}>Sign In</Button>
                </div>
                <Footer />
            </div>
        );
    }

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>;
    }

    return (
        <div className="min-h-screen bg-white font-sans">
            <Navbar />
            <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
                <div className="flex items-center justify-between gap-3 mb-6">
                    <div className="flex items-center gap-3">
                        <Package className="h-6 w-6 text-brand-green-700" />
                        <h1 className="text-2xl font-black text-gray-900">Delivery Requests</h1>
                    </div>
                    <div className="flex items-center bg-gray-100 rounded-full p-1 text-xs font-black shrink-0">
                        <button onClick={() => router.push("/send-package")} className="px-3 py-1.5 rounded-full text-gray-500 hover:text-gray-700">
                            Sender
                        </button>
                        <span className="px-3 py-1.5 rounded-full bg-white text-gray-900 shadow-sm">Courier</span>
                    </div>
                </div>

                {deliveries.length === 0 ? (
                    <p className="text-center text-sm text-gray-400 py-10">No open delivery requests right now — check back shortly.</p>
                ) : (
                    <div className="space-y-4">
                        {deliveries.map(delivery => (
                            <div key={delivery.id} className="border border-gray-100 rounded-2xl p-5">
                                <div className="flex items-start gap-2 mb-2">
                                    <MapPin className="h-4 w-4 text-brand-green-600 shrink-0 mt-0.5" />
                                    <p className="font-bold text-gray-900 text-sm">{delivery.pickup} → {delivery.dropoff}</p>
                                </div>
                                <p className="text-xs text-gray-500 mb-3">{delivery.sender?.name} proposed {formatPrice(delivery.proposedFare)} · {delivery.packageDescription} ({delivery.packageSize})</p>

                                {delivery.offers?.length > 0 ? (
                                    <p className="text-xs font-bold text-amber-600">You offered {formatPrice(delivery.offers[0].offeredFare)} — waiting on sender</p>
                                ) : (
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder="Your offer (₦)"
                                            type="number"
                                            value={offerInputs[delivery.id] || ""}
                                            onChange={e => setOfferInputs(prev => ({ ...prev, [delivery.id]: e.target.value }))}
                                            className="flex-1"
                                        />
                                        <Button onClick={() => sendOffer(delivery.id)} disabled={sending === delivery.id} className="bg-brand-green-600 hover:bg-brand-green-700 shrink-0">
                                            Send Offer
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {myActiveDeliveries.length > 0 && (
                    <div className="mt-10">
                        <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4">Your Active Deliveries</h2>
                        <div className="space-y-6">
                            {myActiveDeliveries.map(delivery => (
                                <div key={delivery.id} className="border border-emerald-100 bg-emerald-50/40 rounded-2xl p-5 space-y-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-2 text-sm text-emerald-700 font-bold">
                                            <CheckCircle2 className="h-4 w-4" /> {delivery.pickup} → {delivery.dropoff}
                                        </div>
                                        {delivery.status === "matched" && (
                                            <Button size="sm" disabled={actingOn === delivery.id} onClick={() => runAction(delivery.id, "pickup")} className="bg-brand-green-600 hover:bg-brand-green-700">
                                                Mark Picked Up
                                            </Button>
                                        )}
                                        {delivery.status === "picked_up" && (
                                            <Button size="sm" disabled={actingOn === delivery.id} onClick={() => runAction(delivery.id, "deliver")} className="bg-brand-orange hover:bg-brand-orange/90">
                                                Mark Delivered
                                            </Button>
                                        )}
                                    </div>
                                    {delivery.conversationId && <RideChat conversationId={delivery.conversationId} />}
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
