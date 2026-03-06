"use client";

import { useState } from "react";
import Link from "next/link";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CheckCircle, Star, ChevronDown } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { DEMO_PRODUCTS } from "@/lib/data";
import { DemoStore } from "@/lib/demo-store";
import { Product } from "@/lib/types";

interface YouMayAlsoLikeProps {
    cartCategories?: string[];
    cartIds?: Set<string>;
    title?: string;
}

export function YouMayAlsoLike({ cartCategories = [], cartIds = new Set(), title = "You May Also Like" }: YouMayAlsoLikeProps) {
    const { addToCart } = useCart();
    const [visibleProductsCount, setVisibleProductsCount] = useState(8);

    // Combine DEMO_PRODUCTS + DemoStore approved products for wider pool
    const storeProducts = DemoStore.getApprovedProducts();
    const allPool = [...DEMO_PRODUCTS, ...storeProducts.filter(sp => !DEMO_PRODUCTS.some(dp => dp.id === sp.id))];

    // Category-matched products (not already in cart)
    let allSimilar = allPool.filter(p => cartCategories.includes(p.category) && !cartIds.has(p.id));

    // Fallback & Padding: if we have fewer than 12 category matches, pad with popular products
    if (allSimilar.length < 12) {
        const existingIds = new Set(allSimilar.map(p => p.id));
        const popular = allPool
            .filter(p => !cartIds.has(p.id) && !existingIds.has(p.id))
            .sort((a, b) => (b.sold_count || 0) - (a.sold_count || 0));
        allSimilar = [...allSimilar, ...popular];
    }

    const hasCategoryMatches = allPool.some(p => cartCategories.includes(p.category) && !cartIds.has(p.id));
    const similarProducts = allSimilar.slice(0, visibleProductsCount);

    if (similarProducts.length === 0) return null;

    const displayTitle = cartCategories.length > 0 && hasCategoryMatches ? "Similar Items in Category" : title;

    return (
        <div className="container mx-auto px-4 mb-8 lg:mb-12 pb-0">
            <div className="bg-white rounded p-4 shadow-sm border border-gray-200">
                <h2 className="text-lg font-bold mb-4">{displayTitle}</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
                    {similarProducts.map(product => {
                        const discount = product.original_price && product.original_price > product.price
                            ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
                            : 0;
                        return (
                            <div key={product.id} className="group relative bg-white rounded-xl border border-gray-100 hover:border-emerald-200 hover:shadow-md transition-all overflow-hidden">
                                <Link href={`/product/${product.id}`} className="block">
                                    <div className="bg-gray-50 rounded-t-xl aspect-square p-3 flex items-center justify-center relative">
                                        <img src={product.image_url || "/assets/images/placeholder.png"} alt={product.name} className="w-full h-full object-contain mix-blend-multiply transition-transform group-hover:scale-105" onError={e => { e.currentTarget.src = "/assets/images/placeholder.png"; }} />
                                        {discount > 0 && (
                                            <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">-{discount}%</span>
                                        )}
                                    </div>
                                    <div className="p-2.5">
                                        <h3 className="text-xs sm:text-sm text-gray-700 line-clamp-2 min-h-[2.25rem] group-hover:text-brand-orange leading-tight">
                                            {product.name}
                                        </h3>
                                        {/* Rating & Sold */}
                                        <div className="flex items-center gap-1 mt-1">
                                            <div className="flex items-center">
                                                {[1, 2, 3, 4, 5].map(s => (
                                                    <Star key={s} className={`h-3 w-3 ${s <= Math.round(product.avg_rating || 0) ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
                                                ))}
                                            </div>
                                            <span className="text-[10px] text-gray-400">({product.review_count || 0})</span>
                                        </div>
                                        {/* Sold count */}
                                        {(product.sold_count || 0) > 0 && (
                                            <p className="text-[10px] text-gray-400 mt-0.5">{(product.sold_count || 0).toLocaleString()} sold</p>
                                        )}
                                        {/* Price */}
                                        <div className="mt-1.5 flex items-baseline gap-1.5 flex-wrap">
                                            <span className="font-bold text-sm text-gray-900">{formatPrice(product.price)}</span>
                                            {product.original_price && product.original_price > product.price && (
                                                <span className="text-[10px] text-gray-400 line-through">{formatPrice(product.original_price)}</span>
                                            )}
                                        </div>
                                        {/* Fair Price Badge */}
                                        {product.price_flag === "fair" && (
                                            <div className="mt-1.5 flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full w-fit">
                                                <CheckCircle className="h-2.5 w-2.5" />
                                                <span className="text-[9px] font-bold uppercase tracking-wider">Fair Price</span>
                                            </div>
                                        )}
                                    </div>
                                </Link>
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        addToCart(product as any);
                                        const btn = e.currentTarget;
                                        btn.innerHTML = '✓';
                                        btn.classList.add('bg-emerald-500', 'text-white', 'border-emerald-500');
                                        setTimeout(() => { btn.innerHTML = '+'; btn.classList.remove('bg-emerald-500', 'text-white', 'border-emerald-500'); }, 1200);
                                    }}
                                    className="absolute top-2 right-2 w-7 h-7 hover:cursor-pointer rounded-full border-2 border-emerald-500 bg-white text-emerald-600 hover:bg-emerald-500 hover:text-white flex items-center justify-center font-bold text-lg transition-all shadow-sm z-10"
                                    title="Add to Cart"
                                >
                                    +
                                </button>
                            </div>
                        );
                    })}
                </div>
                {allSimilar.length > visibleProductsCount && (
                    <div className="flex justify-center mt-6">
                        <Button
                            variant="outline"
                            className="rounded-full px-8 py-3 text-sm font-bold text-gray-700 hover:text-black hover:bg-gray-50 border-gray-200 hover:border-gray-300 shadow-sm transition-all"
                            onClick={() => setVisibleProductsCount(prev => prev + 8)}
                        >
                            View More <ChevronDown className="h-4 w-4 ml-2" />
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
