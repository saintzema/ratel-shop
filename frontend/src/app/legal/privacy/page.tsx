"use client";

import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export default function PrivacyNoticePage() {
    return (
        <div className="min-h-screen bg-white flex flex-col font-sans">
            <Navbar />
            <main className="flex-1 container mx-auto px-4 py-12 max-w-3xl">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Notice</h1>
                <p className="text-sm text-gray-400 mb-8">Last updated: February 2025</p>

                <div className="prose prose-gray max-w-none space-y-8 text-[15px] leading-relaxed text-gray-700">
                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">1. Information We Collect</h2>
                        <p>
                            FairPrice collects information you provide directly, such as your name, email address, phone number, delivery address, and payment information. We also automatically collect certain information when you use our services, including device information, IP address, browser type, and browsing behaviour on our platform.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">2. How We Use Your Information</h2>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>To process transactions and deliver products you order</li>
                            <li>To send order confirmations, shipping updates, and delivery notifications</li>
                            <li>To operate our AI price intelligence system to protect you from overpriced listings</li>
                            <li>To personalise your shopping experience with relevant recommendations</li>
                            <li>To prevent fraud, resolve disputes, and enforce our terms</li>
                            <li>To communicate promotional offers (with your consent)</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">3. Information Sharing</h2>
                        <p>
                            We do not sell your personal information. We share information only as follows:
                        </p>
                        <ul className="list-disc pl-6 space-y-2 mt-3">
                            <li><strong>Sellers:</strong> Your name, delivery address, and phone number are shared with sellers to fulfil orders</li>
                            <li><strong>Payment Processors:</strong> Payment data is securely transmitted to our payment partners (e.g., Paystack)</li>
                            <li><strong>Service Providers:</strong> We may share data with logistics and delivery partners</li>
                            <li><strong>Legal Requirements:</strong> We may disclose data when required by law or to protect our rights</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">4. Data Security</h2>
                        <p>
                            We implement industry-standard security measures including encryption (SSL/TLS), secure escrow-based payment processing, and regular security audits. Your payment details are never stored on our servers — they are handled directly by PCI-compliant payment processors.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">5. Cookies & Tracking</h2>
                        <p>
                            We use cookies and similar technologies to improve your experience, remember your preferences, and analyse site traffic. You can manage cookie preferences through your browser settings.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">6. Your Rights (NDPR Compliance)</h2>
                        <p>
                            Under the Nigeria Data Protection Regulation (NDPR), you have the right to:
                        </p>
                        <ul className="list-disc pl-6 space-y-2 mt-3">
                            <li>Access your personal data held by FairPrice</li>
                            <li>Request correction of inaccurate data</li>
                            <li>Request deletion of your data (subject to legal obligations)</li>
                            <li>Withdraw consent for marketing communications at any time</li>
                            <li>Lodge a complaint with the National Information Technology Development Agency (NITDA)</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">7. Data Retention</h2>
                        <p>
                            We retain your data for as long as your account is active or as needed to provide services. Transaction records are retained for 7 years for regulatory compliance. You may request account deletion at any time.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">8. Contact Us</h2>
                        <p>
                            For privacy-related inquiries, contact our Data Protection Officer at <a href="mailto:privacy@fairprice.ng" className="text-emerald-600 font-medium hover:underline">privacy@fairprice.ng</a>.
                        </p>
                    </section>
                </div>
            </main>
            <Footer />
        </div>
    );
}
