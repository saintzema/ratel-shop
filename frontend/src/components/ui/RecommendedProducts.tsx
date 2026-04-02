"use client";

import { useRef, useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, TrendingUp, Loader2, ShoppingCart, Star } from "lucide-react";
import { Product } from "@/lib/types";
import { useCart } from "@/context/CartContext";

interface RecommendedProductsProps {
    products: Product[];
    title?: string;
    subtitle?: string;
    icon?: React.ReactNode;
}

export function RecommendedProducts({
    products,
    title = "Recommended For You",
    subtitle = "Based on your activity",
    icon = <TrendingUp className="h-5 w-5 text-brand-green-600" />,
}: RecommendedProductsProps) {
    const [displayedProducts, setDisplayedProducts] = useState<Product[]>([]);
    const [page, setPage] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const loaderRef = useRef<HTMLDivElement>(null);
    const ITEMS_PER_PAGE = 12;
    const { addToCart } = useCart();
    const router = useRouter();

    // Initial load
    useEffect(() => {
        if (products.length > 0 && displayedProducts.length === 0) {
            setDisplayedProducts(products.slice(0, ITEMS_PER_PAGE));
        }
    }, [products]);

    // Refs for observer callback
    const pageRef = useRef(page);
    const productsRef = useRef(products);
    const loadingRef = useRef(isLoading);
    useEffect(() => { pageRef.current = page; }, [page]);
    useEffect(() => { productsRef.current = products; }, [products]);
    useEffect(() => { loadingRef.current = isLoading; }, [isLoading]);

    // Intersection Observer — re-attaches whenever the list updates to ensure loader is tracked
    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            const target = entries[0];
            if (target.isIntersecting && !loadingRef.current) {
                setIsLoading(true);
                setTimeout(() => {
                    const currentPage = pageRef.current;
                    const allProducts = productsRef.current;
                    const nextIndex = currentPage * ITEMS_PER_PAGE;
                    const nextBatch = allProducts.slice(nextIndex, nextIndex + ITEMS_PER_PAGE);

                    if (nextBatch.length > 0) {
                        setDisplayedProducts(prev => [...prev, ...nextBatch]);
                        setPage(prev => prev + 1);
                    } else {
                        // Endless loop — shuffle and recycle local catalogue
                        const shuffled = [...allProducts].sort(() => 0.5 - Math.random());
                        setDisplayedProducts(prev => [...prev, ...shuffled.slice(0, ITEMS_PER_PAGE)]);
                    }
                    setIsLoading(false);
                }, 800);
            }
        }, { root: null, rootMargin: '400px', threshold: 0 });

        const node = loaderRef.current;
        if (node) observer.observe(node);
        return () => { if (node) observer.unobserve(node); };
    }, [displayedProducts.length]); // Re-attach observer when list updates to ensure loader target is tracked

    if (!products || products.length === 0) return null;

    return (
        <div className="w-full">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-4 md:mb-6">
                <div>
                    <h2 className="text-xl md:text-2xl font-extrabold tracking-tight text-gray-900 flex items-center gap-2">
                        {icon && <span className="shrink-0">{icon}</span>}
                        {title}
                    </h2>
                    {subtitle && (
                        <p className="text-sm text-gray-500 font-medium mt-1 ml-7">
                            {subtitle}
                        </p>
                    )}
                </div>
                <Link
                    href="/search"
                    className="text-sm font-semibold text-blue-600 hover:text-brand-orange hover:underline flex items-center transition-colors whitespace-nowrap"
                >
                    View all recommendations <ChevronRight className="h-4 w-4 ml-0.5" />
                </Link>
            </div>

            {/* Grid with round-button card design matching categories page */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2 md:gap-3 w-full">
                {displayedProducts.map((product, idx) => (
                    <div
                        key={`${product.id}-${idx}`}
                        className="group relative bg-white flex flex-col hover:shadow-lg transition-all rounded-xl overflow-hidden cursor-pointer border border-gray-100"
                        onClick={() => router.push(`/product/${product.id}`)}
                    >
                        <div className="relative aspect-[4/5] w-full bg-gray-50/50 overflow-hidden shrink-0">
                            <img
                                src={product.images?.[0] || product.image_url || '/assets/images/placeholder.png'}
                                alt={product.name}
                                loading="lazy"
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                onError={(e) => { e.currentTarget.src = '/assets/images/placeholder.png'; }}
                            />

                            {/* Sponsored Badge */}
                            {product.is_sponsored && (
                                <div className="absolute top-2 left-2 bg-gray-900/80 backdrop-blur-md text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm z-10 uppercase tracking-widest flex items-center gap-1">
                                    <span>Sponsored</span>
                                </div>
                            )}

                            {/* Discount Badge */}
                            {product.original_price && product.original_price > product.price && (
                                <div className="absolute top-2 right-2 bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md shadow-sm z-10">
                                    -{Math.round(((product.original_price - product.price) / product.original_price) * 100)}%
                                </div>
                            )}

                            {/* Round Cart Button — high visibility */}
                            <button
                                onClick={(e) => { e.stopPropagation(); addToCart(product); }}
                                className="absolute bottom-2 right-2 w-9 h-9 rounded-full bg-emerald-600 shadow-lg shadow-emerald-600/30 flex items-center justify-center transition-all z-10 hover:bg-emerald-700 hover:scale-110 active:scale-95"
                            >
                                <ShoppingCart className="h-4 w-4 text-white" strokeWidth={2.5} />
                                <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-white rounded-full flex items-center justify-center shadow-sm">
                                    <span className="font-black text-emerald-600 text-[9px] leading-none">+</span>
                                </div>
                            </button>
                        </div>

                        {/* Product Details */}
                        <div className="p-2.5 flex-1 flex flex-col w-full text-left">
                            <h3 className="text-[12px] sm:text-[13px] font-semibold text-gray-900 leading-[1.3] line-clamp-2 mb-1 group-hover:text-emerald-700 transition-colors">
                                {product.name}
                            </h3>

                            <div className="flex items-center gap-1">
                                <div className="flex items-center">
                                    {[...Array(5)].map((_, i) => {
                                        const rating = product.avg_rating || 4.5;
                                        return (
                                            <Star
                                                key={i}
                                                className={`h-2.5 w-2.5 ${i < Math.floor(rating) ? "fill-amber-400 text-amber-400" : i < rating ? "fill-amber-400 text-amber-400 opacity-60" : "fill-gray-200 text-gray-200"}`}
                                                strokeWidth={1}
                                            />
                                        );
                                    })}
                                </div>
                                <span className="text-[11px] text-gray-500">{product.review_count > 0 ? product.review_count.toLocaleString() : Math.floor(product.sold_count / 8)}</span>
                            </div>

                            <div className="flex items-baseline gap-1.5 mt-1 flex-wrap">
                                <span className="text-[15px] sm:text-[16px] font-black text-gray-900 tracking-tight leading-none">
                                    ₦{product.price.toLocaleString()}
                                </span>
                                {product.original_price && product.original_price > product.price && (
                                    <span className="text-[11px] text-gray-400 line-through font-medium leading-none">
                                        ₦{product.original_price.toLocaleString()}
                                    </span>
                                )}
                            </div>
                            <span className="text-[10px] text-gray-400 font-medium mt-0.5">
                                {product.sold_count > 1000 ? `${Math.floor(product.sold_count / 1000)}K+` : product.sold_count} sold
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Invisible Loading Trigger */}
            <div ref={loaderRef} className="w-full py-12 flex justify-center items-center">
                {isLoading && (
                    <div className="flex flex-col items-center justify-center gap-3 text-brand-green-600">
                        <Loader2 className="h-6 w-6 animate-spin" />
                        <span className="text-xs font-bold uppercase tracking-widest text-emerald-700/60">Loading More Deals</span>
                    </div>
                )}
            </div>
        </div>
    );
}
