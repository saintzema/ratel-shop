"use client";

import { useEffect, useState } from "react";
import { Gift, Loader2, PlayCircle } from "lucide-react";
import { useRewardedAd } from "@/hooks/useRewardedAd";
import { AD_CONFIG } from "@/lib/ad-config";
import { formatPrice } from "@/lib/utils";

interface ActiveCredit {
    id: string;
    amount: number;
    expiresAt: string;
}

/**
 * "Watch a short ad, get ₦X off" card for the cart page. Hidden entirely
 * when: not running in the native app (no AdMob on web), ad unit not
 * configured yet, or the buyer isn't logged in (reward API requires auth).
 * Reports the buyer's already-active unredeemed credit if they have one,
 * rather than letting them double-claim.
 */
export function RewardedAdCard({ isLoggedIn }: { isLoggedIn: boolean }) {
    const { available, showRewardedAd, state, error } = useRewardedAd();
    const [activeCredit, setActiveCredit] = useState<ActiveCredit | null>(null);
    const [claiming, setClaiming] = useState(false);
    const [claimError, setClaimError] = useState<string | null>(null);
    const [checked, setChecked] = useState(false);

    useEffect(() => {
        if (!isLoggedIn || !available) { setChecked(true); return; }
        const token = typeof window !== "undefined" ? localStorage.getItem("fp_token") : null;
        if (!token) { setChecked(true); return; }
        fetch("/api/ads/reward", { headers: { Authorization: `Bearer ${token}` } })
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => setActiveCredit(data?.credit || null))
            .catch(() => {})
            .finally(() => setChecked(true));
    }, [isLoggedIn, available]);

    if (!available || !isLoggedIn || !checked) return null;

    const handleWatch = async () => {
        setClaimError(null);
        const { rewarded } = await showRewardedAd();
        if (!rewarded) {
            if (error) setClaimError(error);
            return;
        }
        setClaiming(true);
        try {
            const token = localStorage.getItem("fp_token");
            const res = await fetch("/api/ads/reward", {
                method: "POST",
                headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            });
            const data = await res.json();
            if (res.ok) {
                setActiveCredit(data.credit);
            } else {
                setClaimError(data.error || "Couldn't claim your reward — try again.");
            }
        } finally {
            setClaiming(false);
        }
    };

    if (activeCredit) {
        return (
            <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5">
                <Gift className="h-5 w-5 text-emerald-600 shrink-0" />
                <p className="text-sm font-bold text-emerald-800">
                    You have {formatPrice(activeCredit.amount)} off ready to apply at checkout — expires soon, use it before it's gone.
                </p>
            </div>
        );
    }

    return (
        <button
            onClick={handleWatch}
            disabled={state === "loading" || state === "showing" || claiming}
            className="w-full flex items-center gap-3 rounded-2xl border border-dashed border-emerald-300 bg-white p-3.5 text-left hover:bg-emerald-50/50 transition-colors disabled:opacity-60"
        >
            {state === "loading" || state === "showing" || claiming ? (
                <Loader2 className="h-5 w-5 text-emerald-600 shrink-0 animate-spin" />
            ) : (
                <PlayCircle className="h-5 w-5 text-emerald-600 shrink-0" />
            )}
            <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900">
                    Watch a short ad, get {formatPrice(AD_CONFIG.rewardedAd.creditAmount)} off
                </p>
                <p className="text-xs text-gray-400">Takes about 30 seconds</p>
                {claimError && <p className="text-xs text-red-500 mt-1">{claimError}</p>}
            </div>
        </button>
    );
}
