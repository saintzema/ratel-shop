"use client";

import { useState, useEffect } from "react";
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
import { DemoStore } from "@/lib/demo-store";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function AdminDashboard() {
    const [stats, setStats] = useState<any>(null);
    const [complaints, setComplaints] = useState<any[]>([]);
    const [kycs, setKycs] = useState<any[]>([]);
    const [openDisputeCount, setOpenDisputeCount] = useState(0);
    const [recentReviews, setRecentReviews] = useState<any[]>([]);
    const [recentOrders, setRecentOrders] = useState<any[]>([]);

    const loadData = () => {
        setStats(DemoStore.getAdminStats());
        setComplaints(DemoStore.getComplaints().slice(0, 3));
        setKycs(DemoStore.getKYCSubmissions().filter((k: any) => k.status === "pending").slice(0, 3));
        setOpenDisputeCount(DemoStore.getDisputes().filter(d => !d.status.startsWith("resolved")).length);
        setRecentReviews(DemoStore.getReviews().slice(0, 5));
        setRecentOrders(DemoStore.getOrders().slice(0, 5));
    };

    useEffect(() => {
        loadData();
        window.addEventListener("storage", loadData);
        window.addEventListener("demo-store-update", loadData);
        return () => {
            window.removeEventListener("storage", loadData);
            window.removeEventListener("demo-store-update", loadData);
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
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                {cards.map((card) => (
                    <Link href={card.href} key={card.label} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 transition-all group block">
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
                            <span className="text-[10px] font-bold text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
                                View Details <ChevronRight className="h-3 w-3 ml-0.5" />
                            </span>
                        </div>
                    </Link>
                ))}
            </div>

            {/* Governance & Operations Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pending KYC Reviews */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
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
                                                    <p className="text-[11px] text-gray-400 font-bold uppercase">{kyc.id_type} Submission • {new Date(kyc.created_at).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => DemoStore.updateKYCStatus(kyc.id, "approved")}
                                                    className="h-8 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 font-bold text-[10px] uppercase"
                                                >
                                                    Approve
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => DemoStore.updateKYCStatus(kyc.id, "rejected")}
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
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
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
                                            <div className="flex items-center gap-2 opacity-0 group-[&:hover]:opacity-100 transition-opacity">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        DemoStore.updateComplaintStatus(c.id, "investigating");
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
                                                        DemoStore.updateComplaintStatus(c.id, "resolved");
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
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
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
                                            <span className="font-bold text-gray-900 text-sm">{review.title}</span>
                                        </div>
                                        <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">{review.body}</p>
                                        <div className="flex items-center gap-2 mt-2 text-[10px] font-bold text-gray-400 uppercase">
                                            <span>By {review.user_name}</span>
                                            <span>•</span>
                                            <span>Product ID: {review.product_id}</span>
                                            <span>•</span>
                                            <span>{new Date(review.created_at).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                if (confirm('Are you sure you want to delete this review?')) {
                                                    DemoStore.deleteReview(review.id);
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
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
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
                                    <th className="px-6 py-3">Customer</th>
                                    <th className="px-6 py-3">Product</th>
                                    <th className="px-6 py-3">Amount</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3">Shipping Info</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {recentOrders.map((order) => (
                                    <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4 font-mono text-xs text-gray-500">
                                            {order.id.split('_')[1]?.substring(0, 8) || order.id.substring(0, 8)}
                                        </td>
                                        <td className="px-6 py-4 font-bold text-gray-900">
                                            {order.customer_id.split('@')[0]}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 max-w-[200px] truncate">
                                            {order.product?.name || "Product"}
                                        </td>
                                        <td className="px-6 py-4 font-black text-gray-900">
                                            ₦{order.amount.toLocaleString()}
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
                                                            📍 {order.tracking_steps[order.tracking_steps.length - 1].location}
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-gray-400 italic text-[11px]">Awaiting Dispatch</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Quick Actions Footer */}
            <div className="bg-indigo-600 rounded-2xl p-10 text-white flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="text-center md:text-left">
                    <h3 className="text-2xl font-black tracking-tight">Platform Safety Mode</h3>
                    <p className="text-indigo-100/70 text-sm font-bold mt-1">Configure system-wide trust protocols and fee structures.</p>
                </div>
                <div className="flex flex-wrap justify-center gap-3">
                    <Button className="bg-white text-indigo-600 hover:bg-indigo-50 font-black rounded-2xl h-12 px-6">
                        System Configuration
                    </Button>
                    <Button variant="outline" className="bg-white/20 backdrop-blur-md border border-white/30 text-white hover:bg-white/30 hover:text-white font-black rounded-2xl h-12 px-6 transition-all">
                        Broadcast Update
                    </Button>
                </div>
            </div>
        </div>
    );
}
