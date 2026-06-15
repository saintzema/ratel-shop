"use client";

import React from "react";
import Link from "next/link";
import { formatPrice, getProductUrl } from "@/lib/utils";
import { motion } from "framer-motion";

interface HistorySquareCardProps {
    product: any;
    onRemove?: (id: string) => void;
}

export function HistorySquareCard({ product, onRemove }: HistorySquareCardProps) {
    return (
        <div className="relative group">
            <Link 
                href={getProductUrl(product)}
                className="flex flex-col items-center group/link"
            >
                <div className="w-full aspect-square rounded-2xl bg-white overflow-hidden mb-3 border border-gray-100 shadow-sm transition-all group-hover/link:border-emerald-200 group-hover/link:shadow-md">
                    <img 
                        src={product.image_url} 
                        alt={product.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover/link:scale-110"
                        loading="lazy"
                    />
                </div>
                <div className="text-center px-1">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-0.5 truncate w-full">
                        {product.category || "Product"}
                    </p>
                    <p className="text-xs font-black text-gray-900 truncate w-full mb-1">
                        {product.name}
                    </p>
                    <p className="text-sm font-black text-emerald-600">
                        {formatPrice(product.price)}
                    </p>
                </div>
            </Link>
            
            {onRemove && (
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onRemove(product.id);
                    }}
                    className="absolute top-2 right-2 w-7 h-7 bg-white/90 backdrop-blur shadow-sm rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100 z-10 border border-gray-100"
                    title="Remove from history"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </button>
            )}
        </div>
    );
}
