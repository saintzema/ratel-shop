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
    Hash,
    Eye,
    User,
    Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogTrigger
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { DataSyncService } from "@/lib/sync-store";
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
    const [createError, setCreateError] = useState<string | null>(null);

    const authHeaders = (): Record<string, string> => {
        const token = typeof window !== "undefined" ? localStorage.getItem("fp_token") : null;
        const h: Record<string, string> = { "Content-Type": "application/json" };
        if (token) h["Authorization"] = `Bearer ${token}`;
        return h;
    };

    const loadDiscounts = async () => {
        const sellerId = DataSyncService.getCurrentSellerId();
        if (!sellerId) return;

        setLoading(true);
        try {
            const res = await fetch(`/api/discounts?seller_id=${sellerId}`, { headers: authHeaders() });
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

    const handleCopy = async (code: string) => {
        const { copyToClipboard } = await import("@/lib/utils");
        const success = await copyToClipboard(code);
        if (success) {
            setCopySuccess(code);
            setTimeout(() => setCopySuccess(null), 2000);
        }
    };

    const handleCreate = async () => {
        if (!newDiscount.code || !newDiscount.value) {
            setCreateError("Promo code and value are required.");
            return;
        }
        const sellerId = DataSyncService.getCurrentSellerId();
        if (!sellerId) {
            setCreateError("You must be logged in as a seller to create promo codes.");
            return;
        }

        setCreateError(null);
        try {
            const res = await fetch("/api/discounts", {
                method: "POST",
                headers: authHeaders(),
                body: JSON.stringify({ ...newDiscount, sellerId }),
            });

            const data = await res.json();

            if (!res.ok) {
                setCreateError(data.error || `Error ${res.status}: Could not create promo code.`);
                return;
            }

            // Track discount created
            if (typeof window !== "undefined" && (window as any).pendo) {
                (window as any).pendo.track("discount_created", {
                    discount_code: newDiscount.code,
                    discount_type: newDiscount.type,
                    discount_value: newDiscount.value,
                    usage_limit: newDiscount.usageLimit || "",
                    expiry_date: newDiscount.expiry || "",
                });
            }

            setIsCreateOpen(false);
            setNewDiscount({ code: "", type: "Percentage", value: "", usageLimit: "", expiry: "" });
            loadDiscounts();
        } catch (error) {
            console.error("Failed to create discount:", error);
            setCreateError("Network error. Please check your connection and try again.");
        }
    };

    const handleDelete = async (id: string) => {
        try {
            const res = await fetch(`/api/discounts/${id}`, {
                method: "DELETE",
                headers: authHeaders(),
            });
            if (res.ok) loadDiscounts();
        } catch (error) {
            console.error("Delete failed:", error);
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-24 p-4 sm:p-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/40 backdrop-blur-xl p-4 sm:p-6 rounded-2xl border border-white/60 shadow-lg">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Tag className="h-4 w-4 text-brand-green-500" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Campaign Management</span>
                    </div>
                    <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">Discounts & Coupons</h1>
                    <p className="text-xs sm:text-sm text-gray-500 font-medium mt-0.5">Boost performance with promotional codes.</p>
                </div>
                <Button
                    onClick={() => { setCreateError(null); setIsCreateOpen(true); }}
                    className="rounded-xl bg-gray-900 hover:bg-black text-white font-black uppercase tracking-widest text-xs h-10 sm:h-11 px-5 shadow-xl transition-all hover:scale-105 active:scale-95 w-full sm:w-auto"
                >
                    <Plus className="h-4 w-4 mr-2" /> Launch New Promo
                </Button>
            </div>

            {/* Strategy Grid */}
            <div className="grid grid-cols-3 gap-3 sm:gap-4">
                {[
                    { title: "Revenue Scaler", desc: "Percentage-based", icon: Percent, color: "bg-indigo-50 text-indigo-600" },
                    { title: "Volume Booster", desc: "Fixed reduction", icon: Banknote, color: "bg-emerald-50 text-emerald-600" },
                    { title: "Loyalty Bond", desc: "Free shipping", icon: Tag, color: "bg-blue-50 text-blue-600" }
                ].map((strat, i) => (
                    <div key={i} className="bg-white/70 backdrop-blur-2xl rounded-2xl border border-white/60 p-3 sm:p-5 shadow-sm hover:shadow-xl transition-all cursor-pointer group">
                        <div className={cn("h-10 w-10 sm:h-12 sm:w-12 rounded-xl flex items-center justify-center mb-3 sm:mb-4 group-hover:rotate-6 transition-transform shadow-inner", strat.color)}>
                            <strat.icon className="h-5 w-5" />
                        </div>
                        <h3 className="font-black text-gray-900 mb-0.5 text-xs sm:text-sm tracking-tight">{strat.title}</h3>
                        <p className="text-[9px] sm:text-[11px] text-gray-400 font-bold uppercase tracking-wider">{strat.desc}</p>
                    </div>
                ))}
            </div>

            {/* Desktop Table: Translucent Layer */}
            <div className="hidden md:block bg-white/60 backdrop-blur-2xl rounded-2xl border border-white/80 shadow-2xl overflow-hidden">
                <div className="p-4 sm:p-6 border-b border-gray-100/50 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <h2 className="font-black text-gray-900 text-base sm:text-lg tracking-tight">Active Pulse Registry</h2>
                    <div className="flex bg-gray-200/50 p-1 rounded-xl gap-1">
                        {["All", "Active", "Scheduled"].map((f) => (
                            <Button key={f} variant="ghost" className="h-8 px-3 rounded-lg text-[10px] font-black uppercase text-gray-400 hover:text-gray-900 transition-all">
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
                                        <div className="h-10 w-10 border-4 border-gray-900 border-t-transparent rounded-full animate-spin mx-auto" />
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
                                        <div className="flex items-center gap-1">
                                            <p className="text-sm font-black text-gray-700">{discount.usageCount} / {discount.usageLimit || '∞'}</p>
                                            {discount.usages?.length > 0 && (
                                                <Dialog>
                                                    <DialogTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full hover:bg-emerald-50 text-emerald-600">
                                                            <Eye className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent className="sm:max-w-[425px] rounded-3xl bg-white/95 backdrop-blur-xl border-white/40 shadow-2xl overflow-hidden p-0">
                                                        <DialogHeader className="p-6 pb-2">
                                                            <div className="flex items-center gap-3">
                                                                <div className="h-8 w-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                                                    <User className="h-4 w-4" />
                                                                </div>
                                                                <div>
                                                                    <DialogTitle className="text-lg font-black tracking-tight">Utilisation Pulse</DialogTitle>
                                                                    <DialogDescription className="text-[10px] font-black uppercase tracking-wider text-gray-400">Coupon: {discount.code}</DialogDescription>
                                                                </div>
                                                            </div>
                                                        </DialogHeader>
                                                        <div className="px-6 pb-8 pt-4">
                                                            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                                                {discount.usages.map((u: any, i: number) => (
                                                                    <div key={i} className="flex items-center justify-between p-3.5 bg-gray-50/50 border border-gray-100 rounded-2xl hover:border-emerald-200 transition-all group">
                                                                        <div className="flex items-center gap-3">
                                                                           <div className="h-8 w-8 rounded-full bg-gradient-to-br from-emerald-100 to-emerald-50 flex items-center justify-center font-bold text-emerald-700 text-xs shadow-inner">
                                                                                {u.user.name.charAt(0)}
                                                                           </div>
                                                                           <div>
                                                                                <p className="text-xs font-black text-gray-900 leading-tight">{u.user.name}</p>
                                                                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">ID: ...{u.user.id.slice(-6)}</p>
                                                                           </div>
                                                                        </div>
                                                                        <div className="text-right">
                                                                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{new Date(u.usedAt).toLocaleDateString()}</p>
                                                                            <p className="text-[8px] font-bold text-gray-300 tracking-tight">{new Date(u.usedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                            <div className="mt-6 p-4 bg-blue-50/50 rounded-2xl border border-blue-100 flex items-start gap-2.5">
                                                                <Shield className="h-4 w-4 text-blue-500 mt-0.5" />
                                                                <p className="text-[10px] text-blue-600 font-bold leading-relaxed">System Privacy: Sensitive data like customer emails are strictly omitted from this view to meet platform compliance. Only first name and partial IDs are displayed.</p>
                                                            </div>
                                                        </div>
                                                    </DialogContent>
                                                </Dialog>
                                            )}
                                        </div>
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
                        <div className="h-8 w-8 border-4 border-gray-900 border-t-transparent rounded-full animate-spin mx-auto" />
                    </div>
                ) : discounts.length === 0 ? (
                    <div className="py-24 text-center">
                        <Tag className="h-10 w-10 text-gray-200 mx-auto mb-4" />
                        <p className="text-[11px] font-black uppercase tracking-widest text-gray-400 font-bold px-10">Zero Active Campaigns</p>
                    </div>
                ) : discounts.map((discount) => (
                    <div key={discount.id} className="p-4 transition-colors hover:bg-white/40">
                        <div className="flex items-center justify-between mb-3">
                            <div className="h-9 px-3 flex items-center bg-white shadow-sm border border-gray-100 rounded-lg font-black text-gray-900 tracking-widest text-xs uppercase">
                                {discount.code}
                            </div>
                            <div className={cn(
                                "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest",
                                discount.status === 'active' ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"
                            )}>
                                {discount.status}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <div className="bg-white/40 p-3 rounded-xl border border-white/60 shadow-inner">
                                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Value</p>
                                <p className="text-sm font-black text-gray-900">{discount.type === 'percentage' ? `${discount.value}%` : `₦${discount.value.toLocaleString()}`}</p>
                            </div>
                            <div className="bg-white/40 p-3 rounded-xl border border-white/60 shadow-inner">
                                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Usage</p>
                                <p className="text-sm font-black text-gray-900">{discount.usageCount} / {discount.usageLimit || '∞'}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button variant="ghost" className="flex-1 h-10 rounded-xl bg-white border border-gray-100 shadow-sm text-[10px] font-black uppercase tracking-widest text-gray-400" onClick={() => handleCopy(discount.code)}>
                                Copy Code
                            </Button>
                            <Button variant="ghost" className="h-10 w-10 rounded-xl bg-rose-50 border border-rose-100 text-rose-500" onClick={() => handleDelete(discount.id)}>
                                <Trash className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                ))
                }
            </div>

            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="sm:max-w-[500px] rounded-2xl p-0 overflow-hidden border-none shadow-2xl bg-white/80 backdrop-blur-3xl mx-4">
                    <DialogHeader className="p-5 sm:p-6 pb-4 bg-gray-50/50 border-b border-gray-100/50">
                        <div className="h-10 w-10 bg-gray-900 rounded-xl flex items-center justify-center mb-3 shadow-xl">
                            <Plus className="h-5 w-5 text-white" />
                        </div>
                        <DialogTitle className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">Create Promo Code</DialogTitle>
                        <DialogDescription className="font-bold text-gray-400 uppercase tracking-widest text-[10px] mt-1">Configure your promotional code.</DialogDescription>
                    </DialogHeader>

                    <div className="p-5 sm:p-6 space-y-5">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 pl-1">Promo Code</Label>
                            <div className="relative">
                                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
                                <Input
                                    placeholder="e.g. SAVE20"
                                    className="h-11 pl-10 rounded-xl border-white bg-white/60 font-black tracking-widest uppercase focus:bg-white transition-all shadow-inner"
                                    value={newDiscount.code}
                                    onChange={(e) => setNewDiscount({ ...newDiscount, code: e.target.value.toUpperCase() })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 pl-1">Type</Label>
                                <select
                                    className="w-full h-11 bg-white/60 border border-white rounded-xl px-3 text-xs font-black uppercase tracking-widest focus:bg-white outline-none transition-all shadow-inner cursor-pointer"
                                    value={newDiscount.type}
                                    onChange={(e) => setNewDiscount({ ...newDiscount, type: e.target.value })}
                                >
                                    <option value="Percentage">Percentage</option>
                                    <option value="Fixed">Fixed Amount</option>
                                    <option value="Shipping">Free Delivery</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 pl-1">Value</Label>
                                <Input
                                    placeholder={newDiscount.type === "Percentage" ? "20" : "5000"}
                                    className="h-11 rounded-xl border-white bg-white/60 font-black focus:bg-white transition-all shadow-inner"
                                    value={newDiscount.value}
                                    onChange={(e) => setNewDiscount({ ...newDiscount, value: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 pl-1">Usage Limit</Label>
                                <Input
                                    placeholder="∞"
                                    className="h-11 rounded-xl border-white bg-white/60 font-black focus:bg-white transition-all shadow-inner"
                                    value={newDiscount.usageLimit}
                                    onChange={(e) => setNewDiscount({ ...newDiscount, usageLimit: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 pl-1">Expiry Date</Label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
                                    <Input
                                        type="date"
                                        className="h-11 pl-10 rounded-xl border-white bg-white/60 font-black focus:bg-white transition-all shadow-inner"
                                        onChange={(e) => setNewDiscount({ ...newDiscount, expiry: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {createError && (
                        <div className="mx-5 sm:mx-6 mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs font-bold">
                            {createError}
                        </div>
                    )}
                    <DialogFooter className="p-5 sm:p-6 pt-0 flex gap-3">
                        <Button
                            variant="ghost"
                            className="flex-1 h-11 rounded-xl font-black uppercase tracking-widest text-[10px] text-gray-400 hover:text-gray-900"
                            onClick={() => { setCreateError(null); setIsCreateOpen(false); }}
                        >
                            Cancel
                        </Button>
                        <Button
                            className="flex-1 h-11 rounded-xl bg-gray-900 hover:bg-black text-white font-black uppercase tracking-widest text-[10px] shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
                            onClick={handleCreate}
                        >
                            Create Code
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
