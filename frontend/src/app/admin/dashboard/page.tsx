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
    Zap
} from "lucide-react";
import { DemoStore } from "@/lib/demo-store";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function AdminDashboard() {
    const [stats, setStats] = useState<any>(null);
    const [complaints, setComplaints] = useState<any[]>([]);
    const [kycs, setKycs] = useState<any[]>([]);

    useEffect(() => {
        const loadData = () => {
            setStats(DemoStore.getAdminStats());
            setComplaints(DemoStore.getComplaints().slice(0, 3));
            setKycs(DemoStore.getKYCSubmissions().filter((k: any) => k.status === "pending").slice(0, 3));
        };

        loadData();
        window.addEventListener("storage", loadData);
        return () => window.removeEventListener("storage", loadData);
    }, []);

    if (!stats) return null;

    const cards = [
        {
            label: "Escrow Balance",
            value: `₦${stats.escrow_balance?.toLocaleString() || 0}`,
            change: "Held in Trust",
            up: true,
            icon: ShieldCheck,
            color: "amber"
        },
        {
            label: "Processed Revenue",
            value: `₦${stats.processed_revenue?.toLocaleString() || 0}`,
            change: "Released to Sellers",
            up: true,
            icon: DollarSign,
            color: "emerald"
        },
        {
            label: "Active Sellers",
            value: stats.active_sellers.toString(),
            change: "+3.2%",
            up: true,
            icon: Users,
            color: "indigo"
        },
        {
            label: "Total Orders",
            value: stats.total_orders.toString(),
            change: "+18.4%",
            up: true,
            icon: Package,
            color: "blue"
        },
    ];

    return (
        <div className="space-y-10">
            {/* Hero Stats Section */}
            <div>
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 tracking-tight">System Overview</h2>
                        <p className="text-sm text-gray-500 font-bold uppercase tracking-wider mt-1">Real-time platform performance</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                    {cards.map((card) => (
                        <div key={card.label} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 transition-all group">
                            <div className="flex items-start justify-between mb-4">
                                <div className={cn(
                                    "p-3 rounded-2xl",
                                    card.color === "indigo" ? "bg-indigo-50 text-indigo-600" :
                                        card.color === "emerald" ? "bg-emerald-50 text-emerald-600" :
                                            card.color === "blue" ? "bg-blue-50 text-blue-600" :
                                                "bg-rose-50 text-rose-600"
                                )}>
                                    <card.icon className="h-6 w-6" />
                                </div>
                                <div className={cn(
                                    "flex items-center gap-1 text-[11px] font-black px-2 py-1 rounded-full",
                                    card.up ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                                )}>
                                    {card.up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                                    {card.change}
                                </div>
                            </div>
                            <h3 className="text-gray-500 text-xs font-black uppercase tracking-widest">{card.label}</h3>
                            <p className="text-3xl font-black text-gray-900 mt-1 group-hover:scale-105 transition-transform origin-left">{card.value}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Governance & Operations Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Pending KYC Reviews */}
                <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                        <div>
                            <h3 className="text-lg font-black text-gray-900 tracking-tight">Trust & Verify</h3>
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

                {/* Dispute Resolution Resolution Center Center */}
                <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
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
                                            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-2xl bg-gray-50 flex-shrink-0">
                                                <ChevronRight className="h-5 w-5 text-gray-400" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Quick Actions Footer */}
            <div className="bg-indigo-600 rounded-[32px] p-10 text-white flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="text-center md:text-left">
                    <h3 className="text-2xl font-black tracking-tight">Platform Safety Mode</h3>
                    <p className="text-indigo-100/70 text-sm font-bold mt-1">Configure system-wide trust protocols and fee structures.</p>
                </div>
                <div className="flex flex-wrap justify-center gap-3">
                    <Button className="bg-white text-indigo-600 hover:bg-indigo-50 font-black rounded-2xl h-12 px-6">
                        System Configuration
                    </Button>
                    <Button variant="outline" className="border-indigo-400/50 text-white hover:bg-indigo-500 font-black rounded-2xl h-12 px-6">
                        Broadcast Update
                    </Button>
                </div>
            </div>
        </div>
    );
}
