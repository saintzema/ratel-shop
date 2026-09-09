"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Car, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";

/** Admin vehicle-inspection queue — nothing here means nothing goes live. */
export default function AdminDriversPage() {
    const { user } = useAuth();
    const [vehicles, setVehicles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<"pending" | "approved" | "rejected">("pending");
    const [acting, setActing] = useState<string | null>(null);

    const authHeaders = (): Record<string, string> => {
        const tok = typeof window !== "undefined" ? localStorage.getItem("fp_token") : null;
        return tok ? { Authorization: `Bearer ${tok}` } : {};
    };

    const load = () => {
        setLoading(true);
        fetch(`/api/admin/vehicles?status=${filter}`, { headers: authHeaders() })
            .then(r => r.ok ? r.json() : null)
            .then(d => setVehicles(d?.vehicles || []))
            .finally(() => setLoading(false));
    };

    useEffect(() => { if (user?.role === "admin") load(); }, [user, filter]);

    const act = async (id: string, status: "approved" | "rejected") => {
        const rejectionReason = status === "rejected" ? window.prompt("Reason for rejection (shown to the driver):") : undefined;
        if (status === "rejected" && rejectionReason === null) return;
        setActing(id);
        try {
            await fetch("/api/admin/vehicles", {
                method: "PATCH",
                headers: { "Content-Type": "application/json", ...authHeaders() },
                body: JSON.stringify({ id, status, rejectionReason }),
            });
            setVehicles(prev => prev.filter(v => v.id !== id));
        } finally {
            setActing(null);
        }
    };

    if (user?.role !== "admin") {
        return <div className="p-12 text-center text-gray-500">Admin access required.</div>;
    }

    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
            <div className="flex items-center gap-3 mb-6">
                <Car className="h-6 w-6 text-gray-700" />
                <h1 className="text-2xl font-black text-gray-900">Driver Vehicle Inspections</h1>
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
            ) : vehicles.length === 0 ? (
                <div className="py-20 text-center text-gray-400">No {filter} vehicles.</div>
            ) : (
                <div className="space-y-4">
                    {vehicles.map(v => (
                        <div key={v.id} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                            <div className="flex items-start justify-between gap-4 mb-3">
                                <div>
                                    <p className="font-black text-gray-900">{v.make} {v.model} {v.year ? `(${v.year})` : ""}</p>
                                    <p className="text-xs text-gray-500 mt-0.5">Plate {v.plateNumber} · VIN {v.vin} · {v.vehicleClass.toUpperCase()}</p>
                                    <p className="text-xs text-gray-500 mt-0.5">Driver: {v.driver?.name} ({v.driver?.email}) {v.driver?.whatsappNumber ? `· ${v.driver.whatsappNumber}` : ""}</p>
                                </div>
                                {filter === "pending" && (
                                    <div className="flex gap-2 shrink-0">
                                        <Button size="sm" disabled={acting === v.id} onClick={() => act(v.id, "approved")} className="bg-emerald-600 hover:bg-emerald-700">
                                            <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
                                        </Button>
                                        <Button size="sm" variant="outline" disabled={acting === v.id} onClick={() => act(v.id, "rejected")} className="border-rose-200 text-rose-600 hover:bg-rose-50">
                                            <XCircle className="h-4 w-4 mr-1" /> Reject
                                        </Button>
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-2 flex-wrap">
                                {v.photos.map((p: string, i: number) => (
                                    <img key={i} src={p} alt="" className="h-24 w-24 rounded-xl object-cover border border-gray-100" />
                                ))}
                                {v.licensePhotoUrl && (
                                    <img src={v.licensePhotoUrl} alt="Licence" className="h-24 w-24 rounded-xl object-cover border border-gray-100 ring-2 ring-blue-200" />
                                )}
                            </div>
                            {v.status === "rejected" && v.rejectionReason && (
                                <p className="text-xs text-rose-600 font-semibold mt-3">Rejected: {v.rejectionReason}</p>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
