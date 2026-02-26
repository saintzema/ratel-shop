"use client";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { HelpCircle, MessageSquare, Phone, Mail, Package, CreditCard, Truck, Shield, ChevronRight } from "lucide-react";
import Link from "next/link";

export default function HelpPage() {
    const topics = [
        { icon: Package, title: "Orders & Tracking", desc: "Track, cancel, or manage your orders", href: "/account/orders" },
        { icon: Truck, title: "Shipping & Delivery", desc: "Delivery times, rates, and policies", href: "/shipping" },
        { icon: CreditCard, title: "Payments & Refunds", desc: "Payment methods, refunds, and billing", href: "/account/payments" },
        { icon: Shield, title: "Returns & Replacements", desc: "Return policies and how to start a return", href: "/returns" },
        { icon: MessageSquare, title: "Contact Seller", desc: "Reach out to a seller about your order", href: "/account/messages" },
        { icon: HelpCircle, title: "Account Settings", desc: "Update profile, password, and preferences", href: "/account/profile" },
    ];

    return (
        <div className="min-h-screen bg-white flex flex-col font-sans">
            <Navbar />
            <main className="flex-1 container mx-auto px-4 py-12 max-w-4xl">
                <div className="text-center mb-10">
                    <h1 className="text-3xl font-black text-gray-900 mb-2">Help Center</h1>
                    <p className="text-gray-500">How can we help you today?</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
                    {topics.map((topic, i) => (
                        <Link key={i} href={topic.href} className="flex items-center gap-4 p-4 rounded-2xl border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/30 transition-all group">
                            <div className="p-2 bg-gray-100 rounded-xl group-hover:bg-emerald-100 transition-colors">
                                <topic.icon className="h-5 w-5 text-gray-500 group-hover:text-emerald-600" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-gray-900 text-sm">{topic.title}</h3>
                                <p className="text-xs text-gray-500">{topic.desc}</p>
                            </div>
                            <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-emerald-500" />
                        </Link>
                    ))}
                </div>

                <div className="bg-gradient-to-br from-emerald-900 to-emerald-700 text-white rounded-2xl p-8">
                    <h2 className="text-xl font-bold mb-4">Still need help?</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white/10 backdrop-blur rounded-xl p-4 text-center">
                            <MessageSquare className="h-6 w-6 mx-auto mb-2 text-emerald-300" />
                            <h3 className="font-bold text-sm mb-1">Chat with Ziva</h3>
                            <p className="text-xs text-emerald-200">Our AI assistant is available 24/7</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur rounded-xl p-4 text-center">
                            <Mail className="h-6 w-6 mx-auto mb-2 text-emerald-300" />
                            <h3 className="font-bold text-sm mb-1">Email Support</h3>
                            <p className="text-xs text-emerald-200">support@fairprice.ng</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur rounded-xl p-4 text-center">
                            <Phone className="h-6 w-6 mx-auto mb-2 text-emerald-300" />
                            <h3 className="font-bold text-sm mb-1">Call Us</h3>
                            <p className="text-xs text-emerald-200">+234 800 FAIR (Mon-Sat)</p>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
