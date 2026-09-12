"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MapPin, Star, Wrench, ChevronDown, Clock } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { useLocation } from "@/context/LocationContext";
import { NIGERIAN_STATES } from "@/lib/nigerian-states";
import { getProductUrl, formatPrice } from "@/lib/utils";
import { cn } from "@/lib/utils";

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

                    <div className="mt-4 relative inline-block">
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
                </div>
            </div>

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
