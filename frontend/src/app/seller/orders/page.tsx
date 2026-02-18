"use client";

import { useEffect, useState } from "react";
import { Order } from "@/lib/types";
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
    Lock
} from "lucide-react";

export default function SellerOrders() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [search, setSearch] = useState("");
    const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>("all");

    useEffect(() => {
        const sellerId = DemoStore.getCurrentSellerId();
        if (!sellerId) return;

        const loadOrders = () => {
            const allOrders = DemoStore.getOrders();
            setOrders(allOrders.filter(o => o.seller_id === sellerId));
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
            default: return { color: "bg-gray-100 text-gray-700", icon: null, label: status };
        }
    };

    const getEscrowConfig = (escrow: string) => {
        switch (escrow) {
            case "held": return { color: "text-amber-600 bg-amber-50", icon: <Lock className="h-3 w-3" />, label: "In Escrow" };
            case "released": return { color: "text-emerald-600 bg-emerald-50", icon: <ShieldCheck className="h-3 w-3" />, label: "Released" };
            default: return { color: "text-gray-400 bg-gray-50", icon: null, label: "None" };
        }
    };

    const filtered = orders.filter(o => {
        const matchSearch = o.id.toLowerCase().includes(search.toLowerCase()) ||
            o.product?.name?.toLowerCase().includes(search.toLowerCase());
        const matchStatus = statusFilter === "all" || o.status === statusFilter;
        return matchSearch && matchStatus;
    });

    return (
        <div className="space-y-6 max-w-5xl">
            <div>
                <h1 className="text-2xl font-black text-gray-900 tracking-tight">Orders</h1>
                <p className="text-sm text-gray-500 mt-1">Manage and track all your orders.</p>
            </div>

            {/* Filters bar */}
            <div className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder="Search order ID or product..."
                        className="pl-9 rounded-xl border-gray-200"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 flex-wrap">
                    {["all", "pending", "processing", "shipped", "delivered"].map(s => (
                        <button
                            key={s}
                            onClick={() => setStatusFilter(s)}
                            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${statusFilter === s
                                ? "bg-ratel-green-600 text-white shadow-sm"
                                : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                                }`}
                        >
                            {s.charAt(0).toUpperCase() + s.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Orders list */}
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

                                                {order.status === "delivered" && (
                                                    <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                                                        <CheckCircle className="h-3.5 w-3.5" /> Order complete
                                                    </span>
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
        </div>
    );
}
