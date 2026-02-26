"use client";

import { useState, useEffect } from "react";
import {
    ShieldCheck,
    Clock,
    CheckCircle2,
    AlertTriangle,
    ArrowRight,
    DollarSign,
    Package,
    User,
    ChevronRight,
    Zap,
    Lock,
    Unlock,
    Timer,
    TrendingUp,
    MessageSquare,
    X,
    Eye
} from "lucide-react";
import { DemoStore } from "@/lib/demo-store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Order } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";

export default function EscrowManagement() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [allOrders, setAllOrders] = useState<Order[]>([]);
    const [filter, setFilter] = useState<"all" | "held" | "seller_confirmed" | "released" | "disputed">("all");

    // Action Modal State
    const [actionModal, setActionModal] = useState<{
        isOpen: boolean;
        type: "release" | "refund" | "releaseDisputed" | null;
        orderId: string | null;
        message: string;
    }>({ isOpen: false, type: null, orderId: null, message: "" });

    // QA Chat Modal State
    const [chatModal, setChatModal] = useState<{
        isOpen: boolean;
        orderId: string | null;
    }>({ isOpen: false, orderId: null });

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const f = params.get("filter");
        if (f === "held" || f === "seller_confirmed" || f === "released" || f === "disputed") {
            setFilter(f);
        }
    }, []);

    useEffect(() => {
        const load = () => {
            const all = DemoStore.getOrders();
            setAllOrders(all);
            setOrders(all);
        };
        load();
        window.addEventListener("storage", load);
        return () => window.removeEventListener("storage", load);
    }, []);

    const filteredOrders = filter === "all"
        ? orders
        : filter === "released"
            ? orders.filter(o => o.escrow_status === "released")
            : filter === "seller_confirmed"
                ? orders.filter(o => o.escrow_status === "seller_confirmed" || o.escrow_status === "buyer_confirmed" || o.escrow_status === "auto_release_eligible")
                : filter === "disputed"
                    ? orders.filter(o => o.escrow_status === "disputed")
                    : orders.filter(o => o.escrow_status === "held");

    const heldCount = orders.filter(o => o.escrow_status === "held").length;
    const pendingReleaseCount = orders.filter(o => o.escrow_status === "seller_confirmed" || o.escrow_status === "buyer_confirmed").length;
    const releasedCount = orders.filter(o => o.escrow_status === "released").length;
    const disputedCount = orders.filter(o => o.escrow_status === "disputed").length;
    const totalHeldAmount = orders.filter(o => o.escrow_status !== "released" && o.escrow_status !== "refunded").reduce((sum, o) => sum + o.amount, 0);
    const totalReleasedAmount = orders.filter(o => o.escrow_status === "released").reduce((sum, o) => sum + o.amount, 0);

    const handleRelease = (orderId: string) => {
        setActionModal({ isOpen: true, type: "release", orderId, message: "Are you sure you want to release escrow funds to the seller? This action cannot be undone." });
    };

    const handleRefund = (orderId: string) => {
        setActionModal({ isOpen: true, type: "refund", orderId, message: "Are you sure you want to refund the buyer? This action cannot be undone." });
    };

    const handleReleaseDisputed = (orderId: string) => {
        setActionModal({ isOpen: true, type: "releaseDisputed", orderId, message: "Release funds to seller despite dispute? Buyer's dispute will be marked as resolved." });
    };

    const confirmAction = () => {
        if (!actionModal.orderId) return;
        const { type, orderId } = actionModal;

        if (type === "release") {
            DemoStore.releaseEscrow(orderId);
        } else if (type === "refund") {
            const dispute = DemoStore.getDisputeByOrderId(orderId);
            if (dispute) {
                DemoStore.resolveDispute(dispute.id, "resolved_refund", "Admin issued refund");
            } else {
                const orders = DemoStore.getOrders();
                const updated = orders.map(o => o.id === orderId ? { ...o, escrow_status: "refunded" as const } : o);
                localStorage.setItem(DemoStore.STORAGE_KEYS.ORDERS, JSON.stringify(updated));
            }
        } else if (type === "releaseDisputed") {
            const dispute = DemoStore.getDisputeByOrderId(orderId);
            if (dispute) {
                DemoStore.resolveDispute(dispute.id, "resolved_release", "Admin released funds to seller");
            } else {
                DemoStore.releaseEscrow(orderId);
            }
        }

        setOrders(DemoStore.getOrders());
        setActionModal({ isOpen: false, type: null, orderId: null, message: "" });
    };

    const handleSellerConfirm = (orderId: string) => {
        DemoStore.sellerConfirmDelivery(orderId);
        setOrders(DemoStore.getOrders());
    };

    const handleBuyerConfirm = (orderId: string) => {
        DemoStore.buyerConfirmReceipt(orderId);
        setOrders(DemoStore.getOrders());
    };

    const getStatusBadge = (order: Order) => {
        const isAutoEligible = DemoStore.checkAutoReleaseEligible(order);
        const status = isAutoEligible ? "auto_release_eligible" : order.escrow_status;

        const styles: Record<string, { bg: string; text: string; icon: any; label: string }> = {
            held: { bg: "bg-amber-100", text: "text-amber-700", icon: Lock, label: "Held in Escrow" },
            seller_confirmed: { bg: "bg-blue-100", text: "text-blue-700", icon: Package, label: "Seller Confirmed" },
            buyer_confirmed: { bg: "bg-indigo-100", text: "text-indigo-700", icon: CheckCircle2, label: "Buyer Confirmed" },
            auto_release_eligible: { bg: "bg-emerald-100", text: "text-emerald-700", icon: Timer, label: "Auto-Release Eligible" },
            released: { bg: "bg-green-100", text: "text-green-700", icon: Unlock, label: "Released" },
            disputed: { bg: "bg-rose-100", text: "text-rose-700", icon: AlertTriangle, label: "Disputed" },
            refunded: { bg: "bg-gray-100", text: "text-gray-700", icon: DollarSign, label: "Refunded" },
        };

        const s = styles[status] || styles.held;
        const Icon = s.icon;

        return (
            <span className={cn("text-[9px] font-black uppercase px-2.5 py-1 rounded-full inline-flex items-center gap-1", s.bg, s.text)}>
                <Icon className="h-3 w-3" />
                {s.label}
            </span>
        );
    };

    const getDaysSinceOrder = (createdAt: string) => {
        return Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
    };

    const getSellerName = (sellerId: string) => {
        const sellers = DemoStore.getSellers();
        const seller = sellers.find(s => s.id === sellerId);
        return seller?.business_name || "Unknown Seller";
    };

    return (
        <div className="space-y-6 max-w-6xl">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">Escrow Management</h2>
                <p className="text-sm text-gray-500 font-bold uppercase tracking-wider mt-1">
                    Order funds held in trust until confirmed delivery
                </p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
                            <Lock className="h-4 w-4" />
                        </div>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Held</span>
                    </div>
                    <p className="text-xl font-black text-gray-900">₦{totalHeldAmount.toLocaleString()}</p>
                    <p className="text-[10px] text-gray-400 font-bold mt-1">{heldCount} orders in escrow</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
                            <Timer className="h-4 w-4" />
                        </div>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pending Release</span>
                    </div>
                    <p className="text-xl font-black text-gray-900">{pendingReleaseCount}</p>
                    <p className="text-[10px] text-gray-400 font-bold mt-1">Awaiting admin approval</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
                            <Unlock className="h-4 w-4" />
                        </div>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Released</span>
                    </div>
                    <p className="text-xl font-black text-gray-900">₦{totalReleasedAmount.toLocaleString()}</p>
                    <p className="text-[10px] text-gray-400 font-bold mt-1">{releasedCount} released to sellers</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
                            <TrendingUp className="h-4 w-4" />
                        </div>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Volume</span>
                    </div>
                    <p className="text-xl font-black text-gray-900">₦{(totalHeldAmount + totalReleasedAmount).toLocaleString()}</p>
                    <p className="text-[10px] text-gray-400 font-bold mt-1">{orders.length} total orders</p>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="bg-white p-1.5 rounded-2xl border border-gray-100 inline-flex gap-1 shadow-sm">
                {([
                    { key: "all", label: "All Orders" },
                    { key: "held", label: "In Escrow" },
                    { key: "seller_confirmed", label: "Pending Release" },
                    { key: "disputed", label: `Disputed${disputedCount > 0 ? ` (${disputedCount})` : ""}` },
                    { key: "released", label: "Released" },
                ] as const).map(f => (
                    <button
                        key={f.key}
                        onClick={() => setFilter(f.key)}
                        className={cn(
                            "px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                            filter === f.key
                                ? "bg-indigo-600 text-white shadow-lg"
                                : "text-gray-400 hover:text-gray-600"
                        )}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {/* Orders Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {filteredOrders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-16 text-center">
                        <ShieldCheck className="h-14 w-14 text-gray-200 mb-4" />
                        <h3 className="text-lg font-black text-gray-300">No orders in this view</h3>
                        <p className="text-xs text-gray-400 mt-1">Orders matching this filter will appear here.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50/50">
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Order</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Product</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Seller</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Amount</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Escrow Status</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Days</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredOrders.map(order => {
                                    const isAutoEligible = DemoStore.checkAutoReleaseEligible(order);
                                    const days = getDaysSinceOrder(order.created_at);
                                    const dispute = order.escrow_status === "disputed" ? DemoStore.getDisputeByOrderId(order.id) : null;
                                    return (
                                        <tr key={order.id} className="hover:bg-gray-50/30 transition-colors group">
                                            <td className="px-6 py-5 align-middle">
                                                <div>
                                                    <p className="text-xs font-black text-indigo-600 uppercase tracking-wider">#{order.id}</p>
                                                    <p className="text-[10px] text-gray-400 font-bold mt-0.5">
                                                        {order.customer_name || `Customer ${order.customer_id}`}
                                                    </p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 align-middle">
                                                <p className="text-xs font-bold text-gray-900 truncate max-w-[200px]">
                                                    {order.product?.name || `Product ${order.product_id}`}
                                                </p>
                                            </td>
                                            <td className="px-6 py-5 align-middle">
                                                <p className="text-xs font-bold text-gray-700">
                                                    {order.seller_name || getSellerName(order.seller_id)}
                                                </p>
                                            </td>
                                            <td className="px-6 py-5 align-middle">
                                                <p className="text-sm font-black text-gray-900">₦{order.amount.toLocaleString()}</p>
                                            </td>
                                            <td className="px-6 py-5 align-middle">
                                                <div className="flex flex-col items-start gap-1.5">
                                                    {getStatusBadge(order)}
                                                    {isAutoEligible && (
                                                        <p className="text-[9px] text-emerald-600 font-bold flex items-center gap-1"><Zap className="h-3 w-3" /> Ready for auto-release</p>
                                                    )}
                                                    {dispute && (
                                                        <div className="mt-1 bg-rose-50 border border-rose-100 p-2 rounded-lg max-w-xs">
                                                            <p className="text-[10px] font-black text-rose-700 uppercase tracking-wider mb-0.5 flex items-center gap-1">
                                                                <AlertTriangle className="h-3 w-3" /> {dispute.reason.replace(/_/g, " ")}
                                                            </p>
                                                            <p className="text-[10px] text-rose-600 line-clamp-2 leading-tight">"{dispute.description}"</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 align-middle">
                                                <div className="flex items-center gap-1.5">
                                                    <Clock className="h-3 w-3 text-gray-400" />
                                                    <span className={cn(
                                                        "text-xs font-bold",
                                                        days > 5 ? "text-rose-600" : days > 3 ? "text-amber-600" : "text-gray-500"
                                                    )}>
                                                        {days}d
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 align-middle text-right">
                                                <div className="flex items-center justify-end gap-2 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {order.escrow_status === "held" && (
                                                        <Button
                                                            onClick={() => handleSellerConfirm(order.id)}
                                                            size="sm"
                                                            className="h-8 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] uppercase tracking-widest"
                                                        >
                                                            <Package className="h-3 w-3 mr-1" />
                                                            Confirm Delivery
                                                        </Button>
                                                    )}
                                                    {(order.escrow_status === "seller_confirmed" || order.escrow_status === "buyer_confirmed" || isAutoEligible) && (
                                                        <Button
                                                            onClick={() => handleRelease(order.id)}
                                                            size="sm"
                                                            className={cn(
                                                                "h-8 px-3 rounded-lg text-white font-bold text-[10px] uppercase tracking-widest",
                                                                isAutoEligible ? "bg-emerald-600 hover:bg-emerald-700 animate-pulse" : "bg-emerald-600 hover:bg-emerald-700"
                                                            )}
                                                        >
                                                            <Unlock className="h-3 w-3 mr-1" />
                                                            Release to Seller
                                                        </Button>
                                                    )}
                                                    {order.escrow_status === "seller_confirmed" && !isAutoEligible && (
                                                        <Button
                                                            onClick={() => handleBuyerConfirm(order.id)}
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-8 px-3 rounded-lg font-bold text-[10px] uppercase tracking-widest"
                                                        >
                                                            <CheckCircle2 className="h-3 w-3 mr-1" />
                                                            Buyer Received
                                                        </Button>
                                                    )}
                                                    {order.escrow_status === "released" && (
                                                        <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                                                            <CheckCircle2 className="h-3 w-3" /> Funds Released
                                                        </span>
                                                    )}
                                                    {order.escrow_status === "disputed" && (
                                                        <div className="flex items-center gap-2">
                                                            <Button
                                                                onClick={() => setChatModal({ isOpen: true, orderId: order.id })}
                                                                size="sm"
                                                                variant="outline"
                                                                className="h-8 px-3 rounded-lg border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 font-bold text-[10px] uppercase tracking-widest"
                                                            >
                                                                <MessageSquare className="h-3 w-3 mr-1" /> View Chat
                                                            </Button>
                                                            <Button
                                                                onClick={() => handleRefund(order.id)}
                                                                size="sm"
                                                                className="h-8 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] uppercase tracking-widest"
                                                            >
                                                                <DollarSign className="h-3 w-3 mr-1" /> Issue Refund
                                                            </Button>
                                                            <Button
                                                                onClick={() => handleReleaseDisputed(order.id)}
                                                                size="sm"
                                                                variant="outline"
                                                                className="h-8 px-3 rounded-lg font-bold text-[10px] uppercase tracking-widest"
                                                            >
                                                                <Unlock className="h-3 w-3 mr-1" /> Release to Seller
                                                            </Button>
                                                        </div>
                                                    )}
                                                    {order.escrow_status === "refunded" && (
                                                        <span className="text-[10px] text-gray-500 font-bold flex items-center gap-1">
                                                            <DollarSign className="h-3 w-3" /> Refunded
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Info Banner */}
            <div className="bg-indigo-600 rounded-2xl p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="text-center md:text-left">
                    <h3 className="text-xl font-black tracking-tight">Escrow Release Protocol</h3>
                    <p className="text-indigo-100/70 text-sm font-bold mt-1">
                        Funds auto-eligible for release 3 days after seller confirms delivery if no dispute is raised. Final release requires admin approval.
                    </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-2 text-xs font-bold text-indigo-200">
                        <Lock className="h-4 w-4" />
                        <span>Order Placed</span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-indigo-300" />
                    <div className="flex items-center gap-2 text-xs font-bold text-indigo-200">
                        <Package className="h-4 w-4" />
                        <span>Seller Ships</span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-indigo-300" />
                    <div className="flex items-center gap-2 text-xs font-bold text-indigo-200">
                        <Timer className="h-4 w-4" />
                        <span>3-5 Day Hold</span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-indigo-300" />
                    <div className="flex items-center gap-2 text-xs font-bold text-white">
                        <Unlock className="h-4 w-4" />
                        <span>Admin Releases</span>
                    </div>
                </div>
            </div>

            {/* Action Confirmation Modal */}
            <AnimatePresence>
                {actionModal.isOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setActionModal({ isOpen: false, type: null, orderId: null, message: "" })}
                            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100"
                        >
                            <div className="p-6">
                                <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mb-4">
                                    <AlertTriangle className="h-6 w-6" />
                                </div>
                                <h3 className="text-xl font-black text-gray-900 mb-2">Confirm Action</h3>
                                <p className="text-sm text-gray-600 font-medium">{actionModal.message}</p>
                            </div>
                            <div className="bg-gray-50/80 p-5 flex flex-col-reverse sm:flex-row justify-end gap-3 border-t border-gray-100">
                                <Button variant="ghost" onClick={() => setActionModal({ isOpen: false, type: null, orderId: null, message: "" })} className="font-bold text-gray-500">Cancel</Button>
                                <Button
                                    className={cn("font-bold shadow-md", actionModal.type === "refund" ? "bg-rose-600 hover:bg-rose-700 text-white" : "bg-emerald-600 hover:bg-emerald-700 text-white")}
                                    onClick={confirmAction}
                                >
                                    Confirm Proceed
                                </Button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* QA Chat Monitoring Modal */}
            <AnimatePresence>
                {chatModal.isOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setChatModal({ isOpen: false, orderId: null })}
                            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg bg-gray-50 rounded-2xl shadow-2xl overflow-hidden border border-gray-200 flex flex-col"
                        >
                            <div className="bg-slate-900 text-white p-4 flex items-center justify-between shadow-md z-10">
                                <div className="flex items-center gap-3">
                                    <div className="bg-slate-800 p-2 rounded-lg">
                                        <Eye className="h-5 w-5 text-indigo-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold flex items-center gap-2">
                                            Live Order Chat
                                            <span className="bg-indigo-500/20 text-indigo-300 text-[10px] uppercase font-black px-2 py-0.5 rounded-full border border-indigo-500/30">QA Monitoring</span>
                                        </h3>
                                        <p className="text-[11px] text-slate-400">Order #{chatModal.orderId} • Read-only access</p>
                                    </div>
                                </div>
                                <button onClick={() => setChatModal({ isOpen: false, orderId: null })} className="text-slate-400 hover:text-white transition-colors">
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="flex-1 p-5 overflow-y-auto space-y-4 max-h-[60vh] min-h-[400px]">
                                {(chatModal.orderId ? DemoStore.getAdminMessagesForOrder(chatModal.orderId) : []).length > 0 ? (
                                    (() => {
                                        const order = DemoStore.getOrders().find(o => o.id === chatModal.orderId);
                                        const sellerId = order?.seller_id;
                                        return DemoStore.getAdminMessagesForOrder(chatModal.orderId!).map((msg, i) => {
                                            const isCustomer = msg.user_email !== undefined && msg.user_email !== "admin@ratel.shop";
                                            return (
                                                <div key={i} className={cn("flex flex-col max-w-[85%]", isCustomer ? "items-start" : "items-end self-end ml-auto")}>
                                                    <span className="text-[10px] font-bold text-gray-500 mb-1 ml-1">{isCustomer ? "Buyer" : "Seller"}</span>
                                                    <div className={cn("px-4 py-2.5 rounded-2xl shadow-sm text-sm", isCustomer ? "bg-white border text-gray-800 rounded-tl-sm" : "bg-indigo-600 text-white rounded-tr-sm")}>
                                                        {msg.message}
                                                    </div>
                                                </div>
                                            );
                                        });
                                    })()
                                ) : (
                                    <>
                                        <div className="mt-8 flex justify-center">
                                            <div className="bg-yellow-50 text-yellow-800 text-xs font-bold px-4 py-2 rounded-full border border-yellow-200 shadow-sm flex items-center gap-2">
                                                <Lock className="h-3.5 w-3.5" />
                                                End-to-end encrypted session
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-start max-w-[85%] mt-6">
                                            <span className="text-[10px] font-bold text-gray-500 mb-1 ml-1">Buyer</span>
                                            <div className="px-4 py-2.5 rounded-2xl shadow-sm text-sm bg-white border text-gray-800 rounded-tl-sm">
                                                Hi, I have a problem with my order. It looks damaged.
                                            </div>
                                            <span className="text-[9px] text-gray-400 mt-1 ml-2">Today, 2:30 PM</span>
                                        </div>
                                        <div className="flex flex-col items-end self-end ml-auto max-w-[85%] mt-4">
                                            <span className="text-[10px] font-bold text-gray-500 mb-1 mr-1">Seller</span>
                                            <div className="px-4 py-2.5 rounded-2xl shadow-sm text-sm bg-indigo-600 text-white rounded-tr-sm">
                                                I apologize for the inconvenience. Could you please provide pictures of the damage?
                                            </div>
                                            <span className="text-[9px] text-gray-400 mt-1 mr-2">Today, 2:35 PM</span>
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="bg-gray-200/50 p-4 border-t border-gray-200">
                                <div className="bg-white border border-gray-300 rounded-xl px-4 py-3 flex items-center justify-between opacity-60 cursor-not-allowed">
                                    <span className="text-sm text-gray-400 font-medium">Chat is read-only in QA mode...</span>
                                    <div className="h-6 w-6 rounded-full bg-gray-100 flex items-center justify-center">
                                        <Lock className="h-3 w-3 text-gray-400" />
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
