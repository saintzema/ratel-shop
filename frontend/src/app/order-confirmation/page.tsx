"use client";

import Link from "next/link";
import Script from "next/script";
import { Button } from "@/components/ui/button";
import { CheckCircle, Package, ArrowRight } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";

// Extend Window for the Google Customer Reviews API
declare global {
    interface Window {
        renderOptIn?: () => void;
        gapi?: any;
    }
}

function OrderDetails() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [orderId, setOrderId] = useState("Processing...");
    const [deliveryDate, setDeliveryDate] = useState("Calculating...");
    const [email, setEmail] = useState("");
    const [estimatedDate, setEstimatedDate] = useState("");

    useEffect(() => {
        const paramId = searchParams.get('id') || searchParams.get('order_id');
        const paramEmail = searchParams.get('email') || '';
        const paramDate = searchParams.get('date') || '';

        if (paramId) {
            setOrderId(paramId);
        } else {
            setOrderId(`ORD-${Math.floor(100000 + Math.random() * 900000)}`);
        }

        setEmail(paramEmail);

        if (paramDate) {
            setEstimatedDate(paramDate);
            const d = new Date(paramDate);
            setDeliveryDate(d.toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' }));
        } else {
            const d = new Date();
            d.setDate(d.getDate() + 4);
            const iso = d.toISOString().slice(0, 10);
            setEstimatedDate(iso);
            setDeliveryDate(d.toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' }));
        }
    }, [searchParams]);

    // Fire Google Customer Reviews opt-in once we have the required data
    useEffect(() => {
        if (orderId === "Processing..." || !estimatedDate) return;
        // gapi may not be loaded yet — renderOptIn is called by the platform.js onload
        window.renderOptIn = function () {
            window.gapi?.load('surveyoptin', function () {
                window.gapi.surveyoptin.render({
                    merchant_id: 5760073025,
                    order_id: orderId,
                    email: email || undefined,
                    delivery_country: "NG",
                    estimated_delivery_date: estimatedDate,
                });
            });
        };
        // If gapi already loaded before this effect ran, call it now
        if (typeof window.gapi !== 'undefined') {
            window.renderOptIn();
        }
    }, [orderId, email, estimatedDate]);

    return (
        <div className="bg-gray-50 rounded-xl p-4 mb-8 text-left border border-gray-100">
            <div className="flex items-start gap-3">
                <Package className="h-5 w-5 text-brand-green-600 mt-0.5" />
                <div>
                    <p className="font-bold text-sm text-gray-900">
                        {orderId === 'Processing...' ? 'Processing Order...' : `Order #${orderId}`}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Estimated Delivery: {deliveryDate}</p>
                </div>
            </div>
        </div>
    );
}

export default function OrderConfirmationPage() {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            {/* Google Customer Reviews opt-in script */}
            <Script
                src="https://apis.google.com/js/platform.js?onload=renderOptIn"
                strategy="afterInteractive"
            />

            <Navbar />

            <main className="flex-1 flex flex-col items-center justify-center py-20 px-4 text-center">
                <div className="bg-white p-8 md:p-12 rounded-3xl shadow-lg border border-gray-100 max-w-lg w-full">
                    <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="h-10 w-10 text-emerald-600" />
                    </div>

                    <h1 className="text-3xl font-black text-gray-900 mb-2 tracking-tight">Order Placed Successfully!</h1>
                    <p className="text-gray-500 mb-8">
                        Thank you for your purchase. Your order has been placed and is being processed. You will receive an email confirmation shortly.
                    </p>

                    <Suspense fallback={
                        <div className="bg-gray-50 rounded-xl p-4 mb-8 text-left border border-gray-100 flex items-center justify-center h-[72px]">
                            <p className="text-sm font-semibold text-gray-500 animate-pulse">Confirming details...</p>
                        </div>
                    }>
                        <OrderDetails />
                    </Suspense>

                    <div className="flex flex-col gap-3">
                        <Link href="/">
                            <Button className="w-full rounded-xl bg-brand-green-600 hover:bg-brand-green-700 text-white font-bold h-12 shadow-lg shadow-brand-green-600/20">
                                Continue Shopping
                            </Button>
                        </Link>
                        <Link href="/account/orders">
                            <Button variant="ghost" className="w-full rounded-xl font-bold h-12 flex items-center gap-2">
                                View Order History <ArrowRight className="h-4 w-4" />
                            </Button>
                        </Link>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
