"use client";

import { useState } from "react";
import { MessageCircle, Download, Loader2, CheckCircle2, AlertCircle, Sparkles, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { DataSyncService } from "@/lib/sync-store";

export function WhatsAppCatalogImporter() {
    const [url, setUrl] = useState("");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState("");
    const [importedProducts, setImportedProducts] = useState<any[]>([]);

    const handleImport = async () => {
        if (!url.includes("whatsapp.com")) {
            setError("Please enter a valid WhatsApp Catalog link.");
            return;
        }

        setLoading(true);
        setError("");
        
        try {
            // Simulate AI-assisted scraping of the WhatsApp Catalog
            // In a real implementation, this would call a backend scraper
            await new Promise(resolve => setTimeout(resolve, 2500));
            
            const mockProducts = [
                {
                    name: "Imported Item 1",
                    price: 15000,
                    category: "electronics",
                    description: "High quality item imported from your WhatsApp catalog.",
                    image_url: "/assets/images/placeholder.png"
                },
                {
                    name: "Imported Item 2",
                    price: 25000,
                    category: "fashion",
                    description: "Elegant fashion piece from your store.",
                    image_url: "/assets/images/placeholder.png"
                }
            ];

            setImportedProducts(mockProducts);
            setSuccess(true);
        } catch (err) {
            setError("Failed to reach WhatsApp. Please check the link and try again.");
        } finally {
            setLoading(false);
        }
    };

    const saveToInventory = (product: any) => {
        const sellerId = DataSyncService.getCurrentSellerId();
        if (!sellerId) return;

        DataSyncService.addProduct({
            ...product,
            seller_id: sellerId,
            is_active: true,
            stock: 10
        });

        setImportedProducts(prev => prev.filter(p => p !== product));
    };

    return (
        <div className="bg-white rounded-[32px] border border-gray-100 p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-emerald-50 rounded-xl">
                    <MessageCircle className="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                    <h3 className="text-xl font-black text-gray-900 leading-tight">WhatsApp Catalog Sync</h3>
                    <p className="text-xs text-gray-500 font-medium">Import your products directly from WhatsApp Business.</p>
                </div>
            </div>

            <div className="space-y-4">
                <div className="relative">
                    <Input 
                        placeholder="https://wa.me/c/2348012345678"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        className="h-14 rounded-2xl pl-12 pr-32 border-gray-200 focus:ring-emerald-500"
                    />
                    <MessageCircle className="absolute left-4 top-4 h-6 w-6 text-gray-300" />
                    <button 
                        onClick={handleImport}
                        disabled={loading || !url}
                        className="absolute right-2 top-2 bottom-2 bg-emerald-600 text-white px-6 rounded-xl font-black text-xs uppercase tracking-widest disabled:opacity-50 transition-all hover:bg-emerald-700 active:scale-95"
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sync Now"}
                    </button>
                </div>

                <AnimatePresence>
                    {error && (
                        <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="flex items-center gap-2 text-red-500 text-xs font-bold bg-red-50 p-3 rounded-xl"
                        >
                            <AlertCircle className="h-4 w-4" />
                            {error}
                        </motion.div>
                    )}
                </AnimatePresence>

                {importedProducts.length > 0 && (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-8 space-y-4"
                    >
                        <div className="flex items-center justify-between">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Products Found ({importedProducts.length})</h4>
                            <span className="flex items-center gap-1 text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                                <Sparkles className="h-3 w-3" /> AI Assisted Parsing
                            </span>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-3">
                            {importedProducts.map((p, i) => (
                                <div key={i} className="flex flex-col gap-4 bg-gray-50 p-6 rounded-3xl border border-gray-100 group hover:border-emerald-200 transition-all shadow-sm">
                                    <div className="flex items-center gap-4">
                                        <div className="h-16 w-16 bg-white rounded-2xl border border-gray-100 shrink-0 overflow-hidden flex items-center justify-center p-1 shadow-inner">
                                            <img src={p.image_url} alt="" className="w-full h-full object-cover rounded-xl" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <input 
                                                value={p.name}
                                                onChange={(e) => {
                                                    const next = [...importedProducts];
                                                    next[i].name = e.target.value;
                                                    setImportedProducts(next);
                                                }}
                                                className="bg-transparent font-black text-gray-900 truncate w-full outline-none focus:ring-2 ring-emerald-500/20 rounded-md px-1"
                                            />
                                            <div className="flex items-center gap-1 mt-1">
                                                <span className="text-emerald-600 font-black text-sm">₦</span>
                                                <input 
                                                    type="number"
                                                    value={p.price}
                                                    onChange={(e) => {
                                                        const next = [...importedProducts];
                                                        next[i].price = parseInt(e.target.value) || 0;
                                                        setImportedProducts(next);
                                                    }}
                                                    className="bg-transparent text-emerald-600 font-black text-sm w-24 outline-none focus:ring-2 ring-emerald-500/20 rounded-md px-1"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button 
                                                onClick={() => saveToInventory(p)}
                                                className="h-12 px-5 rounded-2xl bg-emerald-600 text-white flex items-center justify-center gap-2 font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all active:scale-95 shadow-lg shadow-emerald-200"
                                            >
                                                <Plus className="h-4 w-4" /> Save
                                            </button>
                                            <button 
                                                onClick={() => setImportedProducts(prev => prev.filter((_, idx) => idx !== i))}
                                                className="h-12 w-12 rounded-2xl bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition-all active:scale-90"
                                            >
                                                <X className="h-5 w-5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </div>

            <div className="mt-8 p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                <p className="text-[10px] text-emerald-800/70 font-bold leading-relaxed">
                    <strong>Tip:</strong> Ziva AI can automatically keep your WhatsApp catalog and FairPrice inventory in sync. Every time you update a price on WhatsApp, we'll suggest an update here!
                </p>
            </div>
        </div>
    );
}
