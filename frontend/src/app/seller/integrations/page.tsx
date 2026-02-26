"use client";

import { useState } from "react";
import {
    Instagram,
    CreditCard,
    Truck,
    Globe,
    MessageCircle,
    CheckCircle2,
    ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";

const INTEGRATIONS = [
    {
        id: "int_1",
        name: "Instagram DMs",
        provider: "Meta",
        description: "Reply to Instagram messages & comments directly from your FairPrice CRM.",
        icon: <Instagram className="h-6 w-6 text-pink-600" />,
        status: "Disconnected",
        color: "pink",
        requiresPremium: true
    },
    {
        id: "int_2",
        name: "Paystack Payments",
        provider: "Paystack",
        description: "Accept local and international payments via card, bank transfer, and USSD.",
        icon: <CreditCard className="h-6 w-6 text-cyan-600" />,
        status: "Connected",
        color: "cyan",
        requiresPremium: false
    },
    {
        id: "int_3",
        name: "Shipbubble Logistics",
        provider: "Shipbubble",
        description: "Automate deliveries and generate shipping labels instantly.",
        icon: <Truck className="h-6 w-6 text-indigo-600" />,
        status: "Disconnected",
        color: "indigo",
        requiresPremium: true
    },
    {
        id: "int_4",
        name: "Fez Delivery",
        provider: "Fez",
        description: "Same-day delivery within major cities across the country.",
        icon: <Truck className="h-6 w-6 text-amber-600" />,
        status: "Disconnected",
        color: "amber",
        requiresPremium: false
    },
    {
        id: "int_5",
        name: "WhatsApp Business API",
        provider: "Meta",
        description: "Send automated order confirmations and tracking updates via WhatsApp.",
        icon: <MessageCircle className="h-6 w-6 text-emerald-600" />,
        status: "Disconnected",
        color: "emerald",
        requiresPremium: true
    },
    {
        id: "int_6",
        name: "Custom Domain Linking",
        provider: "Vercel / Cloudflare",
        description: "Connect your own domain (e.g., www.mystore.com) to your FairPrice storefront.",
        icon: <Globe className="h-6 w-6 text-gray-600" />,
        status: "Disconnected",
        color: "gray",
        requiresPremium: true
    }
];

export default function IntegrationsPage() {
    const [connecting, setConnecting] = useState<string | null>(null);

    const handleConnect = async (intId: string, name: string) => {
        setConnecting(intId);
        // Simulate OAuth redirect or connection delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        setConnecting(null);
        alert(`Integration Placeholder: Trigger OAuth or setup modal for ${name}.`);
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-20 p-4 sm:p-6 lg:p-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">App Store & Integrations</h1>
                    <p className="text-sm text-gray-500 font-medium mt-1">Connect your favorite tools to streamline operations and boost sales.</p>
                </div>
            </div>

            {/* Integrations Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {INTEGRATIONS.map((app) => (
                    <div key={app.id} className="bg-white rounded-[24px] border border-gray-100 p-6 shadow-sm hover:shadow-lg transition-all flex flex-col relative overflow-hidden group">
                        {app.requiresPremium && (
                            <div className="absolute top-0 right-0 bg-gray-900 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-bl-lg z-10">
                                Pro Plan Req.
                            </div>
                        )}

                        <div className="flex items-start justify-between mb-4">
                            <div className={`p-4 rounded-2xl ${app.color === 'pink' ? 'bg-pink-50' : app.color === 'cyan' ? 'bg-cyan-50' : app.color === 'indigo' ? 'bg-indigo-50' : app.color === 'amber' ? 'bg-amber-50' : app.color === 'emerald' ? 'bg-emerald-50' : 'bg-gray-50'}`}>
                                {app.icon}
                            </div>
                            {app.status === 'Connected' ? (
                                <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                                    <CheckCircle2 className="h-3 w-3" /> Connected
                                </span>
                            ) : (
                                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 bg-gray-50 px-2 py-1 rounded-lg">
                                    Not Connected
                                </span>
                            )}
                        </div>

                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-gray-900">{app.name}</h3>
                            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2">By {app.provider}</p>
                            <p className="text-sm text-gray-500 leading-relaxed mb-6">{app.description}</p>
                        </div>

                        <div className="mt-auto">
                            {app.status === 'Connected' ? (
                                <Button variant="outline" className="w-full h-12 rounded-xl border-gray-200 text-gray-700 font-bold hover:bg-gray-50 shadow-sm">
                                    Manage Settings
                                </Button>
                            ) : (
                                <Button
                                    onClick={() => handleConnect(app.id, app.name)}
                                    disabled={connecting === app.id}
                                    className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold tracking-wide shadow-md shadow-indigo-600/20 group-hover:shadow-lg transition-all flex items-center justify-center gap-2"
                                >
                                    {connecting === app.id ? (
                                        <div className="h-5 w-5 border-2 border-white/30 border-t-white animate-spin rounded-full" />
                                    ) : (
                                        <>Connect App <ArrowRight className="h-4 w-4" /></>
                                    )}
                                </Button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Developer CTA */}
            <div className="mt-12 bg-gray-50 rounded-[24px] border border-gray-200 p-8 flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">Need a custom integration?</h3>
                    <p className="text-sm text-gray-500">Upgrade to the Enterprise Scale plan to unlock Developer API access and build your own custom workflows.</p>
                </div>
                <Button variant="outline" className="shrink-0 h-12 rounded-xl bg-white font-bold border-gray-300">
                    View API Documentation
                </Button>
            </div>
        </div>
    );
}
