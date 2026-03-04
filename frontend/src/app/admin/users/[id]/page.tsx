"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
    ArrowLeft,
    Mail,
    Phone,
    MapPin,
    Calendar,
    Shield,
    ShieldCheck,
    Ban,
    ExternalLink,
    Store,
    ShoppingBag,
    Star,
    CheckCircle2,
    Clock,
    CreditCard,
    DollarSign,
    Package,
    Edit,
    Save,
    X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DemoStore } from "@/lib/demo-store";
import { cn } from "@/lib/utils";
import { Seller, User, Order } from "@/lib/types";

export default function AdminUserDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params?.id as string;

    const [loading, setLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState<any>({});
    const [userEntity, setUserEntity] = useState<any>(null);
    const [orders, setOrders] = useState<any[]>([]);

    useEffect(() => {
        if (userEntity) setEditForm(userEntity);
    }, [userEntity]);

    const handleSave = async () => {
        if (!id || isUpdating) return;
        setIsUpdating(true);
        if (editForm.role === "seller") {
            DemoStore.updateSeller(id, editForm);
        }
        setUserEntity({ ...userEntity, ...editForm });
        setIsEditing(false);
        setIsUpdating(false);
    };

    const loadData = async () => {
        if (!id) return;
        setLoading(true);
        let found = false;

        // Try DemoStore first (always has latest registrations)
        const dsSeller = DemoStore.getSellers().find((s: any) => s.id === id);
        if (dsSeller) {
            const dsOrders = DemoStore.getOrders().filter((o: any) => o.seller_id === id);
            setUserEntity({ ...dsSeller, role: "seller" });
            setOrders(dsOrders);
            found = true;
        } else {
            // Check if it's a buyer from orders
            const dsOrders = DemoStore.getOrders();
            const buyerOrders = dsOrders.filter((o: any) => o.customer_id === id || o.customer_email === id);
            if (buyerOrders.length > 0) {
                const first = buyerOrders[0];
                setUserEntity({
                    id,
                    name: first.customer_name || id.split("@")[0],
                    email: first.customer_email || id,
                    role: "buyer",
                    status: "active",
                    created_at: first.created_at,
                });
                setOrders(buyerOrders);
                found = true;
            }
        }

        // Also try API to get richer data
        try {
            const sellerRes = await fetch(`/api/sellers/${id}`);
            if (sellerRes.ok) {
                const data = await sellerRes.json();
                if (data && data.id) {
                    setUserEntity((prev: any) => ({ ...prev, ...data, role: "seller" }));
                    if (data.orders?.length) setOrders(data.orders);
                    found = true;
                }
            } else if (!found) {
                const userRes = await fetch(`/api/users?id=${id}`);
                if (userRes.ok) {
                    const data = await userRes.json();
                    if (data && data.id) {
                        setUserEntity((prev: any) => ({ ...(prev || {}), ...data, role: "buyer" }));
                        found = true;
                    }
                }
            }
        } catch {
            // API unavailable — DemoStore data is already loaded
        }

        setLoading(false);
    };

    const handleApprove = async () => {
        if (!id || isUpdating) return;
        setIsUpdating(true);
        // Update in DemoStore immediately
        DemoStore.updateSeller(id, { status: "active", verified: true, kyc_status: "approved" });
        // Also try API
        try {
            await fetch(`/api/sellers/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "active", verified: true }),
            });
        } catch { }
        await loadData();
        setIsUpdating(false);
    };

    useEffect(() => {
        loadData();
    }, [id]);

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <div className="h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-medium text-gray-400 uppercase tracking-widest">Loading Records...</p>
        </div>
    );

    if (!userEntity) {
        return (
            <div className="p-8 text-center max-w-lg mx-auto bg-white/40 backdrop-blur-xl rounded-[32px] border border-white/60 shadow-2xl">
                <div className="h-20 w-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Shield className="h-10 w-10 text-gray-300" />
                </div>
                <h2 className="text-2xl font-black text-gray-900 mb-2">User Not Found</h2>
                <p className="text-gray-500 mb-8 font-medium">We couldn't locate any records matching this identifier.</p>
                <Button onClick={() => router.back()} variant="outline" className="rounded-2xl h-12 px-8 border-gray-200 font-bold uppercase tracking-wider text-xs">
                    <ArrowLeft className="h-4 w-4 mr-2" /> Return to Directory
                </Button>
            </div>
        );
    }

    const isSeller = userEntity.role === "seller";
    const isPending = userEntity.status === "pending" || userEntity.status === "not_verified";

    // ... calculate metrics
    const totalOrderVolume = (orders || []).reduce((sum, o) => sum + (o.amount || 0), 0);
    const completedOrders = (orders || []).filter(o => o.status === "delivered").length;
    const pendingOrdersCount = (orders || []).filter(o => o.status === "processing" || o.status === "shipped" || o.status === "pending").length;

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-20 px-4 md:px-0">
            {/* Nav & Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/40 backdrop-blur-xl p-4 md:p-6 rounded-[28px] border border-white/60 shadow-lg">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" className="h-10 w-10 p-0 rounded-full bg-white/80 hover:bg-white shadow-sm border border-gray-100" onClick={() => router.back()}>
                        <ArrowLeft className="h-5 w-5 text-gray-600" />
                    </Button>
                    <div>
                        <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Control Panel</h2>
                        <p className="text-lg font-bold text-gray-800 leading-none">User Management</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* View Store if seller */}
                    {isSeller && (
                        <Button onClick={() => router.push(`/store/${id}`)} variant="outline" className="h-11 px-5 rounded-2xl border-indigo-100 bg-white/80 text-indigo-700 font-bold text-xs uppercase tracking-wider hover:bg-white shadow-sm">
                            <Store className="h-4 w-4 mr-2" /> View Store
                        </Button>
                    )}

                    {/* Edit Details */}
                    {isEditing ? (
                        <>
                            <Button onClick={handleSave} disabled={isUpdating} className="h-11 px-5 rounded-2xl bg-emerald-600 text-white font-bold text-xs uppercase tracking-wider hover:bg-emerald-700 shadow-sm">
                                {isUpdating ? <div className="h-4 w-4 border-2 border-white/30 border-t-white animate-spin rounded-full mr-2" /> : <Save className="h-4 w-4 mr-2" />} Save
                            </Button>
                            <Button onClick={() => { setIsEditing(false); setEditForm(userEntity); }} variant="outline" className="h-11 px-5 rounded-2xl border-gray-200 bg-white/80 text-gray-600 font-bold text-xs uppercase tracking-wider hover:bg-white shadow-sm">
                                <X className="h-4 w-4 mr-2" /> Cancel
                            </Button>
                        </>
                    ) : (
                        <Button onClick={() => setIsEditing(true)} variant="outline" className="h-11 px-5 rounded-2xl border-gray-200 bg-white/80 text-gray-600 font-bold text-xs uppercase tracking-wider hover:bg-white shadow-sm">
                            <Edit className="h-4 w-4 mr-2" /> Edit Details
                        </Button>
                    )}

                    {isSeller && isPending && (
                        <>
                            <Button
                                onClick={handleApprove}
                                disabled={isUpdating}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-[11px] h-11 px-6 rounded-2xl shadow-lg shadow-emerald-500/20 transition-all hover:scale-105"
                            >
                                {isUpdating ? <div className="h-4 w-4 border-2 border-white/30 border-t-white animate-spin rounded-full" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
                                Approve Seller
                            </Button>
                            <Button
                                onClick={() => router.push(`/admin/inbox?user_id=${id}`)}
                                variant="outline"
                                className="h-11 px-5 rounded-2xl border-amber-200 bg-amber-50 text-amber-700 font-bold text-xs uppercase tracking-wider hover:bg-amber-100 shadow-sm"
                            >
                                <Mail className="h-4 w-4 mr-2" /> Request Info
                            </Button>
                        </>
                    )}
                    <Button onClick={() => router.push(`/admin/inbox?user_id=${id}`)} variant="outline" className="h-11 px-5 rounded-2xl border-indigo-100 bg-white/80 text-indigo-700 font-bold text-xs uppercase tracking-wider hover:bg-white shadow-sm">
                        <Mail className="h-4 w-4 mr-2" /> Message
                    </Button>
                    <Button onClick={() => {
                        if (confirm("Are you sure you want to suspend this account?")) {
                            DemoStore.updateSeller(id, { status: "frozen" });
                            loadData();
                        }
                    }} variant="outline" className="h-11 px-5 rounded-2xl border-gray-100 bg-white/80 text-gray-600 font-bold text-xs uppercase tracking-wider hover:bg-white shadow-sm">
                        <Ban className="h-4 w-4 mr-2" /> Suspend
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Col: Profile Card */}
                <div className="lg:col-span-1 space-y-8">
                    <div className="bg-white/70 backdrop-blur-2xl rounded-[32px] border border-white/60 shadow-xl overflow-hidden group">
                        <div className={`h-32 relative ${isSeller ? 'bg-gradient-to-br from-emerald-400 to-teal-600' : 'bg-gradient-to-br from-indigo-500 to-blue-700'}`}>
                            {isSeller && userEntity.cover_image_url && (
                                <img src={userEntity.cover_image_url} alt="Cover" className="w-full h-full object-cover mix-blend-overlay opacity-50" />
                            )}
                            <div className="absolute inset-0 bg-black/5" />
                        </div>
                        <div className="px-8 pb-8 relative">
                            <div className="absolute -top-14 left-8 h-28 w-28 bg-white/90 backdrop-blur-md rounded-[24px] p-2 border border-white/60 shadow-2xl transition-transform group-hover:scale-105">
                                <div className="h-full w-full bg-gray-50 rounded-[18px] flex items-center justify-center overflow-hidden border border-gray-100">
                                    {userEntity.logo_url || userEntity.avatarUrl ? (
                                        <img src={userEntity.logo_url || userEntity.avatarUrl} alt="Profile" className="h-full w-full object-cover" />
                                    ) : (
                                        <span className="text-4xl font-black text-gray-300">{(userEntity.business_name || userEntity.name || "U").charAt(0)}</span>
                                    )}
                                </div>
                            </div>

                            <div className="pt-[100px] md:pt-[116px] mb-6">
                                <div className="flex flex-wrap items-center gap-3 mb-2">
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            value={editForm.business_name || editForm.name || ""}
                                            onChange={e => setEditForm({ ...editForm, business_name: e.target.value, name: e.target.value })}
                                            className="text-2xl font-black text-gray-900 tracking-tight bg-white border border-gray-200 rounded-lg px-3 py-1 w-full max-w-sm"
                                        />
                                    ) : (
                                        <h1 className="text-2xl font-black text-gray-900 tracking-tight">{userEntity.business_name || userEntity.name}</h1>
                                    )}
                                    {(userEntity.verified || userEntity.kyc_status === 'approved') && (
                                        <div className="h-6 w-6 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/20">
                                            <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-wrap items-center gap-2 mb-4">
                                    <div className={cn(
                                        "px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest",
                                        isSeller ? "bg-indigo-50 text-indigo-700" : "bg-blue-50 text-blue-700"
                                    )}>
                                        {userEntity.role}
                                    </div>
                                    <div className={cn(
                                        "px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest",
                                        userEntity.status === 'active' ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                                    )}>
                                        Status: {userEntity.status || "Pending"}
                                    </div>
                                </div>
                                <p className="text-[10px] text-gray-400 font-black uppercase tracking-tighter opacity-70">Internal ID: {userEntity.id}</p>
                            </div>

                            <div className="space-y-4 pt-6 border-t border-gray-100/50">
                                <div className="flex items-center text-[13px] font-semibold text-gray-700">
                                    <div className="h-8 w-8 rounded-xl bg-gray-50 flex items-center justify-center mr-3 border border-gray-100">
                                        <Mail className="h-4 w-4 text-gray-400" />
                                    </div>
                                    {isEditing ? (
                                        <input
                                            type="email"
                                            value={editForm.email || editForm.owner_email || ""}
                                            onChange={e => setEditForm({ ...editForm, email: e.target.value, owner_email: e.target.value })}
                                            className="bg-white border border-gray-200 rounded-lg px-3 py-1 flex-1 max-w-sm"
                                        />
                                    ) : (
                                        <span className="truncate">{userEntity.email || userEntity.ownerEmail || userEntity.owner_email || "No email on record"}</span>
                                    )}
                                </div>
                                <div className="flex items-center text-[13px] font-semibold text-gray-700">
                                    <div className="h-8 w-8 rounded-xl bg-gray-50 flex items-center justify-center mr-3 border border-gray-100">
                                        <Phone className="h-4 w-4 text-gray-400" />
                                    </div>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            value={editForm.phone || ""}
                                            onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                                            className="bg-white border border-gray-200 rounded-lg px-3 py-1 flex-1 max-w-sm"
                                        />
                                    ) : (
                                        userEntity.phone || "N/A"
                                    )}
                                </div>
                                <div className="flex items-start text-[13px] font-semibold text-gray-700">
                                    <div className="h-8 w-8 rounded-xl bg-gray-50 flex items-center justify-center mr-3 border border-gray-100 shrink-0">
                                        <MapPin className="h-4 w-4 text-gray-400" />
                                    </div>
                                    <span className="leading-tight pt-1 w-full max-w-sm">
                                        {isEditing ? (
                                            <input
                                                type="text"
                                                value={editForm.location || editForm.address || ""}
                                                onChange={e => setEditForm({ ...editForm, location: e.target.value, address: e.target.value })}
                                                className="bg-white border border-gray-200 rounded-lg px-3 py-1 w-full"
                                            />
                                        ) : (
                                            userEntity.location || userEntity.address || "Location not provided"
                                        )}
                                    </span>
                                </div>
                                <div className="flex items-center text-[13px] font-semibold text-gray-700">
                                    <div className="h-8 w-8 rounded-xl bg-gray-50 flex items-center justify-center mr-3 border border-gray-100">
                                        <Calendar className="h-4 w-4 text-gray-400" />
                                    </div>
                                    Joined {userEntity.created_at ? new Date(userEntity.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : "Recently"}
                                </div>
                            </div>
                        </div>
                    </div>

                    {isSeller && (
                        <div className="bg-white/70 backdrop-blur-2xl rounded-[32px] border border-white/60 shadow-xl p-8">
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-indigo-500" />
                                Compliance & Plan
                            </h3>

                            <div className="space-y-6">
                                <div className="flex justify-between items-center bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
                                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Subscription</span>
                                    <span className="text-sm font-black text-indigo-700">{(userEntity.subscription_plan || 'Starter').toUpperCase()}</span>
                                </div>
                                <div className="flex justify-between items-center bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
                                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Marketplace Fee</span>
                                    <span className="text-sm font-black text-gray-900">{userEntity.commission_rate ? `${(userEntity.commission_rate * 100).toFixed(1)}%` : "15% Standard"}</span>
                                </div>
                                <div className="flex justify-between items-center bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
                                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">KYC Verification</span>
                                    <div className={cn(
                                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                                        userEntity.kyc_status === 'approved' ? "bg-emerald-500 text-white" : "bg-amber-100 text-amber-700"
                                    )}>
                                        {userEntity.kyc_status || 'Not Submitted'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Col: Stats & Orders */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        {[
                            { label: "Revenue", value: `₦${totalOrderVolume.toLocaleString()}`, icon: DollarSign, color: "bg-emerald-50 text-emerald-600" },
                            { label: "Successful", value: completedOrders, icon: Package, color: "bg-blue-50 text-blue-600" },
                            { label: "In Progress", value: pendingOrdersCount, icon: Clock, color: "bg-amber-50 text-amber-600" }
                        ].map((stat, i) => (
                            <div key={i} className="bg-white/70 backdrop-blur-2xl p-6 rounded-[32px] border border-white/60 shadow-xl flex flex-col items-center text-center sm:items-start sm:text-left group hover:scale-[1.02] transition-transform">
                                <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center mb-4 border border-white group-hover:rotate-6 transition-transform", stat.color)}>
                                    <stat.icon className="h-6 w-6" />
                                </div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{stat.label}</p>
                                <p className="text-3xl font-black text-gray-900 tracking-tight">{stat.value}</p>
                            </div>
                        ))}
                    </div>

                    {/* Order History Table */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-gray-900">
                                {isSeller ? "Store Orders" : "Purchase History"}
                            </h3>
                            <Badge variant="secondary">{orders.length} Records</Badge>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50/50">
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Order ID</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">{isSeller ? "Customer" : "Store"}</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Amount</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {orders.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                                No orders found for this user.
                                            </td>
                                        </tr>
                                    ) : (
                                        orders.map((o) => (
                                            <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <span className="font-mono text-sm text-gray-900 font-medium">#{o.id}</span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-500">
                                                    {new Date(o.created_at).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                                    {isSeller ? o.customer_name || 'Anonymous' : o.seller_name || 'FairPrice Global'}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="font-bold text-gray-900">₦{o.amount.toLocaleString()}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <Badge className={
                                                        o.status === 'delivered' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' :
                                                            o.status === 'processing' ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' :
                                                                o.status === 'cancelled' ? 'bg-red-100 text-red-700 hover:bg-red-200' :
                                                                    'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                                    } variant="secondary">
                                                        {o.status}
                                                    </Badge>
                                                    {o.escrow_status && o.status !== 'cancelled' && (
                                                        <div className="text-[10px] mt-1 font-medium text-gray-400 uppercase">
                                                            Escrow: {o.escrow_status}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <Button variant="ghost" size="sm" className="text-gray-500 hover:text-indigo-600 font-medium">
                                                        Details
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Payout History (Sellers Only) */}
                    {isSeller && (() => {
                        const payouts = DemoStore.getPayouts().filter((p: any) => p.seller_id === id);
                        return (
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mt-8">
                                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                                    <h3 className="text-lg font-bold text-gray-900">Payout History</h3>
                                    <Badge variant="secondary">{payouts.length} Requests</Badge>
                                </div>
                                {payouts.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse min-w-[500px]">
                                            <thead>
                                                <tr className="bg-gray-50/50">
                                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Payout ID</th>
                                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Amount</th>
                                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Method</th>
                                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {payouts.map((p: any) => (
                                                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                                                        <td className="px-6 py-4 font-mono text-sm text-gray-900">{p.id}</td>
                                                        <td className="px-6 py-4 font-bold text-gray-900">₦{(p.amount || 0).toLocaleString()}</td>
                                                        <td className="px-6 py-4 text-sm text-gray-600">{p.method || 'Bank Transfer'} {p.bank ? `(${p.bank})` : ''}</td>
                                                        <td className="px-6 py-4">
                                                            <Badge className={cn(
                                                                p.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                                                                    p.status === 'processing' ? 'bg-amber-100 text-amber-700' :
                                                                        'bg-gray-100 text-gray-600'
                                                            )} variant="secondary">{p.status}</Badge>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            {p.status === 'processing' ? (
                                                                <div className="flex items-center justify-end gap-2">
                                                                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg h-8 px-3" onClick={() => {
                                                                        DemoStore.updatePayoutStatus(p.id, 'completed');
                                                                        DemoStore.addNotification({ userId: id, type: 'system', message: `Your payout of ₦${(p.amount || 0).toLocaleString()} has been approved and processed! 🎉`, link: '/seller/dashboard/payouts' });
                                                                        loadData();
                                                                    }}>Approve</Button>
                                                                    <Button size="sm" variant="outline" className="text-xs font-bold rounded-lg h-8 px-3 border-red-200 text-red-600 hover:bg-red-50" onClick={() => {
                                                                        DemoStore.updatePayoutStatus(p.id, 'rejected');
                                                                        DemoStore.addNotification({ userId: id, type: 'system', message: `Your payout request of ₦${(p.amount || 0).toLocaleString()} was not approved. Please contact support.`, link: '/seller/dashboard/payouts' });
                                                                        loadData();
                                                                    }}>Reject</Button>
                                                                </div>
                                                            ) : (
                                                                <span className="text-xs text-gray-400 font-medium">—</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="py-12 text-center text-gray-500">
                                        <DollarSign className="h-12 w-12 mx-auto text-gray-200 mb-3" />
                                        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">No Payout Requests</p>
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                </div>
            </div>
        </div>
    );
}
