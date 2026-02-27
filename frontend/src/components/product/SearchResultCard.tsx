"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import { Star, ShieldCheck, ShoppingCart, Info, Heart, Phone, Monitor, Sofa, Home, Zap, ShoppingBag, Car, Gamepad, Shirt, Baby, Dumbbell, BookOpen, Wrench, Paintbrush, Package } from "lucide-react";
import { Product } from "@/lib/types";
import { formatPrice, cn } from "@/lib/utils";
import { useLocation } from "@/context/LocationContext";
import { useFavorites } from "@/context/FavoritesContext";
import { useCart } from "@/context/CartContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// Category icon map for product image fallback
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
    phones: <Phone className="h-10 w-10" />,
    electronics: <Monitor className="h-10 w-10" />,
    computing: <Monitor className="h-10 w-10" />,
    fashion: <Shirt className="h-10 w-10" />,
    home: <Home className="h-10 w-10" />,
    furniture: <Sofa className="h-10 w-10" />,
    cars: <Car className="h-10 w-10" />,
    gaming: <Gamepad className="h-10 w-10" />,
    energy: <Zap className="h-10 w-10" />,
    baby: <Baby className="h-10 w-10" />,
    sports: <Dumbbell className="h-10 w-10" />,
    books: <BookOpen className="h-10 w-10" />,
    tools: <Wrench className="h-10 w-10" />,
    beauty: <Paintbrush className="h-10 w-10" />,
    grocery: <ShoppingBag className="h-10 w-10" />,
};

function getCategoryIcon(category: string) {
    const cat = category?.toLowerCase() || "";
    return Object.entries(CATEGORY_ICONS).find(([key]) => cat.includes(key))?.[1] || <Package className="h-10 w-10" />;
}

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
    const { toggleFavorite, isFavorite } = useFavorites();
    const { addToCart } = useCart();
    const lastTapRef = useRef<number>(0);
    const [showHeartBurst, setShowHeartBurst] = useState(false);
    const [imgError, setImgError] = useState(false);

    const handleDoubleTap = () => {
        const now = Date.now();
        if (now - lastTapRef.current < 300) {
            if (!isFavorite(product.id)) {
                toggleFavorite(product.id);
            }
            setShowHeartBurst(true);
            setTimeout(() => setShowHeartBurst(false), 900);
        }
        lastTapRef.current = now;
    };

    // Deterministic "social proof" number based on product id to avoid hydration mismatch
    const boughtInPastMonth = (() => {
        let hash = 0;
        for (let i = 0; i < product.id.length; i++) hash = ((hash << 5) - hash + product.id.charCodeAt(i)) | 0;
        return (Math.abs(hash) % 20000) + 100;
    })();
    const listPrice = product.original_price || product.price * 1.2;
    const savingsPct = Math.round(((listPrice - product.price) / listPrice) * 100);

    return (
        <div className={cn(
            "flex flex-col md:flex-row gap-6 p-4 bg-white border-b border-gray-200 hover:bg-gray-50 transition-colors group relative",
            isSponsored && "bg-amber-50/30"
        )}>
            {/* Image Section */}
            <div
                className="w-full md:w-64 h-64 flex-shrink-0 relative rounded-xl overflow-hidden bg-gray-100 p-4 cursor-pointer select-none"
                onClick={handleDoubleTap}
            >
                {isOverallPick && (
                    <div className="absolute top-0 left-0 bg-black text-white text-[10px] font-bold px-3 py-1.5 flex items-center gap-1 z-10 rounded-br-lg uppercase tracking-wider">
                        Overall Pick <Info className="h-3 w-3" />
                    </div>
                )}
                {isBestSeller && (
                    <div className="absolute top-0 left-0 bg-brand-orange text-white text-[10px] font-bold px-3 py-1.5 z-10 rounded-br-lg uppercase tracking-wider">
                        Best Seller
                    </div>
                )}
                {/* Heart button */}
                <button
                    onClick={(e) => { e.stopPropagation(); toggleFavorite(product.id); }}
                    className="absolute top-3 right-3 z-20 p-1.5 bg-white/80 backdrop-blur-sm rounded-full shadow-sm border border-gray-100 hover:bg-white transition-colors"
                >
                    <Heart className={`h-4 w-4 transition-colors ${isFavorite(product.id) ? 'text-red-500 fill-red-500' : 'text-gray-400 hover:text-red-500'}`} />
                </button>
                {/* Heart burst animation */}
                {showHeartBurst && (
                    <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
                        <Heart className="h-20 w-20 text-red-500 fill-red-500 animate-heart-burst drop-shadow-lg" />
                    </div>
                )}
                {/* Fair Price / Overpriced Badge Overlay */}
                {product.price_flag === "fair" && (
                    <div className="absolute bottom-3 left-3 z-20 flex items-center gap-1.5 px-3 py-1.5 bg-white/70 backdrop-blur-md rounded-full border border-emerald-500/20 shadow-xl group-hover:scale-105 transition-transform duration-300">
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Fair Price</span>
                    </div>
                )}
                {product.price_flag === "overpriced" && (
                    <div className="absolute bottom-3 left-3 z-20 flex items-center gap-1.5 px-3 py-1.5 bg-white/70 backdrop-blur-md rounded-full border border-red-500/20 shadow-xl group-hover:scale-105 transition-transform duration-300">
                        <Info className="h-3.5 w-3.5 text-red-500" />
                        <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Pricing Alert</span>
                    </div>
                )}
                <Link href={`/product/${product.id}`} className="block h-full w-full" onClick={(e) => e.stopPropagation()}>
                    {!imgError ? (
                        <img
                            src={product.images?.[0] || product.image_url}
                            alt={product.name}
                            className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-500 pointer-events-none"
                            onError={() => setImgError(true)}
                        />
                    ) : (
                        <div className="w-full h-full rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white">
                            {getCategoryIcon(product.category)}
                        </div>
                    )}
                </Link>
            </div>

            {/* Content Section */}
            <div className="flex-1 flex flex-col pt-1">
                {isSponsored && <span className="text-[10px] text-gray-400 font-medium mb-1">Sponsored</span>}

                <Link href={`/product/${product.id}`} className="group-hover:text-brand-green-600 transition-colors">
                    <h2 className="text-xl font-medium leading-tight mb-1 line-clamp-2">
                        {product.name}
                    </h2>
                </Link>
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                    <span>by <span className="text-blue-600 hover:underline cursor-pointer font-medium">{product.seller_name}</span></span>
                    {product.price_flag === "fair" && (
                        <Badge variant="outline" className="text-[9px] border-emerald-200 bg-emerald-50 text-emerald-700 py-0 px-1.5 h-4">Verified Seller</Badge>
                    )}
                </div>

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
                        className="bg-brand-green-600 hover:bg-brand-green-700 text-white rounded-full px-6 font-bold text-sm h-9 shadow-sm flex items-center gap-1.5"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); addToCart(product); }}
                    >
                        <ShoppingCart className="h-4 w-4" /> Add to cart
                    </Button>
                    <div className="flex items-center gap-4">
                    </div>
                </div>
            </div>
        </div >
    );
}
