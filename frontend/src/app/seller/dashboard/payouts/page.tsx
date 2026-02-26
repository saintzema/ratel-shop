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
    Clock, Building2, Pencil, X, Save, Download, FileText
} from "lucide-react";

export default function PayoutsPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [seller, setSeller] = useState<Seller | undefined>();
    const [cashoutSuccess, setCashoutSuccess] = useState(false);
    const [editingBank, setEditingBank] = useState(false);
    const [bankName, setBankName] = useState("");
    const [accountNumber, setAccountNumber] = useState("");
    const [accountName, setAccountName] = useState("");
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
            setAccountName(s?.account_name || "");
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
        DemoStore.updateSeller(seller.id, { bank_name: bankName, account_number: accountNumber, account_name: accountName });
        setSavingBank(false);
        setEditingBank(false);
    };

    const maskedAccount = seller?.account_number
        ? "**** **** " + seller.account_number.slice(-4)
        : "Not set";

    const payoutHistory = [
        { id: "pay_1", amount: 2500000, status: "completed", date: "Feb 5, 2026", method: "Bank Transfer", txId: "TXN-982374-ABCD" },
        { id: "pay_2", amount: 1800000, status: "completed", date: "Jan 28, 2026", method: "Bank Transfer", txId: "TXN-102938-WXYZ" },
        { id: "pay_3", amount: 950000, status: "processing", date: "Feb 12, 2026", method: "Mobile Money", txId: "TXN-PENDING-456" },
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
                            <select
                                value={bankName}
                                onChange={e => setBankName(e.target.value)}
                                className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            >
                                <option value="">Select Bank</option>
                                <option value="Access Bank">Access Bank</option>
                                <option value="Citibank Nigeria">Citibank Nigeria</option>
                                <option value="Ecobank Nigeria">Ecobank Nigeria</option>
                                <option value="Fidelity Bank">Fidelity Bank</option>
                                <option value="First Bank of Nigeria">First Bank of Nigeria</option>
                                <option value="First City Monument Bank">First City Monument Bank</option>
                                <option value="Globus Bank">Globus Bank</option>
                                <option value="Guaranty Trust Bank (GTB)">Guaranty Trust Bank (GTB)</option>
                                <option value="Heritage Bank">Heritage Bank</option>
                                <option value="Keystone Bank">Keystone Bank</option>
                                <option value="Kuda Bank">Kuda Bank</option>
                                <option value="Moniepoint">Moniepoint</option>
                                <option value="Opay">Opay</option>
                                <option value="Palmpay">Palmpay</option>
                                <option value="Polaris Bank">Polaris Bank</option>
                                <option value="Providus Bank">Providus Bank</option>
                                <option value="Stanbic IBTC Bank">Stanbic IBTC Bank</option>
                                <option value="Standard Chartered">Standard Chartered</option>
                                <option value="Sterling Bank">Sterling Bank</option>
                                <option value="SunTrust Bank">SunTrust Bank</option>
                                <option value="Titan Trust Bank">Titan Trust Bank</option>
                                <option value="Union Bank of Nigeria">Union Bank of Nigeria</option>
                                <option value="United Bank for Africa (UBA)">United Bank for Africa (UBA)</option>
                                <option value="Unity Bank">Unity Bank</option>
                                <option value="Wema Bank">Wema Bank</option>
                                <option value="Zenith Bank">Zenith Bank</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Account Number</label>
                            <Input value={accountNumber} onChange={e => setAccountNumber(e.target.value)} placeholder="10-digit account number" maxLength={10} className="rounded-xl" />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Account Name</label>
                            <Input value={accountName} onChange={e => setAccountName(e.target.value)} placeholder="E.g. John Doe / Business Name" className="rounded-xl" />
                        </div>
                        <div className="flex gap-2 pt-2">
                            <Button onClick={handleSaveBank} disabled={savingBank || !bankName || !accountNumber || !accountName} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-1.5 font-bold text-xs">
                                <Save className="h-3.5 w-3.5" /> {savingBank ? "Saving..." : "Save Changes"}
                            </Button>
                            <Button variant="ghost" onClick={() => { setEditingBank(false); setBankName(seller?.bank_name || ""); setAccountNumber(seller?.account_number || ""); setAccountName(seller?.account_name || ""); }} className="rounded-xl text-xs gap-1.5">
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
                                <p className="text-xs text-gray-400 font-medium">{seller?.account_name ? seller.account_name : "No account name"}</p>
                                <p className="text-xs text-gray-400">{maskedAccount}</p>
                            </div>
                        </div>
                        <Badge className="bg-emerald-100 text-emerald-700 text-[10px] font-bold">
                            {seller?.bank_name && seller?.account_number && seller?.account_name ? "Verified" : "Incomplete"}
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
                        <div key={payout.id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${payout.status === "completed" ? "bg-emerald-100" : "bg-amber-100"}`}>
                                    {payout.status === "completed" ? <CheckCircle className="h-5 w-5 text-emerald-600" /> : <Clock className="h-5 w-5 text-amber-600" />}
                                </div>
                                <div>
                                    <p className="font-bold text-sm text-gray-900">{formatPrice(payout.amount)}</p>
                                    <p className="text-[11px] text-gray-400 font-medium">{payout.date} • {payout.method}</p>
                                    <p className="text-[10px] text-gray-400 mt-0.5">Ref: {payout.txId}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Badge variant="outline" className={`text-[10px] font-bold ${payout.status === "completed" ? "border-emerald-200 text-emerald-700 bg-emerald-50" : "border-amber-200 text-amber-700 bg-amber-50"}`}>
                                    {payout.status === "completed" ? "Completed" : "Processing"}
                                </Badge>
                                {payout.status === "completed" && (
                                    <Button variant="ghost" size="sm" className="h-8 text-xs font-bold text-gray-500 hover:text-indigo-600 hover:bg-indigo-50" onClick={() => alert("Simulation: Downloading PDF Receipt for " + payout.txId)}>
                                        <Download className="h-3 w-3 mr-1.5" /> Receipt
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
