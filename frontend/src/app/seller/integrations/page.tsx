"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Instagram,
    CreditCard,
    Truck,
    Globe,
    MessageCircle,
    CheckCircle2,
    ArrowRight,
    PowerOff
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataSyncService } from "@/lib/sync-store";
import { useRouter } from "next/navigation";
import Link from "next/link";

const INTEGRATIONS = [
    {
        id: "instagram",
        name: "Instagram Suite",
        provider: "Meta",
        description: "Reply to Instagram messages, and import your Instagram posts directly into your product catalog.",
        icon: <Instagram className="h-6 w-6 text-pink-600" />,
        status: "Disconnected",
        color: "pink",
        requiresPremium: true,
        manageUrl: "/seller/integrations/meta"
    },
    {
        id: "paystack",
        name: "Paystack Payments",
        provider: "Paystack",
        description: "Accept local and international payments via card, bank transfer, and USSD.",
        icon: <CreditCard className="h-6 w-6 text-cyan-600" />,
        status: "Connected",
        color: "cyan",
        requiresPremium: false,
        manageUrl: "/seller/settings/payouts"
    },
    {
        id: "shipbubble",
        name: "Shipbubble Logistics",
        provider: "Shipbubble",
        description: "Automate deliveries and generate shipping labels instantly.",
        icon: <Truck className="h-6 w-6 text-indigo-600" />,
        status: "Disconnected",
        color: "indigo",
        requiresPremium: true,
        manageUrl: "/seller/shipping/shipbubble"
    },
    {
        id: "fez",
        name: "Fez Delivery",
        provider: "Fez",
        description: "Same-day delivery within major cities across the country.",
        icon: <Truck className="h-6 w-6 text-amber-600" />,
        status: "Disconnected",
        color: "amber",
        requiresPremium: false,
        manageUrl: "/seller/shipping/fez"
    },
    {
        id: "whatsapp",
        name: "WhatsApp Business API",
        provider: "Meta",
        description: "Send automated order confirmations and tracking updates via WhatsApp.",
        icon: <MessageCircle className="h-6 w-6 text-emerald-600" />,
        status: "Disconnected",
        color: "emerald",
        requiresPremium: true,
        manageUrl: "/seller/integrations/meta"
    },
    {
        id: "custom_domain",
        name: "Custom Domain Linking",
        provider: "Vercel / Cloudflare",
        description: "Connect your own domain (e.g., www.mystore.com) to your FairPrice storefront.",
        icon: <Globe className="h-6 w-6 text-gray-600" />,
        status: "Disconnected",
        color: "gray",
        requiresPremium: true,
        manageUrl: "/seller/settings/domain"
    },
    {
        id: "whatsapp_direct",
        name: "WhatsApp Direct DM Routing",
        provider: "FairPrice / Meta",
        description: "Receive customer negotiations in your own WhatsApp and reply directly to them.",
        icon: <MessageCircle className="h-6 w-6 text-blue-600" />,
        status: "Disconnected",
        color: "blue",
        requiresPremium: true,
        manageUrl: "/seller/integrations/meta"
    }
];

// Derive real connection status from the seller record so the UI reflects truth
function computeIntegrations(seller: any) {
    const hasBankDetails  = !!(seller?.account_number && seller?.bank_name);
    const hasInstagram    = !!(seller?.instagram_access_token || (seller as any)?.instagramAccessToken);
    const hasWhatsApp     = !!(seller?.whatsapp_number || seller?.whatsappNumber);
    const hasWhatsAppDM   = !!(seller?.whatsapp_direct_dm || (seller as any)?.whatsappDirectDM);
    const hasStoreUrl     = !!(seller?.store_url || seller?.storeUrl);

    return INTEGRATIONS.map(app => {
        let connected = false;
        switch (app.id) {
            case "paystack":        connected = hasBankDetails;  break;
            case "instagram":       connected = hasInstagram;    break;
            case "whatsapp":        connected = hasWhatsApp;     break;
            case "whatsapp_direct": connected = hasWhatsAppDM;   break;
            case "custom_domain":   connected = hasStoreUrl;     break;
            default:                connected = false;
        }
        return { ...app, status: connected ? "Connected" : "Disconnected" };
    });
}

export default function IntegrationsPage() {
    const [connecting, setConnecting] = useState<string | null>(null);
    const [integrations, setIntegrations] = useState(INTEGRATIONS);
    const [isStarterPlan, setIsStarterPlan] = useState(true);
    const router = useRouter();

    // Live status from the DB. The cached seller only gives us an instant first
    // paint — it never carries the OAuth tokens the callback writes server-side,
    // so on its own it reports a freshly-connected Instagram as "Not Connected".
    const refreshStatus = useCallback(async () => {
        try {
            const token = localStorage.getItem("fp_token");
            if (!token) return;
            const res = await fetch("/api/seller/integrations/status", {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) return;
            const data = await res.json();
            const live = data?.integrations || {};
            setIntegrations(INTEGRATIONS.map(app => {
                const state = live[app.id];
                if (!state) return app;
                return {
                    ...app,
                    status: state.connected ? "Connected" : "Disconnected",
                    detail: state.detail || null,
                    expired: !!state.expired,
                };
            }));
        } catch { /* keep the cached view rather than flipping everything to disconnected */ }
    }, []);

    useEffect(() => {
        const seller = DataSyncService.getCurrentSeller();
        if (seller) {
            setIsStarterPlan(!seller.subscription_plan || seller.subscription_plan === "Starter");
            setIntegrations(computeIntegrations(seller));
        }
        refreshStatus();
        // Returning from an OAuth redirect re-shows this tab rather than remounting it.
        const onVisible = () => { if (document.visibilityState === "visible") refreshStatus(); };
        document.addEventListener("visibilitychange", onVisible);
        return () => document.removeEventListener("visibilitychange", onVisible);
    }, [refreshStatus]);

    // Disconnect is a genuinely different action from connect. Routing both
    // through handleConnect meant the disconnect button relaunched OAuth.
    const handleDisconnect = async (intId: string) => {
        setConnecting(intId);
        try {
            const token = localStorage.getItem("fp_token");
            const res = await fetch("/api/seller/integrations/disconnect", {
                method: "POST",
                headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                body: JSON.stringify({ provider: intId }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                alert(err?.error || "Could not disconnect. Please try again.");
            }
        } catch {
            alert("Could not disconnect. Please check your connection and try again.");
        } finally {
            await refreshStatus();
            setConnecting(null);
        }
    };

    const handleConnect = async (intId: string, requiresPremium: boolean) => {
        if (requiresPremium && isStarterPlan) {
            router.push('/seller/settings/billing');
            return;
        }

        setConnecting(intId);

        switch (intId) {
            case "instagram":
                // Real OAuth flow — fetch redirect URL from the API
                try {
                    const token = typeof window !== "undefined" ? localStorage.getItem("fp_token") : null;
                    const res = await fetch("/api/seller/instagram/auth", {
                        headers: {
                            Accept: "application/json",
                            ...(token ? { Authorization: `Bearer ${token}` } : {}),
                        },
                    });
                    const data = await res.json();
                    if (data.url) { window.location.href = data.url; return; }
                } catch {}
                break;

            case "paystack":
                // Paystack connection = configure bank settlement details
                router.push("/seller/settings/payouts");
                break;

            case "whatsapp":
                // WhatsApp Business API = configure WA number in settings
                router.push("/seller/settings");
                break;

            case "whatsapp_direct": {
                // Toggle WhatsApp Direct DM in the seller record
                const sellerId = DataSyncService.getCurrentSellerId();
                const current = integrations.find(a => a.id === "whatsapp_direct");
                const enable = current?.status !== "Connected";
                if (sellerId) {
                    const token = typeof window !== "undefined" ? localStorage.getItem("fp_token") : null;
                    await fetch(`/api/sellers/${sellerId}`, {
                        method: "PATCH",
                        headers: {
                            "Content-Type": "application/json",
                            ...(token ? { Authorization: `Bearer ${token}` } : {}),
                        },
                        body: JSON.stringify({ whatsappDirectDM: enable }),
                    });
                    DataSyncService.updateSeller(sellerId, { whatsappDirectDM: enable } as any);
                    setIntegrations(prev =>
                        prev.map(a => a.id === "whatsapp_direct" ? { ...a, status: enable ? "Connected" : "Disconnected" } : a)
                    );
                }
                break;
            }

            case "custom_domain":
                router.push("/seller/settings");
                break;

            default:
                // Logistics (Shipbubble/Fez): coming soon — just show a toast-like alert
                alert("This integration is coming soon. We'll notify you when it's available.");
        }

        setConnecting(null);
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
                {integrations.map((app) => (
                    <div key={app.id} className="bg-white rounded-[24px] border border-gray-100 p-6 shadow-sm hover:shadow-lg transition-all flex flex-col relative overflow-hidden group">
                        {app.requiresPremium && (
                            <div className="absolute top-0 right-0 bg-gray-900 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-bl-lg z-10">
                                Pro Plan Req.
                            </div>
                        )}

                        <div className="flex items-start justify-between mb-4">
                            <div className={`p-4 rounded-2xl ${app.color === 'pink' ? 'bg-pink-50' : app.color === 'cyan' ? 'bg-cyan-50' : app.color === 'indigo' ? 'bg-indigo-50' : app.color === 'amber' ? 'bg-amber-50' : app.color === 'emerald' ? 'bg-emerald-50' : 'bg-gray-50'}`}>
                                {INTEGRATIONS.find(i => i.id === app.id)?.icon}
                            </div>
                            {app.status === 'Connected' ? (
                                <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                                    <CheckCircle2 className="h-3 w-3" /> Connected
                                </span>
                            ) : (app as any).expired ? (
                                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">
                                    Reconnect
                                </span>
                            ) : (
                                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 bg-gray-50 px-2 py-1 rounded-lg">
                                    Not Connected
                                </span>
                            )}
                        </div>

                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-gray-900">{app.name}</h3>
                            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2">
                                By {app.provider}
                                {(app as any).detail && app.status === 'Connected' && (
                                    <span className="ml-2 normal-case tracking-normal text-gray-600 font-semibold">{(app as any).detail}</span>
                                )}
                            </p>
                            <p className="text-sm text-gray-500 leading-relaxed mb-6">{app.description}</p>
                        </div>

                        <div className="mt-auto">
                            {app.status === 'Connected' ? (
                                <div className="flex gap-2">
                                    <Link href={(app as any).manageUrl || "#"} className="flex-1">
                                        <Button variant="outline" className="w-full h-12 rounded-xl border-gray-200 text-gray-700 font-bold hover:bg-gray-50 shadow-sm">
                                            {app.id === "paystack" ? "View Payouts" : app.id === "whatsapp" ? "Configure" : "Manage"}
                                        </Button>
                                    </Link>
                                    <Button
                                        variant="outline"
                                        title={`Disconnect ${app.name}`}
                                        onClick={() => {
                                            // whatsapp/paystack/domain "disconnect" is really a settings
                                            // change, so send those back through their own flow.
                                            if (["instagram", "facebook", "whatsapp_direct"].includes(app.id)) {
                                                if (confirm(`Disconnect ${app.name}? You can reconnect at any time.`)) handleDisconnect(app.id);
                                            } else {
                                                handleConnect(app.id, app.requiresPremium);
                                            }
                                        }}
                                        disabled={connecting === app.id}
                                        className="h-12 w-12 rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300"
                                    >
                                        {connecting === app.id ? (
                                            <div className="h-5 w-5 border-2 border-current border-t-transparent animate-spin rounded-full" />
                                        ) : (
                                            <PowerOff className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>
                            ) : (
                                <Button
                                    onClick={() => handleConnect(app.id, app.requiresPremium)}
                                    disabled={connecting === app.id}
                                    className={`w-full h-12 rounded-xl text-white font-bold tracking-wide shadow-md transition-all flex items-center justify-center gap-2 ${app.requiresPremium && isStarterPlan
                                        ? "bg-gray-400 hover:bg-gray-500"
                                        : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20 group-hover:shadow-lg"
                                        }`}
                                >
                                    {connecting === app.id ? (
                                        <div className="h-5 w-5 border-2 border-white/30 border-t-white animate-spin rounded-full" />
                                    ) : app.requiresPremium && isStarterPlan ? (
                                        <>Upgrade Plan to Connect</>
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
