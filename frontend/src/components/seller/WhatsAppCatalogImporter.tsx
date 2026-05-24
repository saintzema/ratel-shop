"use client";

import { useState } from "react";
import { MessageCircle, Download, Loader2, CheckCircle2, AlertCircle, Sparkles, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { DataSyncService } from "@/lib/sync-store";
import { CountryCodeSelect } from "@/components/ui/CountryCodeSelect";

export function WhatsAppCatalogImporter() {
    const [countryCode, setCountryCode] = useState("+234");
    const [phone, setPhone] = useState("");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState("");
    const [importedProducts, setImportedProducts] = useState<any[]>([]);

    const handleImport = async () => {
        const cleanPhone = phone.replace(/\D/g, "");
        if (cleanPhone.length < 6) {
            setError("Please enter a valid phone number.");
            return;
        }

        // Build E.164 digits: strip leading 0 for NG (+234), prepend country code digits
        const dialDigits = countryCode.replace(/^\+/, "");
        const localDigits = dialDigits === "234" && cleanPhone.startsWith("0")
            ? cleanPhone.slice(1)
            : cleanPhone;
        const e164 = `${dialDigits}${localDigits}`;

        const url = `https://wa.me/c/${e164}`;
        
        setLoading(true);
        setError("");
        
        try {
            const response = await fetch("/api/whatsapp/sync", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone: e164 })
            });
            
            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || "Failed to sync catalog");
            }

            const data = await response.json();
            setImportedProducts(data.products || []);
            setSuccess(true);
            
            if (data.products?.length === 0) {
                setError("We couldn't find any public products in this WhatsApp catalog.");
            }
        } catch (err: any) {
            setError(err.message || "Failed to reach WhatsApp. Please check the number and try again.");
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
                    <p className="text-xs text-gray-500 font-medium">Enter your WhatsApp number to import products.</p>
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex gap-2">
                    <CountryCodeSelect value={countryCode} onChange={setCountryCode} />
                    <div className="relative flex-1">
                        <Input
                            placeholder="8012345678"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                            className="h-14 rounded-2xl pr-32 border-gray-200 focus:ring-emerald-500"
                        />
                        <button
                            onClick={handleImport}
                            disabled={loading || !phone}
                            className="absolute right-2 top-2 bottom-2 bg-emerald-600 text-white px-6 rounded-xl font-black text-xs uppercase tracking-widest disabled:opacity-50 transition-all hover:bg-emerald-700 active:scale-95 cursor-pointer"
                        >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sync Now"}
                        </button>
                    </div>
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
