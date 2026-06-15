"use client";

import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Trash2, Mail, ShieldCheck, Clock } from "lucide-react";
import { motion } from "framer-motion";

export default function DataDeletionPage() {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            <Navbar />
            <main className="flex-1 container mx-auto px-4 py-16 max-w-4xl">
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-[40px] shadow-sm border border-gray-100 overflow-hidden"
                >
                    <div className="bg-rose-50 p-10 text-center">
                        <div className="w-20 h-20 rounded-3xl bg-rose-500 flex items-center justify-center text-white mx-auto mb-6 shadow-lg shadow-rose-200">
                            <Trash2 className="w-10 h-10" />
                        </div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Data Deletion Instructions</h1>
                        <p className="text-rose-600 font-bold mt-2 uppercase tracking-widest text-xs">Account & Privacy Control</p>
                    </div>

                    <div className="p-10 space-y-12">
                        <section>
                            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                                <ShieldCheck className="w-6 h-6 text-emerald-500" />
                                Your Data, Your Choice
                            </h2>
                            <p className="text-gray-600 leading-relaxed">
                                At FairPrice.ng, we value your privacy and provide you with full control over your personal data. In compliance with the Nigeria Data Protection Regulation (NDPR) and international standards, you have the right to request the deletion of your account and all associated personal information.
                            </p>
                        </section>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="bg-gray-50 rounded-3xl p-8 border border-gray-100">
                                <h3 className="font-black text-gray-900 mb-4">Option 1: Self-Service Deletion</h3>
                                <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                                    The fastest way to remove your data is directly through your account settings.
                                </p>
                                <ol className="text-sm font-bold text-gray-700 space-y-3">
                                    <li className="flex items-start gap-3">
                                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-white flex items-center justify-center text-[10px] border border-gray-200">1</span>
                                        Log in to your FairPrice account.
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-white flex items-center justify-center text-[10px] border border-gray-200">2</span>
                                        Go to <strong>Account &gt; Profile Settings</strong>.
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-white flex items-center justify-center text-[10px] border border-gray-200">3</span>
                                        Scroll to the bottom and click <strong>"Delete My Account"</strong>.
                                    </li>
                                </ol>
                            </div>

                            <div className="bg-gray-50 rounded-3xl p-8 border border-gray-100">
                                <h3 className="font-black text-gray-900 mb-4">Option 2: Email Request</h3>
                                <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                                    If you cannot access your account, our support team can manually process your request.
                                </p>
                                <div className="space-y-4">
                                    <a 
                                        href="mailto:hello@fairprice.ng" 
                                        className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-gray-200 hover:border-rose-300 transition-colors group"
                                    >
                                        <Mail className="w-5 h-5 text-gray-400 group-hover:text-rose-500" />
                                        <span className="text-sm font-black text-gray-900">hello@fairprice.ng</span>
                                    </a>
                                    <p className="text-[11px] text-gray-400 font-medium">
                                        Please use the email address associated with your account for verification purposes.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <section className="bg-amber-50 rounded-3xl p-8 border border-amber-100">
                            <h2 className="text-lg font-bold text-amber-900 mb-4 flex items-center gap-3">
                                <Clock className="w-6 h-6 text-amber-600" />
                                What Happens Next?
                            </h2>
                            <div className="space-y-4 text-sm text-amber-800 leading-relaxed font-medium">
                                <p>
                                    Once a deletion request is confirmed:
                                </p>
                                <ul className="list-disc pl-5 space-y-2">
                                    <li>Your profile, addresses, and favorites are permanently deleted.</li>
                                    <li>Active negotiations and open disputes will be closed.</li>
                                    <li>
                                        <strong>Note:</strong> We are legally required to retain transaction records (orders/invoices) for 7 years for tax and financial audit purposes in Nigeria.
                                    </li>
                                    <li>The process typically takes <strong>24 to 48 hours</strong> to complete across all our systems.</li>
                                </ul>
                            </div>
                        </section>
                    </div>
                </motion.div>
            </main>
            <Footer />
        </div>
    );
}
