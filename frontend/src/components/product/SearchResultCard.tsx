"use client";

import React from "react";
import Link from "next/link";
import { Star, ShieldCheck, ShoppingCart, Info } from "lucide-react";
import { Product } from "@/lib/types";
import { formatPrice, cn } from "@/lib/utils";
import { useLocation } from "@/context/LocationContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface SearchResultCardProps {
    product: Product;
    isBestSeller?: boolean;
    isOverallPick?: boolean;
    isSponsored?: boolean;
}

export function SearchResultCard({
    product,
    isBestSeller,
    isOverallPick,
    isSponsored
}: SearchResultCardProps) {
    const { location, deliveryDate } = useLocation();

    // Mock social proof and savings
    const boughtInPastMonth = Math.floor(Math.random() * 20000) + 100;
    const listPrice = product.original_price || product.price * 1.2;
    const savingsPct = Math.round(((listPrice - product.price) / listPrice) * 100);

    return (
        <div className={cn(
            "flex flex-col md:flex-row gap-6 p-4 bg-white border-b border-gray-200 hover:bg-gray-50 transition-colors group relative",
            isSponsored && "bg-amber-50/30"
        )}>
            {/* Image Section */}
            <div className="w-full md:w-64 h-64 flex-shrink-0 relative rounded-xl overflow-hidden bg-gray-100 p-4">
                {isOverallPick && (
                    <div className="absolute top-0 left-0 bg-black text-white text-[10px] font-bold px-3 py-1.5 flex items-center gap-1 z-10 rounded-br-lg uppercase tracking-wider">
                        Overall Pick <Info className="h-3 w-3" />
                    </div>
                )}
                {isBestSeller && (
                    <div className="absolute top-0 left-0 bg-ratel-orange text-white text-[10px] font-bold px-3 py-1.5 z-10 rounded-br-lg uppercase tracking-wider">
                        Best Seller
                    </div>
                )}
                <Link href={`/product/${product.id}`} className="block h-full w-full">
                    <img
                        src={product.images?.[0] || product.image_url}
                        alt={product.name}
                        className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                            e.currentTarget.src = "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=800&q=80";
                        }}
                    />
                </Link>
            </div>

            {/* Content Section */}
            <div className="flex-1 flex flex-col pt-1">
                {isSponsored && <span className="text-[10px] text-gray-400 font-medium mb-1">Sponsored</span>}

                <Link href={`/product/${product.id}`} className="group-hover:text-ratel-green-600 transition-colors">
                    <h2 className="text-xl font-medium leading-tight mb-1 line-clamp-2">
                        <span className="font-bold">{product.seller_name}</span> {product.name}
                    </h2>
                </Link>

                {/* Ratings & Social Proof */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-3">
                    <div className="flex items-center gap-1">
                        <span className="text-sm font-bold text-gray-900">{product.avg_rating}</span>
                        <div className="flex text-amber-500">
                            {[...Array(5)].map((_, i) => (
                                <Star
                                    key={i}
                                    className={cn("h-3.5 w-3.5", i < Math.floor(product.avg_rating) ? "fill-current" : "text-gray-300")}
                                />
                            ))}
                        </div>
                        <span className="text-sm text-blue-600 hover:underline cursor-pointer">
                            ({product.review_count.toLocaleString()})
                        </span>
                    </div>
                    <div className="h-3 w-px bg-gray-300 hidden sm:block" />
                    <span className="text-sm text-gray-600">
                        {boughtInPastMonth.toLocaleString()}+ bought in past month
                    </span>
                </div>

                {/* Price Section */}
                <div className="space-y-1 mb-4">
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold tracking-tight">
                            ₦{product.price.toLocaleString()}
                        </span>
                        <span className="text-sm text-gray-500 line-through">
                            ₦{listPrice.toLocaleString()}
                        </span>
                        <Badge variant="outline" className="text-[10px] border-amber-200 bg-amber-50 text-amber-800">
                            Save {savingsPct}%
                        </Badge>
                    </div>
                </div>

                {/* Delivery Information */}
                <div className="space-y-1.5 text-sm mb-6">
                    <div className="flex items-center gap-1.5">
                        <span className="text-gray-900 font-medium">Delivery</span>
                        <span className="text-black font-bold">{deliveryDate}</span>
                    </div>
                    <div className="text-gray-600">
                        Ships to <span className="font-medium text-black">{location}, Nigeria</span>
                    </div>
                    {product.stock < 10 && (
                        <div className="text-red-600 font-medium text-xs">
                            Only {product.stock} left in stock - order soon.
                        </div>
                    )}
                </div>

                {/* Action Section */}
                <div className="flex items-center gap-3">
                    <Button
                        className="bg-ratel-green-600 hover:bg-ratel-green-700 text-white rounded-full px-6 font-bold text-sm h-9 shadow-sm"
                        onClick={() => alert(`Added ${product.name} to cart!`)}
                    >
                        Add to cart
                    </Button>
                    <div className="flex items-center gap-4">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1">
                            <ShieldCheck className="h-3 w-3 text-ratel-green-600" /> VDM Verified
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
