"use client";

import { useState, useEffect } from "react";
import { Wallet, ShieldCheck, Truck, TrendingUp, Award } from "lucide-react";

export const AdminProfitTable = () => {
    const [profitData, setProfitData] = useState<{
        escrowRevenue: number;
        deliveryRevenue: number;
        subscriptionRevenue: number;
        totalOrders: number;
    }>({
        escrowRevenue: 0,
        deliveryRevenue: 0,
        subscriptionRevenue: 0,
        totalOrders: 0
    });

    useEffect(() => {
        // Previously computed from DataSyncService.getOrders()/getSellers() — the local
        // browser cache, capped at 200 orders (the /api/orders "all=true" safety limit)
        // and prone to being emptied entirely by a localStorage-quota "nuclear clear".
        // That's why this could show wrong/stale figures instead of the platform's real
        // totals. Now backed by a real DB aggregate at /api/admin/profit-ledger.
        const load = async () => {
            try {
                const token = typeof window !== "undefined" ? localStorage.getItem("fp_token") : null;
                const res = await fetch("/api/admin/profit-ledger", {
                    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                });
                if (!res.ok) return;
                const data = await res.json();
                setProfitData({
                    escrowRevenue: data.escrowRevenue || 0,
                    deliveryRevenue: data.deliveryRevenue || 0,
                    subscriptionRevenue: data.subscriptionRevenue || 0,
                    totalOrders: data.totalOrders || 0,
                });
            } catch { /* keep last-known values on transient failure */ }
        };
        load();
        window.addEventListener("sync-store-update", load);
        window.addEventListener("storage", load);
        return () => {
            window.removeEventListener("sync-store-update", load);
            window.removeEventListener("storage", load);
        };
    }, []);

    const totalProfit = profitData.escrowRevenue + profitData.deliveryRevenue + profitData.subscriptionRevenue;

    return (
        <div className="bg-white/40 backdrop-blur-xl rounded-3xl border border-white/50 shadow-xl shadow-green-900/10 overflow-hidden flex flex-col relative mt-6">
            <div className="absolute inset-0 bg-gradient-to-b from-white/40 to-transparent pointer-events-none" />
            <div className="relative z-10 p-6 border-b border-white/30 flex items-center justify-between bg-white/20">
                <div>
                    <h3 className="text-lg font-black text-gray-900 tracking-tight">Admin Profit Ledger</h3>
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-0.5">Platform Revenue Breakdown</p>
                </div>
                <div className="text-right">
                    <p className="text-sm font-bold text-gray-500">Total Profit</p>
                    <p className="text-xl font-black text-emerald-600">₦{totalProfit.toLocaleString()}</p>
                </div>
            </div>
            
            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
                {/* Escrow Fee Revenue */}
                <div className="bg-white/60 rounded-2xl p-4 border border-white/70 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
                    <div className="h-12 w-12 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
                        <ShieldCheck className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">Escrow Fees</p>
                        <p className="text-lg font-black text-gray-900">₦{profitData.escrowRevenue.toLocaleString()}</p>
                    </div>
                </div>

                {/* Logistics Revenue */}
                <div className="bg-white/60 rounded-2xl p-4 border border-white/70 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
                    <div className="h-12 w-12 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center shrink-0">
                        <Truck className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">Logistics Fees</p>
                        <p className="text-lg font-black text-gray-900">₦{profitData.deliveryRevenue.toLocaleString()}</p>
                    </div>
                </div>

                {/* Subscriptions Revenue */}
                <div className="bg-white/60 rounded-2xl p-4 border border-white/70 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
                    <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <Award className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">Subscriptions</p>
                        <p className="text-lg font-black text-gray-900">₦{profitData.subscriptionRevenue.toLocaleString()}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
