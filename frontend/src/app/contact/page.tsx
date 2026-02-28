"use client";

import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Mail, Phone, MapPin, MessageSquare, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export default function ContactPage() {
    const [submitted, setSubmitted] = useState(false);

    return (
        <div className="min-h-screen bg-white flex flex-col font-sans">
            <Navbar />
            <main className="flex-1">
                <div className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-700 text-white py-20 px-6">
                    <div className="container mx-auto max-w-4xl text-center">
                        <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">Contact Us</h1>
                        <p className="text-gray-300 text-lg max-w-2xl mx-auto">We&apos;re here to help. Reach out to us through any of the channels below.</p>
                    </div>
                </div>

                <div className="container mx-auto max-w-4xl px-6 py-16">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        {/* Contact Info */}
                        <div className="space-y-6">
                            <h2 className="text-2xl font-black text-gray-900">Get in Touch</h2>
                            <div className="space-y-4">
                                {[
                                    { icon: Mail, label: "Email", value: "support@fairprice.ng", href: "mailto:support@fairprice.ng" },
                                    { icon: Phone, label: "Phone", value: "+234 (0) 800 123 4567", href: "tel:+2348001234567" },
                                    { icon: MapPin, label: "Office", value: "14 Adeola Odeku, Victoria Island, Lagos, Nigeria", href: "#" },
                                    { icon: Clock, label: "Hours", value: "Mon - Sat: 8am - 10pm WAT", href: "#" },
                                ].map(c => (
                                    <a key={c.label} href={c.href} className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors group">
                                        <div className="p-2 bg-emerald-100 rounded-lg"><c.icon className="h-5 w-5 text-emerald-600" /></div>
                                        <div>
                                            <p className="text-xs font-bold text-gray-400 uppercase">{c.label}</p>
                                            <p className="text-gray-900 font-medium group-hover:text-emerald-700 transition-colors">{c.value}</p>
                                        </div>
                                    </a>
                                ))}
                            </div>
                        </div>

                        {/* Contact Form */}
                        <div>
                            <h2 className="text-2xl font-black text-gray-900 mb-4">Send a Message</h2>
                            {submitted ? (
                                <div className="p-8 bg-emerald-50 rounded-2xl border border-emerald-200 text-center">
                                    <MessageSquare className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
                                    <h3 className="font-bold text-emerald-800 mb-1">Message Sent!</h3>
                                    <p className="text-sm text-emerald-600">We&apos;ll get back to you within 24 hours.</p>
                                </div>
                            ) : (
                                <form onSubmit={(e) => { e.preventDefault(); setSubmitted(true); }} className="space-y-4">
                                    <Input placeholder="Your Name" required className="rounded-xl" />
                                    <Input placeholder="Email Address" type="email" required className="rounded-xl" />
                                    <Input placeholder="Subject" required className="rounded-xl" />
                                    <textarea placeholder="Your Message" required rows={5} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none resize-none" />
                                    <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl py-3">Send Message</Button>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
