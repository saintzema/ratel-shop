"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useRef, useCallback, useEffect } from "react";
import { Star, ShieldCheck, AlertTriangle, Heart, Handshake, ShoppingCart, Clock, Percent, Tag, Crown } from "lucide-react";
import { Product } from "@/lib/types";
import { formatPrice, getTrustColor, cn, getProductUrl, getProxiedImageUrl, formatNumber, isVideoUrl } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/context/CartContext";
import { useFavorites } from "@/context/FavoritesContext";
import { useAuth } from "@/context/AuthContext";
import { nativeBridge } from "@/lib/native-bridge";
import { DataSyncService } from "@/lib/sync-store";
import { hasFinancing, getProductPaymentRange } from "@/lib/financing-utils";
import { VideoPlayer } from "@/components/ui/VideoPlayer";

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
    const p = product as any;
    const displayOriginalPrice = p.originalPrice ?? p.original_price;
    const savings = displayOriginalPrice ? displayOriginalPrice - product.price : 0;
    const savingsPct = displayOriginalPrice ? Math.round((savings / displayOriginalPrice) * 100) : 0;

    const isCar = product.category === "cars" || product.category === "vehicles" || product.category === "automotive";
    const cardSeller = product.seller_id ? DataSyncService.getSellers().find(s => s.id === product.seller_id || s.user_id === product.seller_id) : null;
    const showTenureBadge = isCar && cardSeller?.status === "active";
    
    let sellerYears = 1;
    if (cardSeller?.created_at) {
        const joinedDate = new Date(cardSeller.created_at);
        const years = new Date().getFullYear() - joinedDate.getFullYear();
        sellerYears = years > 0 ? years : 1;
    }

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
            <div onClick={() => router.push(getProductUrl(product.id, product.name, product.slug))} className="flex flex-col flex-1">
                <div
                    className="relative aspect-square w-full overflow-hidden flex-shrink-0 bg-muted"
                    onClick={handleDoubleTap}
                >
                    {/* Bottom Left Badges (Sponsored & Premium Seller) */}
                    <div className="absolute bottom-3 left-3 z-40 flex flex-col gap-1 items-start">
                        {product.is_sponsored && (
                            <div className="bg-black/85 backdrop-blur-md text-white px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-full shadow-md border border-white/20 flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-brand-green-400 animate-pulse" /> Sponsored
                            </div>
                        )}
                        {cardSeller?.subscription_plan && cardSeller.subscription_plan !== "Starter" && (
                            <div className="flex items-center gap-1 px-2 py-1 bg-amber-500/95 backdrop-blur-md rounded shadow-md border border-amber-300">
                                <Crown className="h-2.5 w-2.5 text-white" />
                                <span className="text-[9px] font-black text-white uppercase tracking-widest">Premium Seller</span>
                            </div>
                        )}
                    </div>
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

                    {/* Out of Stock / Low Stock Badges */}
                    {product.stock === 0 && (
                        <div className="absolute inset-0 z-40 bg-white/40 backdrop-blur-[2px] flex items-center justify-center pointer-events-none">
                            <div className="bg-black text-white px-4 py-2 font-black text-xs uppercase tracking-widest rounded-lg shadow-2xl rotate-[12deg] border border-white/20">
                                Sold Out
                            </div>
                        </div>
                    )}
                    {product.stock !== undefined && product.stock > 0 && product.stock <= 3 && (
                        <div className="absolute bottom-10 right-3 z-30 bg-red-600/90 backdrop-blur-md text-white px-2 py-1 text-[9px] font-black uppercase tracking-widest rounded shadow-md border border-red-400 flex items-center gap-1">
                            <AlertTriangle className="h-2.5 w-2.5" /> Almost Sold Out
                        </div>
                    )}

                    {/* Seller Tenure Badge (Bottom Right Image) */}
                    <div className="absolute bottom-3 right-3 z-30 flex flex-col items-end gap-1">

                        {showTenureBadge && (
                            <div className="flex items-center gap-1 px-2 py-1 bg-blue-600/90 backdrop-blur-md rounded shadow-md border border-blue-400">
                                <ShieldCheck className="h-2.5 w-2.5 text-white" />
                                <span className="text-[9px] font-black text-white uppercase tracking-widest">{sellerYears} {sellerYears > 1 ? 'Years' : 'Year'}+</span>
                            </div>
                        )}
                    </div>

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


                    {isVideoUrl(product.image_url) ? (
                        <VideoPlayer
                            src={getProxiedImageUrl(product.image_url)}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                            poster={getProxiedImageUrl([product.image_url, ...(product.images || [])].find(img => !isVideoUrl(img)))}
                            autoPlayOnHover={true}
                        />
                    ) : (
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
                    )}

                </div>

                <div className="flex flex-col px-3 pb-1.5 pt-2">
                    <h3 className="text-sm font-bold line-clamp-2 mb-1 group-hover:text-brand-green-600 transition-colors leading-tight min-h-[36px]">
                        {product.name}
                    </h3>

                    {/* Rating & Discount */}
                    <div className="flex items-center justify-between gap-1 mb-1">
                        <div className="flex text-amber-400">
                            {[...Array(5)].map((_, i) => (
                                <Star
                                    key={i}
                                    className={`h-[10px] w-[10px] sm:h-3 sm:w-3 ${i < Math.round(p.avgRating ?? p.avg_rating ?? 0) ? "fill-current" : "text-gray-300"}`}
                                />
                            ))}
                        </div>

                        {/* Inline Discount Badge */}
                        {displayOriginalPrice && displayOriginalPrice > product.price && (
                            <div className="font-black px-1.5 py-0.5 rounded bg-red-100 text-[9px] sm:text-[10px] text-red-600 flex items-center justify-center leading-none">
                                -{Math.round(((displayOriginalPrice - product.price) / displayOriginalPrice) * 100)}% Off
                            </div>
                        )}
                    </div>

                    {/* Price Section */}
                    <div className="flex flex-row items-baseline flex-wrap gap-1.5 mt-1">
                        <span className="text-base sm:text-lg font-black text-foreground leading-none">
                            {formatPrice(product.price)}
                        </span>
                        {displayOriginalPrice && displayOriginalPrice > product.price && (
                            <span className="text-[10px] text-muted-foreground line-through font-medium leading-none">
                                {formatPrice(displayOriginalPrice)}
                            </span>
                        )}
                    </div>
                    
                    {/* Financing Payment Range */}
                    {hasFinancing(product) && (
                        <div className="mt-1 flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-emerald-600 leading-tight bg-emerald-50 w-fit px-1.5 py-0.5 rounded border border-emerald-100">
                            <span>(EST. ₦{formatNumber(getProductPaymentRange(product).min)} ~ ₦{formatNumber(getProductPaymentRange(product).max)} MONTHLY)</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Action Buttons */}
            <div className="px-3 pb-3 mt-1.5">
                {product.stock === 0 ? (
                    <Button
                        className="w-full bg-gray-100 hover:bg-gray-200 text-gray-500 font-black cursor-not-allowed rounded-xl h-9 shadow-sm relative z-20 transition-colors"
                        size="sm"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (!user) {
                                router.push("/login?from=" + encodeURIComponent(window.location.pathname));
                                return;
                            }
                            DataSyncService.addRestockSubscription(product.id, user.id, user.email);
                            alert("You're on the list! We'll notify you the moment this is restocked.");
                        }}
                    >
                        <AlertTriangle className="h-4 w-4 mr-2" /> Notify on Restock
                    </Button>
                ) : product.price_flag === "overpriced" ? (
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
                            href={`${getProductUrl(product.id, product.name, product.slug)}?negotiate=true`}
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
