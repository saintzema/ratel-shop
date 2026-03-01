"use client";

import { useState, useEffect } from "react";
import { Search, Filter, MoreVertical, CheckCircle2, XCircle, Clock, Wallet, ArrowUpRight } from "lucide-react";
import { DemoStore } from "@/lib/demo-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export default function PayoutRequestsDirectory() {
    const [searchTerm, setSearchTerm] = useState("");
    const [view, setView] = useState<"all" | "processing" | "completed">("all");
    const [payouts, setPayouts] = useState<any[]>([]);

    useEffect(() => {
        const load = () => {
            setPayouts(DemoStore.getPayouts().sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
        };
        load();
        window.addEventListener("storage", load);
        return () => window.removeEventListener("storage", load);
    }, []);

    const filtered = payouts.filter(p => {
        const matchesSearch = p.seller_name.toLowerCase().includes(searchTerm.toLowerCase()) || p.id.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesView = view === "all" || p.status === view;
        return matchesSearch && matchesView;
    });

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-black text-gray-900 tracking-tight">Payout Requests</h2>
                    <p className="text-sm text-gray-500 font-bold uppercase tracking-wider mt-1">Review and disburse seller earnings</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="bg-white p-1.5 rounded-2xl border border-gray-100 flex gap-1 shadow-sm">
                        {(["all", "processing", "completed"] as const).map((v) => (
                            <button
                                key={v}
                                onClick={() => setView(v)}
                                className={cn(
                                    "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                                    view === v
                                        ? "bg-indigo-600 text-white shadow-lg"
                                        : "text-gray-400 hover:text-gray-600"
                                )}
                            >
                                {v}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1 shadow-sm">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                        placeholder="Search by seller name or payout ID..."
                        className="pl-12 h-14 bg-white border-gray-100 rounded-[20px] text-sm font-medium"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Button className="h-14 px-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[20px] font-black uppercase tracking-widest text-xs shadow-lg shadow-indigo-500/20">
                    <Filter className="mr-2 h-4 w-4" /> Filter
                </Button>
            </div>

            <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50/50">
                            <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Transaction</th>
                            <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Seller Info</th>
                            <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Destination</th>
                            <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Status</th>
                            <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {filtered.map((p) => (
                            <tr key={p.id} className="group hover:bg-gray-50/50 transition-colors">
                                <td className="px-8 py-6">
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "h-10 w-10 rounded-xl flex items-center justify-center font-black shadow-sm",
                                            p.status === "completed" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                                        )}>
                                            <Wallet className="h-4 w-4" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-black text-gray-900 text-sm">₦{p.amount.toLocaleString()}</span>
                                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{p.id} • {p.order_ids?.length || 0} Orders</span>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-8 py-6">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-gray-900 text-sm">{p.seller_name}</span>
                                        <span className="text-[10px] text-gray-400 font-bold tracking-widest uppercase">ID: {p.seller_id.toUpperCase()}</span>
                                    </div>
                                </td>
                                <td className="px-8 py-6">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-gray-900 text-sm">{p.bank}</span>
                                        <span className="text-[11px] text-gray-500 font-bold">{p.method} •••• {p.account_last4}</span>
                                    </div>
                                </td>
                                <td className="px-8 py-6">
                                    <div className="flex items-center gap-2">
                                        <span className={cn(
                                            "text-[9px] font-black uppercase px-2 py-1 rounded-full flex items-center gap-1",
                                            p.status === "completed" ? "bg-emerald-100 text-emerald-700" :
                                                p.status === "processing" ? "bg-amber-100 text-amber-700" :
                                                    "bg-rose-100 text-rose-700"
                                        )}>
                                            {p.status === "completed" && <CheckCircle2 className="h-3 w-3" />}
                                            {p.status === "processing" && <Clock className="h-3 w-3" />}
                                            {p.status}
                                        </span>
                                        <span className="text-[10px] font-bold text-gray-400 ml-2">
                                            {new Date(p.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-8 py-6 text-right">
                                    {p.status === "processing" ? (
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button
                                                size="sm"
                                                className="h-8 rounded-xl bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-600 font-bold text-[10px] uppercase tracking-wider transition-all"
                                                onClick={() => {
                                                    DemoStore.updatePayoutStatus(p.id, "completed");
                                                    window.dispatchEvent(new Event("storage"));
                                                }}
                                            >
                                                <CheckCircle2 className="mr-1 h-3 w-3" /> Mark Paid
                                            </Button>
                                        </div>
                                    ) : (
                                        <Button size="icon" variant="ghost" className="h-10 w-10 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors opacity-0 group-hover:opacity-100">
                                            <MoreVertical className="h-4 w-4 text-gray-400" />
                                        </Button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {filtered.length === 0 && (
                    <div className="py-20 text-center">
                        <div className="h-16 w-16 bg-gray-50 rounded-3xl flex items-center justify-center mx-auto mb-4">
                            <Wallet className="h-8 w-8 text-gray-300" />
                        </div>
                        <h3 className="text-lg font-black text-gray-900 mt-1">No payout requests</h3>
                        <p className="text-sm text-gray-400 font-bold uppercase tracking-wider mt-1">Sellers have not requested cashouts matching this criteria</p>
                    </div>
                )}
            </div>
        </div>
    );
}
