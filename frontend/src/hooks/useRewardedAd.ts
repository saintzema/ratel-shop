"use client";

import { useCallback, useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { AD_CONFIG, getRewardedUnitId } from "@/lib/ad-config";

type RewardedAdState = "idle" | "loading" | "ready" | "showing" | "rewarded" | "error";

/**
 * Wraps @capacitor-community/admob's rewarded-video flow. Only usable inside
 * the native app shell (iOS/Android) — on web there's no AdMob SDK, so
 * `available` is always false there and callers should hide the trigger
 * entirely rather than show a button that can't do anything.
 */
export function useRewardedAd() {
    const [state, setState] = useState<RewardedAdState>("idle");
    const [error, setError] = useState<string | null>(null);

    const platform = Capacitor.getPlatform() as "ios" | "android" | "web";
    const unitId = platform !== "web" ? getRewardedUnitId(platform) : "";
    const available = platform !== "web" && !!unitId;

    const initialize = useCallback(async () => {
        if (!available) return;
        try {
            const { AdMob } = await import("@capacitor-community/admob");
            await AdMob.initialize();
        } catch {
            // Non-fatal — prepare() below will surface the real error if the SDK
            // genuinely isn't usable.
        }
    }, [available]);

    useEffect(() => {
        if (available) initialize();
    }, [available, initialize]);

    const showRewardedAd = useCallback(async (): Promise<{ rewarded: boolean }> => {
        if (!available) return { rewarded: false };
        setState("loading");
        setError(null);
        try {
            const { AdMob } = await import("@capacitor-community/admob");
            await AdMob.prepareRewardVideoAd({ adId: unitId, isTesting: process.env.NODE_ENV !== "production" });
            setState("ready");
            setState("showing");
            const reward = await AdMob.showRewardVideoAd();
            setState("rewarded");
            return { rewarded: !!reward };
        } catch (err: any) {
            setError(err?.message || "Ad failed to load. Try again in a moment.");
            setState("error");
            return { rewarded: false };
        }
    }, [available, unitId]);

    return { available, state, error, showRewardedAd };
}
