"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
    Activity,
    Search,
    BarChart3,
    Package,
    DollarSign,
    MessageSquare,
    Shield,
    Zap,
    ArrowLeft,
    Clock,
    CheckCircle,
    Cpu,
    Globe,
    TrendingUp,
    Loader2,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface ZemaEvent {
    id: string;
    type: "gemini_query" | "price_verified" | "order_created" | "escrow_released" | "negotiation" | "agent_decision" | "whatsapp_sent";
    description: string;
    product?: string;
    mode?: string;
    model?: string;
    count?: number;
    value?: number;
    ts: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function timeAgo(ts: number): string {
    const diff = Date.now() - ts;
    if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
    return `${Math.floor(diff / 86_400_000)}d ago`;
}

const EVENT_META: Record<ZemaEvent["type"], { label: string; icon: React.ElementType; color: string; bg: string }> = {
    gemini_query:   { label: "Gemini Search",    icon: Search,       color: "text-blue-400",    bg: "bg-blue-500/10 border-blue-500/20" },
    price_verified: { label: "Price Verified",   icon: BarChart3,    color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
    order_created:  { label: "New Order",        icon: Package,      color: "text-violet-400",  bg: "bg-violet-500/10 border-violet-500/20" },
    escrow_released:{ label: "Escrow Released",  icon: DollarSign,   color: "text-yellow-400",  bg: "bg-yellow-500/10 border-yellow-500/20" },
    negotiation:    { label: "Negotiation",      icon: MessageSquare,color: "text-orange-400",  bg: "bg-orange-500/10 border-orange-500/20" },
    agent_decision: { label: "Agent Decision",   icon: Cpu,          color: "text-pink-400",    bg: "bg-pink-500/10 border-pink-500/20" },
    whatsapp_sent:  { label: "WhatsApp HITL",    icon: Shield,       color: "text-teal-400",    bg: "bg-teal-500/10 border-teal-500/20" },
};

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon: Icon, color }: {
    label: string; value: string | number; sub?: string;
    icon: React.ElementType; color: string;
}) {
    return (
        <div className="rounded-2xl border border-white/8 bg-white/[0.03] backdrop-blur-sm p-5">
            <div className={`inline-flex items-center justify-center w-9 h-9 rounded-xl ${color} mb-3`}>
                <Icon className="w-4 h-4 text-white" />
            </div>
            <div className="text-2xl font-black text-white mb-0.5">{value}</div>
            <div className="text-xs font-bold text-white/40 uppercase tracking-wider">{label}</div>
            {sub && <div className="text-[10px] text-white/25 mt-1">{sub}</div>}
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Zema360LivePage() {
    const [events, setEvents] = useState<ZemaEvent[]>([]);
    const [configured, setConfigured] = useState<boolean | null>(null); // null = loading
    const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
    const [triggering, setTriggering] = useState(false);
    const [, forceRender] = useState(0);
    const seenIds = useRef(new Set<string>());

    // Previously the API only ever returned the latest 30 events with no way to
    // page further back — older operations were effectively unreachable. Page 1
    // stays "live" (auto-refreshes); paging back pauses auto-refresh so browsing
    // history doesn't get yanked out from under you.
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalEvents, setTotalEvents] = useState(0);
    const PAGE_SIZE = 30;

    const fetchEvents = async (targetPage = page) => {
        try {
            const res = await fetch(`/api/zema360/events?page=${targetPage}&pageSize=${PAGE_SIZE}`, { cache: "no-store" });
            if (!res.ok) {
                setConfigured(false);
                return;
            }
            const data = await res.json();
            setConfigured(data.configured !== false);
            if (Array.isArray(data.events)) {
                setEvents(data.events);
                data.events.forEach((e: ZemaEvent) => seenIds.current.add(e.id));
            }
            if (typeof data.totalPages === "number") setTotalPages(data.totalPages);
            if (typeof data.total === "number") setTotalEvents(data.total);
            setLastRefresh(new Date());
        } catch {
            setConfigured(false);
        }
    };

    const goToPage = (p: number) => {
        const clamped = Math.max(1, Math.min(totalPages, p));
        setPage(clamped);
        fetchEvents(clamped);
    };

    // Trigger a live Gemini query so judges can see an event appear in real time
    const triggerTestEvent = async () => {
        setTriggering(true);
        try {
            await fetch("/api/gemini-price", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ productName: "iPhone 15 Pro Max", mode: "search", region: "Nigeria" }),
            });
            // Give Firebase a moment to receive the log, then refresh
            setTimeout(fetchEvents, 1500);
        } catch { /* silent */ } finally {
            setTriggering(false);
        }
    };

    useEffect(() => {
        fetchEvents(1);
        // Tick relative timestamps every 15s
        const tick = setInterval(() => forceRender(n => n + 1), 15_000);
        return () => clearInterval(tick);
    }, []);

    // Only auto-refresh while viewing page 1 — refreshing while browsing older
    // pages would silently shift/replace the history the user is looking at.
    useEffect(() => {
        if (page !== 1) return;
        const interval = setInterval(() => fetchEvents(1), 5000);
        return () => clearInterval(interval);
    }, [page]);

    // Computed stats
    const now = Date.now();
    const lastHour = events.filter(e => now - e.ts < 3_600_000).length;
    const geminiCalls = events.filter(e => e.type === "gemini_query" || e.type === "price_verified").length;
    const lastEvent = events[0];

    return (
        <div className="min-h-screen bg-[#080c10] text-white font-sans">
            {/* ── Nav ── */}
            <nav className="border-b border-white/5 backdrop-blur-xl sticky top-0 z-50 bg-black/40">
                <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/zema360" className="flex items-center gap-1.5 text-white/40 hover:text-white/70 text-sm transition-colors">
                            <ArrowLeft className="w-4 h-4" /> ZEMA 360
                        </Link>
                        <span className="text-white/15">/</span>
                        <span className="text-sm font-bold text-white/70">Live Operations</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                        </span>
                        <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Live</span>
                        {lastRefresh && (
                            <span className="text-xs text-white/20 ml-2">
                                · updated {timeAgo(lastRefresh.getTime())}
                            </span>
                        )}
                    </div>
                </div>
            </nav>

            <div className="max-w-7xl mx-auto px-6 py-10">
                {/* ── Header ── */}
                <div className="mb-10">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                            <Activity className="w-4 h-4 text-white" />
                        </div>
                        <h1 className="text-2xl md:text-3xl font-black tracking-tight">ZEMA 360 Live Operations</h1>
                    </div>
                    <p className="text-white/40 text-sm max-w-xl">
                        Real-time view of AI decisions powering FairPrice.ng — every Gemini query, price verification, and agent action, as it happens.
                    </p>
                </div>

                {/* ── Stats ── */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                    <StatCard
                        label="AI Events Total"
                        value={events.length}
                        sub="since tracking began"
                        icon={Activity}
                        color="bg-emerald-500/20"
                    />
                    <StatCard
                        label="Last Hour"
                        value={lastHour}
                        sub="AI operations"
                        icon={Clock}
                        color="bg-blue-500/20"
                    />
                    <StatCard
                        label="Gemini API Calls"
                        value={geminiCalls}
                        sub="gemini-2.5-flash · grounded"
                        icon={Cpu}
                        color="bg-violet-500/20"
                    />
                    <StatCard
                        label="Last Activity"
                        value={lastEvent ? timeAgo(lastEvent.ts) : "—"}
                        sub={lastEvent?.description?.slice(0, 28) || "Waiting for events"}
                        icon={TrendingUp}
                        color="bg-teal-500/20"
                    />
                </div>

                <div className="grid lg:grid-cols-3 gap-6">
                    {/* ── Live Event Feed ── */}
                    <div className="lg:col-span-2">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-sm font-black uppercase tracking-wider text-white/60">Live Event Feed</h2>
                            <span className="text-xs text-white/30">Auto-refreshes every 5s</span>
                        </div>

                        {configured === null && (
                            <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-10 text-center">
                                <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mx-auto mb-3" />
                                <p className="text-white/60 text-sm font-bold">Connecting to live ops…</p>
                            </div>
                        )}

                        {configured === false && (
                            <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-7 text-center">
                                <Zap className="w-10 h-10 text-yellow-400 mx-auto mb-3" />
                                <p className="text-base font-black text-yellow-300 mb-2">Firebase not yet configured</p>
                                <p className="text-sm text-white/50 mb-1">
                                    Add these to <strong className="text-white/70">Vercel → Settings → Environment Variables</strong>:
                                </p>
                                <div className="text-left inline-block mt-3 space-y-2">
                                    <code className="block text-xs bg-black/40 border border-white/10 px-3 py-2 rounded-lg text-emerald-300">
                                        FIREBASE_DATABASE_URL = https://your-project.firebaseio.com
                                    </code>
                                    <code className="block text-xs bg-black/40 border border-white/10 px-3 py-2 rounded-lg text-emerald-300">
                                        FIREBASE_DATABASE_SECRET = your_database_secret
                                    </code>
                                </div>
                                <p className="text-xs text-white/30 mt-4">Then redeploy for the changes to take effect.</p>
                            </div>
                        )}

                        {configured === true && events.length === 0 && (
                            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-10 text-center">
                                <div className="flex justify-center mb-5">
                                    <div className="relative">
                                        <span className="animate-ping absolute inline-flex h-10 w-10 rounded-full bg-emerald-400/20" />
                                        <span className="relative flex h-10 w-10 rounded-full bg-emerald-500/20 border border-emerald-500/40 items-center justify-center">
                                            <Activity className="w-5 h-5 text-emerald-400" />
                                        </span>
                                    </div>
                                </div>
                                <p className="text-white text-base font-black mb-1">Connected — waiting for events</p>
                                <p className="text-white/50 text-sm mb-6">
                                    Events appear when shoppers search or verify prices on FairPrice.ng.
                                    <br />Trigger one now to test the live connection:
                                </p>
                                <button
                                    onClick={triggerTestEvent}
                                    disabled={triggering}
                                    className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black text-sm uppercase tracking-wider hover:opacity-90 transition-all disabled:opacity-50"
                                >
                                    {triggering ? (
                                        <><Loader2 className="w-4 h-4 animate-spin" /> Querying Gemini…</>
                                    ) : (
                                        <><Zap className="w-4 h-4" /> Trigger Test Event</>
                                    )}
                                </button>
                                <p className="text-white/25 text-xs mt-4">Fires a live Gemini 2.5 Flash query → logs to Firebase → appears above</p>
                            </div>
                        )}

                        <div className="space-y-2">
                            <AnimatePresence initial={false}>
                                {events.map((event) => {
                                    const meta = EVENT_META[event.type] || EVENT_META.agent_decision;
                                    const Icon = meta.icon;
                                    return (
                                        <motion.div
                                            key={event.id}
                                            initial={{ opacity: 0, x: -12 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, height: 0 }}
                                            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                                            className={`flex items-start gap-3 rounded-xl border p-4 ${meta.bg}`}
                                        >
                                            <div className={`flex-shrink-0 w-8 h-8 rounded-lg bg-black/20 flex items-center justify-center ${meta.color}`}>
                                                <Icon className="w-4 h-4" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <span className={`text-[10px] font-black uppercase tracking-wider ${meta.color}`}>
                                                        {meta.label}
                                                    </span>
                                                    {event.model && (
                                                        <span className="text-[9px] text-white/30 font-mono bg-white/5 px-1.5 py-0.5 rounded-md">
                                                            {event.model}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-white/70 truncate">{event.description}</p>
                                                {event.count !== undefined && event.count > 0 && (
                                                    <p className="text-[10px] text-white/30 mt-0.5">
                                                        {event.count} result{event.count !== 1 ? "s" : ""}
                                                    </p>
                                                )}
                                            </div>
                                            <span className="flex-shrink-0 text-[10px] text-white/25 mt-0.5">
                                                {timeAgo(event.ts)}
                                            </span>
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>
                        </div>

                        {/* Pagination — without this, anything past the newest 30 events was
                            permanently unreachable. */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/8">
                                <span className="text-[11px] text-white/30">
                                    Page {page} of {totalPages} · {totalEvents} total operations
                                </span>
                                <div className="flex items-center gap-1.5">
                                    <button
                                        onClick={() => goToPage(page - 1)}
                                        disabled={page <= 1}
                                        className="px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider bg-white/5 text-white/60 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    >
                                        ← Newer
                                    </button>
                                    <button
                                        onClick={() => goToPage(page + 1)}
                                        disabled={page >= totalPages}
                                        className="px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider bg-white/5 text-white/60 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    >
                                        Older →
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ── Right Sidebar: System Status ── */}
                    <div className="space-y-4">
                        {/* AI Stack */}
                        <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
                            <h3 className="text-xs font-black uppercase tracking-wider text-white/40 mb-4">AI Stack</h3>
                            <div className="space-y-3">
                                {[
                                    {
                                        label: "Gemini 2.5 Flash",
                                        sub: "Price search + analysis",
                                        status: "live",
                                        color: "bg-blue-500",
                                        textColor: "text-blue-400",
                                    },
                                    {
                                        label: "Google Search Grounding",
                                        sub: "Real-time web data",
                                        status: "live",
                                        color: "bg-emerald-500",
                                        textColor: "text-emerald-400",
                                    },
                                    {
                                        label: "AWS DynamoDB",
                                        sub: "us-east-1 · agent log store",
                                        status: configured ? "live" : "pending",
                                        color: configured ? "bg-emerald-500" : "bg-yellow-500",
                                        textColor: configured ? "text-emerald-400" : "text-yellow-400",
                                    },
                                    {
                                        label: "Qwen qwen3-max",
                                        sub: "ZEMA 360 agent orchestration",
                                        status: "live",
                                        color: "bg-violet-500",
                                        textColor: "text-violet-400",
                                    },
                                ].map((item) => (
                                    <div key={item.label} className="flex items-start gap-3">
                                        <span className={`mt-1.5 flex-shrink-0 w-1.5 h-1.5 rounded-full ${item.color} ${item.status === "live" ? "animate-pulse" : ""}`} />
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-xs font-bold ${item.textColor}`}>{item.label}</p>
                                            <p className="text-[10px] text-white/30">{item.sub}</p>
                                        </div>
                                        <span className={`text-[9px] font-bold uppercase ${item.textColor} opacity-70`}>
                                            {item.status}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Cloud infrastructure badge */}
                        <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
                            <div className="flex items-center gap-2 mb-3">
                                <Globe className="w-4 h-4 text-white/50" />
                                <span className="text-xs font-black text-white/50 uppercase tracking-wider">Cloud Infrastructure</span>
                            </div>
                            <div className="space-y-2 text-[11px]">
                                <div className="flex items-center gap-2 text-blue-300">
                                    <CheckCircle className="w-3 h-3 text-blue-400 flex-shrink-0" />
                                    Vercel — serverless compute
                                </div>
                                <div className="flex items-center gap-2 text-orange-300">
                                    <CheckCircle className="w-3 h-3 text-orange-400 flex-shrink-0" />
                                    AWS DynamoDB — agent log store
                                </div>
                                <div className="flex items-center gap-2 text-blue-300">
                                    <CheckCircle className="w-3 h-3 text-blue-400 flex-shrink-0" />
                                    Gemini 2.5 Flash — AI search
                                </div>
                                <div className="flex items-center gap-2 text-violet-300">
                                    <CheckCircle className="w-3 h-3 text-violet-400 flex-shrink-0" />
                                    Qwen — agent orchestration
                                </div>
                            </div>
                        </div>

                        {/* Event type breakdown */}
                        {events.length > 0 && (
                            <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
                                <h3 className="text-xs font-black uppercase tracking-wider text-white/40 mb-4">Event Breakdown</h3>
                                {(["gemini_query", "price_verified", "order_created", "negotiation"] as const).map((type) => {
                                    const count = events.filter(e => e.type === type).length;
                                    if (!count) return null;
                                    const meta = EVENT_META[type];
                                    const pct = Math.round((count / events.length) * 100);
                                    const Icon = meta.icon;
                                    return (
                                        <div key={type} className="flex items-center gap-3 mb-3 last:mb-0">
                                            <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${meta.color}`} />
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between text-[10px] mb-1">
                                                    <span className="text-white/50">{meta.label}</span>
                                                    <span className="text-white/30">{count}</span>
                                                </div>
                                                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full transition-all duration-700 bg-emerald-500"
                                                        style={{ width: `${pct}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Back link */}
                        <Link
                            href="/zema360"
                            className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-white/5 border border-white/8 text-white/50 text-xs font-bold hover:bg-white/10 transition-all"
                        >
                            <ArrowLeft className="w-3.5 h-3.5" /> Back to ZEMA 360
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
