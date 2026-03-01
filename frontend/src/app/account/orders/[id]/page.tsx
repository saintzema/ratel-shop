"use client";

import { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Order, DisputeReason, Dispute, SupportMessage } from "@/lib/types";
import { DemoStore } from "@/lib/demo-store";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, Truck, CheckCircle, Clock, MapPin, Phone, ChevronLeft, ShieldCheck, AlertTriangle, MessageSquare, Mail, Star, Download, ThumbsUp } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { TrackingTimeline } from "@/components/order/TrackingTimeline";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const DISPUTE_REASONS: { value: DisputeReason; label: string; desc: string }[] = [
    { value: "wrong_item", label: "Wrong Item", desc: "I received a different product" },
    { value: "damaged", label: "Damaged", desc: "The item arrived damaged or broken" },
    { value: "not_received", label: "Not Received", desc: "I haven't received my order" },
    { value: "not_as_described", label: "Not as Described", desc: "Product doesn't match the listing" },
    { value: "other", label: "Other", desc: "Another issue not listed above" },
];

export default function OrderDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const [order, setOrder] = useState<Order | null>(null);
    const [showDisputeModal, setShowDisputeModal] = useState(false);
    const [disputeReason, setDisputeReason] = useState<DisputeReason>("wrong_item");
    const [disputeDesc, setDisputeDesc] = useState("");
    const [existingDispute, setExistingDispute] = useState<Dispute | undefined>();
    const [adminMessages, setAdminMessages] = useState<SupportMessage[]>([]);
    const [statusMsg, setStatusMsg] = useState<string | null>(null);
    const [reviewRating, setReviewRating] = useState(0);
    const [reviewText, setReviewText] = useState("");
    const [reviewSubmitted, setReviewSubmitted] = useState(false);

    useEffect(() => {
        const id = params.id as string;
        if (id) {
            const allOrders = DemoStore.getOrders();
            const foundOrder = allOrders.find(o => o.id === id);
            setOrder(foundOrder || null);
            if (foundOrder) {
                setExistingDispute(DemoStore.getDisputeByOrderId(foundOrder.id));
                setAdminMessages(DemoStore.getAdminMessagesForOrder(foundOrder.id));
            }
        }
    }, [params.id]);

    // Cross-tab sync for disputes
    useEffect(() => {
        const handleSync = () => {
            const id = params.id as string;
            if (id) {
                const allOrders = DemoStore.getOrders();
                const foundOrder = allOrders.find(o => o.id === id);
                setOrder(foundOrder || null);
                if (foundOrder) {
                    setExistingDispute(DemoStore.getDisputeByOrderId(foundOrder.id));
                    setAdminMessages(DemoStore.getAdminMessagesForOrder(foundOrder.id));
                }
            }
        };
        window.addEventListener("storage", handleSync);
        window.addEventListener("demo-store-update", handleSync);
        return () => {
            window.removeEventListener("storage", handleSync);
            window.removeEventListener("demo-store-update", handleSync);
        };
    }, [params.id]);

    if (!order) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
                <Navbar />
                <main className="flex-1 container mx-auto px-4 py-8 pt-24 max-w-3xl flex items-center justify-center">
                    <div className="text-center">
                        <div className="h-12 w-12 border-4 border-gray-200 border-t-brand-green-600 rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-gray-500">Loading order details...</p>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    const handleReleaseEscrow = () => {
        DemoStore.updateOrderEscrow(order.id, "released");
        // Re-read order from store to get updated status and tracking steps
        const updatedOrders = DemoStore.getOrders();
        const updatedOrder = updatedOrders.find(o => o.id === order.id);
        if (updatedOrder) {
            setOrder(updatedOrder);
        } else {
            setOrder({ ...order, escrow_status: "released", status: "delivered" });
        }
        setStatusMsg("Payment released successfully! Order marked as delivered.");
        setTimeout(() => setStatusMsg(null), 3000);
    };

    const handleDownloadInvoice = () => {
        const invoiceEl = document.getElementById("invoice-print-area");
        if (!invoiceEl) { window.print(); return; }
        const printWindow = window.open("", "_blank");
        if (!printWindow) return;
        printWindow.document.write(`
            <html>
            <head>
                <title>Invoice - ${order.id}</title>
                <style>
                    body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #1a1a1a; }
                    h1 { font-size: 24px; margin-bottom: 8px; }
                    .subtitle { color: #888; font-size: 12px; margin-bottom: 24px; }
                    .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
                    .row.total { border-top: 2px solid #333; border-bottom: none; font-weight: bold; font-size: 18px; padding-top: 12px; }
                    .section { margin-top: 24px; }
                    .section-title { font-weight: bold; font-size: 14px; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px; color: #666; }
                    .product { display: flex; gap: 16px; align-items: center; }
                    .product img { width: 60px; height: 60px; object-fit: contain; border: 1px solid #eee; border-radius: 8px; padding: 4px; }
                    .badge { display: inline-block; background: #f0fdf4; color: #16a34a; padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: bold; }
                    .footer { text-align: center; margin-top: 40px; color: #aaa; font-size: 11px; border-top: 1px solid #eee; padding-top: 16px; }
                </style>
            </head>
            <body>
                <h1>Invoice</h1>
                <p class="subtitle">Order #${order.id} · ${new Date(order.created_at).toLocaleDateString("en-NG", { year: "numeric", month: "long", day: "numeric" })}</p>
                <div class="section">
                    <div class="section-title">Product</div>
                    <div class="product">
                        <img src="${order.product?.image_url || "/assets/images/placeholder.png"}" alt="" onerror="this.src='/assets/images/placeholder.png';" />
                        <div>
                            <p style="font-weight:bold">${order.product?.name || "Product"}</p>
                            <p style="color:#888;font-size:12px">Qty: 1</p>
                        </div>
                    </div>
                </div>
                <div class="section">
                    <div class="section-title">Payment Summary</div>
                    <div class="row"><span>Subtotal</span><span>₦${(order.amount / 100).toLocaleString()}</span></div>
                    <div class="row"><span>Shipping</span><span>₦${((Number(localStorage.getItem("fp_doorstep_fee")) || 4000) / 100).toLocaleString()}</span></div>
                    <div class="row total"><span>Total</span><span>₦${(order.amount / 100).toLocaleString()}</span></div>
                </div>
                <div class="section">
                    <div class="section-title">Shipping Address</div>
                    <p>${order.shipping_address || "Lagos, Nigeria"}</p>
                </div>
                <div class="section">
                    <div class="section-title">Escrow Status</div>
                    <span class="badge">${order.escrow_status === "released" ? "Released" : order.escrow_status === "held" ? "In Holding" : order.escrow_status}</span>
                </div>
                <div class="footer">
                    <p>FairPrice · Nigeria's Trusted Marketplace · fairprice.ng</p>
                    <p>This is an auto-generated invoice.</p>
                </div>
            </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
    };

    const handleBuyerResolve = () => {
        if (!existingDispute) return;
        DemoStore.buyerResolveDispute(existingDispute.id);
        setOrder({ ...order, escrow_status: "released" });
        setExistingDispute({ ...existingDispute, status: "resolved_release", resolved_at: new Date().toISOString() });
        setStatusMsg("Dispute resolved! Payment has been released to the seller.");
        setTimeout(() => setStatusMsg(null), 4000);
    };

    const handleSubmitReview = () => {
        if (reviewRating === 0) return;
        setReviewSubmitted(true);
        setStatusMsg("⭐ Thank you for your review!");
        setTimeout(() => setStatusMsg(null), 3000);
    };

    const handleSubmitDispute = () => {
        if (!user || !disputeDesc.trim()) return;
        DemoStore.raiseDispute(
            order.id,
            user.email || user.id,
            user.name || "Customer",
            user.email || "",
            disputeReason,
            disputeDesc
        );
        setOrder({ ...order, escrow_status: "disputed" });
        setExistingDispute(DemoStore.getDisputeByOrderId(order.id));
        setShowDisputeModal(false);
        setDisputeDesc("");
        setStatusMsg("Dispute filed. Our team will review your case within 24-48 hours.");
        setTimeout(() => setStatusMsg(null), 5000);
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            <Navbar />

            <main id="invoice-print-area" className="flex-1 container mx-auto px-4 py-8 pt-24 max-w-4xl">
                <Link href="/account/orders" className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-black mb-6">
                    <ChevronLeft className="h-4 w-4" /> Back to Orders
                </Link>

                <div className="flex flex-col md:flex-row gap-8">
                    {/* Main Order Content */}
                    <div className="flex-1 space-y-6">
                        {/* Status Card */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                            <div className="flex items-center gap-4 mb-2">
                                {order.escrow_status === "disputed" ? (
                                    <AlertTriangle className="h-8 w-8 text-rose-600" />
                                ) : order.status === "delivered" ? (
                                    <CheckCircle className="h-8 w-8 text-brand-green-600" />
                                ) : order.status === "shipped" ? (
                                    <Truck className="h-8 w-8 text-blue-600" />
                                ) : (
                                    <Package className="h-8 w-8 text-amber-600" />
                                )}
                                <div>
                                    <h1 className="text-2xl font-black text-gray-900">
                                        {order.escrow_status === "disputed" ? "Dispute Filed" : order.status === "delivered" ? "Delivered" : order.status === "shipped" ? "On the way" : "Processing"}
                                    </h1>
                                    <p className="text-sm text-gray-500">Order #{order.id}</p>
                                </div>
                            </div>
                            {order.escrow_status === "disputed" && (
                                <div className="mt-4 p-3 bg-rose-50 rounded-xl border border-rose-100 flex items-start gap-2">
                                    <AlertTriangle className="h-4 w-4 text-rose-600 mt-0.5 shrink-0" />
                                    <p className="text-xs text-rose-700 font-medium">Your dispute is under review. We'll update you within 24-48 hours.</p>
                                </div>
                            )}
                            {order.escrow_status !== "disputed" && (
                                <>
                                    <div className="h-2 bg-gray-100 rounded-full mt-4 overflow-hidden">
                                        <div
                                            className={`h-full rounded-full ${order.status === "delivered" ? "bg-brand-green-600 w-full" : order.status === "shipped" ? "bg-blue-600 w-2/3" : "bg-amber-500 w-1/3"}`}
                                        />
                                    </div>
                                    <div className="flex justify-between text-xs font-bold text-gray-400 mt-2 uppercase tracking-wide">
                                        <span className={order.status !== "pending" ? "text-amber-600" : ""}>Ordered</span>
                                        <span className={order.status === "shipped" || order.status === "delivered" ? "text-blue-600" : ""}>Shipped</span>
                                        <span className={order.status === "delivered" ? "text-brand-green-600" : ""}>Delivered</span>
                                    </div>
                                </>
                            )}
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
                                <Link href={`/product/${order.product_id}`} className="h-20 w-20 bg-gray-50 rounded-xl border border-gray-100 p-2 shrink-0 block hover:border-brand-green-400 transition-colors">
                                    <img src={order.product?.image_url || "/assets/images/placeholder.png"} alt={order.product?.name} className="h-full w-full object-contain mix-blend-multiply" onError={e => { e.currentTarget.src = "/assets/images/placeholder.png"; }} />
                                </Link>
                                <div>
                                    <Link href={`/product/${order.product_id}`} className="font-bold text-gray-900 hover:text-brand-green-600 line-clamp-2">
                                        {order.product?.name || "Product"}
                                    </Link>
                                    <p className="text-sm text-gray-500 mt-1">Quantity: {(order as any).quantity || 1}</p>
                                    <p className="font-bold text-brand-green-600 mt-1">{formatPrice((order as any).total_price || order.amount)}</p>
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
                                <span className="font-black text-xl text-brand-green-600">{formatPrice(order.amount)}</span>
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
                                        ? "bg-brand-green-100 text-brand-green-700 hover:bg-brand-green-100 border-none"
                                        : order.escrow_status === "disputed"
                                            ? "bg-rose-100 text-rose-700 hover:bg-rose-100 border-none"
                                            : order.escrow_status === "refunded"
                                                ? "bg-gray-100 text-gray-700 hover:bg-gray-100 border-none"
                                                : "bg-blue-100 text-blue-700 hover:bg-blue-100 border-none"
                                }>
                                    {order.escrow_status === "released" ? "Released" : order.escrow_status === "disputed" ? "Disputed" : order.escrow_status === "refunded" ? "Refunded" : "In Holding"}
                                </Badge>
                            </div>

                            {order.escrow_status === "held" && (
                                <>
                                    <div className="flex items-start gap-3 text-sm text-zinc-600 mb-4 bg-white p-3 rounded-lg border border-zinc-200">
                                        <ShieldCheck className="h-5 w-5 text-brand-green-600 shrink-0" />
                                        <p>Your payment is currently held in escrow. The seller will only be paid once you confirm delivery.</p>
                                    </div>
                                    <Button
                                        onClick={handleReleaseEscrow}
                                        className="w-full bg-brand-green-600 hover:bg-brand-green-700 text-white rounded-xl font-bold py-6 shadow-lg shadow-brand-green-600/20"
                                    >
                                        Confirm Delivery & Release Payment
                                    </Button>
                                </>
                            )}
                            {order.escrow_status === "released" && (
                                <div className="text-center py-4">
                                    <CheckCircle className="h-8 w-8 text-brand-green-600 mx-auto mb-2" />
                                    <p className="font-bold text-gray-900">Payment Released</p>
                                    <p className="text-xs text-gray-500">Transaction completed successfully.</p>
                                </div>
                            )}
                            {order.escrow_status === "disputed" && existingDispute && (
                                <div className="space-y-3">
                                    <div className="bg-rose-50 p-3 rounded-lg border border-rose-100">
                                        <p className="text-xs font-bold text-rose-700 uppercase tracking-widest mb-1">Reason</p>
                                        <p className="text-sm text-rose-800 font-medium">{existingDispute.reason.replace(/_/g, " ")}</p>
                                    </div>
                                    <div className="bg-white p-3 rounded-lg border border-zinc-200">
                                        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Your Description</p>
                                        <p className="text-sm text-zinc-700">{existingDispute.description}</p>
                                    </div>
                                    <p className="text-[10px] text-zinc-400 font-bold">Filed {new Date(existingDispute.created_at).toLocaleDateString()}</p>

                                    {/* Buyer Resolve Button */}
                                    {existingDispute.status === "open" && (
                                        <div className="pt-3 border-t border-zinc-100 space-y-2">
                                            <p className="text-xs text-zinc-500">Issue resolved with the seller? You can close this dispute and release the payment.</p>
                                            <Button
                                                onClick={handleBuyerResolve}
                                                className="w-full bg-brand-green-600 hover:bg-brand-green-700 text-white rounded-xl font-bold h-10 flex items-center gap-2"
                                            >
                                                <ThumbsUp className="h-4 w-4" /> Resolve & Release Payment
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )}
                            {order.escrow_status === "refunded" && (
                                <div className="text-center py-4">
                                    <CheckCircle className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                                    <p className="font-bold text-gray-900">Refund Issued</p>
                                    <p className="text-xs text-gray-500">Funds have been returned to your account.</p>
                                </div>
                            )}
                        </div>

                        {/* Report a Problem */}
                        {(order.status === "delivered" || order.status === "shipped") && order.escrow_status !== "disputed" && order.escrow_status !== "refunded" && (
                            <Button
                                variant="outline"
                                onClick={() => setShowDisputeModal(true)}
                                className="w-full rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50 font-bold h-12 flex items-center gap-2"
                            >
                                <AlertTriangle className="h-4 w-4" /> Report a Problem
                            </Button>
                        )}

                        {/* Admin Messages */}
                        {adminMessages.length > 0 && (
                            <div className="bg-white rounded-xl p-5 border border-blue-100">
                                <div className="flex items-center gap-2 mb-4">
                                    <Mail className="h-4 w-4 text-blue-600" />
                                    <h3 className="font-bold text-gray-900 text-sm">Messages from Admin</h3>
                                </div>
                                <div className="space-y-3">
                                    {adminMessages.map(msg => (
                                        <div key={msg.id} className="bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                                            <p className="text-xs font-bold text-blue-700 mb-1">{msg.subject}</p>
                                            <p className="text-sm text-gray-700">{msg.message}</p>
                                            <p className="text-[10px] text-gray-400 mt-2">{new Date(msg.created_at).toLocaleDateString()}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Shipping Info */}
                        <div className="bg-white rounded-xl p-5 border border-gray-100">
                            <h3 className="font-bold text-gray-900 mb-3">Shipping Details</h3>
                            <div className="space-y-3 text-sm">
                                <div className="flex items-start gap-3">
                                    <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                                    <div>
                                        <p className="font-bold text-gray-900">{user?.name || "Guest User"}</p>
                                        <p className="text-gray-500">{order.shipping_address || "Lagos, Nigeria"}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Leave a Review (for delivered orders) */}
                        {order.status === "delivered" && order.escrow_status !== "disputed" && !reviewSubmitted && (
                            <div className="bg-white rounded-xl p-5 border border-gray-100">
                                <h3 className="font-bold text-gray-900 mb-3 text-sm">Rate this Product</h3>
                                <div className="flex gap-1 mb-3">
                                    {[1, 2, 3, 4, 5].map(star => (
                                        <button
                                            key={star}
                                            onClick={() => setReviewRating(star)}
                                            className="transition-transform hover:scale-110"
                                        >
                                            <Star className={`h-6 w-6 ${star <= reviewRating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
                                        </button>
                                    ))}
                                </div>
                                <textarea
                                    value={reviewText}
                                    onChange={(e) => setReviewText(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3 text-sm min-h-[60px] focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none mb-3"
                                    placeholder="Share your experience..."
                                />
                                <Button
                                    onClick={handleSubmitReview}
                                    disabled={reviewRating === 0}
                                    size="sm"
                                    className="w-full bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-xs"
                                >
                                    <Star className="h-3 w-3 mr-1.5 fill-white" /> Submit Review
                                </Button>
                            </div>
                        )}
                        {reviewSubmitted && (
                            <div className="bg-amber-50 rounded-xl p-5 border border-amber-100 text-center">
                                <Star className="h-8 w-8 text-amber-500 fill-amber-500 mx-auto mb-2" />
                                <p className="font-bold text-gray-900 text-sm">Thanks for your review!</p>
                                <div className="flex justify-center gap-0.5 mt-1">
                                    {[1, 2, 3, 4, 5].map(s => (
                                        <Star key={s} className={`h-4 w-4 ${s <= reviewRating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
                                    ))}
                                </div>
                            </div>
                        )}

                        <Button
                            variant="outline"
                            onClick={handleDownloadInvoice}
                            className="w-full rounded-xl border-gray-200 font-bold h-12 flex items-center gap-2"
                        >
                            <Download className="h-4 w-4" /> Download Invoice
                        </Button>
                    </div>
                </div>

            </main>

            {/* Dispute Modal */}
            <Dialog open={showDisputeModal} onOpenChange={setShowDisputeModal}>
                <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-2xl border-gray-100">
                    <div className="p-6">
                        <DialogHeader className="mb-4">
                            <DialogTitle className="text-lg font-black text-gray-900 flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-rose-600" /> Report a Problem
                            </DialogTitle>
                            <p className="text-xs text-gray-500 mt-1">Tell us what went wrong with this order.</p>
                        </DialogHeader>

                        <div className="space-y-4">
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">What happened?</p>
                                <div className="space-y-2">
                                    {DISPUTE_REASONS.map(r => (
                                        <label
                                            key={r.value}
                                            className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${disputeReason === r.value
                                                ? "border-rose-300 bg-rose-50"
                                                : "border-gray-100 hover:border-gray-200"
                                                }`}
                                        >
                                            <input
                                                type="radio"
                                                name="dispute_reason"
                                                value={r.value}
                                                checked={disputeReason === r.value}
                                                onChange={() => setDisputeReason(r.value)}
                                                className="w-4 h-4 text-rose-600 focus:ring-rose-500"
                                            />
                                            <div>
                                                <p className="text-sm font-bold text-gray-900">{r.label}</p>
                                                <p className="text-xs text-gray-500">{r.desc}</p>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Describe the issue</p>
                                <textarea
                                    value={disputeDesc}
                                    onChange={(e) => setDisputeDesc(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3 text-sm min-h-[100px] focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none"
                                    placeholder="Provide details about what happened..."
                                />
                            </div>
                        </div>

                        <DialogFooter className="mt-6 gap-3 sm:gap-0">
                            <Button variant="ghost" onClick={() => setShowDisputeModal(false)} className="rounded-xl font-bold text-xs text-gray-400">Cancel</Button>
                            <Button
                                onClick={handleSubmitDispute}
                                disabled={!disputeDesc.trim()}
                                className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-6"
                            >
                                Submit Dispute
                            </Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Status Toast */}
            {statusMsg && (
                <div className="fixed bottom-6 right-6 bg-gray-900 text-white px-6 py-3.5 rounded-2xl shadow-2xl text-sm font-bold z-50">
                    {statusMsg}
                </div>
            )}

            <Footer />
        </div>
    );
}

