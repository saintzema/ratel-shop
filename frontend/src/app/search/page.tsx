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
import { getFiltersForCategory, detectCategoryFromQuery, type FilterGroup } from "@/lib/category-filters";
import { Filter, SlidersHorizontal, ArrowUpDown, Search as SearchIcon, Star, Info, Loader2, ChevronDown, ChevronUp, Phone, Car, Shirt, Monitor, Gamepad2, Home as HomeIcon, Sofa, Baby, Dumbbell, BookOpen, Wrench, Paintbrush, ShoppingBag, Package as PackageIcon, Zap, Sparkles, Check } from "lucide-react";

// Smart icon for global product cards — matches category/name to an icon
function getProductIcon(name: string, category?: string) {
    const n = name.toLowerCase();
    const c = (category || '').toLowerCase();
    if (c.includes('car') || c.includes('vehicle') || n.includes('lamborghini') || n.includes('toyota') || n.includes('lexus') || n.includes('benz') || n.includes('bmw') || n.includes('honda') || n.includes('ferrari') || n.includes('maserati') || n.includes('aston') || n.includes('audi') || n.includes('porsche') || n.includes('range rover') || /\b(car|suv|sedan|truck|van|coupe)\b/.test(n)) return <Car className="h-8 w-8" />;
    if (c.includes('phone') || n.includes('phone') || n.includes('iphone') || n.includes('samsung') || n.includes('galaxy')) return <Phone className="h-8 w-8" />;
    if (c.includes('fashion') || c.includes('cloth') || /\b(jacket|shirt|dress|gear|vest|coat|trouser|wear|shoe|sneaker|boot)\b/.test(n)) return <Shirt className="h-8 w-8" />;
    if (c.includes('comput') || c.includes('laptop') || c.includes('electron') || n.includes('laptop') || n.includes('macbook') || n.includes('monitor') || n.includes('tv') || n.includes('television')) return <Monitor className="h-8 w-8" />;
    if (c.includes('gam') || n.includes('playstation') || n.includes('xbox') || n.includes('nintendo')) return <Gamepad2 className="h-8 w-8" />;
    if (c.includes('home') || n.includes('appliance')) return <HomeIcon className="h-8 w-8" />;
    if (c.includes('furniture') || n.includes('sofa') || n.includes('chair') || n.includes('table') || n.includes('desk')) return <Sofa className="h-8 w-8" />;
    if (c.includes('baby') || n.includes('baby') || n.includes('kids')) return <Baby className="h-8 w-8" />;
    if (c.includes('sport') || n.includes('sport') || n.includes('gym') || n.includes('fitness')) return <Dumbbell className="h-8 w-8" />;
    if (c.includes('book')) return <BookOpen className="h-8 w-8" />;
    if (c.includes('tool') || n.includes('drill')) return <Wrench className="h-8 w-8" />;
    if (c.includes('beauty') || n.includes('cream') || n.includes('perfume')) return <Paintbrush className="h-8 w-8" />;
    if (c.includes('energy') || n.includes('solar') || n.includes('generator') || n.includes('battery')) return <Zap className="h-8 w-8" />;
    if (c.includes('grocer') || c.includes('food')) return <ShoppingBag className="h-8 w-8" />;
    // Fallback: extract first alphabetic character from name (skip year prefix like '2026')
    const alphaMatch = name.match(/[A-Za-z]/);
    return <span className="text-white font-black text-2xl">{alphaMatch ? alphaMatch[0].toUpperCase() : name.charAt(0)}</span>;
}
import { motion, AnimatePresence } from "framer-motion";
import { useInView } from "react-intersection-observer";

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
    const [attributeFilters, setAttributeFilters] = useState<Record<string, string[]>>({});
    const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
    const [globalResults, setGlobalResults] = useState<{ name: string; category: string; approxPrice: number; condition?: string; sourceUrl?: string; image_url?: string; specs?: Record<string, string> }[]>([]);
    const [isGlobalSearching, setIsGlobalSearching] = useState(false);

    useEffect(() => {
        if (minPriceParam) setPriceRange([Number(minPriceParam), Number(maxPriceParam) || 5000000]);
        setSelectedCategory(categoryParam);
        setIsVerified(verifiedParam);
        setSortBy(sortParam);

        // Parse attribute filters from URL (attr_brand=apple,samsung)
        const newAttrs: Record<string, string[]> = {};
        searchParams.forEach((value, key) => {
            if (key.startsWith("attr_")) {
                newAttrs[key.replace("attr_", "")] = value.split(",");
            }
        });
        setAttributeFilters(newAttrs);
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

    const toggleAttributeFilter = (key: string, value: string) => {
        const current = attributeFilters[key] || [];
        const updated = current.includes(value)
            ? current.filter(v => v !== value)
            : [...current, value];

        const newAttrs = { ...attributeFilters };
        if (updated.length === 0) {
            delete newAttrs[key];
        } else {
            newAttrs[key] = updated;
        }
        setAttributeFilters(newAttrs);

        // Update URL
        const params = new URLSearchParams(searchParams.toString());
        Array.from(params.keys()).filter(k => k.startsWith("attr_")).forEach(k => params.delete(k));
        Object.entries(newAttrs).forEach(([k, vals]) => {
            if (vals.length > 0) params.set(`attr_${k}`, vals.join(","));
        });
        router.push(`/search?${params.toString()}`, { scroll: false });
    };

    const toggleGroupCollapse = (key: string) => {
        setCollapsedGroups(prev => ({ ...prev, [key]: !prev[key] }));
    };

    // Auto-detect category from query
    const detectedCategory = useMemo(() => {
        if (selectedCategory && selectedCategory !== "All") return selectedCategory;
        return detectCategoryFromQuery(query);
    }, [query, selectedCategory]);

    // Get dynamic filters for current category
    const categoryFilterGroups = useMemo(() => {
        return getFiltersForCategory(detectedCategory);
    }, [detectedCategory]);

    // Live products from DemoStore
    const [allProducts, setAllProducts] = useState<import("@/lib/types").Product[]>([]);

    // Pagination State
    const [page, setPage] = useState(1);
    const ITEMS_PER_PAGE = 12;
    const { ref: observerRef, inView } = useInView({ threshold: 0.1 });

    useEffect(() => {
        const refresh = () => setAllProducts(DemoStore.getApprovedProducts().filter(p => p.is_active));
        refresh();
        window.addEventListener("demo-store-update", refresh);
        return () => window.removeEventListener("demo-store-update", refresh);
    }, []);

    // Debounced global search for the search page
    useEffect(() => {
        if (!query || query.trim().length <= 2) {
            setGlobalResults([]);
            setIsGlobalSearching(false);
            return;
        }
        setIsGlobalSearching(true);
        setGlobalResults([]);
        const timer = setTimeout(() => {
            fetch('/api/gemini-price', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productName: query, mode: 'search' })
            })
                .then(res => res.json())
                .then(data => {
                    if (data.suggestions && Array.isArray(data.suggestions)) {
                        setGlobalResults(data.suggestions.slice(0, 10));
                    }
                })
                .catch(() => { })
                .finally(() => setIsGlobalSearching(false));
        }, 300); // Super fast 300ms debounce
        return () => clearTimeout(timer);
    }, [query]);

    const filteredProducts = useMemo(() => {
        return allProducts.filter(product => {
            if (query && !product.name.toLowerCase().includes(query.toLowerCase()) &&
                !(product.description && product.description.toLowerCase().includes(query.toLowerCase()))) return false;
            if (selectedCategory && selectedCategory !== "All" && product.category?.toLowerCase() !== selectedCategory.toLowerCase()) return false;
            if (isVerified && !product.seller_name.includes("TechHub") && !product.seller_name.includes("FairPrice")) return false;
            if (product.price < priceRange[0] || product.price > priceRange[1]) return false;

            // Apply attribute filters
            for (const [key, values] of Object.entries(attributeFilters)) {
                if (values.length === 0) continue;
                const productValue = product.specs?.[key]?.toLowerCase();
                if (!productValue) continue;
                if (!values.some(v => productValue.includes(v))) return false;
            }

            return true;
        }).sort((a, b) => {
            switch (sortBy) {
                case "price_asc": return a.price - b.price;
                case "price_desc": return b.price - a.price;
                case "newest": return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                default: return 0;
            }
        });
    }, [query, selectedCategory, isVerified, priceRange, sortBy, allProducts, attributeFilters]);

    useEffect(() => {
        setPage(1);
    }, [query, selectedCategory, isVerified, priceRange, sortBy, attributeFilters]);

    useEffect(() => {
        if (inView) setPage(p => p + 1);
    }, [inView]);

    const paginatedProducts = useMemo(() => {
        return filteredProducts.slice(0, page * ITEMS_PER_PAGE);
    }, [filteredProducts, page]);

    // Count active attribute filters
    const activeFilterCount = Object.values(attributeFilters).flat().length;

    const FilterSidebar = () => (
        <div className="space-y-6 text-black pb-20">
            <div className="flex items-center justify-between border-b pb-4">
                <h3 className="font-bold text-lg flex items-center gap-2">
                    Filters
                    {activeFilterCount > 0 && (
                        <span className="text-[10px] font-black bg-ratel-green-600 text-white rounded-full w-5 h-5 flex items-center justify-center">
                            {activeFilterCount}
                        </span>
                    )}
                </h3>
                <button
                    onClick={() => {
                        setAttributeFilters({});
                        const params = new URLSearchParams();
                        if (query) params.set("q", query);
                        router.push(`/search?${params.toString()}`, { scroll: false });
                    }}
                    className="text-xs text-blue-600 hover:underline"
                >
                    Clear all
                </button>
            </div>

            {/* Department */}
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

            {/* Dynamic Category-Specific Filters */}
            {categoryFilterGroups.length > 0 && (
                <>
                    {detectedCategory && (
                        <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider bg-emerald-50 rounded-lg px-3 py-1.5 border border-emerald-100">
                            Filters for: {detectedCategory.charAt(0).toUpperCase() + detectedCategory.slice(1)}
                        </div>
                    )}
                    {categoryFilterGroups.map((group: FilterGroup) => {
                        const isCollapsed = collapsedGroups[group.key] !== false; // Start collapsed for >4 items
                        const activeValues = attributeFilters[group.key] || [];
                        const showAll = collapsedGroups[group.key] === false;
                        const displayOptions = showAll || group.options.length <= 4
                            ? group.options
                            : group.options.slice(0, 4);

                        return (
                            <div key={group.key} className="space-y-2">
                                <h3 className="font-bold text-sm uppercase tracking-tight text-gray-900 flex items-center gap-2">
                                    {group.label}
                                    {activeValues.length > 0 && (
                                        <span className="text-[9px] font-black bg-blue-100 text-blue-700 rounded-full px-1.5 py-0.5">
                                            {activeValues.length}
                                        </span>
                                    )}
                                </h3>
                                <div className="space-y-0.5">
                                    {displayOptions.map(option => (
                                        <button
                                            key={option.value}
                                            onClick={() => toggleAttributeFilter(group.key, option.value)}
                                            className={cn(
                                                "flex items-center gap-2 w-full text-left text-sm py-0.5 transition-colors",
                                                activeValues.includes(option.value)
                                                    ? "font-bold text-ratel-green-700"
                                                    : "text-gray-600 hover:text-black"
                                            )}
                                        >
                                            <div className={cn(
                                                "w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors shrink-0",
                                                activeValues.includes(option.value)
                                                    ? "bg-ratel-green-600 border-ratel-green-600"
                                                    : "border-gray-300"
                                            )}>
                                                {activeValues.includes(option.value) && (
                                                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                    </svg>
                                                )}
                                            </div>
                                            {option.label}
                                        </button>
                                    ))}
                                    {group.options.length > 4 && !showAll && (
                                        <button
                                            onClick={() => setCollapsedGroups(p => ({ ...p, [group.key]: false }))}
                                            className="text-xs text-blue-600 hover:underline font-medium mt-1 pl-5"
                                        >
                                            See all ({group.options.length})
                                        </button>
                                    )}
                                    {group.options.length > 4 && showAll && (
                                        <button
                                            onClick={() => setCollapsedGroups(p => ({ ...p, [group.key]: true }))}
                                            className="text-xs text-blue-600 hover:underline font-medium mt-1 pl-5"
                                        >
                                            Show less
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </>
            )}

            {/* Customer Reviews */}
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
                            <span className="text-sm text-gray-600 group-hover:text-ratel-orange font-medium">&amp; Up</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Price */}
            <div className="space-y-4">
                <h3 className="font-bold text-sm uppercase tracking-tight text-gray-900">Price</h3>
                <div className="space-y-1.5 text-sm text-gray-600">
                    <div onClick={() => updateFilters({ maxPrice: 20000, minPrice: null })} className="hover:text-ratel-orange cursor-pointer">Under ₦20,000</div>
                    <div onClick={() => updateFilters({ minPrice: 20000, maxPrice: 100000 })} className="hover:text-ratel-orange cursor-pointer">₦20,000 to ₦100,000</div>
                    <div onClick={() => updateFilters({ minPrice: 100000, maxPrice: 500000 })} className="hover:text-ratel-orange cursor-pointer">₦100,000 to ₦500,000</div>
                    <div onClick={() => updateFilters({ minPrice: 500000, maxPrice: 2000000 })} className="hover:text-ratel-orange cursor-pointer">₦500,000 to ₦2,000,000</div>
                    <div onClick={() => updateFilters({ minPrice: 2000000, maxPrice: null })} className="hover:text-ratel-orange cursor-pointer">Over ₦2,000,000</div>
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

            {/* Seller */}
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
                        Verified Listings Only
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
                        {activeFilterCount > 0 && (
                            <span className="text-xs text-gray-500 ml-2">
                                ({activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} active)
                            </span>
                        )}
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
                                    {activeFilterCount > 0 && (
                                        <span className="ml-1 bg-ratel-green-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-[9px] font-black">
                                            {activeFilterCount}
                                        </span>
                                    )}
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
                    <aside className="hidden md:block w-60 shrink-0 sticky top-24 h-[calc(100vh-8rem)] overflow-y-auto pr-4 hidden-scrollbar border-r border-gray-100">
                        <FilterSidebar />
                    </aside>

                    <div className="flex-1">
                        {/* AI Deep Search Steps — Alibaba style */}
                        {query && query.trim().length > 2 && (isGlobalSearching || globalResults.length > 0) && (
                            <div className="mb-8 p-5 bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 rounded-2xl border border-emerald-100">
                                <div className="flex items-center gap-2 mb-4">
                                    <Sparkles className="h-5 w-5 text-emerald-600" />
                                    <h3 className="font-bold text-gray-900">Deep Search results</h3>
                                    <span className="text-xs text-gray-400 ml-auto">Powered by FairPrice AI</span>
                                </div>
                                <div className="space-y-2">
                                    {[
                                        { text: `Understanding your requirements`, detail: `You're looking for ${query}.`, done: true },
                                        { text: `Reasoning for search strategy`, detail: `Analyzing product listings, verifying specs, and comparing prices across global markets.`, done: !isGlobalSearching },
                                        { text: `Matching products and search keywords`, detail: `Found ${globalResults.length} global results with competitive pricing.`, done: !isGlobalSearching && globalResults.length > 0 },
                                    ].map((step, i) => (
                                        <div key={i} className="flex items-start gap-3">
                                            <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 transition-all duration-500 ${step.done ? 'bg-emerald-500' : 'bg-gray-200 animate-pulse'}`}>
                                                {step.done ? <Check className="h-3 w-3 text-white" /> : <div className="w-2 h-2 rounded-full bg-gray-400" />}
                                            </div>
                                            <div>
                                                <p className={`text-sm font-semibold ${step.done ? 'text-gray-900' : 'text-gray-400'}`}>{step.text}</p>
                                                {step.done && <p className="text-xs text-gray-500 mt-0.5">{step.detail}</p>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* FairPrice Catalogue Results */}
                        {filteredProducts.length > 0 && (
                            <div className="mb-10">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-400 to-ratel-orange flex items-center justify-center">
                                        <ShoppingBag className="h-3.5 w-3.5 text-white" />
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-900">FairPrice Catalogue</h3>
                                    <span className="text-xs text-gray-400">• {filteredProducts.length} products</span>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                                    {paginatedProducts.slice(0, 10).map((product) => (
                                        <NextLink key={product.id} href={`/product/${product.id}`} className="bg-white rounded-xl border border-gray-100 hover:border-emerald-200 hover:shadow-md transition-all p-3 group cursor-pointer flex flex-col">
                                            <div className="aspect-square rounded-lg bg-gray-50 flex items-center justify-center mb-2 overflow-hidden">
                                                {product.image_url ? (
                                                    <img src={product.image_url} alt={product.name} className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform" />
                                                ) : (
                                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center">
                                                        <span className="text-emerald-600 font-bold text-lg">{product.name.charAt(0)}</span>
                                                    </div>
                                                )}
                                            </div>
                                            <h4 className="font-semibold text-xs text-gray-900 line-clamp-2 group-hover:text-emerald-700 transition-colors mb-1 flex-1">{product.name}</h4>
                                            <p className="text-base font-black text-gray-900">₦{product.price.toLocaleString()}</p>
                                            {product.original_price && product.original_price > product.price && (
                                                <p className="text-[10px] text-gray-400 line-through">₦{product.original_price.toLocaleString()}</p>
                                            )}
                                            <div className="flex items-center gap-1 mt-1.5">
                                                {product.price_flag === 'fair' && <span className="text-[9px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">Fair Price ✓</span>}
                                                {product.seller_name && <span className="text-[9px] text-gray-400 truncate">{product.seller_name}</span>}
                                            </div>
                                        </NextLink>
                                    ))}
                                </div>
                                {paginatedProducts.length < filteredProducts.length && (
                                    <div ref={observerRef} className="py-8 flex justify-center">
                                        <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
                                    </div>
                                )}
                            </div>
                        )}

                        {filteredProducts.length === 0 && !isGlobalSearching && globalResults.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-16 text-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                                <SearchIcon className="h-10 w-10 text-gray-300 mb-4" />
                                <h2 className="text-xl font-bold mb-2 text-black">No results for &quot;{query}&quot;</h2>
                                <p className="text-gray-500 max-w-md mb-6 text-sm">Try checking your spelling or use more general terms.</p>
                                <Button onClick={() => { setAttributeFilters({}); router.push('/search', { scroll: false }); }} className="rounded-full bg-emerald-600 text-white px-8 font-bold text-sm">Clear all filters</Button>
                            </div>
                        )}

                        {/* Global Marketplace Results — Alibaba-style grid */}
                        {query && query.trim().length > 2 && (
                            <div className="mt-2">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                                        <Sparkles className="h-3.5 w-3.5 text-white" />
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-900">AI Global Marketplace</h3>
                                    <span className="text-xs text-gray-400">• Sourced by FairPrice AI • Escrow Protected</span>
                                </div>

                                {isGlobalSearching ? (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => (
                                            <div key={i} className="bg-white rounded-xl border border-gray-100 p-3 animate-pulse">
                                                <div className="aspect-square bg-gray-100 rounded-lg mb-2" />
                                                <div className="h-3 bg-gray-100 rounded w-3/4 mb-1.5" />
                                                <div className="h-3 bg-gray-100 rounded w-1/2 mb-1" />
                                                <div className="h-4 bg-gray-100 rounded w-2/3" />
                                            </div>
                                        ))}
                                    </div>
                                ) : globalResults.length > 0 ? (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                                        {globalResults.map((item, i) => {
                                            const globalId = `global-${Date.now()}${i}`;
                                            return (
                                                <div key={i} className="bg-white rounded-xl border border-gray-100 hover:border-emerald-200 hover:shadow-md transition-all p-3 group cursor-pointer flex flex-col"
                                                    onClick={() => {
                                                        const { DemoStore } = require('@/lib/demo-store');
                                                        const product = {
                                                            id: globalId,
                                                            name: item.name,
                                                            description: `${item.name} — sourced globally through FairPrice AI for the best price in Nigeria.`,
                                                            price: item.approxPrice,
                                                            original_price: Math.round(item.approxPrice * 1.15),
                                                            image_url: item.image_url || '',
                                                            images: item.image_url ? [item.image_url] : [],
                                                            category: item.category?.toLowerCase() || 'other',
                                                            seller_id: 'global-partners',
                                                            seller_name: 'Global Partners',
                                                            rating: 4.5,
                                                            reviews_count: 0,
                                                            review_count: 0,
                                                            avg_rating: 0,
                                                            sold_count: 0,
                                                            stock: 5,
                                                            is_active: true,
                                                            price_flag: 'fair' as const,
                                                            external_url: item.sourceUrl,
                                                            recommended_price: item.approxPrice,
                                                            highlights: [],
                                                            specs: item.specs || {},
                                                            created_at: new Date().toISOString(),
                                                        };
                                                        DemoStore.addGlobalProduct(product);
                                                        router.push(`/product/${globalId}`);
                                                    }}
                                                >
                                                    <div className="relative aspect-square rounded-lg bg-gradient-to-br from-emerald-50 via-emerald-100/50 to-teal-50 flex items-center justify-center mb-2 group-hover:from-emerald-100 group-hover:to-teal-100 transition-colors overflow-hidden">
                                                        {item.image_url ? (
                                                            <img src={item.image_url} alt={item.name} className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform" />
                                                        ) : (
                                                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg text-white">
                                                                {getProductIcon(item.name, item.category)}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <h4 className="font-semibold text-xs text-gray-900 line-clamp-2 group-hover:text-emerald-700 transition-colors mb-1 flex-1">{item.name}</h4>
                                                    <p className="text-base font-black text-emerald-600">₦{item.approxPrice.toLocaleString()}</p>
                                                    {item.condition && (
                                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded w-fit mt-1 ${item.condition === 'new' ? 'bg-green-100 text-green-700' :
                                                            item.condition === 'foreign-used' ? 'bg-blue-100 text-blue-700' :
                                                                item.condition === 'nigerian-used' ? 'bg-orange-100 text-orange-700' :
                                                                    'bg-purple-100 text-purple-700'
                                                            }`}>
                                                            {item.condition === 'new' ? 'Brand New' :
                                                                item.condition === 'foreign-used' ? 'Foreign Used' :
                                                                    item.condition === 'nigerian-used' ? 'Nigerian Used' :
                                                                        item.condition}
                                                        </span>
                                                    )}
                                                    <div className="flex items-center gap-1 mt-1.5">
                                                        <span className="text-[9px] text-gray-400">Sourced by FairPrice AI</span>
                                                        <span className="text-[9px] text-emerald-500 font-bold">• Escrow Protected</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : null}
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
