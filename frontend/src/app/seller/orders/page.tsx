"use client";

import { useEffect, useState } from "react";
import { Order, ReturnRequest } from "@/lib/types";
import { DemoStore } from "@/lib/demo-store";
import { formatPrice } from "@/lib/utils";
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
    AlertTriangle
} from "lucide-react";

export default function SellerOrders() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [returnRequests, setReturnRequests] = useState<ReturnRequest[]>([]);
    const [search, setSearch] = useState("");
    const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [viewMode, setViewMode] = useState<"list" | "kanban">("list");

    useEffect(() => {
        const sellerId = DemoStore.getCurrentSellerId();
        if (!sellerId) return;

        const loadOrders = () => {
            const allOrders = DemoStore.getOrders();
            setOrders(allOrders.filter(o => o.seller_id === sellerId));
            setReturnRequests(DemoStore.getReturnRequests(sellerId));
        };

        loadOrders();
        window.addEventListener("storage", loadOrders);
        return () => window.removeEventListener("storage", loadOrders);
    }, []);

    const handleStatusUpdate = (orderId: string, newStatus: Order["status"]) => {
        DemoStore.updateOrderStatus(orderId, newStatus);
        // Reload
        const sellerId = DemoStore.getCurrentSellerId();
        if (sellerId) {
            setOrders(DemoStore.getOrders().filter(o => o.seller_id === sellerId));
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
        else if (statusFilter === "return_requested" || statusFilter === "returns") {
            // "returns" filter groups all return states
            matchStatus = ["return_requested", "return_approved", "returned"].includes(o.status);
        } else {
            matchStatus = o.status === statusFilter;
        }

        return matchSearch && matchStatus;
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
                    {["all", "pending", "processing", "shipped", "delivered", "returns"].map(s => {
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
                                                </div>
                                                <h4 className="font-bold text-sm text-gray-900 mt-1 truncate">{order.product?.name}</h4>
                                                <p className="text-[11px] text-gray-400">{new Date(order.created_at).toLocaleDateString()} · Qty: 1</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 shrink-0">
                                            <div className="text-right hidden sm:block">
                                                <p className="font-black text-gray-900">{formatPrice(order.amount)}</p>
                                                <div className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${escrowConfig.color}`}>
                                                    {escrowConfig.icon} {escrowConfig.label}
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
                                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                                                            <Input
                                                                placeholder="Carrier (RT Logistics, DHL...)"
                                                                className="h-9 text-xs rounded-lg"
                                                                id={`carrier-${order.id}`}
                                                            />
                                                            <Input
                                                                placeholder="Tracking ID"
                                                                className="h-9 text-xs rounded-lg"
                                                                id={`tracking-${order.id}`}
                                                            />
                                                            <Input
                                                                placeholder="Current Location"
                                                                className="h-9 text-xs rounded-lg"
                                                                defaultValue="Lagos Warehouse"
                                                                id={`location-${order.id}`}
                                                            />
                                                        </div>
                                                        <Button
                                                            size="sm"
                                                            onClick={() => {
                                                                const carrier = (document.getElementById(`carrier-${order.id}`) as HTMLInputElement)?.value;
                                                                const trackingId = (document.getElementById(`tracking-${order.id}`) as HTMLInputElement)?.value;
                                                                const location = (document.getElementById(`location-${order.id}`) as HTMLInputElement)?.value || "In transit";

                                                                DemoStore.updateTrackingStatus(order.id, "Shipped from Warehouse", location, carrier, trackingId);
                                                                handleStatusUpdate(order.id, "shipped");
                                                            }}
                                                            className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold h-9 w-full sm:w-auto"
                                                        >
                                                            <Truck className="h-3 w-3 mr-1.5" /> Confirm & Mark as Shipped
                                                        </Button>
                                                    </div>
                                                )}

                                                <div className="flex gap-2">
                                                    {order.status === "pending" && (
                                                        <Button
                                                            size="sm"
                                                            onClick={() => {
                                                                DemoStore.updateTrackingStatus(order.id, "Order Accepted", "Seller Storefront");
                                                                handleStatusUpdate(order.id, "processing");
                                                            }}
                                                            className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold h-9"
                                                        >
                                                            <CheckCircle className="h-3 w-3 mr-1.5" /> Accept Order
                                                        </Button>
                                                    )}

                                                    {order.status === "shipped" && (
                                                        <Button
                                                            size="sm"
                                                            onClick={() => {
                                                                DemoStore.updateTrackingStatus(order.id, "Delivered to Customer", "Customer Address");
                                                                handleStatusUpdate(order.id, "delivered");
                                                            }}
                                                            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold h-9"
                                                        >
                                                            <CheckCircle className="h-3 w-3 mr-1.5" /> Confirm Delivery
                                                        </Button>
                                                    )}

                                                    {order.status === "delivered" && order.escrow_status !== "disputed" && (
                                                        <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                                                            <CheckCircle className="h-3.5 w-3.5" /> Order complete
                                                        </span>
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
                                                                            DemoStore.updateReturnRequestStatus(req.id, "approved");
                                                                            setReturnRequests(DemoStore.getReturnRequests(DemoStore.getCurrentSellerId()!));
                                                                            setOrders(DemoStore.getOrders().filter(o => o.seller_id === DemoStore.getCurrentSellerId()));
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
                                                                            DemoStore.updateReturnRequestStatus(req.id, "rejected");
                                                                            setReturnRequests(DemoStore.getReturnRequests(DemoStore.getCurrentSellerId()!));
                                                                            setOrders(DemoStore.getOrders().filter(o => o.seller_id === DemoStore.getCurrentSellerId()));
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
                                                                        DemoStore.updateReturnRequestStatus(req.id, "refunded");
                                                                        setReturnRequests(DemoStore.getReturnRequests(DemoStore.getCurrentSellerId()!));
                                                                        setOrders(DemoStore.getOrders().filter(o => o.seller_id === DemoStore.getCurrentSellerId()));
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
                                                            <p className="text-[11px] text-rose-600">Payment has been frozen. The platform admin is reviewing this case.</p>
                                                        </div>
                                                    )}
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
                                                        </div>
                                                    </div>

                                                    <div className="pt-3 border-t border-gray-100">
                                                        {order.status === "pending" && (
                                                            <Button
                                                                size="sm"
                                                                onClick={() => {
                                                                    DemoStore.updateTrackingStatus(order.id, "Order Accepted", "Seller Storefront");
                                                                    handleStatusUpdate(order.id, "processing");
                                                                }}
                                                                className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-bold h-7 w-full"
                                                            >
                                                                <CheckCircle className="h-3 w-3 mr-1" /> Accept Order
                                                            </Button>
                                                        )}

                                                        {order.status === "processing" && (
                                                            <Button
                                                                size="sm"
                                                                onClick={() => {
                                                                    DemoStore.updateTrackingStatus(order.id, "Shipped from Warehouse", "In transit", "Logistics", "TRK000");
                                                                    handleStatusUpdate(order.id, "shipped");
                                                                }}
                                                                className="bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[10px] font-bold h-7 w-full"
                                                            >
                                                                <Truck className="h-3 w-3 mr-1" /> Mark Shipped
                                                            </Button>
                                                        )}

                                                        {order.status === "shipped" && (
                                                            <Button
                                                                size="sm"
                                                                onClick={() => {
                                                                    DemoStore.updateTrackingStatus(order.id, "Delivered to Customer", "Customer Address");
                                                                    handleStatusUpdate(order.id, "delivered");
                                                                }}
                                                                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold h-7 w-full"
                                                            >
                                                                <CheckCircle className="h-3 w-3 mr-1" /> Confirm Delivery
                                                            </Button>
                                                        )}

                                                        {order.status === "delivered" && (
                                                            <p className="text-[10px] text-emerald-600 font-bold text-center">Completed</p>
                                                        )}

                                                        {order.status === "return_requested" && (
                                                            <div className="flex gap-1.5 mt-2">
                                                                <Button
                                                                    size="sm"
                                                                    onClick={() => {
                                                                        const req = returnRequests.find(r => r.order_id === order.id);
                                                                        if (req) {
                                                                            DemoStore.updateReturnRequestStatus(req.id, "approved");
                                                                            setReturnRequests(DemoStore.getReturnRequests(DemoStore.getCurrentSellerId()!));
                                                                            setOrders(DemoStore.getOrders().filter(o => o.seller_id === DemoStore.getCurrentSellerId()));
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
                                                                            DemoStore.updateReturnRequestStatus(req.id, "rejected");
                                                                            setReturnRequests(DemoStore.getReturnRequests(DemoStore.getCurrentSellerId()!));
                                                                            setOrders(DemoStore.getOrders().filter(o => o.seller_id === DemoStore.getCurrentSellerId()));
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
                                                                        DemoStore.updateReturnRequestStatus(req.id, "refunded");
                                                                        setReturnRequests(DemoStore.getReturnRequests(DemoStore.getCurrentSellerId()!));
                                                                        setOrders(DemoStore.getOrders().filter(o => o.seller_id === DemoStore.getCurrentSellerId()));
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
