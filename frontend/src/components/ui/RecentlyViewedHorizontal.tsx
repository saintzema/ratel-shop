"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ChevronRight, ChevronLeft, History, Plus } from "lucide-react";
import { formatPrice, getProductUrl } from "@/lib/utils";
import { motion } from "framer-motion";
import { useCart } from "@/context/CartContext";
import { useRouter } from "next/navigation";
import { DataSyncService } from "@/lib/sync-store";

export function RecentlyViewedHorizontal() {
    const [history, setHistory] = useState<any[]>([]);
    const scrollRef = useRef<HTMLDivElement>(null);
    const [mounted, setMounted] = useState(false);
    const { addToCart } = useCart();
    const router = useRouter();

    useEffect(() => {
        setMounted(true);
        const loadHistory = () => {
            try {
                const hydratedHistory = DataSyncService.getSearchHistoryProducts();
                setHistory(hydratedHistory);
            } catch (e) {}
        };

        loadHistory();
        window.addEventListener("storage", loadHistory);
        window.addEventListener("sync-store-update", loadHistory);
        return () => {
            window.removeEventListener("storage", loadHistory);
            window.removeEventListener("sync-store-update", loadHistory);
        };
    }, []);

    if (!mounted || history.length === 0) return null;

    const scroll = (dir: "left" | "right") => {
        if (!scrollRef.current) return;
        const amount = 200;
        scrollRef.current.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
    };

    return (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-2 overflow-hidden group">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
                    <History className="w-4 h-4 text-emerald-600" />
                    RECENTLY VIEWED
                </h2>
                <Link href="/account/browsing-history" className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5 transition-colors uppercase tracking-tight">
                    CLEAR <ChevronRight className="w-3 h-3" />
                </Link>
            </div>

            <div className="relative">
                <button
                    onClick={() => scroll("left")}
                    className="absolute -left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white/90 backdrop-blur shadow-md rounded-full flex items-center justify-center text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity border border-gray-100"
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                    onClick={() => scroll("right")}
                    className="absolute -right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white/90 backdrop-blur shadow-md rounded-full flex items-center justify-center text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity border border-gray-100"
                >
                    <ChevronRight className="w-4 h-4" />
                </button>

                <div 
                    ref={scrollRef}
                    className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 px-1"
                >
                    {history.map((product) => (
                        <div 
                            key={product.id}
                            className="flex flex-col items-center min-w-[100px] max-w-[100px] group/item relative"
                        >
                            <Link 
                                href={getProductUrl(product)}
                                className="w-full flex flex-col items-center"
                            >
                                <div className="w-full aspect-square rounded-xl bg-gray-50 overflow-hidden mb-2 border border-gray-100 transition-all group-hover/item:border-emerald-200 group-hover/item:shadow-sm">
                                    <img 
                                        src={product.image_url} 
                                        alt={product.name}
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover/item:scale-110"
                                        loading="lazy"
                                    />
                                </div>
                                <span className="text-[11px] font-black text-gray-900 truncate w-full text-center">
                                    {formatPrice(product.price)}
                                </span>
                            </Link>
                            
                            {/* Quick Add to Cart Button */}
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    addToCart(product);
                                    router.push("/cart");
                                }}
                                className="absolute top-1 right-1 w-7 h-7 bg-emerald-600 text-white rounded-full flex items-center justify-center shadow-lg transform scale-100 transition-all duration-200 hover:bg-emerald-700 active:scale-90 z-20"
                                title="Add to cart and checkout"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
