"use client";

import { useState } from "react";
import { Car, MessageCircle, Headphones, MoreVertical, X, ShieldCheck, Star } from "lucide-react";
import { RideChat } from "@/components/ride/RideChat";
import { MaskedCallButton } from "@/components/ride/MaskedCallButton";
import { formatPrice } from "@/lib/utils";

const CLASS_LABEL: Record<string, string> = { standard: "Standard", newer: "Newer", ev: "EV" };
const COLOR_HEX: Record<string, string> = {
    white: "#f4f4f5", silver: "#9ca3af", grey: "#6b7280", gray: "#6b7280", black: "#1f2937", red: "#dc2626",
    blue: "#2563eb", green: "#16a34a", yellow: "#eab308", gold: "#d4af37", orange: "#f97316", brown: "#78350f",
};

/**
 * The matched-ride card, laid out like the AMAP driver-arriving screen: status headline with live
 * distance/ETA and fare, the ride code, the driver's photo/rating next to a big plate number,
 * a message + call row, and Cancel / Support / More underneath.
 */
export function RideDriverPanel({ ride, live, onCancel }: {
    ride: any;
    live: { km: number; min: number; arrived: boolean } | null;
    onCancel: () => void;
}) {
    const [chatOpen, setChatOpen] = useState(false);
    const [moreOpen, setMoreOpen] = useState(false);
    const inTrip = ride.status === "in_progress";
    const v = ride.vehicle;
    const carHex = COLOR_HEX[String(v?.color || "").toLowerCase()] || "#e5e7eb";
    const initials = String(ride.driver?.name || "D").split(" ").map((p: string) => p[0]).slice(0, 2).join("").toUpperCase();
    const classLabel = CLASS_LABEL[v?.vehicleClass] || "Ride";

    const headline = inTrip
        ? "Trip in progress"
        : live?.arrived
            ? "Your driver has arrived — please head to the pick-up point"
            : live
                ? <>The driver is on the way <span className="text-blue-600 text-2xl mx-1">{live.km}</span>km <span className="text-blue-600 text-2xl mx-1">{live.min}</span>min</>
                : "Your driver is on the way";

    const shareText = `🚗 My FairPrice ride details, for safety:\n\nDriver: ${ride.driver?.name}\nVehicle: ${v?.make || ""} ${v?.model || ""} (${v?.plateNumber || "plate n/a"})\nFrom: ${ride.pickup}\nTo: ${ride.dropoff}\nFare: ${formatPrice(ride.agreedFare)}`;

    return (
        <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <span className="inline-block text-[10px] font-black uppercase tracking-wide bg-blue-600 text-white rounded px-1.5 py-0.5 mb-1">{classLabel}</span>
                    <p className="text-base font-black text-gray-900 leading-snug">{headline}</p>
                    {!inTrip && <p className="text-xs text-gray-400 mt-1">Cancelling after the driver is close may incur a fee to compensate them.</p>}
                </div>
                <div className="text-right shrink-0">
                    <p className="text-[10px] text-gray-400 font-bold uppercase">Agreed fare</p>
                    <p className="text-lg font-black text-gray-900">{formatPrice(ride.agreedFare)}</p>
                </div>
            </div>

            {!inTrip && ride.pickupCode && (
                <div className="rounded-xl bg-blue-50 px-4 py-3 text-center">
                    <p className="text-sm text-gray-700"><span className="font-bold">Ride Code:</span> <span className="text-3xl font-black tracking-[0.15em] text-gray-900 align-middle ml-1">{ride.pickupCode}</span></p>
                    <p className="text-xs text-gray-500 mt-0.5">Please show this code to the driver</p>
                </div>
            )}

            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
                        <div className="h-14 w-14 rounded-full bg-gray-900 text-white flex items-center justify-center font-black text-lg">{initials}</div>
                        {ride.driver?.rating ? (
                            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-white border border-gray-200 rounded-full px-1.5 text-[10px] font-bold flex items-center gap-0.5 shadow-sm">
                                <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />{Number(ride.driver.rating).toFixed(1)}
                            </span>
                        ) : null}
                    </div>
                    <div className="min-w-0">
                        <p className="font-bold text-gray-900 truncate">{ride.driver?.name}</p>
                        <p className="text-xs text-gray-400">{classLabel} driver</p>
                    </div>
                </div>
                <div className="text-right min-w-0">
                    <p className="text-2xl font-black text-gray-900 tracking-wide leading-none">{v?.plateNumber?.toUpperCase() || "—"}</p>
                    <p className="text-xs text-gray-500 mt-1 flex items-center justify-end gap-1.5">
                        <Car className="h-3.5 w-3.5" style={{ color: carHex, stroke: "#374151" }} fill={carHex} />
                        {[v?.color, v?.make, v?.model].filter(Boolean).join(" · ")}
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-2">
                {ride.conversationId ? (
                    <button
                        onClick={() => setChatOpen(o => !o)}
                        className="flex-1 flex items-center justify-between rounded-full bg-blue-50 px-4 h-11 text-sm text-gray-500"
                    >
                        <span>Send a message, it helps to meet up</span>
                        <MessageCircle className="h-5 w-5 text-gray-900" />
                    </button>
                ) : <div className="flex-1" />}
                <MaskedCallButton kind="ride" tripId={ride.id} label="Call" />
            </div>
            {chatOpen && ride.conversationId && <RideChat conversationId={ride.conversationId} />}

            <div className="grid grid-cols-3 divide-x divide-gray-100 border-t border-gray-100 pt-2 text-sm text-gray-700">
                <button onClick={onCancel} className="flex items-center justify-center gap-1.5 py-2 font-medium"><X className="h-4 w-4" /> Cancel</button>
                <a href="https://wa.me/2348162816305" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 py-2 font-medium"><Headphones className="h-4 w-4" /> Support</a>
                <button onClick={() => setMoreOpen(o => !o)} className="flex items-center justify-center gap-1.5 py-2 font-medium"><MoreVertical className="h-4 w-4" /> More</button>
            </div>
            {moreOpen && (
                <a
                    href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl py-2.5"
                >
                    <ShieldCheck className="h-4 w-4" /> Share trip with a friend for safety
                </a>
            )}
            <p className="text-[11px] text-gray-400 text-center">The agreed fare covers the driver's travel only; any extra fees during the trip are paid separately.</p>
        </div>
    );
}
