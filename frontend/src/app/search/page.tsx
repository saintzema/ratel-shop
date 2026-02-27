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
import { Heart, ShoppingCart, Loader2, Filter, ShieldCheck, ArrowUpDown, Sparkles, Search as SearchIcon, Check, SlidersHorizontal, Star, Info, ChevronDown, ChevronUp, Phone, Car, Shirt, Monitor, Gamepad2, Home as HomeIcon, Sofa, Baby, Dumbbell, BookOpen, Wrench, Paintbrush, ShoppingBag, Package as PackageIcon, Zap, Smartphone, Laptop, Plug, Briefcase, ShoppingBasket, Trophy } from "lucide-react";
import { useCart } from "@/context/CartContext";

const getCategoryIcon = (value: string) => {
    switch (value) {
        case 'phones': return <Smartphone className="h-4 w-4" />;
        case 'computers': return <Laptop className="h-4 w-4" />;
        case 'electronics': return <Plug className="h-4 w-4" />;
        case 'fashion': return <Shirt className="h-4 w-4" />;
        case 'beauty': return <Paintbrush className="h-4 w-4" />;
        case 'home': return <HomeIcon className="h-4 w-4" />;
        case 'fitness': return <Dumbbell className="h-4 w-4" />;
        case 'office': return <Briefcase className="h-4 w-4" />;
        case 'furniture': return <Sofa className="h-4 w-4" />;
        case 'grocery': return <ShoppingBasket className="h-4 w-4" />;
        case 'baby': return <Baby className="h-4 w-4" />;
        case 'sports': return <Trophy className="h-4 w-4" />;
        case 'cars': return <Car className="h-4 w-4" />;
        case 'energy': return <Zap className="h-4 w-4" />;
        case 'gaming': return <Gamepad2 className="h-4 w-4" />;
        default: return <Sparkles className="h-4 w-4" />;
    }
};

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

// Uniform Search Grid Card
const SearchGridCard = ({ product, showGlobalPartner = false }: { product: any, showGlobalPartner?: boolean }) => {
    const [added, setAdded] = useState(false);
    const router = useRouter();
    const { addToCart } = useCart();

    // Derived values
    const discount = product.original_price && product.original_price > (product.price || product.approxPrice)
        ? Math.round(((product.original_price - (product.price || product.approxPrice)) / product.original_price) * 100)
        : 0;
    const badgeLabel = product.price_flag === 'fair' ? 'FAIR PRICE' : product.price_flag === 'great_deal' ? 'BEST SELLER' : product.sold_count > 50 ? 'OVERALL PICK' : null;

    const handleAction = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (added) {
            router.push('/cart');
        } else {
            addToCart({ ...product, price: product.price || product.approxPrice });
            setAdded(true);
            // Hide the checkmark after 1.5s, keep the View Cart button
            setTimeout(() => {
                // We keep it in 'added' state to show View Cart
            }, 1500);
        }
    };

    return (
        <NextLink href={`/product/${product.id || 'global-' + product.name.replace(/\s+/g, '-').toLowerCase()}`} className="bg-white rounded-2xl border border-gray-100 hover:border-emerald-200 hover:shadow-xl hover:shadow-emerald-500/5 transition-all group flex flex-col overflow-hidden h-full">
            <div className="relative aspect-square bg-white flex items-center justify-center overflow-hidden p-4">
                {product.price_flag === 'fair' && (
                    <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 px-2.5 py-1 bg-white/90 backdrop-blur-md rounded-full shadow border border-emerald-500/20">
                        <ShieldCheck className="h-3 w-3 text-emerald-600" />
                        <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Fair Price</span>
                    </div>
                )}
                {badgeLabel === 'BEST SELLER' && (
                    <div className="absolute top-3 left-3 z-20 bg-brand-orange text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shadow">
                        {badgeLabel}
                    </div>
                )}
                <button className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-white/80 backdrop-blur-sm shadow-sm border border-gray-100 hover:bg-white hover:scale-110 transition-all text-gray-400 hover:text-red-500" onClick={(e) => e.preventDefault()}>
                    <Heart className="h-4 w-4 transition-colors" />
                </button>
                <img
                    src={product.image_url || product.images?.[0] || '/assets/images/placeholder.png'}
                    alt={product.name}
                    className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => { e.currentTarget.src = '/assets/images/placeholder.png'; }}
                />
            </div>
            <div className="p-3.5 flex flex-col flex-1 border-t border-gray-50 bg-gradient-to-b from-white to-gray-50/30">
                <h4 className="font-bold text-sm text-gray-900 line-clamp-2 group-hover:text-emerald-700 transition-colors mb-2 min-h-[40px] leading-snug">{product.name}</h4>

                <div className="flex items-center gap-1.5 mb-2">
                    {showGlobalPartner || product.seller_id === 'global-partners' || product._source === 'global' ? (
                        <span className="text-[10px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full shadow-sm">Global Partner</span>
                    ) : (
                        <span className="text-[10px] font-bold bg-gray-100 text-gray-700 px-2.5 py-0.5 rounded-full truncate max-w-full">
                            {product.seller_name || 'Marketplace Seller'}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-1 mb-2.5">
                    <span className="text-sm font-bold text-amber-500">{(product.avg_rating || 4.5).toFixed(1)}</span>
                    <div className="flex items-center">
                        {[1, 2, 3, 4, 5].map((s: number) => (
                            <svg key={s} className={`w-3.5 h-3.5 flex-shrink-0 ${s <= Math.round(product.avg_rating || 4.5) ? 'text-amber-400' : 'text-gray-200'}`} fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                        ))}
                    </div>
                    <span className="text-xs text-blue-600 hover:underline">({(product.review_count || Math.floor(Math.random() * 500) + 50).toLocaleString()})</span>
                </div>

                <div className="flex items-baseline gap-2 mt-auto mb-3">
                    <p className="text-xl font-black tracking-tight text-gray-900">₦{(product.price || product.approxPrice || 0).toLocaleString()}</p>
                    {product.original_price && product.original_price > (product.price || product.approxPrice) && (
                        <p className="text-xs text-gray-400 line-through font-medium">₦{product.original_price.toLocaleString()}</p>
                    )}
                    {discount > 0 && <span className="text-[10px] text-red-500 font-bold ml-auto">-{discount}% <span className="text-gray-400 font-medium hidden sm:inline">{product.sold_count || '100+'} sold</span></span>}
                </div>

                <button
                    className={cn(
                        "w-full flex items-center justify-center gap-2 text-sm font-black py-2.5 rounded-xl transition-all shadow-sm active:scale-95 duration-200",
                        added ? "bg-black text-white hover:bg-gray-800" : "bg-emerald-600 hover:bg-emerald-700 text-white"
                    )}
                    onClick={handleAction}
                >
                    {added ? (
                        <><Check className="h-4 w-4" /> View Cart</>
                    ) : (
                        <><ShoppingCart className="h-4 w-4" /> Add to cart</>
                    )}
                </button>
            </div>
        </NextLink>
    );
};

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
    const [showGlobalResults, setShowGlobalResults] = useState(false);

    // Nav search results passed from the navbar search dropdown
    const [navResults, setNavResults] = useState<any[]>([]);
    const [navClickedId, setNavClickedId] = useState<string>('');
    const fromNav = searchParams.get('from') === 'nav';

    // Read cached nav results on mount when navigated from navbar
    useEffect(() => {
        if (fromNav) {
            try {
                const cachedResults = sessionStorage.getItem('fp_nav_search_results');
                const cachedClicked = sessionStorage.getItem('fp_nav_search_clicked');
                if (cachedResults) {
                    const parsed = JSON.parse(cachedResults);
                    // Sort with clicked product first
                    if (cachedClicked) {
                        setNavClickedId(cachedClicked);
                        const clickedIdx = parsed.findIndex((p: any) => p.id === cachedClicked);
                        if (clickedIdx > 0) {
                            const [clicked] = parsed.splice(clickedIdx, 1);
                            parsed.unshift(clicked);
                        }
                    }
                    setNavResults(parsed);
                }
                // Clean up sessionStorage after reading
                sessionStorage.removeItem('fp_nav_search_results');
                sessionStorage.removeItem('fp_nav_search_clicked');
                sessionStorage.removeItem('fp_nav_search_query');
            } catch { /* fail silently */ }
        }
    }, [fromNav]);

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
                        setGlobalResults(data.suggestions);
                    }
                })
                .catch(() => { })
                .finally(() => setIsGlobalSearching(false));
        }, 500);
        return () => clearTimeout(timer);
    }, [query]);

    const handleSeeMoreResults = () => {
        setShowGlobalResults(true);
    };

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

    // Active filters logic remains, but FilterSidebar is removed.
    // We will render filters directly in the floating bar as pills.

    // Combined results count (nav results + filtered local products)
    const totalResultCount = (navResults.length > 0 ? navResults.length : 0) + filteredProducts.length;

    return (
        <div className="min-h-screen bg-white font-sans selection:bg-brand-green-200">
            <Navbar />

            <main className="container mx-auto px-4 py-8 pt-24 min-h-[80vh]">
                {/* Scrollable Apple/Temu-like Pill Filter Bar (Non-sticky) */}
                <div className="mb-6 w-full flex flex-col gap-3 bg-white/95 pt-3 pb-2 sm:rounded-b-2xl border-b sm:border border-gray-100 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.1)] -mx-4 px-4 sm:mx-0 sm:px-4 -mt-4 transition-all duration-300">
                    {/* Top Row: Horizontal Scrollable Filters */}
                    <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar pb-1 pt-1 px-1 -mx-4 sm:mx-0 sm:px-0 w-full snap-x">

                        {/* Main Filters Button */}
                        <button
                            onClick={() => {
                                // Add a modal trigger here in the future if needed, for now just a button
                            }}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-bold whitespace-nowrap bg-white text-gray-700 border border-gray-200 hover:border-gray-300 hover:bg-gray-50 active:scale-95 transition-all shadow-sm shrink-0 snap-start"
                        >
                            <Filter className="h-4 w-4 text-gray-500" /> Filters
                        </button>

                        {/* Clear All */}
                        {(Object.keys(attributeFilters).length > 0 || selectedCategory || isVerified || priceRange[0] > 0 || priceRange[1] < 5000000) && (
                            <button
                                onClick={() => {
                                    setAttributeFilters({});
                                    setPriceRange([0, 5000000]);
                                    setSelectedCategory(null);
                                    setIsVerified(false);
                                    const params = new URLSearchParams();
                                    if (query) params.set("q", query);
                                    router.push(`/search?${params.toString()}`, { scroll: false });
                                }}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-bold whitespace-nowrap bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 hover:border-red-200 active:scale-95 transition-all shrink-0 shadow-sm snap-start"
                            >
                                <Filter className="h-3.5 w-3.5" /> Clear All
                            </button>
                        )}

                        {/* Sort Dropdown as Pill */}
                        <Select value={sortBy} onValueChange={(val: string) => updateFilters({ sort: val })}>
                            <SelectTrigger className="flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-bold whitespace-nowrap transition-all shadow-sm border border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50 active:scale-95 w-auto h-auto focus:ring-1 focus:ring-gray-200 shrink-0 snap-start">
                                <SelectValue placeholder="Sort: Relevance" />
                            </SelectTrigger>
                            <SelectContent className="bg-white text-gray-900 border border-gray-100 shadow-xl rounded-xl">
                                <SelectItem value="relevance" className="font-medium focus:bg-gray-50">Sort by: Relevance</SelectItem>
                                <SelectItem value="price_asc" className="font-medium focus:bg-gray-50">Price: Low to High</SelectItem>
                                <SelectItem value="price_desc" className="font-medium focus:bg-gray-50">Price: High to Low</SelectItem>
                                <SelectItem value="newest" className="font-medium focus:bg-gray-50">Newest Arrivals</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* Category Dropdown as Pill */}
                        <Select value={selectedCategory || 'all'} onValueChange={(val: string) => updateFilters({ category: val === 'all' ? '' : val })}>
                            <SelectTrigger className="flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-bold whitespace-nowrap transition-all shadow-sm border border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50 active:scale-95 w-auto h-auto focus:ring-1 focus:ring-gray-200 shrink-0 snap-start data-[state=open]:bg-gray-50">
                                <SelectValue placeholder="Category: All" />
                            </SelectTrigger>
                            <SelectContent className="bg-white text-gray-900 border border-gray-100 shadow-xl rounded-xl">
                                <SelectItem value="all" className="font-medium focus:bg-gray-50">All Categories</SelectItem>
                                {CATEGORIES.map(cat => (
                                    <SelectItem key={cat.value} value={cat.value} className="font-medium focus:bg-gray-50">
                                        <div className="flex items-center gap-2">
                                            {getCategoryIcon(cat.value)} <span className="capitalize">{cat.label}</span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Verified Only Pill */}
                        <button
                            onClick={() => updateFilters({ verified: isVerified ? null : "true" })}
                            className={cn(
                                "flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-bold whitespace-nowrap transition-all shadow-sm border shrink-0 snap-start active:scale-95",
                                isVerified
                                    ? "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700"
                                    : "bg-white text-gray-700 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                            )}>
                            <ShieldCheck className="h-4 w-4" /> Verified
                        </button>

                        {/* Dynamic category filters as Pills */}
                        {categoryFilterGroups.map((group: FilterGroup) => {
                            const activeValues = attributeFilters[group.key] || [];
                            const isActive = activeValues.length > 0;
                            return (
                                <Select key={group.key} value={activeValues[0] || ''} onValueChange={(val) => {
                                    if (val === 'clear') {
                                        setAttributeFilters(prev => ({ ...prev, [group.key]: [] }));
                                    } else {
                                        setAttributeFilters(prev => ({ ...prev, [group.key]: [val] }));
                                    }
                                }}>
                                    <SelectTrigger className={cn(
                                        "flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-bold whitespace-nowrap transition-all shadow-sm border w-auto h-auto focus:ring-1 focus:ring-gray-200 shrink-0 snap-start data-[state=open]:bg-gray-50 active:scale-95",
                                        isActive
                                            ? "bg-gray-900 text-white border-gray-900 hover:bg-gray-800"
                                            : "bg-white text-gray-700 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                                    )}>
                                        {group.label} {isActive && <span className="ml-1 px-1.5 py-0.5 rounded-full bg-white text-gray-900 text-[10px]">{activeValues.length}</span>}
                                    </SelectTrigger>
                                    <SelectContent className="bg-white text-gray-900 border border-gray-100 shadow-xl rounded-xl max-h-[300px]">
                                        {isActive && <SelectItem value="clear" className="font-bold text-red-500 focus:bg-red-50 focus:text-red-700">Clear</SelectItem>}
                                        {group.options.map(opt => (
                                            <SelectItem key={opt.value} value={opt.value} className="font-medium focus:bg-gray-50">
                                                {opt.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            );
                        })}
                    </div>

                    {/* Bottom Row: Results Count */}
                    <div className="flex items-center justify-between border-t border-gray-100/60 pt-2 px-1">
                        <p className="text-sm text-gray-600 font-medium tracking-tight">
                            Showing 1-{Math.min(20, totalResultCount)} of over {totalResultCount > 20 ? Math.max(totalResultCount, 77) : totalResultCount} results for <span className="font-bold text-gray-900">"{query || 'All Products'}"</span>
                        </p>
                    </div>
                </div>

                <div className="flex flex-col gap-8">
                    <div className="flex-1 w-full">
                        {/* Scrollable Apple-like Translucent Pill Filters */}
                        <div className="mb-6 flex items-center gap-2 overflow-x-auto pb-4 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mr-2 shrink-0">Popular:</span>
                            {CATEGORIES.slice(0, 10).map(cat => (
                                <button
                                    key={cat.value}
                                    onClick={() => updateFilters({ category: cat.value })}
                                    className={cn(
                                        "flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap backdrop-blur-md shadow-sm border",
                                        selectedCategory === cat.value
                                            ? "bg-emerald-600/90 text-white border-emerald-500 shadow-md scale-105"
                                            : "bg-white/80 text-gray-700 border-gray-200/50 hover:bg-white hover:border-emerald-200 hover:text-emerald-700 hover:shadow-md"
                                    )}
                                >
                                    {getCategoryIcon(cat.value)} {cat.label}
                                </button>
                            ))}
                        </div>

                        {/* Nav Search Results — shown when coming from navbar (clicked product first) */}
                        {navResults.length > 0 && (
                            <div className="mb-6">
                                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                    {navResults.map((product: any) => (
                                        <SearchGridCard key={product.id} product={product} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* FairPrice Catalogue Results */}
                        {filteredProducts.length > 0 && (
                            <div className="mb-10">
                                {navResults.length === 0 && (
                                    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                        {paginatedProducts.slice(0, 10).map((product) => (
                                            <SearchGridCard key={product.id} product={product} />
                                        ))}
                                    </div>
                                )}
                                {paginatedProducts.length < filteredProducts.length && (
                                    <div ref={observerRef} className="py-8 flex justify-center">
                                        <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
                                    </div>
                                )}
                            </div>
                        )}

                        {filteredProducts.length === 0 && navResults.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-16 text-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                                <SearchIcon className="h-10 w-10 text-gray-300 mb-4" />
                                <h2 className="text-xl font-bold mb-2 text-black">No results for &quot;{query}&quot;</h2>
                                <p className="text-gray-500 max-w-md mb-6 text-sm">Try checking your spelling or use more general terms.</p>
                                <Button onClick={() => { setAttributeFilters({}); router.push('/search', { scroll: false }); }} className="rounded-full bg-emerald-600 text-white px-8 font-bold text-sm">Clear all filters</Button>
                            </div>
                        )}

                        {/* Ziva AI "See more results" Button */}
                        {query && query.trim().length > 2 && !showGlobalResults && (
                            <div className="flex justify-center my-10 relative">
                                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                    <div className="w-full border-t border-gray-200"></div>
                                </div>
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={handleSeeMoreResults}
                                    className="relative flex items-center gap-2 bg-gradient-to-r from-emerald-500 hover:from-emerald-400 hover:to-teal-500 to-teal-600 text-white px-8 py-3 rounded-full font-bold shadow-xl shadow-emerald-500/20 transition-all z-10"
                                >
                                    <Sparkles className="h-5 w-5 animate-pulse" />
                                    See more results
                                </motion.button>
                            </div>
                        )}

                        {/* Global Marketplace Results — Staggered Bounce Animation */}
                        {showGlobalResults && query && query.trim().length > 2 && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-8 pt-8 border-t border-gray-100"
                            >
                                <div className="flex items-center gap-2 mb-6">
                                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md">
                                        <Sparkles className="h-4 w-4 text-white animate-pulse" />
                                    </div>
                                    <h3 className="text-xl font-black text-gray-900 tracking-tight">AI Global Marketplace</h3>
                                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full ml-2">Deep Search Results</span>
                                </div>

                                {isGlobalSearching ? (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => (
                                            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-3 animate-pulse shadow-sm">
                                                <div className="aspect-square bg-gray-50 rounded-xl mb-3" />
                                                <div className="h-3 bg-gray-100 rounded-full w-3/4 mb-2" />
                                                <div className="h-3 bg-gray-100 rounded-full w-1/2 mb-1.5" />
                                                <div className="h-4 bg-gray-100 rounded-full w-2/3 mt-2" />
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <motion.div
                                        className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                                        variants={{
                                            hidden: { opacity: 0 },
                                            show: {
                                                opacity: 1,
                                                transition: { staggerChildren: 0.1 }
                                            }
                                        }}
                                        initial="hidden"
                                        animate="show"
                                    >
                                        {globalResults.map((product, idx) => (
                                            <motion.div
                                                key={idx}
                                                variants={{
                                                    hidden: { opacity: 0, y: 50, scale: 0.9 },
                                                    show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", bounce: 0.4, duration: 0.8 } }
                                                }}
                                            >
                                                <SearchGridCard product={product} showGlobalPartner={true} />
                                            </motion.div>
                                        ))}
                                    </motion.div>
                                )}
                            </motion.div>
                        )}

                        {/* Customers Also Bought */}
                        <div className="mt-16 mb-8 pt-8 border-t border-gray-100">
                            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2"><Heart className="h-5 w-5 text-red-500 fill-red-500" /> Customers Also Bought</h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 opacity-80 hover:opacity-100 transition-opacity">
                                {allProducts.filter(p => !query || !p.name.toLowerCase().includes(query.toLowerCase())).slice(0, 5).map((product) => (
                                    <NextLink key={product.id} href={`/product/${product.id}`} className="bg-white rounded-xl border border-gray-100 hover:border-emerald-200 transition-all p-3 group cursor-pointer flex flex-col">
                                        <div className="aspect-square rounded-lg bg-gray-50 flex items-center justify-center mb-2 overflow-hidden">
                                            <img
                                                src={product.image_url || '/assets/images/placeholder-product.svg'}
                                                alt={product.name}
                                                className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform"
                                                onError={(e) => { e.currentTarget.src = '/assets/images/placeholder-product.svg'; }}
                                            />
                                        </div>
                                        <h4 className="font-semibold text-[11px] text-gray-700 line-clamp-2 group-hover:text-emerald-700 mb-1 flex-1">{product.name}</h4>
                                        <p className="text-sm font-bold text-gray-900">₦{product.price.toLocaleString()}</p>
                                    </NextLink>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}

export default function SearchPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-green-600"></div></div>}>
            <SearchContent />
        </Suspense>
    );
}
