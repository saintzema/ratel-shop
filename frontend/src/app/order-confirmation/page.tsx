"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CheckCircle, Package, ArrowRight } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export default function OrderConfirmationPage() {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
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

                    <div className="bg-gray-50 rounded-xl p-4 mb-8 text-left border border-gray-100">
                        <div className="flex items-start gap-3">
                            <Package className="h-5 w-5 text-ratel-green-600 mt-0.5" />
                            <div>
                                <p className="font-bold text-sm text-gray-900">Order #ORD-247813</p>
                                <p className="text-xs text-gray-500 mt-1">Estimated Delivery: Feb 14, 2026</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        <Link href="/">
                            <Button className="w-full rounded-xl bg-ratel-green-600 hover:bg-ratel-green-700 text-white font-bold h-12 shadow-lg shadow-ratel-green-600/20">
                                Continue Shopping
                            </Button>
                        </Link>
                        <Link href="/account/orders" hidden> {/* Hidden for now until account page is built */}
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
