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

    const [formData, setFormData] = useState({
        business_name: "",
        description: "",
        logo_url: "",
        cover_image_url: "",
        store_url: "",
        location: "",
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
        const storeUrl = s.store_url || s.slug || s.business_name?.toLowerCase().replace(/[^a-z0-9-]/g, '-') || s.id;
        setFormData({
            business_name: s.business_name || "",
            description: s.description || "",
            logo_url: s.logo_url || "",
            cover_image_url: s.cover_image_url || "",
            store_url: storeUrl,
            location: s.location || "",
            weekly_orders: s.weekly_orders || "",
            staff_count: s.staff_count || "",
            physical_stores: s.physical_stores || "",
            currencies: s.currencies || ["NGN (₦)"],
            whatsapp_enabled: (s as any).whatsapp_enabled ?? false,
            whatsapp_number: (s as any).whatsapp_number || ""
        });
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
                    weekly_orders: formData.weekly_orders,
                    staff_count: formData.staff_count,
                    physical_stores: formData.physical_stores,
                    currencies: formData.currencies,
                    whatsapp_number: formData.whatsapp_number,
                }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || `Save failed (${res.status})`);
            }

            // Keep localStorage in sync so sidebar avatar updates immediately
            DataSyncService.updateSeller(seller.id, formData);

            const refreshed = DataSyncService.getCurrentSeller();
            if (refreshed) setSeller(refreshed as Seller);

            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err: any) {
            console.error("Settings save error:", err);
            alert(err.message || "Failed to save settings. Please try again.");
        } finally {
            setSaving(false);
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
                // Sync localStorage so sidebar/header update on next render
                DataSyncService.updateSeller(seller!.id, { logo_url: logoUrl, cover_image_url: coverUrl } as any);
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
                            <Input
                                disabled={!isEditing}
                                value={formData.location}
                                onChange={e => setFormData({ ...formData, location: e.target.value })}
                                placeholder="E.g. Lagos, Nigeria"
                                className="h-14 bg-gray-50 border-gray-200 rounded-2xl focus-visible:ring-brand-green-600 focus-visible:border-brand-green-600 font-bold disabled:opacity-80"
                            />
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
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-[32px] border border-emerald-100 p-6 sm:p-10 shadow-sm relative overflow-hidden group">
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
                        <Switch 
                            disabled={!isEditing}
                            checked={formData.whatsapp_enabled} 
                            onCheckedChange={(val) => setFormData({ ...formData, whatsapp_enabled: val })} 
                        />
                    </div>
                    
                    <div className="space-y-6 relative z-10">
                        <p className="text-sm text-emerald-900/70 font-semibold leading-relaxed max-w-2xl">
                            Enable real-time negotiations on WhatsApp. When a customer suggests a price, you'll be notified instantly. You can counter-offer or accept deals directly from WhatsApp.
                        </p>
                        
                        {formData.whatsapp_enabled && (
                            <div className="space-y-4 max-w-sm animate-in fade-in slide-in-from-left-4 duration-500">
                                <label className="text-[10px] font-black uppercase tracking-widest text-emerald-900/50 flex items-center gap-1.5">Business WhatsApp Number</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600 text-sm font-black">+234</span>
                                    <Input
                                        disabled={!isEditing}
                                        value={formData.whatsapp_number}
                                        onChange={e => setFormData({ ...formData, whatsapp_number: e.target.value.replace(/\D/g, '') })}
                                        placeholder="8012345678"
                                        className="h-14 bg-white border-emerald-200 rounded-2xl focus-visible:ring-emerald-500 focus-visible:border-emerald-500 text-emerald-900 pl-14 font-black shadow-inner disabled:opacity-80"
                                    />
                                </div>
                                <div className="flex items-center gap-2 bg-white/50 p-3 rounded-xl border border-emerald-100/50">
                                    <ShieldAlert className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                    <p className="text-[10px] text-emerald-700 font-bold leading-tight">Ziva AI will route all customer offers and checkout alerts to this number.</p>
                                </div>
                            </div>
                        )}
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
