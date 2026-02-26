"use client";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Brain, BarChart3, Shield, Eye, Zap, Database } from "lucide-react";

export default function SciencePage() {
    const techs = [
        { icon: Brain, title: "Gemini AI Price Engine", desc: "We use Google's Gemini 2.0 to analyze thousands of pricing data points across local and global markets in real-time. Every product listing is scored for price fairness before it goes live." },
        { icon: BarChart3, title: "Market Comparison Algorithm", desc: "Our algorithm cross-references prices from multiple sources — local retailers, global platforms, wholesale markets, and historical trends — to determine the true market value of every product." },
        { icon: Shield, title: "Fraud Detection", desc: "AI monitors listing patterns, seller behavior, and pricing anomalies to flag unusually low listings. Products priced too low (potential scam) or too high (price gouging) are flagged in real-time." },
        { icon: Eye, title: "Smart Autocomplete & Search", desc: "Our search engine understands context and intent. Type 'bone straight human hair' and get exactly that — not bone meal fertilizer. Progressive refinement delivers accurate results as you type." },
        { icon: Zap, title: "Instant Price Intelligence", desc: "The Price Intelligence Modal gives you a full breakdown of any product's pricing: market comparison, cost analysis, price history, and AI verdict — all in under 2 seconds." },
        { icon: Database, title: "Seller Transparency Score", desc: "Every seller has a computed trust score based on order fulfillment, customer reviews, pricing compliance, and return rates. Low scores trigger review and possible delisting." },
    ];

    return (
        <div className="min-h-screen bg-white flex flex-col font-sans">
            <Navbar />
            <main className="flex-1 container mx-auto px-4 py-12 max-w-4xl">
                <div className="text-center mb-10">
                    <h1 className="text-4xl font-black text-gray-900 mb-3">FairPrice Science</h1>
                    <p className="text-lg text-gray-500 max-w-lg mx-auto">The AI technology behind Nigeria&apos;s first regulated marketplace</p>
                </div>

                <div className="space-y-6">
                    {techs.map((tech, i) => (
                        <div key={i} className="p-6 rounded-2xl border border-gray-200 hover:border-emerald-300 transition-colors flex gap-4">
                            <div className="p-3 bg-emerald-50 rounded-xl h-fit shrink-0">
                                <tech.icon className="h-6 w-6 text-emerald-600" />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 text-lg mb-1">{tech.title}</h3>
                                <p className="text-sm text-gray-600 leading-relaxed">{tech.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </main>
            <Footer />
        </div>
    );
}
