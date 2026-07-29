"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { DataSyncService } from "@/lib/sync-store";
import { 
    ChevronLeft, 
    Package, 
    Truck, 
    CheckCircle2, 
    Clock, 
    AlertTriangle,
    MessageSquare,
    User,
    MapPin,
    CreditCard,
    Phone,
    MessageCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { formatDateExact, cn } from "@/lib/utils";
import { CARRIERS, DEFAULT_CARRIER } from "@/lib/carriers";

export default function AdminOrderDetailPage() {
    const params = useParams();
    const router = useRouter();
    const orderId = params.id as string;
    
    const [order, setOrder] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);

    const loadOrder = () => {
        const found = DataSyncService.getOrders().find(o => o.id === orderId);
        if (found) {
            setOrder(found);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadOrder();
        window.addEventListener("sync-store-update", loadOrder);
        window.addEventListener("storage", loadOrder);
        return () => {
            window.removeEventListener("sync-store-update", loadOrder);
            window.removeEventListener("storage", loadOrder);
        };
    }, [orderId]);

    const handleStatusUpdate = (newStatus: string) => {
        if (!order) return;
        DataSyncService.updateOrderStatus(order.id, newStatus as any);
        setOrder((prev: any) => prev ? { ...prev, status: newStatus } : null);
        alert(`Order status updated to ${newStatus}`);
    };

    const handleCarrierUpdate = async (newCarrier: string) => {
        if (!order) return;
        setOrder((prev: any) => prev ? { ...prev, carrier: newCarrier } : null);
        try {
            const res = await fetch("/api/orders", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: order.id, carrier: newCarrier }),
            });
            if (!res.ok) throw new Error("save failed");
        } catch {
            alert("Couldn't save the carrier change — please try again.");
            loadOrder();
        }
    };

    const handleEscrowUpdate = (newEscrow: string) => {
        if (!order) return;
        
        const orders = DataSyncService.getOrders();
        const updated = orders.map(o => o.id === order.id ? { ...o, escrow_status: newEscrow } : o);
        localStorage.setItem("fp_orders", JSON.stringify(updated));
        window.dispatchEvent(new Event("sync-store-update"));
        
        setOrder((prev: any) => prev ? { ...prev, escrow_status: newEscrow } : null);
        alert(`Escrow status updated to ${newEscrow}`);
    };

    if (loading) return <div className="p-12 text-center text-gray-500 font-medium animate-pulse">Loading order details...</div>;

    if (!order) {
        return (
            <div className="max-w-4xl mx-auto py-24 text-center">
                <Package className="h-16 w-16 mx-auto text-gray-300 mb-6" />
                <h2 className="text-2xl font-black text-gray-900">Order Not Found</h2>
                <p className="text-gray-500 mt-2 mb-8 font-medium">This transaction might have been refunded or deleted.</p>
                <Button onClick={() => router.back()} className="rounded-xl px-8 h-12 font-bold bg-indigo-600 text-white hover:bg-indigo-700">Go Back</Button>
            </div>
        );
    }

    const buyerName = order.customer_name || order.customer_id?.split('@')[0] || "Customer";

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-24">
            <Link href="/admin/orders" className="inline-flex items-center text-sm font-bold text-gray-500 hover:text-indigo-600 transition-colors">
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back to Orders
            </Link>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                        Order #{order.id.split('_')[1]?.substring(0, 8) || order.id.substring(0, 8)}
                    </h1>
                    <p className="text-sm text-gray-500 font-medium mt-1">Placed on {formatDateExact(order.created_at)}</p>
                </div>
                <div className="flex gap-3">
                    <Link href={`/admin/inbox/orders?order=${order.id}`}>
                        <Button className="h-12 rounded-xl px-6 bg-white border border-gray-200 text-gray-700 font-bold hover:bg-gray-50 shadow-sm">
                            <MessageSquare className="w-4 h-4 mr-2" />
                            Launch Concierge
                        </Button>
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Order details */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sm:p-8">
                        <h2 className="text-lg font-black text-gray-900 mb-6">Status Management</h2>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
                            <div className="space-y-3">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Fulfillment Status</label>
                                <Select value={order.status} onValueChange={handleStatusUpdate}>
                                    <SelectTrigger className="h-12 rounded-xl border-gray-200 font-bold bg-gray-50/50">
                                        <SelectValue placeholder="Update Status" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl font-medium">
                                        <SelectItem value="pending">Pending</SelectItem>
                                        <SelectItem value="processing">Processing</SelectItem>
                                        <SelectItem value="shipped">Shipped</SelectItem>
                                        <SelectItem value="delivered">Delivered</SelectItem>
                                        <SelectItem value="cancelled">Cancelled</SelectItem>
                                        <SelectItem value="return_requested">Return Requested</SelectItem>
                                        <SelectItem value="return_approved">Return Approved</SelectItem>
                                        <SelectItem value="return_rejected">Return Rejected</SelectItem>
                                        <SelectItem value="return_completed">Return Completed</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-3">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Financial Escrow</label>
                                <Select value={order.escrow_status || "held"} onValueChange={handleEscrowUpdate}>
                                    <SelectTrigger className="h-12 rounded-xl border-gray-200 font-bold bg-gray-50/50">
                                        <SelectValue placeholder="Update Escrow" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl font-medium">
                                        <SelectItem value="held">Funds Held</SelectItem>
                                        <SelectItem value="released">Funds Released (Payout)</SelectItem>
                                        <SelectItem value="disputed">Disputed / Frozen</SelectItem>
                                        <SelectItem value="refunded">Refunded to Buyer</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-3">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Delivery Carrier</label>
                                <Select value={order.carrier || DEFAULT_CARRIER} onValueChange={handleCarrierUpdate}>
                                    <SelectTrigger className="h-12 rounded-xl border-gray-200 font-bold bg-gray-50/50">
                                        <SelectValue placeholder="Select Carrier" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl font-medium">
                                        {CARRIERS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-6 sm:px-8 py-6 border-b border-gray-50 bg-gray-50/30">
                            <h2 className="text-lg font-black text-gray-900">Purchased Item</h2>
                        </div>
                        <div className="p-6 sm:p-8">
                            <div className="flex gap-6 items-center">
                                <div className="h-24 w-24 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
                                    {order.product?.image_url ? (
                                        <img src={order.product.image_url} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <Package className="h-8 w-8 text-gray-300" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-gray-900 text-lg truncate">{order.product?.name || "Unknown Product"}</h3>
                                    <p className="text-sm text-gray-500 font-medium mt-1">Sold by {order.product?.seller_name || "FairPrice Seller"}</p>
                                    <div className="mt-3 flex items-center gap-4">
                                        <div className="text-sm font-bold text-gray-900">Qty: {order.quantity || 1}</div>
                                        <div className="text-sm font-black text-indigo-600">₦{order.amount?.toLocaleString()}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column - User & Logic */}
                <div className="space-y-6">
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sm:p-8">
                        <h2 className="text-lg font-black text-gray-900 mb-6">Customer</h2>
                        <div className="space-y-6">
                            <div className="flex items-start gap-4">
                                <div className="mt-0.5"><User className="w-5 h-5 text-gray-400" /></div>
                                <div>
                                    <Link href={`/admin/users/${order.customer_id}`} className="font-bold text-gray-900 hover:text-indigo-600 hover:underline">
                                        {buyerName}
                                    </Link>
                                    <div className="text-xs text-gray-500 font-medium mt-1">{order.customer_email || "No email available"}</div>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <div className="mt-0.5"><MapPin className="w-5 h-5 text-gray-400" /></div>
                                <div>
                                    <div className="font-bold text-sm text-gray-700">Delivery Address</div>
                                    <div className="text-xs text-gray-500 font-medium mt-1 leading-relaxed">
                                        {order.shipping_address || "No shipping address provided"}
                                    </div>
                                </div>
                            </div>
                            {(order.customer_phone || order.customer_whatsapp) && (
                                <div className="flex items-start gap-4 pt-4 border-t border-gray-50">
                                    <div className="mt-0.5"><Phone className="w-5 h-5 text-gray-400" /></div>
                                    <div className="space-y-3">
                                        {order.customer_phone && (
                                            <div>
                                                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Phone</div>
                                                <div className="text-sm font-medium text-gray-900 leading-relaxed">{order.customer_phone}</div>
                                            </div>
                                        )}
                                        {order.customer_whatsapp && (
                                            <div>
                                                <div className="text-xs font-bold text-emerald-600 uppercase tracking-wider">WhatsApp</div>
                                                <div className="text-sm font-medium text-emerald-700 leading-relaxed">{order.customer_whatsapp}</div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sm:p-8">
                        <h2 className="text-lg font-black text-gray-900 mb-6">Financials</h2>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500 font-medium">Subtotal (Qty {order.quantity || 1})</span>
                                <span className="font-bold text-gray-900">₦{order.amount?.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500 font-medium">Delivery</span>
                                <span className="font-bold text-gray-900">₦0</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500 font-medium">Taxes</span>
                                <span className="font-bold text-gray-900">₦0</span>
                            </div>
                            <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
                                <span className="font-bold text-gray-900">Grand Total</span>
                                <span className="text-xl font-black text-indigo-600">₦{order.amount?.toLocaleString()}</span>
                            </div>
                            
                            <div className="pt-6 mt-2 flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-emerald-50 flex items-center justify-center">
                                    <CreditCard className="w-4 h-4 text-emerald-600" />
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-gray-900 uppercase">Paid via {order.payment_method || "Paystack"}</div>
                                    <div className="text-[10px] text-gray-500 font-medium mt-0.5">Verified Transaction</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
