"use client";

import { useState, useEffect } from "react";
import { DataSyncService } from "@/lib/sync-store";
import { Wallet, ShieldCheck, Truck, TrendingUp, Award } from "lucide-react";
import { calculateTieredEscrowFee } from "@/lib/escrow-utils"

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
        // getOrders()/getSellers() only ever read the local per-device cache — any
        // seller/order this admin session hasn't synced locally (very likely on a
        // fresh login, or after other admins/sellers made changes elsewhere) was
        // silently missing from this ledger, understating every figure below it,
        // subscriptions especially since it only takes one seller record to miss.
        const authHeaders = (): Record<string, string> => {
            const token = typeof window !== "undefined" ? localStorage.getItem("fp_token") : null;
            return token ? { Authorization: `Bearer ${token}` } : {};
        };

        const load = async () => {
            let allOrders: any[] = DataSyncService.getOrders().filter((o: any) => !String(o.id).includes("FP-DEMO"));
            let sellers: any[] = DataSyncService.getSellers();

            try {
                const [ordersRes, sellersRes] = await Promise.all([
                    fetch("/api/orders?all=true", { headers: authHeaders() }),
                    fetch("/api/sellers?all=true", { headers: authHeaders() }),
                ]);
                if (ordersRes.ok) {
                    const data = await ordersRes.json();
                    const dbOrders = Array.isArray(data) ? data : (data?.orders || []);
                    if (Array.isArray(dbOrders) && dbOrders.length > 0) {
                        allOrders = dbOrders.filter((o: any) => !String(o.id).includes("FP-DEMO"));
                    }
                }
                if (sellersRes.ok) {
                    const data = await sellersRes.json();
                    const dbSellers = Array.isArray(data) ? data : (data?.sellers || []);
                    if (Array.isArray(dbSellers) && dbSellers.length > 0) {
                        sellers = dbSellers;
                    }
                }
            } catch { /* fall back to local cache above if the DB fetch fails */ }

            let escrowSum = 0;
            let deliverySum = 0;

            allOrders.forEach(o => {
                // Approximate escrow fee
                escrowSum += calculateTieredEscrowFee(o.amount);

                // Approximate delivery revenue
                if (o.delivery_method !== "pickup") {
                    deliverySum += Number(localStorage.getItem("fp_doorstep_fee")) || 4000;
                }
            });

            // Subscription revenue is an ESTIMATE of current recurring revenue (active
            // plan x flat monthly rate, summed once per seller) — the platform doesn't
            // persist a real payment ledger for subscription upgrades (the Paystack
            // webhook only flips subscriptionPlan/planExpiryDate on the Seller row, it
            // never writes a transaction record), so an accurate historical total isn't
            // computable from current data without adding one.
            let subsSum = 0;
            sellers.forEach((s: any) => {
                const plan = (s.subscription_plan || s.subscriptionPlan || "Starter").toLowerCase();
                if (plan === "pro") subsSum += 12000;
                else if (plan === "growth") subsSum += 35000;
                else if (plan === "scale") subsSum += 100000;
            });

            setProfitData({
                escrowRevenue: escrowSum,
                deliveryRevenue: deliverySum,
                subscriptionRevenue: subsSum,
                totalOrders: allOrders.length
            });
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
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5" title="Estimated monthly recurring revenue from sellers currently on a paid plan — not a historical payment ledger.">
                            Subscriptions (Est. Monthly)
                        </p>
                        <p className="text-lg font-black text-gray-900">₦{profitData.subscriptionRevenue.toLocaleString()}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
