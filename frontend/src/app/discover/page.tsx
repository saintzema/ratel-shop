"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MapPin, Star, Phone, Navigation2, PlayCircle, Compass, ChevronDown } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { useLocation } from "@/context/LocationContext";
import { nativeBridge } from "@/lib/native-bridge";
import { NIGERIAN_STATES } from "@/lib/nigerian-states";
import { cn } from "@/lib/utils";

interface Spot {
    id: string;
    name: string;
    description: string;
    image_url: string;
    images: string[];
    avg_rating: number;
    review_count: number;
    is_sponsored?: boolean;
    location_state?: string | null;
    location_city?: string | null;
    specs?: Record<string, any> | null;
    seller?: { businessName?: string; phoneNumber?: string | null; whatsappNumber?: string | null };
}

const SPOT_TABS = ["All", "Food & Dining", "Chill Spot", "Nightlife", "Activity", "Hiking & Outdoor", "Sip & Paint", "Event Centre"];

/**
 * A local-discovery surface, not a shop — "where to get the best nkwobi in
 * Abuja", not "buy nkwobi". Spots are Product rows with listingType="spot"
 * (see lib/listing-types.ts): reuses the review system, the location columns,
 * the boost/featured-placement pipeline and the product-creation form that
 * already exist, rather than a parallel model. A business "pays to be
 * listed" by boosting their spot the same way a seller boosts a product —
 * see LISTING_TYPE_PRICING.spot in boost-packages.ts.
 */
export default function DiscoverPage() {
    const { location, setLocation } = useLocation();
    const [spots, setSpots] = useState<Spot[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("All");
    const [videoOpen, setVideoOpen] = useState<string | null>(null);

    useEffect(() => {
        setLoading(true);
        fetch(`/api/products?listingType=spot&locationState=${encodeURIComponent(location)}&limit=60`)
            .then(r => r.ok ? r.json() : null)
            .then(data => {
                const list: Spot[] = Array.isArray(data) ? data : (data?.products || []);
                setSpots(list);
            })
            .catch(() => setSpots([]))
            .finally(() => setLoading(false));
    }, [location]);

    const filtered = useMemo(() => {
        const list = activeTab === "All" ? spots : spots.filter(s => s.specs?.spot_type === activeTab);
        // Featured (boosted) spots first — this is the placement businesses pay for.
        return [...list].sort((a, b) => (b.is_sponsored ? 1 : 0) - (a.is_sponsored ? 1 : 0));
    }, [spots, activeTab]);

    const callSpot = (s: Spot) => {
        const num = s.seller?.phoneNumber || s.seller?.whatsappNumber;
        if (num) window.location.href = `tel:${num.replace(/\s+/g, "")}`;
    };

    const directions = (s: Spot) => {
        const url = s.specs?.maps_url;
        if (url) nativeBridge.openUrl(url);
    };

    return (
        <div className="min-h-screen bg-white font-sans">
            <Navbar />

            <div className="bg-gradient-to-br from-brand-green-700 via-brand-green-600 to-brand-green-800 text-white">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
                    <div className="flex items-center gap-2 text-white/80 text-xs font-black uppercase tracking-widest mb-2">
                        <Compass className="h-4 w-4" /> Discover
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                        Best spots in {location}
                    </h1>
                    <p className="text-white/80 text-sm mt-1 max-w-xl">
                        Food, chill spots, nightlife and things to do near you — picked by real people, not ads.
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
                    {SPOT_TABS.map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={cn(
                                "shrink-0 px-4 py-2 rounded-full text-xs font-bold border transition-colors",
                                activeTab === tab
                                    ? "bg-brand-green-600 text-white border-brand-green-600"
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
                        <Compass className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                        <h3 className="text-lg font-bold text-gray-900">Nothing listed here yet</h3>
                        <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
                            No {activeTab === "All" ? "spots" : activeTab.toLowerCase()} in {location} yet. Own a business here?{" "}
                            <Link href="/seller/products/new" className="text-brand-green-600 font-bold underline">List it on Discover</Link>.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {filtered.map(spot => (
                            <div key={spot.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                                <div className="relative aspect-[4/3] bg-gray-100">
                                    <img src={spot.image_url || "/assets/images/placeholder.png"} alt={spot.name} className="w-full h-full object-cover" />
                                    {spot.is_sponsored && (
                                        <span className="absolute top-3 left-3 bg-brand-orange text-white text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full">Featured</span>
                                    )}
                                    {spot.specs?.video_url && (
                                        <button
                                            onClick={() => setVideoOpen(spot.specs!.video_url)}
                                            className="absolute inset-0 flex items-center justify-center bg-black/10 hover:bg-black/20 transition-colors"
                                        >
                                            <PlayCircle className="h-12 w-12 text-white drop-shadow-lg" />
                                        </button>
                                    )}
                                    {spot.specs?.spot_type && (
                                        <span className="absolute bottom-3 left-3 bg-black/60 text-white text-[10px] font-bold px-2.5 py-1 rounded-full backdrop-blur-sm">{spot.specs.spot_type}</span>
                                    )}
                                </div>
                                <div className="p-4 flex-1 flex flex-col">
                                    <h3 className="font-black text-gray-900 leading-tight">{spot.name}</h3>
                                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                        <MapPin className="h-3 w-3 shrink-0" /> {spot.location_city ? `${spot.location_city}, ` : ""}{spot.location_state || location}
                                    </p>
                                    {spot.review_count > 0 && (
                                        <div className="flex items-center gap-1 mt-1.5 text-xs font-bold text-amber-500">
                                            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> {spot.avg_rating.toFixed(1)}
                                            <span className="text-gray-400 font-medium">({spot.review_count})</span>
                                        </div>
                                    )}
                                    {spot.description && (
                                        <p className="text-xs text-gray-500 mt-2 line-clamp-2 leading-relaxed">{spot.description}</p>
                                    )}
                                    {spot.specs?.price_hint && (
                                        <p className="text-xs font-bold text-gray-700 mt-2">{spot.specs.price_hint}</p>
                                    )}

                                    <div className="flex gap-2 mt-auto pt-4">
                                        <button
                                            onClick={() => directions(spot)}
                                            disabled={!spot.specs?.maps_url}
                                            className="flex-1 h-10 rounded-xl bg-brand-green-600 hover:bg-brand-green-700 disabled:bg-gray-200 disabled:text-gray-400 text-white text-xs font-black flex items-center justify-center gap-1.5"
                                        >
                                            <Navigation2 className="h-3.5 w-3.5" /> Directions
                                        </button>
                                        <button
                                            onClick={() => callSpot(spot)}
                                            disabled={!spot.seller?.phoneNumber && !spot.seller?.whatsappNumber}
                                            className="h-10 w-10 rounded-xl border border-gray-200 disabled:opacity-30 flex items-center justify-center text-gray-700"
                                        >
                                            <Phone className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {videoOpen && (
                <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setVideoOpen(null)}>
                    <video src={videoOpen} controls autoPlay className="max-w-full max-h-full rounded-2xl" onClick={e => e.stopPropagation()} />
                </div>
            )}

            <Footer />
        </div>
    );
}
