// Teardrop map pins (like the reference AMap/Google-style pin: a colored
// drop shape with a white dot at its center) instead of a plain filled
// circle — used for pickup/drop-off markers on the ride/delivery booking
// map. A single SVG path, not two stacked markers: the inner circle is
// wound in the OPPOSITE direction from the outer teardrop, so the browser's
// default (nonzero) SVG fill rule renders it as a hole rather than filling
// over it.
export function teardropPinIcon(google: any, color: string, scale = 1.6) {
    return {
        path:
            "M 0,0 C -2,-20 -10,-22 -10,-30 A 10,10 0 1,1 10,-30 C 10,-22 2,-20 0,0 z " +
            "M -4,-30 A 4,4 0 1,0 4,-30 A 4,4 0 1,0 -4,-30 z",
        fillColor: color,
        fillOpacity: 1,
        strokeColor: "#00000033",
        strokeWeight: 1,
        scale,
        // The path's own (0,0) is already the drop's downward-pointing tip —
        // anchor there so the tip (not the marker's bounding box) sits on
        // the actual coordinate.
        anchor: new google.maps.Point(0, 0),
    };
}

export const PIN_GREEN = "#16a34a"; // pickup
export const PIN_RED = "#dc2626"; // drop-off
