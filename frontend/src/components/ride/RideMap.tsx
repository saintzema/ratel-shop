"use client";

import { useEffect, useRef, useState } from "react";
import { Navigation2, Clock, MapPinned } from "lucide-react";
import { loadGoogleMaps, hasGoogleMapsKey } from "@/lib/google-maps";
import { cachedGeocode, cachedDirections } from "@/lib/geo-cache";
import { bearingDegrees, distanceMeters } from "@/lib/geo-math";

interface RideMapProps {
    /** The ride or delivery id — used to build the /api/{kind}s/[id]/location poll URL. */
    rideId: string;
    pickup: string;
    dropoff: string;
    /** Which party's live pin to show — the OTHER side from whoever is viewing. */
    trackRole: "driver" | "rider" | "courier" | "sender";
    active: boolean;
    /** The driver's plate — shown as a floating label above their live pin so a rider can spot the right car. Only meaningful when trackRole === "driver". */
    plateNumber?: string;
    /** "ride" (default) polls /api/rides/[id]/location; "delivery" polls /api/deliveries/[id]/location. */
    kind?: "ride" | "delivery";
}

const POLL_MS = 4000;
// Below this, two consecutive GPS fixes are noise (parked car, phone drift),
// not real movement — recomputing bearing on noise makes the arrow twitch.
const MIN_MOVEMENT_METERS = 3;

/** A big, legible plate-number pill, rendered as its own non-rotating marker floating above the live pin. */
function buildPlateIcon(google: any, plateNumber: string) {
    const text = plateNumber.toUpperCase();
    const w = Math.max(64, text.length * 10 + 28);
    const h = 26;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="${h / 2}" fill="#111827" stroke="#ffffff" stroke-width="2"/><text x="${w / 2}" y="${h / 2 + 5}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="13" font-weight="800" fill="#ffffff" letter-spacing="0.5">${text}</text></svg>`;
    return {
        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
        scaledSize: new google.maps.Size(w, h),
        anchor: new google.maps.Point(w / 2, h + 12), // floats the pill ~12px above the pin
    };
}

/**
 * The inDrive/AMap-style live map: real route (Google Directions, not a
 * straight line), a pin for pickup and drop-off, and — once the ride is
 * matched — the other party's live position, polled every few seconds and
 * SMOOTHLY interpolated between updates rather than snapping, which is
 * exactly the "seamless" quality AMap has and a naive marker.setPosition()
 * on every poll would not.
 *
 * Renders nothing (the calling page falls back to its plain text summary)
 * if NEXT_PUBLIC_GOOGLE_MAPS_API_KEY isn't set.
 */
export function RideMap({ rideId, pickup, dropoff, trackRole, active, plateNumber, kind = "ride" }: RideMapProps) {
    const apiBase = kind === "delivery" ? "/api/deliveries" : "/api/rides";
    // Rides key the location response as {driver, rider}; deliveries as {courier, sender}.
    const primaryRoleKey = trackRole === "driver" || trackRole === "courier" ? (kind === "delivery" ? "courier" : "driver") : (kind === "delivery" ? "sender" : "rider");
    const mapDivRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<any>(null);
    const liveMarkerRef = useRef<any>(null);
    const plateMarkerRef = useRef<any>(null);
    const liveMarkerPos = useRef<{ lat: number; lng: number } | null>(null);
    const headingRef = useRef<number>(0);
    const animFrameRef = useRef<number | null>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const [ready, setReady] = useState(false);
    const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string } | null>(null);
    const [mapError, setMapError] = useState(false);

    const authHeaders = (): Record<string, string> => {
        const tok = typeof window !== "undefined" ? localStorage.getItem("fp_token") : null;
        return tok ? { Authorization: `Bearer ${tok}` } : {};
    };

    useEffect(() => {
        if (!hasGoogleMapsKey || !mapDivRef.current) return;
        let cancelled = false;

        loadGoogleMaps()?.then(() => {
            if (cancelled || !mapDivRef.current || !window.google?.maps) return;
            const google = window.google;

            const map = new google.maps.Map(mapDivRef.current, {
                center: { lat: 9.082, lng: 8.6753 }, // Nigeria centroid — replaced once geocoded
                zoom: 6,
                disableDefaultUI: true,
                zoomControl: true,
                gestureHandling: "greedy",
                styles: [
                    { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
                ],
            });
            mapRef.current = map;

            const geocoder = new google.maps.Geocoder();

            Promise.all([
                cachedGeocode(geocoder, `${pickup}, Nigeria`),
                cachedGeocode(geocoder, `${dropoff}, Nigeria`),
            ]).then(([pickupLoc, dropoffLoc]) => {
                if (cancelled) return;
                if (!pickupLoc || !dropoffLoc) { setMapError(true); return; }

                new google.maps.Marker({
                    position: pickupLoc, map,
                    icon: { path: google.maps.SymbolPath.CIRCLE, scale: 9, fillColor: "#16a34a", fillOpacity: 1, strokeColor: "#fff", strokeWeight: 2 },
                    title: "Pickup",
                });
                new google.maps.Marker({
                    position: dropoffLoc, map,
                    icon: { path: google.maps.SymbolPath.CIRCLE, scale: 9, fillColor: "#dc2626", fillOpacity: 1, strokeColor: "#fff", strokeWeight: 2 },
                    title: "Drop-off",
                });

                const directionsService = new google.maps.DirectionsService();

                cachedDirections(directionsService, pickupLoc, dropoffLoc, google.maps.TravelMode.DRIVING).then((route) => {
                    if (cancelled) return;
                    if (route) {
                        const path = google.maps.geometry.encoding.decodePath(route.encodedPolyline);
                        new google.maps.Polyline({
                            path, map,
                            strokeColor: "#16a34a", strokeWeight: 4, strokeOpacity: 0.85,
                        });
                        setRouteInfo({ distance: route.distanceText, duration: route.durationText });
                        map.fitBounds(route.bounds, 80);
                    } else {
                        // Directions failed (e.g. no drivable route found) — the two
                        // pins and geocoded locations are still real and useful on
                        // their own, just without a drawn route line.
                        const bounds = new google.maps.LatLngBounds();
                        bounds.extend(pickupLoc); bounds.extend(dropoffLoc);
                        map.fitBounds(bounds, 80);
                    }
                });

                setReady(true);
            });
        }).catch(() => setMapError(true));

        return () => {
            cancelled = true;
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
            if (pollRef.current) clearInterval(pollRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pickup, dropoff]);

    // Poll the OTHER party's live position and animate the marker smoothly
    // between readings instead of snapping — the actual "seamless" quality
    // being asked for. Linear interpolation over the poll window with an
    // ease-out curve reads as continuous motion at a 4s sampling rate.
    useEffect(() => {
        if (!ready || !active || !mapRef.current || !window.google?.maps) return;

        const google = window.google;
        const poll = async () => {
            try {
                const res = await fetch(`${apiBase}/${rideId}/location`, { headers: authHeaders() });
                if (!res.ok) return;
                const data = await res.json();
                const point = data?.[primaryRoleKey];
                if (!point) return;

                const to = { lat: point.lat, lng: point.lng };

                // A compact navigation-arrow icon (not a plain pin) so rotating it to
                // face the direction of travel — AMap/inDrive-style — actually reads
                // as "which way this car/person is facing" rather than a spinning pin.
                const isPrimarySide = trackRole === "driver" || trackRole === "courier";
                const arrowIcon = (rotation: number) => ({
                    path: "M12,2 L19,21 L12,17 L5,21 Z",
                    fillColor: isPrimarySide ? "#16a34a" : "#f97316",
                    fillOpacity: 1,
                    strokeColor: "#fff",
                    strokeWeight: 1.5,
                    scale: 1.7,
                    anchor: new google.maps.Point(12, 12),
                    rotation,
                });

                if (!liveMarkerRef.current) {
                    liveMarkerRef.current = new google.maps.Marker({
                        position: to,
                        map: mapRef.current,
                        icon: arrowIcon(headingRef.current),
                        title: isPrimarySide ? (kind === "delivery" ? "Your courier" : "Your driver") : (kind === "delivery" ? "Sender" : "Rider"),
                    });
                    if (isPrimarySide && plateNumber) {
                        plateMarkerRef.current = new google.maps.Marker({
                            position: to,
                            map: mapRef.current,
                            icon: buildPlateIcon(google, plateNumber),
                            zIndex: 999,
                            clickable: false,
                        });
                    }
                    liveMarkerPos.current = to;
                    return;
                }

                const from = liveMarkerPos.current || to;
                liveMarkerPos.current = to;

                // Real device heading, derived from actual consecutive GPS fixes rather
                // than a compass reading (which needs its own permission prompt and is
                // unreliable while a phone sits in a dash mount) — exactly how a moved
                // car or a walking rider's direction of travel is actually known here.
                if (distanceMeters(from, to) >= MIN_MOVEMENT_METERS) {
                    headingRef.current = bearingDegrees(from, to);
                    liveMarkerRef.current.setIcon(arrowIcon(headingRef.current));
                }

                const start = performance.now();
                const duration = POLL_MS - 300; // finish just before the next reading arrives
                if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

                const step = (now: number) => {
                    const t = Math.min(1, (now - start) / duration);
                    const eased = 1 - Math.pow(1 - t, 2); // ease-out
                    const lat = from.lat + (to.lat - from.lat) * eased;
                    const lng = from.lng + (to.lng - from.lng) * eased;
                    liveMarkerRef.current.setPosition({ lat, lng });
                    if (plateMarkerRef.current) plateMarkerRef.current.setPosition({ lat, lng });
                    if (t < 1) animFrameRef.current = requestAnimationFrame(step);
                };
                animFrameRef.current = requestAnimationFrame(step);
            } catch { /* one missed poll is fine — the next one keeps things moving */ }
        };

        poll();
        pollRef.current = setInterval(poll, POLL_MS);
        return () => { if (pollRef.current) clearInterval(pollRef.current); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ready, active, rideId, trackRole]);

    if (!hasGoogleMapsKey) return null;

    return (
        <div
            className="rounded-[22px] overflow-hidden relative shadow-[0_8px_30px_rgba(16,24,40,0.10)]"
            style={{ border: "1px solid rgba(255,255,255,0.6)" }}
        >
            <div ref={mapDivRef} className="h-56 w-full bg-gray-100" />
            {mapError && (
                <div
                    className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center px-6"
                    style={{
                        background: "linear-gradient(145deg, rgba(255,255,255,0.85) 0%, rgba(248,250,252,0.9) 100%)",
                        backdropFilter: "blur(24px) saturate(160%)",
                        WebkitBackdropFilter: "blur(24px) saturate(160%)",
                    }}
                >
                    <MapPinned className="h-6 w-6 text-gray-300" />
                    <p className="text-xs text-gray-400">Couldn't map this address exactly — the ride still works, just without the live view.</p>
                </div>
            )}
            {routeInfo && (
                <div
                    className="absolute top-2.5 left-2.5 right-2.5 rounded-2xl px-3.5 py-2.5 flex items-center gap-4 text-xs font-bold text-gray-700"
                    style={{
                        background: "linear-gradient(145deg, rgba(255,255,255,0.75) 0%, rgba(240,253,244,0.65) 100%)",
                        backdropFilter: "blur(20px) saturate(180%)",
                        WebkitBackdropFilter: "blur(20px) saturate(180%)",
                        border: "1px solid rgba(255,255,255,0.7)",
                        boxShadow: "0 4px 16px rgba(16,24,40,0.08), inset 0 1px 0 rgba(255,255,255,0.8)",
                    }}
                >
                    <span className="flex items-center gap-1.5"><Navigation2 className="h-3.5 w-3.5 text-brand-green-600" /> {routeInfo.distance}</span>
                    <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-brand-green-600" /> {routeInfo.duration}</span>
                </div>
            )}
        </div>
    );
}
