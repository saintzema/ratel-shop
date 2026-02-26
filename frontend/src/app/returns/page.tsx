"use client";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { RotateCcw, CheckCircle, Clock, AlertTriangle, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ReturnsPage() {
    return (
        <div className="min-h-screen bg-white flex flex-col font-sans">
            <Navbar />
            <main className="flex-1 container mx-auto px-4 py-12 max-w-4xl">
                <h1 className="text-3xl font-black text-gray-900 mb-2">Returns & Replacements</h1>
                <p className="text-gray-500 mb-8">Hassle-free returns within 7 days (30 days for Premium members)</p>

                <div className="space-y-6">
                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6">
                        <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2"><CheckCircle className="h-5 w-5 text-emerald-600" /> Return Policy</h2>
                        <ul className="space-y-2 text-sm text-gray-700">
                            <li>• Items can be returned within <strong>7 days</strong> of delivery (30 days for Premium members)</li>
                            <li>• Product must be in original condition with all packaging and tags</li>
                            <li>• Electronics must include all original accessories</li>
                            <li>• Refunds are processed within <strong>3–5 business days</strong> to your bank account</li>
                        </ul>
                    </div>

                    <div className="border border-gray-200 rounded-2xl p-6">
                        <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2"><RotateCcw className="h-5 w-5 text-blue-600" /> How to Return</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            {[
                                { step: "1", title: "Start a Return", desc: "Go to Your Orders, find the item, click 'Return or Replace'" },
                                { step: "2", title: "Pack & Ship", desc: "Pack the item securely. We'll arrange free pickup from your address." },
                                { step: "3", title: "Get Refund", desc: "Once received and inspected, refund goes to your saved bank within 3-5 days." },
                            ].map((s, i) => (
                                <div key={i} className="p-4 bg-gray-50 rounded-xl text-center">
                                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-black flex items-center justify-center mx-auto mb-2">{s.step}</div>
                                    <h3 className="font-bold text-gray-900 mb-1">{s.title}</h3>
                                    <p className="text-xs text-gray-500">{s.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
                        <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-600" /> Non-Returnable Items</h2>
                        <ul className="space-y-1 text-sm text-gray-700">
                            <li>• Perishable goods (food, flowers)</li>
                            <li>• Personal care items (used cosmetics, underwear)</li>
                            <li>• Customized/personalized products</li>
                            <li>• Digital products and gift cards</li>
                            <li>• Items marked &quot;Final Sale&quot;</li>
                        </ul>
                    </div>

                    <div className="text-center pt-4">
                        <Link href="/account/orders">
                            <Button className="bg-black text-white rounded-xl font-bold px-8">
                                Go to Your Orders <ArrowRight className="h-4 w-4 ml-2" />
                            </Button>
                        </Link>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
