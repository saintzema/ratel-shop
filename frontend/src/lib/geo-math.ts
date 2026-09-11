// Shared great-circle math — used by RideMap (heading + movement-noise gate)
// and GlobalTripBar (remaining-distance progress), so both compute "how far
// apart are these two points" the same real way instead of two copies drifting.

export interface LatLng { lat: number; lng: number }

/** Great-circle bearing from `from` to `to`, in degrees clockwise from north. */
export function bearingDegrees(from: LatLng, to: LatLng): number {
    const toRad = (d: number) => (d * Math.PI) / 180;
    const toDeg = (r: number) => (r * 180) / Math.PI;
    const lat1 = toRad(from.lat), lat2 = toRad(to.lat);
    const dLng = toRad(to.lng - from.lng);
    const y = Math.sin(dLng) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
    return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/** Straight-line distance in meters between two lat/lng points (haversine). */
export function distanceMeters(from: LatLng, to: LatLng): number {
    const R = 6371000;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(to.lat - from.lat), dLng = toRad(to.lng - from.lng);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
}
