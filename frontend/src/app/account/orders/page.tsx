"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Order, NegotiationRequest, Product } from "@/lib/types";
import { DemoStore } from "@/lib/demo-store";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    ShieldCheck,
    Package,
    Truck,
    CheckCircle,
    Clock,
    ChevronRight,
    Handshake,
    RotateCcw,
    Search,
    ArrowRight,
    X,
    ExternalLink,
    Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

type OrderFilter = "all" | "processing" | "shipped" | "delivered" | "cancelled" | "buy_again";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
    pending: { label: "Processing", color: "text-amber-400", bg: "bg-amber-500/10", dot: "bg-amber-400" },
    processing: { label: "Processing", color: "text-amber-400", bg: "bg-amber-500/10", dot: "bg-amber-400" },
    shipped: { label: "In Transit", color: "text-blue-400", bg: "bg-blue-500/10", dot: "bg-blue-400" },
    delivered: { label: "Delivered", color: "text-ratel-green-400", bg: "bg-ratel-green-500/10", dot: "bg-ratel-green-400" },
    cancelled: { label: "Cancelled", color: "text-red-400", bg: "bg-red-500/10", dot: "bg-red-400" },
};

export default function OrdersPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [negotiations, setNegotiations] = useState<NegotiationRequest[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [activeFilter, setActiveFilter] = useState<OrderFilter>("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedOrderForTracking, setSelectedOrderForTracking] = useState<Order | null>(null);
    const { addToCart } = useCart();
    const router = useRouter();
    const { user } = useAuth();

    const loadData = () => {
        if (!user) return;
        const allOrders = DemoStore.getOrders();
        const userOrders = allOrders.filter(o =>
            o.customer_id === user.email ||
            o.customer_id === user.id ||
            o.customer_id === "u1"
        );
        setOrders(userOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));

        const allNegs = DemoStore.getNegotiations();
        setNegotiations(allNegs.filter(n =>
            n.customer_id === user.email ||
            n.customer_id === user.id ||
            n.customer_name === user.name ||
            n.customer_id === "u1"
        ));

        setProducts(DemoStore.getProducts());
    };

    useEffect(() => { loadData(); }, [user]);

    useEffect(() => {
        loadData();
        const handleStorageChange = () => loadData();
        window.addEventListener("storage", handleStorageChange);
        window.addEventListener("demo-store-update", handleStorageChange);
        return () => {
            window.removeEventListener("storage", handleStorageChange);
            window.removeEventListener("demo-store-update", handleStorageChange);
        };
    }, []);

    const handleReleaseEscrow = (orderId: string) => {
        DemoStore.updateOrderEscrow(orderId, "released");
        loadData();
        alert("Payment has been released to the seller. Thank you for confirming!");
    };

    const handleBuyAgain = (order: Order) => {
        if (!order.product) return;
        addToCart(order.product, 1);
        router.push("/cart");
    };

    const filteredOrders = orders.filter(order => {
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            const matchesId = order.id.toLowerCase().includes(q);
            const matchesProduct = order.product?.name?.toLowerCase().includes(q);
            if (!matchesId && !matchesProduct) return false;
        }
        if (activeFilter === "processing") return order.status === "pending" || order.status === "processing";
        if (activeFilter === "shipped") return order.status === "shipped";
        if (activeFilter === "delivered") return order.status === "delivered";
        if (activeFilter === "cancelled") return order.status === "cancelled";
        if (activeFilter === "buy_again") return order.status === "delivered";
        return true;
    });

    const activeNegotiations = negotiations.filter(n => n.status === "pending" || n.status === "accepted");

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-900">
            <Navbar />

            <main className="flex-1 container mx-auto px-4 py-8 pt-6 max-w-7xl">
                {/* Page Header */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">Your Orders</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Track, return, or buy items again.</p>
                </div>

                {/* Two Column Layout */}
                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Left Column — Orders Table */}
                    <div className="flex-1 min-w-0">
                        {/* Search + Filters */}
                        <div className="bg-white backdrop-blur-[12px] rounded-xl border border-gray-200 shadow-lg mb-4">
                            <div className="p-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                                <div className="relative flex-1 w-full">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search orders..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full bg-white border border-gray-200 rounded-lg pl-9 pr-4 py-2 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-ratel-green-500 transition-colors"
                                    />
                                </div>
                                <div className="flex gap-1 overflow-x-auto no-scrollbar w-full sm:w-auto">
                                    {[
                                        { id: "all", label: "All" },
                                        { id: "processing", label: "Processing" },
                                        { id: "shipped", label: "In Transit" },
                                        { id: "delivered", label: "Delivered" },
                                        { id: "cancelled", label: "Cancelled" },
                                        { id: "buy_again", label: "Buy Again" },
                                    ].map((tab) => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveFilter(tab.id as OrderFilter)}
                                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-all ${activeFilter === tab.id
                                                ? "bg-gray-200 text-gray-900"
                                                : "text-gray-500 hover:bg-gray-100"
                                                }`}
                                        >
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Orders Table */}
                        <div className="bg-white backdrop-blur-[12px] rounded-xl border border-gray-200 shadow-lg overflow-hidden">
                            {/* Table Header */}
                            <div className="hidden md:grid grid-cols-[44px_1fr_100px_100px_90px_110px] gap-4 px-4 py-3 bg-white border-b border-gray-200 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                                <span></span>
                                <span>Product</span>
                                <span>Date</span>
                                <span>Amount</span>
                                <span>Status</span>
                                <span className="text-right">Action</span>
                            </div>

                            {filteredOrders.length === 0 ? (
                                <div className="p-12 text-center">
                                    <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <Package className="h-7 w-7 text-gray-300" />
                                    </div>
                                    <h3 className="text-sm font-bold text-gray-900">No orders found</h3>
                                    <p className="text-xs text-gray-500 mt-1 mb-4">Explore the marketplace and find great deals.</p>
                                    <Link href="/">
                                        <Button size="sm" className="bg-ratel-green-600 hover:bg-ratel-green-700 text-white rounded-lg text-xs font-semibold px-4">Start Shopping</Button>
                                    </Link>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-200">
                                    {filteredOrders.map((order, idx) => {
                                        const status = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
                                        return (
                                            <motion.div
                                                key={order.id}
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                transition={{ delay: idx * 0.03 }}
                                                className="group"
                                            >
                                                {/* Desktop Row */}
                                                <div className="hidden md:grid grid-cols-[44px_1fr_100px_100px_90px_110px] gap-4 px-4 py-3 items-center hover:bg-white transition-colors">
                                                    {/* Thumbnail */}
                                                    <div className="h-10 w-10 bg-white rounded-lg border border-gray-200 p-1 shrink-0">
                                                        <img
                                                            src={order.product?.image_url || "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158"}
                                                            alt={order.product?.name || "Product"}
                                                            className="h-full w-full object-contain"
                                                        />
                                                    </div>

                                                    {/* Product Info */}
                                                    <div className="min-w-0">
                                                        <Link href={`/product/${order.product_id}`} className="text-sm font-medium text-gray-900 hover:text-ratel-green-400 transition-colors line-clamp-1 block">
                                                            {order.product?.name || "Product"}
                                                        </Link>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className="text-[10px] text-gray-400 font-mono">#{order.id.split('_')[1]?.substring(0, 8) || order.id.substring(0, 8)}</span>
                                                            {order.tracking_id && (
                                                                <span className="text-[10px] text-gray-400">• {order.carrier || "Track"}: {order.tracking_id}</span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Date */}
                                                    <span className="text-xs text-gray-500">
                                                        {new Date(order.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                    </span>

                                                    {/* Amount */}
                                                    <span className="text-sm font-semibold text-gray-900">{formatPrice(order.amount)}</span>

                                                    {/* Status */}
                                                    <div className="flex items-center gap-1.5">
                                                        <div className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                                                        <span className={`text-[11px] font-semibold ${status.color}`}>{status.label}</span>
                                                    </div>

                                                    {/* Actions */}
                                                    <div className="flex justify-end gap-1">
                                                        {order.status === "delivered" && (
                                                            <button
                                                                onClick={() => handleBuyAgain(order)}
                                                                className="text-[11px] font-semibold text-gray-500 hover:text-gray-900 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
                                                            >
                                                                Buy Again
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => setSelectedOrderForTracking(order)}
                                                            className="text-[11px] font-semibold text-gray-500 hover:text-gray-900 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
                                                        >
                                                            Details
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Mobile Card */}
                                                <div className="md:hidden p-4 space-y-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-12 w-12 bg-white rounded-xl border border-gray-200 p-1.5 shrink-0">
                                                            <img
                                                                src={order.product?.image_url || "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158"}
                                                                alt={order.product?.name || "Product"}
                                                                className="h-full w-full object-contain"
                                                            />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-semibold text-gray-900 line-clamp-1">{order.product?.name || "Product"}</p>
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                <div className={`flex items-center gap-1 text-[11px] font-semibold ${status.color}`}>
                                                                    <div className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                                                                    {status.label}
                                                                </div>
                                                                <span className="text-[10px] text-gray-400">•</span>
                                                                <span className="text-xs text-gray-500">{new Date(order.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                                                            </div>
                                                        </div>
                                                        <span className="text-sm font-bold text-gray-900">{formatPrice(order.amount)}</span>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        {order.status === "delivered" && (
                                                            <Button size="sm" variant="outline" onClick={() => handleBuyAgain(order)} className="flex-1 text-xs rounded-lg font-semibold border-gray-300 text-gray-900 hover:bg-gray-100 bg-transparent">
                                                                <RotateCcw className="h-3 w-3 mr-1" /> Buy Again
                                                            </Button>
                                                        )}
                                                        <Button size="sm" variant="outline" onClick={() => setSelectedOrderForTracking(order)} className="flex-1 text-xs rounded-lg font-semibold border-gray-300 text-gray-900 hover:bg-gray-100 bg-transparent">
                                                            <Truck className="h-3 w-3 mr-1" /> Details
                                                        </Button>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column — Negotiations & Escrow Summary */}
                    <div className="w-full lg:w-80 space-y-4 shrink-0">
                        {/* Negotiate a Price CTA */}
                        <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-xl p-5 text-gray-900 shadow-lg">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="p-1.5 bg-gray-200 rounded-lg">
                                    <Handshake className="h-4 w-4" />
                                </div>
                                <h3 className="font-bold text-sm">Negotiate a Price</h3>
                            </div>
                            <p className="text-xs text-emerald-100 leading-relaxed mb-3">
                                Find any product and negotiate for a better price. Our AI searches the internet for fair market prices so you never overpay.
                            </p>
                            <Link href="/account/negotiations">
                                <Button size="sm" className="w-full bg-white text-emerald-700 hover:bg-emerald-50 font-bold text-xs rounded-lg shadow-sm">
                                    <Sparkles className="h-3 w-3 mr-1.5" /> View Negotiations <ArrowRight className="h-3 w-3 ml-auto" />
                                </Button>
                            </Link>
                        </div>

                        {/* Active Negotiations */}
                        <div className="bg-white backdrop-blur-[12px] rounded-xl border border-gray-200 shadow-lg overflow-hidden">
                            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Handshake className="h-4 w-4 text-ratel-green-400" />
                                    <h3 className="text-sm font-bold text-gray-900">Active Negotiations</h3>
                                </div>
                                {activeNegotiations.length > 0 && (
                                    <Badge className="bg-ratel-green-500/20 text-ratel-green-400 border-none text-[10px] font-bold">{activeNegotiations.length}</Badge>
                                )}
                            </div>

                            {activeNegotiations.length === 0 ? (
                                <div className="p-6 text-center">
                                    <p className="text-xs text-gray-400">No active negotiations</p>
                                    <Link href="/">
                                        <Button variant="link" size="sm" className="text-xs text-ratel-green-400 mt-1 p-0">Browse products</Button>
                                    </Link>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-100">
                                    {activeNegotiations.map(neg => {
                                        const negProduct = products.find(p => p.id === neg.product_id);
                                        return (
                                            <div key={neg.id} className="px-4 py-3 hover:bg-white transition-colors">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-xs font-semibold text-gray-900 line-clamp-1">{negProduct?.name || "Product"}</p>
                                                        <div className="flex items-center gap-1.5 mt-1">
                                                            {neg.status === "accepted" ? (
                                                                <Badge className="bg-ratel-green-500/20 text-ratel-green-400 border-none text-[9px] font-bold px-1.5 py-0">Accepted</Badge>
                                                            ) : (
                                                                <Badge className="bg-amber-500/20 text-amber-400 border-none text-[9px] font-bold px-1.5 py-0">Pending</Badge>
                                                            )}
                                                            <span className="text-[11px] font-semibold text-gray-900">{formatPrice(neg.proposed_price)}</span>
                                                        </div>
                                                    </div>
                                                    {neg.status === "accepted" ? (
                                                        <Link href={`/checkout?negotiationId=${neg.id}`}>
                                                            <Button size="sm" className="text-[10px] font-bold bg-ratel-green-600 hover:bg-ratel-green-700 text-white rounded-lg h-7 px-3">
                                                                Buy <ArrowRight className="h-3 w-3 ml-1" />
                                                            </Button>
                                                        </Link>
                                                    ) : (
                                                        <Link href="/account/negotiations">
                                                            <Button variant="outline" size="sm" className="text-[10px] font-bold rounded-lg h-7 px-2 border-gray-300 text-gray-900 hover:bg-gray-100 bg-transparent">
                                                                View
                                                            </Button>
                                                        </Link>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Escrow Summary */}
                        {orders.some(o => o.escrow_status === "held") && (
                            <div className="bg-white backdrop-blur-[12px] border border-gray-200 shadow-lg rounded-xl overflow-hidden">
                                <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-2">
                                    <ShieldCheck className="h-4 w-4 text-amber-500" />
                                    <h3 className="text-sm font-bold text-gray-900">Escrow Pending</h3>
                                </div>
                                <div className="divide-y divide-gray-100">
                                    {orders.filter(o => o.escrow_status === "held").map(order => (
                                        <div key={order.id} className="px-4 py-3">
                                            <p className="text-xs font-medium text-gray-700 line-clamp-1">{order.product?.name}</p>
                                            <div className="flex items-center justify-between mt-1.5">
                                                <span className="text-xs font-bold text-gray-900">{formatPrice(order.amount)}</span>
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleReleaseEscrow(order.id)}
                                                    className="text-[10px] font-bold bg-ratel-green-600 hover:bg-ratel-green-700 text-white rounded-lg h-7 px-3"
                                                >
                                                    Release Funds
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Tracking / Order Detail Modal */}
            <AnimatePresence>
                {selectedOrderForTracking && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm"
                            onClick={() => setSelectedOrderForTracking(null)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200"
                        >
                            {/* Modal Header */}
                            <div className="p-5 pb-3 flex items-center justify-between border-b border-gray-200">
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900">Order Details</h2>
                                    <p className="text-xs text-gray-500 font-mono mt-0.5">#{selectedOrderForTracking.id.substring(0, 12)}</p>
                                </div>
                                <button
                                    onClick={() => setSelectedOrderForTracking(null)}
                                    className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    <X className="h-4 w-4 text-gray-400" />
                                </button>
                            </div>

                            {/* Product Summary */}
                            <div className="p-5 flex items-center gap-4 border-b border-gray-200">
                                <div className="h-16 w-16 bg-white rounded-xl border border-gray-200 p-2 shrink-0">
                                    <img
                                        src={selectedOrderForTracking.product?.image_url}
                                        alt={selectedOrderForTracking.product?.name}
                                        className="h-full w-full object-contain"
                                    />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-gray-900 line-clamp-2">{selectedOrderForTracking.product?.name}</p>
                                    <div className="flex items-center gap-3 mt-1">
                                        <span className="text-sm font-bold text-gray-900">{formatPrice(selectedOrderForTracking.amount)}</span>
                                        <Badge className={`${STATUS_CONFIG[selectedOrderForTracking.status]?.bg} ${STATUS_CONFIG[selectedOrderForTracking.status]?.color} border-none text-[10px] font-bold`}>
                                            {STATUS_CONFIG[selectedOrderForTracking.status]?.label}
                                        </Badge>
                                    </div>
                                </div>
                            </div>

                            {/* Escrow Info */}
                            <div className="px-5 py-3 flex items-center justify-between bg-white">
                                <div className="flex items-center gap-2">
                                    <ShieldCheck className={`h-4 w-4 ${selectedOrderForTracking.escrow_status === 'released' ? 'text-ratel-green-500' : 'text-amber-500'}`} />
                                    <span className="text-xs font-semibold text-gray-500">
                                        {selectedOrderForTracking.escrow_status === "held" ? "Funds held in escrow" : "Funds released to seller"}
                                    </span>
                                </div>
                                {selectedOrderForTracking.escrow_status === "held" && (
                                    <Button
                                        size="sm"
                                        onClick={() => {
                                            handleReleaseEscrow(selectedOrderForTracking.id);
                                            setSelectedOrderForTracking(null);
                                        }}
                                        className="text-[10px] font-bold bg-ratel-green-600 hover:bg-ratel-green-700 text-white rounded-lg h-7 px-3"
                                    >
                                        Release
                                    </Button>
                                )}
                            </div>

                            {/* Tracking Steps */}
                            <div className="px-5 py-4 space-y-4 max-h-[40vh] overflow-y-auto">
                                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Shipment Tracking</h3>
                                <div className="relative">
                                    <div className="absolute left-3 top-3 bottom-3 w-px bg-gray-200" />
                                    <div className="space-y-4">
                                        {(selectedOrderForTracking.tracking_steps || [
                                            { status: "Order Placed", location: "System", timestamp: selectedOrderForTracking.created_at, completed: true }
                                        ]).map((step, i) => (
                                            <div key={i} className="relative flex gap-4 pl-8">
                                                <div className={`absolute left-0 top-0.5 w-6 h-6 rounded-full flex items-center justify-center z-10 ${step.completed ? 'bg-ratel-green-500 text-gray-900' : 'bg-gray-100 text-gray-400'
                                                    }`}>
                                                    {step.completed ? <CheckCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                                                </div>
                                                <div>
                                                    <p className={`text-xs font-semibold ${step.completed ? 'text-gray-900' : 'text-gray-400'}`}>{step.status}</p>
                                                    <p className="text-[10px] text-gray-400">{step.location} • {new Date(step.timestamp).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="p-4 flex gap-2 border-t border-gray-200">
                                {selectedOrderForTracking.status === "delivered" && (
                                    <Button
                                        size="sm"
                                        onClick={() => {
                                            handleBuyAgain(selectedOrderForTracking);
                                            setSelectedOrderForTracking(null);
                                        }}
                                        className="flex-1 bg-ratel-green-600 hover:bg-ratel-green-700 text-white rounded-lg text-xs font-semibold"
                                    >
                                        <RotateCcw className="h-3 w-3 mr-1.5" /> Buy Again
                                    </Button>
                                )}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setSelectedOrderForTracking(null)}
                                    className="flex-1 rounded-lg text-xs font-semibold border-gray-300 text-gray-900 hover:bg-gray-100 bg-transparent"
                                >
                                    Close
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <Footer />
        </div>
    );
}
