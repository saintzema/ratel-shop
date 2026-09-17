"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Briefcase, MapPin, Clock, ChevronDown, Plus, Users } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { useLocation } from "@/context/LocationContext";
import { NIGERIAN_STATES } from "@/lib/nigerian-states";
import { formatPrice } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useHeaderOffset } from "@/lib/use-header-offset";

const CATEGORIES = ["All", "Home Services", "Repair & Maintenance", "Building & Construction", "Automotive", "Beauty & Wellness", "Events & Catering", "Cleaning", "Logistics & Moving", "Professional / Consulting", "Tech & Digital", "Tutoring", "Other"];

interface Gig {
    id: string;
    title: string;
    description: string;
    category: string;
    budgetMin: number | null;
    budgetMax: number | null;
    budgetType: string;
    locationState: string | null;
    locationCity: string | null;
    isSponsored: boolean;
    proposalCount: number;
    createdAt: string;
}

function budgetLabel(g: Gig): string {
    if (!g.budgetMin && !g.budgetMax) return "Budget: Negotiable";
    const suffix = g.budgetType === "hourly" ? "/hr" : "";
    if (g.budgetMin && g.budgetMax && g.budgetMin !== g.budgetMax) return `${formatPrice(g.budgetMin)} - ${formatPrice(g.budgetMax)}${suffix}`;
    return `${formatPrice(g.budgetMax || g.budgetMin || 0)}${suffix}`;
}

/**
 * The "find work" side of the expert marketplace — Upwork's job board, not a
 * storefront. A seller browses open GigRequests (buyers who posted what they
 * need + a budget) and submits a proposal; accepting one turns straight into
 * a real Quote (see /api/gigs/[id]/proposals/[proposalId]/route.ts) so the
 * existing payment/escrow/review pipeline handles everything after that.
 */
export default function HireBoardPage() {
    const headerOffset = useHeaderOffset();
    const { location } = useLocation();
    const [gigs, setGigs] = useState<Gig[]>([]);
    const [loading, setLoading] = useState(true);
    const [category, setCategory] = useState("All");
    const [stateFilter, setStateFilter] = useState("");

    useEffect(() => {
        setLoading(true);
        const qs = new URLSearchParams();
        if (category !== "All") qs.set("category", category);
        if (stateFilter) qs.set("state", stateFilter);
        fetch(`/api/gigs?${qs.toString()}`)
            .then(r => r.ok ? r.json() : null)
            .then(d => setGigs(d?.gigs || []))
            .catch(() => setGigs([]))
            .finally(() => setLoading(false));
    }, [category, stateFilter]);

    return (
        <div className="min-h-screen bg-white font-sans">
            <Navbar />

            <div className="bg-gradient-to-br from-indigo-700 via-indigo-600 to-indigo-800 text-white">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-8" style={{ paddingTop: headerOffset + 24 }}>
                    <div className="flex items-center gap-2 text-white/80 text-xs font-black uppercase tracking-widest mb-2">
                        <Briefcase className="h-4 w-4" /> Find Work
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Jobs people need done, right now</h1>
                            <p className="text-white/80 text-sm mt-1 max-w-xl">
                                Real buyers posting real budgets. Send a proposal — accepted ones become a paid, escrow-protected quote instantly.
                            </p>
                        </div>
                        <Link href="/hire/post" className="shrink-0 bg-white text-indigo-700 font-black text-sm px-5 py-3 rounded-2xl flex items-center gap-2 hover:bg-white/90">
                            <Plus className="h-4 w-4" /> Post a Gig
                        </Link>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-4">
                    {CATEGORIES.map(c => (
                        <button
                            key={c}
                            onClick={() => setCategory(c)}
                            className={cn(
                                "shrink-0 px-4 py-2 rounded-full text-xs font-bold border transition-colors",
                                category === c ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                            )}
                        >
                            {c}
                        </button>
                    ))}
                </div>

                <div className="relative inline-block mb-4">
                    <select
                        value={stateFilter}
                        onChange={(e) => setStateFilter(e.target.value)}
                        className="appearance-none bg-gray-50 border border-gray-200 rounded-full pl-4 pr-9 py-2 text-sm font-bold text-gray-700 outline-none"
                    >
                        <option value="">All Nigeria</option>
                        {NIGERIAN_STATES.map(s => <option key={s.state} value={s.state}>{s.state}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>

                {loading ? (
                    <div className="space-y-3">
                        {[1, 2, 3, 4].map(i => <div key={i} className="h-32 rounded-2xl bg-gray-100 animate-pulse" />)}
                    </div>
                ) : gigs.length === 0 ? (
                    <div className="text-center py-24 bg-gray-50 rounded-3xl border border-gray-100">
                        <Briefcase className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                        <h3 className="text-lg font-bold text-gray-900">No open gigs here yet</h3>
                        <p className="text-sm text-gray-500 mt-1">Check another category or state, or check back soon.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {gigs.map(g => (
                            <Link key={g.id} href={`/hire/${g.id}`} className="block bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:border-indigo-200 transition-colors">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            {g.isSponsored && <span className="bg-brand-orange text-white text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">Featured</span>}
                                            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{g.category}</span>
                                        </div>
                                        <h3 className="font-black text-gray-900 mt-1.5 truncate">{g.title}</h3>
                                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{g.description}</p>
                                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                                            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {g.locationCity ? `${g.locationCity}, ` : ""}{g.locationState}</span>
                                            <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {g.proposalCount} proposal{g.proposalCount === 1 ? "" : "s"}</span>
                                        </div>
                                    </div>
                                    <div className="shrink-0 text-right">
                                        <p className="font-black text-gray-900 text-sm">{budgetLabel(g)}</p>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            <Footer />
        </div>
    );
}
