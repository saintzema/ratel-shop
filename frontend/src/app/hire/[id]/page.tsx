"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Briefcase, MapPin, Loader2, CheckCircle2, Star, ShieldCheck } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { formatPrice, getStoreUrl } from "@/lib/utils";

function budgetLabel(g: any): string {
    if (!g.budgetMin && !g.budgetMax) return "Negotiable";
    const suffix = g.budgetType === "hourly" ? "/hr" : "";
    if (g.budgetMin && g.budgetMax && g.budgetMin !== g.budgetMax) return `${formatPrice(g.budgetMin)} - ${formatPrice(g.budgetMax)}${suffix}`;
    return `${formatPrice(g.budgetMax || g.budgetMin || 0)}${suffix}`;
}

export default function GigDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;
    const { user } = useAuth();
    const [gig, setGig] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState("");
    const [price, setPrice] = useState("");
    const [deliveryDays, setDeliveryDays] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [bidSent, setBidSent] = useState(false);

    const load = () => {
        const tok = typeof window !== "undefined" ? localStorage.getItem("fp_token") : null;
        fetch(`/api/gigs/${id}`, { headers: tok ? { Authorization: `Bearer ${tok}` } : {} })
            .then(r => r.ok ? r.json() : null)
            .then(d => setGig(d?.gig || null))
            .finally(() => setLoading(false));
    };
    useEffect(load, [id]);

    const submitProposal = async () => {
        setError("");
        const p = Number(price);
        if (!message.trim() || message.trim().length < 5) return setError("Tell them briefly how you'd approach this");
        if (!Number.isFinite(p) || p <= 0) return setError("Enter your price");
        setSubmitting(true);
        try {
            const tok = localStorage.getItem("fp_token");
            const res = await fetch(`/api/gigs/${id}/proposals`, {
                method: "POST",
                headers: { "Content-Type": "application/json", ...(tok ? { Authorization: `Bearer ${tok}` } : {}) },
                body: JSON.stringify({ message, proposedPrice: p, deliveryDays: deliveryDays || undefined }),
            });
            const d = await res.json();
            if (!res.ok) throw new Error(d?.error || "Could not submit proposal");
            setBidSent(true);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setSubmitting(false);
        }
    };

    const respond = async (proposalId: string, action: "accept" | "decline") => {
        const tok = localStorage.getItem("fp_token");
        const res = await fetch(`/api/gigs/${id}/proposals/${proposalId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", ...(tok ? { Authorization: `Bearer ${tok}` } : {}) },
            body: JSON.stringify({ action }),
        });
        const d = await res.json();
        if (res.ok && action === "accept" && d.quoteId) {
            router.push(`/quote/${d.quoteId}`);
            return;
        }
        load();
    };

    if (loading) return <div className="p-12 text-center text-gray-500 animate-pulse">Loading gig...</div>;
    if (!gig) return <div className="p-12 text-center text-gray-500">This gig doesn't exist or was removed.</div>;

    const isSeller = user?.role === "seller";
    const canBid = isSeller && !gig.isOwner && gig.status === "open" && !gig.myProposal;

    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            <Navbar />
            <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-3">
                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{gig.category}</span>
                    <h1 className="text-xl font-black text-gray-900">{gig.title}</h1>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{gig.description}</p>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 pt-2 border-t border-gray-100">
                        <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {gig.locationCity ? `${gig.locationCity}, ` : ""}{gig.locationState}</span>
                        <span className="font-black text-gray-900 text-sm">Budget: {budgetLabel(gig)}</span>
                    </div>
                </div>

                {gig.isOwner && (
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
                        <h2 className="font-bold text-gray-900 mb-3">Proposals ({gig.proposals.length})</h2>
                        {gig.proposals.length === 0 ? (
                            <p className="text-sm text-gray-500">No proposals yet — experts will show up here as they bid.</p>
                        ) : (
                            <div className="space-y-3">
                                {gig.proposals.map((p: any) => (
                                    <div key={p.id} className="border border-gray-100 rounded-2xl p-4">
                                        <div className="flex items-center justify-between gap-3">
                                            <Link href={getStoreUrl(p.seller)} className="flex items-center gap-2 min-w-0">
                                                {p.seller.logoUrl ? <img src={p.seller.logoUrl} className="w-9 h-9 rounded-lg object-cover" alt="" /> : <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center"><Briefcase className="h-4 w-4 text-indigo-400" /></div>}
                                                <div className="min-w-0">
                                                    <p className="font-bold text-gray-900 text-sm truncate flex items-center gap-1">{p.seller.businessName}{p.seller.verified && <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />}</p>
                                                    <p className="text-xs text-gray-400 flex items-center gap-0.5"><Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {p.seller.rating || "New"}</p>
                                                </div>
                                            </Link>
                                            <p className="font-black text-gray-900 shrink-0">{formatPrice(p.proposedPrice)}</p>
                                        </div>
                                        <p className="text-sm text-gray-600 mt-2">{p.message}</p>
                                        {p.deliveryDays && <p className="text-xs text-gray-400 mt-1">Delivery: {p.deliveryDays} day{p.deliveryDays === 1 ? "" : "s"}</p>}
                                        {p.status === "pending" && gig.status === "open" && (
                                            <div className="flex gap-2 mt-3">
                                                <Button onClick={() => respond(p.id, "accept")} className="flex-1 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-sm">Accept & Send Quote</Button>
                                                <Button variant="outline" onClick={() => respond(p.id, "decline")} className="h-10 rounded-xl text-sm">Decline</Button>
                                            </div>
                                        )}
                                        {p.status !== "pending" && <p className={`text-xs font-bold mt-2 ${p.status === "accepted" ? "text-emerald-600" : "text-gray-400"}`}>{p.status === "accepted" ? "Accepted" : p.status === "declined" ? "Declined" : p.status}</p>}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {!gig.isOwner && gig.myProposal && (
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
                        <h2 className="font-bold text-gray-900 mb-2">Your proposal</h2>
                        <p className="font-black text-gray-900">{formatPrice(gig.myProposal.proposedPrice)}</p>
                        <p className="text-sm text-gray-600 mt-1">{gig.myProposal.message}</p>
                        <p className={`text-xs font-bold mt-2 ${gig.myProposal.status === "accepted" ? "text-emerald-600" : "text-gray-400"}`}>Status: {gig.myProposal.status}</p>
                    </div>
                )}

                {canBid && !bidSent && (
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-3">
                        <h2 className="font-bold text-gray-900">Send a proposal</h2>
                        <textarea value={message} onChange={e => setMessage(e.target.value)} rows={3} placeholder="How would you approach this?" className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm resize-none" />
                        <div className="grid grid-cols-2 gap-3">
                            <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="Your price (₦)" className="h-11 rounded-xl border border-gray-200 px-3 text-sm" />
                            <input type="number" value={deliveryDays} onChange={e => setDeliveryDays(e.target.value)} placeholder="Delivery (days)" className="h-11 rounded-xl border border-gray-200 px-3 text-sm" />
                        </div>
                        {error && <p className="text-xs text-red-500">{error}</p>}
                        <Button disabled={submitting} onClick={submitProposal} className="w-full h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700 font-bold">
                            {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null} Send Proposal
                        </Button>
                    </div>
                )}
                {bidSent && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-6 text-center">
                        <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-2" />
                        <p className="font-bold text-emerald-700">Proposal sent!</p>
                        <p className="text-xs text-emerald-600 mt-1">The poster will be notified. You'll get a notification if they accept.</p>
                    </div>
                )}
                {!isSeller && !gig.isOwner && (
                    <div className="bg-indigo-50 border border-indigo-100 rounded-3xl p-6 text-center">
                        <p className="text-sm text-indigo-700 font-bold">Want to bid on this gig?</p>
                        <p className="text-xs text-indigo-500 mt-1 mb-3">Set up a free seller/expert account to send proposals on gigs like this.</p>
                        <Link href="/seller/onboarding"><Button className="rounded-2xl h-11 px-6 bg-indigo-600 hover:bg-indigo-700">Become an Expert</Button></Link>
                    </div>
                )}
            </div>
            <Footer />
        </div>
    );
}
