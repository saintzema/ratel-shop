"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Navigation2, Clock, LocateFixed, Maximize } from "lucide-react";
import { loadGoogleMaps, hasGoogleMapsKey } from "@/lib/google-maps";
import { cachedGeocode, cachedDirections } from "@/lib/geo-cache";
import { teardropPinIcon, PIN_GREEN, PIN_RED } from "@/lib/map-pins";

interface BookingMapProps {
    pickup: string;
    dropoff: string;
    // The exact coordinates the rider picked from the Places suggestions
    // dropdown, when available — preferred over re-geocoding the address
    // STRING. A landmark address is often synthesized as "<name>,
    // <formatted address>" when the two differ (see usePlacesAutocomplete),
    // and re-geocoding that combined, self-contradictory string can resolve
    // to the wrong one of the two places — confirmed as the cause of a
    // pickup/dropoff pair that priced 64km/₦44,700 when the real trip was
    // 11km. Passing the already-resolved point through sidesteps the
    // ambiguity entirely, and keeps the map and fare estimate looking at the
    // exact same location.
    pickupCoords?: { lat: number; lng: number };
    dropoffCoords?: { lat: number; lng: number };
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
export function BookingMap({ pickup, dropoff, pickupCoords, dropoffCoords }: BookingMapProps) {
    const mapRef = useRef<any>(null);
    const meMarkerRef = useRef<any>(null);
    const pickupMarkerRef = useRef<any>(null);
    const dropoffMarkerRef = useRef<any>(null);
    const routeLineRef = useRef<any>(null);
    const watchIdRef = useRef<number | null>(null);
    const cancelledRef = useRef(false);
    // The last route/pin bounds actually drawn — so the "focus route" button
    // can re-fit them after a rider pans/zooms away (gestureHandling is
    // "greedy", i.e. one-finger free pan/zoom, with no other way back).
    const lastBoundsRef = useRef<any>(null);

    const [ready, setReady] = useState(false);
    const [mapError, setMapError] = useState(false);
    const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string } | null>(null);
    const [locating, setLocating] = useState(true);

    useEffect(() => {
        cancelledRef.current = false;
        return () => { cancelledRef.current = true; };
    }, []);

    // Map + my own live position, once the container div actually exists.
    // This used to be a plain useRef checked inside a useEffect(..., []) —
    // fine as long as the div is already in the DOM on the component's very
    // first commit. Both /ride and /send-package gate their whole form
    // behind an async `if (!user) return <SignInPrompt/>` check, so that's
    // NOT guaranteed: the first commit can render the sign-in fallback (no
    // map div at all), and a once-only effect never gets a second chance
    // once the real form mounts later. Confirmed as the exact cause of the
    // address-autocomplete bug on the same pages (see
    // usePlacesAutocomplete's own comment) — a callback ref fixes it the
    // same way here, since React invokes it whenever the div is actually
    // created, on whichever render that turns out to be.
    const attachMapDiv = useCallback((node: HTMLDivElement | null) => {
        if (!node) {
            // Unmounting — a callback ref's return value isn't a cleanup
            // function the way a useEffect's is, so this branch (React
            // calls the ref with null right before/on unmount) is where
            // that cleanup actually has to live instead.
            if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
            if ((meMarkerRef as any).pulseInterval) clearInterval((meMarkerRef as any).pulseInterval);
            return;
        }
        if ((node as any).__fpMapAttached) return;
        if (!hasGoogleMapsKey) { setMapError(true); return; }
        (node as any).__fpMapAttached = true;

        loadGoogleMaps()?.then(() => {
            if (cancelledRef.current || !window.google?.maps) return;
            const google = window.google;

            const map = new google.maps.Map(node, {
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
                pickupCoords ? Promise.resolve(pickupCoords) : (pickup.trim().length > 3 ? cachedGeocode(geocoder, `${pickup}, Nigeria`) : Promise.resolve(null)),
                dropoffCoords ? Promise.resolve(dropoffCoords) : (dropoff.trim().length > 3 ? cachedGeocode(geocoder, `${dropoff}, Nigeria`) : Promise.resolve(null)),
            ]);
            if (cancelled) return;

            pickupMarkerRef.current?.setMap(null);
            dropoffMarkerRef.current?.setMap(null);
            routeLineRef.current?.setMap(null);
            setRouteInfo(null);

            if (pickupLoc) {
                pickupMarkerRef.current = new google.maps.Marker({
                    position: pickupLoc, map: mapRef.current,
                    icon: teardropPinIcon(google, PIN_GREEN),
                    title: "Pickup",
                });
            }
            if (dropoffLoc) {
                dropoffMarkerRef.current = new google.maps.Marker({
                    position: dropoffLoc, map: mapRef.current,
                    icon: teardropPinIcon(google, PIN_RED),
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
                    lastBoundsRef.current = route.bounds;
                    mapRef.current.fitBounds(route.bounds, 80);
                } else {
                    const bounds = new google.maps.LatLngBounds();
                    bounds.extend(pickupLoc); bounds.extend(dropoffLoc);
                    lastBoundsRef.current = bounds;
                    mapRef.current.fitBounds(bounds, 80);
                }
            } else if (pickupLoc) {
                lastBoundsRef.current = null;
                mapRef.current.setCenter(pickupLoc);
                mapRef.current.setZoom(14);
            } else if (dropoffLoc) {
                lastBoundsRef.current = null;
                mapRef.current.setCenter(dropoffLoc);
                mapRef.current.setZoom(14);
            }
        }, 700);

        return () => { cancelled = true; clearTimeout(debounce); };
    }, [ready, pickup, dropoff, pickupCoords, dropoffCoords]);

    const focusRoute = () => {
        if (!mapRef.current || !window.google?.maps) return;
        if (lastBoundsRef.current) {
            mapRef.current.fitBounds(lastBoundsRef.current, 80);
        }
    };

    if (!hasGoogleMapsKey) return null;

    return (
        <div className="rounded-[22px] overflow-hidden relative shadow-[0_8px_30px_rgba(16,24,40,0.10)] mb-4" style={{ border: "1px solid rgba(255,255,255,0.6)" }}>
            <div ref={attachMapDiv} className="h-48 w-full bg-gray-100" />
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
            {!mapError && (pickupMarkerRef.current || dropoffMarkerRef.current) && (
                <button
                    type="button"
                    onClick={focusRoute}
                    title="Focus route"
                    className="absolute bottom-2.5 right-2.5 h-8 w-8 rounded-full bg-white/95 backdrop-blur shadow-md flex items-center justify-center text-gray-600 hover:text-brand-green-700 active:scale-90 transition-transform"
                >
                    <Maximize className="h-4 w-4" />
                </button>
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
