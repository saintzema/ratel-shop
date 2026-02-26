"use client";

import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export default function ConditionsOfUsePage() {
    return (
        <div className="min-h-screen bg-white flex flex-col font-sans">
            <Navbar />
            <main className="flex-1 container mx-auto px-4 py-12 max-w-3xl">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Conditions of Use</h1>
                <p className="text-sm text-gray-400 mb-8">Last updated: February 2025</p>

                <div className="prose prose-gray max-w-none space-y-8 text-[15px] leading-relaxed text-gray-700">
                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">1. Welcome to FairPrice</h2>
                        <p>
                            FairPrice Market and its affiliates provide their services to you subject to the following conditions. By using FairPrice services, you agree to these conditions. Please read them carefully.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">2. Electronic Communications</h2>
                        <p>
                            When you use FairPrice services or send emails to us, you are communicating with us electronically. You consent to receive communications from us electronically, including emails, texts, push notifications, or notices posted on the site. You agree that all agreements, notices, disclosures, and other communications that we provide to you electronically satisfy any legal requirement that such communications be in writing.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">3. Your Account</h2>
                        <p>
                            You are responsible for maintaining the confidentiality of your account and password and for restricting access to your device. You agree to accept responsibility for all activities that occur under your account. FairPrice reserves the right to refuse service, terminate accounts, or cancel orders at its discretion.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">4. Pricing & Payments</h2>
                        <p>
                            All prices displayed on FairPrice are in Nigerian Naira (₦) unless otherwise stated. We use an AI-powered price intelligence system to flag overpriced or unusually low listings. Prices may vary based on seller, location, and market conditions. Payment is processed through secure escrow — your money is only released to the seller after you confirm delivery satisfaction.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">5. Escrow Protection</h2>
                        <p>
                            FairPrice uses a buyer-protection escrow system. When you make a purchase, your payment is held securely until you receive and confirm satisfaction with your item. If there is a dispute, FairPrice will mediate and may issue a partial or full refund based on the circumstances.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">6. Returns & Refunds</h2>
                        <p>
                            Items may be returned within 7 days of delivery if they are defective, damaged, or significantly different from the listing description. Used or refurbished items must be accurately described by sellers. FairPrice facilitates returns and processes refunds within 5–10 business days of receiving the returned item.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">7. Intellectual Property</h2>
                        <p>
                            All content on FairPrice — including text, graphics, logos, button icons, images, audio clips, digital downloads, and data compilations — is the property of FairPrice or its content suppliers and protected by Nigerian and international intellectual property laws.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">8. Disclaimer of Warranties</h2>
                        <p>
                            FairPrice services are provided &quot;as is&quot; and &quot;as available.&quot; We make no representations or warranties of any kind, express or implied, regarding the operation of our services or the information, content, materials, or products included.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">9. Governing Law</h2>
                        <p>
                            These conditions are governed by the laws of the Federal Republic of Nigeria. Any disputes arising from your use of FairPrice will be resolved in accordance with Nigerian law and within the jurisdiction of Nigerian courts.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">10. Contact Us</h2>
                        <p>
                            For questions about these Conditions of Use, contact us at <a href="mailto:support@fairprice.ng" className="text-emerald-600 font-medium hover:underline">support@fairprice.ng</a> or through the Help Center.
                        </p>
                    </section>
                </div>
            </main>
            <Footer />
        </div>
    );
}
