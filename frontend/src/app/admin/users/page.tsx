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
import { DataSyncService } from "@/lib/sync-store";
import { Pagination } from "@/components/ui/Pagination";

export default function UserDirectory() {
    const [searchTerm, setSearchTerm] = useState("");
    const [view, setView] = useState<"all" | "sellers" | "buyers" | "pending">("all");
    const [participants, setParticipants] = useState<any[]>([]);

    // Commission Edit State
    const [editingCommissionSeller, setEditingCommissionSeller] = useState<any | null>(null);
    const [commissionInput, setCommissionInput] = useState("");

    // Delete Confirmation State
    const [deletingUser, setDeletingUser] = useState<any | null>(null);
    const [deleteConfirmEmail, setDeleteConfirmEmail] = useState("");
    const [deleteLoading, setDeleteLoading] = useState(false);

    // Edit State
    const [editingUser, setEditingUser] = useState<any | null>(null);
    const [editFormData, setEditFormData] = useState({
        display_name: "",
        business_name: "",
        owner_email: ""
    });
    const [editLoading, setEditLoading] = useState(false);

    const [loading, setLoading] = useState(true);

    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
    const [isBroadcastDialogOpen, setIsBroadcastDialogOpen] = useState(false);
    const [broadcastForm, setBroadcastForm] = useState({ title: "", body: "", link: "/", sendViaWhatsapp: false });
    const [isBroadcasting, setIsBroadcasting] = useState(false);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(50);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                // Try API first, fall back to DataSyncService
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
                    // API down — use DataSyncService
                }

                // Always merge with DataSyncService so newly registered sellers appear
                const dsSellers = DataSyncService.getSellers();
                const dsOrders = DataSyncService.getOrders();
                const dsUsers = DataSyncService.getAllUsers ? DataSyncService.getAllUsers() : [];

                // Merge sellers: DataSyncService is authoritative for recent registrations  
                const sellerIdSet = new Set(sellers.map((s: any) => s.id));
                for (const ds of dsSellers) {
                    if (!sellerIdSet.has(ds.id)) {
                        sellers.push(ds);
                    }
                }

                const dsProducts = DataSyncService.getProducts();

                const mappedSellers = sellers.map((s: any) => {
                    const sellerOrders = dsOrders.filter((o: any) => o.seller_id === s.id);
                    const revenue = sellerOrders.reduce((sum: number, o: any) => sum + (o.amount || 0), 0);

                    const buyerOrders = dsOrders.filter((o: any) => o.customer_id === s.user_id || o.customer_id === s.id || o.customer_email === s.owner_email || o.customer_email === s.email);
                    const isBuyerAsWell = buyerOrders.length > 0;
                    
                    const catalogueCount = dsProducts.filter((p: any) => p.seller_id === s.id).length;

                    return {
                        ...s,
                        role: "seller",
                        is_buyer: isBuyerAsWell,
                        display_name: s.business_name || s.name || s.owner_name || "Seller",
                        avatar_url: s.logo_url || s.avatar_url || null,
                        order_count: sellerOrders.length,
                        purchase_count: buyerOrders.length,
                        catalogue_count: catalogueCount,
                        revenue,
                    };
                });

                const sellerUserIds = new Set(mappedSellers.map((s: any) => s.user_id).filter(Boolean));
                const sellerIds = new Set(mappedSellers.map((s: any) => s.id));
                const sellerEmails = new Set(mappedSellers.map((s: any) => s.owner_email || s.email).filter(Boolean));

                // Merge buyers from API + DataSyncService
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
                        role: u.role && u.role !== "customer" ? u.role : "buyer",
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
        window.addEventListener("sync-store-update", load);
        window.addEventListener("storage", load);
        return () => {
            window.removeEventListener("sync-store-update", load);
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

    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const paginatedParticipants = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, view]);

    const handleSaveCommission = () => {
        if (!editingCommissionSeller) return;

        const rate = parseFloat(commissionInput) / 100;
        if (!isNaN(rate)) {
            DataSyncService.updateSeller(editingCommissionSeller.id, { commission_rate: rate });

            // Update local state to reflect change immediately
            setParticipants(prev => prev.map(p =>
                p.id === editingCommissionSeller.id
                    ? { ...p, commission_rate: rate }
                    : p
            ));
        }

        setEditingCommissionSeller(null);
    };

    const handleDeleteUser = async () => {
        if (!deletingUser) return;
        const target = (deletingUser.owner_email || deletingUser.email || deletingUser.id || "").trim().toLowerCase();
        if (deleteConfirmEmail.trim().toLowerCase() !== target) {
            alert("Confirmation text does not match. Deletion cancelled.");
            return;
        }
        setDeleteLoading(true);

        const performDelete = async (method: string) => {
            const endpoint = method === "DELETE" ? `/api/users/${deletingUser.id}` : `/api/sellers/${deletingUser.id}`;
            const options: RequestInit = { method };
            if (method === "POST") {
                options.headers = { "Content-Type": "application/json" };
                options.body = JSON.stringify({ action: "delete" });
            }
            return fetch(endpoint, options);
        };

        try {
            let res = await performDelete("DELETE");
            
            // Fallback for 405 Method Not Allowed
            if (res.status === 405) {
                res = await performDelete("POST");
            }

            if (!res.ok) {
                const data = await res.json();
                alert(`Delete failed: ${data.error || "Server error"}`);
                setDeleteLoading(false);
                return;
            }

            // Remove from local UI
            setParticipants(prev => prev.filter(p => p.id !== deletingUser.id));
            window.dispatchEvent(new Event("sync-store-update"));
            alert(`SUCCESS: ${deletingUser.display_name} and all linked data have been permanently removed.`);
        } catch (e: any) {
            console.error("Delete failed:", e);
            alert(`Failed to delete user: ${e.message}`);
        } finally {
            setDeleteLoading(false);
            setDeletingUser(null);
            setDeleteConfirmEmail("");
        }
    };

    const handleBulkBroadcast = async () => {
        if (!broadcastForm.title.trim() || !broadcastForm.body.trim() || selectedUserIds.length === 0) return;
        
        setIsBroadcasting(true);
        
        try {
            // If WhatsApp is selected, trigger backend endpoint
            if (broadcastForm.sendViaWhatsapp) {
                // Get the actual phone numbers for the selected users
                const targetUsers = participants.filter(p => selectedUserIds.includes(p.id));
                const phoneNumbers = targetUsers
                    .map(p => p.phone || p.whatsapp || p.whatsapp_number)
                    .filter(Boolean); // Keep only those with numbers

                if (phoneNumbers.length > 0) {
                    await fetch('/api/whatsapp/broadcast', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            message: `*${broadcastForm.title}*\n\n${broadcastForm.body}\n\n🔗 ${broadcastForm.link}`,
                            phoneNumbers
                        })
                    });
                }
            }

            selectedUserIds.forEach(userId => {
                // Add to notification history for each selected user
                DataSyncService.addNotification({
                    userId,
                    type: "system",
                    message: broadcastForm.body,
                    link: broadcastForm.link,
                });
            });

            // Dispatch global event for immediate online feedback
            const event = new CustomEvent("fp-admin-broadcast", {
                detail: { 
                    title: broadcastForm.title, 
                    body: broadcastForm.body, 
                    link: broadcastForm.link,
                    targetUserIds: selectedUserIds
                }
            });
            window.dispatchEvent(event);

            setIsBroadcasting(false);
            setIsBroadcastDialogOpen(false);
            setBroadcastForm({ title: "", body: "", link: "/", sendViaWhatsapp: false });
            setSelectedUserIds([]);
            alert(`Broadcast sent successfully to ${selectedUserIds.length} users.`);
        } catch (error) {
            console.error("Broadcast failed:", error);
            alert("Failed to send broadcast. Please try again.");
            setIsBroadcasting(false);
        }
    };

    const handleSaveEdit = async () => {
        if (!editingUser) return;
        setEditLoading(true);
        try {
            const endpoint = editingUser.role === "seller" 
                ? `/api/sellers/${editingUser.id}` 
                : `/api/users/${editingUser.id}`;
            
            const res = await fetch(endpoint, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(editFormData)
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Update failed");
            }

            // Update local state
            setParticipants(prev => prev.map(p => 
                p.id === editingUser.id 
                    ? { ...p, ...editFormData } 
                    : p
            ));
            
            // Also update localStorage if it's a seller
            if (editingUser.role === "seller") {
                DataSyncService.updateSeller(editingUser.id, {
                    business_name: editFormData.business_name,
                    owner_name: editFormData.display_name,
                    owner_email: editFormData.owner_email
                });
            }

            alert("User details updated successfully.");
            setEditingUser(null);
        } catch (err: any) {
            alert(`Error: ${err.message}`);
        } finally {
            setEditLoading(false);
        }
    };

    const handleToggleSuspend = async (p: any) => {
        const newStatus = p.status === "suspended" ? "active" : "suspended";

        // Optimistic UI update immediately
        setParticipants(prev => prev.map(participant =>
            participant.id === p.id ? { ...participant, status: newStatus } : participant
        ));

        try {
            // Persist to DB via API — this is what makes the change survive a page reload
            const endpoint = p.role === "seller"
                ? `/api/sellers/${p.id}`
                : `/api/users/${p.id}`;

            const res = await fetch(endpoint, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus })
            });

            if (!res.ok) {
                throw new Error(`Server returned ${res.status}`);
            }

            // Also update localStorage so DataSyncService stays in sync
            if (p.role === "seller") {
                DataSyncService.updateSeller(p.id, { status: newStatus as any });
            }

            alert(`${p.display_name} has been ${newStatus === "suspended" ? "suspended" : "reactivated"}.`);
        } catch (err: any) {
            // Rollback optimistic update on failure
            setParticipants(prev => prev.map(participant =>
                participant.id === p.id ? { ...participant, status: p.status } : participant
            ));
            alert(`Failed to update status: ${err.message}. Please try again.`);
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-black text-gray-900 tracking-tight">User Directory</h2>
                    <p className="text-sm text-gray-500 font-bold uppercase tracking-wider mt-1">{participants.length} total accounts</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="bg-white/40 backdrop-blur-md p-1.5 rounded-3xl border border-white/50 shadow-sm flex gap-1">
                        {(["all", "sellers", "buyers", "pending"] as const).map((v) => (
                            <button
                                key={v}
                                onClick={() => setView(v)}
                                className={cn(
                                    "px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-widest transition-all",
                                    view === v
                                        ? v === "pending" ? "bg-amber-500 text-white shadow-lg" : "bg-emerald-600 text-white shadow-lg"
                                        : "text-emerald-800/60 hover:text-emerald-900 hover:bg-white/50"
                                )}
                            >
                                {v === "pending" ? `⏳ Pending (${participants.filter(p => p.status === "pending" || p.kyc_status === "pending").length})` : v}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-600/50" />
                <Input
                    placeholder="Search by name, email, business, or ID..."
                    className="pl-12 h-14 bg-white/40 backdrop-blur-md border-[1.5px] border-white/60 rounded-3xl text-sm font-bold shadow-sm placeholder:text-emerald-800/40 focus:bg-white/60 transition-all text-emerald-900"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="bg-white/40 backdrop-blur-xl rounded-[32px] border border-white/50 shadow-xl shadow-green-900/10 overflow-hidden relative flex flex-col">
                <div className="absolute inset-0 bg-gradient-to-b from-white/40 to-transparent pointer-events-none" />
                {selectedUserIds.length > 0 && (
                    <div className="px-6 py-4 border-b border-white/40 bg-emerald-50/70 z-20 flex items-center justify-between">
                        <h3 className="text-sm font-black text-emerald-900">{selectedUserIds.length} Users Selected</h3>
                        <div className="flex gap-2">
                            <Button
                                onClick={() => setIsBroadcastDialogOpen(true)}
                                className="h-8 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg"
                            >
                                <Mail className="mr-2 h-3.5 w-3.5" /> Send Broadcast
                            </Button>
                            <Button
                                onClick={async () => {
                                    if (confirm(`Suspend ${selectedUserIds.length} selected users?`)) {
                                        for (let id of selectedUserIds) {
                                            const p = participants.find(part => part.id === id);
                                            if (p) {
                                                const newStatus = p.status === "suspended" ? "active" : "suspended";
                                                if (p.role === "seller") DataSyncService.updateSeller(p.id, { status: newStatus as any });
                                                setParticipants(prev => prev.map(participant => participant.id === p.id ? { ...participant, status: newStatus } : participant));
                                            }
                                        }
                                        setSelectedUserIds([]);
                                        window.dispatchEvent(new Event("sync-store-update"));
                                    }
                                }}
                                className="h-8 px-4 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg"
                            >
                                <ShieldOff className="mr-2 h-3.5 w-3.5" /> Toggle Suspend
                            </Button>
                            <Button
                                onClick={async () => {
                                    if (confirm(`Permanently Delete ${selectedUserIds.length} selected users and all their data? This is irreversible.`)) {
                                        for (let id of selectedUserIds) {
                                            try { await fetch(`/api/users/${id}`, { method: "DELETE" }); } catch(e) {}
                                            setParticipants(prev => prev.filter(p => p.id !== id));
                                        }
                                        setSelectedUserIds([]);
                                        window.dispatchEvent(new Event("sync-store-update"));
                                    }
                                }}
                                className="h-8 px-4 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg"
                            >
                                <Ban className="mr-2 h-3.5 w-3.5" /> Delete Selected
                            </Button>
                        </div>
                    </div>
                )}
                <div className="overflow-x-auto -webkit-overflow-scrolling-touch relative z-10">
                    <table className="w-full min-w-[700px] text-left border-collapse">
                        <thead>
                            <tr className="bg-white/20 text-[10px] font-black uppercase tracking-widest text-emerald-800 border-b border-white/30 backdrop-blur-md">
                                <th className="px-6 py-4 w-12 text-center">
                                    <input
                                        type="checkbox"
                                        className="rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer h-4 w-4"
                                        checked={filtered.length > 0 && selectedUserIds.length === filtered.length}
                                        onChange={(e) => {
                                            if (e.target.checked) setSelectedUserIds(filtered.map(p => p.id));
                                            else setSelectedUserIds([]);
                                        }}
                                    />
                                </th>
                                <th className="px-6 py-4">User</th>
                                <th className="px-6 py-4">Role & Status</th>
                                <th className="px-6 py-4">Activity</th>
                                <th className="px-6 py-4">Joined</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/20">
                            {paginatedParticipants.map((p) => (
                                <tr key={p.id} className="group hover:bg-white/40 transition-all">
                                    <td className="px-6 py-4 align-middle text-center">
                                        <input
                                            type="checkbox"
                                            className="rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer h-4 w-4"
                                            checked={selectedUserIds.includes(p.id)}
                                            onChange={(e) => {
                                                if (e.target.checked) setSelectedUserIds([...selectedUserIds, p.id]);
                                                else setSelectedUserIds(selectedUserIds.filter(id => id !== p.id));
                                            }}
                                        />
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                "h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm shadow-md border border-white/60 overflow-hidden shrink-0 backdrop-blur-sm",
                                                p.role === "seller" ? "bg-emerald-100/50 text-emerald-700" : "bg-white/60 text-emerald-800"
                                            )}>
                                                {p.avatar_url || p.logo_url ? (
                                                    <img src={p.avatar_url || p.logo_url} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    (p.display_name || "P").charAt(0).toUpperCase()
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <Link href={`/admin/users/${p.id}`} className="font-bold text-gray-900 text-sm hover:text-emerald-700 hover:underline block truncate max-w-[200px]">
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
                                                    "text-[9px] font-black tracking-wider uppercase px-2 py-0.5 rounded-full border border-white/50 shadow-sm",
                                                    p.role === "admin" ? "bg-purple-100/50 text-purple-700" :
                                                    p.role === "seller" ? "bg-emerald-100/50 text-emerald-700" : "bg-white/60 text-emerald-800"
                                                )}>
                                                    {p.role}
                                                </span>
                                                {p.verified && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                                                <span className={cn(
                                                    "text-[9px] font-black tracking-wider uppercase px-2 py-0.5 rounded-full border border-white/50 shadow-sm",
                                                    (p.status === "active" && p.kyc_status !== "pending") ? "bg-emerald-50/50 text-emerald-700" :
                                                        (p.status === "pending" || p.kyc_status === "pending") ? "bg-amber-50 text-amber-600" : "bg-rose-50 text-rose-600"
                                                )}>
                                                    {p.status === "pending" || p.kyc_status === "pending" ? "pending" : p.status || "active"}
                                                </span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm">
                                            <div className="flex gap-2">
                                                <span>
                                                    <span className="font-bold text-gray-900">{p.order_count || 0}</span>
                                                    <span className="text-gray-400 text-xs ml-1">orders</span>
                                                </span>
                                                {p.role === "seller" && p.catalogue_count !== undefined && (
                                                    <span className="text-gray-300">|</span>
                                                )}
                                                {p.role === "seller" && p.catalogue_count !== undefined && (
                                                    <span>
                                                        <span className="font-bold text-gray-900">{p.catalogue_count}</span>
                                                        <span className="text-gray-400 text-xs ml-1">catalog</span>
                                                    </span>
                                                )}
                                            </div>
                                            {p.revenue > 0 && (
                                                <p className="text-xs text-emerald-600 font-bold mt-0.5">₦{p.revenue.toLocaleString()}</p>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        <div className="font-bold text-gray-900">
                                            {p.created_at ? new Date(p.created_at).toLocaleDateString() : "—"}
                                        </div>
                                        {p.created_at && (
                                            <div className="text-[11px] text-gray-400 mt-0.5 font-medium tracking-tight">
                                                {(() => {
                                                    const created = new Date(p.created_at);
                                                    const now = new Date();
                                                    const diffTime = Math.max(0, now.getTime() - created.getTime());
                                                    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                                                    if (diffDays === 0) return "Joined today";
                                                    if (diffDays === 1) return "1 day on platform";
                                                    if (diffDays < 30) return `${diffDays} days on platform`;
                                                    const diffMonths = Math.floor(diffDays / 30);
                                                    if (diffMonths < 12) return `${diffMonths} month${diffMonths > 1 ? "s" : ""} on platform`;
                                                    const diffYears = (diffDays / 365.25).toFixed(1);
                                                    return `${diffYears} year${parseFloat(diffYears) > 1 ? "s" : ""} on platform`;
                                                })()}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-1 transition-opacity">
                                            <Link href={`/admin/users/${p.id}`}>
                                                <Button size="sm" variant="ghost" className="h-8 rounded-xl text-xs font-bold text-emerald-700 bg-white/50 border-[0.5px] border-white/60 hover:bg-white hover:shadow-lg transition-all">
                                                    View
                                                </Button>
                                            </Link>
                                            <Button 
                                                size="sm" 
                                                variant="ghost" 
                                                className="h-8 rounded-xl text-xs font-bold text-blue-700 bg-white/50 border-[0.5px] border-white/60 hover:bg-white hover:shadow-lg transition-all"
                                                onClick={() => {
                                                    setEditingUser(p);
                                                    setEditFormData({
                                                        display_name: p.display_name || "",
                                                        business_name: p.business_name || "",
                                                        owner_email: p.owner_email || p.email || ""
                                                    });
                                                }}
                                            >
                                                Edit
                                            </Button>
                                            {/* Approve: only for pending sellers */}
                                            {p.role === "seller" && (p.status === "pending" || p.kyc_status === "pending") && (
                                                <Button
                                                    size="sm"
                                                    className="h-8 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold"
                                                    onClick={() => {
                                                        DataSyncService.updateSeller(p.id, { status: "active", verified: true, kyc_status: "approved" });
                                                        setParticipants(prev => prev.map(participant =>
                                                            participant.id === p.id ? { ...participant, status: "active", verified: true, kyc_status: "approved" } : participant
                                                        ));
                                                        alert(`Seller ${p.display_name} has been approved.`);
                                                        window.dispatchEvent(new Event("sync-store-update"));
                                                    }}
                                                >
                                                    Approve
                                                </Button>
                                            )}
                                            {/* Activate: only for suspended users */}
                                            {p.status === "suspended" && (
                                                <Button
                                                    size="sm"
                                                    className="h-8 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold"
                                                    onClick={() => handleToggleSuspend(p)}
                                                >
                                                    Activate
                                                </Button>
                                            )}
                                            {/* Suspend: only for active users (not pending or already suspended) */}
                                            {p.status === "active" && p.role !== "admin" && (
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-8 w-8 rounded-lg hover:bg-amber-50 hover:text-amber-600"
                                                    title="Suspend user"
                                                    onClick={() => handleToggleSuspend(p)}
                                                >
                                                    <ShieldOff className="h-3.5 w-3.5" />
                                                </Button>
                                            )}
                                            {/* Delete: always available except for admins */}
                                            {p.role !== "admin" && (
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-8 w-8 rounded-lg hover:bg-rose-50 hover:text-rose-600"
                                                    title="Delete user"
                                                    onClick={() => {
                                                        setDeletingUser(p);
                                                        setDeleteConfirmEmail("");
                                                    }}
                                                >
                                                    <Ban className="h-3.5 w-3.5" />
                                                </Button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <Pagination 
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    itemsPerPage={itemsPerPage}
                    totalItems={filtered.length}
                    onItemsPerPageChange={(val) => { setItemsPerPage(val); setCurrentPage(1); }}
                    type="users"
                    className="bg-white/20"
                />

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

            {/* Quick Edit Details Dialog */}
            <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="font-black text-gray-900">Edit {editingUser?.role === "seller" ? "Seller" : "User"} Details</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4 mt-2">
                        <div className="grid gap-2">
                            <Label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Display Name</Label>
                            <Input 
                                value={editFormData.display_name} 
                                onChange={e => setEditFormData({...editFormData, display_name: e.target.value})}
                                className="h-12 border-gray-200 rounded-xl font-medium"
                            />
                        </div>
                        {editingUser?.role === "seller" && (
                            <div className="grid gap-2">
                                <Label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Business Name</Label>
                                <Input 
                                    value={editFormData.business_name} 
                                    onChange={e => setEditFormData({...editFormData, business_name: e.target.value})}
                                    className="h-12 border-gray-200 rounded-xl font-medium"
                                />
                            </div>
                        )}
                        <div className="grid gap-2">
                            <Label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Email Address</Label>
                            <Input 
                                value={editFormData.owner_email} 
                                onChange={e => setEditFormData({...editFormData, owner_email: e.target.value})}
                                className="h-12 border-gray-200 rounded-xl font-medium"
                            />
                        </div>
                        <div className="bg-amber-50 p-3 rounded-xl border border-amber-100 mt-2">
                            <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest">Administrator Note</p>
                            <p className="text-xs text-amber-600 mt-1">Changing the email will affect the user's login credentials. Ensure the user is notified.</p>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 mt-4">
                        <Button variant="outline" className="h-12 px-6 rounded-xl font-bold bg-white" onClick={() => setEditingUser(null)}>Cancel</Button>
                        <Button 
                            className="h-12 px-6 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white" 
                            onClick={handleSaveEdit}
                            disabled={editLoading}
                        >
                            {editLoading ? "Saving..." : "Save Changes"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Bulk Broadcast Dialog */}
            <Dialog open={isBroadcastDialogOpen} onOpenChange={setIsBroadcastDialogOpen}>
                <DialogContent className="sm:max-w-[500px] backdrop-blur-3xl bg-white/90">
                    <DialogHeader>
                        <DialogTitle className="font-black text-gray-900 text-xl flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg">
                                <Mail className="w-5 h-5" />
                            </div>
                            Targeted Broadcast
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-6 space-y-6">
                        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4">
                            <p className="text-xs font-bold text-indigo-900 uppercase tracking-widest mb-1">Target Audience</p>
                            <p className="text-sm font-medium text-indigo-700">
                                Sending to <strong>{selectedUserIds.length} selected users</strong>. 
                                This will appear in their notification history and as a live alert if they are online.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Alert Title</Label>
                                <Input 
                                    placeholder="e.g. Exclusive Offer Just For You! 🎁" 
                                    value={broadcastForm.title}
                                    onChange={e => setBroadcastForm({...broadcastForm, title: e.target.value})}
                                    className="h-12 rounded-xl border-gray-200 focus:bg-white font-bold"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Message Body</Label>
                                <textarea 
                                    placeholder="Enter your personalized message here..." 
                                    value={broadcastForm.body}
                                    onChange={e => setBroadcastForm({...broadcastForm, body: e.target.value})}
                                    rows={4}
                                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium focus:ring-4 focus:ring-indigo-500/5 outline-none resize-none transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Destination Link</Label>
                                <Input 
                                    placeholder="/account/offers" 
                                    value={broadcastForm.link}
                                    onChange={e => setBroadcastForm({...broadcastForm, link: e.target.value})}
                                    className="h-12 rounded-xl border-gray-200 focus:bg-white font-bold"
                                />
                            </div>
                            <div className="flex items-center gap-3 pt-2">
                                <button
                                    type="button"
                                    role="switch"
                                    aria-checked={broadcastForm.sendViaWhatsapp}
                                    onClick={() => setBroadcastForm(prev => ({ ...prev, sendViaWhatsapp: !prev.sendViaWhatsapp }))}
                                    className={cn(
                                        "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2",
                                        broadcastForm.sendViaWhatsapp ? "bg-indigo-600" : "bg-gray-200"
                                    )}
                                >
                                    <span className={cn(
                                        "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                                        broadcastForm.sendViaWhatsapp ? "translate-x-5" : "translate-x-0"
                                    )} />
                                </button>
                                <Label className="text-sm font-bold text-gray-700 cursor-pointer" onClick={() => setBroadcastForm(prev => ({ ...prev, sendViaWhatsapp: !prev.sendViaWhatsapp }))}>
                                    Send via WhatsApp
                                    <p className="text-xs font-normal text-gray-500 mt-0.5">Deliver directly to their WhatsApp inbox if a phone number is linked.</p>
                                </Label>
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pb-2">
                        <Button variant="outline" className="h-12 px-6 rounded-xl font-bold bg-white" onClick={() => setIsBroadcastDialogOpen(false)}>Cancel</Button>
                        <Button 
                            className="h-12 px-8 rounded-xl font-black bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-100 disabled:opacity-50"
                            onClick={handleBulkBroadcast}
                            disabled={isBroadcasting || !broadcastForm.title.trim() || !broadcastForm.body.trim()}
                        >
                            {isBroadcasting ? (
                                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                "Send Broadcast Now"
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!deletingUser} onOpenChange={(open) => { if (!open) { setDeletingUser(null); setDeleteConfirmEmail(""); } }}>
                <DialogContent className="sm:max-w-[450px]">
                    <DialogHeader>
                        <DialogTitle className="font-black text-gray-900 text-lg">⚠️ Delete User Account</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
                            <p className="text-sm font-bold text-rose-800">This action is irreversible.</p>
                            <p className="text-xs text-rose-600 mt-1">
                                Deleting <strong>{deletingUser?.display_name}</strong> will remove their account, associated orders, and all linked data.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                                Type the following to confirm:
                            </Label>
                            {(() => {
                                const target = (deletingUser?.owner_email || deletingUser?.email || deletingUser?.id || "").trim();
                                return (
                                    <>
                                        <p className="text-sm font-mono text-gray-500 bg-gray-50 px-3 py-2 rounded-lg border">
                                            {target}
                                        </p>
                                        <Input
                                            type="text"
                                            placeholder={`Type "${target}" here...`}
                                            value={deleteConfirmEmail}
                                            onChange={(e) => setDeleteConfirmEmail(e.target.value)}
                                            className="h-12 border-gray-200 rounded-xl font-medium"
                                            autoFocus
                                        />
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 mt-2">
                        <Button variant="outline" className="h-12 px-6 rounded-xl font-bold bg-white" onClick={() => { setDeletingUser(null); setDeleteConfirmEmail(""); }}>Cancel</Button>
                        <Button
                            className="h-12 px-6 rounded-xl font-bold bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-50"
                            onClick={handleDeleteUser}
                            disabled={deleteLoading || deleteConfirmEmail.trim().toLowerCase() !== (deletingUser?.owner_email || deletingUser?.email || deletingUser?.id || "").trim().toLowerCase()}
                        >
                            {deleteLoading ? "Deleting..." : "Permanently Delete"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
