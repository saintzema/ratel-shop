"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { QrCode, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn, formatPrice } from "@/lib/utils";
import { Pagination } from "@/components/ui/Pagination";

type QrPaymentRow = {
    id: string;
    name: string;
    seller_id: string;
    seller_name: string;
    price: number;
    created_at: string;
    times_used: number;
    successful_payments: number;
    total_collected: number;
    payout_status: string;
};

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
    paid_out: { label: "Paid Out", className: "bg-emerald-100 text-emerald-700" },
    pending_payout: { label: "Pending Payout", className: "bg-amber-100 text-amber-700" },
    awaiting_delivery_confirmation: { label: "Awaiting Confirmation", className: "bg-blue-100 text-blue-700" },
    no_orders_yet: { label: "No Orders Yet", className: "bg-gray-100 text-gray-500" },
};

export default function QrPaymentsDirectory() {
    const [rows, setRows] = useState<QrPaymentRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [authError, setAuthError] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 25;

    useEffect(() => {
        const load = async () => {
            try {
                const token = typeof window !== "undefined" ? localStorage.getItem("fp_token") : null;
                const res = await fetch("/api/admin/qr-payments", {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                });
                if (res.status === 401) {
                    setAuthError(true);
                    return;
                }
                if (!res.ok) return;
                const data = await res.json();
                if (Array.isArray(data)) setRows(data);
            } catch { /* best-effort */ }
            finally { setLoading(false); }
        };
        load();
    }, []);

    const filtered = rows.filter(r =>
        (r.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.seller_name || "").toLowerCase().includes(searchTerm.toLowerCase())
    );
    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <h2 className="text-3xl font-black text-gray-900 tracking-tight">QR Payments</h2>
                        <span className="bg-indigo-100 text-indigo-700 text-sm font-black px-3 py-1 rounded-full">{filtered.length}</span>
                    </div>
                    <p className="text-sm text-gray-500 font-bold uppercase tracking-wider mt-1">
                        Seller-generated QR/direct-payment codes — usage & payout tracking
                    </p>
                </div>
            </div>

            {authError && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-sm font-semibold">
                    Session expired or unauthorized — please log in again to view QR payment data.
                </div>
            )}

            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                    placeholder="Search by label or seller..."
                    className="pl-12 h-14 bg-white border border-gray-100 rounded-[20px] text-sm font-medium shadow-sm focus-visible:ring-indigo-500"
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                />
            </div>

            <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-100 bg-gray-50/50">
                                <th className="text-left px-6 py-4 font-black uppercase tracking-widest text-[10px] text-gray-400">QR / Label</th>
                                <th className="text-left px-6 py-4 font-black uppercase tracking-widest text-[10px] text-gray-400">Seller</th>
                                <th className="text-left px-6 py-4 font-black uppercase tracking-widest text-[10px] text-gray-400">Amount</th>
                                <th className="text-left px-6 py-4 font-black uppercase tracking-widest text-[10px] text-gray-400">Times Used</th>
                                <th className="text-left px-6 py-4 font-black uppercase tracking-widest text-[10px] text-gray-400">Successful Payments</th>
                                <th className="text-left px-6 py-4 font-black uppercase tracking-widest text-[10px] text-gray-400">Total Collected</th>
                                <th className="text-left px-6 py-4 font-black uppercase tracking-widest text-[10px] text-gray-400">Payout Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={7} className="px-6 py-10 text-center text-gray-400 font-semibold">Loading...</td></tr>
                            ) : paginated.length === 0 ? (
                                <tr><td colSpan={7} className="px-6 py-10 text-center text-gray-400 font-semibold">No QR payments yet.</td></tr>
                            ) : paginated.map((r) => {
                                const status = STATUS_LABEL[r.payout_status] || STATUS_LABEL.no_orders_yet;
                                return (
                                    <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-gray-900 max-w-[220px] truncate">{r.name}</div>
                                            <div className="text-[10px] text-gray-400 font-mono truncate max-w-[220px]">{r.id}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <Link href={`/admin/users/${r.seller_id}`} className="font-semibold text-indigo-600 hover:underline">
                                                {r.seller_name || r.seller_id}
                                            </Link>
                                        </td>
                                        <td className="px-6 py-4 font-bold text-gray-900">{formatPrice(r.price)}</td>
                                        <td className="px-6 py-4 font-semibold text-gray-700">{r.times_used}</td>
                                        <td className="px-6 py-4 font-semibold text-gray-700">{r.successful_payments}</td>
                                        <td className="px-6 py-4 font-bold text-emerald-700">{formatPrice(r.total_collected)}</td>
                                        <td className="px-6 py-4">
                                            <span className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider", status.className)}>
                                                {status.label}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {totalPages > 1 && (
                <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
            )}
        </div>
    );
}
