"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, ChevronDown, Receipt } from "lucide-react";
import { formatPrice, cn } from "@/lib/utils";

interface Charge {
    id: string;
    jobType: string;
    fare: number;
    ratePct: number;
    amount: number;
    status: string;
    note: string | null;
    createdAt: string;
}

interface CommissionStatement {
    outstanding: number;
    limit: number;
    blocked: boolean;
    lifetimeSettled: number;
    rates: { ride: number; delivery: number };
    charges: Charge[];
}

/**
 * The driver's service-fee statement, on their own dashboard.
 *
 * A driver can be stopped from receiving new requests once their unpaid cash
 * commission passes the limit, so they need to be able to see that number
 * before it happens — being cut off with no explanation is how a driver
 * decides the platform is cheating them and leaves. It states the rate
 * plainly too, because the low rate is the reason to drive here rather than
 * for Bolt, and that only works if drivers know it.
 */
export function DriverCommissionCard() {
    const [data, setData] = useState<CommissionStatement | null>(null);
    const [expanded, setExpanded] = useState(false);

    const load = useCallback(() => {
        const token = typeof window !== "undefined" ? localStorage.getItem("fp_token") : null;
        if (!token) return;
        fetch("/api/drive/commission", { headers: { Authorization: `Bearer ${token}` } })
            .then(r => (r.ok ? r.json() : null))
            .then(d => { if (d && !d.error) setData(d); })
            .catch(() => { /* the board still works without the statement */ });
    }, []);

    useEffect(() => { load(); }, [load]);

    if (!data) return null;

    const owed = data.outstanding;
    const pctOfLimit = Math.min(100, Math.round((owed / data.limit) * 100));
    // Quiet until it matters: a driver with nothing outstanding gets one line
    // stating the rate, not a warning panel about a debt they don't have.
    const nearLimit = owed > data.limit * 0.6;

    return (
        <div
            className={cn(
                "rounded-2xl border p-4 mb-5",
                data.blocked ? "border-red-300 bg-red-50"
                    : nearLimit ? "border-amber-300 bg-amber-50"
                        : "border-gray-200 bg-gray-50",
            )}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Service fee</p>
                    {owed > 0 ? (
                        <>
                            <p className={cn("text-xl font-black", data.blocked ? "text-red-700" : "text-gray-900")}>
                                {formatPrice(owed)} <span className="text-xs font-bold text-gray-500">outstanding</span>
                            </p>
                            <p className="text-[11px] text-gray-500 mt-0.5">
                                From trips paid to you in cash. Cleared automatically from your next in-app payout.
                            </p>
                        </>
                    ) : (
                        <p className="text-sm font-bold text-gray-700">
                            Nothing outstanding — you keep {100 - data.rates.ride}% of every fare.
                        </p>
                    )}
                </div>
                <Receipt className="h-5 w-5 text-gray-400 shrink-0" />
            </div>

            {owed > 0 && (
                <div className="mt-3">
                    <div className="h-1.5 rounded-full bg-black/10 overflow-hidden">
                        <div
                            className={cn("h-full rounded-full transition-all", data.blocked ? "bg-red-500" : nearLimit ? "bg-amber-500" : "bg-brand-green-500")}
                            style={{ width: `${pctOfLimit}%` }}
                        />
                    </div>
                    <p className="text-[10px] text-gray-500 mt-1">
                        {formatPrice(owed)} of {formatPrice(data.limit)} limit
                    </p>
                </div>
            )}

            {data.blocked && (
                <div className="mt-3 flex items-start gap-2 rounded-xl bg-white/70 px-3 py-2">
                    <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-[11px] font-bold text-red-700">
                        New requests are paused until this is settled. Take your next trips with in-app payment and the
                        fee clears itself from the payout.
                    </p>
                </div>
            )}

            {data.charges.length > 0 && (
                <>
                    <button
                        type="button"
                        onClick={() => setExpanded(v => !v)}
                        className="mt-3 flex items-center gap-1 text-[11px] font-bold text-gray-500 hover:text-gray-700"
                    >
                        {expanded ? "Hide" : "Show"} recent fees
                        <ChevronDown className={cn("h-3 w-3 transition-transform", expanded && "rotate-180")} />
                    </button>
                    {expanded && (
                        <div className="mt-2 space-y-1.5 max-h-56 overflow-y-auto">
                            {data.charges.map(c => (
                                <div key={c.id} className="flex items-center justify-between gap-2 text-[11px]">
                                    <span className="text-gray-500 truncate">
                                        {new Date(c.createdAt).toLocaleDateString()} · {formatPrice(c.fare)} {c.jobType}
                                        {c.status === "owed" ? " · cash" : ""}
                                    </span>
                                    <span className={cn("font-bold shrink-0", c.status === "owed" ? "text-amber-700" : "text-gray-400")}>
                                        {formatPrice(c.amount)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
