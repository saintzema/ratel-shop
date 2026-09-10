"use client";

import { useEffect, useRef, useState } from "react";
import { Navigation2, Clock, MapPinned } from "lucide-react";
import { loadGoogleMaps, hasGoogleMapsKey } from "@/lib/google-maps";

interface RideMapProps {
    rideId: string;
    pickup: string;
    dropoff: string;
    /** Which party's live pin to show — the OTHER side from whoever is viewing. */
    trackRole: "driver" | "rider";
    active: boolean;
}

const POLL_MS = 4000;

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
export function RideMap({ rideId, pickup, dropoff, trackRole, active }: RideMapProps) {
    const mapDivRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<any>(null);
    const liveMarkerRef = useRef<any>(null);
    const liveMarkerPos = useRef<{ lat: number; lng: number } | null>(null);
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
            const geocode = (address: string): Promise<any> =>
                new Promise((resolve) => {
                    geocoder.geocode({ address: `${address}, Nigeria` }, (results: any, status: string) => {
                        resolve(status === "OK" && results?.[0] ? results[0].geometry.location : null);
                    });
                });

            Promise.all([geocode(pickup), geocode(dropoff)]).then(([pickupLoc, dropoffLoc]) => {
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
                const directionsRenderer = new google.maps.DirectionsRenderer({
                    map,
                    suppressMarkers: true,
                    polylineOptions: { strokeColor: "#16a34a", strokeWeight: 4, strokeOpacity: 0.85 },
                });

                directionsService.route(
                    { origin: pickupLoc, destination: dropoffLoc, travelMode: google.maps.TravelMode.DRIVING },
                    (result: any, status: string) => {
                        if (status === "OK" && result) {
                            directionsRenderer.setDirections(result);
                            const leg = result.routes?.[0]?.legs?.[0];
                            if (leg) setRouteInfo({ distance: leg.distance?.text, duration: leg.duration?.text });
                        } else {
                            // Directions failed (e.g. no drivable route found) — the two
                            // pins and geocoded locations are still real and useful on
                            // their own, just without a drawn route line.
                            const bounds = new google.maps.LatLngBounds();
                            bounds.extend(pickupLoc); bounds.extend(dropoffLoc);
                            map.fitBounds(bounds, 80);
                        }
                    }
                );

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
                const res = await fetch(`/api/rides/${rideId}/location`, { headers: authHeaders() });
                if (!res.ok) return;
                const data = await res.json();
                const point = trackRole === "driver" ? data?.driver : data?.rider;
                if (!point) return;

                const to = { lat: point.lat, lng: point.lng };
                if (!liveMarkerRef.current) {
                    liveMarkerRef.current = new google.maps.Marker({
                        position: to,
                        map: mapRef.current,
                        icon: {
                            path: "M12 2C8 2 5 5 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-4-3-7-7-7z",
                            fillColor: trackRole === "driver" ? "#16a34a" : "#f97316",
                            fillOpacity: 1,
                            strokeColor: "#fff",
                            strokeWeight: 1.5,
                            scale: 1.6,
                            anchor: new google.maps.Point(12, 22),
                        },
                        title: trackRole === "driver" ? "Your driver" : "Rider",
                    });
                    liveMarkerPos.current = to;
                    return;
                }

                const from = liveMarkerPos.current || to;
                liveMarkerPos.current = to;
                const start = performance.now();
                const duration = POLL_MS - 300; // finish just before the next reading arrives
                if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

                const step = (now: number) => {
                    const t = Math.min(1, (now - start) / duration);
                    const eased = 1 - Math.pow(1 - t, 2); // ease-out
                    const lat = from.lat + (to.lat - from.lat) * eased;
                    const lng = from.lng + (to.lng - from.lng) * eased;
                    liveMarkerRef.current.setPosition({ lat, lng });
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
        <div className="rounded-2xl overflow-hidden border border-gray-100 relative">
            <div ref={mapDivRef} className="h-56 w-full bg-gray-100" />
            {mapError && (
                <div className="absolute inset-0 bg-white/95 flex flex-col items-center justify-center gap-2 text-center px-6">
                    <MapPinned className="h-6 w-6 text-gray-300" />
                    <p className="text-xs text-gray-400">Couldn't map this address exactly — the ride still works, just without the live view.</p>
                </div>
            )}
            {routeInfo && (
                <div className="absolute top-2 left-2 right-2 bg-white/95 backdrop-blur rounded-xl px-3 py-2 flex items-center gap-4 text-xs font-bold text-gray-700 shadow-sm">
                    <span className="flex items-center gap-1"><Navigation2 className="h-3.5 w-3.5 text-brand-green-600" /> {routeInfo.distance}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-brand-green-600" /> {routeInfo.duration}</span>
                </div>
            )}
        </div>
    );
}
