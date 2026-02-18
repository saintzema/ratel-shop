"use client";

import { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Order } from "@/lib/types";
import { DemoStore } from "@/lib/demo-store";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, Truck, CheckCircle, Clock, MapPin, Phone, ChevronLeft, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { TrackingTimeline } from "@/components/order/TrackingTimeline";

export default function OrderDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const [order, setOrder] = useState<Order | null>(null);

    useEffect(() => {
        const id = params.id as string;
        if (id) {
            const allOrders = DemoStore.getOrders();
            const foundOrder = allOrders.find(o => o.id === id);
            setOrder(foundOrder || null);
        }
    }, [params.id]);

    if (!order) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
                <Navbar />
                <main className="flex-1 container mx-auto px-4 py-8 pt-24 max-w-3xl flex items-center justify-center">
                    <div className="text-center">
                        <div className="h-12 w-12 border-4 border-gray-200 border-t-ratel-green-600 rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-gray-500">Loading order details...</p>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    const handleReleaseEscrow = () => {
        DemoStore.updateOrderEscrow(order.id, "released");
        // Update local state
        setOrder({ ...order, escrow_status: "released" });
        alert("Payment released successfully!");
    };

    const handleDownloadInvoice = () => {
        window.print();
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            <Navbar />

            <main className="flex-1 container mx-auto px-4 py-8 pt-24 max-w-4xl">
                <Link href="/account/orders" className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-black mb-6">
                    <ChevronLeft className="h-4 w-4" /> Back to Orders
                </Link>

                <div className="flex flex-col md:flex-row gap-8">
                    {/* Main Order Content */}
                    <div className="flex-1 space-y-6">
                        {/* Status Card */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                            <div className="flex items-center gap-4 mb-2">
                                {order.status === "delivered" ? (
                                    <CheckCircle className="h-8 w-8 text-ratel-green-600" />
                                ) : order.status === "shipped" ? (
                                    <Truck className="h-8 w-8 text-blue-600" />
                                ) : (
                                    <Package className="h-8 w-8 text-amber-600" />
                                )}
                                <div>
                                    <h1 className="text-2xl font-black text-gray-900">
                                        {order.status === "delivered" ? "Delivered" : order.status === "shipped" ? "On the way" : "Processing"}
                                    </h1>
                                    <p className="text-sm text-gray-500">Order #{order.id}</p>
                                </div>
                            </div>
                            <div className="h-2 bg-gray-100 rounded-full mt-4 overflow-hidden">
                                <div
                                    className={`h-full rounded-full ${order.status === "delivered" ? "bg-ratel-green-600 w-full" : order.status === "shipped" ? "bg-blue-600 w-2/3" : "bg-amber-500 w-1/3"}`}
                                />
                            </div>
                            <div className="flex justify-between text-xs font-bold text-gray-400 mt-2 uppercase tracking-wide">
                                <span className={order.status !== "pending" ? "text-amber-600" : ""}>Ordered</span>
                                <span className={order.status === "shipped" || order.status === "delivered" ? "text-blue-600" : ""}>Shipped</span>
                                <span className={order.status === "delivered" ? "text-ratel-green-600" : ""}>Delivered</span>
                            </div>
                        </div>

                        {/* Tracking Timeline */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="font-bold text-lg text-gray-900">Tracking Status</h2>
                                {order.tracking_id && (
                                    <div className="text-right">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tracking ID</p>
                                        <p className="text-sm font-black text-blue-600">{order.tracking_id}</p>
                                    </div>
                                )}
                            </div>
                            <TrackingTimeline steps={order.tracking_steps || []} />
                        </div>

                        {/* Items */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                            <h2 className="font-bold text-lg mb-4 text-gray-900">Items in this order</h2>
                            <div className="flex gap-4">
                                <div className="h-20 w-20 bg-gray-50 rounded-xl border border-gray-100 p-2 shrink-0">
                                    <img src={order.product?.image_url} alt={order.product?.name} className="h-full w-full object-contain mix-blend-multiply" />
                                </div>
                                <div>
                                    <Link href={`/product/${order.product_id}`} className="font-bold text-gray-900 hover:text-ratel-green-600 line-clamp-2">
                                        {order.product?.name || "Product"}
                                    </Link>
                                    <p className="text-sm text-gray-500 mt-1">Quantity: {(order as any).quantity || 1}</p>
                                    <p className="font-bold text-ratel-green-600 mt-1">{formatPrice((order as any).total_price || order.amount)}</p>
                                </div>
                            </div>
                        </div>

                        {/* Payment Info */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                            <h2 className="font-bold text-lg mb-4 text-gray-900">Payment Information</h2>
                            <div className="flex justify-between py-2 border-b border-gray-100">
                                <span className="text-gray-500">Payment Method</span>
                                <span className="font-bold text-gray-900">Paystack / Card</span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-gray-100">
                                <span className="text-gray-500">Item Total</span>
                                <span className="font-bold text-gray-900">{formatPrice(order.amount)}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-gray-100">
                                <span className="text-gray-500">Shipping</span>
                                <span className="font-bold text-gray-900">₦2,500</span>
                            </div>
                            <div className="flex justify-between py-2 pt-4">
                                <span className="font-bold text-gray-900">Grand Total</span>
                                <span className="font-black text-xl text-ratel-green-600">{formatPrice(order.amount)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="w-full md:w-80 space-y-4">
                        {/* Escrow Status */}
                        <div className="bg-zinc-50 rounded-xl p-5 border border-zinc-100">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Escrow Status</span>
                                <Badge className={
                                    order.escrow_status === "released"
                                        ? "bg-ratel-green-100 text-ratel-green-700 hover:bg-ratel-green-100 border-none"
                                        : "bg-blue-100 text-blue-700 hover:bg-blue-100 border-none"
                                }>
                                    {order.escrow_status === "released" ? "Released" : "In Holding"}
                                </Badge>
                            </div>

                            {order.escrow_status === "held" && (
                                <>
                                    <div className="flex items-start gap-3 text-sm text-zinc-600 mb-4 bg-white p-3 rounded-lg border border-zinc-200">
                                        <ShieldCheck className="h-5 w-5 text-ratel-green-600 shrink-0" />
                                        <p>Your payment is currently held in escrow. The seller will only be paid once you confirm delivery.</p>
                                    </div>
                                    <Button
                                        onClick={handleReleaseEscrow}
                                        className="w-full bg-ratel-green-600 hover:bg-ratel-green-700 text-white rounded-xl font-bold py-6 shadow-lg shadow-ratel-green-600/20"
                                    >
                                        Confirm Delivery & Release Payment
                                    </Button>
                                </>
                            )}
                            {order.escrow_status === "released" && (
                                <div className="text-center py-4">
                                    <CheckCircle className="h-8 w-8 text-ratel-green-600 mx-auto mb-2" />
                                    <p className="font-bold text-gray-900">Payment Released</p>
                                    <p className="text-xs text-gray-500">Transaction completed successfully.</p>
                                </div>
                            )}
                        </div>

                        {/* Shipping Info */}
                        <div className="bg-white rounded-xl p-5 border border-gray-100">
                            <h3 className="font-bold text-gray-900 mb-3">Shipping Details</h3>
                            <div className="space-y-3 text-sm">
                                <div className="flex items-start gap-3">
                                    <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                                    <div>
                                        <p className="font-bold text-gray-900">{user?.name || "Guest User"}</p>
                                        <p className="text-gray-500">123 Lekki Phase 1</p>
                                        <p className="text-gray-500">Lagos, Nigeria</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <Phone className="h-4 w-4 text-gray-400 mt-0.5" />
                                    <p className="text-gray-500">+234 801 234 5678</p>
                                </div>
                            </div>
                        </div>

                        <Button
                            variant="outline"
                            onClick={handleDownloadInvoice}
                            className="w-full rounded-xl border-gray-200 font-bold h-12"
                        >
                            Download Invoice
                        </Button>
                    </div>
                </div>

            </main>
            <Footer />
        </div>
    );
}
