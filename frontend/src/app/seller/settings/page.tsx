"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { DemoStore } from "@/lib/demo-store";
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
    Package
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

export default function SellerSettingsPage() {
    const router = useRouter();
    const [seller, setSeller] = useState<Seller | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);

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
        currencies: [] as string[]
    });

    useEffect(() => {
        const s = DemoStore.getCurrentSeller();
        if (!s) {
            router.push("/seller/login");
            return;
        }
        setSeller(s);
        setFormData({
            business_name: s.business_name,
            description: s.description || "",
            logo_url: s.logo_url || "",
            cover_image_url: s.cover_image_url || "",
            store_url: s.store_url || "",
            location: s.location || "",
            weekly_orders: s.weekly_orders || "",
            staff_count: s.staff_count || "",
            physical_stores: s.physical_stores || "",
            currencies: s.currencies || ["NGN (₦)"]
        });
        setLoading(false);
    }, [router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!seller) return;

        setSaving(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 800));

        DemoStore.updateSeller(seller.id, formData);

        setSaving(false);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
    };

    const toggleCurrency = (currency: string) => {
        setFormData(prev => ({
            ...prev,
            currencies: prev.currencies.includes(currency)
                ? prev.currencies.filter(c => c !== currency)
                : [...prev.currencies, currency]
        }));
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'cover') => {
        const file = e.target.files?.[0];
        if (file) {
            // Simulate reading file and setting URL
            const url = URL.createObjectURL(file);
            setFormData(prev => ({
                ...prev,
                [type === 'logo' ? 'logo_url' : 'cover_image_url']: url
            }));
        }
    };

    if (loading || !seller) {
        return <div className="p-8 flex items-center justify-center min-h-[60vh]"><div className="animate-spin h-8 w-8 border-4 border-brand-green-600 border-t-transparent rounded-full" /></div>;
    }

    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Store Profile</h1>
                    <p className="text-sm text-gray-500 font-medium mt-1">Manage your public storefront and business details</p>
                </div>
                <Link href="/seller/dashboard">
                    <Button variant="ghost" className="rounded-xl text-gray-500 hover:text-gray-900 bg-white border shadow-sm h-10 px-4">
                        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
                    </Button>
                </Link>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">

                {/* Branding Section */}
                <div className="bg-white rounded-[24px] border border-gray-100 p-6 sm:p-8 shadow-sm">
                    <div className="flex items-center gap-2 mb-6 text-brand-green-600">
                        <Store className="h-5 w-5" />
                        <h2 className="font-bold uppercase tracking-widest text-xs">Branding & Identity</h2>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                        {/* Custom Domain Preview */}
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-gray-800">Store Domain URL</label>
                                <div className="flex relative">
                                    <Input
                                        value={formData.store_url}
                                        onChange={e => setFormData({ ...formData, store_url: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                                        placeholder="your-store-name"
                                        className="h-12 bg-gray-50 border-gray-200 rounded-xl rounded-r-none focus-visible:ring-1 focus-visible:border-brand-green-600 font-medium text-gray-900 pr-24"
                                    />
                                    <div className="absolute right-0 h-12 flex items-center bg-gray-100 border border-gray-200 border-l-0 rounded-r-xl px-4 text-gray-500 text-sm font-semibold pointer-events-none">
                                        .fairprice.ng
                                    </div>
                                </div>
                                <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-1">
                                    <Globe className="h-3 w-3" /> Share this link with your customers to visit your store directly.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-gray-800">Business Name</label>
                                <Input
                                    value={formData.business_name}
                                    onChange={e => setFormData({ ...formData, business_name: e.target.value })}
                                    placeholder="Enter your business name"
                                    className="h-12 bg-gray-50 border-gray-200 rounded-xl focus-visible:ring-brand-green-600 focus-visible:border-brand-green-600"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-gray-800">Store Description</label>
                                <Textarea
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Describe your store to customers..."
                                    className="min-h-[100px] bg-gray-50 border-gray-200 rounded-xl resize-none focus-visible:ring-brand-green-600 focus-visible:border-brand-green-600"
                                />
                            </div>
                        </div>

                        {/* Image Uploads */}
                        <div className="space-y-6">
                            {/* Logo */}
                            <div className="space-y-3">
                                <label className="text-xs font-black uppercase tracking-widest text-gray-800">Store Logo</label>
                                <div className="flex items-center gap-5 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                    <div className="h-20 w-20 shrink-0 rounded-[18px] bg-white flex items-center justify-center border-2 border-dashed border-gray-200 overflow-hidden shadow-sm relative group">
                                        {formData.logo_url ? (
                                            <>
                                                <img src={formData.logo_url} alt="Logo" className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer" onClick={() => logoInputRef.current?.click()}>
                                                    <Upload className="h-6 w-6 text-white" />
                                                </div>
                                            </>
                                        ) : (
                                            <div className="text-center cursor-pointer" onClick={() => logoInputRef.current?.click()}>
                                                <ImageIcon className="h-8 w-8 text-gray-300 mx-auto" />
                                            </div>
                                        )}
                                        <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'logo')} />
                                    </div>
                                    <div className="space-y-2 flex-1">
                                        <p className="text-xs text-gray-500 font-medium">Recommended size: 500x500px (JPG, PNG)</p>
                                        <Button type="button" variant="outline" onClick={() => logoInputRef.current?.click()} className="h-9 hover:bg-brand-green-50 hover:text-brand-green-700 hover:border-brand-green-200 text-xs font-bold uppercase tracking-widest transition-colors w-full sm:w-auto">
                                            <Upload className="h-3 w-3 mr-2" /> Select Image
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {/* Cover */}
                            <div className="space-y-3">
                                <label className="text-xs font-black uppercase tracking-widest text-gray-800">Cover Banner</label>
                                <div className="relative h-36 w-full rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 overflow-hidden group">
                                    {formData.cover_image_url ? (
                                        <img src={formData.cover_image_url} alt="Cover" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                                            <ImageIcon className="h-10 w-10 mb-2 opacity-50" />
                                            <span className="text-xs font-medium">1200 x 400px Recommended</span>
                                        </div>
                                    )}
                                    <div className={`absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center transition-opacity ${formData.cover_image_url ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'}`}>
                                        <Button type="button" onClick={() => coverInputRef.current?.click()} variant="secondary" className="bg-white hover:bg-gray-100 text-gray-900 text-xs font-black uppercase tracking-widest h-10 px-6 rounded-xl shadow-xl transition-transform hover:scale-105">
                                            <Upload className="h-4 w-4 mr-2" /> {formData.cover_image_url ? 'Change Banner' : 'Upload Banner'}
                                        </Button>
                                        <input type="file" ref={coverInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'cover')} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Operations Section */}
                <div className="bg-white rounded-[24px] border border-gray-100 p-6 sm:p-8 shadow-sm">
                    <div className="flex items-center gap-2 mb-6 text-brand-green-600">
                        <Users className="h-5 w-5" />
                        <h2 className="font-bold uppercase tracking-widest text-xs">Business Operations</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-gray-800 flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> Physical Location</label>
                            <Input
                                value={formData.location}
                                onChange={e => setFormData({ ...formData, location: e.target.value })}
                                placeholder="E.g. Lagos, Nigeria"
                                className="h-12 bg-gray-50 border-gray-200 rounded-xl focus-visible:ring-brand-green-600 focus-visible:border-brand-green-600"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-gray-800">Supported Currencies</label>
                            <div className="grid grid-cols-2 gap-2 mt-1">
                                {["NGN (₦)", "USD ($)", "EUR (€)", "GBP (£)"].map((curr) => (
                                    <div
                                        key={curr}
                                        onClick={() => toggleCurrency(curr)}
                                        className={`border rounded-lg px-3 py-2 text-sm text-center cursor-pointer transition-all active:scale-95 select-none ${formData.currencies.includes(curr) ? "bg-brand-green-50 border-brand-green-500 text-brand-green-800 font-bold shadow-sm" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50 font-medium"}`}
                                    >
                                        {curr}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-gray-800">Weekly Orders Volume</label>
                            <select
                                value={formData.weekly_orders}
                                onChange={e => setFormData({ ...formData, weekly_orders: e.target.value })}
                                className="flex h-12 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green-600 focus-visible:border-transparent font-medium"
                            >
                                <option value="">Select an option...</option>
                                <option value="Just starting">Just starting out</option>
                                <option value="1-10">1 to 10 orders</option>
                                <option value="11-50">11 to 50 orders</option>
                                <option value="51-100">51 to 100 orders</option>
                                <option value="100+">100+ orders</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-gray-800">Staff Count</label>
                            <select
                                value={formData.staff_count}
                                onChange={e => setFormData({ ...formData, staff_count: e.target.value })}
                                className="flex h-12 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green-600 focus-visible:border-transparent font-medium"
                            >
                                <option value="">Select an option...</option>
                                <option value="Just me">Just me</option>
                                <option value="2-5">2 to 5 staff</option>
                                <option value="6-10">6 to 10 staff</option>
                                <option value="11+">11+ staff</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-gray-800">Physical Storefronts</label>
                            <select
                                value={formData.physical_stores}
                                onChange={e => setFormData({ ...formData, physical_stores: e.target.value })}
                                className="flex h-12 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green-600 focus-visible:border-transparent font-medium"
                            >
                                <option value="">Select an option...</option>
                                <option value="None (Online only)">None (Online only)</option>
                                <option value="1">1 Store</option>
                                <option value="2-3">2 to 3 Stores</option>
                                <option value="4+">4+ Stores</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Save Button */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white rounded-[24px] border border-gray-200 p-4 sm:p-6 shadow-xl sticky bottom-6 z-10 transition-all">
                    <div className="flex items-center gap-3">
                        <AnimatePresence>
                            {success && (
                                <motion.div
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    className="flex items-center gap-2 text-brand-green-700 bg-brand-green-50 px-4 py-2.5 rounded-xl font-bold uppercase tracking-wider text-[11px] border border-brand-green-200"
                                >
                                    <CheckCircle2 className="h-4 w-4" />
                                    <span>Store Settings Saved Successfully!</span>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                    <Button
                        disabled={saving}
                        className="w-full sm:w-auto bg-brand-green-600 hover:bg-brand-green-700 text-white font-black uppercase tracking-widest h-14 px-10 rounded-[16px] shadow-lg shadow-brand-green-600/30 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
                    >
                        {saving ? (
                            <div className="h-5 w-5 border-2 border-white/30 border-t-white animate-spin rounded-full" />
                        ) : (
                            <Save className="h-5 w-5" />
                        )}
                        {saving ? "Saving Changes" : "Save Changes"}
                    </Button>
                </div>
            </form>
        </div>
    );
}
