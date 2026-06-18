"use client";

import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Mail, Phone, MapPin, MessageSquare, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";

export default function ContactPage() {
    const [submitted, setSubmitted] = useState(false);
    const [config, setConfig] = useState({
        email: "hello@fairprice.ng",
        whatsapp: "2348162816305",
        office: "12 New Market Road, Onitsha, Anambra State, Nigeria",
        hours: "Mon - Sat: 8am - 10pm WAT",
        serviceCenters: [] as {name: string, address: string, phone: string}[]
    });

    useEffect(() => {
        fetch("/api/admin/settings")
            .then(res => res.ok ? res.json() : null)
            .then(data => {
                if (data?.supportConfig) {
                    setConfig(prev => ({ ...prev, ...data.supportConfig }));
                }
            })
            .catch(err => console.error("Failed to load support config", err));
    }, []);

    const contactMethods = [
        { icon: Mail, label: "Email", value: config.email, href: `mailto:${config.email}` },
        { icon: MessageSquare, label: "WhatsApp Direct", value: "Chat with Sales & Support", href: "https://wa.me/message/3NZESSNRD2RMP1" },
        { icon: Phone, label: "WhatsApp Number", value: `+${config.whatsapp.startsWith('+') ? config.whatsapp.slice(1) : config.whatsapp}`, href: `https://wa.me/${config.whatsapp.replace(/\D/g, '')}` },
        { icon: MapPin, label: "Office", value: config.office, href: "#" },
    ];

    if (config.serviceCenters.length > 0) {
        // Optionally add service centers to the list if desired, or keep as a separate section
    }

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
                                {contactMethods.map(c => (
                                    <a key={c.label} href={c.href} className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors group">
                                        <div className="p-2 bg-emerald-100 rounded-lg"><c.icon className="h-5 w-5 text-emerald-600" /></div>
                                        <div>
                                            <p className="text-xs font-bold text-gray-400 uppercase">{c.label}</p>
                                            <p className="text-gray-900 font-medium group-hover:text-emerald-700 transition-colors">{c.value}</p>
                                        </div>
                                    </a>
                                ))}

                                {config.serviceCenters.length > 0 && (
                                    <div className="pt-6 border-t border-gray-100 mt-6">
                                        <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                                            <MapPin className="h-4 w-4 text-emerald-600" /> Pickup & Service Centers
                                        </h3>
                                        <div className="grid grid-cols-1 gap-3">
                                            {config.serviceCenters.map((center, idx) => (
                                                <div key={idx} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                                    <p className="font-bold text-gray-900 text-sm">{center.name}</p>
                                                    <p className="text-xs text-gray-500 mt-1">{center.address}</p>
                                                    {center.phone && <p className="text-xs text-emerald-600 font-medium mt-1">{center.phone}</p>}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
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
                                <form onSubmit={(e) => {
                                    e.preventDefault();
                                    const form = e.target as HTMLFormElement;
                                    const subjectInput = form.querySelectorAll("input")[2] as HTMLInputElement;
                                    const textArea = form.querySelector("textarea") as HTMLTextAreaElement;

                                    // Track contact form submitted
                                    if (typeof window !== "undefined" && (window as any).pendo) {
                                        (window as any).pendo.track("contact_form_submitted", {
                                            inquiry_topic: subjectInput?.value || "",
                                            message_length: textArea?.value?.length || 0,
                                        });
                                    }

                                    setSubmitted(true);
                                }} className="space-y-4">
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
