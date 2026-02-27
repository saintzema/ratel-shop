"use client";

import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ProductCard } from "@/components/product/ProductCard";
import { DEMO_PRODUCTS } from "@/lib/data";
import { ShieldCheck, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function VerifiedSellersPage() {
    const verifiedProducts = DEMO_PRODUCTS.filter(p => p.price_flag === "fair");

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <Navbar />

            <main className="flex-1 container mx-auto px-4 py-8">
                {/* Header */}
                <div className="bg-white border rounded-2xl p-8 mb-8 text-center shadow-sm">
                    <div className="w-16 h-16 bg-green-100 text-brand-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <ShieldCheck className="h-8 w-8" />
                    </div>
                    <h1 className="text-3xl font-bold mb-2">Superadmin Verified Sellers</h1>
                    <p className="text-gray-600 max-w-2xl mx-auto">
                        Shop with confidence. These sellers have passed our rigorous KYC process and adhere to FairPrice's fair pricing policy. No scams, no price gouging.
                    </p>
                </div>

                {/* Benefits Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    {[
                        { title: "Identity Verified", desc: "Each seller's government ID and business registration is manually verified." },
                        { title: "Fair Price Guarantee", desc: "AI monitors prices 24/7. Overpriced items are automatically flagged." },
                        { title: "Escrow Protection", desc: "Your money is held safely until you confirm the item is as described." }
                    ].map((item, i) => (
                        <div key={i} className="bg-white p-6 rounded-xl border flex items-start gap-4">
                            <CheckCircle2 className="h-6 w-6 text-brand-green-600 flex-shrink-0" />
                            <div>
                                <h3 className="font-bold mb-1">{item.title}</h3>
                                <p className="text-sm text-gray-500">{item.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Products Section */}
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                    <ShieldCheck className="text-brand-green-600" /> Verified Listings
                </h2>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                    {verifiedProducts.map(product => (
                        <ProductCard key={product.id} product={product} />
                    ))}
                </div>

                {/* CTA for Sellers */}
                <div className="mt-16 bg-gradient-to-r from-brand-green-900 to-black text-white rounded-2xl p-8 md:p-12 text-center">
                    <h2 className="text-3xl font-bold mb-4">Are you a honest seller?</h2>
                    <p className="text-green-100 mb-8 max-w-xl mx-auto">
                        Join the movement. Get verified, earn the badge, and build trust with millions of Nigerian customers.
                    </p>
                    <Link href="/seller/onboarding">
                        <Button size="lg" className="bg-white text-black hover:bg-gray-100 font-bold px-8 rounded-full">
                            Become a Verified Seller
                        </Button>
                    </Link>
                </div>

            </main>

            <Footer />
        </div>
    );
}
