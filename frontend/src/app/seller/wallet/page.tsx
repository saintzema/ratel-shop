"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { DataSyncService } from "@/lib/sync-store";
import { Order, Seller } from "@/lib/types";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
    Wallet,
    ArrowUpRight,
    ArrowDownRight,
    Lock,
    ShieldCheck,
    CheckCircle,
    Clock,
    Landmark,
    AlertCircle,
    ArrowLeft,
    X,
    BuildingIcon,
    TrendingUp,
    RefreshCw
} from "lucide-react";

export default function SellerWalletPage() {
    const router = useRouter();
    const [orders, setOrders] = useState<Order[]>([]);
    const [payouts, setPayouts] = useState<any[]>([]);
    const [seller, setSeller] = useState<Seller | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    
    // Payout Flow State
    const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
    const [payoutAmount, setPayoutAmount] = useState<number>(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [availableToWithdraw, setAvailableToWithdraw] = useState(0);
    const [commissionRate, setCommissionRate] = useState(0);

    const safeSeller = seller || DataSyncService.getCurrentSeller() || {
        id: "loading",
        business_name: "Loading Store...",
        trust_score: 50,
        bank_name: "",
        account_number: ""
    } as Seller;

    useEffect(() => {
        const loadFinanceData = () => {
            const s = DataSyncService.getCurrentSeller();
            if (!s) {
                router.push("/seller/login");
                return;
            }
            setSeller(s);
            
            const allOrders = DataSyncService.getOrders();
            const sellerOrders = allOrders.filter(o => o.seller_id === s.id);
            setOrders(sellerOrders);
            
            const allPayouts = DataSyncService.getPayouts();
            setPayouts(allPayouts.filter((p: any) => p.seller_id === s.id));

            // Calculate Balances
            const EARNINGS_ELIGIBLE_STATES = ["released", "buyer_confirmed", "auto_release_eligible"];
            const rate = DataSyncService.getSellerCommissionRate(s);
            setCommissionRate(rate);

            const available = sellerOrders
                .filter(o => EARNINGS_ELIGIBLE_STATES.includes(o.escrow_status as string) && (o.payout_status === "none" || !o.payout_status))
                .reduce((sum, o) => sum + (o.amount * (1 - rate)), 0);
            
            setAvailableToWithdraw(available);
            setPayoutAmount(available);
        };

        loadFinanceData();
        window.addEventListener("storage", loadFinanceData);
        window.addEventListener("sync-store-update", loadFinanceData);

        return () => {
            window.removeEventListener("storage", loadFinanceData);
            window.removeEventListener("sync-store-update", loadFinanceData);
        };
    }, [router]);

    const handleWithdraw = () => {
        if (!seller) return;
        
        // Ensure payout info exists
        const payoutInfo = localStorage.getItem(`fp_payout_${seller.id}`);
        // If not using dedicated local storage key, fallback to seller obj
        const bankName = seller.bank_name || (payoutInfo ? JSON.parse(payoutInfo).bankName : null);
        const acctNum = seller.account_number || (payoutInfo ? JSON.parse(payoutInfo).accountNumber : null);

        if (!bankName || !acctNum) {
            if (window.confirm("You need to set up your payout bank details first. Go to settings?")) {
                router.push("/seller/settings/payouts#bank-details");
            }
            return;
        }

        setIsPayoutModalOpen(true);
    };

    const confirmPayout = () => {
        if (!seller || payoutAmount <= 0) return;
        setIsSubmitting(true);

        // Find available order IDs taking part in this cashout
        const EARNINGS_ELIGIBLE_STATES = ["released", "buyer_confirmed", "auto_release_eligible"];
        const eligibleOrders = orders.filter(o => EARNINGS_ELIGIBLE_STATES.includes(o.escrow_status as string) && (o.payout_status === "none" || !o.payout_status));
        
        const bankName = seller.bank_name || "Bank Transfer";
        const acctNum = seller.account_number || "xxxxxxxxx";
        const last4 = acctNum.slice(-4);

        DataSyncService.requestPayout(
            seller.id,
            eligibleOrders.map(o => o.id),
            payoutAmount,
            "bank_transfer",
            bankName,
            last4
        );

        setTimeout(() => {
            setIsSubmitting(false);
            setIsPayoutModalOpen(false);
            window.dispatchEvent(new Event("sync-store-update"));
        }, 800);
    };



    // Financial calculations
    const ESCROW_STATES = ["held", "seller_confirmed"];
    const escrowAmount = orders
        .filter(o => ESCROW_STATES.includes(o.escrow_status as string))
        .reduce((sum, o) => sum + o.amount, 0);

    const pendingPayoutsAmount = payouts
        .filter(p => p.status === "processing" || p.status === "pending")
        .reduce((sum, p) => sum + p.amount, 0);

    const totalEarned = payouts
        .filter(p => p.status === "completed")
        .reduce((sum, p) => sum + p.amount, 0);

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-20">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Wallet & Payouts</h1>
                    <p className="text-sm text-gray-500 font-medium mt-1">Manage your earnings and settlements securely.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                            setIsRefreshing(true);
                            setTimeout(() => setIsRefreshing(false), 800);
                        }}
                        className={`rounded-xl border shadow-sm px-4 h-10 ${isRefreshing ? 'opacity-70 pointer-events-none' : ''}`}
                    >
                        <RefreshCw className={`h-4 w-4 mr-2 text-emerald-600 ${isRefreshing ? 'animate-spin' : ''}`} />
                        Sync Data
                    </Button>
                    <Link href="/seller/settings/payouts">
                        <Button variant="outline" size="sm" className="rounded-xl border shadow-sm px-4 h-10">
                            <Landmark className="h-4 w-4 mr-2 text-amber-600" />
                            Bank Settings
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Empty States / Loading Indicator */}
            {!seller && isRefreshing && (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 text-center text-emerald-700 text-xs font-bold animate-pulse"
                >
                    Syncing your financial records...
                </motion.div>
            )}



            {/* Payout Lifecycle Tracking - Premium Component */}
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-[32px] border border-zinc-100 p-7 shadow-sm overflow-hidden relative group"
            >
                <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-50/40 rounded-full blur-3xl -mr-24 -mt-24 group-hover:bg-emerald-100/40 transition-colors duration-700" />
                
                <div className="flex items-center justify-between mb-8 relative">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200">
                            <Wallet className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-zinc-900 leading-none">Payout Lifecycle</h3>
                            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-1">Fund Tracking & Escrow Release</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative px-2">
                    <PayoutStep 
                        label="In Escrow" 
                        amount={escrowAmount} 
                        status="pending" 
                        icon={<Lock className="h-4 w-4" />}
                        description="Buyer payment held"
                        active={escrowAmount > 0}
                    />
                    <PayoutStep 
                        label="Released" 
                        amount={orders.filter(o => ["released", "buyer_confirmed"].includes(o.escrow_status as string)).reduce((sum, o) => sum + o.amount, 0)} 
                        status="completed" 
                        icon={<ShieldCheck className="h-4 w-4" />}
                        description="Verified for payout"
                        active={orders.some(o => ["released", "buyer_confirmed"].includes(o.escrow_status as string))}
                    />
                    <PayoutStep 
                        label="Processing" 
                        amount={pendingPayoutsAmount} 
                        status="pending" 
                        icon={<TrendingUp className="h-4 w-4" />}
                        description="Bank transfer in progress"
                        active={pendingPayoutsAmount > 0}
                    />
                    <PayoutStep 
                        label="Paid Out" 
                        amount={totalEarned} 
                        status="completed" 
                        icon={<CheckCircle className="h-4 w-4" />}
                        description="Settled to account"
                        active={totalEarned > 0}
                    />
                    
                    {/* Progress Connecting Line (Desktop) */}
                    <div className="hidden lg:block absolute top-[19px] left-[12%] right-[12%] h-[1px] bg-zinc-100 -z-10">
                        <div 
                            className="h-full bg-emerald-500 transition-all duration-1000" 
                            style={{ 
                                width: totalEarned > 0 ? '100%' : 
                                       pendingPayoutsAmount > 0 ? '75%' : 
                                       orders.some(o => ["released", "buyer_confirmed"].includes(o.escrow_status as string)) ? '50%' : 
                                       escrowAmount > 0 ? '25%' : '0%' 
                            }}
                        />
                    </div>
                </div>

                <div className="mt-8 pt-6 border-t border-zinc-50 flex items-center justify-between">
                    <div className="flex items-center gap-2 p-2 px-3 bg-amber-50/50 rounded-xl border border-amber-100/50">
                        <ShieldCheck className="h-3.5 w-3.5 text-amber-600" />
                        <span className="text-[10px] text-amber-900 font-bold">
                            Wallet Security: Settlements are processed directly via Paystack
                        </span>
                    </div>
                </div>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Available for Withdrawal */}
                <div className="bg-emerald-600 rounded-[24px] p-6 text-white shadow-xl shadow-emerald-600/20 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-10 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform duration-500">
                        <Wallet className="w-32 h-32" />
                    </div>
                    <div className="relative z-10 flex flex-col h-full">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-emerald-100 font-medium tracking-wide uppercase text-xs">Available to Withdraw</span>
                            <ArrowUpRight className="h-4 w-4 text-emerald-200" />
                        </div>
                        <h2 className="text-4xl font-black mb-1">{formatPrice(availableToWithdraw)}</h2>
                        <p className="text-emerald-100 text-xs font-medium mb-6">Net of {commissionRate * 100}% platform fee</p>
                        
                        <div className="mt-auto">
                            <Button
                                onClick={handleWithdraw}
                                disabled={availableToWithdraw <= 0}
                                className="w-full bg-white text-emerald-700 hover:bg-emerald-50 rounded-xl font-bold h-12 shadow-sm pointer-events-auto"
                            >
                                Request Payout
                            </Button>
                        </div>
                    </div>
                </div>

                {/* In Escrow */}
                <div className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-100 flex flex-col h-full">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 bg-amber-50 rounded-full">
                            <Lock className="h-4 w-4 text-amber-600" />
                        </div>
                        <span className="text-gray-500 font-bold uppercase tracking-wider text-[11px]">Held in Escrow</span>
                    </div>
                    <h2 className="text-3xl font-black text-gray-900 mt-2">{formatPrice(escrowAmount)}</h2>
                    <p className="text-xs text-gray-400 font-medium mt-1">Released automatically on buyer delivery</p>
                    
                    <div className="mt-8 pt-4 border-t border-gray-100">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-500">Pending Orders</span>
                            <span className="font-bold text-gray-900">{orders.filter(o => ESCROW_STATES.includes(o.escrow_status as string)).length}</span>
                        </div>
                    </div>
                </div>

                {/* Total Lifetime / Processing */}
                <div className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-100 flex flex-col h-full justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-2 bg-blue-50 rounded-full">
                                <Clock className="h-4 w-4 text-blue-600" />
                            </div>
                            <span className="text-gray-500 font-bold uppercase tracking-wider text-[11px]">Processing Payouts</span>
                        </div>
                        <h2 className="text-3xl font-black text-gray-900 mt-2">{formatPrice(pendingPayoutsAmount)}</h2>
                    </div>

                    <div className="pt-4 border-t border-gray-100">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-2 bg-purple-50 rounded-full">
                                <ShieldCheck className="h-4 w-4 text-purple-600" />
                            </div>
                            <span className="text-gray-500 font-bold uppercase tracking-wider text-[11px]">Total Settled</span>
                        </div>
                        <h2 className="text-2xl font-black text-gray-900">{formatPrice(totalEarned)}</h2>
                    </div>
                </div>
            </div>

            {/* Payout History Ledger */}
            <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                    <h2 className="text-lg font-bold text-gray-900">Settlement Ledger</h2>
                    <p className="text-sm text-gray-500 font-medium mt-1">History of your direct bank withdrawals.</p>
                </div>
                
                <div className="overflow-x-auto">
                    {payouts.length === 0 ? (
                        <div className="p-12 flex flex-col items-center justify-center text-center">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                <Landmark className="h-8 w-8 text-gray-300" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-1">No Payouts Yet</h3>
                            <p className="text-sm text-gray-500 max-w-sm">When you request a withdrawal, your settlement records will appear here.</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50">
                                    <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Date</th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Reference ID</th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Destination</th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-right">Amount</th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {payouts.map((p) => (
                                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">
                                                {new Date(p.created_at).toLocaleDateString()}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {new Date(p.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600">
                                            {p.id.split('_')[1] || p.id}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <BuildingIcon className="h-4 w-4 text-gray-400" />
                                                <span className="text-sm font-medium text-gray-900">{p.bank || 'Bank Transfer'}</span>
                                            </div>
                                            <div className="text-xs text-gray-500 mt-0.5 font-mono">
                                                **** **** {p.account_last4 || "0000"}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <div className="text-sm font-black text-gray-900">
                                                {formatPrice(p.amount)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            {p.status === "completed" ? (
                                                <Badge className="bg-emerald-100 text-emerald-800 border-none justify-center font-bold">Paid</Badge>
                                            ) : p.status === "processing" ? (
                                                <Badge className="bg-blue-100 text-blue-800 border-none justify-center font-bold">Processing</Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-gray-600 border-gray-200 justify-center">Pending</Badge>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Payout Request Modal */}
            <AnimatePresence>
                {isPayoutModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                            onClick={() => !isSubmitting && setIsPayoutModalOpen(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="absolute top-4 right-4">
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8 rounded-full"
                                    onClick={() => !isSubmitting && setIsPayoutModalOpen(false)}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                            
                            <div className="mb-6">
                                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                                    <ArrowDownRight className="h-6 w-6 text-emerald-600" />
                                </div>
                                <h3 className="text-2xl font-black text-gray-900 tracking-tight">Withdraw Funds</h3>
                                <p className="text-sm text-gray-500 font-medium mt-1">Request settlement to your registered bank account.</p>
                            </div>

                            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 mb-6">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-xs font-bold text-gray-500 uppercase">Available Balance</span>
                                    <span className="text-sm font-black text-gray-900">{formatPrice(availableToWithdraw)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-gray-500 uppercase">Destination</span>
                                    <span className="text-xs font-medium text-gray-700 font-mono text-right">
                                        {safeSeller.bank_name || 'Bank'} <br/>
                                        **** {(safeSeller.account_number || "0000").slice(-4)}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-3 mb-8">
                                <label className="text-sm font-bold text-gray-700">Withdrawal Amount</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">₦</span>
                                    <Input 
                                        type="number"
                                        value={payoutAmount}
                                        onChange={(e) => setPayoutAmount(Number(e.target.value))}
                                        className="pl-8 font-black text-lg h-12 rounded-xl"
                                        min={100}
                                        max={availableToWithdraw}
                                        disabled={isSubmitting}
                                    />
                                </div>
                                {payoutAmount > availableToWithdraw && (
                                    <p className="text-xs font-bold text-red-500 flex items-center gap-1 mt-2">
                                        <AlertCircle className="h-3 w-3" /> Exceeds available balance
                                    </p>
                                )}
                            </div>

                            <div className="flex gap-3">
                                <Button
                                    variant="outline"
                                    className="flex-1 rounded-xl h-12 font-bold"
                                    onClick={() => setIsPayoutModalOpen(false)}
                                    disabled={isSubmitting}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={confirmPayout}
                                    disabled={payoutAmount <= 0 || payoutAmount > availableToWithdraw || isSubmitting}
                                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-12 font-bold"
                                >
                                    {isSubmitting ? (
                                        <div className="flex items-center gap-2">
                                            <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                            Processing...
                                        </div>
                                    ) : (
                                        "Confirm Payout"
                                    )}
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

interface PayoutStepProps {
    label: string;
    amount: number;
    status: "pending" | "completed";
    icon: React.ReactNode;
    description: string;
    active?: boolean;
}

function PayoutStep({ label, amount, status, icon, description, active }: PayoutStepProps) {
    return (
        <div className="flex flex-row md:flex-col items-center md:items-start gap-4 md:gap-2">
            <div className={`
                w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all duration-500
                ${active ? "bg-emerald-600 text-white shadow-lg shadow-emerald-200 scale-110" : "bg-zinc-100 text-zinc-400"}
                ${status === "completed" && active ? "ring-2 ring-amber-400 ring-offset-2" : ""}
            `}>
                {icon}
            </div>
            <div className="min-w-0">
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-tight leading-none mb-1">{label}</p>
                <div className="flex items-baseline gap-1">
                    <p className="text-sm font-black text-zinc-900">{formatPrice(amount)}</p>
                    {active && <div className="w-1 h-1 rounded-full bg-amber-400 animate-pulse" />}
                </div>
                <p className="text-[9px] text-zinc-400 font-medium leading-tight">{description}</p>
            </div>
        </div>
    );
}
