"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { Upload, ShieldCheck, ShieldAlert, Clock, BadgeCheck, Loader2 } from "lucide-react";

interface IdentityStatus {
    status: string;
    ownStatus?: string;
    submittedAt?: string | null;
    reviewedAt?: string | null;
    rejectionReason?: string | null;
    ninMasked?: string | null;
    hasDocument?: boolean;
    documentType?: string | null;
    // Filled when this account also owns a store that has been through the
    // seller KYC queue — so a verified vendor isn't asked to do it twice.
    sellerKyc?: {
        storeName: string;
        status: string;
        idType: string | null;
        submittedAt: string | null;
        reviewedAt: string | null;
        hasDocument: boolean;
    } | null;
}

export default function IdentityPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [info, setInfo] = useState<IdentityStatus | null>(null);
    const [nin, setNin] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // The reviewer has no NIMC lookup to check a number against, so the scan
    // is the only actual evidence in the submission.
    const [documentType, setDocumentType] = useState("nin");
    const [documentUrl, setDocumentUrl] = useState("");
    const [documentName, setDocumentName] = useState("");
    const [uploading, setUploading] = useState(false);

    const authHeaders = (): Record<string, string> => {
        const tok = typeof window !== "undefined" ? localStorage.getItem("fp_token") : null;
        return tok ? { Authorization: `Bearer ${tok}` } : {};
    };

    // A failed load used to leave `info` null forever, and the render treats
    // null as "still loading" — so any 401, 500 or dropped connection showed a
    // spinner that never stopped, with no error and no way to retry. That is
    // the reported symptom: the page "rolls" and the form is unreachable.
    const [loadError, setLoadError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const load = () => {
        setLoadError(null);
        setLoading(true);
        fetch("/api/account/identity", { headers: authHeaders(), cache: "no-store" })
            .then(async r => {
                if (r.status === 401) throw new Error("Your session expired — sign in again to continue.");
                if (!r.ok) throw new Error("We couldn't load your verification status.");
                return r.json();
            })
            .then(d => setInfo(d))
            .catch(e => setLoadError(e?.message || "We couldn't load your verification status."))
            .finally(() => setLoading(false));
    };

    useEffect(() => { if (user) load(); }, [user]);

    const uploadDocument = async (file: File) => {
        setError(null);
        setUploading(true);
        try {
            const form = new FormData();
            form.append("file", file);
            form.append("folder", "kyc");
            const res = await fetch("/api/upload", { method: "POST", headers: authHeaders(), body: form });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.url) {
                setError(data?.error || "That upload didn't go through — try a smaller photo.");
                return;
            }
            if (String(data.url).startsWith("data:")) {
                // The upload route falls back to a base64 data URI when Blob
                // storage isn't configured. The API refuses those on purpose —
                // a KYC scan inlined into a column is the same megabytes-in-JSON
                // problem that froze the homepage — so say so plainly instead of
                // failing at submit with a confusing message.
                setError("File storage isn't configured, so the document can't be saved. Tell support.");
                return;
            }
            setDocumentUrl(data.url);
            setDocumentName(file.name);
        } catch {
            setError("Upload failed — check your connection and try again.");
        } finally {
            setUploading(false);
        }
    };

    const submit = async () => {
        setError(null);
        setSubmitting(true);
        try {
            const res = await fetch("/api/account/identity", {
                method: "POST",
                headers: { "Content-Type": "application/json", ...authHeaders() },
                body: JSON.stringify({ ninNumber: nin, documentUrl, documentType }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error || "Something went wrong"); return; }
            setNin("");
            setDocumentUrl("");
            setDocumentName("");
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

                {loading ? (
                    <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-gray-300" /></div>
                ) : loadError || !info ? (
                    <div className="bg-rose-50 border border-rose-100 rounded-2xl p-6 text-center">
                        <ShieldAlert className="h-8 w-8 text-rose-400 mx-auto mb-3" />
                        <p className="text-sm font-bold text-rose-900 mb-1">Couldn't load this page</p>
                        <p className="text-xs text-rose-600 mb-4">{loadError || "Something went wrong."}</p>
                        <Button onClick={load} variant="outline" className="rounded-xl">Try again</Button>
                    </div>
                ) : info.status === "approved" ? (
                    <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 text-center">
                        <BadgeCheck className="h-10 w-10 text-emerald-600 mx-auto mb-3" />
                        <h2 className="font-black text-emerald-900 mb-1">Identity Verified</h2>
                        {info.ownStatus === "approved" ? (
                            <p className="text-xs text-emerald-700">
                                NIN on file: {info.ninMasked} · Verified {info.reviewedAt ? new Date(info.reviewedAt).toLocaleDateString() : ""}
                            </p>
                        ) : (
                            <p className="text-xs text-emerald-700">
                                Carried over from the KYC you completed for {info.sellerKyc?.storeName || "your store"} — nothing more to do.
                            </p>
                        )}
                    </div>
                ) : info.status === "pending" ? (
                    <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6 text-center">
                        <Clock className="h-10 w-10 text-amber-500 mx-auto mb-3" />
                        <h2 className="font-black text-amber-900 mb-1">Under Review</h2>
                        {info.ownStatus === "pending" ? (
                            <p className="text-xs text-amber-700">
                                NIN on file: {info.ninMasked} · Submitted {info.submittedAt ? new Date(info.submittedAt).toLocaleDateString() : ""}
                                {info.hasDocument ? " · ID document attached" : ""}
                            </p>
                        ) : (
                            <p className="text-xs text-amber-700">
                                Your store KYC for {info.sellerKyc?.storeName || "your store"} is with our team
                                {info.sellerKyc?.submittedAt ? ` · submitted ${new Date(info.sellerKyc.submittedAt).toLocaleDateString()}` : ""}.
                                It covers this account too.
                            </p>
                        )}
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

                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block pt-1">Which ID are you uploading?</label>
                            <select
                                value={documentType}
                                onChange={e => setDocumentType(e.target.value)}
                                className="w-full h-11 px-3 rounded-xl border border-gray-200 bg-white text-sm"
                            >
                                <option value="nin">NIN slip</option>
                                <option value="drivers_license">Driver's licence</option>
                                <option value="voters_card">Voter's card</option>
                                <option value="passport">International passport</option>
                            </select>

                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block pt-1">Photo of the document</label>
                            <label className="flex items-center gap-2 w-full h-11 px-3 rounded-xl border border-dashed border-gray-300 bg-white cursor-pointer text-sm text-gray-500 hover:border-brand-green-400">
                                {uploading ? <Loader2 className="h-4 w-4 animate-spin text-brand-green-600" /> : <Upload className="h-4 w-4 text-brand-green-600" />}
                                <span className="truncate">
                                    {uploading ? "Uploading…" : documentName || "Tap to take a photo or choose a file"}
                                </span>
                                <input
                                    type="file"
                                    accept="image/*,application/pdf"
                                    className="hidden"
                                    onChange={e => { const f = e.target.files?.[0]; if (f) uploadDocument(f); }}
                                />
                            </label>
                            {documentUrl && !uploading && (
                                <p className="text-[11px] text-emerald-600 font-semibold">Document attached — ready to submit.</p>
                            )}

                            {error && <p className="text-xs text-rose-600 font-semibold">{error}</p>}
                            <Button
                                onClick={submit}
                                disabled={submitting || uploading || nin.length !== 11 || !documentUrl}
                                className="w-full bg-brand-green-600 hover:bg-brand-green-700"
                            >
                                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit for Verification"}
                            </Button>
                            {nin.length === 11 && !documentUrl && !uploading && (
                                <p className="text-[11px] text-gray-400 text-center">
                                    Add a photo of your ID to submit — we have no way to check a number on its own.
                                </p>
                            )}
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
