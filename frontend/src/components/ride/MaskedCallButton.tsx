"use client";

import { useState } from "react";
import { Phone, Loader2 } from "lucide-react";

/**
 * Calls /api/calls/connect, which rings the CALLER's own phone first via
 * Twilio, then bridges to the other party's real number once answered —
 * neither side ever sees the other's actual digits. Renders as a plain
 * "Call" pill; if TWILIO_* env vars aren't set, the backend returns 503
 * with a clear message rather than silently doing nothing.
 */
export function MaskedCallButton({ kind, tripId, label }: { kind: "ride" | "delivery"; tripId: string; label: string }) {
    const [status, setStatus] = useState<"idle" | "calling" | "error">("idle");
    const [error, setError] = useState<string | null>(null);

    const authHeaders = (): Record<string, string> => {
        const tok = typeof window !== "undefined" ? localStorage.getItem("fp_token") : null;
        return tok ? { Authorization: `Bearer ${tok}` } : {};
    };

    const call = async () => {
        setStatus("calling");
        setError(null);
        try {
            const res = await fetch("/api/calls/connect", {
                method: "POST",
                headers: { "Content-Type": "application/json", ...authHeaders() },
                body: JSON.stringify({ kind, tripId }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error || "Couldn't place the call"); setStatus("error"); return; }
            setStatus("idle");
        } catch {
            setError("Couldn't place the call");
            setStatus("error");
        }
    };

    return (
        <div className="flex flex-col items-end gap-1">
            <button
                onClick={call}
                disabled={status === "calling"}
                className="text-[11px] font-bold text-brand-green-700 bg-brand-green-50 hover:bg-brand-green-100 px-3 py-1.5 rounded-full flex items-center gap-1.5 shrink-0 disabled:opacity-60"
            >
                {status === "calling" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Phone className="h-3.5 w-3.5" />}
                {status === "calling" ? "Calling — answer your phone…" : label}
            </button>
            {error && <p className="text-[10px] text-rose-600 font-semibold max-w-[220px] text-right">{error}</p>}
        </div>
    );
}
