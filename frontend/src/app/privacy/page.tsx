"use client";

import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-brand-green-50 flex flex-col font-sans text-gray-900">
            <Navbar />
            <main className="flex-1 container mx-auto px-4 py-12 max-w-4xl">
                <div className="bg-white p-8 md:p-12 rounded-2xl shadow-sm border border-gray-100">
                    <h1 className="text-3xl md:text-4xl font-bold text-brand-green-800 mb-6">Privacy Policy</h1>
                    <p className="text-sm text-gray-500 mb-8">Last Updated: March 2026</p>

                    <div className="space-y-8 text-gray-700 leading-relaxed">
                        <section>
                            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Information We Collect</h2>
                            <p className="mb-3">When you use FairPrice, we collect the following types of information:</p>
                            <ul className="list-disc pl-5 space-y-2">
                                <li><strong>Personal Information:</strong> Name, email address, phone number, shipping and billing addresses.</li>
                                <li><strong>Payment Information:</strong> Credit card details and billing information (processed securely through our payment gateways).</li>
                                <li><strong>Usage Data:</strong> Information about how you interact with our platform, including browser type, IP address, and pages visited.</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. How We Use Your Information</h2>
                            <p className="mb-3">We use the collected data for various purposes, including:</p>
                            <ul className="list-disc pl-5 space-y-2">
                                <li>Processing and fulfilling your orders securely through our escrow system.</li>
                                <li>Providing customer support and managing dispute resolution.</li>
                                <li>Improving our platform, AI-driven price comparison, and personalized shopping experiences.</li>
                                <li>Communicating with you regarding updates, promotions, and security alerts.</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Data Sharing and Security</h2>
                            <p className="mb-3">
                                We do not sell your personal data to third parties. We may share necessary information with verified sellers and logistics partners strictly for the purpose of order fulfillment. FairPrice employs industry-standard security measures to protect your personal and financial data.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Cookies and Tracking Technologies</h2>
                            <p className="mb-3">
                                We use cookies to enhance your browsing experience, maintain your session context, and analyze site traffic. You can manage your cookie preferences through your browser settings.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Your Rights</h2>
                            <p className="mb-3">
                                Depending on your location, you may have the right to access, correct, or delete your personal information. If you wish to exercise these rights or have questions about our data practices, please contact our support team.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. App Store & Single Sign-On</h2>
                            <p className="mb-3">
                                If you choose to log in using third-party services like "Sign in with Apple" or "Sign in with Google", we receive basic profile information (such as your name and email address) authorized by that provider. This data is used solely to authenticate your identity and create your FairPrice account seamlessly.
                            </p>
                        </section>

                        <div className="pt-8 mt-8 border-t border-gray-100">
                            <p className="text-sm text-gray-500">
                                Contact us regarding this policy: <a href="mailto:support@fairprice.ng" className="text-brand-green-600 hover:underline">support@fairprice.ng</a>
                            </p>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
