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
    AlertCircle
} from "lucide-react";
import { DemoStore } from "@/lib/demo-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import Image from "next/image";

export default function CatalogControl() {
    const [searchTerm, setSearchTerm] = useState("");
    const [filter, setFilter] = useState<"all" | "flagged" | "fair">("all");
    const [products, setProducts] = useState<any[]>([]);

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
        const matchesFilter = filter === "all" || (filter === "flagged" && p.price_flag !== "fair") || (filter === "fair" && p.price_flag === "fair");
        return matchesSearch && matchesFilter;
    });

    const handleDelete = (id: string) => {
        if (confirm("Are you sure you want to remove this product from the platform? This action cannot be undone.")) {
            DemoStore.deleteProduct(id);
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-black text-gray-900 tracking-tight">Catalog Control</h2>
                    <p className="text-sm text-gray-500 font-bold uppercase tracking-wider mt-1">Platform-wide product monitoring & safety</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="bg-white p-1.5 rounded-2xl border border-gray-100 flex gap-1">
                        {(["all", "flagged", "fair"] as const).map((v) => (
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
                        className="pl-12 h-14 bg-white border-gray-100 rounded-[20px] text-sm font-medium shadow-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Button className="h-14 px-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[20px] font-black uppercase tracking-widest text-xs shadow-lg shadow-indigo-500/20">
                    <Tag className="mr-2 h-4 w-4" /> Global Price Update
                </Button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {filtered.map((p) => (
                    <div key={p.id} className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 transition-all group">
                        <div className="flex gap-6">
                            <div className="h-32 w-32 rounded-3xl overflow-hidden relative border border-gray-50 flex-shrink-0 bg-gray-50">
                                <img src={p.image_url} alt={p.name} className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-500" />
                                {p.price_flag !== "fair" && (
                                    <div className="absolute top-2 left-2">
                                        <div className={cn(
                                            "p-1.5 rounded-xl shadow-lg",
                                            p.price_flag === "suspicious" ? "bg-rose-500 text-white" : "bg-amber-500 text-white"
                                        )}>
                                            <ShieldAlert className="h-4 w-4" />
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0 flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{p.category}</span>
                                        <div className="flex items-center gap-1">
                                            <span className={cn(
                                                "text-[9px] font-black uppercase px-2 py-0.5 rounded-full",
                                                p.price_flag === "fair" ? "bg-emerald-50 text-emerald-600" :
                                                    p.price_flag === "suspicious" ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-amber-600"
                                            )}>
                                                {p.price_flag} price
                                            </span>
                                        </div>
                                    </div>
                                    <h4 className="font-bold text-gray-900 text-lg truncate mb-1">{p.name}</h4>
                                    <p className="text-[11px] text-gray-400 font-bold uppercase">Seller: {p.seller_name}</p>
                                </div>
                                <div className="flex items-end justify-between">
                                    <div className="space-y-1">
                                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Pricing</p>
                                        <div className="flex items-center gap-3">
                                            <span className="text-xl font-black text-gray-900">₦{p.price.toLocaleString()}</span>
                                            {p.original_price && (
                                                <span className="text-sm text-gray-300 line-through font-bold">₦{p.original_price.toLocaleString()}</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button size="icon" variant="ghost" className="h-10 w-10 rounded-2xl bg-gray-50 hover:bg-indigo-50 hover:text-indigo-600 transition-colors">
                                            <Eye className="h-4 w-4" />
                                        </Button>
                                        <Button size="icon" variant="ghost" className="h-10 w-10 rounded-2xl bg-gray-50 hover:bg-emerald-50 hover:text-emerald-600 transition-colors">
                                            <CheckCircle2 className="h-4 w-4" />
                                        </Button>
                                        <Button size="icon" variant="ghost" className="h-10 w-10 rounded-2xl bg-gray-50 hover:bg-rose-50 hover:text-rose-600 transition-colors" onClick={() => handleDelete(p.id)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {p.price_flag !== "fair" && (
                            <div className="mt-6 p-4 bg-rose-50/50 rounded-2xl border border-rose-100 flex items-start gap-3">
                                <AlertCircle className="h-5 w-5 text-rose-500 mt-0.5" />
                                <div>
                                    <p className="text-xs font-bold text-rose-900">System Alert: Market Anomaly</p>
                                    <p className="text-[11px] text-rose-600 font-medium">This product's price is {p.price_flag === "suspicious" ? "80% below" : "40% above"} market average. Requires manual audit.</p>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {filtered.length === 0 && (
                <div className="py-20 text-center">
                    <div className="h-16 w-16 bg-gray-50 rounded-3xl flex items-center justify-center mx-auto mb-4">
                        <Box className="h-8 w-8 text-gray-300" />
                    </div>
                    <h3 className="text-lg font-black text-gray-900 mt-1">No products found</h3>
                    <p className="text-sm text-gray-400 font-bold uppercase tracking-wider mt-1">Try adjusting your filters or search term</p>
                </div>
            )}
        </div>
    );
}
