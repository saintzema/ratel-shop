"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { DEMO_ORDERS } from "@/lib/data";
import { Order, NegotiationRequest } from "@/lib/types";
import { DemoStore } from "@/lib/demo-store";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Package, Truck, CheckCircle, Clock, Info, ChevronRight, Handshake } from "lucide-react";
import Link from "next/link";

export default function OrdersPage() {
    const [orders, setOrders] = useState<Order[]>(DEMO_ORDERS);
    // Fetch negotiations from DemoStore
    const [negotiations, setNegotiations] = useState<NegotiationRequest[]>([]);

    useEffect(() => {
        // Load initial state
        setNegotiations(DemoStore.getNegotiations());

        // Listen for storage changes (updates from other tabs/seller dashboard)
        const handleStorageChange = () => {
            setNegotiations(DemoStore.getNegotiations());
        };
        window.addEventListener("storage", handleStorageChange);
        return () => window.removeEventListener("storage", handleStorageChange);
    }, []);

    const handleReleaseEscrow = (orderId: string) => {
        setOrders(prev => prev.map(order =>
            order.id === orderId ? { ...order, escrow_status: "released" as const } : order
        ));
        alert("Payment has been released to the seller. Thank you for confirming!");
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            <Navbar />

            <main className="flex-1 container mx-auto px-4 py-8 pt-24 max-w-5xl">
                <div className="flex border-b border-gray-200 mb-8">
                    <button className="px-6 py-4 font-bold border-b-4 border-ratel-green-600 text-ratel-green-700">Your Orders</button>
                    <button className="px-6 py-4 font-medium text-gray-500 hover:text-black transition-colors">Buy Again</button>
                    <button className="px-6 py-4 font-medium text-gray-500 hover:text-black transition-colors">Not Yet Shipped</button>
                    <button className="px-6 py-4 font-medium text-gray-500 hover:text-black transition-colors">Cancelled Orders</button>
                </div>

                <div className="space-y-6">
                    {/* Negotiation Requests (Pending & Accepted) */}
                    {(negotiations.some(n => n.status === "pending") || negotiations.some(n => n.status === "accepted")) && (
                        <div className="bg-white border border-ratel-green-100 rounded-xl overflow-hidden shadow-sm">
                            <div className="bg-ratel-green-50 px-6 py-3 border-b border-ratel-green-100 flex items-center justify-between">
                                <h3 className="font-bold text-ratel-green-800 flex items-center gap-2">
                                    <Handshake className="h-4 w-4" /> Negotiations
                                </h3>
                            </div>
                            <div className="p-6 space-y-4">
                                {negotiations.filter(n => n.status === "pending").map(neg => (
                                    <div key={neg.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 border border-dashed border-gray-200 rounded-lg bg-gray-50">
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 bg-white rounded-full flex items-center justify-center border border-gray-200">
                                                <Clock className="h-5 w-5 text-zinc-400" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm">Your offer for {formatPrice(neg.proposed_price)} is pending</p>
                                                <p className="text-xs text-gray-500">The seller has 24 hours to respond to your request.</p>
                                            </div>
                                        </div>
                                        <Button variant="outline" size="sm" className="rounded-full text-xs font-bold border-gray-300">View Details</Button>
                                    </div>
                                ))}

                                {negotiations.filter(n => n.status === "accepted").map(neg => (
                                    <div key={neg.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 border border-green-200 rounded-lg bg-green-50/50">
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center border border-green-200">
                                                <CheckCircle className="h-5 w-5 text-green-600" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm text-green-800">Offer Accepted! {formatPrice(neg.proposed_price)}</p>
                                                <p className="text-xs text-green-600">The seller accepted your fair price. Complete purchase now.</p>
                                            </div>
                                        </div>
                                        <Link href={`/checkout?negotiationId=${neg.id}`}>
                                            <Button size="sm" className="rounded-full text-xs font-bold bg-green-600 hover:bg-green-700 text-white shadow-sm">
                                                Buy Now at {formatPrice(neg.proposed_price)}
                                            </Button>
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Order List */}
                    {orders.map((order) => (
                        <div key={order.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex flex-wrap gap-y-4 justify-between text-xs text-gray-600 uppercase tracking-wider font-bold">
                                <div className="flex gap-8">
                                    <div>
                                        <p className="mb-1 text-[10px] text-gray-400">Order Placed</p>
                                        <p className="text-black">{new Date(order.created_at).toLocaleDateString()}</p>
                                    </div>
                                    <div>
                                        <p className="mb-1 text-[10px] text-gray-400">Total</p>
                                        <p className="text-black">{formatPrice(order.total_price)}</p>
                                    </div>
                                    <div>
                                        <p className="mb-1 text-[10px] text-gray-400">Ship To</p>
                                        <p className="text-blue-600 hover:text-ratel-orange cursor-pointer">Tunde B.</p>
                                    </div>
                                </div>
                                <div>
                                    <p className="mb-1 text-[10px] text-gray-400 text-right">Order # {order.id.split('_')[1]}</p>
                                    <div className="flex gap-4">
                                        <Link href="#" className="text-blue-600 hover:underline">View order details</Link>
                                        <span className="text-gray-300">|</span>
                                        <Link href="#" className="text-blue-600 hover:underline">Invoice</Link>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6">
                                <div className="flex flex-col md:flex-row gap-8">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-4">
                                            {order.status === "delivered" ? (
                                                <CheckCircle className="h-5 w-5 text-ratel-green-600" />
                                            ) : order.status === "shipped" ? (
                                                <Truck className="h-5 w-5 text-blue-600" />
                                            ) : (
                                                <Package className="h-5 w-5 text-amber-600" />
                                            )}
                                            <h3 className="font-black text-lg">
                                                {order.status === "delivered" ? "Delivered" : order.status === "shipped" ? "On the way" : "Processing"}
                                            </h3>
                                        </div>

                                        <div className="flex gap-4">
                                            <div className="h-24 w-24 bg-gray-50 rounded-lg border border-gray-200 p-2 shrink-0">
                                                <img src={order.product.image_url} alt={order.product.name} className="h-full w-full object-contain mix-blend-multiply" />
                                            </div>
                                            <div className="space-y-2">
                                                <Link href={`/product/${order.product_id}`} className="text-blue-600 hover:text-ratel-orange font-medium line-clamp-2 leading-tight">
                                                    {order.product.name}
                                                </Link>
                                                <p className="text-xs text-gray-500">Sold by: <span className="text-blue-600">{order.product.seller_name}</span></p>
                                                <div className="flex items-center gap-2">
                                                    <Button size="sm" className="rounded-full bg-ratel-orange text-black hover:bg-amber-500 font-bold px-6">Buy it again</Button>
                                                    <Button variant="outline" size="sm" className="rounded-full border-gray-300 shadow-sm font-bold">View your item</Button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="w-full md:w-64 space-y-3">
                                        <div className="bg-zinc-50 rounded-xl p-4 border border-zinc-100 flex flex-col gap-3">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Escrow Status</span>
                                                <Badge className={
                                                    order.escrow_status === "released"
                                                        ? "bg-ratel-green-100 text-ratel-green-700 hover:bg-ratel-green-100"
                                                        : "bg-blue-100 text-blue-700 hover:bg-blue-100"
                                                }>
                                                    {order.escrow_status === "released" ? "Released" : "In Holding"}
                                                </Badge>
                                            </div>

                                            {order.escrow_status === "holding" && (
                                                <>
                                                    <div className="flex items-start gap-2 text-[10px] text-zinc-500 leading-tight">
                                                        <ShieldCheck className="h-3.5 w-3.5 text-ratel-green-600 shrink-0" />
                                                        <p>Your payment is secure in escrow. Confirm delivery to release funds to the seller.</p>
                                                    </div>
                                                    {order.status === "delivered" && (
                                                        <Button
                                                            onClick={() => handleReleaseEscrow(order.id)}
                                                            className="w-full bg-ratel-green-600 hover:bg-ratel-green-700 text-white rounded-full font-bold py-2 h-auto text-xs"
                                                        >
                                                            Confirm & Release Payment
                                                        </Button>
                                                    )}
                                                </>
                                            )}

                                            {order.escrow_status === "released" && (
                                                <div className="flex items-start gap-2 text-[10px] text-ratel-green-700 leading-tight">
                                                    <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                                                    <p>Payment successfully released. Thank you!</p>
                                                </div>
                                            )}
                                        </div>

                                        <Button variant="outline" className="w-full rounded-full border-gray-300 font-bold h-9">Track package</Button>
                                        <Button variant="outline" className="w-full rounded-full border-gray-300 font-bold h-9">Return items</Button>
                                        <Button variant="outline" className="w-full rounded-full border-gray-300 font-bold h-9">Write a product review</Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </main>

            <Footer />
        </div>
    );
}
