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
    const [view, setView] = useState<"all" | "sellers" | "buyers" | "pending">("all");
    const [participants, setParticipants] = useState<any[]>([]);

    // Commission Edit State
    const [editingCommissionSeller, setEditingCommissionSeller] = useState<any | null>(null);
    const [commissionInput, setCommissionInput] = useState("");

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                // Try API first, fall back to DemoStore
                let sellers: any[] = [];
                let buyers: any[] = [];

                try {
                    const [usersRes, sellersRes] = await Promise.all([
                        fetch("/api/users"),
                        fetch("/api/sellers?all=true")
                    ]);
                    const usersData = await usersRes.json();
                    const sellersData = await sellersRes.json();
                    sellers = Array.isArray(sellersData) ? sellersData : [];
                    buyers = Array.isArray(usersData) ? usersData : [];
                } catch {
                    // API down — use DemoStore
                }

                // Always merge with DemoStore so newly registered sellers appear
                const dsSellers = DemoStore.getSellers();
                const dsOrders = DemoStore.getOrders();
                const dsUsers = DemoStore.getAllUsers ? DemoStore.getAllUsers() : [];

                // Merge sellers: DemoStore is authoritative for recent registrations  
                const sellerIdSet = new Set(sellers.map((s: any) => s.id));
                for (const ds of dsSellers) {
                    if (!sellerIdSet.has(ds.id)) {
                        sellers.push(ds);
                    }
                }

                const mappedSellers = sellers.map((s: any) => {
                    const sellerOrders = dsOrders.filter((o: any) => o.seller_id === s.id);
                    const revenue = sellerOrders.reduce((sum: number, o: any) => sum + (o.amount || 0), 0);

                    const buyerOrders = dsOrders.filter((o: any) => o.customer_id === s.user_id || o.customer_id === s.id || o.customer_email === s.owner_email || o.customer_email === s.email);
                    const isBuyerAsWell = buyerOrders.length > 0;

                    return {
                        ...s,
                        role: "seller",
                        is_buyer: isBuyerAsWell,
                        display_name: s.business_name || s.name || s.owner_name || "Seller",
                        avatar_url: s.logo_url || s.avatar_url || null,
                        order_count: sellerOrders.length,
                        purchase_count: buyerOrders.length,
                        revenue,
                    };
                });

                const sellerUserIds = new Set(mappedSellers.map((s: any) => s.user_id).filter(Boolean));
                const sellerIds = new Set(mappedSellers.map((s: any) => s.id));
                const sellerEmails = new Set(mappedSellers.map((s: any) => s.owner_email || s.email).filter(Boolean));

                // Merge buyers from API + DemoStore
                const buyerIdSet = new Set<string>();
                const allBuyers: any[] = [];

                for (const u of [...buyers, ...dsUsers]) {
                    const uid = u.id || u.email;
                    if (!uid) continue;

                    // If user is already mapped as a seller, skip adding them as a separate buyer entity
                    if (buyerIdSet.has(uid) || sellerUserIds.has(uid) || sellerIds.has(uid) || sellerEmails.has(uid)) continue;

                    buyerIdSet.add(uid);
                    const userOrders = dsOrders.filter((o: any) => o.customer_id === uid || o.customer_email === uid || o.customer_email === u.email);
                    const spent = userOrders.reduce((sum: number, o: any) => sum + (o.amount || 0), 0);
                    allBuyers.push({
                        id: uid,
                        display_name: u.name || u.full_name || u.email?.split("@")[0] || "Buyer",
                        owner_email: u.email,
                        avatar_url: u.avatarUrl || u.avatar_url || null,
                        role: "buyer",
                        is_buyer: true,
                        status: u.status || (u.is_active === false ? "suspended" : "active"),
                        created_at: u.created_at || new Date().toISOString(),
                        trust_score: 90,
                        order_count: userOrders.length,
                        purchase_count: userOrders.length,
                        revenue: spent,
                    });
                }

                // Sort all by created_at descending (newest first)
                const combined = [...mappedSellers, ...allBuyers].sort((a, b) => {
                    const da = a.created_at ? new Date(a.created_at).getTime() : 0;
                    const db = b.created_at ? new Date(b.created_at).getTime() : 0;
                    return db - da;
                });

                setParticipants(combined);
            } catch (error) {
                console.error("Failed to load users/sellers:", error);
            } finally {
                setLoading(false);
            }
        };
        load();
        window.addEventListener("demo-store-update", load);
        window.addEventListener("storage", load);
        return () => {
            window.removeEventListener("demo-store-update", load);
            window.removeEventListener("storage", load);
        };
    }, []);

    const filtered = participants.filter(p => {
        const term = searchTerm.toLowerCase();
        const name = p.display_name || p.business_name || "";
        const matchesSearch = !term || name.toLowerCase().includes(term) ||
            p.id?.toLowerCase().includes(term) ||
            (p.owner_email && p.owner_email.toLowerCase().includes(term));
        const matchesView = view === "all" ||
            (view === "sellers" && p.role === "seller") ||
            (view === "buyers" && (p.role === "buyer" || p.is_buyer)) ||
            (view === "pending" && (p.status === "pending" || p.kyc_status === "pending"));
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
                    <h2 className="text-3xl font-black text-gray-900 tracking-tight">User Directory</h2>
                    <p className="text-sm text-gray-500 font-bold uppercase tracking-wider mt-1">{participants.length} total accounts</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="bg-white p-1.5 rounded-2xl border border-gray-100 flex gap-1">
                        {(["all", "sellers", "buyers", "pending"] as const).map((v) => (
                            <button
                                key={v}
                                onClick={() => setView(v)}
                                className={cn(
                                    "px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all",
                                    view === v
                                        ? v === "pending" ? "bg-amber-500 text-white shadow-lg" : "bg-indigo-600 text-white shadow-lg"
                                        : "text-gray-400 hover:text-gray-600"
                                )}
                            >
                                {v === "pending" ? `⏳ Pending (${participants.filter(p => p.status === "pending" || p.kyc_status === "pending").length})` : v}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                    placeholder="Search by name, email, business, or ID..."
                    className="pl-12 h-12 bg-white border-gray-100 rounded-2xl text-sm font-medium shadow-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto -webkit-overflow-scrolling-touch">
                    <table className="w-full min-w-[700px] text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50">
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">User</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Role & Status</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Activity</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Joined</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filtered.map((p) => (
                                <tr key={p.id} className="group hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                "h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm shadow-sm border overflow-hidden shrink-0",
                                                p.role === "seller" ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-blue-50 text-blue-600 border-blue-100"
                                            )}>
                                                {p.avatar_url || p.logo_url ? (
                                                    <img src={p.avatar_url || p.logo_url} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    (p.display_name || "P").charAt(0).toUpperCase()
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <Link href={`/admin/users/${p.id}`} className="font-bold text-gray-900 text-sm hover:text-indigo-600 hover:underline block truncate max-w-[200px]">
                                                    {p.display_name}
                                                </Link>
                                                <p className="text-[11px] text-gray-400 truncate">{p.owner_email || p.email || p.id}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-1.5">
                                                <span className={cn(
                                                    "text-[9px] font-bold uppercase px-2 py-0.5 rounded-full",
                                                    p.role === "seller" ? "bg-indigo-100 text-indigo-700" : "bg-zinc-100 text-zinc-700"
                                                )}>
                                                    {p.role}
                                                </span>
                                                {p.verified && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                                                <span className={cn(
                                                    "text-[9px] font-bold uppercase px-2 py-0.5 rounded-full",
                                                    p.status === "active" ? "bg-emerald-50 text-emerald-600" :
                                                        p.status === "pending" ? "bg-amber-50 text-amber-600" : "bg-rose-50 text-rose-600"
                                                )}>
                                                    {p.status || "active"}
                                                </span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm">
                                            <span className="font-bold text-gray-900">{p.order_count || 0}</span>
                                            <span className="text-gray-400 text-xs ml-1">orders</span>
                                            {p.revenue > 0 && (
                                                <p className="text-xs text-emerald-600 font-bold">₦{p.revenue.toLocaleString()}</p>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        {p.created_at ? new Date(p.created_at).toLocaleDateString() : "—"}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                            <Link href={`/admin/users/${p.id}`}>
                                                <Button size="sm" variant="ghost" className="h-8 rounded-lg text-xs font-bold text-indigo-600 hover:bg-indigo-50">
                                                    View
                                                </Button>
                                            </Link>
                                            {p.role === "seller" && (p.status === "pending" || p.kyc_status === "pending") && (
                                                <Button
                                                    size="sm"
                                                    className="h-8 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold"
                                                    onClick={() => {
                                                        DemoStore.updateSeller(p.id, { status: "active", verified: true, kyc_status: "approved" });
                                                        setParticipants(prev => prev.map(participant =>
                                                            participant.id === p.id ? { ...participant, status: "active", verified: true, kyc_status: "approved" } : participant
                                                        ));
                                                        alert(`Seller ${p.display_name} has been approved.`);
                                                        window.dispatchEvent(new Event("demo-store-update"));
                                                    }}
                                                >
                                                    Approve
                                                </Button>
                                            )}
                                            <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg hover:bg-rose-50 hover:text-rose-600">
                                                <Ban className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

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
                                Enter the percentage the platform will take from {editingCommissionSeller?.display_name}'s released escrows. This overrides default Subscription Plan rates.
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
