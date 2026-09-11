"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, ShieldCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";

/** Admin NIN-verification review queue — manual review until an official NIMC/NIN API partnership exists. */
export default function AdminIdentityPage() {
    const { user } = useAuth();
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<"pending" | "approved" | "rejected">("pending");
    const [acting, setActing] = useState<string | null>(null);

    const authHeaders = (): Record<string, string> => {
        const tok = typeof window !== "undefined" ? localStorage.getItem("fp_token") : null;
        return tok ? { Authorization: `Bearer ${tok}` } : {};
    };

    const load = () => {
        setLoading(true);
        fetch(`/api/admin/identity?status=${filter}`, { headers: authHeaders() })
            .then(r => r.ok ? r.json() : null)
            .then(d => setUsers(d?.users || []))
            .finally(() => setLoading(false));
    };

    useEffect(() => { if (user?.role === "admin") load(); }, [user, filter]);

    const act = async (userId: string, status: "approved" | "rejected") => {
        const rejectionReason = status === "rejected" ? window.prompt("Reason for rejection (shown to the user):") : undefined;
        if (status === "rejected" && rejectionReason === null) return;
        setActing(userId);
        try {
            await fetch("/api/admin/identity", {
                method: "PATCH",
                headers: { "Content-Type": "application/json", ...authHeaders() },
                body: JSON.stringify({ userId, status, rejectionReason }),
            });
            setUsers(prev => prev.filter(u => u.id !== userId));
        } finally {
            setActing(null);
        }
    };

    if (user?.role !== "admin") {
        return <div className="p-12 text-center text-gray-500">Admin access required.</div>;
    }

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
            <div className="flex items-center gap-3 mb-6">
                <ShieldCheck className="h-6 w-6 text-gray-700" />
                <h1 className="text-2xl font-black text-gray-900">Identity Verification Queue</h1>
            </div>

            <div className="flex gap-2 mb-6">
                {(["pending", "approved", "rejected"] as const).map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider ${filter === f ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500"}`}
                    >
                        {f}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="py-20 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
            ) : users.length === 0 ? (
                <div className="py-20 text-center text-gray-400">No {filter} submissions.</div>
            ) : (
                <div className="space-y-4">
                    {users.map(u => (
                        <div key={u.id} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm flex items-center justify-between gap-4">
                            <div>
                                <p className="font-black text-gray-900">{u.name}</p>
                                <p className="text-xs text-gray-500 mt-0.5">{u.email} {u.whatsappNumber ? `· ${u.whatsappNumber}` : ""}</p>
                                <p className="text-xs text-gray-500 mt-0.5">NIN: {u.ninNumber} · Submitted {u.ninSubmittedAt ? new Date(u.ninSubmittedAt).toLocaleDateString() : "—"}</p>
                                {u.ninStatus === "rejected" && u.ninRejectionReason && (
                                    <p className="text-xs text-rose-600 font-semibold mt-1">Rejected: {u.ninRejectionReason}</p>
                                )}
                            </div>
                            {filter === "pending" && (
                                <div className="flex gap-2 shrink-0">
                                    <Button size="sm" disabled={acting === u.id} onClick={() => act(u.id, "approved")} className="bg-emerald-600 hover:bg-emerald-700">
                                        <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
                                    </Button>
                                    <Button size="sm" variant="outline" disabled={acting === u.id} onClick={() => act(u.id, "rejected")} className="border-rose-200 text-rose-600 hover:bg-rose-50">
                                        <XCircle className="h-4 w-4 mr-1" /> Reject
                                    </Button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
