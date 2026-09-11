// Shared Google Maps JS loader — used by both Places Autocomplete (pickup/
// dropoff typing) and RideMap (the live map). Loads the script exactly once
// regardless of how many callers ask for it.
declare global {
    interface Window {
        google?: any;
        __fpGoogleMapsLoading?: Promise<void>;
    }
}

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

export const hasGoogleMapsKey = !!API_KEY;

export function loadGoogleMaps(): Promise<void> | null {
    if (!API_KEY) return null;
    if (window.google?.maps?.places) return Promise.resolve();
    if (window.__fpGoogleMapsLoading) return window.__fpGoogleMapsLoading;

    window.__fpGoogleMapsLoading = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places,geometry`;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Failed to load Google Maps"));
        document.head.appendChild(script);
    });
    return window.__fpGoogleMapsLoading;
}
