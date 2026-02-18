"use client";

import { useEffect, useState } from "react";
import { Order, Seller } from "@/lib/types";
import { DemoStore } from "@/lib/demo-store";
import { DEMO_SELLER_STATS } from "@/lib/data";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Wallet, ArrowUpRight, Lock, ShieldCheck, CheckCircle,
    Clock, Building2, Pencil, X, Save
} from "lucide-react";

export default function PayoutsPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [seller, setSeller] = useState<Seller | undefined>();
    const [cashoutSuccess, setCashoutSuccess] = useState(false);
    const [editingBank, setEditingBank] = useState(false);
    const [bankName, setBankName] = useState("");
    const [accountNumber, setAccountNumber] = useState("");
    const [savingBank, setSavingBank] = useState(false);

    useEffect(() => {
        const sellerId = DemoStore.getCurrentSellerId();
        if (!sellerId) return;
        const loadData = () => {
            setOrders(DemoStore.getOrders().filter(o => o.seller_id === sellerId));
            const s = DemoStore.getCurrentSeller();
            setSeller(s);
            setBankName(s?.bank_name || "");
            setAccountNumber(s?.account_number || "");
        };
        loadData();
        window.addEventListener("storage", loadData);
        return () => window.removeEventListener("storage", loadData);
    }, []);

    const escrowAmount = orders.filter(o => o.escrow_status === "held").reduce((sum, o) => sum + (o.amount || 0), 0);
    const releasedAmount = orders.filter(o => o.escrow_status === "released").reduce((sum, o) => sum + (o.amount || 0), 0);
    const availableBalance = DEMO_SELLER_STATS.total_revenue - escrowAmount;

    const handleCashout = () => {
        setCashoutSuccess(true);
        setTimeout(() => setCashoutSuccess(false), 4000);
    };

    const handleSaveBank = async () => {
        if (!seller) return;
        setSavingBank(true);
        await new Promise(r => setTimeout(r, 800));
        DemoStore.updateSeller(seller.id, { bank_name: bankName, account_number: accountNumber });
        setSavingBank(false);
        setEditingBank(false);
    };

    const maskedAccount = seller?.account_number
        ? "**** **** " + seller.account_number.slice(-4)
        : "Not set";

    const payoutHistory = [
        { id: "pay_1", amount: 2500000, status: "completed", date: "Feb 5, 2026", method: "Bank Transfer" },
        { id: "pay_2", amount: 1800000, status: "completed", date: "Jan 28, 2026", method: "Bank Transfer" },
        { id: "pay_3", amount: 950000, status: "processing", date: "Feb 12, 2026", method: "Mobile Money" },
    ];

    return (
        <div className="space-y-6 max-w-4xl">
            <div>
                <h1 className="text-2xl font-black text-gray-900 tracking-tight">Payouts</h1>
                <p className="text-sm text-gray-500 mt-1">Manage your earnings and cashouts.</p>
            </div>

            {/* Balance cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div className="relative">
                        <div className="flex items-center gap-2 mb-1">
                            <Wallet className="h-4 w-4 text-emerald-200" />
                            <span className="text-xs font-bold text-emerald-200 uppercase tracking-wider">Available</span>
                        </div>
                        <h3 className="text-3xl font-black mt-2">{formatPrice(availableBalance)}</h3>
                        <p className="text-xs text-emerald-200 mt-1">Ready for withdrawal</p>
                        {cashoutSuccess ? (
                            <div className="flex items-center gap-2 mt-4 text-sm font-bold bg-white/20 px-4 py-2.5 rounded-xl">
                                <CheckCircle className="h-4 w-4" /> Cashout request submitted!
                            </div>
                        ) : (
                            <Button onClick={handleCashout} className="mt-4 w-full bg-white text-emerald-700 hover:bg-emerald-50 font-bold rounded-xl h-10 shadow-md">
                                <ArrowUpRight className="h-4 w-4 mr-2" /> Request Cashout
                            </Button>
                        )}
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                        <Lock className="h-4 w-4 text-amber-500" />
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">In Escrow</span>
                    </div>
                    <h3 className="text-3xl font-black text-amber-600 mt-2">{formatPrice(escrowAmount)}</h3>
                    <p className="text-xs text-gray-400 mt-1">Held until delivery confirmed</p>
                    <div className="mt-4 w-full bg-gray-100 rounded-full h-2">
                        <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${Math.min((escrowAmount / (DEMO_SELLER_STATS.total_revenue || 1)) * 100, 100)}%` }} />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-2">{orders.filter(o => o.escrow_status === "held").length} orders in escrow</p>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                        <ShieldCheck className="h-4 w-4 text-emerald-500" />
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Released</span>
                    </div>
                    <h3 className="text-3xl font-black text-emerald-600 mt-2">{formatPrice(releasedAmount)}</h3>
                    <p className="text-xs text-gray-400 mt-1">Successfully settled</p>
                    <div className="mt-4 w-full bg-gray-100 rounded-full h-2">
                        <div className="h-full bg-emerald-400 rounded-full transition-all" style={{ width: `${Math.min((releasedAmount / (DEMO_SELLER_STATS.total_revenue || 1)) * 100, 100)}%` }} />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-2">{orders.filter(o => o.escrow_status === "released").length} orders released</p>
                </div>
            </div>

            {/* Bank account — Editable */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="font-bold text-sm flex items-center gap-2 text-gray-900">
                        <Building2 className="h-4 w-4 text-gray-500" /> Payout Method
                    </h2>
                    {!editingBank && (
                        <Button variant="ghost" size="sm" onClick={() => setEditingBank(true)} className="text-xs gap-1.5 text-blue-600 hover:text-blue-700">
                            <Pencil className="h-3 w-3" /> Edit
                        </Button>
                    )}
                </div>

                {editingBank ? (
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Bank Name</label>
                            <Input value={bankName} onChange={e => setBankName(e.target.value)} placeholder="e.g. First Bank Nigeria" className="rounded-xl" />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Account Number</label>
                            <Input value={accountNumber} onChange={e => setAccountNumber(e.target.value)} placeholder="10-digit account number" maxLength={10} className="rounded-xl" />
                        </div>
                        <div className="flex gap-2 pt-2">
                            <Button onClick={handleSaveBank} disabled={savingBank || !bankName || !accountNumber} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-1.5 font-bold text-xs">
                                <Save className="h-3.5 w-3.5" /> {savingBank ? "Saving..." : "Save Changes"}
                            </Button>
                            <Button variant="ghost" onClick={() => { setEditingBank(false); setBankName(seller?.bank_name || ""); setAccountNumber(seller?.account_number || ""); }} className="rounded-xl text-xs gap-1.5">
                                <X className="h-3.5 w-3.5" /> Cancel
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-blue-100 rounded-xl flex items-center justify-center">
                                <Building2 className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="font-bold text-sm text-gray-900">{seller?.bank_name || "No bank set"}</p>
                                <p className="text-xs text-gray-400">{maskedAccount}</p>
                            </div>
                        </div>
                        <Badge className="bg-emerald-100 text-emerald-700 text-[10px] font-bold">
                            {seller?.bank_name ? "Verified" : "Not Set"}
                        </Badge>
                    </div>
                )}
            </div>

            {/* Payout History */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                    <h2 className="font-bold text-sm text-gray-900">Payout History</h2>
                </div>
                <div className="divide-y divide-gray-50">
                    {payoutHistory.map((payout) => (
                        <div key={payout.id} className="px-6 py-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`h-8 w-8 rounded-xl flex items-center justify-center ${payout.status === "completed" ? "bg-emerald-100" : "bg-amber-100"}`}>
                                    {payout.status === "completed" ? <CheckCircle className="h-4 w-4 text-emerald-600" /> : <Clock className="h-4 w-4 text-amber-600" />}
                                </div>
                                <div>
                                    <p className="font-bold text-sm text-gray-900">{formatPrice(payout.amount)}</p>
                                    <p className="text-[11px] text-gray-400">{payout.date} · {payout.method}</p>
                                </div>
                            </div>
                            <Badge variant="outline" className={`text-[10px] font-bold ${payout.status === "completed" ? "border-emerald-200 text-emerald-700 bg-emerald-50" : "border-amber-200 text-amber-700 bg-amber-50"}`}>
                                {payout.status === "completed" ? "Completed" : "Processing"}
                            </Badge>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
