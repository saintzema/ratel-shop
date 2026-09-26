"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Flame, Gift, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { formatPrice } from "@/lib/utils";

const SNOOZE_KEY = "fp_checkin_nudge_snoozed";

/**
 * A one-tap daily check-in prompt on the home page.
 *
 * The scheduled notification only exists inside the native app, and only for
 * people who granted permission — which is most of the audience missed. This
 * is the surface that reaches everyone, and it claims in place rather than
 * sending anyone off to another page: the streak dies on friction, not on
 * disinterest.
 *
 * Shows only when there is something to claim, and snoozes for the rest of
 * the day once dismissed so it never nags twice.
 */
export function CheckinNudge() {
    const { user } = useAuth();
    const router = useRouter();
    const [reward, setReward] = useState<number | null>(null);
    const [streak, setStreak] = useState(0);
    const [claiming, setClaiming] = useState(false);
    const [claimed, setClaimed] = useState<number | null>(null);
    const [hidden, setHidden] = useState(false);

    const today = () => new Date().toISOString().slice(0, 10);

    const authHeaders = useCallback((): Record<string, string> => {
        const token = typeof window !== "undefined" ? localStorage.getItem("fp_token") : null;
        return token ? { Authorization: `Bearer ${token}` } : {};
    }, []);

    useEffect(() => {
        if (!user) return;
        try {
            if (localStorage.getItem(SNOOZE_KEY) === today()) { setHidden(true); return; }
        } catch { /* private mode — just show it */ }

        fetch("/api/checkin", { headers: authHeaders(), cache: "no-store" })
            .then(r => (r.ok ? r.json() : null))
            .then(d => {
                if (!d || d.claimedToday) return;
                setReward(d.nextReward ?? 0);
                setStreak(d.streak ?? 0);
            })
            .catch(() => { /* a missing nudge is not worth an error */ });
    }, [user, authHeaders]);

    const claim = async () => {
        setClaiming(true);
        try {
            const res = await fetch("/api/checkin", { method: "POST", headers: authHeaders() });
            const d = await res.json().catch(() => null);
            if (res.ok && d?.awarded) setClaimed(d.awarded);
            else setHidden(true);
        } catch {
            setHidden(true);
        } finally {
            setClaiming(false);
        }
    };

    const snooze = () => {
        try { localStorage.setItem(SNOOZE_KEY, today()); } catch { /* ignore */ }
        setHidden(true);
    };

    if (!user || hidden || reward == null) return null;

    return (
        <div
            className="mx-4 md:mx-auto md:max-w-3xl mt-3 rounded-2xl px-4 py-3 flex items-center gap-3 text-white"
            style={{
                background: "linear-gradient(135deg, #047857 0%, #10b981 100%)",
                boxShadow: "0 8px 24px -12px rgba(16,185,129,0.8)",
            }}
        >
            {claimed != null ? (
                <>
                    <Gift className="h-5 w-5 shrink-0" />
                    <p className="text-sm font-bold flex-1">
                        {formatPrice(claimed)} added. Come back tomorrow — the streak pays more each day.
                    </p>
                    <button onClick={() => router.push("/rewards")} className="text-xs font-black underline shrink-0">
                        View
                    </button>
                </>
            ) : (
                <>
                    <Flame className="h-5 w-5 shrink-0" />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-black">
                            {streak > 0 ? `Keep your ${streak}-day streak` : "Check in and get paid"}
                        </p>
                        <p className="text-[11px] text-white/85">
                            {formatPrice(reward)} credit today, spendable on any order, ride or delivery.
                        </p>
                    </div>
                    <button
                        onClick={claim}
                        disabled={claiming}
                        className="shrink-0 rounded-full bg-white px-3.5 py-1.5 text-xs font-black text-emerald-700 active:scale-95 transition-transform disabled:opacity-70"
                    >
                        {claiming ? "…" : "Check in"}
                    </button>
                    <button onClick={snooze} aria-label="Dismiss" className="shrink-0 text-white/70 hover:text-white">
                        <X className="h-4 w-4" />
                    </button>
                </>
            )}
        </div>
    );
}
