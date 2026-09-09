"use client";

import { useEffect, useRef, useState } from "react";

declare global {
    interface Window {
        google?: any;
        __fpGoogleMapsLoading?: Promise<void>;
    }
}

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

/**
 * Loads the Google Places script exactly once, however many inputs use it.
 * No-ops entirely (returns null forever) when NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
 * isn't set — pickup/dropoff fall back to the plain text inputs they already
 * were, never a broken half-feature. Set the key in Vercel's env vars
 * (Google Cloud Console → enable "Places API" + "Maps JavaScript API",
 * restrict the key by HTTP referrer to fairprice.ng) to turn this on.
 */
function loadGoogleMaps(): Promise<void> | null {
    if (!API_KEY) return null;
    if (window.google?.maps?.places) return Promise.resolve();
    if (window.__fpGoogleMapsLoading) return window.__fpGoogleMapsLoading;

    window.__fpGoogleMapsLoading = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places`;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Failed to load Google Maps"));
        document.head.appendChild(script);
    });
    return window.__fpGoogleMapsLoading;
}

/** Attaches Places Autocomplete (Nigeria-restricted) to an input, or no-ops if there's no API key. */
export function usePlacesAutocomplete(onPlaceSelected: (address: string) => void) {
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
                fields: ["formatted_address", "name"],
            });
            autocomplete.addListener("place_changed", () => {
                const place = autocomplete.getPlace();
                const address = place?.formatted_address || place?.name;
                if (address) onPlaceSelected(address);
            });
        }).catch(() => setSupported(false));

        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return { inputRef, supported };
}
