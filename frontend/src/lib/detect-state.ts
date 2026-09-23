import { NIGERIAN_STATES } from "./nigerian-states";
import { loadGoogleMaps, hasGoogleMapsKey } from "./google-maps";
import { freeReverseGeocode, type LatLngLiteral } from "./free-distance";

export interface ResolvedPlace {
    /** Human-readable address for the pickup field, or null if nothing resolved. */
    address: string | null;
    /** One of NIGERIAN_STATES' `state` values, or null if the fix is outside Nigeria. */
    state: string | null;
}

// Google names the FCT "Federal Capital Territory", the free reverse geocoder
// usually says "Abuja", and our own list calls it "Abuja (FCT)" — so state
// matching can't be a plain string compare. A few other states carry an
// alternate spelling that shows up in one geocoder but not the other.
const STATE_ALIASES: Record<string, string> = {
    "federal capital territory": "Abuja (FCT)",
    "abuja": "Abuja (FCT)",
    "fct": "Abuja (FCT)",
    "nassarawa": "Nasarawa",
    "akwa-ibom": "Akwa Ibom",
    "cross river state": "Cross River",
};

/**
 * Best-effort "which of our states is this address in", from whatever text a
 * geocoder hands back. Checks the state names first, then falls back to the
 * known city list — a fix in Lekki reverse-geocodes to a street address that
 * may never contain the word "Lagos".
 */
export function matchNigerianState(text: string): string | null {
    const hay = text.toLowerCase();
    for (const [alias, state] of Object.entries(STATE_ALIASES)) {
        if (hay.includes(alias)) return state;
    }
    for (const entry of NIGERIAN_STATES) {
        const bare = entry.state.replace(/\s*\(.*\)\s*/, "").toLowerCase();
        if (hay.includes(bare)) return entry.state;
    }
    for (const entry of NIGERIAN_STATES) {
        if (entry.cities.some(c => hay.includes(c.toLowerCase()))) return entry.state;
    }
    return null;
}

/**
 * Turn a GPS fix into the address to prefill and the state to scope drivers
 * to — Google first when a key is configured (its address_components carry an
 * explicit administrative_area_level_1, which beats substring-matching a
 * formatted string), otherwise the free reverse geocoder.
 *
 * Never throws: a rider whose location resolves to nothing still gets the
 * manual state picker, exactly as before this existed.
 */
export async function reverseGeocodePlace(point: LatLngLiteral): Promise<ResolvedPlace> {
    if (hasGoogleMapsKey) {
        await loadGoogleMaps()?.catch(() => null);
        if (typeof window !== "undefined" && window.google?.maps) {
            const geocoder = new window.google.maps.Geocoder();
            const result = await new Promise<any>((resolve) => {
                geocoder.geocode({ location: point }, (results: any, status: string) => {
                    resolve(status === "OK" && results?.[0] ? results[0] : null);
                });
            });
            if (result) {
                const admin = (result.address_components || []).find((c: any) =>
                    c.types?.includes("administrative_area_level_1"));
                const state = (admin?.long_name && matchNigerianState(admin.long_name))
                    || matchNigerianState(result.formatted_address || "");
                return { address: result.formatted_address || null, state };
            }
        }
    }
    const address = await freeReverseGeocode(point);
    return { address, state: address ? matchNigerianState(address) : null };
}
