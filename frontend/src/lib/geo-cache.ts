// Geocoding and Directions results for a given address/route pair don't
// change minute to minute, but RideMap re-requests both on every mount —
// every page revisit, every dashboard reload — which is real, billed Google
// Maps Platform usage for the exact same lookup. Cache both in localStorage
// with a TTL so repeat views of the same pickup/dropoff don't re-bill.

type CacheEntry<T> = { value: T; expiresAt: number };

const GEOCODE_TTL_MS = 24 * 60 * 60 * 1000; // an address's coordinates don't move
const DIRECTIONS_TTL_MS = 60 * 60 * 1000; // route/duration can shift with traffic

function readCache<T>(key: string): T | null {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        const entry: CacheEntry<T> = JSON.parse(raw);
        if (Date.now() > entry.expiresAt) {
            localStorage.removeItem(key);
            return null;
        }
        return entry.value;
    } catch {
        return null;
    }
}

function writeCache<T>(key: string, value: T, ttlMs: number) {
    try {
        localStorage.setItem(key, JSON.stringify({ value, expiresAt: Date.now() + ttlMs } as CacheEntry<T>));
    } catch {
        // storage full or unavailable — caching is a cost optimization, never block on it
    }
}

export interface LatLngLiteral {
    lat: number;
    lng: number;
}

/** Geocode an address, serving a cached lat/lng when we've resolved it before. */
export function cachedGeocode(geocoder: any, address: string): Promise<LatLngLiteral | null> {
    const key = `fp-geocode:${address.trim().toLowerCase()}`;
    const cached = readCache<LatLngLiteral>(key);
    if (cached) return Promise.resolve(cached);

    return new Promise((resolve) => {
        geocoder.geocode({ address }, (results: any, status: string) => {
            if (status === "OK" && results?.[0]) {
                const loc = results[0].geometry.location;
                const point: LatLngLiteral = { lat: loc.lat(), lng: loc.lng() };
                writeCache(key, point, GEOCODE_TTL_MS);
                resolve(point);
            } else {
                resolve(null);
            }
        });
    });
}

export interface CachedRoute {
    encodedPolyline: string;
    distanceText: string;
    durationText: string;
    bounds: { north: number; south: number; east: number; west: number };
}

/**
 * Directions, cached as just the pieces needed to redraw a route (an encoded
 * polyline + the summary text + bounds) rather than the full DirectionsResult
 * — that result's LatLng instances don't survive JSON serialization with
 * their .lat()/.lng() methods intact, so a raw cache would silently break
 * DirectionsRenderer on a cache hit.
 */
export function cachedDirections(
    directionsService: any,
    origin: LatLngLiteral,
    destination: LatLngLiteral,
    travelMode: any
): Promise<CachedRoute | null> {
    const key = `fp-directions:${origin.lat.toFixed(4)},${origin.lng.toFixed(4)}|${destination.lat.toFixed(4)},${destination.lng.toFixed(4)}`;
    const cached = readCache<CachedRoute>(key);
    if (cached) return Promise.resolve(cached);

    return new Promise((resolve) => {
        directionsService.route({ origin, destination, travelMode }, (result: any, status: string) => {
            if (status !== "OK" || !result?.routes?.[0]) { resolve(null); return; }
            const route = result.routes[0];
            const leg = route.legs?.[0];
            const b = route.bounds;
            // The JS API has represented this as either a plain string or a
            // { points: string } object across versions — handle both.
            const poly = route.overview_polyline;
            const encodedPolyline = typeof poly === "string" ? poly : poly?.points || "";
            const cachedRoute: CachedRoute = {
                encodedPolyline,
                distanceText: leg?.distance?.text || "",
                durationText: leg?.duration?.text || "",
                bounds: { north: b.getNorthEast().lat(), east: b.getNorthEast().lng(), south: b.getSouthWest().lat(), west: b.getSouthWest().lng() },
            };
            writeCache(key, cachedRoute, DIRECTIONS_TTL_MS);
            resolve(cachedRoute);
        });
    });
}
