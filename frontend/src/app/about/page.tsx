"use client";

import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Building2, Users, Heart, Globe, ShieldCheck, Zap, TrendingUp, Award } from "lucide-react";
import Link from "next/link";

export default function AboutPage() {
    return (
        <div className="min-h-screen bg-white flex flex-col font-sans">
            <Navbar />
            <main className="flex-1">
                {/* Hero */}
                <div className="relative bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-700 text-white py-20 px-6">
                    <div className="container mx-auto max-w-4xl text-center">
                        <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">About FairPrice</h1>
                        <p className="text-emerald-100 text-lg max-w-2xl mx-auto">Nigeria&apos;s most trusted AI-powered e-commerce platform, connecting buyers with verified sellers at the fairest prices.</p>
                    </div>
                </div>

                <div className="container mx-auto max-w-4xl px-6 py-16 space-y-16">
                    {/* Mission */}
                    <section>
                        <h2 className="text-2xl font-black text-gray-900 mb-4">Our Mission</h2>
                        <p className="text-gray-600 leading-relaxed text-lg">
                            FairPrice was founded with a simple but powerful vision: to ensure every Nigerian shopper gets the best possible deal, every time they shop online. Our AI-driven pricing engine analyzes thousands of data points across local and global markets to guarantee you&apos;re never overpaying.
                        </p>
                    </section>

                    {/* Values */}
                    <section>
                        <h2 className="text-2xl font-black text-gray-900 mb-6">What We Stand For</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {[
                                { icon: ShieldCheck, title: "Trust & Transparency", desc: "Every transaction is protected by our escrow system. No hidden fees, no surprises." },
                                { icon: Zap, title: "AI-Powered Fairness", desc: "Our price intelligence engine ensures competitive pricing across every product category." },
                                { icon: Users, title: "Community First", desc: "We empower local sellers while protecting buyers with robust dispute resolution." },
                                { icon: Globe, title: "Global Access, Local Heart", desc: "Source products globally while supporting Nigerian businesses and logistics." },
                            ].map(v => (
                                <div key={v.title} className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
                                    <v.icon className="h-8 w-8 text-emerald-600 mb-3" />
                                    <h3 className="font-bold text-gray-900 mb-2">{v.title}</h3>
                                    <p className="text-sm text-gray-600 leading-relaxed">{v.desc}</p>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Stats */}
                    <section className="bg-emerald-50 rounded-2xl p-8 border border-emerald-100">
                        <h2 className="text-2xl font-black text-gray-900 mb-6 text-center">FairPrice by the Numbers</h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                            {[
                                { value: "50K+", label: "Active Buyers" },
                                { value: "2,500+", label: "Verified Sellers" },
                                { value: "₦2B+", label: "GMV Processed" },
                                { value: "99.2%", label: "Dispute Resolution" },
                            ].map(s => (
                                <div key={s.label}>
                                    <p className="text-3xl font-black text-emerald-700">{s.value}</p>
                                    <p className="text-sm text-gray-600 font-medium mt-1">{s.label}</p>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Team */}
                    <section>
                        <h2 className="text-2xl font-black text-gray-900 mb-4">Our Team</h2>
                        <p className="text-gray-600 leading-relaxed">
                            FairPrice is built by a diverse team of engineers, designers, and marketplace experts passionate about making e-commerce fairer for everyone. We&apos;re proudly backed by <a href="https://zemaai.com" target="_blank" rel="noopener" className="text-emerald-600 font-bold hover:underline">Zema AI Labs</a>, a leading Nigerian AI company.
                        </p>
                    </section>
                </div>
            </main>
            <Footer />
        </div>
    );
}
