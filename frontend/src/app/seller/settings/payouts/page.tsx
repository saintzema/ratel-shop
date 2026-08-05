"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DataSyncService } from "@/lib/sync-store";
import { Seller, Order } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Banknote,
    Building2,
    CheckCircle2,
    ArrowLeft,
    Save,
    ShieldCheck,
    Clock,
    AlertCircle,
    Wallet,
    TrendingUp,
    ChevronRight,
    CreditCard,
    Zap,
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { formatPrice, cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";

const NIGERIAN_BANKS = [
    "Access Bank",
    "First Bank of Nigeria",
    "Guaranty Trust Bank (GTBank)",
    "United Bank for Africa (UBA)",
    "Zenith Bank",
    "Ecobank Nigeria",
    "Fidelity Bank",
    "First City Monument Bank (FCMB)",
    "Heritage Banking Company",
    "Keystone Bank",
    "Polaris Bank",
    "Stanbic IBTC Bank",
    "Standard Chartered Bank",
    "Sterling Bank",
    "Union Bank of Nigeria",
    "Unity Bank",
    "Wema Bank",
    "Kuda Microfinance Bank",
    "OPay",
    "PalmPay",
    "Moniepoint",
];

export default function PayoutsSettingsPage() {
    const router = useRouter();
    const [seller, setSeller] = useState<Seller | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [payoutRequested, setPayoutRequested] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [orders, setOrders] = useState<Order[]>([]);
    const [autoPayoutEnabled, setAutoPayoutEnabled] = useState(false);
    const [savingToggle, setSavingToggle] = useState(false);

    const [bankData, setBankData] = useState({
        bank_name: "",
        account_number: "",
        account_name: "",
    });
    const [isResolving, setIsResolving] = useState(false);
    const [resolutionError, setResolutionError] = useState("");

    const BANK_CODES: Record<string, string> = {
        "Access Bank": "044",
        "First Bank of Nigeria": "011",
        "Guaranty Trust Bank (GTBank)": "058",
        "United Bank for Africa (UBA)": "033",
        "Zenith Bank": "057",
        "Ecobank Nigeria": "050",
        "Fidelity Bank": "070",
        "First City Monument Bank (FCMB)": "214",
        "Heritage Banking Company": "030",
        "Keystone Bank": "082",
        "Polaris Bank": "076",
        "Stanbic IBTC Bank": "221",
        "Standard Chartered Bank": "068",
        "Sterling Bank": "232",
        "Union Bank of Nigeria": "032",
        "Unity Bank": "215",
        "Wema Bank": "035",
        "Kuda Microfinance Bank": "50211",
        "OPay": "100004",
        "PalmPay": "100033",
        "Moniepoint": "50515"
    };

    useEffect(() => {
        const resolveAccount = async () => {
            if (bankData.account_number.length === 10 && bankData.bank_name) {
                const code = BANK_CODES[bankData.bank_name];
                if (!code) return;

                setIsResolving(true);
                setResolutionError("");

                try {
                    const res = await fetch(`/api/payouts/verify?account_number=${bankData.account_number}&bank_code=${code}`);
                    const data = await res.json();
                    if (data.success) {
                        setBankData(prev => ({ ...prev, account_name: data.account_name }));
                    } else {
                        setResolutionError(data.error || "Could not resolve account");
                        setBankData(prev => ({ ...prev, account_name: "" }));
                    }
                } catch (err) {
                    setResolutionError("Network error during verification");
                } finally {
                    setIsResolving(false);
                }
            }
        };

        const timer = setTimeout(resolveAccount, 500);
        return () => clearTimeout(timer);
    }, [bankData.account_number, bankData.bank_name]);

    useEffect(() => {
        const s = DataSyncService.getCurrentSeller();
        if (!s) {
            router.push("/seller/login");
            return;
        }
        setSeller(s);
        setBankData({
            bank_name: s.bank_name || "",
            account_number: s.account_number || "",
            account_name: s.account_name || "",
        });
        setAutoPayoutEnabled((s as any).auto_payout_enabled ?? false);

        // Get orders for this seller
        const sellerOrders = DataSyncService.getOrders().filter(
            (o) => o.seller_id === s.id
        );
        setOrders(sellerOrders);
        setLoading(false);
    }, [router]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!seller) return;

        setSaving(true);
        await new Promise((r) => setTimeout(r, 600));

        DataSyncService.updateSeller(seller.id, bankData);
        const refreshed = DataSyncService.getCurrentSeller();
        if (refreshed) setSeller(refreshed as Seller);

        setSaving(false);
        setIsEditing(false);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
    };

    // Payout calculations
    const EARNINGS_ELIGIBLE_STATES = ["released", "buyer_confirmed", "auto_release_eligible"];

    // Orders correctly marked as paid out
    const cashedOutOrders = orders.filter(
        (o) => o.payout_status === "cashed_out"
    );

    // Orders where payout has been requested but not yet paid
    const payoutRequestedOrders = orders.filter(
        (o) => (o.payout_status as any) === "payout_requested"
    );

    // Orders ready, but not yet requested or currently in progress
    const pendingPayoutOrders = orders.filter(
        (o) =>
            (o.payout_status === "pending_payout" || o.payout_status === "none" || !o.payout_status) &&
            EARNINGS_ELIGIBLE_STATES.includes(o.escrow_status as string)
    );
    const totalCashedOut = cashedOutOrders.reduce(
        (acc, o) => acc + o.amount,
        0
    );

    const commissionRate = seller?.commission_rate ?? 5;

    const pendingPayoutAmount = pendingPayoutOrders.reduce(
        (acc, o) => acc + o.amount,
        0
    );

    const handleRequestPayout = async () => {
        if (!seller || pendingPayoutOrders.length === 0) return;
        setSaving(true);
        await new Promise((r) => setTimeout(r, 1000));

        // Mark pending orders as payout_requested (intermediate state; admin will mark as cashed_out when paid)
        const pendingIds = pendingPayoutOrders.map(o => o.id);

        // Update DB for each order
        const payoutReqToken = typeof window !== "undefined" ? localStorage.getItem("fp_token") : null;
        await Promise.all(pendingIds.map(id =>
            fetch("/api/orders", {
                method: "PATCH",
                headers: { "Content-Type": "application/json", ...(payoutReqToken ? { Authorization: `Bearer ${payoutReqToken}` } : {}) },
                body: JSON.stringify({ id, payout_status: "payout_requested" })
            })
        )).catch(console.error);

        // Update local state and trigger sync
        const allOrders: Order[] = DataSyncService.getOrders();
        const updatedOrders = allOrders.map(o =>
            pendingIds.includes(o.id) ? { ...o, payout_status: "payout_requested" as any } : o
        );
        localStorage.setItem("fp_orders", JSON.stringify(updatedOrders));
        window.dispatchEvent(new Event("sync-store-update"));

        // Notify seller
        DataSyncService.addNotification({
            userId: seller.owner_email || seller.id,
            type: "order",
            message: `💰 Payout of ${formatPrice(
                pendingPayoutAmount * ((100 - commissionRate) / 100)
            )} has been requested and is being processed.`,
            link: "/seller/settings/payouts",
        });

        // Send email to admin
        fetch("/api/email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                to: "techzema@gmail.com",
                type: "SELLER_PAYOUT_REQUEST",
                payload: {
                    sellerName: seller.business_name,
                    amount: pendingPayoutAmount * ((100 - commissionRate) / 100),
                    orderIds: pendingPayoutOrders.map((o) => o.id),
                },
            }),
        }).catch(() => {});

        // Refresh
        const refreshedOrders = DataSyncService.getOrders().filter(
            (o) => o.seller_id === seller.id
        );
        setOrders(refreshedOrders);
        setSaving(false);
        setPayoutRequested(true);
        setTimeout(() => setPayoutRequested(false), 6000);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="h-8 w-8 border-2 border-gray-200 border-t-brand-green-600 animate-spin rounded-full" />
            </div>
        );
    }

    const hasBankDetails = bankData.bank_name && bankData.account_number && bankData.account_name;

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-20 p-4 sm:p-6 lg:p-8">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link
                    href="/seller/settings"
                    className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
                >
                    <ArrowLeft className="h-5 w-5 text-gray-600" />
                </Link>
                <div>
                    <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
                        Payout Settings
                    </h1>
                    <p className="text-sm text-gray-500 font-medium mt-1">
                        Manage your bank details and request payouts
                    </p>
                </div>
            </div>

            {/* Success Banner */}
            <AnimatePresence>
                {success && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl p-4"
                    >
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        <span className="font-bold text-sm">
                            Changes saved successfully!
                        </span>
                    </motion.div>
                )}
                {payoutRequested && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl p-4"
                    >
                        <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                            <p className="font-bold text-sm">Payout request submitted!</p>
                            <p className="text-xs text-emerald-700 mt-0.5">
                                Your payout of{" "}
                                <span className="font-black">
                                    {formatPrice(pendingPayoutAmount * ((100 - commissionRate) / 100))}
                                </span>{" "}
                                has been sent to the FairPrice team. We&apos;ll process it within 1–3 business days.
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Payout Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2.5 bg-emerald-50 rounded-xl">
                            <Wallet className="h-5 w-5 text-emerald-600" />
                        </div>
                        <span className="text-xs font-bold uppercase tracking-widest text-gray-400">
                            Total Earned
                        </span>
                    </div>
                    <p className="text-2xl font-black text-gray-900 tracking-tight">
                        {formatPrice(totalCashedOut + pendingPayoutAmount)}
                    </p>
                    <p className="text-xs text-gray-400 mt-1 font-medium">
                        Across {cashedOutOrders.length + pendingPayoutOrders.length} orders
                    </p>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2.5 bg-amber-50 rounded-xl">
                            <Clock className="h-5 w-5 text-amber-600" />
                        </div>
                        <span className="text-xs font-bold uppercase tracking-widest text-gray-400">
                            Pending Payout
                        </span>
                    </div>
                    <p className="text-2xl font-black text-amber-600 tracking-tight">
                        {formatPrice(
                            pendingPayoutAmount *
                                ((100 - commissionRate) / 100)
                        )}
                    </p>
                    <p className="text-xs text-gray-400 mt-1 font-medium">
                        {pendingPayoutOrders.length} order(s) ready · {commissionRate}% commission
                    </p>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2.5 bg-blue-50 rounded-xl">
                            <TrendingUp className="h-5 w-5 text-blue-600" />
                        </div>
                        <span className="text-xs font-bold uppercase tracking-widest text-gray-400">
                            Total Paid Out
                        </span>
                    </div>
                    <p className="text-2xl font-black text-gray-900 tracking-tight">
                        {formatPrice(
                            totalCashedOut *
                                ((100 - commissionRate) / 100)
                        )}
                    </p>
                    <p className="text-xs text-gray-400 mt-1 font-medium">
                        {cashedOutOrders.length} completed · {payoutRequestedOrders.length} requested
                    </p>
                </div>
            </div>

            {/* Request Payout Button */}
            {pendingPayoutOrders.length > 0 && hasBankDetails && (
                <div className="bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-2xl p-6">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div>
                            <h3 className="font-bold text-gray-900 text-lg">
                                Ready to cash out?
                            </h3>
                            <p className="text-sm text-gray-600 mt-1">
                                You have{" "}
                                <span className="font-bold text-emerald-700">
                                    {formatPrice(
                                        pendingPayoutAmount *
                                            ((100 - commissionRate) / 100)
                                    )}
                                </span>{" "}
                                available from {pendingPayoutOrders.length}{" "}
                                confirmed order(s).
                            </p>
                        </div>
                        <Button
                            onClick={handleRequestPayout}
                            disabled={saving}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-black tracking-wider uppercase h-12 px-8 rounded-xl shadow-lg shadow-emerald-600/20 whitespace-nowrap"
                        >
                            {saving ? (
                                <div className="h-5 w-5 border-2 border-white/30 border-t-white animate-spin rounded-full" />
                            ) : (
                                <>
                                    <Banknote className="h-4 w-4 mr-2" />
                                    Request Payout
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            )}

            {/* No bank details warning */}
            {!hasBankDetails && pendingPayoutOrders.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                        <p className="font-bold text-amber-900 text-sm">
                            Bank details required
                        </p>
                        <p className="text-xs text-amber-700 mt-1">
                            Please add your bank account details below before you can request a payout.
                        </p>
                    </div>
                </div>
            )}

            {/* Bank Details Card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                            <Building2 className="h-5 w-5 text-gray-600" />
                        </div>
                        <div>
                            <h2 className="font-bold text-gray-900">
                                Bank Account
                            </h2>
                            <p className="text-xs text-gray-500 mt-0.5">
                                Where we'll send your payouts
                            </p>
                        </div>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditing(!isEditing)}
                        className="rounded-xl text-xs font-bold"
                    >
                        {isEditing ? "Cancel" : hasBankDetails ? "Edit" : "Add Bank"}
                    </Button>
                </div>

                {isEditing ? (
                    <form onSubmit={handleSave} className="p-6 space-y-5">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase text-gray-400 tracking-widest">
                                Bank Name <span className="text-red-400">*</span>
                            </label>
                            <div className="relative">
                                <select
                                    className="w-full appearance-none rounded-xl border border-gray-200 bg-gray-50/80 text-sm h-12 pl-4 pr-10 text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 transition-all cursor-pointer"
                                    value={bankData.bank_name}
                                    onChange={(e) =>
                                        setBankData({
                                            ...bankData,
                                            bank_name: e.target.value,
                                        })
                                    }
                                    required
                                >
                                    <option value="" disabled>
                                        Select your bank
                                    </option>
                                    {NIGERIAN_BANKS.map((bank) => (
                                        <option key={bank} value={bank}>
                                            {bank}
                                        </option>
                                    ))}
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                                    <ChevronRight className="h-4 w-4 text-gray-400 rotate-90" />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase text-gray-400 tracking-widest">
                                Account Number{" "}
                                <span className="text-red-400">*</span>
                            </label>
                            <Input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]{10}"
                                maxLength={10}
                                required
                                placeholder="0123456789"
                                className="rounded-xl border-gray-200 bg-gray-50/80 h-12 text-gray-900 font-medium focus:border-emerald-400 focus:ring-emerald-200"
                                value={bankData.account_number}
                                onChange={(e) =>
                                    setBankData({
                                        ...bankData,
                                        account_number: e.target.value.replace(
                                            /\D/g,
                                            ""
                                        ),
                                    })
                                }
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase text-gray-400 tracking-widest flex items-center justify-between">
                                <span>Account Name <span className="text-red-400">*</span></span>
                                {isResolving && <span className="text-[10px] text-emerald-600 animate-pulse font-black">Verifying...</span>}
                            </label>
                            <div className="relative">
                                <Input
                                    type="text"
                                    required
                                    readOnly={bankData.account_number.length === 10 && !!bankData.bank_name}
                                    placeholder={isResolving ? "Fetching..." : "Auto-resolved from bank"}
                                    className={cn(
                                        "rounded-xl border-gray-200 h-12 text-gray-900 font-bold focus:border-emerald-400 focus:ring-emerald-200 transition-all",
                                        (bankData.account_number.length === 10 && !!bankData.bank_name) ? "bg-gray-100 cursor-not-allowed opacity-80" : "bg-gray-50/80"
                                    )}
                                    value={bankData.account_name}
                                    onChange={(e) =>
                                        setBankData({
                                            ...bankData,
                                            account_name: e.target.value,
                                        })
                                    }
                                />
                                {bankData.account_name && !isResolving && (
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shadow-sm" strokeWidth={3} />
                                    </div>
                                )}
                            </div>
                            {resolutionError && (
                                <p className="text-[10px] text-red-500 font-bold flex items-center gap-1 mt-1">
                                    <AlertCircle className="h-3 w-3" /> {resolutionError}
                                </p>
                            )}
                        </div>

                        <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                            <ShieldCheck className="h-4 w-4 text-blue-600 shrink-0" />
                            <p className="text-xs text-blue-700 font-medium">
                                Your banking information is encrypted and
                                securely stored. We never share your details
                                with third parties.
                            </p>
                        </div>

                        <Button
                            type="submit"
                            disabled={saving || isResolving || !bankData.account_name}
                            className="w-full h-12 bg-black hover:bg-gray-900 text-white font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {saving ? (
                                <div className="h-5 w-5 border-2 border-white/30 border-t-white animate-spin rounded-full" />
                            ) : (
                                <>
                                    <Save className="h-4 w-4 mr-2" />
                                    Save Bank Details
                                </>
                            )}
                        </Button>
                    </form>
                ) : hasBankDetails ? (
                    <div className="p-6 space-y-4">
                        <div className="flex items-center gap-4 bg-gray-50 rounded-xl p-4 border border-gray-100">
                            <div className="p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
                                <CreditCard className="h-6 w-6 text-gray-600" />
                            </div>
                            <div>
                                <p className="font-bold text-gray-900">
                                    {bankData.account_name}
                                </p>
                                <p className="text-sm text-gray-500 font-medium">
                                    {bankData.bank_name} ·{" "}
                                    {"••••" +
                                        bankData.account_number.slice(-4)}
                                </p>
                            </div>
                            <CheckCircle2 className="h-5 w-5 text-emerald-500 ml-auto" />
                        </div>
                    </div>
                ) : (
                    <div className="p-6 text-center">
                        <div className="p-4 bg-gray-50 rounded-2xl border border-dashed border-gray-200 max-w-sm mx-auto">
                            <Building2 className="h-8 w-8 text-gray-300 mx-auto mb-3" />
                            <p className="text-sm text-gray-500 font-medium">
                                No bank account added yet
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                                Click &quot;Add Bank&quot; to set up your payout
                                account
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Auto-Payout Toggle Section */}
            <div className="bg-gradient-to-br from-violet-50 to-indigo-50 rounded-2xl border border-violet-100 shadow-sm overflow-hidden">
                <div className="p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-violet-100 rounded-xl">
                                <Zap className="h-5 w-5 text-violet-600" />
                            </div>
                            <div>
                                <h2 className="font-bold text-gray-900">Instant Auto-Payout</h2>
                                <p className="text-xs text-gray-500 mt-0.5">Automatically settle QR payments to your bank</p>
                            </div>
                        </div>
                        <Switch
                            checked={autoPayoutEnabled}
                            disabled={savingToggle || !hasBankDetails}
                            onCheckedChange={async (val) => {
                                if (!hasBankDetails) return;
                                setSavingToggle(true);
                                setAutoPayoutEnabled(val);
                                try {
                                    // Save to local sync store
                                    if (seller) {
                                        DataSyncService.updateSeller(seller.id, { auto_payout_enabled: val });
                                    }
                                    // Persist to DB via seller API
                                    const token = localStorage.getItem("fp_token");
                                    if (seller && token) {
                                        await fetch(`/api/sellers/${seller.id}`, {
                                            method: "PATCH",
                                            headers: {
                                                "Content-Type": "application/json",
                                                Authorization: `Bearer ${token}`
                                            },
                                            body: JSON.stringify({ autoPayoutEnabled: val })
                                        }).catch(console.error);
                                    }
                                    setSuccess(true);
                                    setTimeout(() => setSuccess(false), 2000);
                                } catch (err) {
                                    console.error("Toggle save error:", err);
                                    setAutoPayoutEnabled(!val); // Revert on failure
                                } finally {
                                    setSavingToggle(false);
                                }
                            }}
                        />
                    </div>

                    <div className="mt-4 space-y-3">
                        <AnimatePresence>
                            {autoPayoutEnabled && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="overflow-hidden"
                                >
                                    <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-violet-100 space-y-2">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle2 className="h-4 w-4 text-violet-600" />
                                            <span className="text-sm font-bold text-violet-900">Auto-payout is active</span>
                                        </div>
                                        <p className="text-xs text-violet-700 leading-relaxed">
                                            When customers pay via your store QR code, funds will be automatically
                                            transferred to <strong>{bankData.account_name || "your bank account"}</strong> at{" "}
                                            <strong>{bankData.bank_name || "your bank"}</strong> after the platform
                                            commission ({commissionRate}%) is deducted. No manual payout request needed.
                                        </p>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {!hasBankDetails && (
                            <div className="flex items-start gap-2 bg-amber-50 rounded-xl p-3 border border-amber-100">
                                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                                <p className="text-xs text-amber-800 font-medium">
                                    You need to add and verify your bank details before enabling auto-payout.
                                </p>
                            </div>
                        )}

                        {!autoPayoutEnabled && hasBankDetails && (
                            <p className="text-xs text-gray-500 font-medium pl-1">
                                When disabled, QR payment settlements require manual payout request or admin approval.
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Payout History */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                    <h2 className="font-bold text-gray-900 flex items-center gap-2">
                        <Banknote className="h-5 w-5 text-gray-400" />
                        Payout History
                    </h2>
                </div>

                {cashedOutOrders.length === 0 && payoutRequestedOrders.length === 0 ? (
                    <div className="p-8 text-center">
                        <Clock className="h-8 w-8 text-gray-300 mx-auto mb-3" />
                        <p className="text-sm text-gray-500 font-medium">
                            No payouts yet
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                            Completed orders will appear here once you request a payout
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {payoutRequestedOrders.slice(0, 20).map((order) => (
                            <div
                                key={order.id}
                                className="p-4 px-6 flex items-center justify-between hover:bg-gray-50/50 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-amber-50 rounded-lg">
                                        <Clock className="h-4 w-4 text-amber-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-900">
                                            Order #{order.id.substring(0, 8)}
                                        </p>
                                        <p className="text-xs text-gray-400 mt-0.5">
                                            {new Date(
                                                order.updated_at || order.created_at
                                            ).toLocaleDateString("en-NG", {
                                                month: "short",
                                                day: "numeric",
                                                year: "numeric",
                                            })}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold text-amber-700">
                                        {formatPrice(
                                            order.amount *
                                                ((100 - commissionRate) / 100)
                                        )}
                                    </p>
                                    <p className="text-[10px] text-amber-500 font-bold uppercase tracking-wider">
                                        Payout Requested
                                    </p>
                                </div>
                            </div>
                        ))}
                        {cashedOutOrders.slice(0, 20).map((order) => (
                            <div
                                key={order.id}
                                className="p-4 px-6 flex items-center justify-between hover:bg-gray-50/50 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-emerald-50 rounded-lg">
                                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-900">
                                            Order #{order.id.substring(0, 8)}
                                        </p>
                                        <p className="text-xs text-gray-400 mt-0.5">
                                            {new Date(
                                                order.updated_at || order.created_at
                                            ).toLocaleDateString("en-NG", {
                                                month: "short",
                                                day: "numeric",
                                                year: "numeric",
                                            })}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold text-emerald-700">
                                        {formatPrice(
                                            order.amount *
                                                ((100 - commissionRate) / 100)
                                        )}
                                    </p>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                                        Paid
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Commission Info */}
            <div className="bg-gray-50 rounded-2xl border border-gray-100 p-6">
                <h3 className="font-bold text-gray-700 text-sm mb-3 flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-gray-400" />
                    Commission & Fees
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="flex justify-between items-center bg-white rounded-xl p-4 border border-gray-100">
                        <span className="text-gray-500 font-medium">
                            Platform Commission
                        </span>
                        <span className="font-black text-gray-900">
                            {commissionRate}%
                        </span>
                    </div>
                    <div className="flex justify-between items-center bg-white rounded-xl p-4 border border-gray-100">
                        <span className="text-gray-500 font-medium">
                            Processing Time
                        </span>
                        <span className="font-black text-gray-900">
                            1–3 Business Days
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
