"use client";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ShieldCheck, Eye, Fingerprint, Activity, Smartphone, Server } from "lucide-react";

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-white flex flex-col font-sans">
            <Navbar />
            <main className="flex-1">
                {/* Header */}
                <div className="relative bg-gradient-to-br from-emerald-900 to-black text-white py-16 px-6">
                    <div className="container mx-auto max-w-4xl text-center">
                        <h1 className="text-4xl font-black tracking-tight mb-3">Privacy Policy</h1>
                        <p className="text-emerald-100 text-lg">Last updated: {new Date().toLocaleDateString()}</p>
                    </div>
                </div>

                {/* Content */}
                <div className="container mx-auto max-w-3xl px-6 py-16 space-y-12">
                    {/* Intro */}
                    <div className="prose prose-gray max-w-none text-gray-700 leading-relaxed text-sm md:text-base">
                        <p>
                            At FairPrice, we take your privacy seriously. This policy describes how we collect, use, and handle your personal information when you use our services.
                        </p>
                    </div>

                    <div className="space-y-8">
                        {/* Section 1 */}
                        <section className="bg-gray-50 p-6 md:p-8 rounded-3xl border border-gray-100">
                            <h2 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-3">
                                <div className="p-2 bg-blue-50 rounded-xl">
                                    <Fingerprint className="h-5 w-5 text-blue-600" />
                                </div>
                                1. Information We Collect
                            </h2>
                            <div className="space-y-3 text-sm text-gray-600 leading-relaxed pl-2">
                                <p><strong>Personal Information:</strong> Name, email address, phone number, shipping and billing addresses.</p>
                                <p><strong>Payment Information:</strong> Credit card details and billing information (processed securely through our payment gateways). We do not store raw credit card numbers on our servers.</p>
                                <p><strong>Usage Data:</strong> Information about how you interact with our platform, including browser type, IP address, device information, and pages visited.</p>
                            </div>
                        </section>

                        {/* Section 2 */}
                        <section className="bg-gray-50 p-6 md:p-8 rounded-3xl border border-gray-100">
                            <h2 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-3">
                                <div className="p-2 bg-emerald-50 rounded-xl">
                                    <Activity className="h-5 w-5 text-emerald-600" />
                                </div>
                                2. How We Use Your Information
                            </h2>
                            <div className="space-y-3 text-sm text-gray-600 leading-relaxed pl-2">
                                <p>Processing and fulfilling your orders securely through our core escrow system.</p>
                                <p>Providing customer support and managing dispute resolution actively and fairly.</p>
                                <p>Improving our platform, AI-driven price comparison models, and personalized shopping experiences using aggregated data.</p>
                                <p>Communicating with you regarding necessary updates, promotional offers, and security alerts.</p>
                            </div>
                        </section>

                        {/* Section 3 */}
                        <section className="bg-gray-50 p-6 md:p-8 rounded-3xl border border-gray-100">
                            <h2 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-3">
                                <div className="p-2 bg-rose-50 rounded-xl">
                                    <ShieldCheck className="h-5 w-5 text-rose-600" />
                                </div>
                                3. Data Sharing and Security
                            </h2>
                            <div className="space-y-3 text-sm text-gray-600 leading-relaxed pl-2">
                                <p>We do not sell your personal data to third parties. We may share necessary information with verified sellers and logistics partners strictly for the purpose of order fulfillment.</p>
                                <p>FairPrice employs industry-standard security measures, including SSL encryption, continuous AI monitoring, and strictly scoped database access to protect your personal and financial data.</p>
                            </div>
                        </section>

                        {/* Section 4 */}
                        <section className="bg-gray-50 p-6 md:p-8 rounded-3xl border border-gray-100">
                            <h2 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-3">
                                <div className="p-2 bg-amber-50 rounded-xl">
                                    <Eye className="h-5 w-5 text-amber-600" />
                                </div>
                                4. Cookies and Tracking Technologies
                            </h2>
                            <div className="space-y-3 text-sm text-gray-600 leading-relaxed pl-2">
                                <p>We use cookies to enhance your browsing experience, maintain your session context, and analyze site traffic securely.</p>
                                <p>You can manage your cookie preferences through your browser settings. However, disabling all cookies may limit your ability to use certain core features of the FairPrice platform.</p>
                            </div>
                        </section>

                        {/* Section 5 */}
                        <section className="bg-gray-50 p-6 md:p-8 rounded-3xl border border-gray-100">
                            <h2 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-3">
                                <div className="p-2 bg-purple-50 rounded-xl">
                                    <Smartphone className="h-5 w-5 text-purple-600" />
                                </div>
                                5. Third-Party Sign-On (Google & Apple)
                            </h2>
                            <div className="space-y-3 text-sm text-gray-600 leading-relaxed pl-2">
                                <p>If you choose to log in using third-party services like "Sign in with Apple" or "Sign in with Google", we receive basic profile information (such as your name and email address) authorized directly by that provider.</p>
                                <p>This data is used solely to authenticate your identity securely and create your FairPrice account seamlessly without maintaining separate passwords.</p>
                            </div>
                        </section>

                    </div>

                    <div className="text-center pt-8 border-t border-gray-200">
                        <p className="text-sm text-gray-500">
                            Questions regarding this privacy policy? Contact our data protection team at <a href="mailto:privacy@fairprice.ng" className="text-brand-green-600 font-medium hover:underline">privacy@fairprice.ng</a>
                        </p>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
