"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import NextLink from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { SearchResultCard } from "@/components/product/SearchResultCard";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { DemoStore } from "@/lib/demo-store";
import { CATEGORIES } from "@/lib/types";
import { formatPrice, cn } from "@/lib/utils";
import { Filter, SlidersHorizontal, ArrowUpDown, Search as SearchIcon, Star, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function SearchContent() {
    const searchParams = useSearchParams();
    const router = useRouter();

    // URL Params
    const query = searchParams.get("q") || "";
    const categoryParam = searchParams.get("category");
    const verifiedParam = searchParams.get("verified") === "true";
    const sortParam = searchParams.get("sort") || "relevance";
    const minPriceParam = searchParams.get("minPrice");
    const maxPriceParam = searchParams.get("maxPrice");

    // Local State
    const [priceRange, setPriceRange] = useState([0, 5000000]);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(categoryParam);
    const [isVerified, setIsVerified] = useState(verifiedParam);
    const [sortBy, setSortBy] = useState(sortParam);

    useEffect(() => {
        if (minPriceParam) setPriceRange([Number(minPriceParam), Number(maxPriceParam) || 5000000]);
        setSelectedCategory(categoryParam);
        setIsVerified(verifiedParam);
        setSortBy(sortParam);
    }, [searchParams, minPriceParam, maxPriceParam, categoryParam, verifiedParam, sortParam]);

    const updateFilters = (newParams: Record<string, string | number | null | undefined>) => {
        const params = new URLSearchParams(searchParams.toString());
        Object.entries(newParams).forEach(([key, value]) => {
            if (value === null || value === undefined || value === "") {
                params.delete(key);
            } else {
                params.set(key, String(value));
            }
        });
        router.push(`/search?${params.toString()}`, { scroll: false });
    };

    // Live products from DemoStore — load on client only to avoid hydration mismatch
    const [allProducts, setAllProducts] = useState<import("@/lib/types").Product[]>([]);

    useEffect(() => {
        const refresh = () => setAllProducts(DemoStore.getProducts().filter(p => p.is_active));
        refresh(); // Initial client load
        window.addEventListener("demo-store-update", refresh);
        return () => window.removeEventListener("demo-store-update", refresh);
    }, []);

    const filteredProducts = useMemo(() => {
        return allProducts.filter(product => {
            if (query && !product.name.toLowerCase().includes(query.toLowerCase()) &&
                !product.description.toLowerCase().includes(query.toLowerCase())) return false;
            if (selectedCategory && selectedCategory !== "All" && product.category !== selectedCategory) return false;
            if (isVerified && !product.seller_name.includes("TechHub") && !product.seller_name.includes("Ratel")) return false;
            if (product.price < priceRange[0] || product.price > priceRange[1]) return false;
            return true;
        }).sort((a, b) => {
            switch (sortBy) {
                case "price_asc": return a.price - b.price;
                case "price_desc": return b.price - a.price;
                case "newest": return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                default: return 0;
            }
        });
    }, [query, selectedCategory, isVerified, priceRange, sortBy, allProducts]);

    const FilterSidebar = () => (
        <div className="space-y-8 text-black pb-20">
            <div className="flex items-center justify-between border-b pb-4">
                <h3 className="font-bold text-lg">Filters</h3>
                <button
                    onClick={() => updateFilters({ category: null, minPrice: null, maxPrice: null, verified: null, sort: null })}
                    className="text-xs text-blue-600 hover:underline"
                >
                    Clear all
                </button>
            </div>

            <div className="space-y-3">
                <h3 className="font-bold text-sm uppercase tracking-tight text-gray-900">Popular Ideas</h3>
                <div className="flex flex-wrap gap-2">
                    {["Clear Case", "MagSafe", "Quick Charge", "Durable"].map(tag => (
                        <button key={tag} className="px-3 py-1 bg-white border border-gray-300 rounded-full text-xs hover:bg-gray-50">
                            {tag}
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-3">
                <h3 className="font-bold text-sm uppercase tracking-tight text-gray-900">Department</h3>
                <div className="space-y-1.5 focus:outline-none">
                    <button
                        onClick={() => updateFilters({ category: null })}
                        className={`block text-sm transition-colors ${!selectedCategory ? "font-bold text-ratel-green-600" : "text-gray-600 hover:text-black"}`}
                    >
                        Any Department
                    </button>
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat.value}
                            onClick={() => updateFilters({ category: cat.value })}
                            className={`block text-sm transition-colors ${selectedCategory === cat.value ? "font-bold text-ratel-green-600" : "text-gray-600 hover:text-black"}`}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-3">
                <h3 className="font-bold text-sm uppercase tracking-tight text-gray-900">Customer Reviews</h3>
                <div className="space-y-2">
                    {[4, 3, 2, 1].map(rating => (
                        <button key={rating} className="flex items-center gap-1 group hover:text-ratel-orange">
                            <div className="flex text-amber-500">
                                {[...Array(5)].map((_, i) => (
                                    <Star key={i} className={cn("h-4 w-4", i < rating ? "fill-current" : "text-gray-300")} />
                                ))}
                            </div>
                            <span className="text-sm text-gray-600 group-hover:text-ratel-orange font-medium">& Up</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="font-bold text-sm uppercase tracking-tight text-gray-900">Price</h3>
                <div className="space-y-1.5 text-sm text-gray-600">
                    <div onClick={() => updateFilters({ maxPrice: 20000 })} className="hover:text-ratel-orange cursor-pointer">Under ₦20,000</div>
                    <div onClick={() => updateFilters({ minPrice: 20000, maxPrice: 100000 })} className="hover:text-ratel-orange cursor-pointer">₦20,000 to ₦100,000</div>
                    <div onClick={() => updateFilters({ minPrice: 100000, maxPrice: 500000 })} className="hover:text-ratel-orange cursor-pointer">₦100,000 to ₦500,000</div>
                </div>
                <Slider
                    defaultValue={[0, 5000000]}
                    value={priceRange}
                    max={5000000}
                    step={5000}
                    onValueChange={(val: number[]) => setPriceRange(val)}
                    onValueCommit={(val: number[]) => updateFilters({ minPrice: val[0], maxPrice: val[1] })}
                    className="my-6"
                />
                <div className="flex items-center justify-between text-xs font-medium text-black">
                    <span>₦{priceRange[0].toLocaleString()}</span>
                    <span>₦{priceRange[1].toLocaleString()}</span>
                </div>
            </div>

            <div className="space-y-3">
                <h3 className="font-bold text-sm uppercase tracking-tight text-gray-900">Seller</h3>
                <div className="flex items-center space-x-2 py-1">
                    <Checkbox
                        id="verified"
                        checked={isVerified}
                        onCheckedChange={(checked: boolean) => updateFilters({ verified: checked ? "true" : null })}
                        className="border-gray-400 text-ratel-green-600 focus:ring-ratel-green-600"
                    />
                    <label htmlFor="verified" className="text-sm font-medium leading-none text-black cursor-pointer">
                        Ratel Verified Only
                    </label>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-white font-sans selection:bg-ratel-green-200">
            <Navbar />

            <main className="container mx-auto px-4 py-8 pt-24 min-h-[80vh]">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 text-black border-b pb-4">
                    <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-900 font-medium">1-{Math.min(16, filteredProducts.length)} of over 10,000 results for</span>
                        <span className="font-bold italic text-ratel-orange">"{query || "All Products"}"</span>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="hidden sm:flex items-center gap-2">
                            <span className="text-xs text-gray-500 uppercase tracking-widest font-bold">Sort by:</span>
                            <Select value={sortBy} onValueChange={(val: string) => updateFilters({ sort: val })}>
                                <SelectTrigger className="w-[140px] bg-white border-gray-300 rounded-lg text-xs font-bold text-gray-900">
                                    <SelectValue placeholder="Featured" />
                                </SelectTrigger>
                                <SelectContent className="bg-white text-black border-gray-200">
                                    <SelectItem value="relevance">Featured</SelectItem>
                                    <SelectItem value="price_asc">Price: Low to High</SelectItem>
                                    <SelectItem value="price_desc">Price: High to Low</SelectItem>
                                    <SelectItem value="newest">Newest Arrivals</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <Sheet>
                            <SheetTrigger asChild>
                                <Button variant="outline" className="md:hidden border-gray-300 text-black hover:bg-gray-100 rounded-full h-8 px-4 text-xs font-bold">
                                    <Filter className="mr-2 h-3 w-3" /> Filters
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="left" className="w-[300px] sm:w-[400px] overflow-y-auto bg-white text-black">
                                <div className="py-6">
                                    <FilterSidebar />
                                </div>
                            </SheetContent>
                        </Sheet>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-8">
                    <aside className="hidden md:block w-56 shrink-0 sticky top-24 h-[calc(100vh-8rem)] overflow-y-auto pr-4 hidden-scrollbar border-r border-gray-100">
                        <FilterSidebar />
                    </aside>

                    <div className="flex-1">
                        <h2 className="text-2xl font-bold mb-4 text-black">Results</h2>
                        <p className="text-xs text-gray-500 mb-6">Check each product page for other buying options.</p>

                        {filteredProducts.length > 0 ? (
                            <div className="flex flex-col border-t border-gray-200">
                                {filteredProducts.map((product, index) => (
                                    <SearchResultCard
                                        key={product.id}
                                        product={product}
                                        isOverallPick={index === 0}
                                        isBestSeller={index === 1}
                                        isSponsored={index === 2}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-24 text-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm">
                                    <SearchIcon className="h-10 w-10 text-gray-300" />
                                </div>
                                <h2 className="text-2xl font-bold mb-2 text-black">No results for "{query}"</h2>
                                <p className="text-gray-500 max-w-md mb-8">
                                    Try checking your spelling or use more general terms.
                                </p>
                                <Button
                                    onClick={() => updateFilters({ q: null, category: null, minPrice: null, maxPrice: null, verified: null })}
                                    className="rounded-full bg-ratel-green-600 text-white px-10 font-bold"
                                >
                                    Clear all filters
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}

export default function SearchPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ratel-green-600"></div></div>}>
            <SearchContent />
        </Suspense>
    );
}
