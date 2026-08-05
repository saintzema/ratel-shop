"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatPrice, formatDateExact } from "@/lib/utils";

export default function AdminQuotesPage() {
    const [quotes, setQuotes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = typeof window !== "undefined" ? localStorage.getItem("fp_token") : null;
        fetch("/api/admin/quotes", { headers: token ? { Authorization: `Bearer ${token}` } : {} })
            .then(r => r.ok ? r.json() : { quotes: [] })
            .then(d => setQuotes(d.quotes || []))
            .finally(() => setLoading(false));
    }, []);

    const statusBadge: Record<string, string> = {
        draft: "bg-gray-100 text-gray-600",
        sent: "bg-blue-100 text-blue-700",
        deposit_paid: "bg-amber-100 text-amber-700",
        paid: "bg-emerald-100 text-emerald-700",
        cancelled: "bg-rose-100 text-rose-700",
    };

    return (
        <div className="max-w-5xl mx-auto py-8 space-y-6">
            <div>
                <h1 className="text-2xl font-black text-gray-900">Seller Quotes & Invoices</h1>
                <p className="text-sm text-gray-500 mt-1">Platform-wide oversight — {quotes.length} most recent</p>
            </div>

            {loading ? (
                <div className="text-center py-16 text-gray-400 animate-pulse">Loading...</div>
            ) : quotes.length === 0 ? (
                <div className="text-center py-16 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 text-gray-500">
                    No quotes created yet.
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="text-left px-4 py-3 font-bold text-gray-600 text-xs uppercase">Seller</th>
                                <th className="text-left px-4 py-3 font-bold text-gray-600 text-xs uppercase">Quote</th>
                                <th className="text-left px-4 py-3 font-bold text-gray-600 text-xs uppercase">Client</th>
                                <th className="text-right px-4 py-3 font-bold text-gray-600 text-xs uppercase">Total</th>
                                <th className="text-right px-4 py-3 font-bold text-gray-600 text-xs uppercase">Paid</th>
                                <th className="text-center px-4 py-3 font-bold text-gray-600 text-xs uppercase">Status</th>
                                <th className="text-right px-4 py-3 font-bold text-gray-600 text-xs uppercase">Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {quotes.map((q) => (
                                <tr key={q.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3">
                                        <Link href={`/admin/users/${q.seller.id}`} className="font-medium text-indigo-600 hover:underline">{q.seller.businessName}</Link>
                                    </td>
                                    <td className="px-4 py-3">
                                        <Link href={`/quote/${q.id}`} target="_blank" className="text-gray-900 hover:underline">{q.title}</Link>
                                    </td>
                                    <td className="px-4 py-3 text-gray-600">{q.clientName}</td>
                                    <td className="px-4 py-3 text-right font-bold text-gray-900">{formatPrice(q.total)}</td>
                                    <td className="px-4 py-3 text-right text-gray-600">{formatPrice(q.amountPaid)}</td>
                                    <td className="px-4 py-3 text-center">
                                        <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-full ${statusBadge[q.status] || statusBadge.draft}`}>
                                            {q.status.replace("_", " ")}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right text-gray-500 text-xs">{formatDateExact(q.createdAt)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                </div>
            )}
        </div>
    );
}
