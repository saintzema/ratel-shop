"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, TrendingUp } from "lucide-react";
import { ProductCard } from "@/components/product/ProductCard";
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
    const scrollRef = useRef<HTMLDivElement>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const [isHovered, setIsHovered] = useState(false);
    const [canScrollLeft, setCanScrollLeft] = useState(true);
    const [canScrollRight, setCanScrollRight] = useState(true);

    const checkScroll = () => {
        if (scrollRef.current) {
            // with 3 copies, there's always scroll space unless very wide monitor
            setCanScrollLeft(true);
            setCanScrollRight(true);
        }
    };

    useEffect(() => {
        checkScroll();
        window.addEventListener("resize", checkScroll);
        return () => window.removeEventListener("resize", checkScroll);
    }, [products]);

    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;

        const startAutoScroll = () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            intervalRef.current = setInterval(() => {
                if (!el) return;
                if (el.scrollLeft >= el.scrollWidth / 3) {
                    el.scrollLeft = 0;
                } else {
                    el.scrollLeft += 1;
                }
            }, 30);
        };

        if (!isHovered) {
            startAutoScroll();
        } else {
            if (intervalRef.current) clearInterval(intervalRef.current);
        }

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        }
    }, [isHovered, products]);

    const scroll = (direction: "left" | "right") => {
        if (scrollRef.current) {
            const scrollAmount = direction === "left" ? -300 : 300;
            scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
        }
    };

    if (!products || products.length === 0) return null;

    return (
        <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-border group/recommender relative">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
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

            <div className="relative">
                {/* Left Navigation Arrow */}
                {canScrollLeft && (
                    <button
                        onClick={() => scroll("left")}
                        className="absolute -left-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white/90 backdrop-blur-sm border border-gray-200 shadow-xl rounded-full flex items-center justify-center text-gray-800 hover:text-brand-orange hover:scale-110 transition-all opacity-0 group-hover/recommender:opacity-100"
                        aria-label="Scroll left"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </button>
                )}

                {/* Right Navigation Arrow */}
                {canScrollRight && (
                    <button
                        onClick={() => scroll("right")}
                        className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white/90 backdrop-blur-sm border border-gray-200 shadow-xl rounded-full flex items-center justify-center text-gray-800 hover:text-brand-orange hover:scale-110 transition-all opacity-0 group-hover/recommender:opacity-100"
                        aria-label="Scroll right"
                    >
                        <ChevronRight className="h-5 w-5" />
                    </button>
                )}

                {/* Horizontally Scrolling Container */}
                <div
                    ref={scrollRef}
                    onScroll={checkScroll}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    className="flex gap-4 md:gap-5 overflow-x-auto pb-4 pt-2 px-1 scrollbar-hide items-stretch"
                    style={{ scrollBehavior: isHovered ? "smooth" : "auto" }}
                >
                    {[...products, ...products, ...products].map((product, idx) => (
                        <div
                            key={`${product.id}-${idx}`}
                            className="min-w-[160px] md:min-w-[200px] snap-start flex flex-col"
                        >
                            <ProductCard product={product} className="h-full w-full" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
