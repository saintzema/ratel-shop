"use client";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Truck, CreditCard, Clock, MapPin, Shield, CheckCircle } from "lucide-react";

export default function ShippingPage() {
    return (
        <div className="min-h-screen bg-white flex flex-col font-sans">
            <Navbar />
            <main className="flex-1 container mx-auto px-4 py-12 max-w-4xl">
                <h1 className="text-3xl font-black text-gray-900 mb-2">Shipping Rates & Policies</h1>
                <p className="text-gray-500 mb-8">Everything you need to know about delivery</p>

                <div className="space-y-6">
                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6">
                        <div className="flex items-center gap-3 mb-3">
                            <CheckCircle className="h-6 w-6 text-emerald-600" />
                            <h2 className="text-lg font-bold text-gray-900">Free Delivery on Online Payments</h2>
                        </div>
                        <p className="text-sm text-gray-600">When you pay online via Paystack (card or bank transfer), delivery is <strong>completely free</strong> nationwide.</p>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
                        <div className="flex items-center gap-3 mb-3">
                            <Truck className="h-6 w-6 text-amber-600" />
                            <h2 className="text-lg font-bold text-gray-900">Pay on Delivery</h2>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">Available for products under <strong>₦50,000</strong>. Delivery charges apply:</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            {[
                                { area: "Lagos Mainland", fee: "₦1,500" },
                                { area: "Lagos Island", fee: "₦2,000" },
                                { area: "Abuja (FCT)", fee: "₦2,500" },
                                { area: "Port Harcourt", fee: "₦2,500" },
                                { area: "Other Major Cities", fee: "₦3,000 – ₦4,500" },
                                { area: "Rural Areas", fee: "₦4,500 – ₦6,000" },
                            ].map((r, i) => (
                                <div key={i} className="flex justify-between bg-white px-4 py-2 rounded-xl border border-amber-100">
                                    <span className="text-gray-700">{r.area}</span>
                                    <span className="font-bold text-amber-700">{r.fee}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="border border-gray-200 rounded-2xl p-6">
                        <div className="flex items-center gap-3 mb-3">
                            <Clock className="h-6 w-6 text-blue-600" />
                            <h2 className="text-lg font-bold text-gray-900">Delivery Timelines</h2>
                        </div>
                        <div className="space-y-2 text-sm text-gray-600">
                            <p><strong>Lagos:</strong> 1–3 business days</p>
                            <p><strong>Abuja, PH, Kano:</strong> 3–5 business days</p>
                            <p><strong>Other states:</strong> 5–7 business days</p>
                            <p><strong>Global products:</strong> 7–14 business days (international sourcing)</p>
                        </div>
                    </div>

                    <div className="border border-gray-200 rounded-2xl p-6">
                        <div className="flex items-center gap-3 mb-3">
                            <Shield className="h-6 w-6 text-emerald-600" />
                            <h2 className="text-lg font-bold text-gray-900">Shipping Protection</h2>
                        </div>
                        <p className="text-sm text-gray-600">All orders are insured. If your package arrives damaged or doesn&apos;t arrive at all, we&apos;ll replace it or issue a full refund within 48 hours.</p>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
