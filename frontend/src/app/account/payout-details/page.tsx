"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { Landmark, Loader2, CheckCircle2 } from "lucide-react";
import { BANK_CODES } from "@/lib/bank-codes";

const BANK_NAMES = Object.keys(BANK_CODES).filter(name => !["GTBank", "UBA", "FCMB", "Opay", "Palmpay", "Kuda"].includes(name));

/**
 * Where a courier (or, later, any non-seller earner) gets paid. This is
 * exactly what lets delivery escrow release automatically instead of
 * falling to the admin-reviewed manual settlement queue — see
 * lib/delivery-payout.ts and /api/deliveries/[id]/deliver.
 */
export default function PayoutDetailsPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [current, setCurrent] = useState<{ bankName: string | null; accountName: string | null; accountNumberMasked: string | null } | null>(null);
    const [bankName, setBankName] = useState("");
    const [accountNumber, setAccountNumber] = useState("");
    const [accountName, setAccountName] = useState("");
    const [resolving, setResolving] = useState(false);
    const [resolutionError, setResolutionError] = useState("");
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const authHeaders = (): Record<string, string> => {
        const tok = typeof window !== "undefined" ? localStorage.getItem("fp_token") : null;
        return tok ? { Authorization: `Bearer ${tok}` } : {};
    };

    useEffect(() => {
        if (!user) return;
        fetch("/api/account/payout-details", { headers: authHeaders() })
            .then(r => r.ok ? r.json() : null)
            .then(d => { if (d) setCurrent(d); });
    }, [user]);

    useEffect(() => {
        if (accountNumber.length !== 10 || !bankName) { setAccountName(""); return; }
        const code = BANK_CODES[bankName];
        if (!code) return;
        setResolving(true);
        setResolutionError("");
        const t = setTimeout(() => {
            fetch(`/api/payouts/verify?account_number=${accountNumber}&bank_code=${code}`)
                .then(r => r.json())
                .then(d => {
                    if (d.success) setAccountName(d.account_name);
                    else { setResolutionError(d.error || "Could not resolve account"); setAccountName(""); }
                })
                .catch(() => setResolutionError("Network error resolving account"))
                .finally(() => setResolving(false));
        }, 500);
        return () => clearTimeout(t);
    }, [accountNumber, bankName]);

    const save = async () => {
        setSaving(true);
        try {
            const res = await fetch("/api/account/payout-details", {
                method: "POST",
                headers: { "Content-Type": "application/json", ...authHeaders() },
                body: JSON.stringify({ bankName, accountNumber, accountName }),
            });
            if (res.ok) {
                setSaved(true);
                setCurrent({ bankName, accountName, accountNumberMasked: `${"*".repeat(6)}${accountNumber.slice(-4)}` });
                setBankName(""); setAccountNumber(""); setAccountName("");
            }
        } finally {
            setSaving(false);
        }
    };

    if (!user) {
        return (
            <div className="min-h-screen flex flex-col">
                <Navbar />
                <div className="flex-1 flex items-center justify-center p-8 text-center">
                    <Button onClick={() => router.push("/login?redirect=/account/payout-details")}>Sign In</Button>
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
                    <Landmark className="h-6 w-6 text-brand-green-700" />
                    <h1 className="text-2xl font-black text-gray-900">Payout Bank Details</h1>
                </div>
                <p className="text-sm text-gray-500 mb-8">
                    Where your delivery earnings are sent automatically once a package you carried is confirmed delivered.
                </p>

                {current?.bankName && (
                    <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 mb-6 flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                        <p className="text-sm text-emerald-800 font-semibold">
                            {current.bankName} · {current.accountNumberMasked} · {current.accountName}
                        </p>
                    </div>
                )}

                <div className="bg-gray-50 rounded-2xl p-5 space-y-3">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Bank</label>
                    <select
                        value={bankName}
                        onChange={e => setBankName(e.target.value)}
                        className="w-full h-11 px-3 rounded-xl border border-gray-200 bg-white text-sm"
                    >
                        <option value="">Select your bank</option>
                        {BANK_NAMES.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>

                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Account Number</label>
                    <input
                        value={accountNumber}
                        onChange={e => setAccountNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                        placeholder="10-digit account number"
                        inputMode="numeric"
                        className="w-full h-11 px-3 rounded-xl border border-gray-200 bg-white text-sm"
                    />

                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Account Name</label>
                    <input
                        value={resolving ? "Resolving..." : accountName}
                        readOnly
                        placeholder="Auto-resolved from your bank"
                        className="w-full h-11 px-3 rounded-xl border border-gray-200 bg-gray-100 text-sm text-gray-600"
                    />
                    {resolutionError && <p className="text-xs text-rose-600 font-semibold">{resolutionError}</p>}

                    <Button
                        onClick={save}
                        disabled={saving || !accountName || resolving}
                        className="w-full bg-brand-green-600 hover:bg-brand-green-700"
                    >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Payout Details"}
                    </Button>
                    {saved && <p className="text-xs text-emerald-600 font-semibold text-center">Saved — future deliveries pay out here automatically.</p>}
                </div>
            </div>
            <Footer />
        </div>
    );
}
