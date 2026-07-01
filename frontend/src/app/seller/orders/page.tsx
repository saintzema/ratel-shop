"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Order, ReturnRequest } from "@/lib/types";
import { DataSyncService } from "@/lib/sync-store";
import { formatPrice, formatDateExact } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Search,
    Filter,
    Truck,
    CheckCircle,
    Clock,
    Package,
    ShoppingBag,
    ChevronDown,
    ChevronUp,
    ShieldCheck,
    Lock,
    AlertTriangle,
    ArrowUpRight,
    Wallet,
    MessageSquare,
    ArrowUpDown,
    XCircle,
    Car,
    Banknote,
    CreditCard,
    MessageSquarePlus,
    Loader2
} from "lucide-react";

function SellerOrdersContent() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [returnRequests, setReturnRequests] = useState<ReturnRequest[]>([]);
    const [search, setSearch] = useState("");
    const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [sortBy, setSortBy] = useState<string>("newest");
    const [viewMode, setViewMode] = useState<"list" | "kanban">("list");
    const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
    const [cancelReason, setCancelReason] = useState<string>("");
    
    // Shipping Form State (Controlled)
    const [shipCarrier, setShipCarrier] = useState("");
    const [shipTrackingId, setShipTrackingId] = useState("");
    const [shipDriverName, setShipDriverName] = useState("");
    const [shipDriverPhone, setShipDriverPhone] = useState("");
    const [shipLocation, setShipLocation] = useState("Lagos Warehouse");
    const [shipArrivalDate, setShipArrivalDate] = useState("");
    const [warehouses, setWarehouses] = useState<{name: string, address: string}[]>([]);
    // Per-order status note drafts (keyed by order id)
    const [statusNotes, setStatusNotes] = useState<Record<string, string>>({});
    const [sendingNote, setSendingNote] = useState<string | null>(null);

    const searchParams = useSearchParams();

    // Read ?filter= from URL (e.g. from dashboard Total Revenue card)
    useEffect(() => {
        const urlFilter = searchParams?.get("filter");
        if (urlFilter && ["pending", "processing", "shipped", "delivered", "returns", "disputed"].includes(urlFilter)) {
            setStatusFilter(urlFilter);
        }
    }, [searchParams]);

    useEffect(() => {
        const sellerId = DataSyncService.getCurrentSellerId();
        if (!sellerId) return;

        const loadOrders = () => {
            const allOrders = DataSyncService.getOrders();
            setOrders(allOrders.filter(o => o.seller_id === sellerId));
            setReturnRequests(DataSyncService.getReturnRequests(sellerId));
        };

        const loadWarehouses = async () => {
            try {
                const res = await fetch("/api/admin/settings");
                if (res.ok) {
                    const data = await res.json();
                    if (data.supportConfig?.serviceCenters) {
                        setWarehouses(data.supportConfig.serviceCenters);
                        // If current shipLocation is default, and we have warehouses, maybe pick the first one?
                        // Or keep "Lagos Warehouse" as a fallback if it's not in the list.
                    }
                } else {
                    // Fallback to local storage if API fails
                    const local = localStorage.getItem("fp_admin_settings");
                    if (local) {
                        const data = JSON.parse(local);
                        if (data.supportConfig?.serviceCenters) {
                            setWarehouses(data.supportConfig.serviceCenters);
                        }
                    }
                }
            } catch (err) {
                console.error("Failed to load warehouses", err);
            }
        };

        loadOrders();
        loadWarehouses();
        window.addEventListener("storage", loadOrders);
        window.addEventListener("sync-store-update", loadOrders);
        return () => {
            window.removeEventListener("storage", loadOrders);
            window.removeEventListener("sync-store-update", loadOrders);
        };
    }, []);

    // Auto-expand order from notifications
    useEffect(() => {
        const urlId = searchParams?.get("id");
        if (urlId && orders.length > 0 && !expandedOrder) {
            setExpandedOrder(urlId);
        }
    }, [searchParams, orders]);

    const handleStatusUpdate = (orderId: string, newStatus: Order["status"]) => {
        DataSyncService.updateOrderStatus(orderId, newStatus);
        // Reload
        const sellerId = DataSyncService.getCurrentSellerId();
        if (sellerId) {
            setOrders(DataSyncService.getOrders().filter(o => o.seller_id === sellerId));
        }
        // Hot update across the app
        window.dispatchEvent(new Event("sync-store-update"));
    };

    const handleCancelOrder = (orderId: string) => {
        if (!cancelReason) {
            alert("Please select a reason for cancellation.");
            return;
        }
        DataSyncService.cancelOrderBySeller(orderId, cancelReason);
        setCancellingOrderId(null);
        setCancelReason("");
        // Reload
        const sellerId = DataSyncService.getCurrentSellerId();
        if (sellerId) {
            setOrders(DataSyncService.getOrders().filter(o => o.seller_id === sellerId));
        }
        window.dispatchEvent(new Event("sync-store-update"));
    };

    const handleRequestPayout = (order: Order) => {
        const seller = DataSyncService.getCurrentSeller();
        if (!seller || !seller.bank_name || !seller.account_number) {
            alert("Please set up your Bank details in the Payouts dashboard before requesting a cashout.");
            return;
        }

        const payoutInfo = DataSyncService.getSellerPayout(order.amount);

        DataSyncService.requestPayout(
            seller.id,
            [order.id],
            payoutInfo.payout,
            "Bank Transfer",
            seller.bank_name,
            seller.account_number.slice(-4)
        );

        // Track seller payout requested
        if (typeof window !== "undefined" && (window as any).pendo) {
            (window as any).pendo.track("seller_payout_requested", {
                amount: payoutInfo.payout,
                bank_name: seller.bank_name || "",
                payout_method: "Bank Transfer",
            });
        }

        alert(`Payout of ${formatPrice(payoutInfo.payout)} requested for order ${order.id}.`);

        // Reload to show pending layout
        if (seller.id) {
            setOrders(DataSyncService.getOrders().filter(o => o.seller_id === seller.id));
        }
    };

    const handleSendStatusNote = async (order: Order) => {
        const note = (statusNotes[order.id] || '').trim();
        if (!note) return;
        setSendingNote(order.id);
        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('fp_token') : null;
            await fetch('/api/orders', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({ id: order.id, status_note: note }),
            });
            // Notify buyer
            DataSyncService.addNotification({
                userId: order.customer_id,
                type: 'order',
                message: `📋 Update on your order "${order.product?.name}": ${note}`,
                link: '/account/orders',
            });
            // Notify admin
            DataSyncService.addNotification({
                userId: 'admin',
                type: 'order',
                message: `📋 Seller note on order ${order.id}: ${note}`,
                link: '/admin/orders',
            });
            // Clear the draft and update local orders list
            setStatusNotes(prev => ({ ...prev, [order.id]: '' }));
            setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status_note: note } : o));
        } catch {
            alert('Failed to send update. Please try again.');
        } finally {
            setSendingNote(null);
        }
    };

    const getStatusConfig = (status: string) => {
        switch (status) {
            case "pending": return { color: "bg-yellow-100 text-yellow-700 border-yellow-200", icon: <Clock className="h-3 w-3" />, label: "Pending" };
            case "processing": return { color: "bg-blue-100 text-blue-700 border-blue-200", icon: <Package className="h-3 w-3" />, label: "Processing" };
            case "shipped": return { color: "bg-purple-100 text-purple-700 border-purple-200", icon: <Truck className="h-3 w-3" />, label: "Shipped" };
            case "delivered": return { color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: <CheckCircle className="h-3 w-3" />, label: "Delivered" };
            case "return_requested": return { color: "bg-orange-100 text-orange-700 border-orange-200", icon: <AlertTriangle className="h-3 w-3" />, label: "Return Req." };
            case "return_approved": return { color: "bg-blue-100 text-blue-700 border-blue-200", icon: <Package className="h-3 w-3" />, label: "Return Appr." };
            case "returned": return { color: "bg-gray-100 text-gray-700 border-gray-200", icon: <CheckCircle className="h-3 w-3" />, label: "Returned" };
            default: return { color: "bg-gray-100 text-gray-700 border-gray-200", icon: null, label: status };
        }
    };

    const getEscrowConfig = (escrow: string) => {
        switch (escrow) {
            case "held": return { color: "text-amber-600 bg-amber-50", icon: <Lock className="h-3 w-3" />, label: "In Escrow" };
            case "released": return { color: "text-emerald-600 bg-emerald-50", icon: <ShieldCheck className="h-3 w-3" />, label: "Released" };
            case "disputed": return { color: "text-rose-600 bg-rose-50", icon: <AlertTriangle className="h-3 w-3" />, label: "Disputed" };
            case "refunded": return { color: "text-gray-600 bg-gray-50", icon: <ShieldCheck className="h-3 w-3" />, label: "Refunded" };
            default: return { color: "text-gray-400 bg-gray-50", icon: null, label: "None" };
        }
    };

    const filtered = orders.filter(o => {
        const matchSearch = o.id.toLowerCase().includes(search.toLowerCase()) ||
            o.product?.name?.toLowerCase().includes(search.toLowerCase());

        let matchStatus = false;
        if (statusFilter === "all") matchStatus = true;
        else if (statusFilter === "disputed") {
            matchStatus = o.escrow_status === "disputed";
        } else if (statusFilter === "return_requested" || statusFilter === "returns") {
            matchStatus = ["return_requested", "return_approved", "returned"].includes(o.status);
        } else {
            matchStatus = o.status === statusFilter;
        }

        return matchSearch && matchStatus;
    }).sort((a, b) => {
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

    return (
        <div className="space-y-6 w-full max-w-[1600px] mx-auto">
            {/* Dispute Notification Banner */}
            {orders.some(o => o.escrow_status === "disputed") && (
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
                    <div>
                        <p className="text-sm font-bold text-rose-800">
                            {orders.filter(o => o.escrow_status === "disputed").length} order(s) have open disputes
                        </p>
                        <p className="text-xs text-rose-600 mt-0.5">Buyer has reported an issue. Payment is frozen until the admin resolves the dispute.</p>
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight">Orders</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage and track all your orders.</p>
                </div>
                <div className="flex bg-gray-100 p-1 rounded-xl">
                    <button
                        onClick={() => setViewMode("list")}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === "list" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
                        List
                    </button>
                    <button
                        onClick={() => setViewMode("kanban")}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === "kanban" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line><line x1="15" y1="3" x2="15" y2="21"></line></svg>
                        Kanban
                    </button>
                </div>
            </div>

            {/* Filters bar */}
            <div className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder="Search order ID or product..."
                        className="pl-9 rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 flex-wrap">
                    {["all", "pending", "processing", "shipped", "delivered", "disputed", "returns"].map(s => {
                        const isSelected = statusFilter === s || (s === "returns" && ["return_requested", "return_approved", "returned"].includes(statusFilter));
                        return (
                            <button
                                key={s}
                                onClick={() => setStatusFilter(s === "returns" ? "return_requested" : s)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${isSelected
                                    ? "bg-gray-900 text-white shadow-sm"
                                    : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                                    }`}
                            >
                                {s.charAt(0).toUpperCase() + s.slice(1).replace("_", " ")}
                            </button>
                        );
                    })}
                </div>
                <div className="relative shrink-0">
                    <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="appearance-none pl-9 pr-8 py-2 rounded-xl text-xs font-bold bg-gray-50 text-gray-600 border-none outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
                    >
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                        <option value="amount_high">Amount: High → Low</option>
                        <option value="amount_low">Amount: Low → High</option>
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                </div>
            </div>

            {/* Orders view container */}
            {viewMode === "list" ? (
                <div className="space-y-3">
                    {filtered.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                            <ShoppingBag className="h-12 w-12 text-gray-200 mx-auto mb-3" />
                            <p className="text-gray-400 text-sm font-medium">No orders found.</p>
                        </div>
                    ) : (
                        filtered.map((order) => {
                            const statusConfig = getStatusConfig(order.status);
                            const escrowConfig = getEscrowConfig(order.escrow_status);
                            const isExpanded = expandedOrder === order.id;

                            return (
                                <div key={order.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                                    {/* Order header row */}
                                    <div
                                        className="p-5 flex items-center justify-between cursor-pointer hover:bg-gray-50/50 transition-colors"
                                        onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                                    >
                                        <div className="flex items-center gap-4 min-w-0">
                                            <div className="h-14 w-14 bg-gray-50 rounded-xl border border-gray-100 shrink-0 overflow-hidden">
                                                <img src={order.product?.image_url} className="w-full h-full object-contain mix-blend-multiply p-1.5" alt="" />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{order.id}</span>
                                                    <Badge variant="outline" className={`text-[10px] font-bold py-0 px-2 border ${statusConfig.color}`}>
                                                        {statusConfig.icon} <span className="ml-1">{statusConfig.label}</span>
                                                    </Badge>
                                                    {order.financing?.is_vehicle_loan && (
                                                        <span className="inline-flex items-center gap-1 text-[9px] font-black bg-gradient-to-r from-emerald-500 to-indigo-500 text-white px-2 py-0.5 rounded-full shadow-sm">
                                                            <Car className="h-2.5 w-2.5" /> FINANCED
                                                        </span>
                                                    )}
                                                </div>
                                                <h4 className="font-bold text-sm text-gray-900 mt-1 truncate">{order.product?.name}</h4>
                                                <p className="text-[11px] text-gray-400">{formatDateExact(order.created_at)} · Qty: 1</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 shrink-0">
                                            <div className="text-right hidden sm:block">
                                                <p className="font-black text-gray-900">{formatPrice(order.amount)}</p>
                                                {order.financing?.is_vehicle_loan && (
                                                    <p className="text-[10px] font-bold text-emerald-600 mt-0.5">
                                                        15% Deposit · Full: {formatPrice(order.financing.vehicle_price)}
                                                    </p>
                                                )}
                                                <div className="flex flex-col items-end gap-1">
                                                    <div className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${escrowConfig.color}`}>
                                                        {escrowConfig.icon} {escrowConfig.label}
                                                    </div>
                                                    {order.payout_status === "pending_payout" && (
                                                        <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">Payout Pending</span>
                                                    )}
                                                    {order.payout_status === "cashed_out" && (
                                                        <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">Cashed Out</span>
                                                    )}
                                                </div>
                                            </div>
                                            {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                                        </div>
                                    </div>

                                    {/* Expanded detail */}
                                    {isExpanded && (
                                        <div className="px-5 pb-5 border-t border-gray-100 pt-4">
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                                                <div>
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase block">Amount</span>
                                                    <span className="font-bold text-sm text-gray-900">{formatPrice(order.amount)}</span>
                                                </div>
                                                <div>
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase block">Quantity</span>
                                                    <span className="font-bold text-sm text-gray-900">1</span>
                                                </div>
                                                <div>
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase block">Escrow</span>
                                                    <div className={`inline-flex items-center gap-1 text-xs font-bold ${escrowConfig.color} px-2 py-0.5 rounded-full`}>
                                                        {escrowConfig.icon} {escrowConfig.label}
                                                    </div>
                                                </div>
                                                <div>
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase block">Est. Delivery</span>
                                                    <span className="font-bold text-sm text-gray-900">3-5 business days</span>
                                                </div>
                                            </div>

                                            {/* Vehicle Loan Financing Details */}
                                            {order.financing?.is_vehicle_loan && (
                                                <div className="mb-4 rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-indigo-50 overflow-hidden">
                                                    <div className="px-4 py-3 bg-gradient-to-r from-emerald-600 to-indigo-600 flex items-center gap-2">
                                                        <Car className="h-4 w-4 text-white" />
                                                        <h5 className="text-xs font-black text-white tracking-wide uppercase">Vehicle Loan Financing Details</h5>
                                                        <span className="ml-auto text-[9px] font-black bg-white/20 text-white px-2 py-0.5 rounded-full backdrop-blur-sm">LOAN ACTIVE</span>
                                                    </div>
                                                    <div className="p-4">
                                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
                                                            <div className="bg-white rounded-lg p-3 border border-gray-100 shadow-sm">
                                                                <div className="flex items-center gap-1.5 mb-1">
                                                                    <Car className="h-3 w-3 text-gray-400" />
                                                                    <span className="text-[9px] font-bold text-gray-400 uppercase">Vehicle Price</span>
                                                                </div>
                                                                <span className="font-black text-sm text-gray-900">{formatPrice(order.financing.vehicle_price)}</span>
                                                            </div>
                                                            <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-100 shadow-sm">
                                                                <div className="flex items-center gap-1.5 mb-1">
                                                                    <ShieldCheck className="h-3 w-3 text-emerald-500" />
                                                                    <span className="text-[9px] font-bold text-emerald-600 uppercase">Deposit Paid (15%)</span>
                                                                </div>
                                                                <span className="font-black text-sm text-emerald-700">{formatPrice(order.financing.deposit_paid)}</span>
                                                                <span className="block text-[9px] text-emerald-500 font-medium mt-0.5">Held in Escrow</span>
                                                            </div>
                                                            <div className="bg-amber-50 rounded-lg p-3 border border-amber-100 shadow-sm">
                                                                <div className="flex items-center gap-1.5 mb-1">
                                                                    <Banknote className="h-3 w-3 text-amber-500" />
                                                                    <span className="text-[9px] font-bold text-amber-600 uppercase">Loan Balance</span>
                                                                </div>
                                                                <span className="font-black text-sm text-amber-700">{formatPrice(order.financing.loan_balance)}</span>
                                                                <span className="block text-[9px] text-amber-500 font-medium mt-0.5">Outstanding</span>
                                                            </div>
                                                            <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-100 shadow-sm">
                                                                <div className="flex items-center gap-1.5 mb-1">
                                                                    <CreditCard className="h-3 w-3 text-indigo-500" />
                                                                    <span className="text-[9px] font-bold text-indigo-600 uppercase">Monthly Payment</span>
                                                                </div>
                                                                <span className="font-black text-sm text-indigo-700">{formatPrice(order.financing.monthly_payment)}</span>
                                                                <span className="block text-[9px] text-indigo-400 font-medium mt-0.5">Per Month</span>
                                                            </div>
                                                            <div className="bg-white rounded-lg p-3 border border-gray-100 shadow-sm">
                                                                <div className="flex items-center gap-1.5 mb-1">
                                                                    <Clock className="h-3 w-3 text-gray-400" />
                                                                    <span className="text-[9px] font-bold text-gray-400 uppercase">Loan Term</span>
                                                                </div>
                                                                <span className="font-black text-sm text-gray-900">{order.financing.tenor_months} Months</span>
                                                                <span className="block text-[9px] text-gray-400 font-medium mt-0.5">{order.financing.tenor_months / 12} Years</span>
                                                            </div>
                                                            <div className="bg-white rounded-lg p-3 border border-gray-100 shadow-sm">
                                                                <div className="flex items-center gap-1.5 mb-1">
                                                                    <Wallet className="h-3 w-3 text-gray-400" />
                                                                    <span className="text-[9px] font-bold text-gray-400 uppercase">Markup Rate</span>
                                                                </div>
                                                                <span className="font-black text-sm text-gray-900">{(order.financing.interest_rate * 100).toFixed(1)}% p.a.</span>
                                                            </div>
                                                        </div>
                                                        <div className="bg-gray-50 rounded-lg p-3 border border-gray-100 flex items-center justify-between">
                                                            <div>
                                                                <span className="text-[9px] font-bold text-gray-400 uppercase block">Total Repayment Over Loan Term</span>
                                                                <span className="font-black text-lg text-gray-900">{formatPrice(order.financing.total_repayment)}</span>
                                                            </div>
                                                            <div className="flex flex-col items-end gap-1">
                                                                {order.financing.condition && (
                                                                    <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                                                                        {order.financing.condition.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                                                                    </span>
                                                                )}
                                                                {order.financing.loan_type && (
                                                                    <span className="text-[9px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100">
                                                                        {order.financing.loan_type === 'bnpl' ? 'BNPL Loan' : 'Lease-to-Own'}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Status progression */}
                                            <div className="flex items-center gap-1 mb-4">
                                                {["pending", "processing", "shipped", "delivered"].map((step, i) => {
                                                    const statusOrder = ["pending", "processing", "shipped", "delivered"];
                                                    const currentIndex = statusOrder.indexOf(order.status);
                                                    const stepIndex = statusOrder.indexOf(step);
                                                    const isComplete = stepIndex <= currentIndex;
                                                    return (
                                                        <div key={step} className="flex items-center flex-1">
                                                            <div className={`h-1.5 w-full rounded-full transition-colors ${isComplete ? "bg-emerald-500" : "bg-gray-200"}`} />
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            {/* Action buttons */}
                                            <div className="space-y-4">
                                                {order.status === "processing" && (
                                                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                                        <h5 className="text-[10px] font-bold text-gray-400 uppercase mb-3">Shipping Details</h5>
                                                        {/* Show buyer destination */}
                                                        {order.shipping_address && (
                                                            <div className="mb-3 p-2 bg-blue-50 border border-blue-100 rounded-lg">
                                                                <p className="text-[10px] font-bold text-blue-600 uppercase">Ship To</p>
                                                                <p className="text-xs text-blue-800 font-medium">{order.shipping_address}</p>
                                                            </div>
                                                        )}
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                                                            <div className="space-y-1.5">
                                                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-1">Shipping Carrier</label>
                                                                <Input
                                                                    placeholder="Carrier (RT Logistics, DHL...)"
                                                                    className="h-9 text-xs rounded-lg"
                                                                    value={shipCarrier}
                                                                    onChange={(e) => setShipCarrier(e.target.value)}
                                                                />
                                                            </div>
                                                            <div className="space-y-1.5">
                                                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-1">Tracking ID (Optional)</label>
                                                                <Input
                                                                    placeholder="Tracking ID"
                                                                    className="h-9 text-xs rounded-lg"
                                                                    value={shipTrackingId}
                                                                    onChange={(e) => setShipTrackingId(e.target.value)}
                                                                />
                                                            </div>
                                                            <div className="space-y-1.5">
                                                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-1">Driver's Name</label>
                                                                <Input
                                                                    placeholder="Driver Name *"
                                                                    className="h-9 text-xs rounded-lg"
                                                                    value={shipDriverName}
                                                                    onChange={(e) => setShipDriverName(e.target.value)}
                                                                />
                                                            </div>
                                                            <div className="space-y-1.5">
                                                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-1">Driver's Phone Number</label>
                                                                <Input
                                                                    placeholder="Driver Phone *"
                                                                    className="h-9 text-xs rounded-lg"
                                                                    value={shipDriverPhone}
                                                                    onChange={(e) => setShipDriverPhone(e.target.value)}
                                                                    inputMode="tel"
                                                                />
                                                            </div>
                                                            <div className="space-y-1.5">
                                                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-1">Warehouse / Drop-off Location</label>
                                                                <div className="relative">
                                                                    <select
                                                                        className="w-full h-9 text-xs rounded-lg border border-gray-200 bg-white px-3 appearance-none focus:ring-2 focus:ring-purple-500/20 outline-none font-medium"
                                                                        value={shipLocation}
                                                                        onChange={(e) => setShipLocation(e.target.value)}
                                                                    >
                                                                        <option value="Lagos Warehouse">Lagos Warehouse (Default)</option>
                                                                        <option value="Abuja Warehouse">Abuja Warehouse</option>
                                                                        {warehouses.map((w, idx) => (
                                                                            <option key={idx} value={w.name}>{w.name}</option>
                                                                        ))}
                                                                    </select>
                                                                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                                                                </div>
                                                            </div>
                                                            <div className="space-y-1.5">
                                                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-1">Est. Arrival at Warehouse</label>
                                                                <Input
                                                                    placeholder="Est. Delivery Date"
                                                                    type="date"
                                                                    className="h-9 text-xs rounded-lg"
                                                                    value={shipArrivalDate}
                                                                    onChange={(e) => setShipArrivalDate(e.target.value)}
                                                                />
                                                            </div>
                                                        </div>
                                                        <Button
                                                            size="sm"
                                                            onClick={() => {
                                                                // Enforce required fields
                                                                if (!shipCarrier || !shipDriverName || !shipDriverPhone) {
                                                                    alert("Please fill in the Carrier, Driver Name, and Driver Phone before marking as shipped.");
                                                                    return;
                                                                }

                                                                const locationWithDate = shipArrivalDate 
                                                                    ? `${shipLocation} (Est. Arrival: ${shipArrivalDate})`
                                                                    : shipLocation;

                                                                DataSyncService.updateTrackingStatus(order.id, "Shipped from Warehouse", locationWithDate, shipCarrier, shipTrackingId, { name: shipDriverName, phone: shipDriverPhone });
                                                                // handleStatusUpdate -> updateOrderStatus already emails the buyer
                                                                // (ORDER_SHIPPED) using order.customer_email as the primary address.
                                                                handleStatusUpdate(order.id, "shipped");

                                                                // Reset form
                                                                setShipCarrier("");
                                                                setShipTrackingId("");
                                                                setShipDriverName("");
                                                                setShipDriverPhone("");
                                                                setShipLocation("Lagos Warehouse");
                                                                setShipArrivalDate("");

                                                                // Send notification to admin with driver details
                                                                DataSyncService.addNotification({
                                                                    userId: "admin",
                                                                    type: "order",
                                                                    message: `📦 Order ${order.id} shipped by ${DataSyncService.getCurrentSeller()?.business_name}. Driver: ${shipDriverName} (${shipDriverPhone}). Carrier: ${shipCarrier}. Tracking: ${shipTrackingId || 'N/A'}`,
                                                                    link: "/admin/orders"
                                                                });

                                                                // Notify buyer
                                                                DataSyncService.addNotification({
                                                                    userId: order.customer_id,
                                                                    type: "order",
                                                                    message: `🚚 Your order "${order.product?.name}" has been shipped! Driver: ${shipDriverName}. Tracking: ${shipTrackingId || shipCarrier}.`,
                                                                    link: "/account/orders"
                                                                });
                                                            }}
                                                            className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold h-9 w-full sm:w-auto"
                                                        >
                                                            <Truck className="h-3 w-3 mr-1.5" /> Confirm & Mark as Shipped
                                                        </Button>
                                                    </div>
                                                )}

                                                <div className="flex gap-2">
                                                    {order.status === "pending" && (
                                                        <>
                                                        <Button
                                                            size="sm"
                                                            onClick={() => {
                                                                DataSyncService.updateTrackingStatus(order.id, "Order Accepted", "Seller Storefront");
                                                                handleStatusUpdate(order.id, "processing");
                                                            }}
                                                            className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold h-9"
                                                        >
                                                            <CheckCircle className="h-3 w-3 mr-1.5" /> Accept Order
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => setCancellingOrderId(order.id)}
                                                            className="text-rose-600 border-rose-200 hover:bg-rose-50 rounded-xl text-xs font-bold h-9"
                                                        >
                                                            <XCircle className="h-3 w-3 mr-1.5" /> Cancel Order
                                                        </Button>
                                                        </>
                                                    )}
                                                    {order.status === "processing" && cancellingOrderId !== order.id && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => setCancellingOrderId(order.id)}
                                                            className="text-rose-600 border-rose-200 hover:bg-rose-50 rounded-xl text-xs font-bold h-9"
                                                        >
                                                            <XCircle className="h-3 w-3 mr-1.5" /> Cancel Order
                                                        </Button>
                                                    )}

                                                    {order.status === "shipped" && (
                                                        <Button
                                                            size="sm"
                                                            onClick={() => {
                                                                const confirmed = window.confirm(
                                                                    "Has the delivery company confirmed delivery to the customer's address?"
                                                                );
                                                                if (!confirmed) return;

                                                                DataSyncService.updateTrackingStatus(order.id, "Delivered to Customer", "Customer Address");
                                                                handleStatusUpdate(order.id, "delivered");

                                                                // Notify buyer
                                                                DataSyncService.addNotification({
                                                                    userId: order.customer_id,
                                                                    type: "order",
                                                                    message: `✅ Your order "${order.product?.name}" has been delivered! Please confirm receipt in your orders page.`,
                                                                    link: "/account/orders"
                                                                });

                                                                // Notify admin
                                                                DataSyncService.addNotification({
                                                                    userId: "admin",
                                                                    type: "order",
                                                                    message: `✅ Order ${order.id} marked as delivered by seller ${DataSyncService.getCurrentSeller()?.business_name}.`,
                                                                    link: "/admin/orders"
                                                                });
                                                            }}
                                                            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold h-9"
                                                        >
                                                            <CheckCircle className="h-3 w-3 mr-1.5" /> Confirm Delivery
                                                        </Button>
                                                    )}

                                                    {order.status !== "delivered" && order.status !== "returned" && order.status !== "return_requested" && order.status !== "return_approved" && (
                                                        <Link href={`/seller/dashboard/messages?order=${order.id}&customer=${order.customer_id}`}>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="text-brand-green-700 bg-brand-green-50/50 border-brand-green-200 hover:bg-brand-green-100 rounded-xl text-xs font-bold h-9"
                                                            >
                                                                <MessageSquare className="h-3 w-3 mr-1.5" /> View Buyer Chat (Ziva)
                                                            </Button>
                                                        </Link>
                                                    )}

                                                    {order.status === "delivered" && order.escrow_status !== "disputed" && (
                                                        <div className="flex items-center gap-4 w-full">
                                                            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1 flex-1">
                                                                <CheckCircle className="h-3.5 w-3.5" /> Order complete
                                                            </span>

                                                            {order.escrow_status === "released" && !order.payout_status && (
                                                                <Button
                                                                    size="sm"
                                                                    onClick={() => handleRequestPayout(order)}
                                                                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold h-9"
                                                                >
                                                                    <Wallet className="h-3 w-3 mr-1.5" /> Request Cashout
                                                                </Button>
                                                            )}
                                                            {order.payout_status === "pending_payout" && (
                                                                <span className="text-xs font-semibold text-blue-600 flex items-center gap-1">
                                                                    <Clock className="h-3.5 w-3.5" /> Cashout Processing
                                                                </span>
                                                            )}
                                                            {order.payout_status === "cashed_out" && (
                                                                <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                                                                    <Wallet className="h-3.5 w-3.5" /> Cashed Out
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}

                                                    {order.status === "return_requested" && (
                                                        <div className="flex flex-col gap-2 w-full">
                                                            <div className="bg-orange-50 border border-orange-100 p-3 rounded-xl mb-2">
                                                                <h5 className="text-[10px] font-bold text-orange-800 uppercase mb-1 flex items-center gap-1">
                                                                    <AlertTriangle className="h-3 w-3" /> Return Requested
                                                                </h5>
                                                                <p className="text-xs text-orange-700">
                                                                    {returnRequests.find(r => r.order_id === order.id)?.reason || "Buyer requested a return."}
                                                                </p>
                                                                <p className="text-[10px] text-orange-600 mt-1 italic">
                                                                    "{returnRequests.find(r => r.order_id === order.id)?.description}"
                                                                </p>
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <Button
                                                                    size="sm"
                                                                    onClick={() => {
                                                                        const req = returnRequests.find(r => r.order_id === order.id);
                                                                        if (req) {
                                                                            DataSyncService.updateReturnRequestStatus(req.id, "approved");
                                                                            setReturnRequests(DataSyncService.getReturnRequests(DataSyncService.getCurrentSellerId()!));
                                                                            setOrders(DataSyncService.getOrders().filter(o => o.seller_id === DataSyncService.getCurrentSellerId()));
                                                                        }
                                                                    }}
                                                                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold h-9 flex-1"
                                                                >
                                                                    Approve Return
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() => {
                                                                        const req = returnRequests.find(r => r.order_id === order.id);
                                                                        if (req) {
                                                                            DataSyncService.updateReturnRequestStatus(req.id, "rejected");
                                                                            setReturnRequests(DataSyncService.getReturnRequests(DataSyncService.getCurrentSellerId()!));
                                                                            setOrders(DataSyncService.getOrders().filter(o => o.seller_id === DataSyncService.getCurrentSellerId()));
                                                                        }
                                                                    }}
                                                                    className="text-gray-700 border-gray-200 hover:bg-gray-50 rounded-xl text-xs font-bold h-9 flex-1"
                                                                >
                                                                    Reject Return
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {order.status === "return_approved" && (
                                                        <div className="flex flex-col gap-2 w-full">
                                                            <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl mb-2">
                                                                <span className="text-xs font-bold text-blue-800">Return Approved</span>
                                                                <p className="text-[11px] text-blue-600 mt-1">Waiting for the buyer to send the item back. Once received, process the refund below.</p>
                                                            </div>
                                                            <Button
                                                                size="sm"
                                                                onClick={() => {
                                                                    const req = returnRequests.find(r => r.order_id === order.id);
                                                                    if (req) {
                                                                        DataSyncService.updateReturnRequestStatus(req.id, "refunded");
                                                                        setReturnRequests(DataSyncService.getReturnRequests(DataSyncService.getCurrentSellerId()!));
                                                                        setOrders(DataSyncService.getOrders().filter(o => o.seller_id === DataSyncService.getCurrentSellerId()));
                                                                    }
                                                                }}
                                                                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold h-9"
                                                            >
                                                                <Package className="h-3 w-3 mr-1.5" /> Mark Item Received & Refund
                                                            </Button>
                                                        </div>
                                                    )}

                                                    {order.status === "return_rejected" && (
                                                        <span className="text-xs font-semibold text-rose-600 flex items-center gap-1">
                                                            Return Rejected
                                                        </span>
                                                    )}

                                                    {order.status === "returned" && (
                                                        <span className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                                                            <CheckCircle className="h-3.5 w-3.5" /> Returned & Refunded
                                                        </span>
                                                    )}
                                                    {order.escrow_status === "disputed" && (
                                                        <div className="w-full bg-rose-50 p-3 rounded-xl border border-rose-100">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <AlertTriangle className="h-4 w-4 text-rose-600" />
                                                                <span className="text-xs font-bold text-rose-700">Buyer Dispute Filed</span>
                                                            </div>
                                                            <p className="text-[11px] text-rose-600 mb-2">Payment has been frozen. The platform admin is reviewing this case.</p>
                                                            <Link href={`/seller/dashboard/messages?order=${order.id}&customer=${order.customer_id}`}>
                                                                <Button size="sm" variant="outline" className="text-[10px] font-bold rounded-lg h-7 border-rose-200 text-rose-600 hover:bg-rose-100 bg-transparent">
                                                                    <MessageSquare className="h-3 w-3 mr-1" /> View Chat
                                                                </Button>
                                                            </Link>
                                                        </div>
                                                    )}

                                                    {/* Cancel Order Modal */}
                                                    {cancellingOrderId === order.id && (
                                                        <div className="w-full bg-rose-50 border border-rose-200 rounded-xl p-4 mt-2">
                                                            <h5 className="text-xs font-bold text-rose-800 mb-2 flex items-center gap-1.5">
                                                                <XCircle className="h-3.5 w-3.5" /> Cancel Order #{order.id.substring(0, 8)}
                                                            </h5>
                                                            <select
                                                                value={cancelReason}
                                                                onChange={(e) => setCancelReason(e.target.value)}
                                                                className="w-full h-9 text-xs rounded-lg border-rose-200 bg-white mb-2 px-3"
                                                            >
                                                                <option value="">Select a reason...</option>
                                                                <option value="Stock unavailable">Stock unavailable</option>
                                                                <option value="Pricing error">Pricing error</option>
                                                                <option value="Cannot fulfill order">Cannot fulfill order</option>
                                                                <option value="Product discontinued">Product discontinued</option>
                                                                <option value="Other">Other</option>
                                                            </select>
                                                            <div className="flex gap-2">
                                                                <Button
                                                                    size="sm"
                                                                    onClick={() => handleCancelOrder(order.id)}
                                                                    className="bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold h-8 flex-1"
                                                                >
                                                                    Confirm Cancellation
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() => { setCancellingOrderId(null); setCancelReason(""); }}
                                                                    className="text-gray-600 border-gray-200 hover:bg-gray-50 rounded-lg text-xs font-bold h-8"
                                                                >
                                                                    Keep Order
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Seller Status Note — visible to buyer and admin */}
                                            <div className="mt-4 pt-4 border-t border-gray-100">
                                                <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                                    <MessageSquarePlus className="h-3 w-3" /> Send Order Update to Buyer
                                                </h5>
                                                {/* Show existing note if set */}
                                                {order.status_note && (
                                                    <div className="mb-2 px-3 py-2 bg-amber-50 border border-amber-100 rounded-lg">
                                                        <p className="text-[10px] font-bold text-amber-600 uppercase mb-0.5">Current Update</p>
                                                        <p className="text-xs text-amber-800">{order.status_note}</p>
                                                    </div>
                                                )}
                                                <div className="flex gap-2">
                                                    <textarea
                                                        rows={2}
                                                        placeholder='e.g. "Item held in customs — expected clearance in 3 days"'
                                                        value={statusNotes[order.id] || ''}
                                                        onChange={e => setStatusNotes(prev => ({ ...prev, [order.id]: e.target.value }))}
                                                        className="flex-1 text-xs rounded-lg border border-gray-200 px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 placeholder:text-gray-300"
                                                    />
                                                    <Button
                                                        size="sm"
                                                        disabled={!statusNotes[order.id]?.trim() || sendingNote === order.id}
                                                        onClick={() => handleSendStatusNote(order)}
                                                        className="self-end bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold h-9 px-3 shrink-0"
                                                    >
                                                        {sendingNote === order.id
                                                            ? <Loader2 className="h-3 w-3 animate-spin" />
                                                            : <span className="flex items-center gap-1"><MessageSquarePlus className="h-3 w-3" />Send</span>
                                                        }
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            ) : (
                /* Kanban View */
                <div className="flex gap-4 overflow-x-auto pb-6 -mx-4 px-4 sm:mx-0 sm:px-0">
                    {["pending", "processing", "shipped", "delivered", "return_requested", "return_approved", "returned"].map((status) => {
                        const statusConfig = getStatusConfig(status);
                        const statusOrders = filtered.filter(o => o.status === status);

                        return (
                            <div key={status} className="flex-none w-80 flex flex-col gap-3">
                                {/* Column Header */}
                                <div className={`flex items-center justify-between p-3 rounded-xl border ${statusConfig.color} bg-white bg-opacity-50 backdrop-blur-sm shadow-sm`}>
                                    <div className="flex items-center gap-2">
                                        {statusConfig.icon}
                                        <h3 className="font-bold text-sm">{statusConfig.label}</h3>
                                    </div>
                                    <span className="text-xs font-black px-2 py-0.5 bg-white/50 rounded-md">
                                        {statusOrders.length}
                                    </span>
                                </div>

                                {/* Column Cards */}
                                <div className="flex-1 space-y-3 min-h-[200px] rounded-xl">
                                    {statusOrders.length === 0 ? (
                                        <div className="h-full border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center p-6 text-gray-400 text-xs font-medium">
                                            No {statusConfig.label.toLowerCase()} orders
                                        </div>
                                    ) : (
                                        statusOrders.map((order) => {
                                            const escrowConfig = getEscrowConfig(order.escrow_status);
                                            return (
                                                <div key={order.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing">
                                                    <div className="flex items-start justify-between mb-3">
                                                        <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded font-mono">{order.id}</span>
                                                        <div className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${escrowConfig.color}`}>
                                                            {escrowConfig.icon}
                                                        </div>
                                                    </div>

                                                    <div className="flex gap-3 mb-4">
                                                        <div className="h-12 w-12 bg-gray-50 rounded-lg border border-gray-100 shrink-0 overflow-hidden">
                                                            <img src={order.product?.image_url} className="w-full h-full object-contain mix-blend-multiply p-1" alt="" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <h4 className="font-bold text-sm text-gray-900 leading-tight line-clamp-2">{order.product?.name}</h4>
                                                            <p className="font-black text-xs text-gray-900 mt-1">{formatPrice(order.amount)}</p>
                                                            {order.financing?.is_vehicle_loan && (
                                                                <p className="text-[9px] font-bold text-emerald-600 mt-0.5">15% Deposit · Full: {formatPrice(order.financing.vehicle_price)}</p>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Financing quick summary for Kanban */}
                                                    {order.financing?.is_vehicle_loan && (
                                                        <div className="mb-3 px-3 py-2 rounded-lg bg-gradient-to-r from-emerald-50 to-indigo-50 border border-emerald-100">
                                                            <div className="flex items-center gap-1 mb-1.5">
                                                                <Car className="h-3 w-3 text-emerald-600" />
                                                                <span className="text-[9px] font-black text-emerald-700 uppercase">Vehicle Loan</span>
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-1.5 text-[9px]">
                                                                <div>
                                                                    <span className="text-gray-400 font-bold block">Monthly</span>
                                                                    <span className="text-gray-900 font-black">{formatPrice(order.financing.monthly_payment)}</span>
                                                                </div>
                                                                <div>
                                                                    <span className="text-gray-400 font-bold block">Term</span>
                                                                    <span className="text-gray-900 font-black">{order.financing.tenor_months / 12}yr ({order.financing.tenor_months}mo)</span>
                                                                </div>
                                                                <div>
                                                                    <span className="text-gray-400 font-bold block">Balance</span>
                                                                    <span className="text-amber-700 font-black">{formatPrice(order.financing.loan_balance)}</span>
                                                                </div>
                                                                <div>
                                                                    <span className="text-gray-400 font-bold block">Rate</span>
                                                                    <span className="text-gray-900 font-black">{(order.financing.interest_rate * 100).toFixed(1)}% p.a.</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className="pt-3 border-t border-gray-100">
                                                        {order.status === "pending" && (
                                                            <div className="flex flex-col gap-1.5">
                                                            <Button
                                                                size="sm"
                                                                onClick={() => {
                                                                    DataSyncService.updateTrackingStatus(order.id, "Order Accepted", "Seller Storefront");
                                                                    handleStatusUpdate(order.id, "processing");
                                                                }}
                                                                className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-bold h-7 w-full"
                                                            >
                                                                <CheckCircle className="h-3 w-3 mr-1" /> Accept Order
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => {
                                                                    const reason = window.prompt("Reason for cancellation:\n• Stock unavailable\n• Pricing error\n• Cannot fulfill\n• Other");
                                                                    if (reason) {
                                                                        DataSyncService.cancelOrderBySeller(order.id, reason);
                                                                        const sellerId = DataSyncService.getCurrentSellerId();
                                                                        if (sellerId) setOrders(DataSyncService.getOrders().filter(o => o.seller_id === sellerId));
                                                                    }
                                                                }}
                                                                className="text-rose-600 border-rose-200 hover:bg-rose-50 rounded-lg text-[10px] font-bold h-7 w-full"
                                                            >
                                                                <XCircle className="h-3 w-3 mr-1" /> Cancel
                                                            </Button>
                                                            </div>
                                                        )}

                                                        {order.status === "processing" && (
                                                            <div className="flex flex-col gap-1.5">
                                                            <Button
                                                                size="sm"
                                                                onClick={() => {
                                                                    DataSyncService.updateTrackingStatus(order.id, "Shipped from Warehouse", "In transit", "Logistics", "TRK000");
                                                                    handleStatusUpdate(order.id, "shipped");
                                                                }}
                                                                className="bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[10px] font-bold h-7 w-full"
                                                            >
                                                                <Truck className="h-3 w-3 mr-1" /> Mark Shipped
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => {
                                                                    const reason = window.prompt("Reason for cancellation:\n• Stock unavailable\n• Pricing error\n• Cannot fulfill\n• Other");
                                                                    if (reason) {
                                                                        DataSyncService.cancelOrderBySeller(order.id, reason);
                                                                        const sellerId = DataSyncService.getCurrentSellerId();
                                                                        if (sellerId) setOrders(DataSyncService.getOrders().filter(o => o.seller_id === sellerId));
                                                                    }
                                                                }}
                                                                className="text-rose-600 border-rose-200 hover:bg-rose-50 rounded-lg text-[10px] font-bold h-7 w-full"
                                                            >
                                                                <XCircle className="h-3 w-3 mr-1" /> Cancel
                                                            </Button>
                                                            </div>
                                                        )}

                                                        {order.status === "shipped" && (
                                                            <Button
                                                                size="sm"
                                                                onClick={() => {
                                                                    DataSyncService.updateTrackingStatus(order.id, "Delivered to Customer", "Customer Address");
                                                                    handleStatusUpdate(order.id, "delivered");
                                                                }}
                                                                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold h-7 w-full"
                                                            >
                                                                <CheckCircle className="h-3 w-3 mr-1" /> Confirm Delivery
                                                            </Button>
                                                        )}

                                                        {order.status !== "delivered" && order.status !== "returned" && order.status !== "return_requested" && order.status !== "return_approved" && (
                                                            <Link href={`/seller/dashboard/messages?order=${order.id}&customer=${order.customer_id}`}>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="w-full mt-2 text-brand-green-700 bg-brand-green-50/50 border-brand-green-200 hover:bg-brand-green-100 rounded-lg text-[10px] font-bold h-7"
                                                                >
                                                                    <MessageSquare className="h-3 w-3 mr-1" /> View Buyer Chat
                                                                </Button>
                                                            </Link>
                                                        )}

                                                        {order.status === "delivered" && (
                                                            <div className="flex flex-col gap-2 mt-2">
                                                                {order.escrow_status !== "disputed" && (
                                                                    <p className="text-[10px] text-emerald-600 font-bold text-center">Completed</p>
                                                                )}
                                                                {order.escrow_status === "released" && !order.payout_status && (
                                                                    <Button
                                                                        size="sm"
                                                                        onClick={() => handleRequestPayout(order)}
                                                                        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold h-7 w-full shadow-sm"
                                                                    >
                                                                        <ArrowUpRight className="h-3 w-3 mr-1" /> Request Cashout
                                                                    </Button>
                                                                )}
                                                                {order.payout_status === "pending_payout" && (
                                                                    <p className="text-[10px] text-blue-600 font-bold text-center flex items-center justify-center gap-1">
                                                                        <Clock className="h-3 w-3" /> Processing Payout
                                                                    </p>
                                                                )}
                                                                {order.payout_status === "cashed_out" && (
                                                                    <p className="text-[10px] text-emerald-600 font-bold text-center flex items-center justify-center gap-1">
                                                                        <Wallet className="h-3 w-3" /> Cashed Out
                                                                    </p>
                                                                )}
                                                            </div>
                                                        )}

                                                        {order.status === "return_requested" && (
                                                            <div className="flex gap-1.5 mt-2">
                                                                <Button
                                                                    size="sm"
                                                                    onClick={() => {
                                                                        const req = returnRequests.find(r => r.order_id === order.id);
                                                                        if (req) {
                                                                            DataSyncService.updateReturnRequestStatus(req.id, "approved");
                                                                            setReturnRequests(DataSyncService.getReturnRequests(DataSyncService.getCurrentSellerId()!));
                                                                            setOrders(DataSyncService.getOrders().filter(o => o.seller_id === DataSyncService.getCurrentSellerId()));
                                                                        }
                                                                    }}
                                                                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-bold h-7 w-full shadow-sm"
                                                                >
                                                                    Approve
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() => {
                                                                        const req = returnRequests.find(r => r.order_id === order.id);
                                                                        if (req) {
                                                                            DataSyncService.updateReturnRequestStatus(req.id, "rejected");
                                                                            setReturnRequests(DataSyncService.getReturnRequests(DataSyncService.getCurrentSellerId()!));
                                                                            setOrders(DataSyncService.getOrders().filter(o => o.seller_id === DataSyncService.getCurrentSellerId()));
                                                                        }
                                                                    }}
                                                                    className="text-gray-700 border-gray-200 hover:bg-gray-50 rounded-lg text-[10px] font-bold h-7 w-full shadow-sm"
                                                                >
                                                                    Reject
                                                                </Button>
                                                            </div>
                                                        )}

                                                        {order.status === "return_approved" && (
                                                            <Button
                                                                size="sm"
                                                                onClick={() => {
                                                                    const req = returnRequests.find(r => r.order_id === order.id);
                                                                    if (req) {
                                                                        DataSyncService.updateReturnRequestStatus(req.id, "refunded");
                                                                        setReturnRequests(DataSyncService.getReturnRequests(DataSyncService.getCurrentSellerId()!));
                                                                        setOrders(DataSyncService.getOrders().filter(o => o.seller_id === DataSyncService.getCurrentSellerId()));
                                                                    }
                                                                }}
                                                                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold h-7 w-full mt-2 shadow-sm"
                                                            >
                                                                <Package className="h-3 w-3 mr-1" /> Refund & Receive
                                                            </Button>
                                                        )}

                                                        {order.status === "returned" && (
                                                            <p className="text-[10px] text-gray-500 font-bold text-center mt-2">Refunded</p>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}


import { Suspense } from "react";
export default function SellerOrders() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center py-20"><div className="h-6 w-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" /></div>}>
            <SellerOrdersContent />
        </Suspense>
    );
}
