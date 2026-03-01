"use client";

import { useState, useEffect } from "react";
import {
    Search,
    Filter,
    MoreVertical,
    ShieldAlert,
    CheckCircle2,
    Eye,
    Trash2,
    Tag,
    DollarSign,
    Box,
    Flag,
    ArrowUpRight,
    ArrowDownRight,
    AlertCircle,
    Globe,
    ExternalLink,
    RefreshCw,
    Loader2,
    Edit2,
    Plus
} from "lucide-react";
import { DemoStore } from "@/lib/demo-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export default function CatalogControl() {
    const [searchTerm, setSearchTerm] = useState("");
    const [filter, setFilter] = useState<"all" | "flagged" | "fair" | "global">("all");
    const [products, setProducts] = useState<any[]>([]);

    // Edit Modal State
    const [editingProduct, setEditingProduct] = useState<any | null>(null);
    const [editName, setEditName] = useState("");
    const [editCategory, setEditCategory] = useState("");
    const [editSubcategory, setEditSubcategory] = useState("");
    const [editColors, setEditColors] = useState("");
    const [editDescription, setEditDescription] = useState("");
    const [editSpecs, setEditSpecs] = useState<{ key: string; value: string }[]>([]);
    const [editPrice, setEditPrice] = useState("");
    const [editImage, setEditImage] = useState("");
    const [editExternalUrl, setEditExternalUrl] = useState("");
    const [editImages, setEditImages] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);

    // Sync Modal State
    const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncReport, setSyncReport] = useState<any[]>([]);
    const [profitMargin, setProfitMargin] = useState("25");
    const [selectedSyncIds, setSelectedSyncIds] = useState<string[]>([]);

    useEffect(() => {
        const load = () => {
            setProducts(DemoStore.getProducts());
        };
        load();
        window.addEventListener("storage", load);
        return () => window.removeEventListener("storage", load);
    }, []);

    const filtered = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.seller_name.toLowerCase().includes(searchTerm.toLowerCase());
        const isGlobal = p.seller_name.toLowerCase().includes("global store");
        const matchesFilter = filter === "all" ||
            (filter === "flagged" && p.price_flag !== "fair") ||
            (filter === "fair" && p.price_flag === "fair") ||
            (filter === "global" && isGlobal);
        return matchesSearch && matchesFilter;
    });

    const handleDelete = (id: string) => {
        if (confirm("Are you sure you want to remove this product from the platform? This action cannot be undone.")) {
            DemoStore.deleteProduct(id);
        }
    };

    const handleEditSave = () => {
        if (editingProduct) {
            DemoStore.updateProduct(editingProduct.id, {
                name: editName || editingProduct.name,
                category: editCategory || editingProduct.category,
                subcategory: editSubcategory,
                colors: editColors.split(",").map(c => c.trim()).filter(Boolean),
                description: editDescription || editingProduct.description,
                specs: editSpecs.reduce((acc, curr) => { if (curr.key) acc[curr.key] = curr.value; return acc; }, {} as Record<string, string>),
                price: parseFloat(editPrice) || editingProduct.price,
                image_url: editImage || editingProduct.image_url,
                external_url: editExternalUrl || editingProduct.external_url,
                images: editImages ? editImages.split(",").map(s => s.trim()).filter(Boolean) : editingProduct.images || []
            });
            setEditingProduct(null);
        }
    };

    const handleAIGenerate = async () => {
        if (!editName) return;
        setIsGenerating(true);
        try {
            const res = await fetch("/api/gemini-seller", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ productName: editName, category: editCategory })
            });
            if (res.ok) {
                const content = await res.json();
                setEditDescription(content.description || editDescription);
                if (content.specs) {
                    setEditSpecs(Object.entries(content.specs).map(([key, value]) => ({ key, value: String(value) })));
                }
                setEditSubcategory(content.subcategory || editSubcategory);
                if (content.colors) setEditColors(content.colors.join(", "));
            }
        } catch (error) {
            console.error("AI Generation failed", error);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSpecChange = (index: number, field: 'key' | 'value', value: string) => {
        const newSpecs = [...editSpecs];
        newSpecs[index] = { ...newSpecs[index], [field]: value };
        setEditSpecs(newSpecs);
    };

    const handleInitiateSync = () => {
        setIsSyncModalOpen(true);
        setIsSyncing(true);
        setTimeout(() => {
            const globalProducts = products.filter(p => p.seller_name.toLowerCase().includes("global store"));
            const report = globalProducts.map(p => {
                const rawMarketPrice = p.price * (Math.random() * (1.15 - 0.85) + 0.85); // +/- 15% drift simulation
                return {
                    ...p,
                    oldPrice: p.price,
                    rawMarketPrice: rawMarketPrice,
                    suggestedPrice: rawMarketPrice * (1 + parseFloat(profitMargin) / 100)
                };
            });
            setSyncReport(report);
            setSelectedSyncIds(report.filter(r => Math.abs(r.suggestedPrice - r.oldPrice) / r.oldPrice > 0.05).map(r => r.id));
            setIsSyncing(false);
        }, 2000);
    };

    const handleMarginChange = (val: string) => {
        setProfitMargin(val);
        const num = parseFloat(val) || 0;
        setSyncReport(prev => prev.map(r => ({
            ...r,
            suggestedPrice: r.rawMarketPrice * (1 + num / 100)
        })));
    };

    const handleApplySync = () => {
        selectedSyncIds.forEach(id => {
            const item = syncReport.find(r => r.id === id);
            if (item) {
                // Round to nearest hundred
                const roundedPrice = Math.ceil(item.suggestedPrice / 100) * 100;
                DemoStore.updateProduct(id, { price: roundedPrice });
            }
        });
        setIsSyncModalOpen(false);
        setProducts(DemoStore.getProducts());
        alert("Selected global product prices successfully synced and updated.");
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-black text-gray-900 tracking-tight">Catalog Control</h2>
                    <p className="text-sm text-gray-500 font-bold uppercase tracking-wider mt-1">Platform-wide product monitoring & management</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="bg-white p-1.5 rounded-2xl border border-gray-100 flex gap-1">
                        {(["all", "global", "flagged", "fair"] as const).map((v) => (
                            <button
                                key={v}
                                onClick={() => setFilter(v)}
                                className={cn(
                                    "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                                    filter === v
                                        ? "bg-indigo-600 text-white shadow-lg"
                                        : "text-gray-400 hover:text-gray-600"
                                )}
                            >
                                {v}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                        placeholder="Search by product name, seller, or ID..."
                        className="pl-12 h-14 bg-white border border-gray-100 rounded-[20px] text-sm font-medium shadow-sm focus-visible:ring-indigo-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Button onClick={handleInitiateSync} className="h-14 px-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[20px] font-black uppercase tracking-widest text-xs shadow-lg shadow-indigo-500/20" title="Syncs prices for Global Stores items against live 3rd party APIs (e.g. Amazon, BestBuy)">
                    <Globe className="mr-2 h-4 w-4" /> Sync Global Prices
                </Button>
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-gray-100 bg-gray-50/50">
                                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Product Reference</th>
                                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Pricing Model</th>
                                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Origin / Seller</th>
                                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Trust Status</th>
                                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filtered.map((p) => {
                                const isGlobal = p.seller_name.toLowerCase().includes("global store");
                                return (
                                    <tr key={p.id} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="px-6 py-4 align-middle">
                                            <div className="flex items-center gap-4">
                                                <div className="h-16 w-16 rounded-2xl border border-gray-100 bg-white overflow-hidden flex-shrink-0 flex items-center justify-center p-1 relative">
                                                    <img src={p.image_url} alt={p.name} className="object-contain w-full h-full mix-blend-multiply" />
                                                    {p.price_flag !== "fair" && (
                                                        <div className="absolute top-1 left-1">
                                                            <div className="h-2 w-2 rounded-full bg-rose-500 shadow-sm"></div>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="min-w-0 max-w-[200px] lg:max-w-xs">
                                                    <p className="font-bold text-gray-900 text-sm truncate">{p.name}</p>
                                                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mt-1">{p.category}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 align-middle">
                                            <p className="text-base font-black text-gray-900">₦{p.price.toLocaleString()}</p>
                                            {p.original_price && (
                                                <p className="text-[11px] text-gray-400 font-bold line-through mt-0.5">₦{p.original_price.toLocaleString()}</p>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 align-middle">
                                            <div className="flex items-center gap-2">
                                                {isGlobal ? <Globe className="h-4 w-4 text-blue-500" /> : <Box className="h-4 w-4 text-gray-400" />}
                                                <p className={cn("text-xs font-bold", isGlobal ? "text-blue-700" : "text-gray-600")}>
                                                    {p.seller_name}
                                                </p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 align-middle">
                                            {isGlobal && p.external_url ? (
                                                <a href={p.external_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[11px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-xl transition-colors truncate max-w-[150px]" title={p.external_url}>
                                                    <ExternalLink className="h-3 w-3 shrink-0" />
                                                    View Source
                                                </a>
                                            ) : (
                                                <span className={cn(
                                                    "text-[10px] font-black uppercase px-2.5 py-1 rounded-full inline-flex items-center gap-1",
                                                    p.price_flag === "fair" ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
                                                        p.price_flag === "too_low" ? "bg-rose-50 text-rose-600 border border-rose-100" : "bg-amber-50 text-amber-600 border border-amber-100"
                                                )}>
                                                    {p.price_flag === "too_low" && <AlertCircle className="h-3 w-3" />}
                                                    {p.price_flag === "fair" && <CheckCircle2 className="h-3 w-3" />}
                                                    {p.price_flag}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 align-middle text-right">
                                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button asChild size="icon" variant="ghost" className="h-8 w-8 rounded-xl hover:bg-indigo-50 hover:text-indigo-600 transition-colors" title="View details">
                                                    <Link href={`/product/${p.id}`} target="_blank">
                                                        <Eye className="h-4 w-4" />
                                                    </Link>
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-8 w-8 rounded-xl hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
                                                    title="Edit product"
                                                    onClick={() => {
                                                        setEditingProduct(p);
                                                        setEditName(p.name);
                                                        setEditCategory(p.category || "");
                                                        setEditSubcategory(p.subcategory || "");
                                                        setEditColors(p.colors ? p.colors.join(", ") : "");
                                                        setEditDescription(p.description || "");
                                                        setEditSpecs(p.specs ? Object.entries(p.specs).map(([key, value]) => ({ key, value: String(value) })) : []);
                                                        setEditPrice(p.price.toString());
                                                        setEditImage(p.image_url);
                                                        setEditExternalUrl(p.external_url || "");
                                                        setEditImages(p.images?.join(", ") || "");
                                                    }}
                                                >
                                                    <Edit2 className="h-4 w-4" />
                                                </Button>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 rounded-xl hover:bg-rose-50 hover:text-rose-600 transition-colors" onClick={() => handleDelete(p.id)} title="Remove product">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>

                {filtered.length === 0 && (
                    <div className="py-24 text-center bg-gray-50/50">
                        <div className="h-16 w-16 bg-white border border-gray-100 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                            <Box className="h-8 w-8 text-gray-300" />
                        </div>
                        <h3 className="text-lg font-black text-gray-900 mt-1">No products found</h3>
                        <p className="text-sm text-gray-400 font-bold uppercase tracking-wider mt-1">Try adjusting your filters or search term</p>
                    </div>
                )}
            </div>

            {/* Sync Global Prices Interactive Report Modal */}
            <Dialog open={isSyncModalOpen} onOpenChange={setIsSyncModalOpen}>
                <DialogContent className="max-w-4xl p-0 overflow-hidden rounded-[32px] border-gray-100 max-h-[90vh] flex flex-col">
                    <div className="p-8 border-b border-gray-100 bg-gray-50/50">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                                <Globe className="h-6 w-6 text-indigo-600" /> API Synchronization Report
                            </DialogTitle>
                            <p className="text-sm font-bold text-gray-400 mt-2">Compare real-time 3rd-party market prices and factor your profit margins.</p>
                        </DialogHeader>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8">
                        {isSyncing ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <RefreshCw className="h-12 w-12 text-indigo-600 animate-spin mb-6" />
                                <h3 className="text-xl font-black text-gray-900 mb-2">Fetching Live Data from Global Suppliers</h3>
                                <p className="text-sm text-gray-500 font-bold uppercase tracking-widest">Amazon • AliExpress • BestBuy</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100">
                                    <div>
                                        <h4 className="font-black text-indigo-900">Global Profit Margin Config</h4>
                                        <p className="text-xs text-indigo-600 font-bold mt-1">Applied to raw API prices automatically ({syncReport.length} items parsed)</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <label className="text-xs font-black uppercase tracking-widest text-indigo-400">Add Margin %</label>
                                        <Input
                                            type="number"
                                            value={profitMargin}
                                            onChange={(e) => handleMarginChange(e.target.value)}
                                            className="w-24 h-12 bg-white border-none shadow-sm rounded-xl font-black text-lg text-center"
                                        />
                                    </div>
                                </div>

                                <div className="border border-gray-100 rounded-3xl overflow-hidden">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-gray-50/50 border-b border-gray-100">
                                                <th className="px-5 py-4 w-12 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedSyncIds.length === syncReport.length && syncReport.length > 0}
                                                        onChange={(e) => setSelectedSyncIds(e.target.checked ? syncReport.map(r => r.id) : [])}
                                                        className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                    />
                                                </th>
                                                <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Product</th>
                                                <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Current Price</th>
                                                <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Raw API Avg</th>
                                                <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-indigo-600">New Target (+{profitMargin}%)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50 bg-white">
                                            {syncReport.map((r) => {
                                                const diff = ((r.suggestedPrice - r.oldPrice) / r.oldPrice) * 100;
                                                const isSelected = selectedSyncIds.includes(r.id);
                                                return (
                                                    <tr key={r.id} className={cn("transition-colors", isSelected ? "bg-indigo-50/20" : "")}>
                                                        <td className="px-5 py-4 text-center">
                                                            <input
                                                                type="checkbox"
                                                                checked={isSelected}
                                                                onChange={(e) => {
                                                                    if (e.target.checked) setSelectedSyncIds([...selectedSyncIds, r.id]);
                                                                    else setSelectedSyncIds(selectedSyncIds.filter(id => id !== r.id));
                                                                }}
                                                                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                            />
                                                        </td>
                                                        <td className="px-5 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <img src={r.image_url} alt="" className="w-10 h-10 rounded-xl object-contain bg-gray-50 border border-gray-100 p-1" />
                                                                <p className="text-xs font-bold text-gray-900 line-clamp-2 max-w-[200px]">{r.name}</p>
                                                            </div>
                                                        </td>
                                                        <td className="px-5 py-4 font-bold text-gray-500 text-sm">₦{Math.round(r.oldPrice).toLocaleString()}</td>
                                                        <td className="px-5 py-4 font-bold text-gray-500 text-sm">₦{Math.round(r.rawMarketPrice).toLocaleString()}</td>
                                                        <td className="px-5 py-4">
                                                            <div className="flex flex-col">
                                                                <span className="font-black text-indigo-700 text-sm">₦{(Math.ceil(r.suggestedPrice / 100) * 100).toLocaleString()}</span>
                                                                <span className={cn(
                                                                    "text-[10px] font-bold mt-0.5 uppercase tracking-widest",
                                                                    diff > 0 ? "text-emerald-500" : diff < 0 ? "text-rose-500" : "text-gray-400"
                                                                )}>
                                                                    {diff > 0 ? "+" : ""}{diff.toFixed(1)}% {diff > 0 ? "Boost" : "Drop"}
                                                                </span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>

                    {!isSyncing && (
                        <div className="p-6 border-t border-gray-100 bg-white flex items-center justify-between">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{selectedSyncIds.length} Products Selected to Update</p>
                            <div className="flex gap-3">
                                <Button variant="ghost" onClick={() => setIsSyncModalOpen(false)} className="rounded-2xl font-bold uppercase tracking-widest text-xs h-12 text-gray-400">Cancel</Button>
                                <Button onClick={handleApplySync} disabled={selectedSyncIds.length === 0} className="rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-xs h-12 shadow-lg shadow-indigo-500/20 px-8 flex items-center gap-2">
                                    <RefreshCw className="h-4 w-4" /> Apply {selectedSyncIds.length} Updates
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Edit Modal */}
            <Dialog open={!!editingProduct} onOpenChange={(open) => !open && setEditingProduct(null)}>
                <DialogContent className="sm:max-w-lg p-0 overflow-hidden rounded-[32px] border-gray-100 max-h-[85vh] overflow-y-auto">
                    <div className="p-8">
                        <DialogHeader className="mb-6 flex flex-row items-center justify-between">
                            <div>
                                <DialogTitle className="text-2xl font-black text-gray-900 tracking-tight">Modify Details</DialogTitle>
                                <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mt-1">{editingProduct?.name}</p>
                            </div>
                            <Button
                                variant="outline"
                                className="gap-2 border-indigo-200 text-indigo-600 hover:bg-indigo-50 rounded-xl text-xs font-black uppercase tracking-widest px-4 h-9"
                                onClick={handleAIGenerate}
                                disabled={isGenerating || !editName}
                            >
                                <RefreshCw className={cn("h-3 w-3", isGenerating && "animate-spin")} />
                                {isGenerating ? "Generating..." : "AI Auto-Fill"}
                            </Button>
                        </DialogHeader>

                        <div className="space-y-6">
                            <div className="flex gap-6 items-center">
                                <div className="h-20 w-20 border border-gray-100 rounded-2xl overflow-hidden p-2 flex-shrink-0 bg-white shadow-sm">
                                    <img src={editImage || editingProduct?.image_url} alt="Preview" className="w-full h-full object-contain" onError={(e) => (e.currentTarget.src = "https://via.placeholder.com/150")} />
                                </div>
                                <div className="space-y-2 flex-1">
                                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Image Source URL</label>
                                    <Input
                                        value={editImage}
                                        onChange={(e) => setEditImage(e.target.value)}
                                        className="bg-gray-50 border-gray-100 h-12 rounded-xl text-sm font-medium"
                                        placeholder="https://..."
                                    />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Product Name</label>
                                        <Input
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            className="bg-gray-50 border-gray-100 h-10 rounded-xl text-sm font-bold"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Category</label>
                                        <select
                                            className="w-full bg-gray-50 border border-gray-100 h-10 rounded-xl text-sm font-bold px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            value={editCategory}
                                            onChange={(e) => setEditCategory(e.target.value)}
                                        >
                                            <option value="">Select Category</option>
                                            <option value="phones">Phones & Tablets</option>
                                            <option value="electronics">Electronics</option>
                                            <option value="vehicles">Vehicles</option>
                                            <option value="energy">Green Energy</option>
                                            <option value="fashion">Fashion</option>
                                            <option value="health">Health & Beauty</option>
                                            <option value="home">Home & Living</option>
                                            <option value="baby">Baby & Kids</option>
                                            <option value="fitness">Sports & Fitness</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Subcategory</label>
                                        <Input
                                            value={editSubcategory}
                                            onChange={(e) => setEditSubcategory(e.target.value)}
                                            className="bg-gray-50 border-gray-100 h-10 rounded-xl text-sm font-bold"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Colors</label>
                                        <Input
                                            value={editColors}
                                            onChange={(e) => setEditColors(e.target.value)}
                                            className="bg-gray-50 border-gray-100 h-10 rounded-xl text-sm font-bold"
                                            placeholder="Comma separated"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Description</label>
                                    <textarea
                                        value={editDescription}
                                        onChange={(e) => setEditDescription(e.target.value)}
                                        className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3 text-sm min-h-[100px] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest block mb-2">Specifications</label>
                                    <div className="space-y-2">
                                        {editSpecs.map((spec, i) => (
                                            <div key={i} className="flex gap-2">
                                                <Input value={spec.key} onChange={e => handleSpecChange(i, 'key', e.target.value)} placeholder="Key" className="bg-gray-50 h-9 text-xs font-bold" />
                                                <Input value={spec.value} onChange={e => handleSpecChange(i, 'value', e.target.value)} placeholder="Value" className="bg-gray-50 h-9 text-xs min-w-[150px]" />
                                                <Button size="icon" variant="ghost" onClick={() => setEditSpecs(editSpecs.filter((_, idx) => idx !== i))} className="h-9 w-9 text-rose-500 shrink-0"><Trash2 className="h-4 w-4" /></Button>
                                            </div>
                                        ))}
                                    </div>
                                    <Button variant="outline" size="sm" onClick={() => setEditSpecs([...editSpecs, { key: '', value: '' }])} className="text-xs h-8 mt-2 w-full border-dashed"><Plus className="h-3 w-3 mr-1" /> Add Spec</Button>
                                </div>

                                <div className="space-y-2 pt-4 border-t border-gray-100">
                                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Target Price (₦)</label>
                                    <Input
                                        type="number"
                                        value={editPrice}
                                        onChange={(e) => setEditPrice(e.target.value)}
                                        className="bg-gray-50 border-gray-100 h-10 rounded-xl text-lg font-black"
                                        placeholder="Enter new price"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Source Product Link</label>
                                    {editExternalUrl ? (
                                        <a href={editExternalUrl} target="_blank" rel="noreferrer" className="block text-sm text-blue-600 truncate bg-gray-50 p-3 rounded-xl border border-gray-100 hover:underline">
                                            {editExternalUrl}
                                        </a>
                                    ) : editingProduct?.id ? (
                                        <a href={`/product/${editingProduct.id}`} target="_blank" rel="noreferrer" className="block text-sm text-blue-600 truncate bg-gray-50 p-3 rounded-xl border border-gray-100 hover:underline">
                                            /product/{editingProduct.id}
                                        </a>
                                    ) : (
                                        <p className="text-sm text-gray-400 italic bg-gray-50 p-3 rounded-xl border border-gray-100">No external source available.</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Gallery Images (Comma separated URLs)</label>
                                    <textarea
                                        value={editImages}
                                        onChange={(e) => setEditImages(e.target.value)}
                                        className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3 text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="https://img1.com, https://img2.com..."
                                    />
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="mt-8 gap-3 sm:gap-0">
                            <Button variant="ghost" onClick={() => setEditingProduct(null)} className="rounded-2xl font-bold uppercase tracking-widest text-xs h-12 text-gray-400">Cancel</Button>
                            <Button onClick={handleEditSave} className="rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-xs h-12 shadow-lg shadow-indigo-500/20 px-8">Update Product</Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
