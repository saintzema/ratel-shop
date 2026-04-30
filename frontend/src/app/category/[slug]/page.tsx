"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useParams } from "next/navigation";
import { SEED_PRODUCTS } from "@/lib/data";
import { CATEGORIES } from "@/lib/types";
import { ProductCard } from "@/components/product/ProductCard";
import { Button } from "@/components/ui/button";
import { ChevronRight, Star, ShieldCheck } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { DataSyncService } from "@/lib/sync-store";
import { YouMayAlsoLike } from "@/components/product/YouMayAlsoLike";

const MIN_PRICE = 0;
const MAX_PRICE = 2000000;
const STEP = 5000;

function formatNaira(value: number): string {
    if (value >= 1000000) return `₦${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `₦${(value / 1000).toFixed(0)}k`;
    return `₦${value.toLocaleString()}`;
}

export default function CategoryPage() {
    const params = useParams();
    const slug = params.slug as string;
    const categoryLabel = CATEGORIES.find(c => c.value === slug)?.label || slug.replace("-", " ");

    const [sortBy, setSortBy] = useState("featured");
    const [priceMin, setPriceMin] = useState(MIN_PRICE);
    const [priceMax, setPriceMax] = useState(MAX_PRICE);
    const [allProducts, setAllProducts] = useState<any[]>([]);

    useEffect(() => {
        setAllProducts(DataSyncService.getApprovedProducts().filter(p => p.is_active));
    }, []);

    // 1. Pagination State
    const [displayLimit, setDisplayLimit] = useState(20);

    // 2. Intelligent Filter & Sort logic
    const filteredProducts = allProducts.filter(p => {
        const lowerSlug = slug.toLowerCase();
        const lowerCat = (p.category || "").toLowerCase();
        const lowerSub = (p.subcategory || "").toLowerCase();
        const lowerName = (p.name || "").toLowerCase();
        const lowerDesc = (p.description || "").toLowerCase();

        // Check for direct match first
        let isMatch = slug === "all" || 
                     lowerCat === lowerSlug || 
                     lowerSub === lowerSlug;
        
        // Keyword fallback for specific pills (like streaming-kits, home-office)
        if (!isMatch && lowerSlug.includes("-")) {
            const keywords = lowerSlug.split("-");
            isMatch = keywords.every(kw => lowerName.includes(kw) || lowerDesc.includes(kw) || lowerCat.includes(kw));
        }

        // Special slugs
        if (!isMatch) {
            if (slug === "new") {
                isMatch = !!p.is_new || (p.created_at && new Date(p.created_at).getTime() > Date.now() - 30 * 24 * 60 * 60 * 1000);
            } else if (slug === "deals") {
                isMatch = !!(p.original_price && p.original_price > p.price);
            } else if (slug === "verified") {
                isMatch = p.price_flag === "fair" || p.seller_name?.includes("TechHub") || p.is_sponsored;
            }
        }

        const priceMatch = p.price >= priceMin && p.price <= priceMax;
        return isMatch && priceMatch;
    }).sort((a, b) => {
        if (a.is_sponsored && !b.is_sponsored) return -1;
        if (!a.is_sponsored && b.is_sponsored) return 1;

        switch (sortBy) {
            case "price_asc": return a.price - b.price;
            case "price_desc": return b.price - a.price;
            case "rating": return b.avg_rating - a.avg_rating;
            case "newest": return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            default: return 0;
        }
    });

    // 3. Slice for pagination
    const products = filteredProducts.slice(0, displayLimit);
    const hasMore = filteredProducts.length > displayLimit;

    const handlePreset = useCallback((min: number, max: number) => {
        setPriceMin(min);
        setPriceMax(max);
        setDisplayLimit(20); // Reset limit on filter change
    }, []);

    const handleReset = useCallback(() => {
        setPriceMin(MIN_PRICE);
        setPriceMax(MAX_PRICE);
        setDisplayLimit(20);
    }, []);

    const loadMore = () => {
        setDisplayLimit(prev => prev + 20);
    };

    return (
        <div className="min-h-screen bg-brand-green-50 flex flex-col font-sans text-gray-900">
            <Navbar />

            <main className="flex-1 container mx-auto px-4 py-6 flex flex-col lg:flex-row gap-6">
                {/* Sidebar Filters */}
                <div className="hidden lg:block w-64 flex-shrink-0 space-y-6 text-gray-900">
                    {/* ... (Categories, Price, etc. remain the same) */}
                    <div>
                        <h3 className="font-bold text-sm mb-2 text-black border-b border-gray-200 pb-1">Departments</h3>
                        <ul className="text-sm space-y-2">
                            {CATEGORIES.map(cat => (
                                <li key={cat.value}>
                                    <Link
                                        href={`/category/${cat.value}`}
                                        className={cn(
                                            "block hover:text-brand-green-600 transition-colors",
                                            slug === cat.value ? "font-bold text-brand-green-700 bg-white shadow-sm rounded-md px-2 py-1" : "text-gray-700"
                                        )}
                                    >
                                        <ChevronRight className="inline h-3 w-3 mr-1 text-gray-400" />
                                        {cat.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <h3 className="font-bold text-sm mb-3 text-black border-b border-gray-200 pb-1">Price</h3>
                        <div className="text-center mb-3">
                            <span className="text-sm font-semibold text-brand-green-700 bg-brand-green-50 px-3 py-1 rounded-full border border-brand-green-200">
                                {formatNaira(priceMin)} — {formatNaira(priceMax)}
                            </span>
                        </div>
                        <DualRangeSlider
                            min={MIN_PRICE} max={MAX_PRICE} step={STEP}
                            valueMin={priceMin} valueMax={priceMax}
                            onChangeMin={setPriceMin} onChangeMax={setPriceMax}
                        />
                        <div className="flex flex-wrap gap-1.5 mt-3">
                            {[
                                { label: "Under ₦20k", min: 0, max: 20000 },
                                { label: "₦20k – 100k", min: 20000, max: 100000 },
                                { label: "₦100k – 500k", min: 100000, max: 500000 },
                                { label: "₦500k+", min: 500000, max: MAX_PRICE },
                            ].map(preset => (
                                <button
                                    key={preset.label}
                                    onClick={() => handlePreset(preset.min, preset.max)}
                                    className={cn(
                                        "text-xs px-2.5 py-1 rounded-full border transition-colors font-medium",
                                        priceMin === preset.min && priceMax === preset.max ? "bg-brand-green-600 text-white" : "bg-white text-gray-600"
                                    )}
                                >
                                    {preset.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Product Grid Area */}
                <div className="flex-1">
                    <div className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                        <h1 className="font-bold text-lg capitalize mb-2 sm:mb-0 text-black">
                            {filteredProducts.length} results for <span className="text-brand-green-700">"{categoryLabel}"</span>
                        </h1>
                        <div className="flex items-center gap-2">
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="text-sm bg-transparent border-gray-300 rounded focus:ring-brand-green-500 font-medium cursor-pointer text-gray-800"
                            >
                                <option value="featured">Featured</option>
                                <option value="price_asc">Price: Low to High</option>
                                <option value="price_desc">Price: High to Low</option>
                                <option value="rating">Avg. Customer Review</option>
                                <option value="newest">Newest Arrivals</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {products.map(product => (
                            <ProductCard key={product.id} product={product} className="bg-white" />
                        ))}
                    </div>

                    {filteredProducts.length === 0 && (
                        <div className="text-center py-16 bg-white rounded-lg border border-dashed border-gray-300">
                            <p className="text-gray-500 text-lg mb-2">No products found in this category or price range</p>
                            <button onClick={handleReset} className="text-brand-green-600 hover:underline font-semibold">
                                Reset filters
                            </button>
                        </div>
                    )}

                    {/* REAL Load More Action */}
                    {hasMore && (
                        <div className="mt-12 flex flex-col items-center gap-4">
                            <p className="text-sm text-gray-500">Showing {products.length} of {filteredProducts.length} products</p>
                            <Button 
                                onClick={loadMore}
                                size="lg"
                                className="rounded-full px-12 bg-[#047857] hover:bg-[#065f46] text-white font-bold shadow-lg h-12"
                            >
                                LOAD MORE RESULTS
                            </Button>
                        </div>
                    )}

                    <div className="mt-16 mb-8">
                        <YouMayAlsoLike
                            cartCategories={slug !== 'all' && slug !== 'verified' ? [slug] : []}
                            title="More Suggestions For You"
                        />
                    </div>
                </div>
            </main>

                    <div className="mt-16 mb-8">
                        <YouMayAlsoLike
                            cartCategories={slug !== 'all' && slug !== 'verified' ? [slug] : []}
                            title="More Suggestions For You"
                        />
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}


// ─── Dual Range Slider Component ────────────────────────────────

function DualRangeSlider({
    min, max, step, valueMin, valueMax, onChangeMin, onChangeMax,
}: {
    min: number; max: number; step: number;
    valueMin: number; valueMax: number;
    onChangeMin: (v: number) => void; onChangeMax: (v: number) => void;
}) {
    const trackRef = useRef<HTMLDivElement>(null);

    const minPercent = ((valueMin - min) / (max - min)) * 100;
    const maxPercent = ((valueMax - min) / (max - min)) * 100;

    return (
        <div className="relative h-8 flex items-center px-1">
            {/* Background track */}
            <div ref={trackRef} className="absolute left-1 right-1 h-1.5 bg-gray-200 rounded-full" />

            {/* Active range highlight */}
            <div
                className="absolute h-1.5 bg-brand-green-500 rounded-full"
                style={{ left: `calc(${minPercent}% + 4px)`, right: `calc(${100 - maxPercent}% + 4px)` }}
            />

            {/* Min slider */}
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={valueMin}
                onChange={(e) => {
                    const v = Number(e.target.value);
                    if (v <= valueMax - step) onChangeMin(v);
                }}
                className="absolute left-0 right-0 appearance-none bg-transparent pointer-events-none z-10
                    [&::-webkit-slider-thumb]:pointer-events-auto
                    [&::-webkit-slider-thumb]:appearance-none
                    [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5
                    [&::-webkit-slider-thumb]:rounded-full
                    [&::-webkit-slider-thumb]:bg-white
                    [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-brand-green-500
                    [&::-webkit-slider-thumb]:shadow-md
                    [&::-webkit-slider-thumb]:cursor-pointer
                    [&::-webkit-slider-thumb]:transition-transform
                    [&::-webkit-slider-thumb]:hover:scale-125
                    [&::-moz-range-thumb]:pointer-events-auto
                    [&::-moz-range-thumb]:appearance-none
                    [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5
                    [&::-moz-range-thumb]:rounded-full
                    [&::-moz-range-thumb]:bg-white
                    [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-brand-green-500
                    [&::-moz-range-thumb]:cursor-pointer"
                style={{ width: '100%' }}
            />

            {/* Max slider */}
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={valueMax}
                onChange={(e) => {
                    const v = Number(e.target.value);
                    if (v >= valueMin + step) onChangeMax(v);
                }}
                className="absolute left-0 right-0 appearance-none bg-transparent pointer-events-none z-20
                    [&::-webkit-slider-thumb]:pointer-events-auto
                    [&::-webkit-slider-thumb]:appearance-none
                    [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5
                    [&::-webkit-slider-thumb]:rounded-full
                    [&::-webkit-slider-thumb]:bg-white
                    [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-brand-green-500
                    [&::-webkit-slider-thumb]:shadow-md
                    [&::-webkit-slider-thumb]:cursor-pointer
                    [&::-webkit-slider-thumb]:transition-transform
                    [&::-webkit-slider-thumb]:hover:scale-125
                    [&::-moz-range-thumb]:pointer-events-auto
                    [&::-moz-range-thumb]:appearance-none
                    [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5
                    [&::-moz-range-thumb]:rounded-full
                    [&::-moz-range-thumb]:bg-white
                    [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-brand-green-500
                    [&::-moz-range-thumb]:cursor-pointer"
                style={{ width: '100%' }}
            />
        </div>
    );
}
