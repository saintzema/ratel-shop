"use client";

import { MapPin } from "lucide-react";

/**
 * Renders a delivery address and turns the map pin inside it into a link.
 *
 * Checkout appends the exact coordinates the customer picked from Google's
 * suggestions onto the stored address line (see the checkout page for why it
 * rides in the string rather than a new column). Without this the pin shows
 * up as a raw URL in the middle of the address — worse than useless to a
 * seller squinting at an order on a phone. Here it becomes a tap that opens
 * the real location in Maps, and the address itself reads cleanly.
 *
 * Degrades to plain text for every older order that has no pin.
 */
export function DeliveryAddress({ value, className = "" }: { value?: string | null; className?: string }) {
    if (!value) return null;

    // Checkout joins the pin with " · ", but match any trailing maps URL so a
    // differently-formatted or hand-edited address still links.
    const match = value.match(/(https?:\/\/(?:www\.)?google\.com\/maps\/[^\s]+)/);
    if (!match) return <span className={className}>{value}</span>;

    const url = match[1];
    const text = value.replace(url, "").replace(/[\s·,]+$/, "").trim();

    return (
        <span className={className}>
            {text}{" "}
            <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="inline-flex items-center gap-0.5 font-bold text-brand-green-700 underline decoration-dotted underline-offset-2"
            >
                <MapPin className="h-3 w-3" /> Open in Maps
            </a>
        </span>
    );
}
