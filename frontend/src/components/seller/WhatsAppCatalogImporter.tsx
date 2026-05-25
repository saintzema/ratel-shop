"use client";

import { useState } from "react";
import {
    Package, Plus, X, CheckCircle2, Loader2, ChevronDown, ChevronUp,
    Pencil, UploadCloud,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { DataSyncService } from "@/lib/sync-store";

const CATEGORIES = [
    "electronics", "fashion", "home", "food", "beauty",
    "sports", "automotive", "services", "general"
];

const BLANK_PRODUCT = () => ({
    name: "",
    price: "",
    category: "general",
    description: "",
    image_url: "",
    stock: "10",
});

export function WhatsAppCatalogImporter() {
    const [expanded, setExpanded] = useState(false);
    const [products, setProducts] = useState([BLANK_PRODUCT()]);
    const [saving, setSaving] = useState(false);
    const [savedCount, setSavedCount] = useState(0);
    const [error, setError] = useState("");

    const authHeaders = (): Record<string, string> => {
        const token = typeof window !== "undefined" ? localStorage.getItem("fp_token") : null;
        const h: Record<string, string> = { "Content-Type": "application/json" };
        if (token) h["Authorization"] = `Bearer ${token}`;
        return h;
    };

    const updateProduct = (i: number, field: string, value: string) => {
        setProducts(prev => prev.map((p, idx) => idx === i ? { ...p, [field]: value } : p));
    };

    const addRow = () => setProducts(prev => [...prev, BLANK_PRODUCT()]);
    const removeRow = (i: number) => setProducts(prev => prev.filter((_, idx) => idx !== i));

    const handleSave = async () => {
        const valid = products.filter(p => p.name.trim() && p.price);
        if (!valid.length) {
            setError("Add at least one product with a name and price.");
            return;
        }
        setError("");
        setSaving(true);

        try {
            const res = await fetch("/api/whatsapp/sync", {
                method: "POST",
                headers: authHeaders(),
                body: JSON.stringify({
                    products: valid.map(p => ({
                        name: p.name.trim(),
                        price: Number(p.price),
                        category: p.category,
                        description: p.description.trim(),
                        image_url: p.image_url.trim(),
                        stock: Number(p.stock) || 10,
                    })),
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || `Error ${res.status}`);
                return;
            }

            // Also persist to local sync so product list refreshes immediately
            const sellerId = DataSyncService.getCurrentSellerId();
            if (sellerId) {
                const seller = DataSyncService.getCurrentSeller();
                valid.forEach(p => {
                    DataSyncService.addProduct({
                        name: p.name.trim(),
                        price: Number(p.price),
                        original_price: Number(p.price),
                        category: p.category as any,
                        description: p.description.trim(),
                        image_url: p.image_url.trim() || "/assets/images/placeholder.png",
                        images: p.image_url.trim() ? [p.image_url.trim()] : [],
                        stock: Number(p.stock) || 10,
                        is_active: true,
                        avg_rating: 0,
                        review_count: 0,
                        sold_count: 0,
                    } as any);
                });
            }

            setSavedCount(data.created ?? valid.length);
            setProducts([BLANK_PRODUCT()]);
            setTimeout(() => { setSavedCount(0); setExpanded(false); }, 3000);
        } catch (err: any) {
            setError(err.message || "Network error. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
            {/* Header — always visible, click to expand */}
            <button
                onClick={() => setExpanded(v => !v)}
                className="w-full flex items-center justify-between p-6 sm:p-8 hover:bg-gray-50/60 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-50 rounded-xl">
                        <Package className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div className="text-left">
                        <h3 className="text-base font-black text-gray-900">Quick Product Add</h3>
                        <p className="text-xs text-gray-400 font-medium">Add products to your inventory instantly</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {savedCount > 0 && (
                        <span className="flex items-center gap-1.5 text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-widest">
                            <CheckCircle2 className="h-3 w-3" /> {savedCount} saved
                        </span>
                    )}
                    {expanded
                        ? <ChevronUp className="h-5 w-5 text-gray-400" />
                        : <ChevronDown className="h-5 w-5 text-gray-400" />}
                </div>
            </button>

            {/* Expandable body — fixed max-height so it never pushes the QR down */}
            <AnimatePresence initial={false}>
                {expanded && (
                    <motion.div
                        key="body"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                        className="overflow-hidden"
                    >
                        <div className="px-6 sm:px-8 pb-8 space-y-4">
                            {/* Scrollable product list — max-height keeps layout stable */}
                            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                                {products.map((p, i) => (
                                    <div key={i} className="flex flex-col sm:flex-row gap-3 bg-gray-50 rounded-2xl p-4 border border-gray-100">
                                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {/* Name */}
                                            <Input
                                                placeholder="Product name *"
                                                value={p.name}
                                                onChange={e => updateProduct(i, "name", e.target.value)}
                                                className="h-11 rounded-xl border-gray-200 font-bold text-sm"
                                            />
                                            {/* Price */}
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-black text-sm">₦</span>
                                                <Input
                                                    type="number"
                                                    placeholder="Price *"
                                                    value={p.price}
                                                    onChange={e => updateProduct(i, "price", e.target.value)}
                                                    className="h-11 pl-8 rounded-xl border-gray-200 font-bold text-sm"
                                                />
                                            </div>
                                            {/* Category */}
                                            <select
                                                value={p.category}
                                                onChange={e => updateProduct(i, "category", e.target.value)}
                                                className="h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm font-bold outline-none focus:border-emerald-500 cursor-pointer"
                                            >
                                                {CATEGORIES.map(c => (
                                                    <option key={c} value={c} className="capitalize">{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                                                ))}
                                            </select>
                                            {/* Stock */}
                                            <Input
                                                type="number"
                                                placeholder="Stock qty"
                                                value={p.stock}
                                                onChange={e => updateProduct(i, "stock", e.target.value)}
                                                className="h-11 rounded-xl border-gray-200 font-bold text-sm"
                                            />
                                            {/* Image URL */}
                                            <Input
                                                placeholder="Image URL (optional)"
                                                value={p.image_url}
                                                onChange={e => updateProduct(i, "image_url", e.target.value)}
                                                className="h-11 rounded-xl border-gray-200 text-sm sm:col-span-2"
                                            />
                                            {/* Description */}
                                            <Input
                                                placeholder="Short description"
                                                value={p.description}
                                                onChange={e => updateProduct(i, "description", e.target.value)}
                                                className="h-11 rounded-xl border-gray-200 text-sm sm:col-span-2"
                                            />
                                        </div>
                                        {products.length > 1 && (
                                            <button
                                                onClick={() => removeRow(i)}
                                                className="self-start h-10 w-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition-all shrink-0"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Add another row */}
                            <button
                                onClick={addRow}
                                className="w-full h-11 rounded-xl border-2 border-dashed border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/30 text-gray-400 hover:text-emerald-600 font-bold text-sm transition-all flex items-center justify-center gap-2"
                            >
                                <Plus className="h-4 w-4" /> Add another product
                            </button>

                            {error && (
                                <p className="text-xs font-bold text-red-600 bg-red-50 border border-red-100 px-4 py-3 rounded-xl">
                                    {error}
                                </p>
                            )}

                            {/* Save */}
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-black text-sm uppercase tracking-widest transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-emerald-200"
                            >
                                {saving ? (
                                    <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
                                ) : (
                                    <><UploadCloud className="h-4 w-4" /> Save to Inventory</>
                                )}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
