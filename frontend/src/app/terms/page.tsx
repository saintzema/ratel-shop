"use client";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Copyleft, ShieldCheck, Scale, FileText, CreditCard, Box } from "lucide-react";

export default function TermsOfServicePage() {
    return (
        <div className="min-h-screen bg-white flex flex-col font-sans">
            <Navbar />
            <main className="flex-1">
                {/* Header */}
                <div className="relative bg-gradient-to-br from-gray-900 to-black text-white py-16 px-6">
                    <div className="container mx-auto max-w-4xl text-center">
                        <h1 className="text-4xl font-black tracking-tight mb-3">Terms of Service</h1>
                        <p className="text-gray-300 text-lg">Last updated: {new Date().toLocaleDateString()}</p>
                    </div>
                </div>

                {/* Content */}
                <div className="container mx-auto max-w-3xl px-6 py-16 space-y-12">
                    {/* Intro */}
                    <div className="prose prose-gray max-w-none text-gray-700 leading-relaxed text-sm md:text-base">
                        <p>
                            Welcome to FairPrice. By accessing or using our websites, mobile applications, or any other FairPrice service
                            (collectively, the "Services"), you agree to be bound by these Terms of Service ("Terms"). Please read them carefully.
                        </p>
                    </div>

                    <div className="space-y-8">
                        {/* Section 1 */}
                        <section className="bg-gray-50 p-6 md:p-8 rounded-3xl border border-gray-100">
                            <h2 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-3">
                                <div className="p-2 bg-brand-green-50 rounded-xl">
                                    <Scale className="h-5 w-5 text-brand-green-600" />
                                </div>
                                1. General Conditions
                            </h2>
                            <div className="space-y-3 text-sm text-gray-600 leading-relaxed pl-2">
                                <p>You must be at least 18 years old to use our Services. Minors may only use the Services under the supervision of a parent or legal guardian.</p>
                                <p>We reserve the right to refuse service to anyone for any reason at any time.</p>
                                <p>You agree not to reproduce, duplicate, copy, sell, resell or exploit any portion of the Service without express written permission by us.</p>
                            </div>
                        </section>

                        {/* Section 2 */}
                        <section className="bg-gray-50 p-6 md:p-8 rounded-3xl border border-gray-100">
                            <h2 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-3">
                                <div className="p-2 bg-blue-50 rounded-xl">
                                    <ShieldCheck className="h-5 w-5 text-blue-600" />
                                </div>
                                2. Buyer Protection & Escrow
                            </h2>
                            <div className="space-y-3 text-sm text-gray-600 leading-relaxed pl-2">
                                <p>FairPrice operates a strict Escrow system. Funds are held securely and are only released to the Seller upon the Buyer's confirmation of satisfactory delivery.</p>
                                <p>Buyers must report any issues (damaged goods, incorrect items) within 48 hours of marked delivery to trigger an official dispute.</p>
                                <p>Failure to confirm delivery or open a dispute within the designated timeframe may result in automatic release of funds to the seller.</p>
                            </div>
                        </section>

                        {/* Section 3 */}
                        <section className="bg-gray-50 p-6 md:p-8 rounded-3xl border border-gray-100">
                            <h2 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-3">
                                <div className="p-2 bg-orange-50 rounded-xl">
                                    <Box className="h-5 w-5 text-orange-600" />
                                </div>
                                3. Seller Obligations
                            </h2>
                            <div className="space-y-3 text-sm text-gray-600 leading-relaxed pl-2">
                                <p>Sellers must provide accurate descriptions, high-quality images, and clearly state the condition of all items listed on FairPrice.</p>
                                <p>Sellers are strictly prohibited from selling counterfeit, illegal, or restricted items. Violation of this rule will result in immediate permanent account termination and forfeiture of any pending payouts.</p>
                                <p>Sellers must fulfill orders within the agreed timeframe. Repeated cancellations or delayed fulfillments will negatively impact the Seller's Trust Score.</p>
                            </div>
                        </section>

                        {/* Section 4 */}
                        <section className="bg-gray-50 p-6 md:p-8 rounded-3xl border border-gray-100">
                            <h2 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-3">
                                <div className="p-2 bg-purple-50 rounded-xl">
                                    <CreditCard className="h-5 w-5 text-purple-600" />
                                </div>
                                4. Fees and Payments
                            </h2>
                            <div className="space-y-3 text-sm text-gray-600 leading-relaxed pl-2">
                                <p>Joining FairPrice as a Buyer or standard Seller is free. We charge a commission fee upon the successful sale of an item, which is automatically deducted from the seller's payout.</p>
                                <p>All payments are processed securely via our payment partners (e.g., Paystack). We do not store your full raw credit card details on our servers.</p>
                            </div>
                        </section>

                        {/* Section 5 */}
                        <section className="bg-gray-50 p-6 md:p-8 rounded-3xl border border-gray-100">
                            <h2 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-3">
                                <div className="p-2 bg-rose-50 rounded-xl">
                                    <FileText className="h-5 w-5 text-rose-600" />
                                </div>
                                5. Changes to Terms
                            </h2>
                            <div className="space-y-3 text-sm text-gray-600 leading-relaxed pl-2">
                                <p>We reserve the right, at our sole discretion, to update, change or replace any part of these Terms of Service by posting updates and changes to our website. It is your responsibility to check our website periodically for changes.</p>
                                <p>Your continued use of or access to our website or the Service following the posting of any changes to these Terms of Service constitutes acceptance of those changes.</p>
                            </div>
                        </section>

                    </div>

                    <div className="text-center pt-8 border-t border-gray-200">
                        <p className="text-sm text-gray-500">
                            Questions about the Terms of Service? Contact us at <a href="mailto:hello@fairprice.ng" className="text-brand-green-600 font-medium hover:underline">hello@fairprice.ng</a>
                        </p>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
