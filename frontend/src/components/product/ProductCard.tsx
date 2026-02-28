"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useRef, useCallback } from "react";
import { Star, ShieldCheck, AlertTriangle, Heart, Handshake, ShoppingCart } from "lucide-react";
import { Product } from "@/lib/types";
import { formatPrice, getTrustColor, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/context/CartContext";
import { useFavorites } from "@/context/FavoritesContext";

interface ProductCardProps {
    product: Product;
    showDealTimer?: boolean;
    className?: string;
}

export function ProductCard({ product, showDealTimer, className }: ProductCardProps) {
    const { addToCart } = useCart();
    const { toggleFavorite, isFavorite } = useFavorites();
    const router = useRouter();
    const [showHeartBurst, setShowHeartBurst] = useState(false);
    const [addedToCart, setAddedToCart] = useState(false);
    const lastTapRef = useRef<number>(0);
    const favorited = isFavorite(product.id);

    // Mock savings calculation
    const savings = product.original_price ? product.original_price - product.price : 0;
    const savingsPct = product.original_price ? Math.round((savings / product.original_price) * 100) : 0;

    const handleDoubleTap = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        const now = Date.now();
        if (now - lastTapRef.current < 350) {
            // Double tap detected
            e.preventDefault();
            e.stopPropagation();
            if (!favorited) {
                toggleFavorite(product.id);
            }
            // Show heart burst animation
            setShowHeartBurst(true);
            setTimeout(() => setShowHeartBurst(false), 900);
            lastTapRef.current = 0;
        } else {
            lastTapRef.current = now;
        }
    }, [favorited, toggleFavorite, product.id]);

    const handleHeartClick = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        toggleFavorite(product.id);
        if (!favorited) {
            setShowHeartBurst(true);
            setTimeout(() => setShowHeartBurst(false), 900);
        }
    }, [favorited, toggleFavorite, product.id]);

    return (
        <div className={cn("group relative flex flex-col bg-card text-card-foreground border border-border rounded-2xl overflow-hidden transition-shadow duration-300 hover:shadow-xl h-full", className)}>
            <Link href={`/product/${product.id}`} className="flex flex-col flex-1">
                <div
                    className="relative aspect-[4/5] object-cover bg-muted"
                    onClick={handleDoubleTap}
                >
                    {/* Sponsored Ad Tag */}
                    {product.is_sponsored && (
                        <div className="absolute top-0 left-0 z-40 bg-black/85 backdrop-blur-md text-white px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-tl-2xl rounded-br-2xl shadow-md border-b border-r border-white/10 flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-brand-green-400 animate-pulse" /> Sponsored
                        </div>
                    )}
                    {/* Discount Badge */}
                    {savings > 0 && !product.price_flag && (
                        <Badge variant="destructive" className="absolute top-3 left-3 z-10 font-bold">
                            -{savingsPct}%
                        </Badge>
                    )}


                    {/* Fair Price / Overpriced Badge Overlay */}
                    {product.price_flag === "fair" && (
                        <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 px-3 py-1.5 bg-white/70 backdrop-blur-md rounded-full border border-emerald-500/20 shadow-xl group-hover:scale-105 transition-transform duration-300">
                            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Fair Price</span>
                        </div>
                    )}
                    {product.price_flag === "overpriced" && (
                        <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 px-3 py-1.5 bg-white/70 backdrop-blur-md rounded-full border border-red-500/20 shadow-xl group-hover:scale-105 transition-transform duration-300">
                            <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                            <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Pricing Alert</span>
                        </div>
                    )}

                    {/* Heart Button — Top Right */}
                    <button
                        onClick={handleHeartClick}
                        className="absolute top-3 right-3 z-30 p-1.5 rounded-full bg-white/80 backdrop-blur-sm shadow-md hover:scale-110 transition-all duration-200 cursor-pointer"
                    >
                        <Heart
                            className={cn(
                                "h-4 w-4 transition-all duration-300",
                                favorited
                                    ? "fill-red-500 text-red-500 scale-110"
                                    : "text-gray-400 hover:text-red-400"
                            )}
                        />
                    </button>

                    {/* Instagram Heart Burst Overlay */}
                    {showHeartBurst && (
                        <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none">
                            <Heart className="h-20 w-20 fill-red-500 text-red-500 animate-heart-burst drop-shadow-lg" />
                        </div>
                    )}

                    <img
                        src={product.image_url || "/assets/images/placeholder.png"}
                        alt={product.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                        onError={(e) => {
                            e.currentTarget.src = "/assets/images/placeholder.png";
                        }}
                    />
                </div>

                <div className="px-3 pt-3 flex flex-col flex-1">
                    <h3 className="text-sm font-bold line-clamp-2 mb-2 group-hover:text-brand-green-600 transition-colors leading-snug min-h-[40px]">
                        {product.name}
                    </h3>

                    {/* Rating */}
                    <div className="flex items-center gap-1.5 mb-2">
                        <div className="flex text-amber-400">
                            {[...Array(5)].map((_, i) => (
                                <Star
                                    key={i}
                                    className={`h-3 w-3 ${i < Math.round(product.avg_rating) ? "fill-current" : "text-gray-300"}`}
                                />
                            ))}
                        </div>
                        <span className="text-[10px] text-muted-foreground font-bold">
                            ({product.review_count.toLocaleString()})
                        </span>
                    </div>

                    {/* Price Section */}
                    <div className="flex items-baseline gap-2 mb-2 mt-auto">
                        <span className="text-lg font-black text-foreground">
                            {formatPrice(product.price)}
                        </span>
                        {product.original_price && (
                            <span className="text-[10px] text-muted-foreground line-through font-medium">
                                {formatPrice(product.original_price)}
                            </span>
                        )}
                    </div>
                </div>
            </Link>

            {/* Action Buttons */}
            <div className="px-3 pb-3 mt-auto">
                {product.price_flag === "overpriced" ? (
                    <div className="flex gap-1.5 overflow-hidden">
                        <Button
                            className="flex-1 min-w-0 bg-brand-green-600 text-white font-black hover:bg-brand-green-700 transition-all duration-300 cursor-pointer rounded-xl h-9 shadow-sm relative z-20 text-xs px-2 active:scale-95 transition-transform"
                            size="sm"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                addToCart(product);
                                router.push('/checkout');
                            }}
                        >
                            <ShoppingCart className="h-4 w-4 mr-1 lg:mr-1.5 shrink-0" /> <span className="truncate">Buy Now</span>
                        </Button>
                        <Link
                            href={`/product/${product.id}?negotiate=true`}
                            className="relative z-20 flex-1 min-w-0"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <Button
                                variant="outline"
                                className="w-full border-2 border-brand-orange text-brand-orange font-black hover:bg-brand-orange hover:text-black transition-all duration-300 cursor-pointer rounded-xl h-9 shadow-sm text-xs gap-1 px-2"
                                size="sm"
                            >
                                <span className="truncate">Negotiate</span>
                            </Button>
                        </Link>
                    </div>
                ) : (
                    <>
                        <Button
                            className="w-full bg-brand-green-600 text-white font-black hover:bg-brand-green-700 hover:scale-[1.02] transition-all duration-300 cursor-pointer rounded-xl h-9 shadow-sm relative z-20 active:scale-95"
                            size="sm"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                addToCart(product);
                                setAddedToCart(true);
                                setTimeout(() => setAddedToCart(false), 3000);
                            }}
                        >
                            {addedToCart ? (
                                <span className="text-white">✓ Added!</span>
                            ) : (
                                <><ShoppingCart className="h-4 w-4 mr-2" /> Add to Cart</>
                            )}
                        </Button>
                        {addedToCart && (
                            <Button
                                variant="outline"
                                className="w-full mt-1.5 rounded-xl h-8 text-xs font-bold border-brand-green-200 text-brand-green-700 hover:bg-brand-green-50 relative z-20 md:hidden"
                                size="sm"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    router.push('/cart');
                                }}
                            >
                                View Cart →
                            </Button>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
