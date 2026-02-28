"use client";

import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Share2, TrendingUp, DollarSign, Users, CheckCircle, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export default function AffiliatePage() {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        navigator.clipboard.writeText("https://fairprice.ng/affiliate/apply");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="min-h-screen bg-white flex flex-col font-sans">
            <Navbar />
            <main className="flex-1">
                <div className="relative bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-700 text-white py-20 px-6">
                    <div className="container mx-auto max-w-4xl text-center">
                        <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">Affiliate & Influencer Program</h1>
                        <p className="text-purple-100 text-lg max-w-2xl mx-auto">Earn commissions by sharing FairPrice products with your audience. Join Nigeria&apos;s fastest-growing affiliate network.</p>
                    </div>
                </div>

                <div className="container mx-auto max-w-4xl px-6 py-16 space-y-12">
                    <section>
                        <h2 className="text-2xl font-black text-gray-900 mb-6">How It Works</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {[
                                { step: "1", icon: Share2, title: "Share Products", desc: "Get your unique affiliate link and share it across your social media, blog, or website." },
                                { step: "2", icon: Users, title: "Drive Traffic", desc: "Your followers click your link and browse FairPrice's extensive product catalogue." },
                                { step: "3", icon: DollarSign, title: "Earn Commission", desc: "Earn up to 8% commission on every qualifying sale made through your link." },
                            ].map(s => (
                                <div key={s.step} className="p-6 bg-gray-50 rounded-2xl border border-gray-100 text-center">
                                    <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-700 font-black text-xl flex items-center justify-center mx-auto mb-4">{s.step}</div>
                                    <s.icon className="h-6 w-6 text-purple-600 mx-auto mb-2" />
                                    <h3 className="font-bold text-gray-900 mb-2">{s.title}</h3>
                                    <p className="text-sm text-gray-600">{s.desc}</p>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-8 text-white text-center">
                        <h2 className="text-2xl font-black mb-4">Commission Tiers</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {[
                                { tier: "Starter", rate: "3%", min: "₦0 - ₦500K/mo" },
                                { tier: "Growth", rate: "5%", min: "₦500K - ₦2M/mo" },
                                { tier: "Elite", rate: "8%", min: "₦2M+/mo" },
                            ].map(t => (
                                <div key={t.tier} className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/20">
                                    <p className="text-sm font-bold text-purple-200 uppercase">{t.tier}</p>
                                    <p className="text-4xl font-black my-2">{t.rate}</p>
                                    <p className="text-xs text-purple-200">{t.min}</p>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section>
                        <h2 className="text-2xl font-black text-gray-900 mb-4">Benefits</h2>
                        <div className="space-y-3">
                            {["Real-time tracking dashboard", "Weekly payouts via bank transfer", "Dedicated affiliate manager", "Exclusive early access to promotions", "Custom discount codes for your audience", "Free product samples for reviews"].map(b => (
                                <div key={b} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                                    <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0" />
                                    <span className="text-gray-700 font-medium">{b}</span>
                                </div>
                            ))}
                        </div>
                    </section>

                    <div className="text-center">
                        <Button className="bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-full px-10 py-3 text-lg" onClick={handleCopy}>
                            {copied ? <><Check className="h-5 w-5 mr-2" /> Link Copied!</> : <>Apply Now</>}
                        </Button>
                        <p className="text-sm text-gray-500 mt-3">Applications reviewed within 48 hours</p>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
