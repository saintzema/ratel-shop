"use client";

import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { 
    ShoppingBag, 
    MessageSquare, 
    Store, 
    ShieldCheck, 
    Zap, 
    Smartphone, 
    BarChart3, 
    Users, 
    CreditCard,
    Target,
    Bell,
    Settings,
    CheckCircle2
} from "lucide-react";
import { motion } from "framer-motion";

export default function FeaturesPage() {
    const sections = [
        {
            title: "1. Customer Shopping Experience",
            icon: ShoppingBag,
            color: "text-blue-600",
            bg: "bg-blue-50",
            features: [
                { title: "Marketplace Discovery", desc: "Browse multi-category products with real-time search, fuzzy matching, and smart filters." },
                { title: "Price Intelligence", desc: "Look for the 'Fair Price' badge. Our AI analyzes local and global markets to ensure you Buy & Sell with no wahala." },
                { title: "Dynamic Negotiations", desc: "Negotiate directly with sellers. Accept, reject, or counter-offer via the web or WhatsApp." },
                { title: "Escrow Protection", desc: "Funds are held securely and only released when you confirm delivery and satisfaction." }
            ]
        },
        {
            title: "2. WhatsApp Conversational Commerce",
            icon: MessageSquare,
            color: "text-[#25D366]",
            bg: "bg-emerald-50",
            features: [
                { title: "Headless Ordering", desc: "Order directly via WhatsApp with an itemized receipt checkout flow." },
                { title: "Intelligent AI Bot", desc: "Search for products and get instant cards with prices and direct PDP links in chat." },
                { title: "Order Sync", desc: "Receive real-time order updates and confirm delivery directly through WhatsApp." },
                { title: "Floating Action", desc: "Quick access to support and sales via the persistent site-wide WhatsApp button." }
            ]
        },
        {
            title: "3. Seller Platform Tools",
            icon: Store,
            color: "text-indigo-600",
            bg: "bg-indigo-50",
            features: [
                { title: "Verified Onboarding", desc: "Earn trust with KYC verification (NIN, License, Passport) and a 'Verified' badge." },
                { title: "Inventory Control", desc: "Manage high-quality product listings, image galleries, and detailed specs." },
                { title: "Negotiation Hub", desc: "Centralized dashboard to respond to customer price offers and close deals." },
                { title: "Payout Management", desc: "Direct bank payouts with transparent commission tracking and history." }
            ]
        },
        {
            title: "4. Admin & Marketing Control",
            icon: BarChart3,
            color: "text-purple-600",
            bg: "bg-purple-50",
            features: [
                { title: "WhatsApp Broadcast", desc: "Send bulk 'Happy New Month' or promo messages to your entire WhatsApp audience." },
                { title: "Mass Push Alerts", desc: "Dispatch instant notifications to all active web and mobile sessions." },
                { title: "Global Margin Control", desc: "Configure platform fees, vehicle deposits, and escrow charges dynamically." },
                { title: "Reach Analytics", desc: "Track unique WhatsApp reach and engagement from interaction logs." }
            ]
        }
    ];

    return (
        <div className="min-h-screen bg-white flex flex-col font-sans">
            <Navbar />
            <main className="flex-1">
                {/* Hero Section */}
                <div className="relative bg-black text-white py-24 px-6 overflow-hidden">
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-600/20 blur-[120px] -mr-40 -mt-40 rounded-full" />
                    <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-600/10 blur-[100px] -ml-20 -mb-20 rounded-full" />
                    
                    <div className="container mx-auto max-w-5xl relative z-10 text-center">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                        >
                            <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-full mb-6">
                                <Zap className="w-4 h-4 text-emerald-400 fill-emerald-400" />
                                <span className="text-xs font-black uppercase tracking-[0.2em] text-emerald-400">Platform Features</span>
                            </div>
                            <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-[0.9] mb-6">
                                The FairPrice <br/> <span className="text-emerald-400">Ecosystem.</span>
                            </h1>
                            <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto font-medium leading-relaxed">
                                A comprehensive guide to the technologies and tools that make FairPrice the most trusted marketplace in Nigeria.
                            </p>
                        </motion.div>
                    </div>
                </div>

                {/* Feature Grid */}
                <div className="container mx-auto max-w-6xl px-6 py-24">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        {sections.map((section, idx) => (
                            <motion.div 
                                key={section.title}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: idx * 0.1 }}
                                className="space-y-8"
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-14 h-14 rounded-3xl ${section.bg} flex items-center justify-center ${section.color} shadow-sm`}>
                                        <section.icon className="w-7 h-7" />
                                    </div>
                                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">{section.title}</h2>
                                </div>
                                
                                <div className="grid grid-cols-1 gap-6">
                                    {section.features.map(feature => (
                                        <div key={feature.title} className="group p-6 bg-gray-50/50 rounded-[32px] border border-transparent hover:border-gray-100 hover:bg-white hover:shadow-xl hover:shadow-gray-200/50 transition-all">
                                            <div className="flex items-start gap-4">
                                                <div className="mt-1.5 w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-black text-gray-900 mb-1 tracking-tight">{feature.title}</h3>
                                                    <p className="text-gray-500 font-medium leading-relaxed">{feature.desc}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Final CTA */}
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        className="mt-24 p-12 rounded-[48px] bg-gradient-to-br from-indigo-900 via-indigo-800 to-indigo-700 text-white text-center relative overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:40px_40px]" />
                        <div className="relative z-10">
                            <h2 className="text-3xl md:text-5xl font-black mb-6">Ready to start?</h2>
                            <p className="text-indigo-100 text-lg mb-10 max-w-xl mx-auto font-medium">
                                Join thousands of buyers and verified sellers on Nigeria&apos;s fairest marketplace.
                            </p>
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                                <a href="/shop" className="w-full sm:w-auto px-10 py-4 bg-white text-indigo-900 rounded-2xl font-black hover:scale-105 transition-transform active:scale-95">
                                    Browse Marketplace
                                </a>
                                <a href="/seller/onboarding" className="w-full sm:w-auto px-10 py-4 bg-indigo-500 text-white rounded-2xl font-black hover:bg-indigo-400 transition-all active:scale-95">
                                    Become a Seller
                                </a>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
