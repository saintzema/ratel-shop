"use client";

import { useEffect, useState } from "react";
import {
    Tag,
    Plus,
    Link as LinkIcon,
    Percent,
    Banknote,
    Clock,
    MoreHorizontal,
    Edit,
    Trash,
    BarChart,
    X,
    CheckCircle2,
    Calendar,
    Hash
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { DemoStore } from "@/lib/demo-store";
import { cn } from "@/lib/utils";

export default function DiscountsPage() {
    const [discounts, setDiscounts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newDiscount, setNewDiscount] = useState({
        code: "",
        type: "Percentage",
        value: "",
        usageLimit: "",
        expiry: ""
    });
    const [copySuccess, setCopySuccess] = useState<string | null>(null);

    const loadDiscounts = async () => {
        const sellerId = DemoStore.getCurrentSellerId();
        if (!sellerId) return;

        setLoading(true);
        try {
            const res = await fetch(`/api/discounts?seller_id=${sellerId}`);
            if (res.ok) {
                setDiscounts(await res.json());
            }
        } catch (error) {
            console.error("Failed to load discounts:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDiscounts();
    }, []);

    const handleCopy = (code: string) => {
        navigator.clipboard.writeText(code);
        setCopySuccess(code);
        setTimeout(() => setCopySuccess(null), 2000);
    };

    const handleCreate = async () => {
        if (!newDiscount.code || !newDiscount.value) return;
        const sellerId = DemoStore.getCurrentSellerId();
        if (!sellerId) return;

        try {
            const res = await fetch("/api/discounts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...newDiscount,
                    sellerId
                }),
            });

            if (res.ok) {
                setIsCreateOpen(false);
                setNewDiscount({
                    code: "",
                    type: "Percentage",
                    value: "",
                    usageLimit: "",
                    expiry: ""
                });
                loadDiscounts();
            }
        } catch (error) {
            console.error("Failed to create discount:", error);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            const res = await fetch(`/api/discounts/${id}`, { method: "DELETE" });
            if (res.ok) {
                loadDiscounts();
            }
        } catch (error) {
            console.error("Delete failed:", error);
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-24 p-4 sm:p-6 lg:p-8">
            {/* Liquid Glass Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/40 backdrop-blur-xl p-8 rounded-[32px] border border-white/60 shadow-lg">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Tag className="h-4 w-4 text-brand-green-500" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Campaign Management</span>
                    </div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Discounts & Coupons</h1>
                    <p className="text-sm text-gray-500 font-medium mt-1">Boost performance with tactical promotional codes.</p>
                </div>
                <Button
                    onClick={() => setIsCreateOpen(true)}
                    className="rounded-[18px] bg-gray-900 hover:bg-black text-white font-black uppercase tracking-widest text-xs h-14 px-8 shadow-xl transition-all hover:scale-105 active:scale-95"
                >
                    <Plus className="h-4 w-4 mr-2" /> Launch New Promo
                </Button>
            </div>

            {/* Strategy Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {[
                    { title: "Revenue Scaler", desc: "Percentage-based growth", icon: Percent, color: "bg-indigo-50 text-indigo-600" },
                    { title: "Volume Booster", desc: "Fixed value reduction", icon: Banknote, color: "bg-emerald-50 text-emerald-600" },
                    { title: "Loyalty Bond", desc: "Free shipping rewards", icon: Tag, color: "bg-blue-50 text-blue-600" }
                ].map((strat, i) => (
                    <div key={i} className="bg-white/70 backdrop-blur-2xl rounded-[28px] border border-white/60 p-6 shadow-sm hover:shadow-xl transition-all cursor-pointer group">
                        <div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center mb-6 group-hover:rotate-6 transition-transform shadow-inner", strat.color)}>
                            <strat.icon className="h-6 w-6" />
                        </div>
                        <h3 className="font-black text-gray-900 mb-1 text-sm tracking-tight">{strat.title}</h3>
                        <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">{strat.desc}</p>
                    </div>
                ))}
            </div>

            {/* Desktop Table: Translucent Layer */}
            <div className="bg-white/60 backdrop-blur-2xl rounded-[40px] border border-white/80 shadow-2xl overflow-hidden">
                <div className="p-8 border-b border-gray-100/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <h2 className="font-black text-gray-900 text-lg tracking-tight">Active Pulse Registry</h2>
                    <div className="flex bg-gray-200/50 p-1 rounded-2xl gap-1">
                        {["All", "Active", "Scheduled"].map((f) => (
                            <Button key={f} variant="ghost" className="h-9 px-4 rounded-[14px] text-[10px] font-black uppercase text-gray-400 hover:text-gray-900 transition-all">
                                {f}
                            </Button>
                        ))}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50/30 text-left">
                                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-[10px]">Identifier</th>
                                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-[10px]">Status</th>
                                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-[10px]">Magnitude</th>
                                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-[10px]">Utilization</th>
                                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right text-[10px]">Ops</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100/50">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="py-20 text-center">
                                        <div className="h-10 w-10 border-4 border-gray-900 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Syncing Matrix...</p>
                                    </td>
                                </tr>
                            ) : discounts.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-24 text-center">
                                        <Tag className="h-12 w-12 text-gray-200 mx-auto mb-4" />
                                        <p className="text-[11px] font-black uppercase tracking-widest text-gray-400">No codes detected in this terminal.</p>
                                    </td>
                                </tr>
                            ) : discounts.map((discount) => (
                                <tr key={discount.id} className="hover:bg-white/40 transition-colors group">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 px-4 flex items-center bg-white shadow-sm border border-gray-100 rounded-xl font-black text-gray-900 tracking-widest text-xs uppercase">
                                                {discount.code}
                                            </div>
                                            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-white/80 transition-all" onClick={() => handleCopy(discount.code)}>
                                                {copySuccess === discount.code ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <LinkIcon className="h-4 w-4 text-gray-400" />}
                                            </Button>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className={cn(
                                            "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest",
                                            discount.status === 'active' ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"
                                        )}>
                                            {discount.status === 'active' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                                            {discount.status}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <p className="text-sm font-black text-gray-900">{discount.type === 'percentage' ? `${discount.value}%` : `₦${discount.value.toLocaleString()}`}</p>
                                        <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest opacity-70">{discount.type}</p>
                                    </td>
                                    <td className="px-8 py-6">
                                        <p className="text-sm font-black text-gray-700">{discount.usageCount} / {discount.usageLimit || '∞'}</p>
                                        <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest opacity-70">
                                            {discount.expiry ? `Expires ${new Date(discount.expiry).toLocaleDateString()}` : 'Indefinite Validity'}
                                        </p>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-white group-hover:shadow-sm">
                                                    <MoreHorizontal className="h-5 w-5 text-gray-400" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-48 bg-white/90 backdrop-blur-md border border-white/60 shadow-2xl rounded-2xl p-2 animate-in fade-in zoom-in-95">
                                                <DropdownMenuItem onClick={() => handleDelete(discount.id)} className="flex items-center gap-3 cursor-pointer rounded-xl hover:bg-rose-50 p-3 font-black text-[10px] uppercase tracking-widest text-rose-600 focus:text-rose-600 focus:bg-rose-50 transition-colors">
                                                    <Trash className="h-4 w-4" /> Termination Sequence
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ─── Mobile Card View ─── */}
            <div className="md:hidden divide-y divide-white/20">
                {loading ? (
                    <div className="py-20 text-center">
                        <div className="h-8 w-8 border-4 border-gray-900 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Syncing Matrix...</p>
                    </div>
                ) : discounts.length === 0 ? (
                    <div className="py-24 text-center">
                        <Tag className="h-10 w-10 text-gray-200 mx-auto mb-4" />
                        <p className="text-[11px] font-black uppercase tracking-widest text-gray-400 font-bold px-10">Zero Active Campaigns</p>
                    </div>
                ) : discounts.map((discount) => (
                    <div key={discount.id} className="p-6 transition-colors hover:bg-white/40">
                        <div className="flex items-center justify-between mb-4">
                            <div className="h-10 px-4 flex items-center bg-white shadow-sm border border-gray-100 rounded-xl font-black text-gray-900 tracking-widest text-xs uppercase">
                                {discount.code}
                            </div>
                            <div className={cn(
                                "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest",
                                discount.status === 'active' ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"
                            )}>
                                {discount.status}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="bg-white/40 p-3 rounded-2xl border border-white/60 shadow-inner">
                                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Magnitude</p>
                                <p className="text-sm font-black text-gray-900">{discount.type === 'percentage' ? `${discount.value}%` : `₦${discount.value.toLocaleString()}`}</p>
                            </div>
                            <div className="bg-white/40 p-3 rounded-2xl border border-white/60 shadow-inner">
                                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Utilization</p>
                                <p className="text-sm font-black text-gray-900">{discount.usageCount} / {discount.usageLimit || '∞'}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button variant="ghost" className="flex-1 h-12 rounded-2xl bg-white border border-gray-100 shadow-sm text-[10px] font-black uppercase tracking-widest text-gray-400" onClick={() => handleCopy(discount.code)}>
                                Copy Code
                            </Button>
                            <Button variant="ghost" className="h-12 w-12 rounded-2xl bg-rose-50 border border-rose-100 text-rose-500" onClick={() => handleDelete(discount.id)}>
                                <Trash className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                ))
                }
            </div>

            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="sm:max-w-[500px] rounded-[40px] p-0 overflow-hidden border-none shadow-2xl bg-white/80 backdrop-blur-3xl">
                    <DialogHeader className="p-10 pb-6 bg-gray-50/50 border-b border-gray-100/50">
                        <div className="h-12 w-12 bg-gray-900 rounded-2xl flex items-center justify-center mb-4 shadow-xl">
                            <Plus className="h-6 w-6 text-white" />
                        </div>
                        <DialogTitle className="text-3xl font-black text-gray-900 tracking-tight">Evolve Strategy</DialogTitle>
                        <DialogDescription className="font-bold text-gray-400 uppercase tracking-widest text-[10px] mt-1">Configure your promotional nexus.</DialogDescription>
                    </DialogHeader>

                    <div className="p-10 space-y-8">
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 pl-1">Unique Identifier</Label>
                            <div className="relative">
                                <Hash className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
                                <Input
                                    placeholder="e.g. ULTIMATE100"
                                    className="h-14 pl-12 rounded-2xl border-white bg-white/60 font-black tracking-widest uppercase focus:bg-white transition-all shadow-inner"
                                    value={newDiscount.code}
                                    onChange={(e) => setNewDiscount({ ...newDiscount, code: e.target.value.toUpperCase() })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 pl-1">Strategy Type</Label>
                                <select
                                    className="w-full h-14 bg-white/60 border border-white rounded-2xl px-5 text-xs font-black uppercase tracking-widest focus:bg-white outline-none transition-all shadow-inner cursor-pointer"
                                    value={newDiscount.type}
                                    onChange={(e) => setNewDiscount({ ...newDiscount, type: e.target.value })}
                                >
                                    <option value="Percentage">Percentage Scaling</option>
                                    <option value="Fixed">Fixed Reduction</option>
                                    <option value="Shipping">Free Delivery</option>
                                </select>
                            </div>
                            <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 pl-1">Magnitude</Label>
                                <Input
                                    placeholder={newDiscount.type === "Percentage" ? "20" : "5000"}
                                    className="h-14 rounded-2xl border-white bg-white/60 font-black focus:bg-white transition-all shadow-inner"
                                    value={newDiscount.value}
                                    onChange={(e) => setNewDiscount({ ...newDiscount, value: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 pl-1">Utilization Limit</Label>
                                <Input
                                    placeholder="∞"
                                    className="h-14 rounded-2xl border-white bg-white/60 font-black focus:bg-white transition-all shadow-inner"
                                    value={newDiscount.usageLimit}
                                    onChange={(e) => setNewDiscount({ ...newDiscount, usageLimit: e.target.value })}
                                />
                            </div>
                            <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 pl-1">Expiration Phase</Label>
                                <div className="relative">
                                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
                                    <Input
                                        type="date"
                                        className="h-14 pl-12 rounded-2xl border-white bg-white/60 font-black focus:bg-white transition-all shadow-inner"
                                        onChange={(e) => setNewDiscount({ ...newDiscount, expiry: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="p-10 pt-0 flex gap-4">
                        <Button
                            variant="ghost"
                            className="flex-1 h-16 rounded-[24px] font-black uppercase tracking-widest text-[10px] text-gray-400 hover:text-gray-900"
                            onClick={() => setIsCreateOpen(false)}
                        >
                            Abort
                        </Button>
                        <Button
                            className="flex-1 h-16 rounded-[24px] bg-gray-900 hover:bg-black text-white font-black uppercase tracking-widest text-[10px] shadow-2xl shadow-gray-200 transition-all hover:scale-[1.02] active:scale-[0.98]"
                            onClick={handleCreate}
                        >
                            Authorize Deployment
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
