"use client";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Newspaper, Mail } from "lucide-react";

export default function PressPage() {
    const releases = [
        { date: "Feb 2026", title: "FairPrice Launches AI-Powered Price Intelligence Engine", desc: "FairPrice.ng introduces real-time pricing analysis that compares local and global markets to ensure Nigerian shoppers get the best deals." },
        { date: "Jan 2026", title: "FairPrice Reaches 50,000 Active Users Milestone", desc: "The platform celebrates rapid growth with over 50,000 monthly active users and 2,500 verified sellers across Nigeria." },
        { date: "Dec 2025", title: "FairPrice Partners with Major Nigerian Logistics Providers", desc: "Strategic partnerships bring same-day delivery to Lagos, Abuja, and Port Harcourt, with nationwide coverage expanding." },
        { date: "Nov 2025", title: "Zema AI Labs Announces FairPrice.ng", desc: "Zema AI Labs officially launches FairPrice.ng, Nigeria's first AI-driven e-commerce marketplace with built-in escrow protection." },
    ];

    return (
        <div className="min-h-screen bg-white flex flex-col font-sans">
            <Navbar />
            <main className="flex-1">
                <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 text-white py-20 px-6">
                    <div className="container mx-auto max-w-4xl text-center">
                        <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">Press & Media</h1>
                        <p className="text-gray-400 text-lg">Latest news and press releases from FairPrice.ng</p>
                    </div>
                </div>
                <div className="container mx-auto max-w-4xl px-6 py-16 space-y-6">
                    {releases.map(r => (
                        <div key={r.title} className="p-6 bg-white border border-gray-200 rounded-2xl hover:shadow-md transition-shadow">
                            <p className="text-xs font-bold text-emerald-600 uppercase mb-2">{r.date}</p>
                            <h3 className="text-lg font-bold text-gray-900 mb-2">{r.title}</h3>
                            <p className="text-sm text-gray-600 leading-relaxed">{r.desc}</p>
                        </div>
                    ))}
                    <div className="mt-8 bg-gray-50 rounded-2xl p-6 border border-gray-200 text-center">
                        <Mail className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="font-bold text-gray-900 mb-1">Media Inquiries</p>
                        <p className="text-sm text-gray-600">Contact us at <a href="mailto:press@fairprice.ng" className="text-emerald-600 font-bold hover:underline">press@fairprice.ng</a></p>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
