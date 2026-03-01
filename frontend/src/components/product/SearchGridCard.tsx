"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { ShieldCheck, Heart, Star, Check, ShoppingCart } from "lucide-react";
import NextLink from "next/link";
import { cn } from "@/lib/utils";

export const SearchGridCard = ({
  product,
  showGlobalPartner = false,
}: {
  product: any;
  showGlobalPartner?: boolean;
}) => {
  const [added, setAdded] = useState(false);
  const router = useRouter();
  const { addToCart } = useCart();

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

  return (
    <NextLink
      href={`/product/${product.id || "global_" + product.name.replace(/\s+/g, "_").toLowerCase()}`}
      className="bg-white rounded-2xl border border-gray-100 hover:border-emerald-200 hover:shadow-xl hover:shadow-emerald-500/5 transition-all group flex flex-col overflow-hidden h-full"
    >
      <div className="relative aspect-square w-full bg-gray-50 flex items-center justify-center overflow-hidden">
        {/* Sponsored Badge */}
        {product.is_sponsored && (
          <div className="absolute top-3 left-3 z-30 bg-gray-900/80 backdrop-blur-md text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm uppercase tracking-widest flex items-center gap-1">
            <span>Sponsored</span>
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
          className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-white/80 backdrop-blur-sm shadow-sm border border-gray-100 hover:bg-white hover:scale-110 transition-all text-gray-400 hover:text-red-500"
          onClick={(e) => e.preventDefault()}
        >
          <Heart className="h-4 w-4 transition-colors" />
        </button>
        <img
          src={
            product.image_url ||
            product.images?.[0] ||
            "/assets/images/placeholder.png"
          }
          alt={product.name}
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={(e) => {
            e.currentTarget.src = "/assets/images/placeholder.png";
          }}
        />
      </div>
      <div className="p-4 flex flex-col flex-1 border-t border-gray-50 bg-gradient-to-b from-white to-gray-50/50">
        <h4 className="font-bold text-base text-gray-900 line-clamp-2 group-hover:text-emerald-700 transition-colors mb-2 min-h-[48px] leading-snug">
          {product.name}
        </h4>

        <div className="flex items-center gap-1.5 mb-2.5">
          {showGlobalPartner ||
            product.seller_id === "global-partners" ||
            product._source === "global" ? (
            <span className="text-[10px] font-black uppercase tracking-widest bg-emerald-100/50 text-emerald-800 px-2 py-0.5 rounded-full shadow-sm">
              Global Partner
            </span>
          ) : (
            <span className="text-[10px] font-bold bg-gray-100 text-gray-700 px-2.5 py-0.5 rounded-full truncate max-w-full">
              {product.seller_name || "Marketplace Seller"}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 mb-3">
          <span className="text-sm font-bold text-amber-500">
            {(product.avg_rating || 4.5).toFixed(1)}
          </span>
          <div className="flex items-center">
            {[1, 2, 3, 4, 5].map((s: number) => (
              <Star
                key={s}
                className={`w-3.5 h-3.5 flex-shrink-0 ${s <= Math.round(product.avg_rating || 4.5) ? "text-amber-400 fill-amber-400" : "text-gray-200"}`}
              />
            ))}
          </div>
          <span className="text-xs text-blue-600 hover:underline">
            (
            {(
              product.review_count || Math.floor(Math.random() * 500) + 50
            ).toLocaleString()}
            )
          </span>
        </div>

        <div className="flex items-baseline gap-2 mt-auto mb-4 flex-wrap">
          <p className="text-2xl font-black tracking-tight text-gray-900">
            ₦{(product.price || product.approxPrice || 0).toLocaleString()}
          </p>
          {product.original_price &&
            product.original_price > (product.price || product.approxPrice) && (
              <p className="text-sm text-gray-400 line-through font-medium">
                ₦{product.original_price.toLocaleString()}
              </p>
            )}
          {discount > 0 && (
            <span className="text-xs text-red-500 font-bold ml-auto bg-red-50 px-2 py-0.5 rounded-full">
              -{discount}%
            </span>
          )}
        </div>

        <button
          className={cn(
            "w-full flex items-center justify-center gap-2 text-sm font-black py-3 rounded-xl transition-all shadow-sm active:scale-95 duration-200 border-2",
            added
              ? "bg-black text-white hover:bg-gray-800 border-black"
              : "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700",
          )}
          onClick={handleAction}
        >
          {added ? (
            <>
              <Check className="h-4 w-4" /> View Cart
            </>
          ) : (
            <>
              <ShoppingCart className="h-4 w-4" /> Add to cart
            </>
          )}
        </button>
      </div>
    </NextLink>
  );
};
