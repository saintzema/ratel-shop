"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MapPin, Star, Wrench, ChevronDown, Clock, X, CheckCircle2, Loader2 } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { useAuth } from "@/context/AuthContext";
import { useLocation } from "@/context/LocationContext";
import { NIGERIAN_STATES } from "@/lib/nigerian-states";
import { getProductUrl, formatPrice } from "@/lib/utils";
import { cn } from "@/lib/utils";

/**
 * The fallback for FairPrice's early days, when a given state/category
 * simply doesn't have a registered expert yet: a brief request goes straight
 * to the FairPrice team (see /api/expert-requests) so a human can manually
 * source and fulfill it instead of the visitor hitting a dead end.
 */
function RequestExpertModal({ defaultState, onClose }: { defaultState: string; onClose: () => void }) {
    const { user } = useAuth();
    const [category, setCategory] = useState("");
    const [description, setDescription] = useState("");
    const [state, setState] = useState(defaultState);
    const [city, setCity] = useState("");
    const [contactPhone, setContactPhone] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const submit = async () => {
        setError(null);
        if (!description.trim()) { setError("Tell us briefly what you need."); return; }
        setSubmitting(true);
        try {
            const tok = typeof window !== "undefined" ? localStorage.getItem("fp_token") : null;
            const res = await fetch("/api/expert-requests", {
                method: "POST",
                headers: { "Content-Type": "application/json", ...(tok ? { Authorization: `Bearer ${tok}` } : {}) },
                body: JSON.stringify({ category, description, state, city, contactPhone }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || "Could not submit request");
            setDone(true);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
            <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                {done ? (
                    <div className="text-center py-6">
                        <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
                        <h3 className="font-black text-gray-900 text-lg">Request sent</h3>
                        <p className="text-sm text-gray-500 mt-1">Our team will personally help match you with the right expert.</p>
                        <button onClick={onClose} className="mt-5 text-sm font-bold text-indigo-600 underline">Close</button>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-black text-gray-900 text-lg">Request an Expert</h3>
                            <button onClick={onClose}><X className="h-5 w-5 text-gray-400" /></button>
                        </div>
                        <p className="text-xs text-gray-500 mb-4">Not enough experts listed yet in your area? Tell us what you need and our team will help find and connect you with someone.</p>
                        <div className="space-y-3">
                            <input
                                value={category}
                                onChange={e => setCategory(e.target.value)}
                                placeholder="What kind of expert? (e.g. Web Designer, Plumber)"
                                className="w-full h-11 px-3 rounded-xl border border-gray-200 text-sm"
                            />
                            <textarea
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                placeholder="Briefly describe what you need done"
                                rows={3}
                                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm resize-none"
                            />
                            <div className="grid grid-cols-2 gap-2">
                                <div className="relative">
                                    <select value={state} onChange={e => setState(e.target.value)} className="w-full h-11 px-3 rounded-xl border border-gray-200 text-sm appearance-none bg-white">
                                        {NIGERIAN_STATES.map(s => <option key={s.state} value={s.state}>{s.state}</option>)}
                                    </select>
                                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                                </div>
                                <input value={city} onChange={e => setCity(e.target.value)} placeholder="City/area" className="w-full h-11 px-3 rounded-xl border border-gray-200 text-sm" />
                            </div>
                            {!user && (
                                <input value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder="Your phone number" className="w-full h-11 px-3 rounded-xl border border-gray-200 text-sm" />
                            )}
                            {error && <p className="text-xs text-rose-600 font-semibold">{error}</p>}
                            <button
                                onClick={submit}
                                disabled={submitting}
                                className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black flex items-center justify-center gap-2"
                            >
                                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send Request"}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

interface ServiceListing {
    id: string;
    name: string;
    slug?: string;
    image_url: string;
    description: string;
    price: number;
    avg_rating: number;
    review_count: number;
    is_sponsored?: boolean;
    location_state?: string | null;
    location_city?: string | null;
    specs?: Record<string, any> | null;
    seller?: { businessName?: string };
}

const SERVICE_TABS = ["All", "Home Services", "Repair & Maintenance", "Building & Construction", "Automotive", "Beauty & Wellness", "Events & Catering", "Cleaning", "Logistics & Moving", "Professional / Consulting", "Tech & Digital", "Tutoring"];

/**
 * The "hire an expert" surface — Product rows with listingType="service"
 * (see lib/listing-types.ts), which already has its own fields (service
 * type, pricing model, areas covered, availability), its own PDP CTA
 * ("Request a Quote" wired to the existing Quote/escrow pipeline), and
 * its own seller store page — none of that needed building. What was
 * actually missing was a place to BROWSE them; until now the only way in
 * was already knowing to filter /search by listingType=service. This
 * page is the discoverability layer, mirroring /discover's pattern for
 * "spot" listings.
 */
export default function ServicesPage() {
    const { location, setLocation } = useLocation();
    const [services, setServices] = useState<ServiceListing[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("All");
    const [showRequestModal, setShowRequestModal] = useState(false);

    useEffect(() => {
        setLoading(true);
        fetch(`/api/products?listingType=service&locationState=${encodeURIComponent(location)}&limit=60`)
            .then(r => r.ok ? r.json() : null)
            .then(data => {
                const list: ServiceListing[] = Array.isArray(data) ? data : (data?.products || []);
                setServices(list);
            })
            .catch(() => setServices([]))
            .finally(() => setLoading(false));
    }, [location]);

    const filtered = useMemo(() => {
        const list = activeTab === "All" ? services : services.filter(s => s.specs?.service_type === activeTab);
        return [...list].sort((a, b) => (b.is_sponsored ? 1 : 0) - (a.is_sponsored ? 1 : 0));
    }, [services, activeTab]);

    return (
        <div className="min-h-screen bg-white font-sans">
            <Navbar />

            <div className="bg-gradient-to-br from-indigo-700 via-indigo-600 to-indigo-800 text-white">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
                    <div className="flex items-center gap-2 text-white/80 text-xs font-black uppercase tracking-widest mb-2">
                        <Wrench className="h-4 w-4" /> Hire an Expert
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                        Services & experts in {location}
                    </h1>
                    <p className="text-white/80 text-sm mt-1 max-w-xl">
                        Web design, repairs, events, tutoring, and more — hire a verified pro, or{" "}
                        <Link href="/seller/products/new" className="underline font-bold text-white">list your own service</Link>.
                    </p>

                    <div className="mt-4 flex flex-wrap items-center gap-3">
                        <div className="relative inline-block">
                            <select
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                className="appearance-none bg-white/15 backdrop-blur-md border border-white/25 rounded-full pl-4 pr-9 py-2 text-sm font-bold text-white outline-none"
                            >
                                {NIGERIAN_STATES.map(s => (
                                    <option key={s.state} value={s.state} className="text-gray-900">{s.state}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white pointer-events-none" />
                        </div>
                        <button
                            onClick={() => setShowRequestModal(true)}
                            className="bg-white text-indigo-700 rounded-full px-4 py-2 text-sm font-black hover:bg-white/90 transition-colors"
                        >
                            Can't find who you need? Request an Expert
                        </button>
                    </div>
                </div>
            </div>

            {showRequestModal && <RequestExpertModal defaultState={location} onClose={() => setShowRequestModal(false)} />}

            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
                    {SERVICE_TABS.map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={cn(
                                "shrink-0 px-4 py-2 rounded-full text-xs font-bold border transition-colors",
                                activeTab === tab
                                    ? "bg-indigo-600 text-white border-indigo-600"
                                    : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                            )}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-72 rounded-3xl bg-gray-100 animate-pulse" />)}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-24 bg-gray-50 rounded-3xl border border-gray-100">
                        <Wrench className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                        <h3 className="text-lg font-bold text-gray-900">No experts listed here yet</h3>
                        <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
                            No {activeTab === "All" ? "services" : activeTab.toLowerCase()} in {location} yet. Offer a service yourself?{" "}
                            <Link href="/seller/products/new" className="text-indigo-600 font-bold underline">List it here</Link>.
                        </p>
                        <button
                            onClick={() => setShowRequestModal(true)}
                            className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-5 py-2.5 text-sm font-black"
                        >
                            Request an Expert Instead
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {filtered.map(svc => (
                            <Link
                                key={svc.id}
                                href={getProductUrl(svc.id, svc.name, svc.slug)}
                                className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow"
                            >
                                <div className="relative aspect-[4/3] bg-gray-100">
                                    <img src={svc.image_url || "/assets/images/placeholder.png"} alt={svc.name} className="w-full h-full object-cover" />
                                    {svc.is_sponsored && (
                                        <span className="absolute top-3 left-3 bg-brand-orange text-white text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full">Featured</span>
                                    )}
                                    {svc.specs?.service_type && (
                                        <span className="absolute bottom-3 left-3 bg-black/60 text-white text-[10px] font-bold px-2.5 py-1 rounded-full backdrop-blur-sm">{svc.specs.service_type}</span>
                                    )}
                                </div>
                                <div className="p-4 flex-1 flex flex-col">
                                    <h3 className="font-black text-gray-900 leading-tight">{svc.name}</h3>
                                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                        <MapPin className="h-3 w-3 shrink-0" /> {svc.location_city ? `${svc.location_city}, ` : ""}{svc.location_state || location}
                                    </p>
                                    {svc.review_count > 0 && (
                                        <div className="flex items-center gap-1 mt-1.5 text-xs font-bold text-amber-500">
                                            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> {svc.avg_rating.toFixed(1)}
                                            <span className="text-gray-400 font-medium">({svc.review_count})</span>
                                        </div>
                                    )}
                                    {svc.specs?.availability && (
                                        <div className="flex items-center gap-1 mt-1.5 text-xs text-gray-500">
                                            <Clock className="h-3 w-3" /> {svc.specs.availability}
                                        </div>
                                    )}
                                    {svc.description && (
                                        <p className="text-xs text-gray-500 mt-2 line-clamp-2 leading-relaxed">{svc.description}</p>
                                    )}
                                    <div className="mt-auto pt-4 flex items-center justify-between">
                                        <span className="text-sm font-black text-gray-900">
                                            {svc.price > 0 ? `${svc.specs?.pricing_model === "Starting From" ? "from " : ""}${formatPrice(svc.price)}` : "Negotiable"}
                                        </span>
                                        <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full">Request a Quote</span>
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
