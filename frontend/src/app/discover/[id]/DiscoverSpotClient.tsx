"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, MapPin, Star, Phone, Navigation2, Image as ImageIcon, Loader2, Send, PlayCircle } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { nativeBridge } from "@/lib/native-bridge";
import { cn, getProxiedImageUrl } from "@/lib/utils";

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
    seller?: { id?: string; businessName?: string; phoneNumber?: string | null; whatsappNumber?: string | null };
}

interface Review {
    id: string;
    user_name: string;
    rating: number;
    title: string;
    body: string;
    created_at: string;
}

const SUGGESTED_QUESTIONS: Record<string, string[]> = {
    "Food & Dining": ["Are you open right now?", "Do you take reservations?", "What's the average price per person?"],
    "Nightlife": ["Is it busy tonight?", "Any cover charge?", "Do you have bottle service?"],
    "Chill Spot": ["Is it open right now?", "Is there parking available?", "Do you allow outside drinks?"],
    "Gym & Fitness": ["Do you have day passes?", "What are your opening hours?", "Do you have personal trainers?"],
    "Supermarket": ["Are you open right now?", "Do you deliver?", "Do you accept card payment?"],
    default: ["Are you open right now?", "Is there parking nearby?", "What's the average price?"],
};

export default function DiscoverSpotClient({ id }: { id: string }) {
    const router = useRouter();
    const { user } = useAuth();
    const [spot, setSpot] = useState<Spot | null>(null);
    const [nearby, setNearby] = useState<Spot[]>([]);
    const [rank, setRank] = useState<{ position: number; total: number } | null>(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<"about" | "area" | "reviews">("about");
    const [imgIndex, setImgIndex] = useState(0);
    const [videoOpen, setVideoOpen] = useState(false);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [touchStartX, setTouchStartX] = useState<number | null>(null);

    const [reviewRating, setReviewRating] = useState(0);
    const [reviewTitle, setReviewTitle] = useState("");
    const [reviewBody, setReviewBody] = useState("");
    const [reviewSubmitting, setReviewSubmitting] = useState(false);
    const [reviewError, setReviewError] = useState("");
    const [reviewDone, setReviewDone] = useState(false);

    const [askText, setAskText] = useState("");

    useEffect(() => {
        setLoading(true);
        fetch(`/api/products/${encodeURIComponent(id)}`)
            .then(r => r.ok ? r.json() : null)
            .then(async data => {
                const s: Spot | null = data?.error ? null : data;
                if (!s) { setLoading(false); return; }
                setSpot(s);

                // Siblings in the same city + spot type — powers both the
                // "#N of M" ranking line and the Recommended nearby rail,
                // the same list the /discover board itself already builds.
                const state = s.location_state || "";
                const type = s.specs?.spot_type;
                const res = await fetch(`/api/products?listingType=spot&locationState=${encodeURIComponent(state)}&limit=100`).then(r => r.ok ? r.json() : null).catch(() => null);
                const list: Spot[] = Array.isArray(res) ? res : (res?.products || []);
                const sameType = type ? list.filter(x => x.specs?.spot_type === type) : list;
                const ranked = [...sameType].sort((a, b) => (b.avg_rating || 0) - (a.avg_rating || 0));
                const pos = ranked.findIndex(x => x.id === s.id);
                if (pos >= 0) setRank({ position: pos + 1, total: ranked.length });
                setNearby(list.filter(x => x.id !== s.id).slice(0, 4));

                fetch(`/api/reviews?productId=${encodeURIComponent(id)}`)
                    .then(r => r.ok ? r.json() : null)
                    .then(rd => setReviews(rd?.reviews || []))
                    .catch(() => {});
            })
            .finally(() => setLoading(false));
    }, [id]);

    const images = useMemo(() => {
        if (!spot) return [];
        const list = (spot.images && spot.images.length > 0) ? spot.images : [spot.image_url].filter(Boolean);
        return list.length > 0 ? list : ["/assets/images/placeholder.png"];
    }, [spot]);

    const nextImg = () => setImgIndex(i => (i + 1) % images.length);
    const prevImg = () => setImgIndex(i => (i - 1 + images.length) % images.length);

    const handleTouchStart = (e: React.TouchEvent) => setTouchStartX(e.touches[0].clientX);
    const handleTouchEnd = (e: React.TouchEvent) => {
        if (touchStartX === null) return;
        const delta = e.changedTouches[0].clientX - touchStartX;
        if (delta < -40) nextImg();
        else if (delta > 40) prevImg();
        setTouchStartX(null);
    };

    const contactNumber = spot?.seller?.whatsappNumber || spot?.seller?.phoneNumber;
    const suggestedQs = SUGGESTED_QUESTIONS[spot?.specs?.spot_type as string] || SUGGESTED_QUESTIONS.default;

    const askViaWhatsapp = (text: string) => {
        if (!contactNumber) return;
        const num = contactNumber.replace(/[^0-9]/g, "").replace(/^0/, "234");
        window.open(`https://wa.me/${num}?text=${encodeURIComponent(`Hi, about "${spot?.name}" on FairPrice Discover — ${text}`)}`, "_blank");
    };

    const callSpot = () => { if (contactNumber) window.location.href = `tel:${contactNumber.replace(/\s+/g, "")}`; };
    const directions = () => { if (spot?.specs?.maps_url) nativeBridge.openUrl(spot.specs.maps_url); };

    const mapEmbedSrc = spot
        ? `https://www.google.com/maps?q=${encodeURIComponent(`${spot.name}, ${spot.location_city || ""}, ${spot.location_state || ""}, Nigeria`)}&output=embed`
        : "";

    const submitReview = async () => {
        setReviewError("");
        if (!user) { setReviewError("Sign in to leave a review."); return; }
        if (!reviewRating) { setReviewError("Pick a star rating."); return; }
        setReviewSubmitting(true);
        try {
            const token = localStorage.getItem("fp_token");
            const res = await fetch("/api/reviews", {
                method: "POST",
                headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                body: JSON.stringify({ product_id: id, rating: reviewRating, title: reviewTitle, body: reviewBody }),
            });
            const d = await res.json();
            if (!res.ok) throw new Error(d?.error || "Could not submit review");
            setReviewDone(true);
            setReviews(prev => [{ id: d.review.id, user_name: d.review.userName, rating: d.review.rating, title: d.review.title, body: d.review.body, created_at: d.review.createdAt }, ...prev]);
        } catch (e: any) {
            setReviewError(e.message);
        } finally {
            setReviewSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-white font-sans">
                <Navbar />
                <div className="max-w-3xl mx-auto px-4 py-10 space-y-4">
                    <div className="h-72 rounded-3xl bg-gray-100 animate-pulse" />
                    <div className="h-6 w-2/3 rounded bg-gray-100 animate-pulse" />
                    <div className="h-4 w-1/3 rounded bg-gray-100 animate-pulse" />
                </div>
                <Footer />
            </div>
        );
    }
    if (!spot) {
        return (
            <div className="min-h-screen bg-white font-sans">
                <Navbar />
                <div className="max-w-lg mx-auto px-4 py-24 text-center text-gray-500">This spot isn't listed anymore.</div>
                <Footer />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white font-sans">
            <Navbar />

            <div className="max-w-3xl mx-auto px-0 sm:px-4">
                <div className="flex items-center justify-between px-4 sm:px-0 py-3">
                    <button onClick={() => router.push("/discover")} className="flex items-center gap-1.5 text-sm font-bold text-gray-700 underline underline-offset-2">
                        <ChevronLeft className="h-4 w-4" /> See all spots
                    </button>
                </div>

                {/* ── Photo gallery — swipe, arrows, counter badge, like TripAdvisor's hero gallery ── */}
                <div
                    className="relative w-full aspect-[4/3] sm:rounded-2xl overflow-hidden bg-gray-900 select-none"
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                >
                    <img
                        src={getProxiedImageUrl(images[imgIndex])}
                        alt={`${spot.name} photo ${imgIndex + 1}`}
                        className="w-full h-full object-cover"
                    />
                    {spot.specs?.video_url && (
                        <button onClick={() => setVideoOpen(true)} className="absolute inset-0 flex items-center justify-center bg-black/10 hover:bg-black/20">
                            <PlayCircle className="h-14 w-14 text-white drop-shadow-lg" />
                        </button>
                    )}
                    {images.length > 1 && (
                        <>
                            <button onClick={prevImg} className="absolute left-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur-sm">
                                <ChevronLeft className="h-5 w-5" />
                            </button>
                            <button onClick={nextImg} className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur-sm">
                                <ChevronRight className="h-5 w-5" />
                            </button>
                        </>
                    )}
                    <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 backdrop-blur-sm">
                        <ImageIcon className="h-3 w-3" /> {imgIndex + 1}/{images.length}
                    </div>
                    {spot.is_sponsored && (
                        <span className="absolute top-3 left-3 bg-brand-orange text-white text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full">Featured</span>
                    )}
                </div>
                {images.length > 1 && (
                    <div className="flex gap-1.5 px-4 sm:px-0 py-3 overflow-x-auto no-scrollbar">
                        {images.map((img, i) => (
                            <button key={i} onClick={() => setImgIndex(i)} className={cn("shrink-0 h-14 w-14 rounded-lg overflow-hidden border-2", i === imgIndex ? "border-brand-green-600" : "border-transparent opacity-70")}>
                                <img src={getProxiedImageUrl(img)} className="w-full h-full object-cover" alt="" />
                            </button>
                        ))}
                    </div>
                )}

                <div className="px-4 sm:px-0 py-4">
                    <h1 className="text-xl sm:text-2xl font-black text-gray-900">{spot.name}</h1>
                    <div className="flex items-center gap-2 flex-wrap mt-1.5">
                        {spot.review_count > 0 && (
                            <span className="flex items-center gap-1 text-sm font-bold text-amber-500">
                                <Star className="h-4 w-4 fill-amber-400 text-amber-400" /> {spot.avg_rating.toFixed(1)}
                                <span className="text-gray-400 font-medium">({spot.review_count} review{spot.review_count === 1 ? "" : "s"})</span>
                            </span>
                        )}
                        {spot.specs?.spot_type && <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{spot.specs.spot_type}</span>}
                    </div>
                    {rank && (
                        <p className="text-xs text-gray-500 mt-2 underline underline-offset-2">
                            #{rank.position} of {rank.total} {spot.specs?.spot_type || "spots"} in {spot.location_city || spot.location_state}
                        </p>
                    )}
                    <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {spot.location_city ? `${spot.location_city}, ` : ""}{spot.location_state}
                    </p>

                    <div className="flex gap-2 mt-4">
                        <Button onClick={directions} disabled={!spot.specs?.maps_url} className="flex-1 h-11 rounded-xl bg-brand-green-600 hover:bg-brand-green-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold flex items-center justify-center gap-1.5">
                            <Navigation2 className="h-4 w-4" /> Directions
                        </Button>
                        <Button variant="outline" onClick={callSpot} disabled={!contactNumber} className="h-11 rounded-xl px-4 flex items-center gap-1.5 font-bold">
                            <Phone className="h-4 w-4" /> Call to Confirm
                        </Button>
                    </div>
                </div>

                {/* ── Tabs: About / The Area / Reviews ── */}
                <div className="flex border-b border-gray-100 px-4 sm:px-0">
                    {(["about", "area", "reviews"] as const).map(t => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            className={cn("px-4 py-3 text-sm font-bold border-b-2 -mb-px transition-colors capitalize", tab === t ? "border-brand-green-600 text-brand-green-700" : "border-transparent text-gray-400")}
                        >
                            {t === "area" ? "The Area" : t}
                        </button>
                    ))}
                </div>

                <div className="px-4 sm:px-0 py-5">
                    {tab === "about" && (
                        <div className="space-y-4">
                            {spot.description && <p className="text-sm text-gray-700 leading-relaxed">{spot.description}</p>}
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                {spot.specs?.price_hint && (
                                    <div className="bg-gray-50 rounded-xl p-3">
                                        <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Average Spend</p>
                                        <p className="font-bold text-gray-900 mt-0.5">{spot.specs.price_hint}</p>
                                    </div>
                                )}
                                {spot.specs?.opening_hours && (
                                    <div className="bg-gray-50 rounded-xl p-3">
                                        <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Opening Hours</p>
                                        <p className="font-bold text-gray-900 mt-0.5">{spot.specs.opening_hours}</p>
                                    </div>
                                )}
                            </div>

                            {/* Ask anything — real, reaches the business on WhatsApp instead
                                of faking an AI answer we have no data to actually give. */}
                            <div className="border border-gray-100 rounded-2xl p-4 bg-emerald-50/40">
                                <p className="font-bold text-gray-900 text-sm mb-2">Have a question about {spot.name}?</p>
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {suggestedQs.map(q => (
                                        <button key={q} onClick={() => askViaWhatsapp(q)} disabled={!contactNumber} className="text-xs font-bold text-brand-green-700 bg-white border border-brand-green-200 px-3 py-1.5 rounded-full disabled:opacity-40 disabled:cursor-not-allowed">
                                            {q}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        value={askText}
                                        onChange={e => setAskText(e.target.value)}
                                        placeholder={contactNumber ? "Ask anything — sends via WhatsApp" : "No contact number on file yet"}
                                        disabled={!contactNumber}
                                        className="flex-1 h-10 rounded-xl border border-gray-200 px-3 text-sm disabled:bg-gray-100"
                                    />
                                    <button
                                        onClick={() => { if (askText.trim()) { askViaWhatsapp(askText.trim()); setAskText(""); } }}
                                        disabled={!contactNumber || !askText.trim()}
                                        className="h-10 w-10 rounded-xl bg-brand-green-600 hover:bg-brand-green-700 disabled:bg-gray-200 text-white flex items-center justify-center shrink-0"
                                    >
                                        <Send className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {tab === "area" && (
                        <div className="space-y-4">
                            <div className="rounded-2xl overflow-hidden border border-gray-100 h-56 bg-gray-100">
                                <iframe src={mapEmbedSrc} className="w-full h-full border-0" loading="lazy" title={`Map of ${spot.name}`} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Location</p>
                                <p className="font-bold text-gray-900 mt-0.5">{spot.location_city ? `${spot.location_city}, ` : ""}{spot.location_state}</p>
                            </div>
                            {contactNumber && (
                                <button onClick={callSpot} className="flex items-center gap-2 text-brand-green-700 font-bold text-sm underline underline-offset-2">
                                    <Phone className="h-4 w-4" /> Call to confirm they're open
                                </button>
                            )}
                        </div>
                    )}

                    {tab === "reviews" && (
                        <div className="space-y-4">
                            {!reviewDone ? (
                                <div className="border border-gray-100 rounded-2xl p-4 space-y-3">
                                    <p className="font-bold text-gray-900 text-sm">Been here? Leave a review</p>
                                    <div className="flex gap-1">
                                        {[1, 2, 3, 4, 5].map(n => (
                                            <button key={n} onClick={() => setReviewRating(n)}>
                                                <Star className={cn("h-6 w-6", n <= reviewRating ? "fill-amber-400 text-amber-400" : "text-gray-200")} />
                                            </button>
                                        ))}
                                    </div>
                                    <input value={reviewTitle} onChange={e => setReviewTitle(e.target.value)} placeholder="Title (optional)" className="w-full h-10 rounded-xl border border-gray-200 px-3 text-sm" />
                                    <textarea value={reviewBody} onChange={e => setReviewBody(e.target.value)} rows={2} placeholder="Share your experience (optional)" className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm resize-none" />
                                    {reviewError && <p className="text-xs text-red-500">{reviewError}</p>}
                                    <Button disabled={reviewSubmitting} onClick={submitReview} className="h-10 rounded-xl bg-brand-green-600 hover:bg-brand-green-700 font-bold text-sm">
                                        {reviewSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null} Submit Review
                                    </Button>
                                </div>
                            ) : (
                                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center text-sm font-bold text-emerald-700">Thanks for your review!</div>
                            )}

                            {reviews.length === 0 ? (
                                <p className="text-sm text-gray-400 text-center py-6">No reviews yet — be the first.</p>
                            ) : (
                                reviews.map(r => (
                                    <div key={r.id} className="border-b border-gray-100 pb-4">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-gray-900 text-sm">{r.user_name}</span>
                                            <span className="flex items-center gap-0.5 text-amber-500 text-xs">
                                                {[1, 2, 3, 4, 5].map(n => <Star key={n} className={cn("h-3 w-3", n <= r.rating ? "fill-amber-400 text-amber-400" : "text-gray-200")} />)}
                                            </span>
                                        </div>
                                        {r.title && <p className="font-bold text-sm text-gray-800 mt-1">{r.title}</p>}
                                        {r.body && <p className="text-sm text-gray-600 mt-0.5">{r.body}</p>}
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>

                {nearby.length > 0 && (
                    <div className="px-4 sm:px-0 py-6 border-t border-gray-100">
                        <h2 className="font-black text-gray-900 mb-3">Recommended nearby</h2>
                        <div className="grid grid-cols-2 gap-3">
                            {nearby.map(n => (
                                <Link key={n.id} href={`/discover/${n.id}`} className="rounded-xl overflow-hidden border border-gray-100">
                                    <div className="aspect-[4/3] bg-gray-100">
                                        <img src={getProxiedImageUrl(n.image_url)} className="w-full h-full object-cover" alt={n.name} />
                                    </div>
                                    <div className="p-2">
                                        <p className="font-bold text-xs text-gray-900 truncate">{n.name}</p>
                                        {n.review_count > 0 && (
                                            <p className="text-[11px] text-amber-500 font-bold flex items-center gap-0.5"><Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {n.avg_rating.toFixed(1)}</p>
                                        )}
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {videoOpen && spot.specs?.video_url && (
                <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setVideoOpen(false)}>
                    <video src={spot.specs.video_url} controls autoPlay className="max-w-full max-h-full rounded-2xl" onClick={e => e.stopPropagation()} />
                </div>
            )}

            <Footer />
        </div>
    );
}
