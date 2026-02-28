"use client";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Truck, Clock, MapPin, Package, CheckCircle } from "lucide-react";

export default function ShippingPage() {
    return (
        <div className="min-h-screen bg-white flex flex-col font-sans">
            <Navbar />
            <main className="flex-1">
                <div className="relative bg-gradient-to-br from-blue-800 to-cyan-700 text-white py-16 px-6">
                    <div className="container mx-auto max-w-4xl text-center">
                        <h1 className="text-4xl font-black tracking-tight mb-3">Shipping Information</h1>
                        <p className="text-blue-200 text-lg">Fast, reliable delivery across Nigeria</p>
                    </div>
                </div>
                <div className="container mx-auto max-w-3xl px-6 py-16 space-y-10">
                    <section>
                        <h2 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-2"><Truck className="h-5 w-5 text-blue-600" /> Delivery Options</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {[
                                { name: "Standard", time: "3-7 business days", price: "₦1,500 - ₦3,500", desc: "Nationwide coverage" },
                                { name: "Express", time: "1-3 business days", price: "₦3,500 - ₦6,000", desc: "Major cities" },
                                { name: "Same Day", time: "Within 24 hours", price: "₦5,000+", desc: "Lagos, Abuja, PH only" },
                            ].map(d => (
                                <div key={d.name} className="p-5 bg-gray-50 rounded-2xl border border-gray-100">
                                    <h3 className="font-bold text-gray-900">{d.name}</h3>
                                    <p className="text-emerald-600 font-bold text-sm mt-1">{d.time}</p>
                                    <p className="text-gray-500 text-sm">{d.price}</p>
                                    <p className="text-xs text-gray-400 mt-1">{d.desc}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                    <section>
                        <h2 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-2"><MapPin className="h-5 w-5 text-emerald-600" /> Coverage Areas</h2>
                        <p className="text-gray-600 leading-relaxed mb-4">We deliver to all 36 states and the FCT. Express delivery is available in Lagos, Abuja, Port Harcourt, Ibadan, Kano, and Enugu. Same-day delivery is currently limited to select areas within Lagos, Abuja, and Port Harcourt.</p>
                    </section>
                    <section>
                        <h2 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-2"><Package className="h-5 w-5 text-amber-500" /> Free Delivery</h2>
                        <div className="bg-emerald-50 rounded-2xl p-6 border border-emerald-200">
                            <ul className="space-y-2">
                                {["FairPrice Premium members get free delivery on orders above ₦50,000", "Promotional free shipping during special sales events", "Select sellers offer free shipping on qualifying orders"].map(item => (
                                    <li key={item} className="flex items-center gap-2 text-sm text-gray-700"><CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />{item}</li>
                                ))}
                            </ul>
                        </div>
                    </section>
                </div>
            </main>
            <Footer />
        </div>
    );
}
