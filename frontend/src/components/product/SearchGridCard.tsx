"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useFavorites } from "@/context/FavoritesContext";
import { ShieldCheck, Heart, Star, Check, ShoppingCart, Coins, Phone, Monitor, Shirt, Home, Sofa, Car, Gamepad2, Zap, Baby, Dumbbell, BookOpen, Wrench, Paintbrush, ShoppingBag, Package } from "lucide-react";
import NextLink from "next/link";
import { nativeBridge } from "@/lib/native-bridge";
import { cn, getProductUrl, getProxiedImageUrl, isVideoUrl, isGroundingUrl } from "@/lib/utils";
import { hasFinancing, calculateMonthlyPayment, formatNaira } from "@/lib/financing-utils";
import { VideoPlayer } from "@/components/ui/VideoPlayer";

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
    phones: <Phone className="h-10 w-10" />,
    electronics: <Monitor className="h-10 w-10" />,
    computing: <Monitor className="h-10 w-10" />,
    fashion: <Shirt className="h-10 w-10" />,
    home: <Home className="h-10 w-10" />,
    furniture: <Sofa className="h-10 w-10" />,
    cars: <Car className="h-10 w-10" />,
    gaming: <Gamepad2 className="h-10 w-10" />,
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

export const SearchGridCard = ({
  product,
  showGlobalPartner = false,
}: {
  product: any;
  showGlobalPartner?: boolean;
}) => {
  const [added, setAdded] = useState(false);
  const [showHeartBurst, setShowHeartBurst] = useState(false);
  const router = useRouter();
  const { addToCart } = useCart();
  const { toggleFavorite, isFavorite } = useFavorites();
  const favorited = isFavorite(product.id);
  const [hydratedImage, setHydratedImage] = useState<string | null>(null);
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const cardRef = useRef<HTMLAnchorElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
        setIsVisible(true);
        return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
        observer.disconnect();
      }
    }, { rootMargin: '200px' });
    
    if (cardRef.current) observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    
    const isValidImg = (url: string | undefined | null) =>
      !!url &&
      url.trim().length > 10 && 
      !url.toLowerCase().includes('no photo') &&
      !url.toLowerCase().includes('no image') &&
      !url.toLowerCase().includes('n/a') &&
      !url.toLowerCase().includes('undefined') &&
      !url.toLowerCase().includes('placeholder') &&
      !url.toLowerCase().includes('grounding-api-redirect') &&
      !isGroundingUrl(url);

    const bestExistingImage = isValidImg(product.image_url)
      ? product.image_url
      : isValidImg(product.images?.[0])
      ? product.images[0]
      : null;

    // Skip hydration if we already have a good image or already hydrated this product
    if (bestExistingImage || hydratedImage) return;

    // Only hydrate global / AI-sourced products
    if (product._source !== "global" && product._source !== "cached") return;

    const q = encodeURIComponent(product.name);
    const cat = encodeURIComponent(product.category || '');
    
    // Use a small random delay to stagger the initial batch of visible requests
    const staggerDelay = Math.random() * 800;
    const t = setTimeout(() => {
        fetch(`/api/product-image?q=${q}&category=${cat}`)
          .then(res => res.ok ? res.json() : null)
          .then(data => {
            if (!data) return;
            const imageUrl = (data.imageUrls?.length ? data.imageUrls[0] : null) || data.imageUrl || null;
            if (!imageUrl || !isValidImg(imageUrl)) return;
            
            setHydratedImage(imageUrl);
            // Persist to sessionStorage so back/forward navigation keeps the image
            try {
              const cached = sessionStorage.getItem('fp_nav_search_results');
              if (cached) {
                const parsed = JSON.parse(cached);
                const updated = parsed.map((p: any) =>
                  p.id === product.id
                    ? { ...p, image_url: imageUrl, images: data.imageUrls || [imageUrl] }
                    : p
                );
                sessionStorage.setItem('fp_nav_search_results', JSON.stringify(updated));
              }
            } catch { /* quota */ }
          })
          .catch(() => {});
    }, staggerDelay);
    
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id, isVisible]);

  const lastTapRef = useRef<number>(0);
  const handleDoubleTap = (e: React.MouseEvent) => {
    e.preventDefault();
    const now = Date.now();
    if (now - lastTapRef.current < 400) {
      if (!favorited) toggleFavorite(product.id);
      nativeBridge.hapticFeedback("heavy");
      setShowHeartBurst(true);
      setTimeout(() => setShowHeartBurst(false), 1000);
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  };

  const discount =
    product.original_price &&
      product.original_price > (product.price || product.approxPrice)
      ? Math.round(
        ((product.original_price - (product.price || product.approxPrice)) /
          product.original_price) *
        100,
      )
      : 0;
  const badgeLabel =
    product.price_flag === "fair"
      ? "FAIR PRICE"
      : product.price_flag === "great_deal"
        ? "BEST SELLER"
        : product.sold_count > 50
          ? "OVERALL PICK"
          : null;

  const handleAction = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (added) {
      router.push("/cart");
    } else {
      addToCart({ ...product, price: product.price || product.approxPrice });
      setAdded(true);
      setTimeout(() => { }, 1500);
    }
  };

  const productPrice = product.price || product.approxPrice || 0;
  const showFinancing = hasFinancing(product);
  const financingResult = showFinancing ? calculateMonthlyPayment(productPrice) : null;

  return (
    <NextLink
      ref={cardRef}
      href={getProductUrl(product.id, product.name)}
      className="bg-white rounded-2xl border border-gray-100 hover:border-emerald-200 hover:shadow-xl hover:shadow-emerald-500/5 transition-all group flex flex-col overflow-hidden h-full"
    >
      <div className="relative aspect-square w-full bg-gray-50 flex items-center justify-center overflow-hidden">
        {/* Sponsored Badge */}
        {product.is_sponsored && (
          <div className="absolute bottom-3 left-3 z-30 bg-gray-900/90 backdrop-blur-md text-white text-[9px] font-bold px-2 py-1 rounded-full shadow-sm border border-white/20 uppercase tracking-widest flex items-center gap-1.5">
            <span className="h-1 w-1 rounded-full bg-brand-green-400 animate-pulse" /> Sponsored
          </div>
        )}

        {product.price_flag === "fair" && (
          <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 px-2.5 py-1 bg-white/90 backdrop-blur-md rounded-full shadow border border-emerald-500/20">
            <ShieldCheck className="h-3 w-3 text-emerald-600" />
            <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">
              Fair Price
            </span>
          </div>
        )}
        {badgeLabel === "BEST SELLER" && (
          <div className="absolute top-3 left-3 z-20 bg-brand-orange text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shadow">
            {badgeLabel}
          </div>
        )}
        <button
          className="absolute top-3 right-3 z-20 p-1.5 rounded-full bg-white/80 backdrop-blur-sm shadow-sm border border-gray-100 hover:bg-white hover:scale-110 transition-all cursor-pointer"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleFavorite(product.id);
            nativeBridge.hapticFeedback("heavy");
            if (!favorited) {
              setShowHeartBurst(true);
              setTimeout(() => setShowHeartBurst(false), 1000);
            }
          }}
        >
          <Heart className={cn("h-4 w-4 transition-colors", favorited ? "fill-red-500 text-red-500" : "text-gray-400 hover:text-red-500")} />
        </button>
        {showHeartBurst && (
          <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
            <Heart className="h-20 w-20 text-red-500 fill-red-500 animate-heart-burst drop-shadow-lg" />
          </div>
        )}
        <div className="absolute inset-0 z-10" onClick={handleDoubleTap}></div>
        {isImageLoading && (
          <div className="absolute inset-0 z-0 bg-gray-200 animate-pulse" />
        )}

        {isVideoUrl(hydratedImage || product.image_url || product.images?.[0]) ? (
          <VideoPlayer
            src={getProxiedImageUrl(hydratedImage || product.image_url || product.images?.[0])}
            className={cn(
              "absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-all duration-500",
              isImageLoading ? "opacity-0" : "opacity-100 z-10"
            )}
            poster={getProxiedImageUrl([product.image_url, ...(product.images || [])].find(img => !isVideoUrl(img)))}
            autoPlayOnHover={true}
          />
        ) : (
          <img
            src={(() => {
              if (imageError) return "/assets/images/placeholder.png";
              if (hydratedImage) return getProxiedImageUrl(hydratedImage);
              const rawUrl = product.image_url || product.images?.[0];
              return getProxiedImageUrl(rawUrl);
            })()}
            alt={`${product.name} - Verified Market Price on FairPrice Shop`}
            className={cn(
              "absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-all duration-500",
              isImageLoading ? "opacity-0" : "opacity-100 z-10"
            )}
            loading="lazy"
            onLoad={() => setIsImageLoading(false)}
            onError={(e) => {
              setIsImageLoading(false);
              if (!imageError) {
                setImageError(true);
              }
              e.currentTarget.src = "/assets/images/placeholder.png";
            }}
          />
        )}

      </div>
      <div className="p-3 flex flex-col flex-1 border-t border-gray-50 bg-gradient-to-b from-white to-gray-50/50">
        <h4 className="font-bold text-[13px] text-gray-900 line-clamp-2 group-hover:text-brand-green-700 transition-colors mb-0.5 min-h-[36px] leading-tight">
          {product.name}
        </h4>

        <div className="flex items-center gap-1 mb-1.5">
          <span className="text-[11px] font-bold text-amber-500">
            {(product.avg_rating || 4.5).toFixed(1)}
          </span>
          <div className="flex items-center">
            {[1, 2, 3, 4, 5].map((s: number) => (
              <Star
                key={s}
                className={`w-2.5 h-2.5 flex-shrink-0 ${s <= Math.round(product.avg_rating || 4.5) ? "text-amber-400 fill-amber-400" : "text-gray-200"}`}
              />
            ))}
          </div>
          <span className="text-[9px] text-blue-600 font-medium hover:underline">
            (
            {(
              product.review_count || Math.floor(Math.random() * 500) + 50
            ).toLocaleString()}
            )
          </span>
        </div>

        {/* Phase 5: Compact Trust & Negotiation Indicators OR Financing */}
        <div className="flex items-center gap-1.5 mb-2.5">
            {financingResult ? (
                <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-md" title="Financing Available">
                    <Coins className="h-2 w-2 text-emerald-600" />
                    <span className="text-[10px] sm:text-[11px] font-black text-emerald-700">{formatNaira(financingResult.monthlyPayment)} MONTHLY</span>
                </div>
            ) : (
                <>
                    <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-100 px-1 py-0.5 rounded-md" title={`Trust Score: ${product.seller_trust_score || 85}%`}>
                        <ShieldCheck className="h-2 w-2 text-emerald-600" />
                        <span className="text-[8px] font-bold text-emerald-700">{product.seller_trust_score || 85}%</span>
                    </div>
                    <div className="text-[8px] font-bold text-gray-500 bg-gray-100 px-1 py-0.5 rounded-md">
                        {product.negotiation_rate || 80}% Accept
                    </div>
                </>
            )}
        </div>

        <div className="flex items-baseline gap-1.5 mb-3 flex-wrap">
          <p className="text-xl font-black tracking-tight text-gray-900 leading-none">
            ₦{(product.price || product.approxPrice || 0).toLocaleString()}
          </p>
          {product.original_price &&
            product.original_price > (product.price || product.approxPrice) && (
              <p className="text-[11px] text-gray-400 line-through font-medium leading-none">
                ₦{product.original_price.toLocaleString()}
              </p>
            )}
          {discount > 0 && (
            <span className="text-[10px] text-red-500 font-black ml-auto bg-red-50 px-1.5 py-0.5 rounded-md">
              -{discount}%
            </span>
          )}
        </div>

        <button
          className={cn(
            "w-full mt-auto flex items-center justify-center gap-1.5 text-[12px] font-black py-2.5 rounded-xl transition-all shadow-sm active:scale-95 duration-200 border-2",
            added
              ? "bg-black text-white hover:bg-gray-800 border-black"
              : "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700",
          )}
          onClick={handleAction}
        >
          {added ? (
            <>
              <Check className="h-3.5 w-3.5" /> Carted
            </>
          ) : (
            <>
              <ShoppingCart className="h-3.5 w-3.5" /> Buy Now
            </>
          )}
        </button>
      </div>
    </NextLink>
  );
};
