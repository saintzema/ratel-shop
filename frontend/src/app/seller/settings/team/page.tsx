"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Loader2, Trash2, ShieldCheck } from "lucide-react";

interface StaffRow {
    id: string;
    invitedEmail: string;
    status: string;
    canEditPrice: boolean;
    canEditStock: boolean;
    canManageDiscounts: boolean;
    canViewFinancials: boolean;
}

const PERMISSIONS: { key: keyof StaffRow; label: string }[] = [
    { key: "canEditPrice", label: "Edit prices" },
    { key: "canEditStock", label: "Edit stock/inventory" },
    { key: "canManageDiscounts", label: "Manage discounts" },
    { key: "canViewFinancials", label: "View payouts & financials" },
];

export default function SellerTeamPage() {
    const [staff, setStaff] = useState<StaffRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [email, setEmail] = useState("");
    const [newPerms, setNewPerms] = useState<Record<string, boolean>>({});
    const [inviting, setInviting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const authHeaders = (): HeadersInit => {
        const token = typeof window !== "undefined" ? localStorage.getItem("fp_token") : null;
        return token ? { Authorization: `Bearer ${token}` } : {};
    };

    const load = () => {
        fetch("/api/seller/staff", { headers: authHeaders() })
            .then(r => r.ok ? r.json() : { staff: [] })
            .then(d => setStaff(d.staff || []))
            .finally(() => setLoading(false));
    };

    useEffect(load, []);

    const invite = async () => {
        if (!email.includes("@")) return;
        setInviting(true);
        setError(null);
        try {
            const res = await fetch("/api/seller/staff", {
                method: "POST",
                headers: { "Content-Type": "application/json", ...authHeaders() },
                body: JSON.stringify({ email, ...newPerms }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || "Couldn't send the invite.");
                return;
            }
            setEmail("");
            setNewPerms({});
            load();
        } catch {
            setError("Couldn't reach the server — try again.");
        } finally {
            setInviting(false);
        }
    };

    const updatePermission = async (id: string, key: string, value: boolean) => {
        setStaff(prev => prev.map(s => s.id === id ? { ...s, [key]: value } : s));
        await fetch(`/api/seller/staff/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", ...authHeaders() },
            body: JSON.stringify({ [key]: value }),
        }).catch(() => {});
    };

    const revoke = async (id: string) => {
        if (!confirm("Revoke this teammate's access?")) return;
        setStaff(prev => prev.filter(s => s.id !== id));
        await fetch(`/api/seller/staff/${id}`, { method: "DELETE", headers: authHeaders() }).catch(() => {});
    };

    const statusColor: Record<string, string> = {
        invited: "bg-amber-100 text-amber-700",
        active: "bg-emerald-100 text-emerald-700",
        revoked: "bg-gray-100 text-gray-500",
    };

    return (
        <div className="max-w-2xl mx-auto py-8 px-4 space-y-6 pb-24">
            <div>
                <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                    <Users className="h-6 w-6 text-indigo-600" /> Team
                </h1>
                <p className="text-sm text-gray-500 mt-1">Invite staff to help run your store — free for your first 3 months. Choose exactly what they can touch, like price and stock.</p>
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Invite by email</label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teammate@example.com" className="rounded-xl" />
                <div className="space-y-2">
                    {PERMISSIONS.map(p => (
                        <label key={p.key} className="flex items-center gap-2 text-sm text-gray-700">
                            <input
                                type="checkbox"
                                checked={!!newPerms[p.key]}
                                onChange={(e) => setNewPerms(prev => ({ ...prev, [p.key]: e.target.checked }))}
                                className="rounded"
                            />
                            {p.label}
                        </label>
                    ))}
                </div>
                {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}
                <Button onClick={invite} disabled={inviting || !email.includes("@")} className="w-full h-11 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
                    {inviting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null} Send Invite
                </Button>
            </div>

            {loading ? (
                <div className="text-center py-8 text-gray-400 animate-pulse">Loading team...</div>
            ) : staff.length === 0 ? (
                <div className="text-center py-10 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 text-gray-500 text-sm">
                    No teammates yet — invite one above.
                </div>
            ) : (
                <div className="space-y-3">
                    {staff.map((s) => (
                        <div key={s.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <p className="font-bold text-gray-900 text-sm">{s.invitedEmail}</p>
                                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${statusColor[s.status]}`}>{s.status}</span>
                                </div>
                                {s.status !== "revoked" && (
                                    <button onClick={() => revoke(s.id)} className="p-1.5 text-gray-400 hover:text-rose-500"><Trash2 className="h-4 w-4" /></button>
                                )}
                            </div>
                            {s.status !== "revoked" && (
                                <div className="grid grid-cols-2 gap-2">
                                    {PERMISSIONS.map(p => (
                                        <label key={p.key} className="flex items-center gap-1.5 text-xs text-gray-600">
                                            <input
                                                type="checkbox"
                                                checked={!!s[p.key]}
                                                onChange={(e) => updatePermission(s.id, p.key, e.target.checked)}
                                                className="rounded"
                                            />
                                            {p.label}
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
            <p className="text-[11px] text-gray-400 flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" /> Teammates land straight in your dashboard the moment they log in — no separate acceptance step.
            </p>
        </div>
    );
}
