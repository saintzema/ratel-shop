"use client";

import { useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { DEMO_PRODUCTS } from "@/lib/data";
import { CATEGORIES } from "@/lib/types";
import { ProductCard } from "@/components/product/ProductCard";
import { Button } from "@/components/ui/button";
import { ChevronRight, Star, ShieldCheck } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import Link from "next/link";
import { cn } from "@/lib/utils";

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

    // Filter & Sort logic
    const products = DEMO_PRODUCTS.filter(p => {
        const categoryMatch = slug === "all" || p.category === slug || (slug === "verified" && p.seller_name.includes("TechHub"));
        const priceMatch = p.price >= priceMin && p.price <= priceMax;
        return categoryMatch && priceMatch;
    }).sort((a, b) => {
        switch (sortBy) {
            case "price_asc": return a.price - b.price;
            case "price_desc": return b.price - a.price;
            case "rating": return b.avg_rating - a.avg_rating;
            case "newest": return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            default: return 0;
        }
    });

    const handlePreset = useCallback((min: number, max: number) => {
        setPriceMin(min);
        setPriceMax(max);
    }, []);

    const handleReset = useCallback(() => {
        setPriceMin(MIN_PRICE);
        setPriceMax(MAX_PRICE);
    }, []);

    return (
        <div className="min-h-screen bg-brand-green-50 flex flex-col font-sans text-gray-900">
            <Navbar />

            <main className="flex-1 container mx-auto px-4 py-6 flex gap-6">
                {/* Sidebar Filters */}
                <div className="hidden lg:block w-64 flex-shrink-0 space-y-6 text-gray-900">

                    {/* Categories */}
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

                    {/* ─── Price Range Slider ─── */}
                    <div>
                        <h3 className="font-bold text-sm mb-3 text-black border-b border-gray-200 pb-1">Price</h3>

                        {/* Display selected range */}
                        <div className="text-center mb-3">
                            <span className="text-sm font-semibold text-brand-green-700 bg-brand-green-50 px-3 py-1 rounded-full border border-brand-green-200">
                                {formatNaira(priceMin)} — {formatNaira(priceMax)}
                            </span>
                        </div>

                        {/* Dual Range Slider */}
                        <DualRangeSlider
                            min={MIN_PRICE}
                            max={MAX_PRICE}
                            step={STEP}
                            valueMin={priceMin}
                            valueMax={priceMax}
                            onChangeMin={setPriceMin}
                            onChangeMax={setPriceMax}
                        />

                        {/* Quick Presets */}
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
                                        priceMin === preset.min && priceMax === preset.max
                                            ? "bg-brand-green-600 text-white border-brand-green-600"
                                            : "bg-white text-gray-600 border-gray-300 hover:border-brand-green-400 hover:text-brand-green-600"
                                    )}
                                >
                                    {preset.label}
                                </button>
                            ))}
                        </div>

                        {/* Reset */}
                        {(priceMin > MIN_PRICE || priceMax < MAX_PRICE) && (
                            <button
                                onClick={handleReset}
                                className="text-xs text-blue-600 hover:underline mt-2 font-medium"
                            >
                                Reset price filter
                            </button>
                        )}
                    </div>

                    {/* Rating Filter */}
                    <div>
                        <h3 className="font-bold text-sm mb-2 text-black border-b border-gray-200 pb-1">Avg. Customer Review</h3>
                        <div className="space-y-1">
                            {[4, 3, 2, 1].map(rating => (
                                <div key={rating} className="flex items-center gap-1 text-sm cursor-pointer hover:text-brand-green-600 group">
                                    <div className="flex text-amber-400">
                                        {[...Array(5)].map((_, i) => (
                                            <Star key={i} className={cn("h-4 w-4", i < rating ? "fill-current" : "text-gray-300")} />
                                        ))}
                                    </div>
                                    <span className="text-gray-700 group-hover:text-brand-green-600 font-medium">& Up</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Seller Type */}
                    <div>
                        <h3 className="font-bold text-sm mb-2 text-black border-b border-gray-200 pb-1">Seller Type</h3>
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm cursor-pointer hover:text-brand-green-600 group">
                                <input type="checkbox" className="rounded border-gray-400 text-brand-green-600 focus:ring-brand-green-600" />
                                <span className="flex items-center gap-1 text-gray-800"><ShieldCheck className="h-3 w-3 text-brand-green-600" /> Superadmin Verified</span>
                            </label>
                            <label className="flex items-center gap-2 text-sm cursor-pointer hover:text-brand-green-600 group">
                                <input type="checkbox" className="rounded border-gray-400 text-brand-green-600 focus:ring-brand-green-600" />
                                <span className="text-gray-800">FairPrice Fulfillment</span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Product Grid */}
                <div className="flex-1">
                    <div className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                        <h1 className="font-bold text-lg capitalize mb-2 sm:mb-0 text-black">
                            {products.length} results for <span className="text-brand-green-700">"{categoryLabel}"</span>
                        </h1>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600 font-medium">Sort by:</span>
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
                            <ProductCard
                                key={product.id}
                                product={product}
                                className="bg-white border-gray-200 text-black shadow-sm"
                            />
                        ))}
                    </div>

                    {products.length === 0 && (
                        <div className="text-center py-16">
                            <p className="text-gray-500 text-lg mb-2">No products found in this price range</p>
                            <button onClick={handleReset} className="text-brand-green-600 hover:underline font-semibold">
                                Reset price filter
                            </button>
                        </div>
                    )}

                    {/* Pagination Mock */}
                    {products.length > 0 && (
                        <div className="mt-8 flex justify-center">
                            <div className="flex items-center gap-2">
                                <Button variant="outline" disabled>Previous</Button>
                                <Button variant="outline" className="bg-gray-100">1</Button>
                                <Button variant="outline">2</Button>
                                <Button variant="outline">3</Button>
                                <span className="text-gray-400">...</span>
                                <Button variant="outline">Next</Button>
                            </div>
                        </div>
                    )}
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
