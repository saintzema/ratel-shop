"use client";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Shield, Lock, Eye, UserCheck, AlertTriangle, CheckCircle } from "lucide-react";

export default function SafetyPage() {
    return (
        <div className="min-h-screen bg-white flex flex-col font-sans">
            <Navbar />
            <main className="flex-1">
                <div className="relative bg-gradient-to-br from-blue-900 to-indigo-800 text-white py-16 px-6">
                    <div className="container mx-auto max-w-4xl text-center">
                        <h1 className="text-4xl font-black tracking-tight mb-3">Safety Center</h1>
                        <p className="text-blue-200 text-lg">Your safety is our top priority</p>
                    </div>
                </div>
                <div className="container mx-auto max-w-3xl px-6 py-16 space-y-10">
                    <section>
                        <h2 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-2"><Shield className="h-5 w-5 text-blue-600" /> How We Protect You</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[
                                { icon: Lock, title: "Escrow Protection", desc: "Your payment is held securely until you confirm delivery and satisfaction." },
                                { icon: UserCheck, title: "Verified Sellers", desc: "All sellers undergo KYC verification with government-issued ID and business registration." },
                                { icon: Eye, title: "AI Monitoring", desc: "Our AI systems monitor listings 24/7 for fraud, counterfeits, and suspicious activity." },
                                { icon: Shield, title: "PCI DSS Compliance", desc: "All payment data is encrypted and processed through PCI DSS certified systems (Paystack)." },
                            ].map(f => (
                                <div key={f.title} className="p-5 bg-gray-50 rounded-2xl border border-gray-100">
                                    <f.icon className="h-6 w-6 text-blue-600 mb-2" />
                                    <h3 className="font-bold text-gray-900 mb-1 text-sm">{f.title}</h3>
                                    <p className="text-xs text-gray-600 leading-relaxed">{f.desc}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                    <section>
                        <h2 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-500" /> Stay Safe: Tips</h2>
                        <ul className="space-y-2">
                            {["Never share your password or OTP with anyone", "Always transact within FairPrice — never send money directly to sellers", "Do not share bank account numbers, card details, or personal info in messages", "Report any suspicious messages or listings immediately", "Verify seller ratings and reviews before purchasing high-value items", "Always confirm delivery only after physically inspecting the item"].map(tip => (
                                <li key={tip} className="flex items-start gap-2 text-sm text-gray-700 p-2"><CheckCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />{tip}</li>
                            ))}
                        </ul>
                    </section>
                </div>
            </main>
            <Footer />
        </div>
    );
}
