"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Briefcase, CheckCircle2, ChevronDown, Loader2 } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useLocation } from "@/context/LocationContext";
import { NIGERIAN_STATES } from "@/lib/nigerian-states";

const CATEGORIES = ["Home Services", "Repair & Maintenance", "Building & Construction", "Automotive", "Beauty & Wellness", "Events & Catering", "Cleaning", "Logistics & Moving", "Professional / Consulting", "Tech & Digital", "Tutoring", "Other"];

export default function PostGigPage() {
    const router = useRouter();
    const { user } = useAuth();
    const { location } = useLocation();

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [category, setCategory] = useState(CATEGORIES[0]);
    const [budgetMin, setBudgetMin] = useState("");
    const [budgetMax, setBudgetMax] = useState("");
    const [budgetType, setBudgetType] = useState<"fixed" | "hourly">("fixed");
    const [state, setState] = useState(location);
    const [city, setCity] = useState("");
    const [posterName, setPosterName] = useState("");
    const [posterEmail, setPosterEmail] = useState("");
    const [posterPhone, setPosterPhone] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState("");

    const submit = async () => {
        setError("");
        if (title.trim().length < 3) return setError("Give your gig a short title");
        if (description.trim().length < 10) return setError("Describe what you need in a bit more detail");
        if (!user && !posterEmail.includes("@") && !posterPhone.trim()) return setError("Leave an email or phone number so experts can reach you");
        setSubmitting(true);
        try {
            const tok = typeof window !== "undefined" ? localStorage.getItem("fp_token") : null;
            const res = await fetch("/api/gigs", {
                method: "POST",
                headers: { "Content-Type": "application/json", ...(tok ? { Authorization: `Bearer ${tok}` } : {}) },
                body: JSON.stringify({
                    title, description, category,
                    budgetMin: budgetMin || undefined, budgetMax: budgetMax || undefined, budgetType,
                    state, city, posterName, posterEmail, posterPhone,
                }),
            });
            const d = await res.json();
            if (!res.ok) throw new Error(d?.error || "Could not post your gig");
            setDone(true);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (done) {
        return (
            <div className="min-h-screen bg-white font-sans">
                <Navbar />
                <div className="max-w-lg mx-auto px-4 py-24 text-center">
                    <CheckCircle2 className="h-14 w-14 text-emerald-500 mx-auto mb-4" />
                    <h1 className="text-xl font-black text-gray-900">Your gig is live</h1>
                    <p className="text-sm text-gray-500 mt-2">Experts on FairPrice can now see it and send you proposals. We'll notify you as they come in.</p>
                    <Button onClick={() => router.push("/hire")} className="mt-6 rounded-2xl h-12 px-8 bg-indigo-600 hover:bg-indigo-700">Browse the board</Button>
                </div>
                <Footer />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white font-sans">
            <Navbar />
            <div className="bg-gradient-to-br from-indigo-700 via-indigo-600 to-indigo-800 text-white">
                <div className="max-w-lg mx-auto px-4 sm:px-6 py-8">
                    <div className="flex items-center gap-2 text-white/80 text-xs font-black uppercase tracking-widest mb-2">
                        <Briefcase className="h-4 w-4" /> Post a Gig
                    </div>
                    <h1 className="text-2xl font-black tracking-tight">Tell us what you need done</h1>
                    <p className="text-white/80 text-sm mt-1">Skilled experts on FairPrice will send you proposals with their price.</p>
                </div>
            </div>

            <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
                <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Title</label>
                    <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Fix a leaking kitchen sink" className="w-full h-11 mt-1 rounded-xl border border-gray-200 px-3 text-sm" />
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Description</label>
                    <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} placeholder="What exactly needs doing? Any details that help an expert quote accurately." className="w-full mt-1 rounded-xl border border-gray-200 px-3 py-2 text-sm resize-none" />
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Category</label>
                    <div className="relative mt-1">
                        <select value={category} onChange={e => setCategory(e.target.value)} className="appearance-none w-full h-11 rounded-xl border border-gray-200 px-3 text-sm">
                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Budget min (₦)</label>
                        <input type="number" value={budgetMin} onChange={e => setBudgetMin(e.target.value)} placeholder="0" className="w-full h-11 mt-1 rounded-xl border border-gray-200 px-3 text-sm" />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Budget max (₦)</label>
                        <input type="number" value={budgetMax} onChange={e => setBudgetMax(e.target.value)} placeholder="0" className="w-full h-11 mt-1 rounded-xl border border-gray-200 px-3 text-sm" />
                    </div>
                </div>
                <div className="flex gap-2">
                    {(["fixed", "hourly"] as const).map(t => (
                        <button key={t} type="button" onClick={() => setBudgetType(t)} className={`flex-1 h-10 rounded-xl text-xs font-bold border ${budgetType === t ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-600 border-gray-200"}`}>
                            {t === "fixed" ? "Fixed Price" : "Hourly Rate"}
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">State</label>
                        <div className="relative mt-1">
                            <select value={state} onChange={e => setState(e.target.value)} className="appearance-none w-full h-11 rounded-xl border border-gray-200 px-3 text-sm">
                                {NIGERIAN_STATES.map(s => <option key={s.state} value={s.state}>{s.state}</option>)}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">City</label>
                        <input value={city} onChange={e => setCity(e.target.value)} placeholder="e.g. Lekki" className="w-full h-11 mt-1 rounded-xl border border-gray-200 px-3 text-sm" />
                    </div>
                </div>

                {!user && (
                    <div className="border-t border-gray-100 pt-4 space-y-3">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Your contact info</p>
                        <input value={posterName} onChange={e => setPosterName(e.target.value)} placeholder="Your name" className="w-full h-11 rounded-xl border border-gray-200 px-3 text-sm" />
                        <input type="email" value={posterEmail} onChange={e => setPosterEmail(e.target.value)} placeholder="Email" className="w-full h-11 rounded-xl border border-gray-200 px-3 text-sm" />
                        <input value={posterPhone} onChange={e => setPosterPhone(e.target.value)} placeholder="Phone / WhatsApp" className="w-full h-11 rounded-xl border border-gray-200 px-3 text-sm" />
                    </div>
                )}

                {error && <p className="text-xs text-red-500">{error}</p>}
                <Button disabled={submitting} onClick={submit} className="w-full h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
                    {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null} Post Gig
                </Button>
            </div>
            <Footer />
        </div>
    );
}
