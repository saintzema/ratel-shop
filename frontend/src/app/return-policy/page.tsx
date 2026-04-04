import { Metadata } from 'next';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { ShieldCheck, RotateCcw, Clock, Truck, AlertTriangle, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
    title: 'Return Policy | FairPrice.ng',
    description: 'FairPrice.ng return and exchange policy for Nigeria. We accept returns for defective products within 7 days. Read our full policy here.',
    openGraph: {
        title: 'Return Policy | FairPrice.ng',
        description: 'FairPrice.ng return and exchange policy. Defective product returns accepted within 7 days of delivery.',
    }
};

export default function ReturnPolicyPage() {
    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
            <Navbar />

            <main className="flex-1 pt-28 pb-20">
                {/* Hero */}
                <div className="bg-white border-b border-gray-100 pb-12">
                    <div className="container mx-auto px-4 max-w-4xl">
                        <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-widest mb-4">
                            <ShieldCheck className="h-4 w-4" />
                            <span>FairPrice Guarantee</span>
                        </div>
                        <h1 className="text-3xl md:text-5xl font-black text-gray-900 leading-tight tracking-tight mb-4">
                            Return &amp; Exchange Policy
                        </h1>
                        <p className="text-lg text-gray-500 max-w-2xl font-medium">
                            Your satisfaction matters. We accept returns for defective products and offer exchanges to ensure you always get what you paid for.
                        </p>
                    </div>
                </div>

                <div className="container mx-auto px-4 max-w-4xl mt-10 space-y-8">

                    {/* Quick Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                            <div className="bg-emerald-100 w-10 h-10 rounded-xl flex items-center justify-center mb-3">
                                <RotateCcw className="h-5 w-5 text-emerald-600" />
                            </div>
                            <h3 className="font-black text-gray-900 text-sm mb-1">Returns Accepted</h3>
                            <p className="text-xs text-gray-500 font-medium">
                                We accept returns for defective products delivered in damaged or non-functional condition.
                            </p>
                        </div>
                        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                            <div className="bg-blue-100 w-10 h-10 rounded-xl flex items-center justify-center mb-3">
                                <Clock className="h-5 w-5 text-blue-600" />
                            </div>
                            <h3 className="font-black text-gray-900 text-sm mb-1">7-Day Window</h3>
                            <p className="text-xs text-gray-500 font-medium">
                                Return requests must be initiated within 7 days of delivery confirmation.
                            </p>
                        </div>
                        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                            <div className="bg-amber-100 w-10 h-10 rounded-xl flex items-center justify-center mb-3">
                                <Truck className="h-5 w-5 text-amber-600" />
                            </div>
                            <h3 className="font-black text-gray-900 text-sm mb-1">Exchanges Available</h3>
                            <p className="text-xs text-gray-500 font-medium">
                                We offer product exchanges for eligible items when available stock permits.
                            </p>
                        </div>
                    </div>

                    {/* Eligible for Return */}
                    <div className="bg-white rounded-[24px] p-8 border border-gray-100 shadow-sm">
                        <h2 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                            What Qualifies for a Return
                        </h2>
                        <div className="space-y-4">
                            {[
                                { title: "Defective or damaged products", desc: "Items that arrive broken, malfunctioning, or with factory defects." },
                                { title: "Wrong item delivered", desc: "You received a product that does not match your order confirmation." },
                                { title: "Missing parts or accessories", desc: "The product arrived incomplete, with missing accessories that were listed in the description." },
                                { title: "Significantly different from listing", desc: "The delivered product is materially different from the images and description on our platform." },
                            ].map((item, i) => (
                                <div key={i} className="flex gap-3 p-4 bg-emerald-50/50 rounded-xl border border-emerald-100/50">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                                    <div>
                                        <p className="font-bold text-gray-900 text-sm">{item.title}</p>
                                        <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Not Eligible */}
                    <div className="bg-white rounded-[24px] p-8 border border-gray-100 shadow-sm">
                        <h2 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
                            <XCircle className="h-5 w-5 text-red-500" />
                            What Does NOT Qualify for a Return
                        </h2>
                        <div className="space-y-4">
                            {[
                                { title: "Change of mind", desc: "We cannot accept returns simply because you changed your mind about the purchase." },
                                { title: "Used or altered products", desc: "Products that have been used, washed, modified, or damaged by the buyer after delivery." },
                                { title: "Digital products & services", desc: "Software licenses, digital vouchers, and subscription services cannot be returned." },
                                { title: "Perishable goods", desc: "Food items, fresh groceries, and other perishable products are not eligible for return." },
                                { title: "Products past the 7-day return window", desc: "Return requests must be made within 7 calendar days of delivery." },
                            ].map((item, i) => (
                                <div key={i} className="flex gap-3 p-4 bg-red-50/50 rounded-xl border border-red-100/50">
                                    <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                                    <div>
                                        <p className="font-bold text-gray-900 text-sm">{item.title}</p>
                                        <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* How to Return */}
                    <div className="bg-white rounded-[24px] p-8 border border-gray-100 shadow-sm">
                        <h2 className="text-xl font-black text-gray-900 mb-6">How to Initiate a Return</h2>
                        <div className="space-y-6">
                            {[
                                { step: "1", title: "Contact Us", desc: "Send a message through your Order page or email support@fairprice.ng with your Order ID, photos of the defect, and a description of the issue." },
                                { step: "2", title: "Verification", desc: "Our team will review your request within 24-48 hours and confirm eligibility." },
                                { step: "3", title: "Return Shipping", desc: "If approved, we will arrange for the item to be picked up or provide a return shipping label at no cost to you." },
                                { step: "4", title: "Refund or Exchange", desc: "Once the returned item is received and inspected, we will issue a full refund to your original payment method or ship a replacement product." },
                            ].map((item, i) => (
                                <div key={i} className="flex gap-4">
                                    <div className="w-8 h-8 bg-gray-900 text-white rounded-full flex items-center justify-center font-black text-xs shrink-0">
                                        {item.step}
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900 text-sm">{item.title}</p>
                                        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Exchange Policy */}
                    <div className="bg-emerald-900 rounded-[24px] p-8 text-white">
                        <h2 className="text-xl font-black mb-4 flex items-center gap-2">
                            <RotateCcw className="h-5 w-5" />
                            Exchange Policy
                        </h2>
                        <p className="text-emerald-100 leading-relaxed mb-6 text-sm">
                            We accept exchanges for eligible items. If you received a defective or incorrect product and prefer a replacement instead of a refund, we will ship the correct item once the original product is returned and verified.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-emerald-800/50 p-4 rounded-2xl border border-emerald-700/50">
                                <h4 className="font-bold text-sm mb-1 text-emerald-300">Same Item Exchange</h4>
                                <p className="text-xs text-emerald-100">If the same product is in stock, we will ship a replacement at no extra cost.</p>
                            </div>
                            <div className="bg-emerald-800/50 p-4 rounded-2xl border border-emerald-700/50">
                                <h4 className="font-bold text-sm mb-1 text-emerald-300">Different Item Exchange</h4>
                                <p className="text-xs text-emerald-100">If you prefer a different product, we will apply your refund as store credit. Any price difference will be adjusted accordingly.</p>
                            </div>
                        </div>
                    </div>

                    {/* Shipping Costs for Returns */}
                    <div className="bg-white rounded-[24px] p-8 border border-gray-100 shadow-sm">
                        <h2 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-2">
                            <Truck className="h-5 w-5 text-gray-400" />
                            Return Shipping Costs
                        </h2>
                        <div className="space-y-3">
                            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                                <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                                <p className="text-sm text-gray-700"><span className="font-bold">Defective/Wrong Item:</span> Return shipping is <span className="font-bold text-emerald-600">FREE</span>. We cover all costs.</p>
                            </div>
                            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                                <p className="text-sm text-gray-700"><span className="font-bold">Buyer&apos;s remorse (if approved):</span> The buyer is responsible for return shipping costs.</p>
                            </div>
                        </div>
                    </div>

                    {/* Country Coverage */}
                    <div className="bg-white rounded-[24px] p-8 border border-gray-100 shadow-sm">
                        <h2 className="text-xl font-black text-gray-900 mb-4">Coverage</h2>
                        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                            <span className="text-2xl">🇳🇬</span>
                            <div>
                                <p className="font-bold text-gray-900 text-sm">Nigeria</p>
                                <p className="text-xs text-gray-500">This return policy applies to all orders shipped within Nigeria.</p>
                            </div>
                        </div>
                    </div>

                    {/* Contact CTA */}
                    <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-[24px] p-8 text-white text-center">
                        <h2 className="text-2xl font-black mb-2">Need Help with a Return?</h2>
                        <p className="text-emerald-100 mb-6 text-sm max-w-md mx-auto">
                            Our support team is available to assist you with any return or exchange requests.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                            <Link
                                href="mailto:support@fairprice.ng"
                                className="bg-white text-emerald-700 px-6 py-3 rounded-full font-black text-sm hover:bg-emerald-50 transition-all shadow-lg flex items-center gap-2"
                            >
                                Email Support <ArrowRight className="h-4 w-4" />
                            </Link>
                            <Link
                                href="/account/orders"
                                className="bg-emerald-500/30 border border-white/30 text-white px-6 py-3 rounded-full font-black text-sm hover:bg-emerald-500/50 transition-all flex items-center gap-2"
                            >
                                View My Orders
                            </Link>
                        </div>
                    </div>

                    {/* Last Updated */}
                    <p className="text-center text-xs text-gray-400 font-medium pt-4">
                        Last updated: April 2026 · FairPrice.ng · All rights reserved.
                    </p>
                </div>
            </main>

            <Footer />
        </div>
    );
}
