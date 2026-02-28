"use client";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Handshake, CheckCircle, TrendingUp, Users, ShieldCheck, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export default function PartnerPage() {
    const [submitted, setSubmitted] = useState(false);
    return (
        <div className="min-h-screen bg-white flex flex-col font-sans">
            <Navbar />
            <main className="flex-1">
                <div className="relative bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-700 text-white py-20 px-6">
                    <div className="container mx-auto max-w-4xl text-center">
                        <Handshake className="h-14 w-14 text-emerald-200 mx-auto mb-4" />
                        <h1 className="text-4xl font-black tracking-tight mb-3">Partner with FairPrice</h1>
                        <p className="text-emerald-100 text-lg max-w-2xl mx-auto">Whether you&apos;re a seller, logistics provider, or brand, there&apos;s a partnership opportunity for you.</p>
                    </div>
                </div>
                <div className="container mx-auto max-w-4xl px-6 py-16 space-y-12">
                    <section>
                        <h2 className="text-2xl font-black text-gray-900 mb-6">Partnership Opportunities</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {[
                                { icon: TrendingUp, title: "Sell on FairPrice", desc: "Join 2,500+ verified sellers. List your products, reach millions of Nigerian shoppers, and grow your business." },
                                { icon: Zap, title: "Logistics Partners", desc: "Partner with us to deliver orders nationwide. We're always looking for reliable logistics companies." },
                                { icon: Users, title: "Brand Partnerships", desc: "Sponsor categories, run co-branded campaigns, or become a featured brand on FairPrice." },
                            ].map(p => (
                                <div key={p.title} className="p-6 bg-gray-50 rounded-2xl border border-gray-100 text-center">
                                    <p.icon className="h-8 w-8 text-emerald-600 mx-auto mb-3" />
                                    <h3 className="font-bold text-gray-900 mb-2">{p.title}</h3>
                                    <p className="text-sm text-gray-600">{p.desc}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                    <section>
                        <h2 className="text-2xl font-black text-gray-900 mb-4">Why Partner With Us</h2>
                        <div className="space-y-3">
                            {["Access to 50,000+ active monthly buyers", "AI-powered pricing ensures fair competition", "Escrow-based payments for trust and security", "Dedicated partner support and analytics dashboard", "Marketing co-promotion and featured placement", "Low commission fees starting at 5%"].map(b => (
                                <div key={b} className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl">
                                    <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0" />
                                    <span className="text-gray-700 font-medium text-sm">{b}</span>
                                </div>
                            ))}
                        </div>
                    </section>
                    <section>
                        <h2 className="text-2xl font-black text-gray-900 mb-4">Get Started</h2>
                        {submitted ? (
                            <div className="p-8 bg-emerald-50 rounded-2xl border border-emerald-200 text-center">
                                <Handshake className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
                                <h3 className="font-bold text-emerald-800 mb-1">Application Submitted!</h3>
                                <p className="text-sm text-emerald-600">Our partnerships team will contact you within 48 hours.</p>
                            </div>
                        ) : (
                            <form onSubmit={(e) => { e.preventDefault(); setSubmitted(true); }} className="space-y-4 max-w-lg">
                                <Input placeholder="Business Name" required className="rounded-xl" />
                                <Input placeholder="Contact Email" type="email" required className="rounded-xl" />
                                <Input placeholder="Phone Number" type="tel" required className="rounded-xl" />
                                <select className="w-full h-10 rounded-xl border border-gray-300 px-3 text-sm bg-white" required>
                                    <option value="">Partnership Type</option>
                                    <option>Sell on FairPrice</option>
                                    <option>Logistics Partner</option>
                                    <option>Brand Partnership</option>
                                    <option>Other</option>
                                </select>
                                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl px-8 py-3">Submit Application</Button>
                            </form>
                        )}
                    </section>
                </div>
            </main>
            <Footer />
        </div>
    );
}
