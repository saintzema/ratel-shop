"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { ChevronRight, TrendingUp, Loader2 } from "lucide-react";
import { SearchGridCard } from "@/components/product/SearchGridCard";
import { Product } from "@/lib/types";

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
    const [hasMore, setHasMore] = useState(true);
    const loaderRef = useRef<HTMLDivElement>(null);
    const ITEMS_PER_PAGE = 12;

    // Initial load
    useEffect(() => {
        if (products.length > 0 && displayedProducts.length === 0) {
            setDisplayedProducts(products.slice(0, ITEMS_PER_PAGE));
            setHasMore(products.length > ITEMS_PER_PAGE);
        }
    }, [products]);

    // Intersection Observer for infinite scrolling
    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            const target = entries[0];
            if (target.isIntersecting && hasMore && !isLoading) {
                loadMore();
            }
        }, {
            root: null,
            rootMargin: '400px', // Trigger load well before hitting bottom
            threshold: 0
        });

        if (loaderRef.current) {
            observer.observe(loaderRef.current);
        }

        return () => {
            if (loaderRef.current) {
                observer.unobserve(loaderRef.current);
            }
        };
    }, [hasMore, isLoading, page, products]);

    const loadMore = () => {
        setIsLoading(true);
        // Simulate network delay for smooth UX loading effect (like Temu)
        setTimeout(() => {
            const nextIndex = page * ITEMS_PER_PAGE;
            // Endless loop mechanism: if we run out of unique products, start pulling from the beginning again
            // varied by a random sort slice, creating an 'endless' Temu-style hallucination loop
            const nextBatch = products.slice(nextIndex, nextIndex + ITEMS_PER_PAGE);

            if (nextBatch.length > 0) {
                setDisplayedProducts(prev => [...prev, ...nextBatch]);
                setPage(prev => prev + 1);
                setHasMore(nextIndex + ITEMS_PER_PAGE < products.length);
            } else {
                // If we ran out of physical catalog, recycle the catalog endlessly to mimic Temu's bottomless feed
                const shuffledCatalog = [...products].sort(() => 0.5 - Math.random());
                setDisplayedProducts(prev => [...prev, ...shuffledCatalog.slice(0, ITEMS_PER_PAGE)]);
            }
            setIsLoading(false);
        }, 800);
    };

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

            {/* Vertically Scrolling 2-Column Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-1.5 md:gap-4 w-full">
                {displayedProducts.map((product, idx) => (
                    <SearchGridCard
                        key={`${product.id}-${idx}-${Math.random()}`}
                        product={product}
                    />
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
