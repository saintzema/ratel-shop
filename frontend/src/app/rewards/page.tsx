"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Check, Flame, Gift, Loader2, Sparkles } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useHeaderOffset } from "@/lib/use-header-offset";
import { formatPrice, cn } from "@/lib/utils";

interface CheckinResponse {
    streak: number;
    claimedToday: boolean;
    nextReward: number;
    cycleDay: number;
    spendableBalance: number;
    ladder: number[];
    monthlyCeiling: number;
}

export default function RewardsPage() {
    const { user } = useAuth();
    const router = useRouter();
    const headerOffset = useHeaderOffset();

    const [data, setData] = useState<CheckinResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [claiming, setClaiming] = useState(false);
    const [justAwarded, setJustAwarded] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

    const authHeaders = (): Record<string, string> => {
        const token = typeof window !== "undefined" ? localStorage.getItem("fp_token") : null;
        return token ? { Authorization: `Bearer ${token}` } : {};
    };

    const load = useCallback(async () => {
        if (!user) { setLoading(false); return; }
        try {
            const res = await fetch("/api/checkin", { headers: authHeaders() });
            if (res.ok) setData(await res.json());
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => { load(); }, [load]);

    const claim = async () => {
        setError(null);
        setClaiming(true);
        try {
            const res = await fetch("/api/checkin", { method: "POST", headers: authHeaders() });
            const body = await res.json();
            if (!res.ok) { setError(body?.error || "Could not check in"); setData(d => ({ ...(d as CheckinResponse), ...body })); return; }
            setJustAwarded(body.awarded);
            setData(d => ({ ...(d as CheckinResponse), ...body }));
        } catch {
            setError("Could not check in — check your connection and try again.");
        } finally {
            setClaiming(false);
        }
    };

    const ladder = data?.ladder ?? [10, 10, 15, 15, 20, 20, 60];
    // Day N of the strip is already earned when it sits before today's position
    // in the current cycle — the strip shows the CURRENT week, not all time.
    const cycleDay = data?.cycleDay ?? 1;
    const daysDone = data?.claimedToday ? cycleDay : cycleDay - 1;

    return (
        <div className="min-h-screen bg-white font-sans flex flex-col">
            <Navbar />
            <div className="flex-1 max-w-2xl w-full mx-auto px-4 sm:px-6 pb-12" style={{ paddingTop: headerOffset + 24 }}>
                <div className="flex items-center gap-3 mb-1">
                    <Gift className="h-6 w-6 text-brand-green-700" />
                    <h1 className="text-2xl font-black text-gray-900">Daily Check-in</h1>
                </div>
                <p className="text-sm text-gray-500 mb-5">
                    Tap in once a day. Your credit grows every day you keep the streak, and you spend it on anything here —
                    an order, a ride, a delivery.
                </p>

                {!user ? (
                    <div className="rounded-2xl bg-gray-50 p-6 text-center">
                        <p className="font-bold text-gray-900 mb-1">Sign in to start your streak</p>
                        <p className="text-xs text-gray-500 mb-4">Your credit is saved to your account.</p>
                        <Button onClick={() => router.push("/login?redirect=/rewards")} className="h-11 rounded-xl bg-brand-green-600 hover:bg-brand-green-700 font-black">
                            Sign in
                        </Button>
                    </div>
                ) : loading ? (
                    <div className="flex items-center justify-center py-16 text-gray-400">
                        <Loader2 className="h-5 w-5 animate-spin" />
                    </div>
                ) : (
                    <>
                        {/* Balance + streak */}
                        <div
                            className="rounded-[22px] p-5 mb-4 text-white"
                            style={{
                                background: "linear-gradient(145deg, #047857 0%, #10b981 100%)",
                                boxShadow: "0 10px 30px -12px rgba(16,185,129,0.75)",
                            }}
                        >
                            <p className="text-[10px] font-black uppercase tracking-widest text-white/70">Your credit</p>
                            <p className="text-3xl font-black mt-0.5">{formatPrice(data?.spendableBalance ?? 0)}</p>
                            <div className="flex items-center gap-1.5 mt-2 text-white/85">
                                <Flame className="h-4 w-4" />
                                <span className="text-xs font-bold">
                                    {data?.streak ? `${data.streak}-day streak` : "No streak yet — today starts one"}
                                </span>
                            </div>
                        </div>

                        {/* Seven-day strip */}
                        <div className="grid grid-cols-7 gap-1.5 mb-4">
                            {ladder.map((amount, i) => {
                                const dayNumber = i + 1;
                                const earned = dayNumber <= daysDone;
                                const isToday = dayNumber === cycleDay && !data?.claimedToday;
                                return (
                                    <div
                                        key={dayNumber}
                                        className={cn(
                                            "rounded-xl border px-1 py-2.5 text-center transition-colors",
                                            earned ? "border-brand-green-500 bg-brand-green-50"
                                                : isToday ? "border-brand-green-500 ring-1 ring-brand-green-500 bg-white"
                                                    : "border-gray-200 bg-white",
                                        )}
                                    >
                                        <p className="text-[9px] font-black uppercase tracking-wide text-gray-400">Day {dayNumber}</p>
                                        {earned ? (
                                            <Check className="h-4 w-4 mx-auto mt-1 text-brand-green-600" />
                                        ) : (
                                            <p className={cn("text-[11px] font-black mt-0.5", dayNumber === 7 ? "text-amber-600" : "text-gray-700")}>
                                                ₦{amount}
                                            </p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {justAwarded != null && (
                            <motion.div
                                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                                className="rounded-xl bg-brand-green-50 border border-brand-green-200 px-4 py-3 mb-3 flex items-center gap-2"
                            >
                                <Sparkles className="h-4 w-4 text-brand-green-600 shrink-0" />
                                <p className="text-sm font-bold text-brand-green-800">
                                    {formatPrice(justAwarded)} added. Come back tomorrow for more.
                                </p>
                            </motion.div>
                        )}
                        {error && <p className="text-sm text-rose-600 font-semibold mb-3">{error}</p>}

                        <Button
                            onClick={claim}
                            disabled={claiming || !!data?.claimedToday}
                            className="w-full h-12 rounded-xl bg-brand-green-600 hover:bg-brand-green-700 font-black disabled:opacity-60"
                        >
                            {claiming ? "Checking in…"
                                : data?.claimedToday ? "Checked in today ✓"
                                    : `Check in and get ${formatPrice(data?.nextReward ?? 0)}`}
                        </Button>

                        <div className="mt-6 rounded-2xl bg-gray-50 p-4">
                            <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">How it works</p>
                            <ul className="space-y-1.5 text-xs text-gray-600">
                                <li>• One check-in a day. Miss a day and the streak restarts at day 1.</li>
                                <li>• Day 7 pays the most, then the week begins again.</li>
                                <li>• Credit is spent on the platform — orders, rides and deliveries. It isn't withdrawable.</li>
                                <li>• Each credit lasts 60 days from the day you earn it.</li>
                            </ul>
                        </div>
                    </>
                )}
            </div>
            <Footer />
        </div>
    );
}
