"use client";

import { useState, useEffect } from "react";
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
    Upload,
    Sparkles
} from "lucide-react";
import Link from "next/link";
import { getProxiedImageUrl } from "@/lib/utils";
import { FEATURE_SLIDE_OPTIONS, DEFAULT_HOMEPAGE_BANNERS } from "@/lib/constants";

interface Banner {
    id: string;
    title: string;
    subtitle: string;
    image_url: string;
    link: string;
    active: boolean;
    position: number;
    /** "component" is one of the animated, code-defined hero slides (see
     *  HeroBanners.tsx) — its look is fixed in code, so only whether it's
     *  included/active/ordered is editable here, not its image/copy. */
    type?: "image" | "component";
    componentId?: string;
}

const INITIAL_BANNERS: Banner[] = DEFAULT_HOMEPAGE_BANNERS.map((b, i) => ({ ...b, position: i + 1 }));

export default function BannerManagement() {
    const [banners, setBanners] = useState<Banner[]>([]);
    const [mounted, setMounted] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState("");
    const [editSubtitle, setEditSubtitle] = useState("");
    const [editLink, setEditLink] = useState("");
    const [editImageUrl, setEditImageUrl] = useState("");
    const [showAddForm, setShowAddForm] = useState(false);
    const [newType, setNewType] = useState<"image" | "component">("image");
    const [newComponentId, setNewComponentId] = useState(FEATURE_SLIDE_OPTIONS[0].componentId);
    const [newTitle, setNewTitle] = useState("");
    const [newSubtitle, setNewSubtitle] = useState("");
    const [newLink, setNewLink] = useState("");
    const [newImageUrl, setNewImageUrl] = useState("");
    const [statusMsg, setStatusMsg] = useState<string | null>(null);

    // Load from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem("ratel_homepage_banners");
        if (saved) {
            try {
                setBanners(JSON.parse(saved));
            } catch (e) {
                setBanners(INITIAL_BANNERS);
            }
        } else {
            setBanners(INITIAL_BANNERS);
        }
        setMounted(true);
    }, []);

    // Save to localStorage when banners change
    useEffect(() => {
        if (mounted) {
            localStorage.setItem("ratel_homepage_banners", JSON.stringify(banners));
        }
    }, [banners, mounted]);

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
        setEditImageUrl(banner.image_url);
    };

    const saveEdit = () => {
        setBanners(prev => prev.map(b => b.id === editingId ? { ...b, title: editTitle, subtitle: editSubtitle, link: editLink, image_url: editImageUrl } : b));
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
        if (newType === "component") {
            const opt = FEATURE_SLIDE_OPTIONS.find(f => f.componentId === newComponentId);
            if (!opt) return;
            const newBanner: Banner = {
                id: `b_${Date.now()}`,
                title: opt.defaultTitle,
                subtitle: "",
                image_url: "",
                link: "",
                active: true,
                position: banners.length + 1,
                type: "component",
                componentId: opt.componentId,
            };
            setBanners(prev => [...prev, newBanner]);
            setShowAddForm(false);
            flash("Feature slide added.");
            return;
        }
        if (!newTitle.trim()) return;
        const newBanner: Banner = {
            id: `b_${Date.now()}`,
            title: newTitle,
            subtitle: newSubtitle,
            image_url: newImageUrl || "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800",
            link: newLink || "/",
            active: true,
            position: banners.length + 1,
            type: "image",
        };
        setBanners(prev => [...prev, newBanner]);
        setShowAddForm(false);
        setNewTitle("");
        setNewSubtitle("");
        setNewLink("");
        setNewImageUrl("");
        flash("Banner added.");
    };

    if (!mounted) return null;

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

                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => setNewType("image")}
                            className={`flex-1 h-10 rounded-xl text-xs font-bold border transition-colors ${newType === "image" ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200"}`}
                        >
                            Image / GIF
                        </button>
                        <button
                            type="button"
                            onClick={() => setNewType("component")}
                            className={`flex-1 h-10 rounded-xl text-xs font-bold border transition-colors flex items-center justify-center gap-1.5 ${newType === "component" ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200"}`}
                        >
                            <Sparkles className="h-3.5 w-3.5" /> Feature Slide
                        </button>
                    </div>

                    {newType === "component" ? (
                        <>
                            <p className="text-xs text-gray-500">
                                Animated, on-brand slides for FairPrice's own features — their look is built into the app,
                                so only which ones show and in what order is editable here.
                            </p>
                            <select
                                value={newComponentId}
                                onChange={e => setNewComponentId(e.target.value)}
                                className="w-full h-11 rounded-xl border border-gray-200 px-3 text-sm font-bold"
                            >
                                {FEATURE_SLIDE_OPTIONS
                                    .filter(f => !banners.some(b => b.componentId === f.componentId))
                                    .map(f => <option key={f.componentId} value={f.componentId}>{f.label}</option>)}
                            </select>
                        </>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Input placeholder="Title" value={newTitle} onChange={e => setNewTitle(e.target.value)} className="rounded-xl" />
                                <Input placeholder="Subtitle" value={newSubtitle} onChange={e => setNewSubtitle(e.target.value)} className="rounded-xl" />
                                <Input placeholder="Link (e.g. /category/deals)" value={newLink} onChange={e => setNewLink(e.target.value)} className="rounded-xl" />
                                <Input placeholder="Image URL or GIF Link" value={newImageUrl} onChange={e => setNewImageUrl(e.target.value)} className="rounded-xl" />
                            </div>
                            {newImageUrl && (
                                <div className="mt-2 h-32 w-full max-w-md bg-gray-50 rounded-xl overflow-hidden border border-gray-100">
                                    <img src={getProxiedImageUrl(newImageUrl)} alt="Preview" className="w-full h-full object-cover" />
                                </div>
                            )}
                        </>
                    )}

                    <div className="flex gap-2 pt-2">
                        <Button
                            onClick={addBanner}
                            disabled={newType === "image" ? !newTitle.trim() : FEATURE_SLIDE_OPTIONS.every(f => banners.some(b => b.componentId === f.componentId))}
                            className="bg-brand-green-600 hover:bg-brand-green-700 text-white rounded-xl text-xs font-bold px-5"
                        >
                            Save
                        </Button>
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

                            {/* Preview — a real screenshot for an image banner; a plain
                                icon tile for a feature slide, since its actual look is
                                a live animated component, not something a static
                                thumbnail could show. */}
                            {banner.type === "component" ? (
                                <div className="h-16 w-28 bg-gray-900 rounded-xl overflow-hidden border border-gray-100 shrink-0 flex items-center justify-center">
                                    <Sparkles className="h-6 w-6 text-brand-green-400" />
                                </div>
                            ) : (
                                <div className="h-16 w-28 bg-gray-50 rounded-xl overflow-hidden border border-gray-100 shrink-0">
                                    <img src={getProxiedImageUrl(banner.image_url)} alt={banner.title} className="w-full h-full object-cover" />
                                </div>
                            )}

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                {editingId === banner.id ? (
                                    banner.type === "component" ? (
                                        <div className="flex gap-2">
                                            <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} className="h-8 text-sm rounded-lg flex-1" placeholder="Label (admin list only)" />
                                            <Button size="sm" onClick={saveEdit} className="h-8 rounded-lg text-xs bg-gray-900 hover:bg-gray-800 text-white">Save</Button>
                                            <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="h-8 rounded-lg text-xs text-gray-400">Cancel</Button>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} className="h-8 text-sm rounded-lg" placeholder="Title" />
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                <Input value={editSubtitle} onChange={e => setEditSubtitle(e.target.value)} className="h-8 text-sm rounded-lg" placeholder="Subtitle" />
                                                <Input value={editLink} onChange={e => setEditLink(e.target.value)} className="h-8 text-sm rounded-lg" placeholder="Link URL" />
                                                <Input value={editImageUrl} onChange={e => setEditImageUrl(e.target.value)} className="h-8 text-sm rounded-lg" placeholder="Image URL" />
                                            </div>
                                            <div className="flex gap-2">
                                                <Button size="sm" onClick={saveEdit} className="h-7 rounded-lg text-xs bg-gray-900 hover:bg-gray-800 text-white">Save</Button>
                                                <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="h-7 rounded-lg text-xs text-gray-400">Cancel</Button>
                                            </div>
                                        </div>
                                    )
                                ) : (
                                    <>
                                        <div className="flex items-center gap-1.5">
                                            <p className="font-bold text-sm text-gray-900 truncate">{banner.title}</p>
                                            {banner.type === "component" && (
                                                <span className="shrink-0 text-[9px] font-black uppercase tracking-widest text-brand-green-600 bg-brand-green-50 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                                    <Sparkles className="h-2.5 w-2.5" /> Feature
                                                </span>
                                            )}
                                        </div>
                                        {banner.type === "component" ? (
                                            <p className="text-xs text-gray-400 mt-0.5">Animated slide — look is fixed in the app</p>
                                        ) : (
                                            <>
                                                <p className="text-xs text-gray-500 truncate">{banner.subtitle}</p>
                                                <p className="text-[10px] text-gray-400 font-mono mt-1">{banner.link}</p>
                                            </>
                                        )}
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
