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
                            <p className="text-gray-700 leading-relaxed">
                                You may initiate a return within <strong>14 days</strong> of confirmed delivery. 
                                <span className="block mt-2 text-amber-800 font-bold">Holiday Exception:</span> Orders placed between Dec 22, 2026, and Jan 3, 2027, qualify for an extended 16-day return window.
                            </p>
                        </div>
                    </section>
                    <section>
                        <h2 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-2"><RotateCcw className="h-5 w-5 text-emerald-600" /> How to Return</h2>
                        <ol className="space-y-3">
                            {[
                                "Go to Your Orders → Select the order → Click 'Initiate Return'", 
                                "Choose a reason: 'Defective/Damaged' or 'Change of Mind'", 
                                "Ensure item is NEW: Unopened, tags attached, no signs of wear",
                                "Our team reviews and approves within 24-48 hours", 
                                "Ship the item back. International return shipping is customer-paid unless defective", 
                                "Refund is processed within 7 business days after receipt"
                            ].map((s, i) => (
                                <li key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl"><span className="bg-emerald-100 text-emerald-700 font-bold text-xs w-6 h-6 rounded-full flex items-center justify-center shrink-0">{i + 1}</span><span className="text-gray-700 text-sm">{s}</span></li>
                            ))}
                        </ol>
                    </section>
                    <section>
                        <h2 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-red-500" /> Condition: New Only</h2>
                        <p className="text-sm text-gray-600 mb-4">To pass inspection, items must meet these "New" constraints:</p>
                        <ul className="space-y-2">
                            {["Unopened in original packaging", "Tags attached and unused", "No signs of wear or installation", "All accessories included"].map(item => (
                                <li key={item} className="flex items-center gap-2 text-sm text-gray-600"><CheckCircle className="h-4 w-4 text-emerald-500" />{item}</li>
                            ))}
                        </ul>
                    </section>
                    <section>
                        <h2 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-2"><Package className="h-5 w-5 text-blue-600" /> Fees & Refunds</h2>
                        <div className="bg-blue-50 rounded-2xl p-6 border border-blue-200 text-sm text-gray-700 leading-relaxed space-y-3">
                            <p><strong>Restocking Fee:</strong> $0 (No cost to you).</p>
                            <p><strong>Refund Processing:</strong> Once received, we process refunds within 7 business days to your original payment method.</p>
                        </div>
                    </section>
                </div>
            </main>
            <Footer />
        </div>
    );
}
