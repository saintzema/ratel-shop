"use client";

import { useState } from "react";
import { Loader2, RefreshCw, Search } from "lucide-react";

type Job = "recompute" | "market" | null;

/**
 * Admin controls for the two price-integrity jobs.
 *
 * Both shipped as API routes with nothing pointing at them, which meant
 * running either required hand-crafting a curl with a bearer token — so in
 * practice neither had ever been run. The page already carries an admin
 * session, so the buttons just work.
 *
 * Market lookups cost money per item, so that one always reports what it
 * WOULD do first and only spends when asked, in small batches.
 */
export function PriceMaintenanceCard() {
    const [busy, setBusy] = useState<Job>(null);
    const [result, setResult] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const authHeaders = (): Record<string, string> => {
        const token = typeof window !== "undefined" ? localStorage.getItem("fp_token") : null;
        return token ? { Authorization: `Bearer ${token}` } : {};
    };

    const call = async (job: Exclude<Job, null>, url: string, init: RequestInit, describe: (d: any) => string) => {
        setBusy(job);
        setError(null);
        setResult(null);
        try {
            const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...authHeaders(), ...(init.headers || {}) } });
            const data = await res.json().catch(() => null);
            if (!res.ok) {
                setError(data?.error || (res.status === 401 ? "Your admin session expired — sign in again." : "That didn't run."));
                return;
            }
            setResult(describe(data));
        } catch {
            setError("Couldn't reach the server — check your connection.");
        } finally {
            setBusy(null);
        }
    };

    return (
        <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <RefreshCw className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-black text-gray-900">Price Integrity</h3>
            </div>
            <p className="text-xs text-gray-500 mb-6">
                Price badges are computed from comparable listings, never from what a seller claims. Re-run after a
                bulk import, or when a category has grown enough to be worth judging again.
            </p>

            <div className="space-y-3">
                <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => call("recompute", "/api/admin/recompute-price-flags", {
                        method: "POST", body: JSON.stringify({ dryRun: false }),
                    }, d => `Scanned ${d.scanned} listings · ${d.changed} badges changed${d.changed ? ` (${Object.entries(d.summary || {}).map(([k, v]) => `${v} ${k}`).join(", ")})` : ""}.`)}
                    className="w-full flex items-center justify-center gap-2 h-11 rounded-2xl bg-gray-900 text-white font-bold text-sm disabled:opacity-60"
                >
                    {busy === "recompute" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    Recompute price badges
                </button>

                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
                    <p className="text-[11px] text-amber-800 mb-2">
                        A market lookup is a paid AI call per listing. Check how many need one before spending.
                    </p>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            disabled={busy !== null}
                            onClick={() => call("market", "/api/admin/market-prices", { method: "GET" },
                                d => `${d.needingReference} of ${d.catalogueSize} listings have too few comparables to judge. Enriching them costs one lookup each.`)}
                            className="flex-1 flex items-center justify-center gap-1.5 h-10 rounded-xl bg-white border border-amber-300 text-amber-900 font-bold text-xs disabled:opacity-60"
                        >
                            {busy === "market" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                            Check how many
                        </button>
                        <button
                            type="button"
                            disabled={busy !== null}
                            onClick={() => call("market", "/api/admin/market-prices", {
                                method: "POST", body: JSON.stringify({ limit: 10 }),
                            }, d => `Looked up ${d.enriched} listings · ${d.remaining} still to go${d.skipped?.length ? ` · ${d.skipped.length} had no trustworthy price` : ""}.`)}
                            className="flex-1 h-10 rounded-xl bg-amber-500 text-white font-bold text-xs disabled:opacity-60"
                        >
                            Look up next 10
                        </button>
                    </div>
                </div>
            </div>

            {result && <p className="mt-4 text-xs font-bold text-emerald-700 bg-emerald-50 rounded-xl px-3 py-2">{result}</p>}
            {error && <p className="mt-4 text-xs font-bold text-rose-700 bg-rose-50 rounded-xl px-3 py-2">{error}</p>}
        </div>
    );
}
