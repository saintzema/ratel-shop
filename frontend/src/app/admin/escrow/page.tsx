"use client";

import { useState, useEffect, useRef, useCallback, Fragment } from "react";
import Link from "next/link";
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
    X, Send, ImageIcon, Bot, ShieldAlert, Undo2,
    Eye,
    ChevronLeft,
    ArrowUpDown,
    ChevronDown
} from "lucide-react";
import { Pagination } from "@/components/ui/Pagination";
import { DataSyncService } from "@/lib/sync-store";
import { Button } from "@/components/ui/button";
import { cn, formatDateExact } from "@/lib/utils";
import { Order } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";

export default function EscrowManagement() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [allOrders, setAllOrders] = useState<Order[]>([]);
    const [filter, setFilter] = useState<"all" | "held" | "seller_confirmed" | "released" | "disputed">("all");
    const [sortBy, setSortBy] = useState<string>("newest");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 15;

    // Selection State
    const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);

    // Action Modal State
    const [actionModal, setActionModal] = useState<{
        isOpen: boolean;
        type: "release" | "refund" | "releaseDisputed" | "bulk_release" | "bulk_resolve_release" | "bulk_resolve_refund" | null;
        orderId: string | null;
        message: string;
    }>({ isOpen: false, type: null, orderId: null, message: "" });

    // Expanded Order Detail
    const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

    // QA Chat Modal State
    const [chatModal, setChatModal] = useState<{
        isOpen: boolean;
        orderId: string | null;
    }>({ isOpen: false, orderId: null });
    const [adminMessage, setAdminMessage] = useState("");
    const [chatMessages, setChatMessages] = useState<any[]>([]);
    const [chatImagePreview, setChatImagePreview] = useState<string | null>(null);
    const [adminTakeover, setAdminTakeover] = useState(false);
    const chatFileInputRef = useRef<HTMLInputElement>(null);
    const chatScrollRef = useRef<HTMLDivElement>(null);

    // Load and poll chat messages for the open chat modal
    const loadChatMessages = useCallback(() => {
        if (!chatModal.orderId) return;
        const msgs = DataSyncService.getOrderMessages(chatModal.orderId);
        setChatMessages(msgs || []);
    }, [chatModal.orderId]);

    useEffect(() => {
        if (chatModal.isOpen && chatModal.orderId) {
            loadChatMessages();
            const poll = setInterval(loadChatMessages, 3000);
            return () => clearInterval(poll);
        }
    }, [chatModal.isOpen, chatModal.orderId, loadChatMessages]);

    // Auto-scroll chat
    useEffect(() => {
        if (chatScrollRef.current) {
            chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
        }
    }, [chatMessages]);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const f = params.get("filter");
        if (f === "held" || f === "seller_confirmed" || f === "released" || f === "disputed") {
            setFilter(f);
        }
    }, []);

    useEffect(() => {
        const load = () => {
            const all = DataSyncService.getOrders();
            setAllOrders(all);
            setOrders(all);
        };
        load();
        
        // Initial sync and periodic heartbeat for Admin freshness
        DataSyncService.syncWithDB();
        const interval = setInterval(() => DataSyncService.syncWithDB(), 10000);

        window.addEventListener("storage", load);
        window.addEventListener("sync-store-update", load);

        return () => {
            window.removeEventListener("storage", load);
            window.removeEventListener("sync-store-update", load);
            clearInterval(interval);
        };
    }, []);

    const filteredOrders = filter === "all"
        ? orders
        : filter === "released"
            ? orders.filter(o => o.escrow_status === "released")
            : filter === "seller_confirmed"
                ? orders.filter(o => o.escrow_status === "buyer_confirmed" || (o.escrow_status === "seller_confirmed" && DataSyncService.checkAutoReleaseEligible(o)))
                : filter === "disputed"
                    ? orders.filter(o => o.escrow_status === "disputed" || o.status === "cancelled")
                    : orders.filter(o => o.escrow_status === "held");

    const sortedOrders = [...filteredOrders].sort((a, b) => {
        switch (sortBy) {
            case "newest":
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            case "oldest":
                return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            case "amount_high":
                return b.amount - a.amount;
            case "amount_low":
                return a.amount - b.amount;
            default:
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
    });

    const totalPages = Math.ceil(sortedOrders.length / itemsPerPage);
    const paginatedOrders = sortedOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const heldCount = orders.filter(o => o.escrow_status === "held").length;
    const pendingReleaseCount = orders.filter(o => o.escrow_status === "buyer_confirmed" || (o.escrow_status === "seller_confirmed" && DataSyncService.checkAutoReleaseEligible(o))).length;
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

    const handleBulkRelease = () => {
        setActionModal({ isOpen: true, type: "bulk_release", orderId: null, message: `Are you sure you want to bulk release escrow funds for ${selectedOrderIds.length} selected orders?` });
    };

    const handleBulkResolveRelease = () => {
        setActionModal({ isOpen: true, type: "bulk_resolve_release", orderId: null, message: `Are you sure you want to resolve disputes and RELEASE funds for ${selectedOrderIds.length} selected orders?` });
    };

    const handleBulkResolveRefund = () => {
        setActionModal({ isOpen: true, type: "bulk_resolve_refund", orderId: null, message: `Are you sure you want to resolve disputes and REFUND buyers for ${selectedOrderIds.length} selected orders?` });
    };

    const confirmAction = () => {
        const { type, orderId } = actionModal;

        if (type === "release" && orderId) {
            DataSyncService.releaseEscrow(orderId);
        } else if (type === "refund" && orderId) {
            const dispute = DataSyncService.getDisputeByOrderId(orderId);
            if (dispute) {
                DataSyncService.resolveDispute(dispute.id, "resolved_refund", "Admin issued refund");
            } else {
                const orders = DataSyncService.getOrders();
                const updated = orders.map(o => o.id === orderId ? { ...o, escrow_status: "refunded" as const } : o);
                localStorage.setItem(DataSyncService.STORAGE_KEYS.ORDERS, JSON.stringify(updated));
                fetch('/api/orders/update-status', {
                    method: 'POST',
                    body: JSON.stringify({ orderId, status: "refunded" })
                }).catch(() => {});
            }
        } else if (type === "releaseDisputed" && orderId) {
            const dispute = DataSyncService.getDisputeByOrderId(orderId);
            if (dispute) {
                DataSyncService.resolveDispute(dispute.id, "resolved_release", "Admin released funds to seller");
            } else {
                DataSyncService.releaseEscrow(orderId);
            }
        } else if (type === "bulk_release") {
            DataSyncService.bulkReleaseEscrow(selectedOrderIds);
            setSelectedOrderIds([]);
        } else if (type === "bulk_resolve_release" || type === "bulk_resolve_refund") {
            const resolution = type === "bulk_resolve_release" ? "resolved_release" : "resolved_refund";
            const disputes = DataSyncService.getDisputes();
            const relevantDisputeIds = disputes
                .filter(d => selectedOrderIds.includes(d.order_id))
                .map(d => d.id);
            DataSyncService.bulkResolveDisputes(relevantDisputeIds, resolution);
            setSelectedOrderIds([]);
        }

        setOrders(DataSyncService.getOrders());
        setActionModal({ isOpen: false, type: null, orderId: null, message: "" });
    };

    const handleSellerConfirm = (orderId: string) => {
        DataSyncService.sellerConfirmDelivery(orderId);
        setOrders(DataSyncService.getOrders());
    };

    const handleBuyerConfirm = (orderId: string) => {
        DataSyncService.buyerConfirmReceipt(orderId);
        setOrders(DataSyncService.getOrders());
    };

    const toggleSelection = (orderId: string) => {
        setSelectedOrderIds(prev => 
            prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]
        );
    };

    const toggleSelectAll = () => {
        if (selectedOrderIds.length === paginatedOrders.length) {
            setSelectedOrderIds([]);
        } else {
            setSelectedOrderIds(paginatedOrders.map(o => o.id));
        }
    };

    const getStatusBadge = (order: Order) => {
        const isAutoEligible = DataSyncService.checkAutoReleaseEligible(order);
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
        const sellers = DataSyncService.getSellers();
        const seller = sellers.find(s => s.id === sellerId);
        return seller?.business_name || "Unknown Seller";
    };

    return (
        <div className="space-y-6 max-w-6xl pb-24 relative">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">Escrow Management</h2>
                    <p className="text-sm text-gray-500 font-bold uppercase tracking-wider mt-1">
                        Order funds held in trust until confirmed delivery
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button 
                        onClick={async () => {
                            const res = await fetch('/api/cron/auto-release');
                            const data = await res.json();
                            alert(data.message || `Processed ${data.processed} orders.`);
                            window.dispatchEvent(new Event("sync-store-update"));
                        }}
                        className="h-10 px-5 rounded-2xl bg-[#1A261D] hover:bg-[#233528] text-white border border-emerald-500/20 font-black text-[11px] uppercase tracking-widest shadow-xl shadow-emerald-500/10 flex items-center gap-2 group"
                    >
                        <Zap className="h-4 w-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                        Run Auto-Release Worker
                    </Button>
                    {selectedOrderIds.length > 0 && (
                        <motion.div 
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center gap-2 bg-white/50 backdrop-blur-md p-1 rounded-2xl border border-indigo-100"
                        >
                            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest px-3">{selectedOrderIds.length} Selected</span>
                            <Button variant="ghost" size="sm" onClick={() => setSelectedOrderIds([])} className="h-8 px-3 rounded-xl text-gray-500 font-bold text-[10px] uppercase">Clear</Button>
                        </motion.div>
                    )}
                </div>
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

            {/* Filter Tabs + Sort */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <div className="bg-white p-1.5 rounded-2xl border border-gray-100 inline-flex gap-1 shadow-sm flex-wrap">
                    {([
                        { key: "all", label: "All Orders" },
                        { key: "held", label: "In Escrow" },
                        { key: "seller_confirmed", label: "Pending Release" },
                        { key: "disputed", label: `Disputed${disputedCount > 0 ? ` (${disputedCount})` : ""}` },
                        { key: "released", label: "Released" },
                    ] as const).map(f => (
                        <button
                            key={f.key}
                            onClick={() => { setFilter(f.key); setCurrentPage(1); setSelectedOrderIds([]); }}
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
                <div className="relative shrink-0">
                    <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                    <select
                        value={sortBy}
                        onChange={(e) => { setSortBy(e.target.value); setCurrentPage(1); }}
                        className="appearance-none pl-9 pr-8 py-2 rounded-xl text-xs font-bold bg-white text-gray-600 border border-gray-200 outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                    >
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                        <option value="amount_high">Amount: High → Low</option>
                        <option value="amount_low">Amount: Low → High</option>
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                </div>
            </div>

            {/* Orders Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {sortedOrders.length === 0 ? (
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
                                    <th className="pl-6 py-4 w-10">
                                        <input 
                                            type="checkbox" 
                                            checked={selectedOrderIds.length === paginatedOrders.length && paginatedOrders.length > 0}
                                            onChange={toggleSelectAll}
                                            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                    </th>
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
                                {paginatedOrders.map(order => {
                                    const isAutoEligible = DataSyncService.checkAutoReleaseEligible(order);
                                    const days = getDaysSinceOrder(order.created_at);
                                    const dispute = order.escrow_status === "disputed" ? DataSyncService.getDisputeByOrderId(order.id) : null;
                                    const isSelected = selectedOrderIds.includes(order.id);

                                    return (
                                        <Fragment key={order.id}>
                                            <tr className={cn("hover:bg-gray-50/30 transition-colors group cursor-pointer", isSelected && "bg-indigo-50/20")} onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}>
                                                <td className="pl-6 py-5" onClick={(e) => e.stopPropagation()}>
                                                    <input 
                                                        type="checkbox" 
                                                        checked={isSelected}
                                                        onChange={() => toggleSelection(order.id)}
                                                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                    />
                                                </td>
                                                <td className="px-6 py-5 align-middle">
                                                    <div>
                                                        <p className="text-xs font-black text-indigo-600 uppercase tracking-wider hover:underline">#{order.id}</p>
                                                        <p className="text-[10px] text-gray-400 font-bold mt-0.5">
                                                            {order.customer_name || `Customer ${order.customer_id}`}
                                                        </p>
                                                        <p className="text-[10px] text-gray-300 font-medium">
                                                            {formatDateExact(order.created_at)}
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
                                                    <div className="flex items-center justify-end gap-2 transition-opacity">
                                                        {order.escrow_status === "held" && (
                                                            <Button
                                                                onClick={(e) => { e.stopPropagation(); handleSellerConfirm(order.id); }}
                                                                size="sm"
                                                                className="h-8 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] uppercase tracking-widest"
                                                            >
                                                                <Package className="h-3 w-3 mr-1" />
                                                                Confirm Delivery
                                                            </Button>
                                                        )}
                                                        {(order.escrow_status === "seller_confirmed" || order.escrow_status === "buyer_confirmed" || isAutoEligible) && (
                                                            <Button
                                                                 onClick={(e) => { e.stopPropagation(); handleRelease(order.id); }}
                                                                 size="sm"
                                                                 className={cn(
                                                                     "h-8 px-3 rounded-lg text-white font-bold text-[10px] uppercase tracking-widest",
                                                                     isAutoEligible ? "bg-indigo-600 hover:bg-indigo-700 animate-pulse" : "bg-emerald-600 hover:bg-emerald-700"
                                                                 )}
                                                             >
                                                                 <Unlock className="h-3 w-3 mr-1" />
                                                                 {isAutoEligible ? "Admin Force Release (24h+)" : "Release to Seller"}
                                                             </Button>
                                                         )}
                                                        {order.escrow_status === "seller_confirmed" && !isAutoEligible && (
                                                            <Button
                                                                onClick={(e) => { e.stopPropagation(); handleBuyerConfirm(order.id); }}
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
                                                                    onClick={(e) => { e.stopPropagation(); setChatModal({ isOpen: true, orderId: order.id }); }}
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="h-8 px-3 rounded-lg border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 font-bold text-[10px] uppercase tracking-widest"
                                                                >
                                                                    <MessageSquare className="h-3 w-3 mr-1" /> View Chat
                                                                </Button>
                                                                <Button
                                                                    onClick={(e) => { e.stopPropagation(); handleRefund(order.id); }}
                                                                    size="sm"
                                                                    className="h-8 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] uppercase tracking-widest"
                                                                >
                                                                    <DollarSign className="h-3 w-3 mr-1" /> Issue Refund
                                                                </Button>
                                                                <Button
                                                                    onClick={(e) => { e.stopPropagation(); handleReleaseDisputed(order.id); }}
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
                                            {/* Expandable Order Detail */}
                                            {
                                                expandedOrderId === order.id && (
                                                    <tr>
                                                        <td colSpan={8} className="bg-indigo-50/30 px-6 py-5 border-b-2 border-indigo-100">
                                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                                <div className="space-y-3">
                                                                    <h4 className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">Order Details</h4>
                                                                    <div className="space-y-2 text-sm">
                                                                        <p><span className="font-bold text-gray-500">Date:</span> <span className="font-medium">{new Date(order.created_at).toLocaleString()}</span></p>
                                                                        <p><span className="font-bold text-gray-500">Status:</span> <span className="font-medium">{order.status}</span></p>
                                                                        <p><span className="font-bold text-gray-500">Amount:</span> <span className="font-black text-gray-900">₦{order.amount.toLocaleString()}</span></p>
                                                                        {order.shipping_address && <p><span className="font-bold text-gray-500">Delivery:</span> <span className="font-medium">{order.shipping_address}</span></p>}
                                                                    </div>
                                                                </div>
                                                                <div className="space-y-3">
                                                                    <h4 className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">Buyer & Seller</h4>
                                                                    <div className="space-y-2 text-sm">
                                                                        <p><span className="font-bold text-gray-500">Buyer:</span> <Link href={`/admin/users/${order.customer_id || order.customer_name}`} className="font-medium text-indigo-600 hover:underline">{order.customer_name || order.customer_id}</Link></p>
                                                                        <p><span className="font-bold text-gray-500">Seller:</span> <Link href={`/admin/users/${order.seller_id}`} className="font-medium text-indigo-600 hover:underline">{order.seller_name || getSellerName(order.seller_id)}</Link></p>
                                                                        <p><span className="font-bold text-gray-500">Product:</span> <span className="font-medium">{order.product?.name || `Product ${order.product_id}`}</span></p>
                                                                    </div>
                                                                </div>
                                                                <div className="space-y-3">
                                                                    <h4 className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">Delivery Confirmation</h4>
                                                                    <div className="space-y-2 text-sm">
                                                                        <p><span className="font-bold text-gray-500">Seller Confirmed:</span> <span className={order.escrow_status !== 'held' ? 'text-emerald-600 font-bold' : 'text-gray-400'}>{order.escrow_status !== 'held' ? '✅ Yes' : '❌ Not yet'}</span></p>
                                                                        <p><span className="font-bold text-gray-500">Buyer Received:</span> <span className={order.escrow_status === 'buyer_confirmed' || order.escrow_status === 'released' ? 'text-emerald-600 font-bold' : 'text-gray-400'}>{order.escrow_status === 'buyer_confirmed' || order.escrow_status === 'released' ? '✅ Yes' : '❌ Not yet'}</span></p>
                                                                        <p><span className="font-bold text-gray-500">Escrow:</span> <span className="font-bold">{order.escrow_status?.replace(/_/g, ' ')}</span></p>
                                                                    </div>
                                                                    <div className="flex gap-2 mt-3">
                                                                        <Button size="sm" variant="outline" className="text-xs font-bold rounded-lg h-8 px-3 border-indigo-200 text-indigo-600" onClick={(e) => { e.stopPropagation(); setChatModal({ isOpen: true, orderId: order.id }); }}>View Chat</Button>
                                                                        <Link href={`/admin/users/${order.customer_id || order.customer_name}`} onClick={(e) => e.stopPropagation()}>
                                                                            <Button size="sm" variant="outline" className="text-xs font-bold rounded-lg h-8 px-3">Message Buyer</Button>
                                                                        </Link>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )
                                            }
                                        </Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination Controls */}
                <Pagination 
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    itemsPerPage={itemsPerPage}
                    totalItems={filteredOrders.length}
                    type="orders"
                />
            </div>

            {/* Bulk Action Bar - Sticky at bottom */}
            <AnimatePresence>
                {selectedOrderIds.length > 0 && (
                    <motion.div
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 w-full max-w-2xl px-4"
                    >
                        <div className="bg-slate-900 text-white rounded-2xl shadow-2xl p-4 flex items-center justify-between border border-slate-800 backdrop-blur-md">
                            <div className="flex items-center gap-4 px-2">
                                <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center font-black">
                                    {selectedOrderIds.length}
                                </div>
                                <div>
                                    <h4 className="text-sm font-black uppercase tracking-widest">Bulk Actions</h4>
                                    <p className="text-[10px] text-slate-400 font-bold">Orders Selected</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {filter === "disputed" ? (
                                    <>
                                        <Button 
                                            onClick={handleBulkResolveRefund}
                                            size="sm" 
                                            className="h-10 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 font-black text-[10px] uppercase tracking-widest"
                                        >
                                            <DollarSign className="h-3 w-3 mr-1" /> Bulk Refund
                                        </Button>
                                        <Button 
                                            onClick={handleBulkResolveRelease}
                                            size="sm" 
                                            className="h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-black text-[10px] uppercase tracking-widest"
                                        >
                                            <Unlock className="h-3 w-3 mr-1" /> Bulk Release
                                        </Button>
                                    </>
                                ) : (
                                    <Button 
                                        onClick={handleBulkRelease}
                                        size="sm" 
                                        className="h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-black text-[10px] uppercase tracking-widest"
                                    >
                                        <Unlock className="h-3 w-3 mr-1" /> Release Funds
                                    </Button>
                                )}
                                <Button 
                                    onClick={() => setSelectedOrderIds([])}
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-10 px-4 rounded-xl text-slate-400 hover:text-white font-black text-[10px] uppercase tracking-widest"
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Info Banner */}
            <div className="bg-indigo-600 rounded-2xl p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="text-center md:text-left">
                    <h3 className="text-xl font-black tracking-tight">Escrow Release Protocol</h3>
                    <p className="text-indigo-100/70 text-sm font-bold mt-1">
                        Funds auto-eligible for release 24 hours after seller confirms delivery if no dispute is raised. Final release requires admin approval or buyer confirmation.
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
                        <span>24 Hour Hold</span>
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
                            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[70] w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100"
                        >
                            <div className="p-6">
                                <div className={cn(
                                    "w-12 h-12 rounded-full flex items-center justify-center mb-4",
                                    actionModal.type?.includes("refund") ? "bg-rose-100 text-rose-600" : "bg-amber-100 text-amber-600"
                                )}>
                                    {actionModal.type?.includes("refund") ? <DollarSign className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
                                </div>
                                <h3 className="text-xl font-black text-gray-900 mb-2">Confirm Action</h3>
                                <p className="text-sm text-gray-600 font-medium">{actionModal.message}</p>
                            </div>
                            <div className="bg-gray-50/80 p-5 flex flex-col-reverse sm:flex-row justify-end gap-3 border-t border-gray-100">
                                <Button variant="ghost" onClick={() => setActionModal({ isOpen: false, type: null, orderId: null, message: "" })} className="font-bold text-gray-500">Cancel</Button>
                                <Button
                                    className={cn(
                                        "font-bold shadow-md", 
                                        actionModal.type?.includes("refund") ? "bg-rose-600 hover:bg-rose-700 text-white" : "bg-emerald-600 hover:bg-emerald-700 text-white"
                                    )}
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
                            onClick={() => { setChatModal({ isOpen: false, orderId: null }); setAdminTakeover(false); setChatImagePreview(null); }}
                            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg bg-gray-50 rounded-2xl shadow-2xl overflow-hidden border border-gray-200 flex flex-col max-h-[85vh]"
                        >
                            <div className="bg-slate-900 text-white p-4 flex items-center justify-between shadow-md z-10">
                                <div className="flex items-center gap-3">
                                    <div className="bg-slate-800 p-2 rounded-lg">
                                        <Eye className="h-5 w-5 text-indigo-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold flex items-center gap-2">
                                            Live Order Chat
                                            <span className={cn("text-[10px] uppercase font-black px-2 py-0.5 rounded-full border", adminTakeover ? "bg-rose-500/20 text-rose-300 border-rose-500/30" : "bg-indigo-500/20 text-indigo-300 border-indigo-500/30")}>
                                                {adminTakeover ? "Admin Active" : "QA Monitoring"}
                                            </span>
                                        </h3>
                                        <p className="text-[11px] text-slate-400">Order #{chatModal.orderId}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {adminTakeover ? (
                                        <button onClick={() => setAdminTakeover(false)} className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 px-3 py-1.5 rounded-lg border border-emerald-500/30 transition-colors flex items-center gap-1">
                                            <Bot className="h-3 w-3" /> Hand Back
                                        </button>
                                    ) : (
                                        <button onClick={() => setAdminTakeover(true)} className="text-[10px] font-bold bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 px-3 py-1.5 rounded-lg border border-rose-500/30 transition-colors flex items-center gap-1">
                                            <ShieldAlert className="h-3 w-3" /> Take Over
                                        </button>
                                    )}
                                    <button onClick={() => { setChatModal({ isOpen: false, orderId: null }); setAdminTakeover(false); setChatImagePreview(null); }} className="text-slate-400 hover:text-white transition-colors">
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>

                            <div ref={chatScrollRef} className="flex-1 p-5 overflow-y-auto space-y-4 min-h-[300px]">
                                {chatMessages.length > 0 ? (
                                    (() => {
                                        const order = DataSyncService.getOrders().find(o => o.id === chatModal.orderId);
                                        const sellerId = order?.seller_id;
                                        return chatMessages.map((msg, i) => {
                                            const isCustomer = msg.sender === "user";
                                            const isZiva = msg.sender === "ziva";
                                            const isSeller = msg.sender === "seller" || (sellerId && msg.sender === sellerId);
                                            const isAdmin = msg.sender === "admin";
                                            const senderLabel = isCustomer ? "Buyer" : isZiva ? "Ziva AI" : isSeller ? "Seller" : isAdmin ? "Admin" : msg.sender;
                                            const bubbleColor = isCustomer ? "bg-white border text-gray-800 rounded-tl-sm" : isZiva ? "bg-emerald-600 text-white rounded-tr-sm" : isSeller ? "bg-blue-600 text-white rounded-tr-sm" : "bg-indigo-600 text-white rounded-tr-sm";
                                            const align = isCustomer ? "items-start" : "items-end self-end ml-auto";
                                            return (
                                                <div key={msg.id || i} className={cn("flex flex-col max-w-[85%]", align)}>
                                                    {msg.replyTo && (
                                                        <div className="text-[10px] text-gray-400 mb-1 ml-1 bg-gray-100 px-2 py-1 rounded-lg border border-gray-200">
                                                            <span className="font-bold">{msg.replyTo.sender}:</span> {msg.replyTo.text.substring(0, 60)}...
                                                        </div>
                                                    )}
                                                    <span className={cn("text-[10px] font-bold mb-1", isCustomer ? "ml-1 text-gray-500" : "mr-1 text-gray-500")}>{senderLabel}</span>
                                                    <div className={cn("px-4 py-2.5 rounded-2xl shadow-sm text-sm", bubbleColor)}>
                                                        {msg.imageUrl && <img src={msg.imageUrl} alt="" className="max-w-[200px] rounded-xl mb-2 border border-white/20" />}
                                                        {msg.text}
                                                    </div>
                                                </div>
                                            );
                                        });
                                    })()
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-12 text-center">
                                        <MessageSquare className="h-10 w-10 text-gray-200 mb-3" />
                                        <p className="text-sm font-bold text-gray-400">No messages yet</p>
                                        <p className="text-xs text-gray-300 mt-1">Messages from the concierge chat will appear here.</p>
                                    </div>
                                )}
                            </div>

                            <div className="bg-gray-200/50 p-4 border-t border-gray-200">
                                {chatImagePreview && (
                                    <div className="mb-3 relative inline-block">
                                        <img src={chatImagePreview} alt="preview" className="h-16 w-16 object-cover rounded-xl border-2 border-indigo-100 shadow-sm" />
                                        <button onClick={() => setChatImagePreview(null)} className="absolute -top-2 -right-2 h-5 w-5 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md text-xs">✕</button>
                                    </div>
                                )}
                                <form onSubmit={(e) => {
                                    e.preventDefault();
                                    if ((adminMessage.trim() || chatImagePreview) && chatModal.orderId) {
                                        DataSyncService.addOrderMessage(chatModal.orderId, "admin", adminMessage.trim() || "[Image]", chatImagePreview || undefined);
                                        setAdminMessage("");
                                        setChatImagePreview(null);
                                        loadChatMessages();
                                    }
                                }} className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => chatFileInputRef.current?.click()}
                                        className="h-11 w-11 shrink-0 rounded-xl border border-gray-300 bg-white text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 flex items-center justify-center transition-colors"
                                    >
                                        <ImageIcon className="h-4 w-4" />
                                    </button>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        ref={chatFileInputRef}
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                const reader = new FileReader();
                                                reader.onloadend = () => setChatImagePreview(reader.result as string);
                                                reader.readAsDataURL(file);
                                            }
                                        }}
                                    />
                                    <input
                                        type="text"
                                        value={adminMessage}
                                        onChange={(e) => setAdminMessage(e.target.value)}
                                        placeholder={adminTakeover ? "Send a message as Admin..." : "Type a message as Admin/QA..."}
                                        className="flex-1 bg-white border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                    <button
                                        type="submit"
                                        disabled={!adminMessage.trim() && !chatImagePreview}
                                        className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-xl px-4 flex items-center justify-center transition-colors"
                                    >
                                        <Send className="h-5 w-5" />
                                    </button>
                                </form>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
