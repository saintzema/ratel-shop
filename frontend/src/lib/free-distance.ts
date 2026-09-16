// Distance estimation that works with ZERO API key — Google Maps' JS SDK
// (lib/google-maps.ts) needs NEXT_PUBLIC_GOOGLE_MAPS_API_KEY, which was never
// actually provisioned in this environment (confirmed absent from every env
// file). That meant every distance-gated fare estimate (ride AND delivery)
// silently never ran at all — "what you'll pay" sat on its hardcoded default
// forever, which read exactly like "the price doesn't adjust." This is the
// fallback path: OpenStreetMap's Nominatim geocoder (no key, free, used
// client-side same as many production apps) for coordinates, then Haversine
// straight-line distance corrected by a fixed road-distance factor (real
// roads are never a straight line — 1.35x is the commonly used approximation
// when a real routing engine isn't available).
//
// Cached in localStorage with the same shape/intent as geo-cache.ts's Google
// Maps caching, so repeat lookups of the same address don't re-hit Nominatim
// (whose usage policy expects light, cached client use, not a request storm).

export interface LatLngLiteral {
    lat: number;
    lng: number;
}

const GEOCODE_TTL_MS = 24 * 60 * 60 * 1000;
const ROAD_DISTANCE_FACTOR = 1.35;

function readCache<T>(key: string): T | null {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        const entry: { value: T; expiresAt: number } = JSON.parse(raw);
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
        localStorage.setItem(key, JSON.stringify({ value, expiresAt: Date.now() + ttlMs }));
    } catch {
        // storage full/unavailable — caching is an optimization, never block on it
    }
}

/** Geocode a Nigerian address via Nominatim — no API key required. */
export async function freeGeocode(address: string): Promise<LatLngLiteral | null> {
    const key = `fp-free-geocode:${address.trim().toLowerCase()}`;
    const cached = readCache<LatLngLiteral>(key);
    if (cached) return cached;

    try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=ng&q=${encodeURIComponent(address)}`;
        const res = await fetch(url, { headers: { "Accept-Language": "en" } });
        if (!res.ok) return null;
        const results = await res.json();
        const first = Array.isArray(results) ? results[0] : null;
        if (!first) return null;
        const point: LatLngLiteral = { lat: parseFloat(first.lat), lng: parseFloat(first.lon) };
        if (Number.isNaN(point.lat) || Number.isNaN(point.lng)) return null;
        writeCache(key, point, GEOCODE_TTL_MS);
        return point;
    } catch {
        return null;
    }
}

/** Great-circle distance between two points, in km. */
export function haversineKm(a: LatLngLiteral, b: LatLngLiteral): number {
    const R = 6371;
    const dLat = ((b.lat - a.lat) * Math.PI) / 180;
    const dLng = ((b.lng - a.lng) * Math.PI) / 180;
    const lat1 = (a.lat * Math.PI) / 180;
    const lat2 = (b.lat * Math.PI) / 180;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/** Approximate real driving distance (km) between two straight-line points. */
export function approxRoadKm(a: LatLngLiteral, b: LatLngLiteral): number {
    return haversineKm(a, b) * ROAD_DISTANCE_FACTOR;
}

/**
 * Total approximate driving distance across an ordered route of 2+ points
 * (pickup → stop 1 → stop 2 → ... → dropoff) — each leg geocoded and summed,
 * so a multi-stop trip actually prices longer than a direct one instead of
 * being priced as if the stops didn't exist.
 */
export async function freeRouteDistanceKm(addresses: string[]): Promise<number | null> {
    const valid = addresses.map(a => a.trim()).filter(Boolean);
    if (valid.length < 2) return null;

    const points = await Promise.all(valid.map(a => freeGeocode(`${a}, Nigeria`)));
    if (points.some(p => !p)) return null;

    let total = 0;
    for (let i = 0; i < points.length - 1; i++) {
        total += approxRoadKm(points[i]!, points[i + 1]!);
    }
    return total;
}
