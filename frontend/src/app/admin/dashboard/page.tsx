"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
    TrendingUp,
    Users,
    Package,
    ShieldAlert,
    ChevronRight,
    ExternalLink,
    Clock,
    CheckCircle2,
    XCircle,
    ArrowUpRight,
    ArrowDownRight,
    DollarSign,
    ShieldCheck,
    Zap,
    AlertTriangle,
    Star,
    Trash2
} from "lucide-react";
import { DataSyncService } from "@/lib/sync-store";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn, formatDateExact } from "@/lib/utils";
import { AdminProfitTable } from "@/components/admin/AdminProfitTable";

export default function AdminDashboard() {
    const router = useRouter();
    const [stats, setStats] = useState<any>(null);
    const [showBroadcastModal, setShowBroadcastModal] = useState(false);
    const [broadcastMessage, setBroadcastMessage] = useState("");
    const [complaints, setComplaints] = useState<any[]>([]);
    const [kycs, setKycs] = useState<any[]>([]);
    // A stale in-flight seller sync could resolve after an approve/reject click and
    // silently revert the seller back to "pending" in local cache — loadData() would
    // then bring the row right back with fresh Approve/Reject buttons, inviting a
    // second click on what looked like a totally new item. Track in-flight actions so
    // we can both disable the buttons and keep the row hidden regardless of what a
    // late-arriving sync does to the underlying seller record.
    const [processingKycIds, setProcessingKycIds] = useState<Set<string>>(new Set());
    // loadData() is registered on "storage"/"sync-store-update" listeners in a
    // useEffect with an empty dependency array, so it only ever sees the state from
    // the initial render — a ref is what actually stays current for it to read.
    const processingKycIdsRef = useRef<Set<string>>(new Set());
    const [openDisputeCount, setOpenDisputeCount] = useState(0);
    const [recentReviews, setRecentReviews] = useState<any[]>([]);
    const [recentOrders, setRecentOrders] = useState<any[]>([]);

    const loadData = () => {
        const dSort = (arr: any[], dateField = "created_at") =>
            arr.sort((a, b) => new Date(b[dateField] || 0).getTime() - new Date(a[dateField] || 0).getTime());

        setStats(DataSyncService.getAdminStats());

        // Refresh seller count from DB (localStorage may be stale if sellers joined recently)
        fetch("/api/sellers?all=true")
            .then(r => r.ok ? r.json() : null)
            .then((sellers: any) => {
                if (Array.isArray(sellers)) {
                    setStats((prev: any) => prev ? { ...prev, active_sellers: sellers.filter((s: any) => s.status === "active").length } : prev);
                }
            })
            .catch(() => {});

        // Escrow Balance / Processed Revenue / Total Orders were computed purely from
        // DataSyncService.getOrders() (local cache) — showing real ₦0 / 0 on any admin
        // session whose local order cache hadn't synced yet, even with real orders in the
        // DB (a fresh login, a cleared cache, or just orders syncing slower than sellers on
        // this page). Same fix as the seller-count refresh above: pull the real numbers
        // from the DB and overwrite the local-cache-derived defaults once they arrive.
        fetch("/api/orders?all=true")
            .then(r => r.ok ? r.json() : null)
            .then((data: any) => {
                const orders = Array.isArray(data) ? data : (data?.orders || []);
                if (Array.isArray(orders) && orders.length > 0) {
                    const isHeld = (s: string) => !s || s === "held" || s === "seller_confirmed" || s === "buyer_confirmed";
                    const escrowBalance = orders.filter((o: any) => isHeld(o.escrowStatus || o.escrow_status)).reduce((sum: number, o: any) => sum + (o.amount || 0), 0);
                    const processedRevenue = orders.filter((o: any) => (o.escrowStatus || o.escrow_status) === "released").reduce((sum: number, o: any) => sum + (o.amount || 0), 0);
                    setStats((prev: any) => prev ? { ...prev, escrow_balance: escrowBalance, processed_revenue: processedRevenue, total_orders: orders.length } : prev);
                }
            })
            .catch(() => {});

        // Governance: merge complaints + disputed/cancelled orders
        const rawComplaints = DataSyncService.getComplaints().filter((c: any) => !String(c.id).includes("FP-DEMO-ORD"));
        const allOrders = DataSyncService.getOrders().filter((o: any) => !String(o.id).includes("FP-DEMO"));
        const disputedOrders = allOrders
            .filter(o => o.escrow_status === "disputed" || (o.status as string) === "cancelled" || (o.status as string) === "disputed")
            .map(o => ({
                id: `dispute_${o.id}`,
                user_name: o.customer_name || o.customer_id,
                seller_name: o.product?.seller_name || "Unknown Seller",
                description: o.escrow_status === "disputed" ? `Dispute on order #${o.id.substring(0, 8)} — ${o.product?.name}` : `Cancelled order #${o.id.substring(0, 8)} — ${o.product?.name}`,
                status: "open",
                created_at: o.updated_at || o.created_at
            }));
        const mergedComplaints = [...rawComplaints, ...disputedOrders.filter(d => !rawComplaints.some(c => c.id === d.id))];
        setComplaints(dSort(mergedComplaints).slice(0, 5));

        // Trust & Verify: merge explicit KYC submissions + sellers with pending/unverified kyc_status
        const kycSubmissions = DataSyncService.getKYCSubmissions().filter((k: any) => k.status === "pending");
        const allSellers = DataSyncService.getSellers();
        const pendingSellers = allSellers
            .filter(s => (!s.kyc_status || (s.kyc_status as string) === "pending" || (s.kyc_status as string) === "submitted") && !kycSubmissions.some((k: any) => k.seller_id === s.id))
            .map(s => ({
                id: `kyc_auto_${s.id}`,
                seller_id: s.id,
                seller_name: s.business_name || s.owner_name || s.id,
                id_type: "Auto-detected",
                status: "pending" as const,
                submitted_at: s.created_at || new Date().toISOString(),
                created_at: s.created_at || new Date().toISOString()
            }));
        setKycs(prev => {
            const combined = dSort([...kycSubmissions, ...pendingSellers], "submitted_at").slice(0, 5);
            return combined.filter(k => !processingKycIdsRef.current.has(k.id));
        });

        const actualDisputes = DataSyncService.getDisputes().filter((d: any) => !String(d.order_id).includes("FP-DEMO"));
        setOpenDisputeCount(actualDisputes.filter(d => !d.status.startsWith("resolved")).length);
        setRecentReviews(dSort(DataSyncService.getReviews().filter((r: any) => !String(r.id).includes("FP-DEMO"))).slice(0, 5));
        setRecentOrders(dSort(allOrders).slice(0, 5));
    };

    const handleKycAction = (kycId: string, sellerId: string, status: "approved" | "rejected") => {
        if (processingKycIdsRef.current.has(kycId)) return; // already in flight — ignore a second click

        processingKycIdsRef.current.add(kycId);
        setProcessingKycIds(new Set(processingKycIdsRef.current));
        setKycs(prev => prev.filter(k => k.id !== kycId)); // optimistic removal, survives a stale sync

        // 1. If it's a real KYC submission (starts with kyc_), update it
        if (!kycId.startsWith("kyc_auto_")) {
            DataSyncService.updateKYCStatus(kycId, status);
        }

        // 2. Always update the underlying seller
        // SellerStatus enum: pending | active | frozen | banned
        const realStatus = status === "approved" ? "active" : "frozen";
        DataSyncService.updateSeller(sellerId, {
            kyc_status: status,
            verified: status === "approved",
            status: realStatus as any
        });

        loadData(); // refresh the rest of the dashboard's stats/lists
    };

    useEffect(() => {
        loadData();
        window.addEventListener("storage", loadData);
        window.addEventListener("sync-store-update", loadData);
        return () => {
            window.removeEventListener("storage", loadData);
            window.removeEventListener("sync-store-update", loadData);
        };
    }, []);

    if (!stats) return null;

    const cards = [
        {
            label: "Escrow Balance",
            value: `₦${stats.escrow_balance?.toLocaleString() || 0}`,
            change: "Held in Trust",
            up: true,
            icon: ShieldCheck,
            color: "amber",
            href: "/admin/escrow?filter=held"
        },
        {
            label: "Processed Revenue",
            value: `₦${stats.processed_revenue?.toLocaleString() || 0}`,
            change: "Released to Sellers",
            up: true,
            icon: DollarSign,
            color: "emerald",
            href: "/admin/escrow?filter=released"
        },
        {
            label: "Active Sellers",
            value: stats.active_sellers.toString(),
            change: "+3.2%",
            up: true,
            icon: Users,
            color: "indigo",
            href: "/admin/users"
        },
        {
            label: "Total Orders",
            value: stats.total_orders.toString(),
            change: "+18.4%",
            up: true,
            icon: Package,
            color: "blue",
            href: "/admin/orders"
        },
        {
            label: "Open Disputes",
            value: openDisputeCount.toString(),
            change: openDisputeCount > 0 ? "Action Needed" : "All Clear",
            up: openDisputeCount === 0,
            icon: AlertTriangle,
            color: "rose",
            href: "/admin/escrow?filter=disputed"
        },
    ];

    return (
        <div className="space-y-6 max-w-6xl">
            {DataSyncService.isDbOffline() && (
                <div className="bg-rose-50 border border-rose-100 rounded-3xl p-6 flex items-center justify-between shadow-lg shadow-rose-900/5 animate-pulse">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-600">
                            <ShieldAlert className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="font-black text-rose-900 tracking-tight">Database Offline / Quota Exceeded</h3>
                            <p className="text-sm text-rose-600/80 font-medium">Platform is running on local cache. Live updates and some admin features are temporarily restricted.</p>
                        </div>
                    </div>
                    <Button 
                        variant="outline" 
                        onClick={() => DataSyncService.syncWithDB(undefined, true)}
                        className="bg-white border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl font-bold"
                    >
                        Retry Connection
                    </Button>
                </div>
            )}

            {/* Welcome Header */}
            <div>
                <h1 className="text-2xl font-black text-gray-900 tracking-tight">
                    Welcome back, Superadmin 👋
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                    System Overview &amp; Real-time platform performance
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {cards.map((card) => (
                    <Link href={card.href} key={card.label} className="bg-white/40 backdrop-blur-xl p-6 rounded-3xl border border-white/50 shadow-xl shadow-green-900/10 hover:shadow-2xl hover:shadow-green-900/20 hover:-translate-y-1 transition-all group block relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent pointer-events-none" />
                        <div className="relative z-10">
                        <div className="flex items-start justify-between mb-4">
                            <div className={cn(
                                "p-3 rounded-xl",
                                card.color === "indigo" ? "bg-indigo-50 text-indigo-600" :
                                    card.color === "emerald" ? "bg-emerald-50 text-emerald-600" :
                                        card.color === "blue" ? "bg-blue-50 text-blue-600" :
                                            card.color === "rose" ? "bg-rose-50 text-rose-600" :
                                                "bg-amber-50 text-amber-600"
                            )}>
                                <card.icon className="h-5 w-5" />
                            </div>
                            <div className={cn(
                                "flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-full",
                                card.up ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                            )}>
                                {card.up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                                {card.change}
                            </div>
                        </div>
                        <h3 className="text-gray-500 text-xs font-bold uppercase tracking-widest">{card.label}</h3>
                        <div className="flex items-end justify-between mt-1">
                            <p className="text-2xl font-black text-gray-900">{card.value}</p>
                            <span className="text-[10px] font-bold text-emerald-600 transition-opacity flex items-center">
                                View Details <ChevronRight className="h-3 w-3 ml-0.5" />
                            </span>
                        </div>
                        </div>
                    </Link>
                ))}
            </div>

            {/* Governance & Operations Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pending KYC Reviews */}
                <div className="bg-white/40 backdrop-blur-xl rounded-3xl border border-white/50 shadow-xl shadow-green-900/10 overflow-hidden flex flex-col relative">
                    <div className="absolute inset-0 bg-gradient-to-b from-white/40 to-transparent pointer-events-none" />
                    <div className="relative z-10 p-6 border-b border-white/30 flex items-center justify-between bg-white/20">
                        <div>
                            <h3 className="text-lg font-black text-gray-900 tracking-tight">Trust &amp; Verify</h3>
                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-0.5">Pending Seller Onboarding</p>
                        </div>
                        <Link href="/admin/governance">
                            <Button variant="ghost" size="sm" className="text-xs font-bold text-indigo-600 hover:text-indigo-700">
                                View All <ChevronRight className="ml-1 h-3 w-3" />
                            </Button>
                        </Link>
                    </div>
                    <div className="flex-1 p-2">
                        {kycs.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center p-12 text-center">
                                <CheckCircle2 className="h-12 w-12 text-emerald-500 mb-4 opacity-20" />
                                <p className="text-sm font-bold text-gray-400">All caught up! No KYC pending.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-50">
                                {kycs.map((kyc) => (
                                    <div key={kyc.id} className="p-6 hover:bg-gray-50 transition-colors group">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-lg">
                                                    {kyc.seller_name.charAt(0)}
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-gray-900 text-sm">{kyc.seller_name}</h4>
                                                    <p className="text-[11px] text-gray-400 font-bold uppercase">
                                                        {kyc.id_type} Submission • {kyc.created_at ? new Date(kyc.created_at).toLocaleDateString() : "Pending"}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => handleKycAction(kyc.id, kyc.seller_id, "approved")}
                                                    className="h-8 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 font-bold text-[10px] uppercase"
                                                >
                                                    Approve
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => handleKycAction(kyc.id, kyc.seller_id, "rejected")}
                                                    className="h-8 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 font-bold text-[10px] uppercase"
                                                >
                                                    Reject
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Dispute Resolution Center */}
                <div className="bg-white/40 backdrop-blur-xl rounded-3xl border border-white/50 shadow-xl shadow-green-900/10 overflow-hidden flex flex-col relative">
                    <div className="absolute inset-0 bg-gradient-to-b from-white/40 to-transparent pointer-events-none" />
                    <div className="relative z-10 p-6 border-b border-white/30 flex items-center justify-between bg-white/20">
                        <div>
                            <h3 className="text-lg font-black text-gray-900 tracking-tight">Governance</h3>
                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-0.5">Active Marketplace Disputes</p>
                        </div>
                        <Link href="/admin/governance">
                            <Button variant="ghost" size="sm" className="text-xs font-bold text-rose-600 hover:text-rose-700">
                                View Cases <ExternalLink className="ml-1.5 h-3 w-3" />
                            </Button>
                        </Link>
                    </div>
                    <div className="flex-1 p-2">
                        {complaints.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center p-12 text-center">
                                <Zap className="h-12 w-12 text-indigo-500 mb-4 opacity-20" />
                                <p className="text-sm font-bold text-gray-400">Zero disputes. Excellent trust score!</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-50">
                                {complaints.map((c) => (
                                    <div key={c.id} className="p-6 hover:bg-gray-50 transition-colors">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1.5">
                                                    <span className={cn(
                                                        "text-[9px] font-black uppercase px-2 py-0.5 rounded-full",
                                                        c.status === "open" ? "bg-rose-100 text-rose-600" : "bg-amber-100 text-amber-600"
                                                    )}>
                                                        {c.status}
                                                    </span>
                                                    <span className="text-[10px] text-gray-300 font-bold">#{c.id}</span>
                                                </div>
                                                <h4 className="font-bold text-gray-900 text-sm truncate">{c.description}</h4>
                                                <p className="text-[11px] text-gray-400 font-bold uppercase mt-1">From: {c.user_name} • Target: {c.seller_name}</p>
                                            </div>
                                            <div className="flex items-center gap-2 transition-opacity">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        DataSyncService.updateComplaintStatus(c.id, "investigating");
                                                        // Navigate to the appropriate page
                                                        if (c.id.startsWith('dispute_')) {
                                                            const orderId = c.id.replace('dispute_', '');
                                                            router.push(`/admin/escrow?filter=disputed&order=${orderId}`);
                                                        } else {
                                                            router.push('/admin/governance');
                                                        }
                                                    }}
                                                    className="h-8 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-bold text-[10px] uppercase"
                                                >
                                                    Investigate
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        DataSyncService.updateComplaintStatus(c.id, "resolved");
                                                    }}
                                                    className="h-8 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 font-bold text-[10px] uppercase"
                                                >
                                                    Resolve
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Recent Reviews Management */}
            <div className="bg-white/40 backdrop-blur-xl rounded-3xl border border-white/50 shadow-xl shadow-green-900/10 overflow-hidden flex flex-col relative">
                <div className="absolute inset-0 bg-gradient-to-b from-white/40 to-transparent pointer-events-none" />
                <div className="relative z-10 p-6 border-b border-white/30 flex items-center justify-between bg-white/20">
                    <div>
                        <h3 className="text-lg font-black text-gray-900 tracking-tight">Recent Product Reviews</h3>
                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-0.5">Monitor & Moderate</p>
                    </div>
                </div>
                <div className="p-2">
                    {recentReviews.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center p-12 text-center">
                            <Star className="h-12 w-12 text-gray-300 mb-4 opacity-50" />
                            <p className="text-sm font-bold text-gray-400">No reviews have been posted yet.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-50">
                            {recentReviews.map((review) => (
                                <div key={review.id} className="p-6 hover:bg-gray-50 transition-colors group flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className="flex items-center gap-0.5">
                                                {[1, 2, 3, 4, 5].map(s => (
                                                    <Star key={s} className={`h-3 w-3 ${s <= review.rating ? "text-amber-400 fill-current" : "text-gray-200"}`} />
                                                ))}
                                            </div>
                                            <span className="font-bold text-gray-900 text-sm">{review.title || `${review.rating}-Star Review`}</span>
                                        </div>
                                        <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">{review.body || review.comment || "No written review"}</p>
                                        <div className="flex items-center gap-2 mt-2 text-[10px] font-bold text-gray-400 uppercase">
                                            <span>By {review.user_name}</span>
                                            <span>•</span>
                                            <span>{(() => { const p = DataSyncService.getProducts().find(p => p.id === review.product_id); return p?.name || review.product_id; })()}</span>
                                            <span>•</span>
                                            <span>{review.created_at ? new Date(review.created_at).toLocaleDateString() : "N/A"}</span>
                                        </div>
                                    </div>
                                    <div className="transition-opacity shrink-0">
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                if (confirm('Are you sure you want to delete this review?')) {
                                                    DataSyncService.deleteReview(review.id);
                                                }
                                            }}
                                            className="h-8 w-8 p-0 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 font-bold"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Recent Platform Orders */}
            <div className="bg-white/40 backdrop-blur-xl rounded-3xl border border-white/50 shadow-xl shadow-green-900/10 overflow-hidden flex flex-col relative">
                <div className="absolute inset-0 bg-gradient-to-b from-white/40 to-transparent pointer-events-none" />
                <div className="relative z-10 p-6 border-b border-white/30 flex items-center justify-between bg-white/20">
                    <div>
                        <h3 className="text-lg font-black text-gray-900 tracking-tight">Recent Platform Orders</h3>
                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-0.5">Global Trading Activity</p>
                    </div>
                    <Link href="/admin/orders">
                        <Button variant="ghost" size="sm" className="text-xs font-bold text-indigo-600 hover:text-indigo-700">
                            View All <ChevronRight className="ml-1 h-3 w-3" />
                        </Button>
                    </Link>
                </div>
                <div className="p-0 overflow-x-auto">
                    {recentOrders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-12 text-center">
                            <Package className="h-12 w-12 text-gray-300 mb-4 opacity-50" />
                            <p className="text-sm font-bold text-gray-400">No orders processed yet.</p>
                        </div>
                    ) : (
                        <table className="w-full text-left text-sm border-collapse">
                            <thead>
                                <tr className="bg-gray-50 text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-100">
                                    <th className="px-6 py-3">Order ID</th>
                                    <th className="px-6 py-3">Date</th>
                                    <th className="px-6 py-3">Customer</th>
                                    <th className="px-6 py-3">Product</th>
                                    <th className="px-6 py-3">Amount</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3">Shipping Info</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {recentOrders.map((order) => {
                                    const buyer = DataSyncService.getUser(order.customer_id);
                                    const buyerName = buyer?.name || buyer?.email?.split('@')[0] || order.customer_name || order.customer_id?.split('@')[0] || "Customer";

                                    return (
                                        <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4 font-mono text-xs text-gray-500">
                                                {order.id.split('_')[1]?.substring(0, 8) || order.id.substring(0, 8)}
                                            </td>
                                            <td className="px-6 py-4 text-[11px] text-gray-500 whitespace-nowrap">
                                                {formatDateExact(order.created_at)}
                                            </td>
                                            <td className="px-6 py-4 font-bold text-gray-900">
                                                {buyerName}
                                            </td>
                                            <td className="px-6 py-4 text-gray-600 max-w-[200px] truncate">
                                                {order.product?.name || "Product"}
                                            </td>
                                            <td className="px-6 py-4 font-black text-gray-900">
                                                ₦{(order.amount || 0).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={cn(
                                                    "text-[10px] font-black uppercase px-2 py-1 rounded-full",
                                                    order.status === 'delivered' ? "bg-emerald-100 text-emerald-700" :
                                                        order.status === 'shipped' ? "bg-blue-100 text-blue-700" :
                                                            "bg-amber-100 text-amber-700"
                                                )}>
                                                    {order.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-xs">
                                                {order.status === 'shipped' || order.status === 'delivered' ? (
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="font-bold text-gray-900">{order.carrier || "Standard"}</span>
                                                        <span className="text-[10px] text-gray-400 font-mono tracking-wider">{order.tracking_id || "N/A"}</span>
                                                        {order.tracking_steps && order.tracking_steps.length > 0 && (
                                                            <span className="text-[10px] text-indigo-500 font-bold mt-1">
                                                                📍 {order.tracking_steps[order.tracking_steps.length - 1]?.location || "Processing"}
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 italic text-[11px]">Awaiting Dispatch</span>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Quick Actions Footer */}
            <div className="bg-emerald-600 rounded-3xl p-10 text-white flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-tr from-emerald-800/40 via-transparent to-white/20 pointer-events-none" />
                <div className="relative z-10 text-center md:text-left">
                    <h3 className="text-2xl font-black tracking-tight">Platform Safety Mode</h3>
                    <p className="text-indigo-100/70 text-sm font-bold mt-1">Configure system-wide trust protocols and fee structures.</p>
                </div>
                <div className="flex flex-wrap justify-center gap-3">
                    <Button 
                        onClick={() => {
                            const sent = DataSyncService.simulateWhatsAppFollowups();
                            alert(`Simulated WhatsApp follow-up SMS triggered for ${sent} abandoned negotiations.`);
                        }}
                        className="bg-white text-indigo-600 hover:bg-indigo-50 font-black rounded-2xl h-12 px-6"
                    >
                        Trigger WhatsApp Hook
                    </Button>
                    <Button 
                        variant="outline" 
                        onClick={() => setShowBroadcastModal(true)}
                        className="bg-white/20 backdrop-blur-md border border-white/30 text-white hover:bg-white/30 hover:text-white font-black rounded-2xl h-12 px-6 transition-all"
                    >
                        Broadcast Update
                    </Button>
                </div>
            </div>

            {/* Admin Profit Ledger */}
            <AdminProfitTable />

            {/* Broadcast Modal */}
            {showBroadcastModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <h3 className="text-lg font-black text-gray-900">System Broadcast</h3>
                            <button onClick={() => setShowBroadcastModal(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                                <XCircle className="h-5 w-5 text-gray-500" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="text-xs font-bold uppercase text-gray-400">Message</label>
                                <textarea
                                    className="w-full mt-1.5 p-3 rounded-xl border border-gray-200 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all text-sm font-medium resize-none min-h-[100px]"
                                    placeholder="Enter update message to broadcast to all sellers..."
                                    value={broadcastMessage}
                                    onChange={e => setBroadcastMessage(e.target.value)}
                                    autoFocus
                                />
                            </div>
                            <Button
                                onClick={() => {
                                    if (!broadcastMessage.trim()) return;
                                    const sellers = DataSyncService.getSellers();
                                    sellers.forEach(s => {
                                        DataSyncService.addNotification({
                                            userId: s.user_id || s.id,
                                            type: "system",
                                            message: `📢 System Update: ${broadcastMessage}`,
                                            link: "/seller/dashboard"
                                        });
                                    });
                                    alert(`Broadcast sent to ${sellers.length} sellers successfully.`);
                                    setShowBroadcastModal(false);
                                    setBroadcastMessage("");
                                }}
                                className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm"
                            >
                                Send Broadcast 🚀
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
