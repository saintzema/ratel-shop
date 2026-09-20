"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Car, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { Pagination } from "@/components/ui/Pagination";

const PAGE_SIZE = 10;

/** Admin vehicle-inspection queue — nothing here means nothing goes live. */
export default function AdminDriversPage() {
    const { user } = useAuth();
    const [vehicles, setVehicles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<"pending" | "approved" | "rejected">("pending");
    const [acting, setActing] = useState<string | null>(null);
    const [page, setPage] = useState(1);

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

    useEffect(() => { setPage(1); if (user?.role === "admin") load(); }, [user, filter]);

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
            setVehicles(prev => { const next = prev.filter(v => v.id !== id); setPage(p => Math.min(p, Math.max(1, Math.ceil(next.length / PAGE_SIZE)))); return next; });
        } finally {
            setActing(null);
        }
    };

    if (user?.role !== "admin") {
        return <div className="p-12 text-center text-gray-500">Admin access required.</div>;
    }

    const totalPages = Math.max(1, Math.ceil(vehicles.length / PAGE_SIZE));
    const pageRows = vehicles.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
            <div className="flex items-center gap-3 mb-6">
                <Car className="h-6 w-6 text-gray-700" />
                <h1 className="text-2xl font-black text-gray-900">Driver Vehicle Inspections</h1>
            </div>

            <div className="flex gap-2 mb-6 overflow-x-auto">
                {(["pending", "approved", "rejected"] as const).map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider whitespace-nowrap ${filter === f ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500"}`}
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
                <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm min-w-[820px]">
                            <thead className="bg-gray-50 text-[10px] uppercase tracking-widest text-gray-400 font-black">
                                <tr>
                                    <th className="text-left px-4 py-3">Vehicle</th>
                                    <th className="text-left px-4 py-3">Plate / VIN</th>
                                    <th className="text-left px-4 py-3">Driver</th>
                                    <th className="text-left px-4 py-3">Documents</th>
                                    <th className="text-right px-4 py-3">{filter === "pending" ? "Action" : "Status"}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {pageRows.map(v => (
                                    <tr key={v.id} className="align-top">
                                        <td className="px-4 py-4">
                                            <p className="font-black text-gray-900">{v.make} {v.model}</p>
                                            <p className="text-xs text-gray-500">{v.year || ""} {v.color ? `· ${v.color}` : ""}</p>
                                            <span className="inline-block mt-1 text-[10px] font-black uppercase bg-gray-100 text-gray-600 rounded px-1.5 py-0.5">{v.vehicleClass}</span>
                                        </td>
                                        <td className="px-4 py-4 text-xs text-gray-600">
                                            <p className="font-bold text-gray-900">{v.plateNumber}</p>
                                            <p className="break-all">{v.vin}</p>
                                        </td>
                                        <td className="px-4 py-4 text-xs text-gray-600">
                                            <p className="font-bold text-gray-900">{v.driver?.name}</p>
                                            <p className="break-all">{v.driver?.email}</p>
                                            {v.driver?.whatsappNumber && <p>{v.driver.whatsappNumber}</p>}
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex gap-1.5 flex-wrap">
                                                {v.photos.map((p: string, i: number) => (
                                                    <a key={i} href={p} target="_blank" rel="noreferrer"><img src={p} alt="" className="h-14 w-14 rounded-lg object-cover border border-gray-100" /></a>
                                                ))}
                                                {v.licensePhotoUrl && (
                                                    <a href={v.licensePhotoUrl} target="_blank" rel="noreferrer"><img src={v.licensePhotoUrl} alt="Licence" className="h-14 w-14 rounded-lg object-cover border border-gray-100 ring-2 ring-blue-200" /></a>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            {filter === "pending" ? (
                                                <div className="inline-flex flex-col gap-2 items-stretch">
                                                    <Button size="sm" disabled={acting === v.id} onClick={() => act(v.id, "approved")} className="bg-emerald-600 hover:bg-emerald-700 justify-center">
                                                        <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
                                                    </Button>
                                                    <Button size="sm" variant="outline" disabled={acting === v.id} onClick={() => act(v.id, "rejected")} className="border-rose-200 text-rose-600 hover:bg-rose-50 justify-center">
                                                        <XCircle className="h-4 w-4 mr-1" /> Reject
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div>
                                                    <span className={`text-[10px] font-black uppercase ${v.status === "approved" ? "text-emerald-600" : "text-rose-600"}`}>{v.status}</span>
                                                    {v.status === "rejected" && v.rejectionReason && <p className="text-xs text-rose-600 mt-1 max-w-[200px] ml-auto">{v.rejectionReason}</p>}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} itemsPerPage={PAGE_SIZE} totalItems={vehicles.length} type="vehicles" />
                </div>
            )}
        </div>
    );
}
