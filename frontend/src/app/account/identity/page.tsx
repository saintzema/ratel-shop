"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { ShieldCheck, ShieldAlert, Clock, BadgeCheck, Loader2 } from "lucide-react";

interface IdentityStatus {
    status: "not_submitted" | "pending" | "approved" | "rejected";
    submittedAt: string | null;
    reviewedAt: string | null;
    rejectionReason: string | null;
    ninMasked: string | null;
}

export default function IdentityPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [info, setInfo] = useState<IdentityStatus | null>(null);
    const [nin, setNin] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const authHeaders = (): Record<string, string> => {
        const tok = typeof window !== "undefined" ? localStorage.getItem("fp_token") : null;
        return tok ? { Authorization: `Bearer ${tok}` } : {};
    };

    const load = () => {
        fetch("/api/account/identity", { headers: authHeaders() })
            .then(r => r.ok ? r.json() : null)
            .then(d => { if (d) setInfo(d); });
    };

    useEffect(() => { if (user) load(); }, [user]);

    const submit = async () => {
        setError(null);
        setSubmitting(true);
        try {
            const res = await fetch("/api/account/identity", {
                method: "POST",
                headers: { "Content-Type": "application/json", ...authHeaders() },
                body: JSON.stringify({ ninNumber: nin }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error || "Something went wrong"); return; }
            setNin("");
            load();
        } finally {
            setSubmitting(false);
        }
    };

    if (!user) {
        return (
            <div className="min-h-screen flex flex-col">
                <Navbar />
                <div className="flex-1 flex items-center justify-center p-8 text-center">
                    <Button onClick={() => router.push("/login?redirect=/account/identity")}>Sign In</Button>
                </div>
                <Footer />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white font-sans">
            <Navbar />
            <div className="max-w-lg mx-auto px-4 sm:px-6 py-10">
                <div className="flex items-center gap-3 mb-2">
                    <ShieldCheck className="h-6 w-6 text-brand-green-700" />
                    <h1 className="text-2xl font-black text-gray-900">Identity Verification</h1>
                </div>
                <p className="text-sm text-gray-500 mb-8">
                    A verified badge builds real trust for rides, escrow, and negotiation — especially in Nigeria, where a driver or seller you can actually trust matters more than a good price.
                </p>

                {!info ? (
                    <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-gray-300" /></div>
                ) : info.status === "approved" ? (
                    <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 text-center">
                        <BadgeCheck className="h-10 w-10 text-emerald-600 mx-auto mb-3" />
                        <h2 className="font-black text-emerald-900 mb-1">Identity Verified</h2>
                        <p className="text-xs text-emerald-700">NIN on file: {info.ninMasked} · Verified {info.reviewedAt ? new Date(info.reviewedAt).toLocaleDateString() : ""}</p>
                    </div>
                ) : info.status === "pending" ? (
                    <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6 text-center">
                        <Clock className="h-10 w-10 text-amber-500 mx-auto mb-3" />
                        <h2 className="font-black text-amber-900 mb-1">Under Review</h2>
                        <p className="text-xs text-amber-700">NIN on file: {info.ninMasked} · Submitted {info.submittedAt ? new Date(info.submittedAt).toLocaleDateString() : ""}</p>
                        <p className="text-[11px] text-amber-600 mt-2">Our team manually reviews every submission — this usually takes 1–2 business days.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {info.status === "rejected" && (
                            <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 flex items-start gap-3">
                                <ShieldAlert className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-bold text-rose-900">Not approved</p>
                                    <p className="text-xs text-rose-600 mt-0.5">{info.rejectionReason}</p>
                                </div>
                            </div>
                        )}
                        <div className="bg-gray-50 rounded-2xl p-5 space-y-3">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">National Identification Number (NIN)</label>
                            <Input
                                value={nin}
                                onChange={e => setNin(e.target.value.replace(/\D/g, "").slice(0, 11))}
                                placeholder="11-digit NIN"
                                inputMode="numeric"
                                className="bg-white"
                            />
                            {error && <p className="text-xs text-rose-600 font-semibold">{error}</p>}
                            <Button
                                onClick={submit}
                                disabled={submitting || nin.length !== 11}
                                className="w-full bg-brand-green-600 hover:bg-brand-green-700"
                            >
                                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit for Verification"}
                            </Button>
                        </div>
                        <p className="text-[11px] text-gray-400">
                            Your NIN is stored securely and used only to verify your identity — never shown to other users or shared with a third party.
                        </p>
                    </div>
                )}
            </div>
            <Footer />
        </div>
    );
}
