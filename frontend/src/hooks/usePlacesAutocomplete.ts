"use client";

import { useEffect, useRef, useState } from "react";
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
 */
export function usePlacesAutocomplete(onPlaceSelected: (address: string, coords?: { lat: number; lng: number }) => void) {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [supported, setSupported] = useState(!!API_KEY);

    useEffect(() => {
        if (!API_KEY || !inputRef.current) return;
        let autocomplete: any;
        let cancelled = false;

        loadGoogleMaps()?.then(() => {
            if (cancelled || !inputRef.current || !window.google?.maps?.places) return;
            autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
                componentRestrictions: { country: "ng" },
                fields: ["formatted_address", "name", "geometry"],
            });
            autocomplete.addListener("place_changed", () => {
                const place = autocomplete.getPlace();
                const address = place?.formatted_address || place?.name;
                const loc = place?.geometry?.location;
                if (address) onPlaceSelected(address, loc ? { lat: loc.lat(), lng: loc.lng() } : undefined);
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
                        if (cancelled) return;
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

        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return { inputRef, supported };
}
