"use client";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { AlertTriangle, ShieldAlert, FileWarning, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export default function ReportPage() {
    const [submitted, setSubmitted] = useState(false);
    return (
        <div className="min-h-screen bg-white flex flex-col font-sans">
            <Navbar />
            <main className="flex-1">
                <div className="relative bg-gradient-to-br from-red-800 to-red-700 text-white py-16 px-6">
                    <div className="container mx-auto max-w-4xl text-center">
                        <h1 className="text-4xl font-black tracking-tight mb-3">Report Suspicious Activity</h1>
                        <p className="text-red-200 text-lg">Help us keep FairPrice safe for everyone</p>
                    </div>
                </div>
                <div className="container mx-auto max-w-3xl px-6 py-16 space-y-10">
                    <section>
                        <h2 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-red-500" /> What to Report</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {["Counterfeit or fake products", "Scam sellers or fraudulent listings", "Misleading product descriptions or images", "Harassment or inappropriate messages from sellers/buyers", "Phishing attempts or suspicious links", "Account compromise or unauthorized access"].map(item => (
                                <div key={item} className="flex items-center gap-3 p-3 bg-red-50 rounded-xl">
                                    <ShieldAlert className="h-4 w-4 text-red-500 shrink-0" />
                                    <span className="text-sm text-gray-700">{item}</span>
                                </div>
                            ))}
                        </div>
                    </section>
                    <section>
                        <h2 className="text-xl font-black text-gray-900 mb-4">Submit a Report</h2>
                        {submitted ? (
                            <div className="p-8 bg-emerald-50 rounded-2xl border border-emerald-200 text-center">
                                <FileWarning className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
                                <h3 className="font-bold text-emerald-800 mb-1">Report Submitted</h3>
                                <p className="text-sm text-emerald-600">Our Trust & Safety team will investigate within 24 hours.</p>
                            </div>
                        ) : (
                            <form onSubmit={(e) => { e.preventDefault(); setSubmitted(true); }} className="space-y-4">
                                <Input placeholder="Your Email" type="email" required className="rounded-xl" />
                                <Input placeholder="Product/Seller URL (if applicable)" className="rounded-xl" />
                                <select className="w-full h-10 rounded-xl border border-gray-300 px-3 text-sm bg-white" required>
                                    <option value="">Report Type</option>
                                    <option>Counterfeit Product</option>
                                    <option>Scam Seller</option>
                                    <option>Misleading Listing</option>
                                    <option>Harassment</option>
                                    <option>Phishing/Security</option>
                                    <option>Other</option>
                                </select>
                                <textarea placeholder="Describe the issue in detail..." required rows={5} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none resize-none" />
                                <Button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl py-3">Submit Report</Button>
                            </form>
                        )}
                    </section>
                </div>
            </main>
            <Footer />
        </div>
    );
}
