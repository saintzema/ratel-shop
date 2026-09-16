"use client";

import { useEffect, useRef, useState } from "react";
import { Navigation2, Clock, MapPinned } from "lucide-react";
import { loadGoogleMaps, hasGoogleMapsKey } from "@/lib/google-maps";
import { cachedGeocode, cachedDirections } from "@/lib/geo-cache";
import { bearingDegrees, distanceMeters } from "@/lib/geo-math";
import { teardropPinIcon, PIN_GREEN, PIN_RED } from "@/lib/map-pins";

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
    /** e.g. "White" — appended to the plate label, same "PLATE · Color" format as the AMap/inDrive reference screenshots. */
    vehicleColor?: string;
    /** "ride" (default) polls /api/rides/[id]/location; "delivery" polls /api/deliveries/[id]/location. */
    kind?: "ride" | "delivery";
}

const POLL_MS = 4000;
// Below this, two consecutive GPS fixes are noise (parked car, phone drift),
// not real movement — recomputing bearing on noise makes the arrow twitch.
const MIN_MOVEMENT_METERS = 3;

/** A big, legible plate-number pill, rendered as its own non-rotating marker floating above the live pin. */
function buildPlateIcon(google: any, plateNumber: string, vehicleColor?: string) {
    const text = vehicleColor ? `${plateNumber.toUpperCase()} · ${vehicleColor}` : plateNumber.toUpperCase();
    const w = Math.max(64, text.length * 10 + 28);
    const h = 26;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="${h / 2}" fill="#111827" stroke="#ffffff" stroke-width="2"/><text x="${w / 2}" y="${h / 2 + 5}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="13" font-weight="800" fill="#ffffff" letter-spacing="0.5">${text}</text></svg>`;
    return {
        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
        scaledSize: new google.maps.Size(w, h),
        anchor: new google.maps.Point(w / 2, h + 12), // floats the pill ~12px above the pin
    };
}

const VEHICLE_COLOR_HEX: Record<string, string> = {
    white: "#f4f4f5", silver: "#9ca3af", grey: "#6b7280", gray: "#6b7280",
    black: "#1f2937", red: "#dc2626", blue: "#2563eb", green: "#16a34a",
    yellow: "#eab308", gold: "#d4af37", orange: "#f97316", brown: "#78350f",
    beige: "#d6c7a1", purple: "#7c3aed", maroon: "#7f1d1d",
};
/** The registered vehicle's real color, boldly rendered on the map instead of a fixed brand green — same "this is literally your car" read as the yellow taxi icon in the AMap reference screenshot. */
function carColorHex(vehicleColor?: string): string {
    if (!vehicleColor) return "#16a34a";
    return VEHICLE_COLOR_HEX[vehicleColor.trim().toLowerCase()] || "#16a34a";
}

/** A small car glyph, rotated to face the direction of travel — reads as an actual approaching vehicle rather than a generic arrowhead. */
function buildCarIcon(google: any, rotation: number, color: string) {
    // A near-white/light car needs a dark outline to read against the map's
    // own light basemap — a white stroke on a white car would be invisible.
    const isLight = ["#f4f4f5", "#9ca3af", "#eab308", "#d6c7a1"].includes(color);
    return {
        path: "M -1.2 -2.6 L 1.2 -2.6 L 1.9 -0.6 L 1.9 2.2 L 1.3 2.2 L 1.3 1.6 L -1.3 1.6 L -1.3 2.2 L -1.9 2.2 L -1.9 -0.6 Z M -1.4 0 L -1.1 -1.8 L 1.1 -1.8 L 1.4 0 Z",
        fillColor: color,
        fillOpacity: 1,
        strokeColor: isLight ? "#1f2937" : "#fff",
        strokeWeight: 1,
        scale: 7,
        anchor: new google.maps.Point(0, 0),
        rotation,
    };
}

/** The viewer's own position — a blue dot with a heading cone when device orientation is available, a plain dot otherwise. */
function buildMeIcon(google: any, headingDeg: number | null) {
    if (headingDeg == null) {
        return {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: "#3b82f6",
            fillOpacity: 1,
            strokeColor: "#fff",
            strokeWeight: 2,
        };
    }
    // A dot with a triangular cone pointing wherever the phone is facing —
    // same "you are here, and this is which way you're looking" affordance
    // AMap/inDrive show for a waiting rider.
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="-22 -22 44 44">
        <g transform="rotate(${headingDeg})">
            <path d="M0,-20 L11,4 A13,13 0 0 1 -11,4 Z" fill="#3b82f6" fill-opacity="0.35"/>
        </g>
        <circle cx="0" cy="0" r="7.5" fill="#3b82f6" stroke="#fff" stroke-width="2.5"/>
    </svg>`;
    return {
        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
        scaledSize: new google.maps.Size(44, 44),
        anchor: new google.maps.Point(22, 22),
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
export function RideMap({ rideId, pickup, dropoff, trackRole, active, plateNumber, vehicleColor, kind = "ride" }: RideMapProps) {
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
    // The viewer's own position — only meaningful for the waiting side
    // (rider/sender): "my circle, with a pointer facing wherever my phone
    // faces, while the car closes in" is the inDrive/AMap rider view.
    const meMarkerRef = useRef<any>(null);
    const meHeadingDegRef = useRef<number | null>(null);
    const meWatchIdRef = useRef<number | null>(null);
    const [compassSupported, setCompassSupported] = useState(false);
    const [compassGranted, setCompassGranted] = useState(false);

    const [ready, setReady] = useState(false);
    const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string } | null>(null);
    const [mapError, setMapError] = useState(false);
    const isWaitingSide = trackRole === "rider" || trackRole === "sender";

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
                    icon: teardropPinIcon(google, PIN_GREEN),
                    title: "Pickup",
                });
                new google.maps.Marker({
                    position: dropoffLoc, map,
                    icon: teardropPinIcon(google, PIN_RED),
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

    // My own position + heading — only for the side actually waiting on a
    // moving party (rider waiting for a driver, sender waiting for a
    // courier). Real GPS via watchPosition, real compass via
    // deviceorientation — never a fabricated heading.
    useEffect(() => {
        if (!ready || !active || !isWaitingSide || !mapRef.current || !window.google?.maps) return;
        const google = window.google;
        setCompassSupported(typeof window.DeviceOrientationEvent !== "undefined");

        const updateMeMarker = (pos: { lat: number; lng: number }) => {
            if (!meMarkerRef.current) {
                meMarkerRef.current = new google.maps.Marker({
                    position: pos,
                    map: mapRef.current,
                    icon: buildMeIcon(google, meHeadingDegRef.current),
                    zIndex: 600,
                    title: "You",
                });
            } else {
                meMarkerRef.current.setPosition(pos);
            }
        };

        let cancelled = false;
        if (navigator.geolocation) {
            meWatchIdRef.current = navigator.geolocation.watchPosition(
                (p) => { if (!cancelled) updateMeMarker({ lat: p.coords.latitude, lng: p.coords.longitude }); },
                () => {},
                { enableHighAccuracy: true, maximumAge: 5000, timeout: 8000 }
            );
        }

        const onOrientation = (e: DeviceOrientationEvent) => {
            const heading = (e as any).webkitCompassHeading ?? (e.alpha != null ? 360 - e.alpha : null);
            if (heading == null) return;
            meHeadingDegRef.current = heading;
            if (meMarkerRef.current) meMarkerRef.current.setIcon(buildMeIcon(google, heading));
        };
        if (compassGranted) window.addEventListener("deviceorientation", onOrientation);

        return () => {
            cancelled = true;
            if (meWatchIdRef.current !== null) navigator.geolocation.clearWatch(meWatchIdRef.current);
            window.removeEventListener("deviceorientation", onOrientation);
            meMarkerRef.current?.setMap(null);
            meMarkerRef.current = null;
        };
    }, [ready, active, isWaitingSide, compassGranted]);

    // iOS gates DeviceOrientationEvent behind an explicit user-gesture
    // permission prompt — Android/desktop just work, so this is only ever
    // shown when that gate actually exists and hasn't been cleared yet.
    const requestCompass = async () => {
        try {
            const anyDOE = window.DeviceOrientationEvent as any;
            if (typeof anyDOE?.requestPermission === "function") {
                const result = await anyDOE.requestPermission();
                if (result === "granted") setCompassGranted(true);
            } else {
                setCompassGranted(true);
            }
        } catch {
            setCompassGranted(true); // no gate on this platform — proceed
        }
    };

    // Poll the OTHER party's live position and animate the marker smoothly
    // between readings instead of snapping — the actual "seamless" quality
    // being asked for. Linear interpolation over the poll window with an
    // ease-out curve reads as continuous motion at a 4s sampling rate.
    useEffect(() => {
        if (!ready || !active || !mapRef.current || !window.google?.maps) return;

        const google = window.google;

        // Zoom tighter and follow the two live points once they're both
        // known — a fixed route-length zoom stops making sense once the car
        // is 300m away and the whole 9km route is still in frame.
        const fitToLiveParties = (otherPos: { lat: number; lng: number }) => {
            if (!isWaitingSide) return;
            const myPos = meMarkerRef.current?.getPosition();
            if (!myPos) return;
            const bounds = new google.maps.LatLngBounds();
            bounds.extend(otherPos);
            bounds.extend({ lat: myPos.lat(), lng: myPos.lng() });
            mapRef.current.fitBounds(bounds, 90);
            const z = mapRef.current.getZoom();
            if (z > 17) mapRef.current.setZoom(17); // don't zoom in past street level on a near-arrival
        };

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
                const arrowIcon = (rotation: number) => isPrimarySide
                    ? buildCarIcon(google, rotation, carColorHex(vehicleColor))
                    : {
                        path: "M12,2 L19,21 L12,17 L5,21 Z",
                        fillColor: "#f97316",
                        fillOpacity: 1,
                        strokeColor: "#fff",
                        strokeWeight: 1.5,
                        scale: 1.7,
                        anchor: new google.maps.Point(12, 12),
                        rotation,
                    };

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
                            icon: buildPlateIcon(google, plateNumber, vehicleColor),
                            zIndex: 999,
                            clickable: false,
                        });
                    }
                    liveMarkerPos.current = to;
                    fitToLiveParties(to);
                    return;
                }

                const from = liveMarkerPos.current || to;
                liveMarkerPos.current = to;
                fitToLiveParties(to);

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
            {isWaitingSide && active && compassSupported && !compassGranted && (
                <button
                    onClick={requestCompass}
                    className="absolute bottom-2.5 left-2.5 bg-white/90 backdrop-blur rounded-full px-3 py-1.5 text-[10px] font-bold text-gray-600 shadow-sm"
                >
                    Enable compass
                </button>
            )}
        </div>
    );
}
