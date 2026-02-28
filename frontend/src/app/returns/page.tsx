"use client";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { RotateCcw, Clock, CheckCircle, AlertTriangle, Package } from "lucide-react";

export default function ReturnsPage() {
    return (
        <div className="min-h-screen bg-white flex flex-col font-sans">
            <Navbar />
            <main className="flex-1">
                <div className="relative bg-gradient-to-br from-amber-700 to-orange-600 text-white py-20 px-6">
                    <div className="container mx-auto max-w-4xl text-center">
                        <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">Return & Refund Policy</h1>
                        <p className="text-amber-100 text-lg">Your satisfaction is our priority. Here&apos;s everything you need to know about returns.</p>
                    </div>
                </div>
                <div className="container mx-auto max-w-3xl px-6 py-16 space-y-10">
                    <section>
                        <h2 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-2"><Clock className="h-5 w-5 text-amber-600" /> Return Window</h2>
                        <div className="bg-amber-50 rounded-2xl p-6 border border-amber-200">
                            <p className="text-gray-700 leading-relaxed">You may initiate a return within <strong>7 days</strong> of confirmed delivery. The item must be unused, in its original packaging, and with all tags/accessories intact. Electronics have a <strong>24-hour</strong> return window for DOA (Dead on Arrival) claims.</p>
                        </div>
                    </section>
                    <section>
                        <h2 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-2"><RotateCcw className="h-5 w-5 text-emerald-600" /> How to Return</h2>
                        <ol className="space-y-3">
                            {["Go to Your Orders → Select the order → Click 'Initiate Return'", "Choose a return reason and provide photos if applicable", "Our team reviews and approves within 24 hours", "Ship the item back using the pre-paid return label provided", "Refund is processed within 3-5 business days after we receive the item"].map((s, i) => (
                                <li key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl"><span className="bg-emerald-100 text-emerald-700 font-bold text-xs w-6 h-6 rounded-full flex items-center justify-center shrink-0">{i + 1}</span><span className="text-gray-700 text-sm">{s}</span></li>
                            ))}
                        </ol>
                    </section>
                    <section>
                        <h2 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-red-500" /> Non-Returnable Items</h2>
                        <ul className="space-y-2">
                            {["Perishable goods (food, flowers)", "Personal care items (opened)", "Customized or personalized products", "Digital products and gift cards", "Items marked 'Final Sale'"].map(item => (
                                <li key={item} className="flex items-center gap-2 text-sm text-gray-600"><span className="text-red-400">✕</span>{item}</li>
                            ))}
                        </ul>
                    </section>
                    <section>
                        <h2 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-2"><Package className="h-5 w-5 text-blue-600" /> Refund Methods</h2>
                        <div className="bg-blue-50 rounded-2xl p-6 border border-blue-200 text-sm text-gray-700 leading-relaxed">
                            Refunds are issued to your <strong>original payment method</strong> or as a <strong>FairPrice coupon</strong> (your choice). If you paid via bank transfer, refunds go to the bank account registered in your Payments settings. Coupon refunds are instant; bank refunds take 3-5 business days.
                        </div>
                    </section>
                </div>
            </main>
            <Footer />
        </div>
    );
}
