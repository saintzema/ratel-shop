"use client";

import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export default function ConsumerProtectionPage() {
    return (
        <div className="min-h-screen bg-white flex flex-col font-sans">
            <Navbar />
            <main className="flex-1 container mx-auto px-4 py-12 max-w-3xl">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Consumer Protection Policy</h1>
                <p className="text-sm text-gray-400 mb-8">Last updated: February 2025</p>

                <div className="prose prose-gray max-w-none space-y-8 text-[15px] leading-relaxed text-gray-700">
                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">Our Commitment</h2>
                        <p>
                            FairPrice is committed to protecting consumers in the Nigerian e-commerce market. Our platform uses AI-driven price intelligence, escrow payment protection, and seller verification to ensure a safe and fair shopping experience.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">1. Price Protection</h2>
                        <p>
                            Our AI system continuously monitors product prices across the market. Products are flagged if they are:
                        </p>
                        <ul className="list-disc pl-6 space-y-2 mt-3">
                            <li><strong>Overpriced:</strong> Significantly above the market average for similar items</li>
                            <li><strong>Suspicious:</strong> Priced unusually low, which may indicate counterfeit or scam listings</li>
                            <li><strong>Fair Price:</strong> Within or below the market average — verified as good value</li>
                        </ul>
                        <p className="mt-3">
                            We display fair price indicators on all product listings so you can make informed purchasing decisions.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">2. Escrow Payment Protection</h2>
                        <p>
                            Every transaction on FairPrice is protected by our escrow system:
                        </p>
                        <ul className="list-disc pl-6 space-y-2 mt-3">
                            <li>Your payment is held securely, not sent directly to the seller</li>
                            <li>The seller ships your item within 48 hours</li>
                            <li>You have 48 hours after delivery to inspect and confirm satisfaction</li>
                            <li>If satisfied, the payment is released to the seller</li>
                            <li>If not satisfied, you can raise a dispute for investigation</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">3. Seller Verification</h2>
                        <p>
                            All sellers on FairPrice undergo a Know Your Customer (KYC) verification process. Verified sellers display a verification badge. We verify:
                        </p>
                        <ul className="list-disc pl-6 space-y-2 mt-3">
                            <li>Government-issued identification (NIN, Driver&apos;s License, Voter&apos;s Card, or International Passport)</li>
                            <li>Business registration documents</li>
                            <li>Bank account verification</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">4. Return & Refund Rights</h2>
                        <p>
                            You have the right to return purchased items within <strong>7 days</strong> of delivery if:
                        </p>
                        <ul className="list-disc pl-6 space-y-2 mt-3">
                            <li>The item is defective or damaged upon arrival</li>
                            <li>The item is significantly different from the product listing description</li>
                            <li>The wrong item was delivered</li>
                            <li>The item is counterfeit</li>
                        </ul>
                        <p className="mt-3">
                            Refunds are processed within 5–10 business days and returned to your original payment method.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">5. Dispute Resolution</h2>
                        <p>
                            If you experience an issue with an order, our dispute resolution process works as follows:
                        </p>
                        <ol className="list-decimal pl-6 space-y-2 mt-3">
                            <li>Submit a dispute through your order details page</li>
                            <li>Our team reviews evidence from both buyer and seller within 48 hours</li>
                            <li>A resolution is issued — either refund, partial refund, or payment release to seller</li>
                            <li>If unsatisfied with the resolution, you may escalate to the FairPrice Consumer Protection Board</li>
                        </ol>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">6. Anti-Fraud Measures</h2>
                        <p>
                            FairPrice actively combats fraud through:
                        </p>
                        <ul className="list-disc pl-6 space-y-2 mt-3">
                            <li>AI-powered listing analysis to detect scam patterns</li>
                            <li>Transaction monitoring for unusual activity</li>
                            <li>Seller trust scores based on verified reviews, delivery fulfilment, and dispute history</li>
                            <li>Immediate account suspension for confirmed fraudulent activity</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">7. Your Consumer Rights</h2>
                        <p>
                            In alignment with the Federal Competition and Consumer Protection Act (FCCPA) of Nigeria, you are entitled to:
                        </p>
                        <ul className="list-disc pl-6 space-y-2 mt-3">
                            <li>Accurate descriptions and fair pricing of all products</li>
                            <li>Safe products that meet advertised specifications</li>
                            <li>Fair contract terms that do not exploit consumers</li>
                            <li>Effective dispute resolution without undue delay</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">8. Report an Issue</h2>
                        <p>
                            To report a consumer protection issue, contact us at <a href="mailto:protection@fairprice.ng" className="text-emerald-600 font-medium hover:underline">protection@fairprice.ng</a> or use the complaint form in your account settings. You may also contact the Federal Competition and Consumer Protection Commission (FCCPC) directly.
                        </p>
                    </section>
                </div>
            </main>
            <Footer />
        </div>
    );
}
