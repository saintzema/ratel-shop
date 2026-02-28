"use client";

import React, { useState, useMemo, useEffect, Suspense, useRef } from "react";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import NextLink from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { SearchResultCard } from "@/components/product/SearchResultCard";
import { SearchGridCard } from "@/components/product/SearchGridCard";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DemoStore } from "@/lib/demo-store";
import { CATEGORIES } from "@/lib/types";
import { formatPrice, cn } from "@/lib/utils";
import {
  getFiltersForCategory,
  detectCategoryFromQuery,
  type FilterGroup,
} from "@/lib/category-filters";
import {
  Heart,
  ShoppingCart,
  Loader2,
  Filter,
  ShieldCheck,
  ArrowUpDown,
  Sparkles,
  Search as SearchIcon,
  Check,
  SlidersHorizontal,
  Star,
  Info,
  ChevronDown,
  ChevronUp,
  Phone,
  Car,
  Shirt,
  Monitor,
  Gamepad2,
  Home as HomeIcon,
  Sofa,
  Baby,
  Dumbbell,
  BookOpen,
  Wrench,
  Paintbrush,
  ShoppingBag,
  Package as PackageIcon,
  Zap,
  Smartphone,
  Laptop,
  Plug,
  Briefcase,
  ShoppingBasket,
  Trophy,
} from "lucide-react";
import { useCart } from "@/context/CartContext";

const getCategoryIcon = (value: string) => {
  switch (value) {
    case "phones":
      return <Smartphone className="h-4 w-4" />;
    case "computers":
      return <Laptop className="h-4 w-4" />;
    case "electronics":
      return <Plug className="h-4 w-4" />;
    case "fashion":
      return <Shirt className="h-4 w-4" />;
    case "beauty":
      return <Paintbrush className="h-4 w-4" />;
    case "home":
      return <HomeIcon className="h-4 w-4" />;
    case "fitness":
      return <Dumbbell className="h-4 w-4" />;
    case "office":
      return <Briefcase className="h-4 w-4" />;
    case "furniture":
      return <Sofa className="h-4 w-4" />;
    case "grocery":
      return <ShoppingBasket className="h-4 w-4" />;
    case "baby":
      return <Baby className="h-4 w-4" />;
    case "sports":
      return <Trophy className="h-4 w-4" />;
    case "cars":
      return <Car className="h-4 w-4" />;
    case "energy":
      return <Zap className="h-4 w-4" />;
    case "gaming":
      return <Gamepad2 className="h-4 w-4" />;
    default:
      return <Sparkles className="h-4 w-4" />;
  }
};

// Smart icon for global product cards — matches category/name to an icon
function getProductIcon(name: string, category?: string) {
  const n = name.toLowerCase();
  const c = (category || "").toLowerCase();
  if (
    c.includes("car") ||
    c.includes("vehicle") ||
    n.includes("lamborghini") ||
    n.includes("toyota") ||
    n.includes("lexus") ||
    n.includes("benz") ||
    n.includes("bmw") ||
    n.includes("honda") ||
    n.includes("ferrari") ||
    n.includes("maserati") ||
    n.includes("aston") ||
    n.includes("audi") ||
    n.includes("porsche") ||
    n.includes("range rover") ||
    /\b(car|suv|sedan|truck|van|coupe)\b/.test(n)
  )
    return <Car className="h-8 w-8" />;
  if (
    c.includes("phone") ||
    n.includes("phone") ||
    n.includes("iphone") ||
    n.includes("samsung") ||
    n.includes("galaxy")
  )
    return <Phone className="h-8 w-8" />;
  if (
    c.includes("fashion") ||
    c.includes("cloth") ||
    /\b(jacket|shirt|dress|gear|vest|coat|trouser|wear|shoe|sneaker|boot)\b/.test(
      n,
    )
  )
    return <Shirt className="h-8 w-8" />;
  if (
    c.includes("comput") ||
    c.includes("laptop") ||
    c.includes("electron") ||
    n.includes("laptop") ||
    n.includes("macbook") ||
    n.includes("monitor") ||
    n.includes("tv") ||
    n.includes("television")
  )
    return <Monitor className="h-8 w-8" />;
  if (
    c.includes("gam") ||
    n.includes("playstation") ||
    n.includes("xbox") ||
    n.includes("nintendo")
  )
    return <Gamepad2 className="h-8 w-8" />;
  if (c.includes("home") || n.includes("appliance"))
    return <HomeIcon className="h-8 w-8" />;
  if (
    c.includes("furniture") ||
    n.includes("sofa") ||
    n.includes("chair") ||
    n.includes("table") ||
    n.includes("desk")
  )
    return <Sofa className="h-8 w-8" />;
  if (c.includes("baby") || n.includes("baby") || n.includes("kids"))
    return <Baby className="h-8 w-8" />;
  if (
    c.includes("sport") ||
    n.includes("sport") ||
    n.includes("gym") ||
    n.includes("fitness")
  )
    return <Dumbbell className="h-8 w-8" />;
  if (c.includes("book")) return <BookOpen className="h-8 w-8" />;
  if (c.includes("tool") || n.includes("drill"))
    return <Wrench className="h-8 w-8" />;
  if (c.includes("beauty") || n.includes("cream") || n.includes("perfume"))
    return <Paintbrush className="h-8 w-8" />;
  if (
    c.includes("energy") ||
    n.includes("solar") ||
    n.includes("generator") ||
    n.includes("battery")
  )
    return <Zap className="h-8 w-8" />;
  if (c.includes("grocer") || c.includes("food"))
    return <ShoppingBag className="h-8 w-8" />;
  // Fallback: extract first alphabetic character from name (skip year prefix like '2026')
  const alphaMatch = name.match(/[A-Za-z]/);
  return (
    <span className="text-white font-black text-2xl">
      {alphaMatch ? alphaMatch[0].toUpperCase() : name.charAt(0)}
    </span>
  );
}

// SearchGridCard moved to @/components/product/SearchGridCard

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
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    categoryParam,
  );
  const [isVerified, setIsVerified] = useState(verifiedParam);
  const [sortBy, setSortBy] = useState(sortParam);
  const [attributeFilters, setAttributeFilters] = useState<
    Record<string, string[]>
  >({});
  const [collapsedGroups, setCollapsedGroups] = useState<
    Record<string, boolean>
  >({});
  const [globalResults, setGlobalResults] = useState<
    {
      name: string;
      category: string;
      approxPrice: number;
      condition?: string;
      sourceUrl?: string;
      image_url?: string;
      specs?: Record<string, string>;
    }[]
  >([]);
  const [isGlobalSearching, setIsGlobalSearching] = useState(false);
  const [showGlobalResults, setShowGlobalResults] = useState(false);

  // Nav search results passed from the navbar search dropdown
  const [navResults, setNavResults] = useState<any[]>([]);
  const [navClickedId, setNavClickedId] = useState<string>("");
  const fromNav = searchParams.get("from") === "nav";

  // Previous Search History State ("Customers Also Bought")
  const [historyGroups, setHistoryGroups] = useState<
    { query: string; products: any[] }[]
  >([]);
  const lastQueryRef = React.useRef(query);
  const lastResultsRef = React.useRef<any[]>([]);
  const [showMoreHistory, setShowMoreHistory] = useState<boolean>(false);

  // Read cached nav results on mount when navigated from navbar
  useEffect(() => {
    if (fromNav) {
      try {
        const cachedResults = sessionStorage.getItem("fp_nav_search_results");
        const cachedClicked = sessionStorage.getItem("fp_nav_search_clicked");
        if (cachedResults) {
          const parsed = JSON.parse(cachedResults);
          // Sort with clicked product first
          if (cachedClicked) {
            setNavClickedId(cachedClicked);
            const clickedIdx = parsed.findIndex(
              (p: any) => p.id === cachedClicked,
            );
            if (clickedIdx > 0) {
              const [clicked] = parsed.splice(clickedIdx, 1);
              parsed.unshift(clicked);
            }
          }
          setNavResults(parsed);

          // Also persist these to DemoStore so they don't 404 if direct linked later
          parsed.forEach((p: any) => {
            if (p._source === 'global' && !DemoStore.getProducts().some(sp => sp.id === p.id)) {
              DemoStore.addRawProduct(p);
            }
          });
        }

        // Clean up sessionStorage ONLY if the query is different, to allow "Back" button to work
        const cachedQuery = sessionStorage.getItem("fp_nav_search_query");
        if (cachedQuery && cachedQuery !== query) {
          sessionStorage.removeItem("fp_nav_search_results");
          sessionStorage.removeItem("fp_nav_search_clicked");
          sessionStorage.removeItem("fp_nav_search_query");
        }
      } catch {
        /* fail silently */
      }
    }
  }, [fromNav]);

  useEffect(() => {
    if (minPriceParam)
      setPriceRange([Number(minPriceParam), Number(maxPriceParam) || 5000000]);
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
  }, [
    searchParams,
    minPriceParam,
    maxPriceParam,
    categoryParam,
    verifiedParam,
    sortParam,
  ]);

  const updateFilters = (
    newParams: Record<string, string | number | null | undefined>,
  ) => {
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
      ? current.filter((v) => v !== value)
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
    Array.from(params.keys())
      .filter((k) => k.startsWith("attr_"))
      .forEach((k) => params.delete(k));
    Object.entries(newAttrs).forEach(([k, vals]) => {
      if (vals.length > 0) params.set(`attr_${k}`, vals.join(","));
    });
    router.push(`/search?${params.toString()}`, { scroll: false });
  };

  const toggleGroupCollapse = (key: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
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
  const [allProducts, setAllProducts] = useState<
    import("@/lib/types").Product[]
  >([]);

  // Pagination State
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 12;
  const { ref: observerRef, inView } = useInView({ threshold: 0.1 });

  useEffect(() => {
    const refresh = () =>
      setAllProducts(
        DemoStore.getApprovedProducts().filter((p) => p.is_active),
      );
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
      fetch("/api/gemini-price", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productName: query, mode: "search" }),
      })
        .then((res) => res.json())
        .then((data) => {
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
    return allProducts
      .filter((product) => {
        if (
          query &&
          !product.name.toLowerCase().includes(query.toLowerCase()) &&
          !(
            product.description &&
            product.description.toLowerCase().includes(query.toLowerCase())
          )
        )
          return false;
        if (
          selectedCategory &&
          selectedCategory !== "All" &&
          product.category?.toLowerCase() !== selectedCategory.toLowerCase()
        )
          return false;
        if (
          isVerified &&
          !product.seller_name.includes("TechHub") &&
          !product.seller_name.includes("FairPrice")
        )
          return false;
        if (product.price < priceRange[0] || product.price > priceRange[1])
          return false;

        // Apply attribute filters
        for (const [key, values] of Object.entries(attributeFilters)) {
          if (values.length === 0) continue;
          const productValue = product.specs?.[key]?.toLowerCase();
          if (!productValue) continue;
          if (!values.some((v) => productValue.includes(v))) return false;
        }

        return true;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case "price_asc":
            return a.price - b.price;
          case "price_desc":
            return b.price - a.price;
          case "newest":
            return (
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime()
            );
          default:
            return 0;
        }
      });
  }, [
    query,
    selectedCategory,
    isVerified,
    priceRange,
    sortBy,
    allProducts,
    attributeFilters,
  ]);

  useEffect(() => {
    setPage(1);
  }, [
    query,
    selectedCategory,
    isVerified,
    priceRange,
    sortBy,
    attributeFilters,
  ]);

  useEffect(() => {
    if (inView) setPage((p) => p + 1);
  }, [inView]);

  const paginatedProducts = useMemo(() => {
    return filteredProducts.slice(0, page * ITEMS_PER_PAGE);
  }, [filteredProducts, page]);

  // Build the combined current view array
  const combinedCurrentResults = useMemo(() => {
    const uniqueLocalProducts = paginatedProducts.filter(
      (p) => !navResults.some((n: any) => n.id === p.id),
    );
    const combined = [...navResults, ...uniqueLocalProducts];

    // Ensure the clicked NavSearch item is placed at the absolute front of the result queue
    if (navClickedId) {
      const clickedItemIndex = combined.findIndex((p) => p.id === navClickedId);
      if (clickedItemIndex > 0) {
        const [clickedItem] = combined.splice(clickedItemIndex, 1);
        combined.unshift(clickedItem);
      }
    }

    if (showGlobalResults) {
      const mappedGlobal = globalResults.map((r, i) => ({
        id: `global_${query}_${i}`,
        name: r.name,
        price: r.approxPrice || 0,
        original_price: r.approxPrice ? Math.round(r.approxPrice * 1.15) : 0,
        category: r.category || "electronics",
        description: r.name,
        image_url: r.image_url || "/assets/images/placeholder.png",
        seller_id: "global-partners",
        seller_name: "Global Partner Store",
        price_flag: "fair" as const,
        sold_count: Math.floor(Math.random() * 200) + 10,
        review_count: Math.floor(Math.random() * 50) + 5,
        avg_rating: +(3.5 + Math.random() * 1.5).toFixed(1),
        is_active: true,
        created_at: new Date().toISOString(),
        _source: "global",
      }));
      const uniqueGlobal = mappedGlobal.filter(
        (g) =>
          !combined.some((c) => c.name.toLowerCase() === g.name.toLowerCase()),
      );
      combined.push(...uniqueGlobal);
    }
    return combined;
  }, [navResults, paginatedProducts, showGlobalResults, globalResults, query]);

  // History tracking logic: Shift to "Customers Also Bought" when query changes
  useEffect(() => {
    if (query && query !== lastQueryRef.current) {
      // A new search occurred. Save the previous one if it had results.
      if (lastResultsRef.current.length > 0 && lastQueryRef.current) {
        setHistoryGroups([
          { query: lastQueryRef.current, products: lastResultsRef.current },
        ]);
      }
      // Reset state for new search
      lastQueryRef.current = query;
      setNavResults([]);
      setShowGlobalResults(false);
      setGlobalResults([]);
      setPage(1);
    }
    lastResultsRef.current = combinedCurrentResults;
  }, [query, combinedCurrentResults, lastQueryRef]);

  // Combined results count (nav results + filtered local products)
  const totalResultCount =
    combinedCurrentResults.length +
    (filteredProducts.length - paginatedProducts.length);

  return (
    <div className="min-h-screen bg-white font-sans selection:bg-brand-green-200">
      <Navbar />

      <main className="container mx-auto px-4 py-8 pt-24 min-h-[80vh]">
        {/* Scrollable Apple/Temu-like Pill Filter Bar (Non-sticky) */}
        <div className="mb-6 w-full flex flex-col gap-3 bg-white/95 pt-3 pb-2 sm:rounded-b-2xl border-b sm:border border-gray-100 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.1)] -mx-4 px-4 sm:mx-0 sm:px-4 -mt-4 transition-all duration-300">
          {/* Top Row: Horizontal Scrollable Filters */}
          <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar pb-1 pt-1 px-1 -mx-4 sm:mx-0 sm:px-0 w-full snap-x">
            {/* Main Filters Button - Now opens a Sheet */}
            <Sheet>
              <SheetTrigger asChild>
                <button className="flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-bold whitespace-nowrap bg-white text-gray-700 border border-gray-200 hover:border-gray-300 hover:bg-gray-50 active:scale-95 transition-all shadow-sm shrink-0 snap-start">
                  <Filter className="h-4 w-4 text-gray-500" /> Filters
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px] sm:w-[350px] p-0 flex flex-col bg-white">
                <SheetHeader className="p-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10 text-left">
                  <SheetTitle className="text-lg font-bold text-gray-900 m-0 p-0 text-left">Filters</SheetTitle>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                  {/* Category Filter */}
                  <div className="space-y-3">
                    <h3 className="font-bold text-sm text-gray-900">Category</h3>
                    <div className="space-y-2">
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <div className={cn("w-4 h-4 rounded-full border flex items-center justify-center transition-colors", !selectedCategory || selectedCategory === "all" ? "border-brand-orange bg-brand-orange" : "border-gray-300 group-hover:border-gray-400")}>
                          {(!selectedCategory || selectedCategory === "all") && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                        </div>
                        <span className={cn("text-sm", !selectedCategory || selectedCategory === "all" ? "text-gray-900 font-medium" : "text-gray-600")}>All Categories</span>
                        <input type="radio" className="hidden" checked={!selectedCategory || selectedCategory === "all"} onChange={() => updateFilters({ category: "" })} />
                      </label>
                      {CATEGORIES.slice(0, 8).map((cat) => (
                        <label key={cat.value} className="flex items-center gap-3 cursor-pointer group">
                          <div className={cn("w-4 h-4 rounded-full border flex items-center justify-center transition-colors", selectedCategory === cat.value ? "border-brand-orange bg-brand-orange" : "border-gray-300 group-hover:border-gray-400")}>
                            {selectedCategory === cat.value && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                          </div>
                          <span className={cn("text-sm", selectedCategory === cat.value ? "text-gray-900 font-medium" : "text-gray-600")}>{cat.label}</span>
                          <input type="radio" className="hidden" checked={selectedCategory === cat.value} onChange={() => updateFilters({ category: cat.value })} />
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Price Filter */}
                  <div className="space-y-3 pt-4 border-t border-gray-100">
                    <h3 className="font-bold text-sm text-gray-900">Price Range</h3>
                    <div className="px-2">
                      <Slider
                        defaultValue={[priceRange[0], priceRange[1]]}
                        max={5000000}
                        step={1000}
                        onValueChange={(val) => setPriceRange(val)}
                        onValueCommit={(val) => updateFilters({ minPrice: val[0], maxPrice: val[1] })}
                        className="my-6"
                      />
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <p className="text-xs text-gray-500 mb-1">Min</p>
                        <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium text-gray-700">
                          ₦{(priceRange[0] || 0).toLocaleString()}
                        </div>
                      </div>
                      <div className="text-gray-400">-</div>
                      <div className="flex-1">
                        <p className="text-xs text-gray-500 mb-1">Max</p>
                        <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium text-gray-700">
                          ₦{(priceRange[1] || 5000000).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Dynamic Attribute Filters */}
                  {categoryFilterGroups.map((group) => (
                    <div key={group.key} className="space-y-3 pt-4 border-t border-gray-100">
                      <h3 className="font-bold text-sm text-gray-900">{group.label}</h3>

                      {group.key === 'color' ? (
                        <div className="flex flex-wrap gap-3">
                          {group.options.map(opt => {
                            const isSelected = (attributeFilters[group.key] || []).includes(opt.value);
                            // Map typical color names to actual hex colors for the UI
                            const colorMap: Record<string, string> = {
                              'black': '#000000', 'white': '#FFFFFF', 'gray': '#808080', 'silver': '#C0C0C0',
                              'red': '#FF0000', 'blue': '#0000FF', 'green': '#008000', 'yellow': '#FFFF00',
                              'purple': '#800080', 'pink': '#FFC0CB', 'gold': '#FFD700', 'orange': '#FFA500'
                            };
                            const hexColor = colorMap[opt.value.toLowerCase()] || '#E5E7EB';
                            return (
                              <button
                                key={opt.value}
                                onClick={() => toggleAttributeFilter(group.key, opt.value)}
                                className={cn(
                                  "w-6 h-6 rounded-full border-2 transition-all",
                                  isSelected ? "border-brand-orange scale-110 shadow-sm" : "border-transparent hover:scale-110",
                                  hexColor === '#FFFFFF' ? "border-gray-200" : ""
                                )}
                                style={{ backgroundColor: hexColor }}
                                title={opt.label}
                                aria-label={`Filter by ${opt.label}`}
                              />
                            );
                          })}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {group.options.map((opt) => {
                            const isSelected = (attributeFilters[group.key] || []).includes(opt.value);
                            return (
                              <label key={opt.value} className="flex items-center gap-3 cursor-pointer group">
                                <div className={cn("w-4 h-4 rounded-full border flex items-center justify-center transition-colors", isSelected ? "border-brand-orange bg-brand-orange" : "border-gray-300 group-hover:border-gray-400")}>
                                  {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                                </div>
                                <span className={cn("text-sm", isSelected ? "text-gray-900 font-medium" : "text-gray-600")}>{opt.label}</span>
                                <input type="checkbox" className="hidden" checked={isSelected} onChange={() => toggleAttributeFilter(group.key, opt.value)} />
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Footer fixed */}
                <div className="p-4 border-t border-gray-100 bg-white sticky bottom-0 z-10 grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    className="w-full rounded-xl border-gray-200 text-gray-700 font-bold h-11"
                    onClick={() => {
                      setAttributeFilters({});
                      setPriceRange([0, 5000000]);
                      setSelectedCategory(null);
                      setIsVerified(false);
                      const params = new URLSearchParams();
                      if (query) params.set("q", query);
                      router.push(`/search?${params.toString()}`, { scroll: false });
                    }}
                  >
                    Reset
                  </Button>
                  <SheetTrigger asChild>
                    <Button className="w-full bg-brand-orange hover:bg-[#E65C00] text-white font-bold rounded-xl h-11">
                      Show {Math.max(totalResultCount, 12)}+ items
                    </Button>
                  </SheetTrigger>
                </div>
              </SheetContent>
            </Sheet>

            {/* Clear All */}
            {(Object.keys(attributeFilters).length > 0 ||
              selectedCategory ||
              isVerified ||
              priceRange[0] > 0 ||
              priceRange[1] < 5000000) && (
                <button
                  onClick={() => {
                    setAttributeFilters({});
                    setPriceRange([0, 5000000]);
                    setSelectedCategory(null);
                    setIsVerified(false);
                    const params = new URLSearchParams();
                    if (query) params.set("q", query);
                    router.push(`/search?${params.toString()}`, {
                      scroll: false,
                    });
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-bold whitespace-nowrap bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 hover:border-red-200 active:scale-95 transition-all shrink-0 shadow-sm snap-start"
                >
                  <Filter className="h-3.5 w-3.5" /> Clear All
                </button>
              )}

            {/* Sort Dropdown as Pill */}
            <Select
              value={sortBy}
              onValueChange={(val: string) => updateFilters({ sort: val })}
            >
              <SelectTrigger className="flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-bold whitespace-nowrap transition-all shadow-sm border border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50 active:scale-95 w-auto h-auto focus:ring-1 focus:ring-gray-200 shrink-0 snap-start">
                <SelectValue placeholder="Sort: Relevance" />
              </SelectTrigger>
              <SelectContent className="bg-white text-gray-900 border border-gray-100 shadow-xl rounded-xl">
                <SelectItem
                  value="relevance"
                  className="font-medium focus:bg-gray-50"
                >
                  Sort by: Relevance
                </SelectItem>
                <SelectItem
                  value="price_asc"
                  className="font-medium focus:bg-gray-50"
                >
                  Price: Low to High
                </SelectItem>
                <SelectItem
                  value="price_desc"
                  className="font-medium focus:bg-gray-50"
                >
                  Price: High to Low
                </SelectItem>
                <SelectItem
                  value="newest"
                  className="font-medium focus:bg-gray-50"
                >
                  Newest Arrivals
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Category Dropdown as Pill */}
            <Select
              value={selectedCategory || "all"}
              onValueChange={(val: string) =>
                updateFilters({ category: val === "all" ? "" : val })
              }
            >
              <SelectTrigger className="flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-bold whitespace-nowrap transition-all shadow-sm border border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50 active:scale-95 w-auto h-auto focus:ring-1 focus:ring-gray-200 shrink-0 snap-start data-[state=open]:bg-gray-50">
                <SelectValue placeholder="Category: All" />
              </SelectTrigger>
              <SelectContent className="bg-white text-gray-900 border border-gray-100 shadow-xl rounded-xl">
                <SelectItem
                  value="all"
                  className="font-medium focus:bg-gray-50"
                >
                  All Categories
                </SelectItem>
                {CATEGORIES.map((cat) => (
                  <SelectItem
                    key={cat.value}
                    value={cat.value}
                    className="font-medium focus:bg-gray-50"
                  >
                    <div className="flex items-center gap-2">
                      {getCategoryIcon(cat.value)}{" "}
                      <span className="capitalize">{cat.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Verified Only Pill */}
            <button
              onClick={() =>
                updateFilters({ verified: isVerified ? null : "true" })
              }
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-bold whitespace-nowrap transition-all shadow-sm border shrink-0 snap-start active:scale-95",
                isVerified
                  ? "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700"
                  : "bg-white text-gray-700 border-gray-200 hover:border-gray-300 hover:bg-gray-50",
              )}
            >
              <ShieldCheck className="h-4 w-4" /> Verified
            </button>

            {/* Dynamic category filters as Pills */}
            {categoryFilterGroups.map((group: FilterGroup) => {
              const activeValues = attributeFilters[group.key] || [];
              const isActive = activeValues.length > 0;
              return (
                <Select
                  key={group.key}
                  value={activeValues[0] || ""}
                  onValueChange={(val) => {
                    if (val === "clear") {
                      setAttributeFilters((prev) => ({
                        ...prev,
                        [group.key]: [],
                      }));
                    } else {
                      setAttributeFilters((prev) => ({
                        ...prev,
                        [group.key]: [val],
                      }));
                    }
                  }}
                >
                  <SelectTrigger
                    className={cn(
                      "flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-bold whitespace-nowrap transition-all shadow-sm border w-auto h-auto focus:ring-1 focus:ring-gray-200 shrink-0 snap-start data-[state=open]:bg-gray-50 active:scale-95",
                      isActive
                        ? "bg-gray-900 text-white border-gray-900 hover:bg-gray-800"
                        : "bg-white text-gray-700 border-gray-200 hover:border-gray-300 hover:bg-gray-50",
                    )}
                  >
                    {group.label}{" "}
                    {isActive && (
                      <span className="ml-1 px-1.5 py-0.5 rounded-full bg-white text-gray-900 text-[10px]">
                        {activeValues.length}
                      </span>
                    )}
                  </SelectTrigger>
                  <SelectContent className="bg-white text-gray-900 border border-gray-100 shadow-xl rounded-xl max-h-[300px]">
                    {isActive && (
                      <SelectItem
                        value="clear"
                        className="font-bold text-red-500 focus:bg-red-50 focus:text-red-700"
                      >
                        Clear
                      </SelectItem>
                    )}
                    {group.options.map((opt) => (
                      <SelectItem
                        key={opt.value}
                        value={opt.value}
                        className="font-medium focus:bg-gray-50"
                      >
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
              Showing 1-{Math.min(20, totalResultCount)} of over{" "}
              {totalResultCount > 20
                ? Math.max(totalResultCount, 77)
                : totalResultCount}{" "}
              results for{" "}
              <span className="font-bold text-gray-900">
                "{query || "All Products"}"
              </span>
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-8">
          <div className="flex-1 w-full">
            {/* Scrollable Apple-like Translucent Pill Filters */}
            <div className="mb-6 flex items-center gap-2 overflow-x-auto pb-4 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mr-2 shrink-0">
                Popular:
              </span>
              {CATEGORIES.slice(0, 10).map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => updateFilters({ category: cat.value })}
                  className={cn(
                    "flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap backdrop-blur-md shadow-sm border",
                    selectedCategory === cat.value
                      ? "bg-emerald-600/90 text-white border-emerald-500 shadow-md scale-105"
                      : "bg-white/80 text-gray-700 border-gray-200/50 hover:bg-white hover:border-emerald-200 hover:text-emerald-700 hover:shadow-md",
                  )}
                >
                  {getCategoryIcon(cat.value)} {cat.label}
                </button>
              ))}
            </div>

            {/* UNIFIED SEARCH RESULTS GRID */}
            {combinedCurrentResults.length > 0 && (
              <div className="mb-10">
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {combinedCurrentResults.map((product: any) => (
                    <SearchGridCard key={product.id} product={product} />
                  ))}

                  {/* Inline Loading skeletons for global search when active */}
                  {isGlobalSearching &&
                    showGlobalResults &&
                    [1, 2, 3, 4].map((i) => (
                      <div
                        key={`skeleton-${i}`}
                        className="bg-white rounded-2xl border border-gray-100 p-3 animate-pulse shadow-sm h-[320px]"
                      >
                        <div className="aspect-square bg-gray-50 rounded-xl mb-3" />
                        <div className="h-3 bg-gray-100 rounded-full w-3/4 mb-2" />
                        <div className="h-3 bg-gray-100 rounded-full w-1/2" />
                      </div>
                    ))}
                </div>

                {paginatedProducts.length < filteredProducts.length &&
                  !showGlobalResults && (
                    <div ref={observerRef} className="py-8 flex justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
                    </div>
                  )}
              </div>
            )}

            {combinedCurrentResults.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                <SearchIcon className="h-10 w-10 text-gray-300 mb-4" />
                <h2 className="text-xl font-bold mb-2 text-black">
                  No results for &quot;{query}&quot;
                </h2>
                <p className="text-gray-500 max-w-md mb-6 text-sm">
                  Try checking your spelling or use more general terms.
                </p>
                <Button
                  onClick={() => {
                    setAttributeFilters({});
                    router.push("/search", { scroll: false });
                  }}
                  className="rounded-full bg-emerald-600 text-white px-8 font-bold text-sm"
                >
                  Clear all filters
                </Button>
              </div>
            )}

            {/* See more results Button */}
            {query &&
              query.trim().length > 2 &&
              !showGlobalResults &&
              combinedCurrentResults.length > 0 && (
                <div className="flex justify-center my-10 relative">
                  <div
                    className="absolute inset-0 flex items-center"
                    aria-hidden="true"
                  >
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

            {/* CUSTOMERS ALSO BOUGHT (Previous Search Results) */}
            {historyGroups.length > 0 && (
              <div className="mt-16 pt-10 border-t border-gray-200">
                <h3 className="text-2xl font-black text-gray-900 tracking-tight mb-6">
                  Customers Also Bought
                </h3>
                {historyGroups.map((group, gIdx) => (
                  <div key={gIdx} className="mb-8">
                    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {group.products
                        .slice(0, showMoreHistory ? group.products.length : 8)
                        .map((product: any) => (
                          <SearchGridCard
                            key={`history-${gIdx}-${product.id}`}
                            product={product}
                          />
                        ))}
                    </div>
                    {!showMoreHistory && group.products.length > 8 && (
                      <div className="flex justify-center mt-8">
                        <button
                          onClick={() => setShowMoreHistory(true)}
                          className="px-6 py-2.5 rounded-full border border-gray-300 text-sm font-bold text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-colors bg-white shadow-sm"
                        >
                          View More
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* RELATED SEARCHES (Temu Style) */}
            {combinedCurrentResults.length > 0 && query && (
              <div className="mt-16 pt-8 border-t border-gray-100">
                <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  Related Searches
                </h3>
                <div className="flex flex-wrap gap-3">
                  {[
                    "iphone 13 pro max",
                    "samsung s22 ultra",
                    "apple watch series 8",
                    "airpods pro 2",
                    "macbook pro m2",
                    "inverter battery 200ah",
                    "solar panel 300w",
                  ].map((term, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        const params = new URLSearchParams(
                          searchParams.toString(),
                        );
                        params.set("q", term);
                        router.push(`/search?${params.toString()}`);
                      }}
                      className="flex items-center gap-3 bg-gray-50 hover:bg-gray-100 pr-4 rounded-full transition-colors border border-gray-100 hover:border-gray-300"
                    >
                      <div className="h-10 w-10 shrink-0 bg-white rounded-full flex items-center justify-center overflow-hidden border border-gray-100 shadow-sm p-1 ml-1 my-1">
                        <img
                          src="/assets/images/placeholder-product.svg"
                          alt={term}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <span className="text-sm font-semibold text-gray-800">
                        {term}
                      </span>
                    </button>
                  ))}
                </div>
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
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-green-600"></div>
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
