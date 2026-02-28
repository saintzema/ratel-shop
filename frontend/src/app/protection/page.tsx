"use client";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ShieldCheck, CheckCircle, ArrowRight, Lock, RotateCcw, MessageSquare } from "lucide-react";

export default function ProtectionPage() {
    return (
        <div className="min-h-screen bg-white flex flex-col font-sans">
            <Navbar />
            <main className="flex-1">
                <div className="relative bg-gradient-to-br from-emerald-800 to-emerald-600 text-white py-20 px-6">
                    <div className="container mx-auto max-w-4xl text-center">
                        <ShieldCheck className="h-16 w-16 mx-auto mb-4 text-emerald-200" />
                        <h1 className="text-4xl font-black tracking-tight mb-3">FairPrice Purchase Protection</h1>
                        <p className="text-emerald-100 text-lg max-w-xl mx-auto">Every purchase on FairPrice is backed by our comprehensive buyer protection program.</p>
                    </div>
                </div>
                <div className="container mx-auto max-w-3xl px-6 py-16 space-y-12">
                    <section>
                        <h2 className="text-2xl font-black text-gray-900 mb-6 text-center">What&apos;s Covered</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {[
                                { icon: Lock, title: "Escrow Protection", desc: "Your money is held securely until you confirm the item is exactly as described." },
                                { icon: RotateCcw, title: "Easy Returns", desc: "Hassle-free returns within 7 days if the item doesn't match the listing." },
                                { icon: MessageSquare, title: "Dispute Resolution", desc: "Our dedicated team mediates any issues between buyers and sellers within 24 hours." },
                            ].map(c => (
                                <div key={c.title} className="p-6 bg-emerald-50 rounded-2xl border border-emerald-100 text-center">
                                    <c.icon className="h-8 w-8 text-emerald-600 mx-auto mb-3" />
                                    <h3 className="font-bold text-gray-900 mb-2">{c.title}</h3>
                                    <p className="text-sm text-gray-600">{c.desc}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                    <section className="bg-gray-50 rounded-2xl p-8 border border-gray-200">
                        <h2 className="text-xl font-black text-gray-900 mb-4">How It Works</h2>
                        <div className="space-y-4">
                            {[
                                "You place an order and pay securely through Paystack",
                                "Your funds are held in FairPrice escrow — the seller can't access them yet",
                                "The seller ships your order with full tracking",
                                "You receive the item and have 7 days to inspect it",
                                "Click 'Confirm Delivery' when satisfied — funds are released to the seller",
                                "If there's an issue, click 'Initiate Return' and our team steps in",
                            ].map((s, i) => (
                                <div key={i} className="flex items-center gap-4">
                                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 font-black text-sm flex items-center justify-center shrink-0">{i + 1}</div>
                                    <p className="text-sm text-gray-700">{s}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            </main>
            <Footer />
        </div>
    );
}
