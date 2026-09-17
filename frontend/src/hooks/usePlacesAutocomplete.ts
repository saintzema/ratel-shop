"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { loadGoogleMaps } from "@/lib/google-maps";

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

/**
 * Attaches Places Autocomplete (Nigeria-restricted) to an input, or no-ops
 * if there's no API key — pickup/dropoff fall back to the plain text inputs
 * they already were, never a broken half-feature. Set
 * NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in Vercel's env vars (Google Cloud Console
 * → enable "Places API" + "Maps JavaScript API", restrict the key by HTTP
 * referrer to fairprice.ng) to turn this on.
 *
 * Passes the picked place's coordinates through too — RideMap uses these
 * directly instead of a second geocoding round-trip for the same address.
 *
 * This used to be a plain `useRef` + a `useEffect(..., [])`. That combination
 * quietly assumes the <Input ref={...}> is already in the DOM by the time
 * the very first effect pass runs — but both /ride and /send-package gate
 * their form behind `if (!user) return <SignInPrompt/>`, and `user` from
 * AuthContext is null on the first render and only resolves asynchronously.
 * So the FIRST commit renders the sign-in fallback (no input at all), the
 * once-only effect fires with `inputRef.current === null`, and — because its
 * deps array is empty — it never runs again once the real form (with the
 * actual input) mounts on a later render. Confirmed directly: real
 * suggestions never appeared, and console tracing showed the effect's
 * `inputRef.current` was `null` on the only pass it ever got. A callback ref
 * fixes this correctly: React invokes it exactly when the DOM node is
 * actually created, on WHICHEVER render that turns out to be.
 */
export function usePlacesAutocomplete(onPlaceSelected: (address: string, coords?: { lat: number; lng: number }) => void) {
    const [supported, setSupported] = useState(!!API_KEY);
    const nodeRef = useRef<HTMLInputElement | null>(null);
    const cancelledRef = useRef(false);
    const onPlaceSelectedRef = useRef(onPlaceSelected);
    onPlaceSelectedRef.current = onPlaceSelected;

    useEffect(() => {
        cancelledRef.current = false;
        return () => { cancelledRef.current = true; };
    }, []);

    const attach = useCallback((node: HTMLInputElement | null) => {
        nodeRef.current = node;
        if (!API_KEY || !node) return;
        // A SECOND Autocomplete on the same <input> (e.g. React Strict
        // Mode's dev-only mount→cleanup→mount) creates two competing
        // .pac-container elements that both end up permanently
        // `display:none` — confirmed directly. This flag on the DOM node
        // itself survives that double-invoke.
        if ((node as any).__fpAutocompleteAttached) return;

        loadGoogleMaps()?.then(() => {
            if (cancelledRef.current || nodeRef.current !== node || !window.google?.maps?.places) return;
            if ((node as any).__fpAutocompleteAttached) return;
            (node as any).__fpAutocompleteAttached = true;

            const autocomplete = new window.google.maps.places.Autocomplete(node, {
                componentRestrictions: { country: "ng" },
                fields: ["formatted_address", "name", "geometry"],
            });
            autocomplete.addListener("place_changed", () => {
                const place = autocomplete.getPlace();
                const name = place?.name;
                const formatted = place?.formatted_address;
                // For a landmark/airport (e.g. "Murtala Muhammed International
                // Airport"), Google's formatted_address is often just the
                // surrounding locality ("Ikeja, Lagos, Nigeria") — not the
                // airport itself. Preferring it outright silently replaced the
                // exact place someone tapped with a vague area name. Combine
                // both when they genuinely differ; only formatted_address is
                // used when name is already part of it (a normal street
                // address), to avoid "24 Broad Street, 24 Broad Street, Lagos".
                let address: string | undefined;
                if (name && formatted && !formatted.toLowerCase().includes(name.toLowerCase())) {
                    address = `${name}, ${formatted}`;
                } else {
                    address = formatted || name;
                }
                const loc = place?.geometry?.location;
                if (address) onPlaceSelectedRef.current(address, loc ? { lat: loc.lat(), lng: loc.lng() } : undefined);
            });

            // The script loading fine only proves the Maps JavaScript API key is
            // valid — it says nothing about whether the "Places API" (legacy, the
            // one this classic Autocomplete widget calls) is actually enabled on
            // the project. When it isn't, the widget attaches with zero errors and
            // simply never returns predictions — silent, and indistinguishable
            // from the user just not having typed enough yet. So probe it for
            // real with a throwaway query once, on load.
            try {
                const probe = new window.google.maps.places.AutocompleteService();
                probe.getPlacePredictions(
                    { input: "Lagos", componentRestrictions: { country: "ng" } },
                    (_results: unknown, status: string) => {
                        if (cancelledRef.current) return;
                        if (status !== "OK" && status !== "ZERO_RESULTS") {
                            console.error("[Places Autocomplete] disabled or misconfigured — status:", status);
                            setSupported(false);
                        }
                    }
                );
            } catch {
                setSupported(false);
            }
        }).catch(() => setSupported(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return { inputRef: attach, supported };
}
