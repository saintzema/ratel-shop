"use client";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Shield, Zap, Users, Globe, Heart } from "lucide-react";

export default function AboutPage() {
    return (
        <div className="min-h-screen bg-white flex flex-col font-sans">
            <Navbar />
            <main className="flex-1 container mx-auto px-4 py-12 max-w-4xl">
                <h1 className="text-4xl font-black text-gray-900 mb-2">About FairPrice</h1>
                <p className="text-lg text-gray-500 mb-10">Nigeria&apos;s First AI-Regulated Marketplace</p>

                <div className="prose prose-lg max-w-none text-gray-700 mb-12">
                    <p>
                        FairPrice was built on a simple idea: <strong>every Nigerian deserves access to fair, transparent pricing.</strong> We use artificial intelligence to monitor, verify, and regulate pricing across our marketplace — ensuring that no customer gets overcharged and no legitimate seller gets undercut.
                    </p>
                    <p>
                        Our AI engine, <strong>Ziva</strong>, analyzes thousands of pricing data points across local and global markets to determine whether a product price is fair, overpriced, or unusually low. This creates a level playing field where quality wins over deception.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    {[
                        { icon: Shield, title: "AI Price Protection", desc: "Every product is analyzed by our AI to ensure fair pricing and flag unusually low listings." },
                        { icon: Globe, title: "Global + Local", desc: "We source products locally and globally, always finding the best price for Nigerian consumers." },
                        { icon: Users, title: "Community Trust", desc: "Verified sellers, honest reviews, and AI-monitored transactions build a marketplace you can trust." },
                    ].map((item, i) => (
                        <div key={i} className="p-6 rounded-2xl border border-gray-200 hover:border-emerald-300 transition-colors">
                            <div className="p-2 bg-emerald-50 rounded-xl w-fit mb-3"><item.icon className="h-6 w-6 text-emerald-600" /></div>
                            <h3 className="font-bold text-gray-900 mb-1">{item.title}</h3>
                            <p className="text-sm text-gray-500">{item.desc}</p>
                        </div>
                    ))}
                </div>

                <div className="bg-gradient-to-br from-emerald-900 to-emerald-700 text-white rounded-2xl p-8 text-center">
                    <Heart className="h-8 w-8 mx-auto mb-3 text-emerald-300" />
                    <h2 className="text-2xl font-black mb-2">Built by Zema AI Labs</h2>
                    <p className="text-emerald-200 max-w-md mx-auto">We&apos;re a Lagos-based AI company building technology that makes commerce fairer for everyone.</p>
                    <a href="https://zemaai.com" target="_blank" rel="noopener noreferrer" className="mt-4 inline-block text-emerald-300 hover:text-white underline font-bold">
                        Visit zemaai.com →
                    </a>
                </div>
            </main>
            <Footer />
        </div>
    );
}
