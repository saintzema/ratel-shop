"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CheckCircle2, Loader2, ShieldCheck, Car, Gift } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { PaystackCheckout } from "@/components/payment/PaystackCheckout";
import { useAuth } from "@/context/AuthContext";
import { formatPrice } from "@/lib/utils";

interface RideSummary {
    id: string;
    pickup: string;
    dropoff: string;
    agreedFare: number;
    status: string;
    paidAt: string | null;
    driverName?: string;
}

export default function RidePaymentPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;
    const { user } = useAuth();
    const [ride, setRide] = useState<RideSummary | null>(null);
    // How much of the fare the rider's reward credit covers. Quoted by the
    // server and re-derived there when the payment is confirmed — this copy is
    // for display and for the amount Paystack is asked to charge.
    const [creditApplied, setCreditApplied] = useState(0);
    const [creditBalance, setCreditBalance] = useState(0);
    const [amountDue, setAmountDue] = useState(0);
    const [loading, setLoading] = useState(true);
    const [showCheckout, setShowCheckout] = useState(false);
    const [error, setError] = useState("");

    const authHeaders = (): Record<string, string> => {
        const tok = typeof window !== "undefined" ? localStorage.getItem("fp_token") : null;
        return tok ? { Authorization: `Bearer ${tok}` } : {};
    };

    const load = () => {
        fetch(`/api/rides/${id}/pay`, { headers: authHeaders() })
            .then(r => r.ok ? r.json() : null)
            .then(d => {
                setRide(d?.ride || null);
                setCreditApplied(d?.creditApplied || 0);
                setCreditBalance(d?.creditBalance || 0);
                setAmountDue(d?.amountDue ?? d?.ride?.agreedFare ?? 0);
            })
            .finally(() => setLoading(false));
    };
    useEffect(() => { if (user) load(); }, [id, user]);

    const handleSuccess = async (reference: string) => {
        setShowCheckout(false);
        setLoading(true);
        try {
            const res = await fetch(`/api/rides/${id}/pay`, {
                method: "POST",
                headers: { "Content-Type": "application/json", ...authHeaders() },
                body: JSON.stringify({ reference }),
            });
            const d = await res.json();
            if (!res.ok) { setError(d?.error || "Payment could not be confirmed"); return; }
            load();
        } finally {
            setLoading(false);
        }
    };

    if (!user) {
        return (
            <div className="min-h-screen flex flex-col">
                <Navbar />
                <div className="flex-1 flex items-center justify-center p-8 text-center">
                    <Button onClick={() => router.push(`/login?redirect=/ride/${id}/pay`)}>Sign In</Button>
                </div>
                <Footer />
            </div>
        );
    }
    if (loading) return <div className="p-12 text-center text-gray-500 animate-pulse">Loading trip...</div>;
    if (!ride) return <div className="p-12 text-center text-gray-500">This ride couldn't be found.</div>;

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4">
            <Navbar />
            <div className="max-w-md mx-auto space-y-5 mt-6">
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="h-11 w-11 rounded-2xl bg-brand-green-50 flex items-center justify-center shrink-0">
                            <Car className="h-5 w-5 text-brand-green-700" />
                        </div>
                        <div>
                            <p className="font-bold text-gray-900">Trip with {ride.driverName || "your driver"}</p>
                            <p className="text-xs text-gray-500">{ride.pickup} → {ride.dropoff}</p>
                        </div>
                    </div>

                    <div className="border-t border-gray-100 pt-4 space-y-1.5">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-500 font-bold">Trip fare</span>
                            <span className={creditApplied > 0 ? "text-sm font-bold text-gray-500" : "text-2xl font-black text-gray-900"}>
                                {formatPrice(ride.agreedFare)}
                            </span>
                        </div>
                        {creditApplied > 0 && (
                            <>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-emerald-600 font-bold flex items-center gap-1.5">
                                        <Gift className="h-3.5 w-3.5" /> Reward credit
                                    </span>
                                    <span className="text-sm font-bold text-emerald-600">-{formatPrice(creditApplied)}</span>
                                </div>
                                <div className="flex justify-between items-center pt-1.5 border-t border-gray-100">
                                    <span className="text-sm text-gray-500 font-bold">You pay</span>
                                    <span className="text-2xl font-black text-gray-900">{formatPrice(amountDue)}</span>
                                </div>
                                {creditBalance > creditApplied && (
                                    <p className="text-[11px] text-gray-400">
                                        {formatPrice(creditBalance - creditApplied)} stays in your balance for your next trip.
                                    </p>
                                )}
                            </>
                        )}
                        {creditApplied === 0 && creditBalance > 0 && (
                            <p className="text-[11px] text-gray-400">
                                You have {formatPrice(creditBalance)} in credit — it applies once a fare is large enough to take it.
                            </p>
                        )}
                    </div>

                    {ride.paidAt ? (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center">
                            <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                            <p className="font-bold text-emerald-700">Payment complete</p>
                            <p className="text-xs text-emerald-600 mt-1">Your driver has been paid. Thanks for riding with FairPrice.</p>
                            <Button onClick={() => router.push("/ride")} variant="outline" className="mt-4 rounded-2xl h-11 w-full">Back to Rides</Button>
                        </div>
                    ) : (
                        <>
                            {error && <p className="text-xs text-red-500">{error}</p>}
                            <Button onClick={() => setShowCheckout(true)} className="w-full h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                                Pay {formatPrice(amountDue)} Now
                            </Button>
                            <p className="text-[11px] text-gray-400 flex items-center gap-1 justify-center pt-1 text-center">
                                <ShieldCheck className="h-3 w-3 shrink-0" />
                                {creditBalance > 0
                                    ? "Paying here is the only way to spend your credit — and your driver still gets the full fare, instantly."
                                    : "Secured by Paystack — your driver is paid instantly"}
                            </p>
                        </>
                    )}
                </div>

                {showCheckout && !ride.paidAt && (
                    <PaystackCheckout
                        amount={Math.round(amountDue * 100)}
                        email={user.email}
                        metadata={{ type: "ride_payment", ride_id: id }}
                        onSuccess={handleSuccess}
                        onClose={() => setShowCheckout(false)}
                        autoStart={true}
                    />
                )}
            </div>
            <Footer />
        </div>
    );
}
