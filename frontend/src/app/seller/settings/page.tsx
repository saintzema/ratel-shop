"use client";

import { useEffect, useState } from "react";
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
    ArrowLeft
} from "lucide-react";
import Link from "next/link";

export default function SellerSettingsPage() {
    const router = useRouter();
    const [seller, setSeller] = useState<Seller | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);

    const [formData, setFormData] = useState({
        business_name: "",
        description: "",
        logo_url: "",
        cover_image_url: ""
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
            cover_image_url: s.cover_image_url || ""
        });
        setLoading(loading => false);
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

    if (loading || !seller) {
        return <div className="p-8 text-center animate-pulse">Loading settings...</div>;
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-20">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Store Settings</h1>
                    <p className="text-sm text-gray-500 font-bold uppercase tracking-wider mt-1">Personalize your public storefront</p>
                </div>
                <Link href="/seller/dashboard">
                    <Button variant="ghost" className="rounded-xl text-gray-500 hover:text-gray-900">
                        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
                    </Button>
                </Link>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Branding Section */}
                <div className="bg-white rounded-[32px] border border-gray-100 p-8 shadow-sm">
                    <div className="flex items-center gap-2 mb-6 text-indigo-600">
                        <Store className="h-5 w-5" />
                        <h2 className="font-bold uppercase tracking-widest text-xs">General Branding</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-gray-400">Store Name</label>
                                <Input
                                    value={formData.business_name}
                                    onChange={e => setFormData({ ...formData, business_name: e.target.value })}
                                    placeholder="Enter your business name"
                                    className="h-12 bg-gray-50 border-gray-100 rounded-xl"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-gray-400">Store Description</label>
                                <Textarea
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Describe your store to customers..."
                                    className="min-h-[120px] bg-gray-50 border-gray-100 rounded-xl resize-none"
                                />
                            </div>
                        </div>

                        <div className="space-y-6">
                            {/* Logo Upload Simulation */}
                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-gray-400">Store Logo</label>
                                <div className="flex items-center gap-4">
                                    <div className="h-20 w-20 rounded-2xl bg-gray-100 flex items-center justify-center border-2 border-dashed border-gray-200 overflow-hidden">
                                        {formData.logo_url ? (
                                            <img src={formData.logo_url} alt="Logo" className="w-full h-full object-contain" />
                                        ) : (
                                            <ImageIcon className="h-8 w-8 text-gray-300" />
                                        )}
                                    </div>
                                    <div className="space-y-2 flex-1">
                                        <Input
                                            value={formData.logo_url}
                                            onChange={e => setFormData({ ...formData, logo_url: e.target.value })}
                                            placeholder="Logo URL (simulation)"
                                            className="h-10 bg-gray-50 border-gray-100 rounded-lg text-xs"
                                        />
                                        <Button type="button" variant="outline" className="h-8 text-[10px] font-black uppercase tracking-widest border-dashed">
                                            <Upload className="h-3 w-3 mr-2" /> Upload Icon
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {/* Cover Image Simulation */}
                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-gray-400">Cover Banner</label>
                                <div className="relative h-24 w-full rounded-2xl bg-gray-100 flex items-center justify-center border-2 border-dashed border-gray-200 overflow-hidden">
                                    {formData.cover_image_url ? (
                                        <img src={formData.cover_image_url} alt="Cover" className="w-full h-full object-cover opacity-50" />
                                    ) : (
                                        <ImageIcon className="h-8 w-8 text-gray-300" />
                                    )}
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <Button type="button" variant="secondary" className="bg-white/90 backdrop-blur-sm text-xs font-black uppercase tracking-widest h-8 px-4 border shadow-sm">
                                            Change Cover
                                        </Button>
                                    </div>
                                </div>
                                <Input
                                    value={formData.cover_image_url}
                                    onChange={e => setFormData({ ...formData, cover_image_url: e.target.value })}
                                    placeholder="Cover URL (simulation)"
                                    className="h-10 bg-gray-50 border-gray-100 rounded-lg text-xs mt-2"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Save Button */}
                <div className="flex items-center justify-between bg-white rounded-[28px] border border-gray-100 p-6 shadow-xl">
                    <div className="flex items-center gap-3">
                        {success && (
                            <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-4 py-2 rounded-xl animate-in fade-in slide-in-from-left-4 duration-300">
                                <CheckCircle2 className="h-4 w-4" />
                                <span className="text-xs font-bold uppercase tracking-wider">Settings Saved Successfully!</span>
                            </div>
                        )}
                    </div>
                    <Button
                        disabled={saving}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest h-12 px-10 rounded-2xl shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2"
                    >
                        {saving ? (
                            <div className="h-4 w-4 border-2 border-white/30 border-t-white animate-spin rounded-full" />
                        ) : (
                            <Save className="h-4 w-4" />
                        )}
                        {saving ? "Saving Changes..." : "Save Store Settings"}
                    </Button>
                </div>
            </form>
        </div>
    );
}
