"use client";

import { useEffect, useState, useCallback } from "react";
import { BarChart3, Loader2, RefreshCw, MessageCircle, Eye, MousePointerClick, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Seller-facing performance for paid boosts.
 *
 * Leads with CONTACTS, not impressions. Meta reports reach and clicks, but the
 * only question a Nigerian trader is actually asking is "did anyone message me,
 * and what did each one cost?" — so cost-per-contact is the headline and the
 * reach numbers are supporting detail.
 *
 * Also the screencast surface for the Phase 2 `ads_read` submission: every load
 * issues real /insights reads against our ad account.
 */

interface Insights {
    impressions: number;
    reach: number;
    clicks: number;
    linkClicks: number;
    spend: number;
    cpm: number;
    cpc: number;
    ctr: number;
    error?: string;
}

interface OnPlatform {
    productViews: number;
    phoneReveals: number;
    chatsStarted: number;
    contacts: number;
    contactRatePct: number | null;
    costPerContactNaira: number | null;
}

interface Row {
    id: string;
    productName: string | null;
    platform: string;
    status: string;
    days: number;
    createdAt: string;
    chargedNaira: number;
    adSpendNaira: number;
    insights: Insights | null;
    onPlatform: OnPlatform | null;
}

const naira = (n: number) => `₦${Math.round(n).toLocaleString()}`;
const compact = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

export function AdsPerformancePanel() {
    const [rows, setRows] = useState<Row[]>([]);
    const [totals, setTotals] = useState<any>(null);
    const [configured, setConfigured] = useState(true);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem("fp_token");
            if (!token) { setLoading(false); return; }
            const res = await fetch("/api/seller/ads/insights", {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) {
                // 404 just means this account has no seller record yet — not an error
                // worth shouting about on a dashboard.
                if (res.status !== 404) setError("Couldn't load campaign performance.");
                setLoading(false);
                return;
            }
            const data = await res.json();
            setRows(data.campaigns || []);
            setTotals(data.totals || null);
            setConfigured(data.configured !== false);
        } catch {
            setError("Couldn't reach the server. Check your connection.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    // Nothing paid for yet — say nothing rather than showing an empty chart.
    if (!loading && rows.length === 0 && !error) return null;

    return (
        <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <h3 className="font-bold text-sm flex items-center gap-2 text-gray-900">
                    <BarChart3 className="h-4 w-4 text-indigo-500" />
                    Promotion Performance
                </h3>
                <button
                    onClick={load}
                    disabled={loading}
                    className="text-gray-400 hover:text-gray-700 transition-colors disabled:opacity-50"
                    title="Refresh from Meta"
                >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                </button>
            </div>

            {error && (
                <div className="px-6 py-4 text-xs font-semibold text-rose-700 bg-rose-50 border-b border-rose-100">
                    {error}
                </div>
            )}

            {!configured && (
                <div className="px-6 py-4 text-xs font-medium text-amber-800 bg-amber-50 border-b border-amber-100">
                    Paid promotion isn't switched on for the platform yet, so live numbers
                    aren't available. Your purchases are listed below.
                </div>
            )}

            {/* Headline: what the money actually produced. */}
            {totals && (
                <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-gray-100 border-b border-gray-100">
                    <Stat
                        icon={<MessageCircle className="h-3.5 w-3.5 text-emerald-600" />}
                        label="People who contacted you"
                        value={String(totals.contacts)}
                        emphasis
                    />
                    <Stat
                        icon={<TrendingUp className="h-3.5 w-3.5 text-indigo-500" />}
                        label="Cost per contact"
                        value={totals.contacts > 0 ? naira(totals.chargedNaira / totals.contacts) : "—"}
                        emphasis
                    />
                    <Stat
                        icon={<MousePointerClick className="h-3.5 w-3.5 text-blue-500" />}
                        label="Clicks to your product"
                        value={compact(totals.linkClicks)}
                    />
                    <Stat
                        icon={<Eye className="h-3.5 w-3.5 text-gray-400" />}
                        label="People reached"
                        value={compact(totals.reach)}
                    />
                </div>
            )}

            <div className="divide-y divide-gray-100">
                {rows.map(r => (
                    <div key={r.id} className="px-6 py-4">
                        <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="min-w-0">
                                <p className="font-bold text-sm text-gray-900 truncate">
                                    {r.productName || "Product"}
                                </p>
                                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mt-0.5">
                                    {r.platform} · {r.days} days · {naira(r.chargedNaira)} paid
                                </p>
                            </div>
                            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg shrink-0 ${
                                r.status === "active" ? "bg-emerald-50 text-emerald-700"
                                : r.status === "failed" ? "bg-rose-50 text-rose-700"
                                : "bg-gray-100 text-gray-500"
                            }`}>
                                {r.status}
                            </span>
                        </div>

                        {r.insights?.error ? (
                            <p className="text-[11px] text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                                Meta couldn&apos;t return numbers for this campaign: {r.insights.error}
                            </p>
                        ) : r.insights && r.insights.impressions === 0 ? (
                            <p className="text-[11px] text-gray-500">
                                Not delivering yet — Meta usually takes a few hours to start showing a new boost.
                            </p>
                        ) : r.insights ? (
                            <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-[11px]">
                                <Metric label="Reached" value={compact(r.insights.reach)} />
                                <Metric label="Clicks" value={compact(r.insights.linkClicks)} />
                                <Metric label="CTR" value={`${r.insights.ctr.toFixed(2)}%`} />
                                {r.onPlatform && (
                                    <>
                                        <Metric label="Contacted you" value={String(r.onPlatform.contacts)} strong />
                                        {r.onPlatform.costPerContactNaira !== null && (
                                            <Metric label="Per contact" value={naira(r.onPlatform.costPerContactNaira)} strong />
                                        )}
                                    </>
                                )}
                            </div>
                        ) : null}
                    </div>
                ))}
            </div>

            <p className="px-6 py-3 text-[10px] text-gray-400 bg-gray-50/50 border-t border-gray-100 leading-relaxed">
                Reach and clicks come from Meta. &ldquo;Contacted you&rdquo; counts buyers who
                revealed your number or opened WhatsApp from the product page — the numbers
                Meta can&apos;t see.
            </p>
        </div>
    );
}

function Stat({ icon, label, value, emphasis }: { icon: React.ReactNode; label: string; value: string; emphasis?: boolean }) {
    return (
        <div className="px-4 py-4">
            <div className="flex items-center gap-1.5 mb-1">
                {icon}
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider leading-tight">{label}</p>
            </div>
            <p className={`font-black ${emphasis ? "text-xl text-gray-900" : "text-lg text-gray-600"}`}>{value}</p>
        </div>
    );
}

function Metric({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
    return (
        <span className="flex items-center gap-1">
            <span className="text-gray-400 font-semibold">{label}</span>
            <span className={strong ? "font-black text-emerald-700" : "font-bold text-gray-700"}>{value}</span>
        </span>
    );
}
