"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DemoStore } from "@/lib/demo-store";
import { TrackingTimeline } from "@/components/order/TrackingTimeline";
import { Order } from "@/lib/types";
import { Search, Package, ArrowRight, Truck } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import Link from "next/link";

export default function TrackingPage() {
    const [trackingId, setTrackingId] = useState("");
    const [order, setOrder] = useState<Order | null>(null);
    const [error, setError] = useState("");
    const [searched, setSearched] = useState(false);

    // Auth Protection
    const { user, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && !user) {
            router.push(`/login?from=/tracking`);
        }
    }, [user, isLoading, router]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (!trackingId.trim()) return;

        setError("");
        setSearched(true);
        const foundOrder = DemoStore.getOrderByTrackingId(trackingId.trim());

        if (foundOrder) {
            setOrder(foundOrder);
        } else {
            setOrder(null);
            setError("Tracking ID not found. Please check and try again.");
        }
    };

    const handlePrintInvoice = () => {
        window.print();
    };

    if (isLoading || !user) {
        return <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-ratel-orange"></div>
        </div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans print:bg-white">
            <div className="print:hidden">
                <Navbar />
            </div>

            <main className="flex-1 flex flex-col">
                {/* Hero Section - Hidden on Print */}
                <div className="bg-ratel-green-900 py-16 px-4 text-center relative overflow-hidden print:hidden">
                    <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80')] bg-cover bg-center opacity-10"></div>
                    <div className="relative z-10 max-w-2xl mx-auto">
                        <h1 className="text-3xl md:text-4xl font-black text-white mb-4 tracking-tight">
                            Track Your Order
                        </h1>
                        <p className="text-ratel-green-100 mb-8 text-lg">
                            Enter your tracking number or order ID to see real-time updates.
                        </p>

                        <form onSubmit={handleSearch} className="flex gap-2 max-w-md mx-auto">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <Input
                                    placeholder="e.g., RATEL-8XJ92KLD"
                                    className="pl-10 h-12 text-base bg-white border-0 shadow-lg text-gray-900 placeholder:text-gray-400 focus-visible:ring-offset-0 focus-visible:ring-ratel-orange"
                                    value={trackingId}
                                    onChange={(e) => setTrackingId(e.target.value)}
                                />
                            </div>
                            <Button type="submit" className="h-12 px-6 bg-ratel-orange hover:bg-orange-500 text-black font-bold shadow-lg">
                                Track
                            </Button>
                        </form>
                        {error && (
                            <div className="mt-4 bg-red-500/10 border border-red-500/20 text-red-200 px-4 py-2 rounded-lg inline-block text-sm backdrop-blur-sm">
                                {error}
                            </div>
                        )}
                    </div>
                </div>

                {/* Results Section */}
                <div className="container mx-auto px-4 py-12 max-w-4xl print:p-0 print:max-w-none">
                    {order ? (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 print:space-y-4">
                            {/* Invoice Header for Print */}
                            <div className="hidden print:block mb-8 border-b border-gray-200 pb-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h1 className="text-2xl font-bold text-ratel-green-900">INVOICE & TRACKING</h1>
                                        <p className="text-sm text-gray-500 mt-1">RatelShop Information Services</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-gray-900">Date: {new Date().toLocaleDateString()}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Order Summary Card */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden print:shadow-none print:border-gray-300">
                                <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-4 print:bg-white print:border-b-2 print:border-gray-200">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-ratel-green-100 p-2 rounded-full text-ratel-green-700 print:hidden">
                                            <Package className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Order ID</p>
                                            <p className="font-mono font-bold text-gray-900">{order.id}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2">
                                            <Truck className="h-4 w-4 text-gray-400 print:hidden" />
                                            <span className="text-sm font-medium text-gray-600">Carrier: <span className="text-gray-900 font-bold">{order.carrier || "Ratel Logistics"}</span></span>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="gap-2 print:hidden ml-2"
                                            onClick={handlePrintInvoice}
                                        >
                                            <span className="sr-only">Download Invoice</span>
                                            Download Invoice PDF
                                        </Button>
                                    </div>
                                </div>

                                <div className="p-6">
                                    <div className="flex flex-col sm:flex-row gap-6 items-start">
                                        <div className="h-24 w-24 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden border border-gray-200 print:hidden">
                                            <img src={order.product?.image_url} alt={order.product?.name} className="w-full h-full object-contain mix-blend-multiply p-2" />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="text-lg font-bold text-gray-900 mb-1">{order.product?.name}</h3>
                                            <p className="text-sm text-gray-500 mb-3 line-clamp-2">{order.product?.description}</p>
                                            <div className="flex items-center gap-4">
                                                <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 ring-1 ring-inset ring-emerald-600/20 uppercase tracking-wide print:border print:border-emerald-600">
                                                    {order.status}
                                                </span>
                                                <span className="text-gray-300 print:hidden">|</span>
                                                <span className="font-bold text-gray-900">{formatPrice(order.amount)}</span>
                                            </div>
                                        </div>
                                        <div className="flex-shrink-0 self-center sm:self-start print:hidden">
                                            <Link href={`/product/${order.product?.id}`}>
                                                <Button variant="outline" size="sm" className="gap-2">
                                                    View Product <ArrowRight className="h-3 w-3" />
                                                </Button>
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Timeline */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8 print:shadow-none print:border-gray-300">
                                <h2 className="text-xl font-bold text-gray-900 mb-6">Tracking History</h2>
                                <TrackingTimeline steps={order.tracking_steps ?? []} currentStatus={order.tracking_status} />
                            </div>
                        </div>
                    ) : searched && !error && (
                        <div className="text-center py-20 text-gray-400 print:hidden">
                            <Package className="h-16 w-16 mx-auto mb-4 opacity-20" />
                            <p>No tracking information found.</p>
                        </div>
                    )}

                    {!searched && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 opacity-60 print:hidden">
                            {/* ... (Existing empty state cards) ... */}
                        </div>
                    )}
                </div>
            </main>

            <div className="print:hidden">
                <Footer />
            </div>
        </div>
    );
}
