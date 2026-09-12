"use client";

import { useEffect, useRef, useState } from "react";
import { Navigation2, Clock, LocateFixed } from "lucide-react";
import { loadGoogleMaps, hasGoogleMapsKey } from "@/lib/google-maps";
import { cachedGeocode, cachedDirections } from "@/lib/geo-cache";

interface BookingMapProps {
    pickup: string;
    dropoff: string;
}

/**
 * The map AMap/inDrive show from the moment you open the booking screen —
 * your own live position pulsing on the map, pickup/dropoff pins dropping in
 * as you type, a route line once both are set. RideMap (the OTHER map in
 * this app) intentionally only exists once a ride/delivery is actually
 * posted and matched, tracking the OTHER party's live position over a real
 * trip's own API — there's no trip yet at booking time for that component
 * to attach to. This is the pre-booking counterpart: no trip id, no
 * server polling, just this device's own geolocation (watchPosition, so the
 * pointer genuinely moves in real time) plus the two addresses being typed.
 */
export function BookingMap({ pickup, dropoff }: BookingMapProps) {
    const mapDivRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<any>(null);
    const meMarkerRef = useRef<any>(null);
    const pickupMarkerRef = useRef<any>(null);
    const dropoffMarkerRef = useRef<any>(null);
    const routeLineRef = useRef<any>(null);
    const watchIdRef = useRef<number | null>(null);

    const [ready, setReady] = useState(false);
    const [mapError, setMapError] = useState(false);
    const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string } | null>(null);
    const [locating, setLocating] = useState(true);

    // Map + my own live position, once.
    useEffect(() => {
        if (!hasGoogleMapsKey || !mapDivRef.current) { setMapError(true); return; }
        let cancelled = false;

        loadGoogleMaps()?.then(() => {
            if (cancelled || !mapDivRef.current || !window.google?.maps) return;
            const google = window.google;

            const map = new google.maps.Map(mapDivRef.current, {
                center: { lat: 9.082, lng: 8.6753 },
                zoom: 6,
                disableDefaultUI: true,
                zoomControl: true,
                gestureHandling: "greedy",
                styles: [{ featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }],
            });
            mapRef.current = map;
            setReady(true);

            if (!navigator.geolocation) { setLocating(false); return; }
            watchIdRef.current = navigator.geolocation.watchPosition(
                (pos) => {
                    const me = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                    setLocating(false);
                    if (!meMarkerRef.current) {
                        map.setCenter(me);
                        map.setZoom(14);
                        meMarkerRef.current = new google.maps.Marker({
                            position: me,
                            map,
                            icon: {
                                path: google.maps.SymbolPath.CIRCLE,
                                scale: 8,
                                fillColor: "#3b82f6",
                                fillOpacity: 1,
                                strokeColor: "#fff",
                                strokeWeight: 2,
                            },
                            title: "You",
                            zIndex: 500,
                        });
                        // The AMap-style pulsing ring around "you are here" — a second,
                        // larger translucent circle that CSS-animates via a repeating
                        // radius tween (Maps markers can't do CSS, so this steps the
                        // radius on a timer instead).
                        const pulse = new google.maps.Circle({
                            map, center: me, radius: 40,
                            fillColor: "#3b82f6", fillOpacity: 0.25, strokeWeight: 0, zIndex: 400,
                        });
                        let growing = true;
                        const t = setInterval(() => {
                            const r = pulse.getRadius() ?? 40;
                            if (r >= 140) growing = false; else if (r <= 40) growing = true;
                            pulse.setRadius(growing ? r + 4 : r - 4);
                            pulse.setCenter(meMarkerRef.current?.getPosition() || me);
                        }, 60);
                        (meMarkerRef as any).pulseInterval = t;
                    } else {
                        meMarkerRef.current.setPosition(me);
                    }
                },
                () => setLocating(false),
                { enableHighAccuracy: true, maximumAge: 5000, timeout: 8000 }
            );
        }).catch(() => setMapError(true));

        return () => {
            cancelled = true;
            if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
            if ((meMarkerRef as any).pulseInterval) clearInterval((meMarkerRef as any).pulseInterval);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Pickup/dropoff pins + route, redrawn as the typed addresses settle.
    useEffect(() => {
        if (!ready || !mapRef.current || !window.google?.maps) return;
        const google = window.google;
        let cancelled = false;

        const debounce = setTimeout(async () => {
            const geocoder = new google.maps.Geocoder();
            const [pickupLoc, dropoffLoc] = await Promise.all([
                pickup.trim().length > 3 ? cachedGeocode(geocoder, `${pickup}, Nigeria`) : Promise.resolve(null),
                dropoff.trim().length > 3 ? cachedGeocode(geocoder, `${dropoff}, Nigeria`) : Promise.resolve(null),
            ]);
            if (cancelled) return;

            pickupMarkerRef.current?.setMap(null);
            dropoffMarkerRef.current?.setMap(null);
            routeLineRef.current?.setMap(null);
            setRouteInfo(null);

            if (pickupLoc) {
                pickupMarkerRef.current = new google.maps.Marker({
                    position: pickupLoc, map: mapRef.current,
                    icon: { path: google.maps.SymbolPath.CIRCLE, scale: 9, fillColor: "#16a34a", fillOpacity: 1, strokeColor: "#fff", strokeWeight: 2 },
                    title: "Pickup",
                });
            }
            if (dropoffLoc) {
                dropoffMarkerRef.current = new google.maps.Marker({
                    position: dropoffLoc, map: mapRef.current,
                    icon: { path: google.maps.SymbolPath.CIRCLE, scale: 9, fillColor: "#dc2626", fillOpacity: 1, strokeColor: "#fff", strokeWeight: 2 },
                    title: "Drop-off",
                });
            }

            if (pickupLoc && dropoffLoc) {
                const directionsService = new google.maps.DirectionsService();
                const route = await cachedDirections(directionsService, pickupLoc, dropoffLoc, google.maps.TravelMode.DRIVING);
                if (cancelled) return;
                if (route) {
                    const path = google.maps.geometry.encoding.decodePath(route.encodedPolyline);
                    routeLineRef.current = new google.maps.Polyline({
                        path, map: mapRef.current, strokeColor: "#16a34a", strokeWeight: 4, strokeOpacity: 0.85,
                    });
                    setRouteInfo({ distance: route.distanceText, duration: route.durationText });
                    mapRef.current.fitBounds(route.bounds, 80);
                } else {
                    const bounds = new google.maps.LatLngBounds();
                    bounds.extend(pickupLoc); bounds.extend(dropoffLoc);
                    mapRef.current.fitBounds(bounds, 80);
                }
            } else if (pickupLoc) {
                mapRef.current.setCenter(pickupLoc);
                mapRef.current.setZoom(14);
            } else if (dropoffLoc) {
                mapRef.current.setCenter(dropoffLoc);
                mapRef.current.setZoom(14);
            }
        }, 700);

        return () => { cancelled = true; clearTimeout(debounce); };
    }, [ready, pickup, dropoff]);

    if (!hasGoogleMapsKey) return null;

    return (
        <div className="rounded-[22px] overflow-hidden relative shadow-[0_8px_30px_rgba(16,24,40,0.10)] mb-4" style={{ border: "1px solid rgba(255,255,255,0.6)" }}>
            <div ref={mapDivRef} className="h-48 w-full bg-gray-100" />
            {mapError && (
                <div className="absolute inset-0 bg-white/95 flex flex-col items-center justify-center gap-2 text-center px-6">
                    <p className="text-xs text-gray-400">Live map unavailable right now — you can still book normally.</p>
                </div>
            )}
            {!mapError && locating && (
                <div className="absolute top-2.5 left-2.5 bg-white/90 backdrop-blur rounded-full px-3 py-1.5 flex items-center gap-1.5 text-[11px] font-bold text-gray-600 shadow-sm">
                    <LocateFixed className="h-3.5 w-3.5 animate-pulse text-blue-500" /> Finding you…
                </div>
            )}
            {routeInfo && (
                <div
                    className="absolute top-2.5 left-2.5 right-2.5 rounded-2xl px-3.5 py-2.5 flex items-center gap-4 text-xs font-bold text-gray-700"
                    style={{
                        background: "linear-gradient(145deg, rgba(255,255,255,0.85) 0%, rgba(240,253,244,0.75) 100%)",
                        backdropFilter: "blur(20px) saturate(180%)",
                        WebkitBackdropFilter: "blur(20px) saturate(180%)",
                        border: "1px solid rgba(255,255,255,0.7)",
                        boxShadow: "0 4px 16px rgba(16,24,40,0.08)",
                    }}
                >
                    <span className="flex items-center gap-1.5"><Navigation2 className="h-3.5 w-3.5 text-brand-green-600" /> {routeInfo.distance}</span>
                    <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-brand-green-600" /> {routeInfo.duration}</span>
                </div>
            )}
        </div>
    );
}
