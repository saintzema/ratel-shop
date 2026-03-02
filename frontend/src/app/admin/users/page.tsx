"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
    Search,
    Filter,
    MoreVertical,
    Shield,
    ShieldOff,
    Ban,
    CheckCircle2,
    ExternalLink,
    Mail,
    MapPin,
    Calendar,
    ShoppingBag,
    Star
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { DemoStore } from "@/lib/demo-store";

export default function UserDirectory() {
    const [searchTerm, setSearchTerm] = useState("");
    const [view, setView] = useState<"all" | "sellers" | "buyers">("all");
    const [participants, setParticipants] = useState<any[]>([]);

    // Commission Edit State
    const [editingCommissionSeller, setEditingCommissionSeller] = useState<any | null>(null);
    const [commissionInput, setCommissionInput] = useState("");

    useEffect(() => {
        const load = () => {
            const sellers = DemoStore.getSellers().map(s => ({ ...s, role: "seller" }));
            // Simulation: generate sample buyers from orders
            const orders = DemoStore.getOrders();
            const uniqueBuyerIds = Array.from(new Set(orders.map(o => o.customer_id)));
            const buyers = uniqueBuyerIds.map(id => ({
                id,
                business_name: id === "u1" ? "Tunde B." : "Anonymous Buyer",
                role: "buyer",
                status: "active",
                created_at: "2024-01-10T10:00:00Z",
                category: "Retail",
                trust_score: 95
            }));

            setParticipants([...sellers, ...buyers]);
        };
        load();
        window.addEventListener("storage", load);
        return () => window.removeEventListener("storage", load);
    }, []);

    const filtered = participants.filter(p => {
        const matchesSearch = p.business_name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesView = view === "all" || (view === "sellers" && p.role === "seller") || (view === "buyers" && p.role === "buyer");
        return matchesSearch && matchesView;
    });

    const handleSaveCommission = () => {
        if (!editingCommissionSeller) return;

        const rate = parseFloat(commissionInput) / 100;
        if (!isNaN(rate)) {
            DemoStore.updateSeller(editingCommissionSeller.id, { commission_rate: rate });

            // Update local state to reflect change immediately
            setParticipants(prev => prev.map(p =>
                p.id === editingCommissionSeller.id
                    ? { ...p, commission_rate: rate }
                    : p
            ));
        }

        setEditingCommissionSeller(null);
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-black text-gray-900 tracking-tight">Participant Directory</h2>
                    <p className="text-sm text-gray-500 font-bold uppercase tracking-wider mt-1">Manage platform-wide user accounts</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="bg-white p-1.5 rounded-2xl border border-gray-100 flex gap-1">
                        {(["all", "sellers", "buyers"] as const).map((v) => (
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
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                        placeholder="Search by name, ID, or business..."
                        className="pl-12 h-14 bg-white border-gray-100 rounded-[20px] text-sm font-medium shadow-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Button className="h-14 px-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[20px] font-black uppercase tracking-widest text-xs shadow-lg shadow-indigo-500/20">
                    <Filter className="mr-2 h-4 w-4" /> Advanced Filter
                </Button>
            </div>

            <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50/50">
                            <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Participant</th>
                            <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Role & Status</th>
                            <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Market Health</th>
                            <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Join Date</th>
                            <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {filtered.map((p) => (
                            <tr key={p.id} className="group hover:bg-gray-50/50 transition-colors">
                                <td className="px-8 py-6">
                                    <div className="flex items-center gap-4">
                                        <div className={cn(
                                            "h-12 w-12 rounded-2xl flex items-center justify-center font-black text-lg shadow-sm border border-white/10",
                                            p.role === "seller" ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"
                                        )}>
                                            {p.business_name.charAt(0)}
                                        </div>
                                        <div>
                                            <Link href={`/admin/users/${p.id}`} className="font-bold text-gray-900 text-[15px] hover:text-indigo-600 hover:underline block">{p.business_name}</Link>
                                            <p className="text-[11px] text-gray-400 font-bold">ID: {p.id.toUpperCase()}</p>
                                            {p.role === "seller" && p.business_registered && (
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-[10px] font-bold bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                                                        RC: {p.cac_rc_number}
                                                    </span>
                                                    {p.cac_document_url && (
                                                        <a href={p.cac_document_url} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                                                            <ExternalLink className="h-3 w-3" /> View CAC
                                                        </a>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-8 py-6">
                                    <div className="flex flex-col gap-1.5">
                                        <div className="flex items-center gap-2">
                                            <span className={cn(
                                                "text-[9px] font-black uppercase px-2 py-0.5 rounded-full",
                                                p.role === "seller" ? "bg-indigo-100 text-indigo-700" : "bg-zinc-100 text-zinc-700"
                                            )}>
                                                {p.role}
                                            </span>
                                            {p.verified && (
                                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <div className={cn(
                                                "w-2 h-2 rounded-full",
                                                p.status === "active" ? "bg-emerald-500" : "bg-rose-500"
                                            )} />
                                            <span className="text-[11px] text-gray-500 font-bold capitalize">{p.status}</span>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-8 py-6">
                                    <div className="flex items-center gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-1 mb-1">
                                                <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                                                <span className="text-xs font-black text-gray-900">{p.trust_score || 90}</span>
                                            </div>
                                            <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                <div
                                                    className={cn(
                                                        "h-full rounded-full transition-all",
                                                        (p.trust_score || 90) > 80 ? "bg-emerald-500" : (p.trust_score || 90) > 50 ? "bg-amber-500" : "bg-rose-500"
                                                    )}
                                                    style={{ width: `${p.trust_score || 90}%` }}
                                                />
                                            </div>
                                        </div>
                                        {p.role === "seller" && (
                                            <div className="pl-4 border-l border-gray-100 min-w-16">
                                                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Plan: {p.subscription_plan || "Starter"}</p>
                                                <p className="text-xs font-black text-emerald-600">Fee: {DemoStore.getSellerCommissionRate(p) * 100}%</p>
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="px-8 py-6 text-sm font-bold text-gray-500">
                                    {new Date(p.created_at).toLocaleDateString()}
                                </td>
                                <td className="px-8 py-6 text-right">
                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button size="icon" variant="ghost" className="h-10 w-10 rounded-xl bg-gray-50 hover:bg-indigo-50 hover:text-indigo-600 transition-colors">
                                            <Mail className="h-4 w-4" />
                                        </Button>
                                        {p.role === "seller" && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-10 rounded-xl bg-white border-gray-200 text-gray-700 hover:bg-gray-50 font-bold text-xs px-3 shadow-sm"
                                                onClick={() => {
                                                    setEditingCommissionSeller(p);
                                                    setCommissionInput((DemoStore.getSellerCommissionRate(p) * 100).toString());
                                                }}
                                            >
                                                Edit Fee
                                            </Button>
                                        )}
                                        <Button size="icon" variant="ghost" className="h-10 w-10 rounded-xl bg-gray-50 hover:bg-rose-50 hover:text-rose-600 transition-colors">
                                            <Ban className="h-4 w-4" />
                                        </Button>
                                        <Button size="icon" variant="ghost" className="h-10 w-10 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                                            <MoreVertical className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {filtered.length === 0 && (
                    <div className="py-20 text-center">
                        <div className="h-16 w-16 bg-gray-50 rounded-3xl flex items-center justify-center mx-auto mb-4">
                            <Search className="h-8 w-8 text-gray-300" />
                        </div>
                        <h3 className="text-lg font-black text-gray-900 mt-1">No participants found</h3>
                        <p className="text-sm text-gray-400 font-bold uppercase tracking-wider mt-1">Try adjusting your filters or search term</p>
                    </div>
                )}
            </div>

            {/* Commission Edit Dialog */}
            <Dialog open={!!editingCommissionSeller} onOpenChange={(open) => !open && setEditingCommissionSeller(null)}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="font-black text-gray-900">Platform Service Charge Override</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4 mt-2">
                        <div className="grid gap-2">
                            <Label htmlFor="commission" className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                                Custom Commission Rate (%)
                            </Label>
                            <Input
                                id="commission"
                                type="number"
                                step="0.1"
                                min="0"
                                max="100"
                                value={commissionInput}
                                onChange={(e) => setCommissionInput(e.target.value)}
                                className="h-12 border-gray-200 rounded-xl font-medium"
                                placeholder="e.g. 1.5"
                            />
                            <p className="text-xs font-medium text-gray-500 mt-1">
                                Enter the percentage the platform will take from {editingCommissionSeller?.business_name}'s released escrows. This overrides default Subscription Plan rates.
                            </p>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 mt-4">
                        <Button variant="outline" className="h-12 px-6 rounded-xl font-bold bg-white" onClick={() => setEditingCommissionSeller(null)}>Cancel</Button>
                        <Button className="h-12 px-6 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white" onClick={handleSaveCommission}>Save Rate</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
