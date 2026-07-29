"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";
import { Plus, FileText } from "lucide-react";

export default function SellerQuotesListPage() {
    const [quotes, setQuotes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = typeof window !== "undefined" ? localStorage.getItem("fp_token") : null;
        fetch("/api/seller/quotes", { headers: token ? { Authorization: `Bearer ${token}` } : {} })
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
        <div className="max-w-3xl mx-auto py-8 px-4 space-y-6 pb-24">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-black text-gray-900">Quotes & Invoices</h1>
                <Link href="/seller/quotes/new">
                    <Button className="rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-11 px-5">
                        <Plus className="h-4 w-4 mr-1.5" /> New Quote
                    </Button>
                </Link>
            </div>

            {loading ? (
                <div className="text-center py-16 text-gray-400 animate-pulse">Loading...</div>
            ) : quotes.length === 0 ? (
                <div className="text-center py-16 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                    <FileText className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                    <h3 className="font-bold text-gray-700 mb-1">No quotes yet</h3>
                    <p className="text-sm text-gray-500">Create one and send it to a client in minutes.</p>
                </div>
            ) : (
                <div className="space-y-2.5">
                    {quotes.map((q) => (
                        <Link key={q.id} href={`/seller/quotes/${q.id}`} className="block p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-bold text-gray-900 text-sm">{q.title}</p>
                                    <p className="text-xs text-gray-500">{q.clientName} · {formatPrice(q.total)}</p>
                                </div>
                                <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${statusBadge[q.status] || statusBadge.draft}`}>
                                    {q.status.replace("_", " ")}
                                </span>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
