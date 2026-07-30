"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { DataSyncService } from "@/lib/sync-store";
import { Seller } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Store,
    Image as ImageIcon,
    Upload,
    Save,
    CheckCircle2,
    ArrowLeft,
    Globe,
    MapPin,
    Users,
    Package,
    ShieldAlert,
    Copy,
    Lock,
    Check,
    Wallet,
    Badge,
    MessageCircle
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { CountryCodeSelect } from "@/components/ui/CountryCodeSelect";
import { NIGERIAN_STATES } from "@/lib/nigerian-states";

export default function SellerSettingsPage() {
    const router = useRouter();
    const [seller, setSeller] = useState<Seller | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [copied, setCopied] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    const logoInputRef = useRef<HTMLInputElement>(null);
    const coverInputRef = useRef<HTMLInputElement>(null);

    const [waCountryCode, setWaCountryCode] = useState("+234");
    // Ziva WhatsApp activation: idle (not yet activated/editing) -> otp_sent (waiting
    // for the code, only reached when admin's WhatsApp OTP Verification setting is on)
    // -> active (saved & enabled). Kept separate from the big form's isEditing/handleSubmit
    // so activating doesn't require opening the whole settings form for edit.
    const [waActivationStep, setWaActivationStep] = useState<"idle" | "otp_sent" | "active">("idle");
    const [waOtpCode, setWaOtpCode] = useState("");
    const [waActivating, setWaActivating] = useState(false);
    const [waOtpError, setWaOtpError] = useState("");
    const [formData, setFormData] = useState({
        business_name: "",
        description: "",
        logo_url: "",
        cover_image_url: "",
        store_url: "",
        location: "",
        state: "",
        city: "",
        weekly_orders: "",
        staff_count: "",
        physical_stores: "",
        currencies: [] as string[],
        whatsapp_enabled: false,
        whatsapp_number: ""
    });

    useEffect(() => {
        const s = DataSyncService.getCurrentSeller();
        if (!s) {
            router.push("/seller/login");
            return;
        }
        setSeller(s);
        const storeUrl = (s as any).store_url || (s as any).storeUrl || (s as any).slug || s.business_name?.toLowerCase().replace(/[^a-z0-9-]/g, '-') || s.id;
        // Normalize camelCase DB fields → snake_case form fields (background sync may store either format)
        const logoUrl = (s as any).logo_url || (s as any).logoUrl || "";
        const coverUrl = (s as any).cover_image_url || (s as any).coverImageUrl || "";
        const waEnabled = (s as any).whatsapp_enabled ?? (s as any).whatsappEnabled ?? false;
        // Strip country code prefix from stored E.164 number for display in the local input
        const rawWaNumber = (s as any).whatsapp_number || (s as any).whatsappNumber || "";
        const waNumber = rawWaNumber.startsWith("234") ? rawWaNumber.slice(3) : rawWaNumber;
        setFormData({
            business_name: s.business_name || (s as any).businessName || "",
            description: s.description || "",
            logo_url: logoUrl,
            cover_image_url: coverUrl,
            store_url: storeUrl,
            location: s.location || "",
            state: s.state || "",
            city: s.city || "",
            weekly_orders: (s as any).weekly_orders || (s as any).weeklyOrders || "",
            staff_count: (s as any).staff_count || (s as any).staffCount || "",
            physical_stores: (s as any).physical_stores || (s as any).physicalStores || "",
            currencies: s.currencies || ["NGN (₦)"],
            whatsapp_enabled: waEnabled,
            whatsapp_number: waNumber,
        });
        setWaActivationStep(waEnabled && waNumber ? "active" : "idle");
        setLoading(false);
    }, [router]);

    const getAuthHeaders = (): Record<string, string> => {
        const token = typeof window !== "undefined" ? localStorage.getItem("fp_token") : null;
        return token ? { Authorization: `Bearer ${token}` } : {};
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!seller) return;

        setSaving(true);
        try {
            const res = await fetch(`/api/sellers/${seller.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json", ...getAuthHeaders() },
                body: JSON.stringify({
                    business_name: formData.business_name,
                    description: formData.description,
                    logo_url: formData.logo_url,
                    cover_image_url: formData.cover_image_url,
                    store_url: formData.store_url,
                    location: formData.location,
                    state: formData.state,
                    city: formData.city,
                    weekly_orders: formData.weekly_orders,
                    staff_count: formData.staff_count,
                    physical_stores: formData.physical_stores,
                    currencies: formData.currencies,
                    whatsapp_enabled: formData.whatsapp_enabled,
                    // Store full E.164 number so integrations can use it directly
                    whatsapp_number: formData.whatsapp_number
                        ? `${waCountryCode.replace('+', '')}${formData.whatsapp_number.replace(/^0/, '')}`
                        : "",
                }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || `Save failed (${res.status})`);
            }

            // Keep localStorage in sync so sidebar/avatar/PDP update immediately
            const e164Number = formData.whatsapp_number
                ? `${waCountryCode.replace('+', '')}${formData.whatsapp_number.replace(/^0/, '')}`
                : "";
            DataSyncService.updateSeller(seller.id, {
                ...formData,
                whatsapp_enabled: formData.whatsapp_enabled,
                whatsapp_number: e164Number,
            } as any);

            const refreshed = DataSyncService.getCurrentSeller();
            if (refreshed) {
                setSeller(refreshed as Seller);
                // Re-normalise form so re-visiting the page shows saved values correctly
                const rLogoUrl = (refreshed as any).logo_url || (refreshed as any).logoUrl || formData.logo_url;
                const rCoverUrl = (refreshed as any).cover_image_url || (refreshed as any).coverImageUrl || formData.cover_image_url;
                setFormData(prev => ({ ...prev, logo_url: rLogoUrl, cover_image_url: rCoverUrl }));
            }

            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err: any) {
            console.error("Settings save error:", err);
            alert(err.message || "Failed to save settings. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    const fullWaNumber = () => formData.whatsapp_number
        ? `${waCountryCode.replace('+', '')}${formData.whatsapp_number.replace(/^0/, '')}`
        : "";

    const saveWhatsAppFields = async (enabled: boolean) => {
        if (!seller) return;
        const e164Number = fullWaNumber();
        await fetch(`/api/sellers/${seller.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", ...getAuthHeaders() },
            body: JSON.stringify({ whatsapp_enabled: enabled, whatsapp_number: e164Number }),
        });
        DataSyncService.updateSeller(seller.id, { whatsapp_enabled: enabled, whatsapp_number: e164Number } as any);
        setFormData(prev => ({ ...prev, whatsapp_enabled: enabled }));
    };

    // Sends an OTP to the entered WhatsApp number — unless admin's "WhatsApp OTP
    // Verification" setting is off, in which case /send-otp itself returns
    // {bypassed:true} and we just save immediately, same as before this feature existed.
    const handleActivateWhatsApp = async () => {
        if (!formData.whatsapp_number || formData.whatsapp_number.length < 7) {
            setWaOtpError("Enter a valid WhatsApp number first.");
            return;
        }
        setWaOtpError("");
        setWaActivating(true);
        try {
            const res = await fetch("/api/auth/whatsapp/send-otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phoneNumber: fullWaNumber(), purpose: "seller_verification" }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || "Failed to send verification code.");

            if (data.bypassed) {
                await saveWhatsAppFields(true);
                setWaActivationStep("active");
                setSuccess(true);
                setTimeout(() => setSuccess(false), 3000);
            } else {
                setWaActivationStep("otp_sent");
            }
        } catch (err: any) {
            setWaOtpError(err.message || "Failed to send verification code. Please try again.");
        } finally {
            setWaActivating(false);
        }
    };

    const handleVerifyWhatsAppOtp = async () => {
        if (!waOtpCode || waOtpCode.length < 4) {
            setWaOtpError("Enter the code you received on WhatsApp.");
            return;
        }
        setWaOtpError("");
        setWaActivating(true);
        try {
            const res = await fetch("/api/auth/whatsapp/verify-otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phoneNumber: fullWaNumber(), code: waOtpCode }),
            });
            const data = await res.json().catch(() => ({}));
            if (!data.success) throw new Error(data.error || "Invalid code. Please try again.");

            await saveWhatsAppFields(true);
            setWaActivationStep("active");
            setWaOtpCode("");
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err: any) {
            setWaOtpError(err.message || "Verification failed. Please try again.");
        } finally {
            setWaActivating(false);
        }
    };

    const toggleCurrency = (currency: string) => {
        setFormData(prev => ({
            ...prev,
            currencies: prev.currencies.includes(currency)
                ? prev.currencies.filter(c => c !== currency)
                : [...prev.currencies, currency]
        }));
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'cover') => {
        const file = e.target.files?.[0];
        if (file) {
            // Check plan for cover upload
            if (type === 'cover' && (!seller?.subscription_plan || seller.subscription_plan === "Starter")) {
                alert("Custom banners are a Pro feature. Please upgrade your plan to change your store's look.");
                return;
            }

            setSaving(true);
            try {
                const uploadFormData = new FormData();
                uploadFormData.append("file", file);

                const res = await fetch("/api/upload", {
                    method: "POST",
                    headers: { ...getAuthHeaders() }, // no Content-Type: multipart handles it
                    body: uploadFormData
                });
                
                const data = await res.json();
                if (!data.success || !data.url) {
                    throw new Error(data.error || "Upload failed");
                }

                const url = data.url;
                let logoUrl = formData.logo_url;
                let coverUrl = formData.cover_image_url;

                if (type === 'cover') {
                    const currentUrls = (formData as any).cover_image_urls || (formData.cover_image_url ? [formData.cover_image_url] : []);
                    const maxImages = (seller?.subscription_plan === "Growth" || seller?.subscription_plan === "Scale") ? 3 : 1;
                    if (currentUrls.length >= maxImages && maxImages > 1) {
                        const newUrls = [...currentUrls, url].slice(-maxImages);
                        setFormData(prev => ({ ...prev, cover_image_urls: newUrls, cover_image_url: newUrls[0] }));
                    } else {
                        setFormData(prev => ({ ...prev, cover_image_url: url, cover_image_urls: [url] }));
                    }
                    coverUrl = url;
                } else {
                    setFormData(prev => ({ ...prev, logo_url: url }));
                    logoUrl = url;
                }

                // Persist the new image URL to DB immediately — don't require user to click Save
                await fetch(`/api/sellers/${seller!.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
                    body: JSON.stringify({ logo_url: logoUrl, cover_image_url: coverUrl }),
                });
                // Sync localStorage so sidebar/avatar/PDP update immediately (dispatches sync-store-update)
                DataSyncService.updateSeller(seller!.id, { logo_url: logoUrl, cover_image_url: coverUrl } as any);
                // Also update the local seller state so the settings page itself stays accurate
                setSeller(prev => prev ? { ...prev, logo_url: logoUrl, cover_image_url: coverUrl } as any : prev);
            } catch (err: any) {
                console.error("Upload error:", err);
                alert(err.message || "Failed to upload image. Please try again.");
            } finally {
                setSaving(false);
            }
        }
    };

    if (loading || !seller) {
        return <div className="p-8 flex items-center justify-center min-h-[60vh]"><div className="animate-spin h-8 w-8 border-4 border-brand-green-600 border-t-transparent rounded-full" /></div>;
    }

    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">Store Profile</h1>
                    <p className="text-sm text-gray-500 font-medium mt-1">Manage your public storefront and business details</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button 
                        onClick={() => setIsEditing(!isEditing)}
                        variant={isEditing ? "ghost" : "outline"} 
                        className={`rounded-2xl border shadow-sm h-12 px-6 transition-all ${isEditing ? 'text-gray-500 hover:bg-gray-100 bg-white' : 'text-brand-green-700 hover:bg-brand-green-50 bg-brand-green-50/50 border-brand-green-200 font-black uppercase tracking-widest text-xs'}`}
                    >
                        {isEditing ? "Cancel" : "Edit Profile"}
                    </Button>
                    {!isEditing && (
                        <Button 
                            onClick={() => router.push("/seller/dashboard")}
                            variant="ghost" 
                            className="rounded-2xl text-gray-500 hover:text-gray-900 bg-white border shadow-sm h-12 px-6 font-bold"
                        >
                            <ArrowLeft className="h-4 w-4 mr-2" /> Dashboard
                        </Button>
                    )}
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">

                {/* Branding Section */}
                <div className="bg-white rounded-[32px] border border-gray-100 p-6 sm:p-10 shadow-sm transition-all hover:shadow-md">
                    <div className="flex items-center gap-2 mb-8 text-brand-green-600">
                        <div className="p-2 bg-brand-green-50 rounded-xl">
                            <Store className="h-5 w-5" />
                        </div>
                        <h2 className="font-black uppercase tracking-[0.2em] text-[10px]">Branding & Identity</h2>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                        {/* Custom Domain Preview */}
                        <div className="space-y-8">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Store Domain URL</label>
                                {seller.subscription_plan && ["Pro", "Growth", "Scale"].includes(seller.subscription_plan) ? (
                                    <>
                                        <div className="flex relative group">
                                            <Input
                                                disabled={!isEditing}
                                                value={formData.store_url}
                                                onChange={e => setFormData({ ...formData, store_url: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                                                placeholder="your-store-name"
                                                className="h-14 bg-gray-50 border-gray-200 rounded-2xl rounded-r-none focus-visible:ring-1 focus-visible:border-brand-green-600 font-bold text-gray-900 pr-28 transition-all disabled:opacity-80"
                                            />
                                            <div className="absolute right-0 h-14 flex items-center bg-gray-100 border border-gray-200 border-l-0 rounded-r-2xl px-5 text-gray-500 text-sm font-black pointer-events-none">
                                                .fairprice.ng
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between mt-3 gap-4">
                                            <p className="text-[11px] text-gray-500 font-medium flex items-center gap-1.5">
                                                <Globe className="h-3.5 w-3.5 text-brand-green-600" /> Share this link with customers.
                                            </p>
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                className="h-9 px-4 text-[10px] font-black uppercase tracking-widest text-brand-green-700 border-brand-green-200 hover:bg-brand-green-50 rounded-xl shadow-sm transition-all active:scale-95"
                                                onClick={async () => {
                                                    const { copyToClipboard } = await import("@/lib/utils");
                                                    const canonicalBase = "https://www.fairprice.ng";
                                                    const success = await copyToClipboard(`${canonicalBase}/store/${formData.store_url || 'shop'}`);
                                                    if (success) {
                                                        setCopied(true);
                                                        setTimeout(() => setCopied(false), 2000);
                                                    }
                                                }}
                                            >
                                                {copied ? <Check className="h-3.5 w-3.5 mr-2 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 mr-2" />}
                                                {copied ? "Copied!" : "Copy Link"}
                                            </Button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="flex relative">
                                            <div className="absolute left-0 h-14 flex items-center bg-gray-100 border border-gray-200 border-r-0 rounded-l-2xl px-4 text-gray-400 text-[11px] font-bold pointer-events-none uppercase tracking-tight">
                                                www.fairprice.ng/store/
                                            </div>
                                            <Input
                                                disabled={!isEditing}
                                                value={formData.store_url}
                                                onChange={e => setFormData({ ...formData, store_url: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                                                placeholder="your-store-name"
                                                className="h-14 bg-gray-50 border-gray-200 rounded-2xl rounded-l-none focus-visible:ring-1 focus-visible:border-brand-green-600 font-bold text-gray-900 pl-[170px] disabled:opacity-80"
                                            />
                                        </div>
                                        <div className="flex items-center justify-between mt-3 gap-4">
                                            <p className="text-[11px] text-gray-500 font-medium flex items-center gap-1.5">
                                                <Globe className="h-3.5 w-3.5 text-brand-green-600" /> Share this link with customers.
                                            </p>
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                className="h-9 px-4 text-[10px] font-black uppercase tracking-widest text-brand-green-700 border-brand-green-200 hover:bg-brand-green-50 rounded-xl shadow-sm"
                                                onClick={async () => {
                                                    const { copyToClipboard } = await import("@/lib/utils");
                                                    const success = await copyToClipboard(`${window.location.origin}/store/${formData.store_url || 'shop'}`);
                                                    if (success) {
                                                        setCopied(true);
                                                        setTimeout(() => setCopied(false), 2000);
                                                    }
                                                }}
                                            >
                                                {copied ? <Check className="h-3.5 w-3.5 mr-2 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 mr-2" />}
                                                {copied ? "Copied!" : "Copy Link"}
                                            </Button>
                                        </div>
                                        <div className="flex items-start justify-between mt-4 gap-4 bg-amber-50 p-4 rounded-2xl border border-amber-100 shadow-inner">
                                            <p className="text-[11px] text-amber-900 flex items-center gap-2 leading-tight font-medium">
                                                <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0" />
                                                <span>Want a custom domain like <strong>{formData.store_url || 'yourstore'}.fairprice.ng</strong>?</span>
                                            </p>
                                            <Link href="/seller/settings/billing">
                                                <Button size="sm" className="h-8 bg-amber-600 text-white text-[9px] font-black uppercase tracking-widest rounded-lg shadow-sm hover:bg-amber-700">
                                                    Upgrade
                                                </Button>
                                            </Link>
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Business Name</label>
                                <Input
                                    disabled={!isEditing}
                                    value={formData.business_name}
                                    onChange={e => setFormData({ ...formData, business_name: e.target.value })}
                                    placeholder="Enter your business name"
                                    className="h-14 bg-gray-50 border-gray-200 rounded-2xl focus-visible:ring-brand-green-600 focus-visible:border-brand-green-600 font-bold disabled:opacity-80"
                                />
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Store Description</label>
                                <Textarea
                                    disabled={!isEditing}
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Describe your store to customers..."
                                    className="min-h-[120px] bg-gray-50 border-gray-200 rounded-2xl resize-none focus-visible:ring-brand-green-600 focus-visible:border-brand-green-600 font-medium disabled:opacity-80"
                                />
                            </div>
                        </div>

                        {/* Image Uploads */}
                        <div className="space-y-10">
                            {/* Logo */}
                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Store Logo</label>
                                <div className="flex items-center gap-6 bg-gray-50 p-6 rounded-3xl border border-gray-100 shadow-inner">
                                    <div className="h-24 w-24 shrink-0 rounded-[28px] bg-white flex items-center justify-center border-4 border-white overflow-hidden shadow-md relative group">
                                        {formData.logo_url ? (
                                            <>
                                                <img src={formData.logo_url} alt="Logo" className="w-full h-full object-cover" />
                                                {isEditing && (
                                                    <div className="absolute inset-0 bg-black/50 transition-opacity flex items-center justify-center cursor-pointer" onClick={() => logoInputRef.current?.click()}>
                                                        <Upload className="h-6 w-6 text-white" />
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <div className={`text-center ${isEditing ? 'cursor-pointer' : ''}`} onClick={() => isEditing && logoInputRef.current?.click()}>
                                                <ImageIcon className="h-10 w-10 text-gray-200 mx-auto" />
                                            </div>
                                        )}
                                        <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'logo')} />
                                    </div>
                                    <div className="space-y-3 flex-1">
                                        <p className="text-[11px] text-gray-400 font-bold uppercase tracking-tight">500x500px (JPG, PNG)</p>
                                        {isEditing ? (
                                            <Button type="button" variant="outline" onClick={() => logoInputRef.current?.click()} className="h-10 hover:bg-brand-green-50 hover:text-brand-green-700 hover:border-brand-green-200 text-[10px] font-black uppercase tracking-[0.1em] transition-all w-full sm:w-auto rounded-xl shadow-sm">
                                                <Upload className="h-3.5 w-3.5 mr-2" /> Select Image
                                            </Button>
                                        ) : (
                                            <div className="flex items-center gap-1.5 text-brand-green-600">
                                                <CheckCircle2 className="h-4 w-4" />
                                                <span className="text-[10px] font-black uppercase tracking-widest">Logo Uploaded</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Cover */}
                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center justify-between">
                                    <span>Cover Banner</span>
                                    {(!seller.subscription_plan || seller.subscription_plan === "Starter") && (
                                        <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none px-2 py-1 text-[8px] font-black uppercase tracking-tighter shadow-none rounded-md">Starter Limit</Badge>
                                    )}
                                </label>
                                <div className="relative h-48 w-full rounded-[28px] bg-gray-50 border-4 border-white overflow-hidden group shadow-md">
                                    {formData.cover_image_url ? (
                                        <img src={formData.cover_image_url} alt="Cover" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-300">
                                            <ImageIcon className="h-12 w-12 mb-2 opacity-30" />
                                            <span className="text-[10px] font-black uppercase tracking-widest">1200 x 400px</span>
                                        </div>
                                    )}
                                    
                                    {isEditing && (
                                        <>
                                            {(!seller.subscription_plan || seller.subscription_plan === "Starter") ? (
                                                <div className="absolute inset-0 bg-white/70 backdrop-blur-[4px] flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-300">
                                                    <div className="h-12 w-12 bg-white rounded-2xl shadow-xl flex items-center justify-center mb-4">
                                                        <Lock className="h-6 w-6 text-amber-600" />
                                                    </div>
                                                    <p className="text-[11px] font-black text-gray-900 mb-4 uppercase tracking-tight">Unlock custom branding with Pro</p>
                                                    <Link href="/seller/settings/billing">
                                                        <Button type="button" size="sm" className="bg-brand-green-600 text-white text-[9px] font-black uppercase tracking-widest h-10 px-6 rounded-xl shadow-lg shadow-brand-green-600/20 hover:scale-105 transition-all">
                                                            Upgrade Now
                                                        </Button>
                                                    </Link>
                                                </div>
                                            ) : (
                                                <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                    <Button type="button" onClick={() => coverInputRef.current?.click()} variant="secondary" className="bg-white hover:bg-gray-100 text-gray-900 text-[10px] font-black uppercase tracking-widest h-11 px-8 rounded-2xl shadow-2xl transition-transform hover:scale-105">
                                                        <Upload className="h-4 w-4 mr-2" /> {formData.cover_image_url ? 'Change Banner' : 'Upload Banner'}
                                                    </Button>
                                                    <p className="text-[9px] text-white/80 font-black mt-3 uppercase tracking-[0.2em]">
                                                        {(seller.subscription_plan === "Growth" || seller.subscription_plan === "Scale") ? "Up to 3 images allowed" : "1 image limit"}
                                                    </p>
                                                    <input type="file" ref={coverInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'cover')} />
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                                {(seller.subscription_plan === "Growth" || seller.subscription_plan === "Scale") && seller.cover_image_urls && seller.cover_image_urls.length > 0 && (
                                    <div className="grid grid-cols-3 gap-4 mt-6 animate-in fade-in slide-in-from-top-4 duration-500">
                                        {seller.cover_image_urls.map((url, i) => (
                                            <div key={i} className="relative aspect-[3/1] rounded-2xl overflow-hidden border-2 border-white shadow-sm ring-1 ring-gray-100">
                                                <img src={url} alt="" className="w-full h-full object-cover" />
                                                <div className="absolute top-2 right-2 h-5 w-5 bg-black/60 backdrop-blur-md rounded-lg flex items-center justify-center text-white text-[9px] font-black">{i + 1}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div >

                {/* Operations Section */}
                < div className="bg-white rounded-[32px] border border-gray-100 p-6 sm:p-10 shadow-sm" >
                    <div className="flex items-center gap-2 mb-8 text-brand-green-600">
                        <div className="p-2 bg-brand-green-50 rounded-xl">
                            <Users className="h-5 w-5" />
                        </div>
                        <h2 className="font-black uppercase tracking-[0.2em] text-[10px]">Business Operations</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> Physical Location</label>
                            {/* State/city (not free text) is what powers localized search — buyers
                                searching "cars in Maitama, Abuja" rank this seller's listings first
                                only if this matches. Changing it here immediately affects every
                                product listed under this seller/store, not just the store page. */}
                            <div className="grid grid-cols-2 gap-3">
                                <select
                                    disabled={!isEditing}
                                    value={formData.state}
                                    onChange={e => setFormData({ ...formData, state: e.target.value, city: "", location: e.target.value ? `${e.target.value}` : "" })}
                                    className="h-14 bg-gray-50 border border-gray-200 rounded-2xl px-4 font-bold text-sm disabled:opacity-80"
                                >
                                    <option value="">Select State</option>
                                    {NIGERIAN_STATES.map(s => <option key={s.state} value={s.state}>{s.state}</option>)}
                                </select>
                                <select
                                    disabled={!isEditing || !formData.state}
                                    value={formData.city}
                                    onChange={e => setFormData({ ...formData, city: e.target.value, location: e.target.value ? `${e.target.value}, ${formData.state}` : formData.state })}
                                    className="h-14 bg-gray-50 border border-gray-200 rounded-2xl px-4 font-bold text-sm disabled:opacity-80"
                                >
                                    <option value="">Select City</option>
                                    {NIGERIAN_STATES.find(s => s.state === formData.state)?.cities.map(c => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Supported Currencies</label>
                            <div className="grid grid-cols-2 gap-3 mt-1">
                                {["NGN (₦)", "USD ($)", "EUR (€)", "GBP (£)"].map((curr) => (
                                    <div
                                        key={curr}
                                        onClick={() => isEditing && toggleCurrency(curr)}
                                        className={`border-2 rounded-2xl px-4 py-3 text-xs text-center transition-all select-none ${formData.currencies.includes(curr) ? "bg-brand-green-50 border-brand-green-500 text-brand-green-900 font-black shadow-sm" : "bg-white border-gray-100 text-gray-400 hover:bg-gray-50 font-bold"} ${!isEditing ? 'cursor-default opacity-80' : 'cursor-pointer active:scale-95'}`}
                                    >
                                        {curr}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Weekly Orders Volume</label>
                            <select
                                disabled={!isEditing}
                                value={formData.weekly_orders}
                                onChange={e => setFormData({ ...formData, weekly_orders: e.target.value })}
                                className="flex h-14 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green-600 focus-visible:border-transparent font-bold disabled:opacity-80 appearance-none"
                            >
                                <option value="">Select an option...</option>
                                <option value="Just starting">Just starting out</option>
                                <option value="1-10">1 to 10 orders</option>
                                <option value="11-50">11 to 50 orders</option>
                                <option value="51-100">51 to 100 orders</option>
                                <option value="100+">100+ orders</option>
                            </select>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Staff Count</label>
                            <select
                                disabled={!isEditing}
                                value={formData.staff_count}
                                onChange={e => setFormData({ ...formData, staff_count: e.target.value })}
                                className="flex h-14 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green-600 focus-visible:border-transparent font-bold disabled:opacity-80 appearance-none"
                            >
                                <option value="">Select an option...</option>
                                <option value="Just me">Just me</option>
                                <option value="2-5">2 to 5 staff</option>
                                <option value="6-10">6 to 10 staff</option>
                                <option value="11+">11+ staff</option>
                            </select>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Physical Storefronts</label>
                            <select
                                disabled={!isEditing}
                                value={formData.physical_stores}
                                onChange={e => setFormData({ ...formData, physical_stores: e.target.value })}
                                className="flex h-14 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green-600 focus-visible:border-transparent font-bold disabled:opacity-80 appearance-none"
                            >
                                <option value="">Select an option...</option>
                                <option value="None (Online only)">None (Online only)</option>
                                <option value="1">1 Store</option>
                                <option value="2-3">2 to 3 Stores</option>
                                <option value="4+">4+ Stores</option>
                            </select>
                        </div>
                    </div>
                </div >

                {/* WhatsApp Negotiation Bridge Section */}
                <div id="whatsapp-activate" className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-[32px] border border-emerald-100 p-6 sm:p-10 shadow-sm relative overflow-hidden group">
                    <div className="absolute -right-8 -top-8 bg-emerald-100/50 h-32 w-32 rounded-full blur-3xl group-hover:bg-emerald-200/50 transition-colors" />
                    <div className="flex items-center justify-between mb-8 relative z-10">
                        <div className="flex items-center gap-3 text-emerald-800">
                            <div className="p-2 bg-white rounded-xl shadow-sm">
                                <MessageCircle className="h-6 w-6 text-emerald-500" />
                            </div>
                            <div>
                                <h2 className="font-black uppercase tracking-[0.2em] text-[10px]">Ziva AI-WhatsApp Bridge</h2>
                                <p className="text-[9px] font-black text-emerald-600 mt-0.5 uppercase tracking-tighter">Real-time Negotiation Hub</p>
                            </div>
                        </div>
                        {waActivationStep === "active" && (
                            <button
                                type="button"
                                onClick={() => { setWaActivationStep("idle"); saveWhatsAppFields(false); }}
                                className="text-[10px] font-black uppercase tracking-widest text-emerald-700 bg-white px-3 py-1.5 rounded-full shadow-sm hover:bg-emerald-50"
                            >
                                Deactivate
                            </button>
                        )}
                    </div>

                    <div className="space-y-6 relative z-10">
                        <p className="text-sm text-emerald-900/70 font-semibold leading-relaxed max-w-2xl">
                            Enable real-time negotiations on WhatsApp. When a customer suggests a price, you'll be notified instantly — and QR payments/product uploads via WhatsApp chat will be tied to this number.
                        </p>

                        <div className="space-y-4 max-w-sm animate-in fade-in slide-in-from-left-4 duration-500">
                            <label className="text-[10px] font-black uppercase tracking-widest text-emerald-900/50 flex items-center gap-1.5">Business WhatsApp Number</label>
                            <div className="flex gap-2">
                                <div className={waActivationStep === "active" ? "opacity-50 pointer-events-none" : ""}>
                                    <CountryCodeSelect
                                        value={waCountryCode}
                                        onChange={setWaCountryCode}
                                    />
                                </div>
                                <Input
                                    disabled={waActivationStep === "active" || waActivating}
                                    value={formData.whatsapp_number}
                                    onChange={e => { setFormData({ ...formData, whatsapp_number: e.target.value.replace(/\D/g, '') }); setWaOtpError(""); }}
                                    placeholder="8012345678"
                                    className="h-14 flex-1 bg-white border-emerald-200 rounded-2xl focus-visible:ring-emerald-500 focus-visible:border-emerald-500 text-emerald-900 font-black shadow-inner disabled:opacity-80"
                                />
                            </div>

                            {waActivationStep === "idle" && (
                                <Button
                                    type="button"
                                    onClick={handleActivateWhatsApp}
                                    disabled={waActivating}
                                    className="w-full h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 font-black uppercase tracking-widest text-[10px]"
                                >
                                    {waActivating ? "Activating..." : "Activate Ziva WhatsApp"}
                                </Button>
                            )}

                            {waActivationStep === "otp_sent" && (
                                <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div className="flex items-center gap-2 bg-white/70 p-3 rounded-xl border border-emerald-100/50">
                                        <ShieldAlert className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                        <p className="text-[10px] text-emerald-700 font-bold leading-tight">
                                            We sent a code to your WhatsApp. Wrong number?{" "}
                                            <button type="button" onClick={() => { setWaActivationStep("idle"); setWaOtpCode(""); setWaOtpError(""); }} className="underline">
                                                Edit it
                                            </button> and activate again.
                                        </p>
                                    </div>
                                    <Input
                                        value={waOtpCode}
                                        onChange={e => setWaOtpCode(e.target.value.replace(/\D/g, ''))}
                                        placeholder="Enter 6-digit code"
                                        className="h-14 bg-white border-emerald-200 rounded-2xl focus-visible:ring-emerald-500 focus-visible:border-emerald-500 text-emerald-900 font-black shadow-inner text-center tracking-widest"
                                        maxLength={6}
                                    />
                                    <Button
                                        type="button"
                                        onClick={handleVerifyWhatsAppOtp}
                                        disabled={waActivating}
                                        className="w-full h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 font-black uppercase tracking-widest text-[10px]"
                                    >
                                        {waActivating ? "Verifying..." : "Verify & Activate"}
                                    </Button>
                                    <button type="button" onClick={handleActivateWhatsApp} disabled={waActivating} className="text-[10px] font-bold text-emerald-600 underline">
                                        Resend code
                                    </button>
                                </div>
                            )}

                            {waActivationStep === "active" && (
                                <div className="flex items-center gap-2 bg-white/70 p-3 rounded-xl border border-emerald-200">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                                    <p className="text-[10px] text-emerald-700 font-black uppercase tracking-widest">Verified & Active</p>
                                </div>
                            )}

                            {waOtpError && (
                                <p className="text-[10px] font-bold text-rose-600">{waOtpError}</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Payout & Bank Settings Quick Link */}
                <div className="bg-white rounded-[32px] border border-gray-100 p-6 sm:p-10 shadow-sm transition-all hover:shadow-md">
                    <div className="flex items-center gap-3 mb-4 text-amber-600">
                        <div className="p-2 bg-amber-50 rounded-xl">
                            <Wallet className="h-5 w-5" />
                        </div>
                        <h2 className="font-black uppercase tracking-[0.2em] text-[10px]">Payout & Banking Settings</h2>
                    </div>
                    <p className="text-sm text-gray-500 mb-8 font-medium max-w-2xl">Securely manage your settlement bank accounts, view payout history, and track automated withdrawals for your successful sales.</p>
                    <Link href="/seller/settings/payouts">
                        <Button type="button" variant="outline" className="w-full sm:w-auto font-black uppercase tracking-widest text-[10px] rounded-2xl h-12 px-8 border-amber-200 text-amber-700 hover:bg-amber-50 shadow-sm transition-all active:scale-95">
                            Manage Settlement Accounts
                        </Button>
                    </Link>
                </div>

                {/* Save Button */}
                <AnimatePresence>
                    {isEditing && (
                        <motion.div 
                            initial={{ opacity: 0, y: 100 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 100 }}
                            className="fixed bottom-10 left-1/2 -translate-x-1/2 w-full max-w-xl px-4 z-[100]" 
                        >
                            <div className="bg-white/90 backdrop-blur-xl rounded-[28px] border border-gray-200 p-5 shadow-2xl shadow-black/10 flex items-center justify-between gap-6">
                                <div className="hidden sm:flex flex-col">
                                    <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Profile Editor</span>
                                    <span className="text-xs font-bold text-gray-600">Unsaved Changes</span>
                                </div>
                                <div className="flex items-center gap-3 flex-1 sm:flex-initial">
                                    <Button
                                        type="button"
                                        onClick={() => setIsEditing(false)}
                                        variant="ghost"
                                        className="h-14 px-6 rounded-2xl text-gray-500 font-bold"
                                    >
                                        Discard
                                    </Button>
                                    <Button
                                        disabled={saving}
                                        className="flex-1 sm:flex-initial bg-brand-green-600 hover:bg-brand-green-700 text-white font-black uppercase tracking-widest h-14 px-10 rounded-2xl shadow-xl shadow-brand-green-600/30 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-3"
                                    >
                                        {saving ? (
                                            <div className="h-5 w-5 border-3 border-white/30 border-t-white animate-spin rounded-full" />
                                        ) : (
                                            <Save className="h-5 w-5" />
                                        )}
                                        {saving ? "Saving..." : "Save Changes"}
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </form>

            {/* Premium Toast Notification for Success */}
            <AnimatePresence>
                {success && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 50, scale: 0.9 }}
                        className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[101] bg-emerald-600 text-white px-8 py-4 rounded-3xl shadow-2xl flex items-center gap-4 border border-emerald-400/20 backdrop-blur-md"
                    >
                        <div className="h-10 w-10 bg-white/20 rounded-2xl flex items-center justify-center shadow-inner">
                            <CheckCircle2 className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <p className="text-sm font-black uppercase tracking-widest">Settings Updated</p>
                            <p className="text-[11px] font-medium text-emerald-50 opacity-90">Your store profile has been synchronized successfully.</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div >
    );
}
