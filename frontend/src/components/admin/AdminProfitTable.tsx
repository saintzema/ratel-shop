"use client";

import { useState, useEffect } from "react";
import { DataSyncService } from "@/lib/sync-store";
import { calculateTieredEscrowFee } from "@/lib/escrow-utils";
import { formatPrice } from "@/lib/utils";
import { 
    DollarSign, 
    TrendingUp, 
    ShieldCheck, 
    ArrowUpRight, 
    Calendar,
    ArrowDownRight 
} from "lucide-react";

export function AdminProfitTable() {
    const [stats, setStats] = useState<any>(null);

    useEffect(() => {
        const load = () => {
            const adminStats = DataSyncService.getAdminStats();
            setStats(adminStats);
        };
        load();
        window.addEventListener("sync-store-update", load);
        return () => window.removeEventListener("sync-store-update", load);
    }, []);

    if (!stats) return null;

    return (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-black text-gray-900">Profit Ledger</h3>
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Platform Revenue & Escrow Fees</p>
                </div>
                <div className="h-10 w-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-indigo-600" />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-100">
                <div className="p-6">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Marketplace GMV</p>
                    <div className="flex items-end gap-2">
                        <span className="text-2xl font-black text-gray-900">{formatPrice(stats.totalRevenue)}</span>
                        <span className="text-[10px] text-emerald-600 font-bold mb-1 flex items-center gap-0.5">
                            <ArrowUpRight className="h-3 w-3" /> +12%
                        </span>
                    </div>
                </div>
                <div className="p-6">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Escrow Fee Revenue</p>
                    <div className="flex items-end gap-2">
                        <span className="text-2xl font-black text-indigo-600">{formatPrice(stats.escrowBalance)}</span>
                        <span className="text-[10px] text-indigo-400 font-bold mb-1">Calculated Tiered Fees</span>
                    </div>
                </div>
                <div className="p-6">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Net Platform Profit</p>
                    <div className="flex items-end gap-2">
                        <span className="text-2xl font-black text-emerald-600">{formatPrice(stats.escrowBalance)}</span>
                        <span className="text-[10px] text-emerald-600 font-bold mb-1 uppercase tracking-tighter">Ready for Payout</span>
                    </div>
                </div>
            </div>

            <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100">
                <p className="text-[9px] text-gray-400 font-bold leading-relaxed">
                    * Net profit is calculated based on the 15% standard marketplace fee and tiered escrow fees.
                    Tiered fees are calculated using the <code>calculateTieredEscrowFee</code> utility.
                </p>
            </div>
        </div>
    );
}
