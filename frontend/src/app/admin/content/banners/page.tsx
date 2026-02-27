"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Image as ImageIcon,
    Plus,
    Edit2,
    Trash2,
    Eye,
    EyeOff,
    ChevronLeft,
    GripVertical,
    Upload
} from "lucide-react";
import Link from "next/link";

interface Banner {
    id: string;
    title: string;
    subtitle: string;
    image_url: string;
    link: string;
    active: boolean;
    position: number;
}

const INITIAL_BANNERS: Banner[] = [
    { id: "b1", title: "Mega Sale — Up to 70% Off", subtitle: "Electronics, fashion & more", image_url: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800", link: "/category/deals", active: true, position: 1 },
    { id: "b2", title: "New Arrivals This Week", subtitle: "Discover trending products", image_url: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800", link: "/category/new", active: true, position: 2 },
    { id: "b3", title: "Free Shipping Over ₦50,000", subtitle: "Nationwide delivery", image_url: "https://images.unsplash.com/photo-1586880244406-556ebe35f282?w=800", link: "/shipping", active: false, position: 3 },
    { id: "b4", title: "Gadget Festival", subtitle: "Best prices on phones & accessories", image_url: "https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=800", link: "/category/electronics", active: true, position: 4 },
];

export default function BannerManagement() {
    const [banners, setBanners] = useState<Banner[]>(INITIAL_BANNERS);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState("");
    const [editSubtitle, setEditSubtitle] = useState("");
    const [editLink, setEditLink] = useState("");
    const [showAddForm, setShowAddForm] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [newSubtitle, setNewSubtitle] = useState("");
    const [newLink, setNewLink] = useState("");
    const [statusMsg, setStatusMsg] = useState<string | null>(null);

    const flash = (msg: string) => {
        setStatusMsg(msg);
        setTimeout(() => setStatusMsg(null), 2500);
    };

    const toggleActive = (id: string) => {
        setBanners(prev => prev.map(b => b.id === id ? { ...b, active: !b.active } : b));
        flash("Banner visibility updated.");
    };

    const startEditing = (banner: Banner) => {
        setEditingId(banner.id);
        setEditTitle(banner.title);
        setEditSubtitle(banner.subtitle);
        setEditLink(banner.link);
    };

    const saveEdit = () => {
        setBanners(prev => prev.map(b => b.id === editingId ? { ...b, title: editTitle, subtitle: editSubtitle, link: editLink } : b));
        setEditingId(null);
        flash("Banner updated.");
    };

    const deleteBanner = (id: string) => {
        if (confirm("Delete this banner?")) {
            setBanners(prev => prev.filter(b => b.id !== id));
            flash("Banner deleted.");
        }
    };

    const addBanner = () => {
        if (!newTitle.trim()) return;
        const newBanner: Banner = {
            id: `b_${Date.now()}`,
            title: newTitle,
            subtitle: newSubtitle,
            image_url: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800",
            link: newLink || "/",
            active: true,
            position: banners.length + 1,
        };
        setBanners(prev => [...prev, newBanner]);
        setShowAddForm(false);
        setNewTitle("");
        setNewSubtitle("");
        setNewLink("");
        flash("Banner added.");
    };

    return (
        <div className="space-y-8 max-w-5xl">
            <div className="flex items-center justify-between">
                <div>
                    <Link href="/admin/settings" className="inline-flex items-center gap-1 text-xs font-bold text-gray-400 hover:text-gray-600 mb-3">
                        <ChevronLeft className="h-3 w-3" /> Back to Settings
                    </Link>
                    <h2 className="text-3xl font-black text-gray-900 tracking-tight">Homepage Banners</h2>
                    <p className="text-sm text-gray-500 font-bold uppercase tracking-wider mt-1">Manage hero carousels and promotional banners</p>
                </div>
                <Button onClick={() => setShowAddForm(!showAddForm)} className="bg-brand-green-600 hover:bg-brand-green-700 text-white rounded-xl font-bold text-xs px-5 h-10">
                    <Plus className="h-4 w-4 mr-1.5" /> Add Banner
                </Button>
            </div>

            {/* Add Form */}
            {showAddForm && (
                <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
                    <h3 className="font-bold text-gray-900">New Banner</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <Input placeholder="Title" value={newTitle} onChange={e => setNewTitle(e.target.value)} className="rounded-xl" />
                        <Input placeholder="Subtitle" value={newSubtitle} onChange={e => setNewSubtitle(e.target.value)} className="rounded-xl" />
                        <Input placeholder="Link (e.g. /category/deals)" value={newLink} onChange={e => setNewLink(e.target.value)} className="rounded-xl" />
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={addBanner} disabled={!newTitle.trim()} className="bg-brand-green-600 hover:bg-brand-green-700 text-white rounded-xl text-xs font-bold px-5">Save</Button>
                        <Button variant="ghost" onClick={() => setShowAddForm(false)} className="rounded-xl text-xs font-bold text-gray-400">Cancel</Button>
                    </div>
                </div>
            )}

            {/* Banner List */}
            <div className="space-y-3">
                {banners.map((banner, idx) => (
                    <div key={banner.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden group hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-4 p-4">
                            {/* Drag Handle */}
                            <GripVertical className="h-4 w-4 text-gray-300 cursor-grab" />

                            {/* Image Preview */}
                            <div className="h-16 w-28 bg-gray-50 rounded-xl overflow-hidden border border-gray-100 shrink-0">
                                <img src={banner.image_url} alt={banner.title} className="w-full h-full object-cover" />
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                {editingId === banner.id ? (
                                    <div className="space-y-2">
                                        <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} className="h-8 text-sm rounded-lg" />
                                        <div className="flex gap-2">
                                            <Input value={editSubtitle} onChange={e => setEditSubtitle(e.target.value)} className="h-8 text-sm rounded-lg" placeholder="Subtitle" />
                                            <Input value={editLink} onChange={e => setEditLink(e.target.value)} className="h-8 text-sm rounded-lg" placeholder="Link URL" />
                                        </div>
                                        <div className="flex gap-2">
                                            <Button size="sm" onClick={saveEdit} className="h-7 rounded-lg text-xs bg-gray-900 hover:bg-gray-800 text-white">Save</Button>
                                            <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="h-7 rounded-lg text-xs text-gray-400">Cancel</Button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <p className="font-bold text-sm text-gray-900 truncate">{banner.title}</p>
                                        <p className="text-xs text-gray-500 truncate">{banner.subtitle}</p>
                                        <p className="text-[10px] text-gray-400 font-mono mt-1">{banner.link}</p>
                                    </>
                                )}
                            </div>

                            {/* Status */}
                            <Badge className={`shrink-0 ${banner.active ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" : "bg-gray-100 text-gray-500 hover:bg-gray-100"} border-none text-[10px] font-bold`}>
                                {banner.active ? "Active" : "Hidden"}
                            </Badge>

                            {/* Actions */}
                            <div className="flex items-center gap-1 shrink-0">
                                <button onClick={() => toggleActive(banner.id)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title={banner.active ? "Hide" : "Show"}>
                                    {banner.active ? <Eye className="h-4 w-4 text-gray-400" /> : <EyeOff className="h-4 w-4 text-gray-300" />}
                                </button>
                                <button onClick={() => startEditing(banner)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Edit">
                                    <Edit2 className="h-4 w-4 text-gray-400" />
                                </button>
                                <button onClick={() => deleteBanner(banner.id)} className="p-2 hover:bg-rose-50 rounded-lg transition-colors" title="Delete">
                                    <Trash2 className="h-4 w-4 text-gray-300 hover:text-rose-500" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Status Toast */}
            {statusMsg && (
                <div className="fixed bottom-6 right-6 bg-gray-900 text-white px-6 py-3.5 rounded-2xl shadow-2xl text-sm font-bold z-50">
                    {statusMsg}
                </div>
            )}
        </div>
    );
}
