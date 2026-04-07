"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useRef, useCallback, useEffect } from "react";
import { Star, ShieldCheck, AlertTriangle, Heart, Handshake, ShoppingCart, Clock, Percent, Tag } from "lucide-react";
import { Product } from "@/lib/types";
import { formatPrice, getTrustColor, cn, getProductUrl, getProxiedImageUrl } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/context/CartContext";
import { useFavorites } from "@/context/FavoritesContext";
import { useAuth } from "@/context/AuthContext";
import { nativeBridge } from "@/lib/native-bridge";

interface ProductCardProps {
    product: Product;
    dealEndTime?: string | null;
    dealDiscountText?: string | null;
    className?: string;
}

export function ProductCard({ product, dealEndTime, dealDiscountText, className }: ProductCardProps) {
    const { user } = useAuth();
    const { addToCart } = useCart();
    const { toggleFavorite, isFavorite } = useFavorites();
    const router = useRouter();
    const [showHeartBurst, setShowHeartBurst] = useState(false);
    const [addedToCart, setAddedToCart] = useState(false);
    const lastTapRef = useRef<number>(0);
    const favorited = isFavorite(product.id);
    const [timeLeft, setTimeLeft] = useState<string>("");

    // Real ticking countdown timer
    useEffect(() => {
        if (!dealEndTime) return;
        
        const updateTimer = () => {
            const diff = new Date(dealEndTime).getTime() - Date.now();
            if (diff <= 0) {
                setTimeLeft("Expired");
                return;
            }
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const secs = Math.floor((diff % (1000 * 60)) / 1000);
            
            if (days > 0) setTimeLeft(`${days}d ${hours}h left`);
            else setTimeLeft(`${hours}h ${mins}m ${secs}s left`);
        };
        
        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [dealEndTime]);

    // Mock savings calculation
    const savings = product.original_price ? product.original_price - product.price : 0;
    const savingsPct = product.original_price ? Math.round((savings / product.original_price) * 100) : 0;

    const handleDoubleTap = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        const now = Date.now();
        if (now - lastTapRef.current < 400) {
            // Double tap detected
            e.preventDefault();
            e.stopPropagation();

            if (!user) {
                router.push("/login?from=" + encodeURIComponent(window.location.pathname));
                return;
            }

            if (!favorited) {
                toggleFavorite(product.id);
            }
            // Show heart burst animation and play haptic
            nativeBridge.hapticFeedback("heavy");
            setShowHeartBurst(true);
            setTimeout(() => setShowHeartBurst(false), 1000);
            lastTapRef.current = 0;
        } else {
            lastTapRef.current = now;
        }
    }, [favorited, toggleFavorite, product.id, user, router]);

    const handleHeartClick = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (!user) {
            router.push("/login?from=" + encodeURIComponent(window.location.pathname));
            return;
        }

        toggleFavorite(product.id);
        nativeBridge.hapticFeedback("heavy");
        if (!favorited) {
            setShowHeartBurst(true);
            setTimeout(() => setShowHeartBurst(false), 1000);
        }
    }, [favorited, toggleFavorite, product.id, user, router]);

    return (
        <div className={cn("group relative flex flex-col bg-card text-card-foreground border border-border rounded-2xl overflow-hidden transition-shadow duration-300 hover:shadow-xl h-full cursor-pointer", className)}>
            <div onClick={() => router.push(getProductUrl(product.id, product.name))} className="flex flex-col flex-1">
                <div
                    className="relative aspect-square object-cover bg-muted"
                    onClick={handleDoubleTap}
                >
                    {/* Sponsored Ad Tag */}
                    {product.is_sponsored && (
                        <div className="absolute bottom-3 left-3 z-40 bg-black/85 backdrop-blur-md text-white px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-full shadow-md border border-white/20 flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-brand-green-400 animate-pulse" /> Sponsored
                        </div>
                    )}
                    {/* Fair Price / Overpriced Badge Overlay */}
                    {product.price_flag === "fair" && (
                        <div className="absolute top-3 left-3 z-20 flex items-center gap-1 px-2 py-1.5 bg-white/70 backdrop-blur-md rounded-full border border-emerald-500/20 shadow-xl group-hover:scale-105 transition-transform duration-300">
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

                    {/* Left Deal/Discount Tag UNDER Fair Price tag */}
                    {dealDiscountText && (
                        <div className="absolute top-[48px] left-3 z-20 bg-red-500 text-white text-[10px] font-black px-2 py-1 rounded-md shadow-md flex items-center gap-1 group-hover:scale-105 transition-transform duration-300">
                            {dealDiscountText.includes("%") ? <Percent className="h-3 w-3" /> : <Tag className="h-3 w-3" />} 
                            {dealDiscountText}
                        </div>
                    )}

                    {/* Right Countdown Tag UNDER Heart icon */}
                    {dealEndTime && (
                        <div className="absolute top-[48px] right-3 z-20 bg-black/70 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1">
                            <Clock className="h-3 w-3 text-brand-orange animate-pulse" /> {timeLeft}
                        </div>
                    )}

                    {/* Instagram Heart Burst Overlay */}
                    {showHeartBurst && (
                        <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none">
                            <Heart className="h-20 w-20 fill-red-500 text-red-500 animate-heart-burst drop-shadow-lg" />
                        </div>
                    )}

                    <img
                        src={getProxiedImageUrl(product.image_url)}
                        alt={`${product.name} - Verified Market Price on FairPrice Shop Negotiate & Verify Market Prices`}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                        loading="lazy"
                        onError={(e) => {
                            const target = e.currentTarget as HTMLImageElement;
                            if (target.src.includes('placeholder.png')) return; // Prevent infinite loops
                            target.onerror = null;
                            target.src = "/assets/images/placeholder.png";
                            target.className = target.className + " object-contain p-4 opacity-50"; // Make placeholder look distinct
                        }}
                    />
                </div>

                <div className="flex flex-col flex-1 px-3 pb-2 pt-2.5">
                    <h3 className="text-sm font-bold line-clamp-2 mb-1 group-hover:text-brand-green-600 transition-colors leading-tight min-h-[36px]">
                        {product.name}
                    </h3>

                    {/* Rating & Discount */}
                    <div className="flex items-center justify-between gap-1 mb-1">
                        <div className="flex text-amber-400">
                            {[...Array(5)].map((_, i) => (
                                <Star
                                    key={i}
                                    className={`h-[10px] w-[10px] sm:h-3 sm:w-3 ${i < Math.round(product.avg_rating) ? "fill-current" : "text-gray-300"}`}
                                />
                            ))}
                        </div>

                        {/* Inline Discount Badge */}
                        {product.original_price && product.original_price > product.price && (
                            <div className="font-black px-1.5 py-0.5 rounded bg-red-100 text-[9px] sm:text-[10px] text-red-600 flex items-center justify-center leading-none">
                                -{Math.round(((product.original_price - product.price) / product.original_price) * 100)}%
                            </div>
                        )}
                    </div>

                    {/* Price Section */}
                    <div className="flex flex-row items-baseline flex-wrap gap-1.5 mt-1">
                        <span className="text-base sm:text-lg font-black text-foreground leading-none">
                            {formatPrice(product.price)}
                        </span>
                        {product.original_price && product.original_price > product.price && (
                            <span className="text-[10px] text-muted-foreground line-through font-medium leading-none">
                                {formatPrice(product.original_price)}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="px-3 pb-3 mt-auto">
                {product.price_flag === "overpriced" ? (
                    <div className="flex gap-1.5 overflow-hidden">
                        <Button
                            className="flex-1 min-w-0 bg-emerald-600 text-white font-black hover:bg-emerald-700 transition-all duration-300 cursor-pointer rounded-xl h-9 shadow-sm relative z-20 text-xs px-2 active:scale-95 transition-transform"
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
                            href={`${getProductUrl(product.id, product.name)}?negotiate=true`}
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
                            className="w-full bg-emerald-600 text-white font-black hover:bg-emerald-700 hover:scale-[1.02] transition-all duration-300 cursor-pointer rounded-xl h-9 shadow-sm relative z-20 active:scale-95"
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
