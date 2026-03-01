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
  const [customersAlsoBoughtCount, setCustomersAlsoBoughtCount] = useState(8);

  // Read cached nav results on mount when navigated from navbar
  useEffect(() => {
    if (fromNav) {
      try {
        const cachedResults = sessionStorage.getItem("fp_nav_search_results");
        const cachedClicked = sessionStorage.getItem("fp_nav_search_clicked");
        const cachedQuery = sessionStorage.getItem("fp_nav_search_query");
        
        // Clean up sessionStorage ONLY if the query is different, to allow "Back" button to work
        if (cachedQuery && cachedQuery !== query) {
          sessionStorage.removeItem("fp_nav_search_results");
          sessionStorage.removeItem("fp_nav_search_clicked");
          sessionStorage.removeItem("fp_nav_search_query");
          setNavResults([]);
          return;
        }

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
      } catch {
        /* fail silently */
      }
    }
  }, [fromNav, query]);

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

  const [globalSearchCount, setGlobalSearchCount] = useState(0);

  const handleSeeMoreResults = () => {
    setShowGlobalResults(true);
    // Trigger another global search to fetch more results each time
    setGlobalSearchCount(prev => prev + 1);
    if (query && query.trim().length > 2) {
      setIsGlobalSearching(true);
      fetch("/api/gemini-price", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productName: query, mode: "search", offset: globalSearchCount + 1 }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.suggestions && Array.isArray(data.suggestions)) {
            setGlobalResults(prev => {
              const newItems = data.suggestions.filter(
                (s: any) => !prev.some(p => p.name.toLowerCase() === s.name.toLowerCase())
              );
              return [...prev, ...newItems];
            });
          }
        })
        .catch(() => { })
        .finally(() => setIsGlobalSearching(false));
    }
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
        // Priority to sponsored products
        if (a.is_sponsored && !b.is_sponsored) return -1;
        if (!a.is_sponsored && b.is_sponsored) return 1;

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
      const mappedGlobal = globalResults.map((r, i) => {
        // Create a stable, URL-safe ID from the product name
        const stableId = `global-${r.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '')}`;
        const descCategories = {
          electronics: "Experience next-generation technology with this premium device. Features include advanced processing, sleek design, and industry-leading reliability. Sourced directly from verified global distributors to guarantee authenticity and the best possible price. Includes our comprehensive FairPrice Escrow protection.",
          phones: "Stay connected with this cutting-edge smartphone. Boasting a stunning display, all-day battery life, and a professional-grade camera system. Secured via our global sourcing network to bring you unbeatable value with full Escrow protection.",
          computing: "Boost your productivity with this high-performance machine. Built with premium materials and powerful components to handle your most demanding tasks. Imported through our trusted global supply chain with guaranteed quality and fair pricing.",
          default: "Discover exceptional quality and value with this premium product. Carefully selected by our AI sourcing engine from top-tier global suppliers to ensure you get the best deal without compromising on quality. Every purchase is fully secured by FairPrice Escrow."
        };
        const catList = r.category ? r.category.toLowerCase() : "default";
        let descBase = descCategories.default;
        if (catList.includes("phone")) descBase = descCategories.phones;
        else if (catList.includes("laptop") || catList.includes("comput")) descBase = descCategories.computing;
        else if (catList.includes("electronic") || catList.includes("audio")) descBase = descCategories.electronics;

        const product = {
          id: stableId,
          name: r.name,
          price: r.approxPrice || 0,
          original_price: r.approxPrice ? Math.round(r.approxPrice * 1.15) : 0,
          category: r.category || "electronics",
          description: descBase,
          image_url: r.image_url || "/assets/images/placeholder.png",
          seller_id: "global-partners",
          seller_name: "Global Stores",
          price_flag: "fair" as const,
          sold_count: Math.floor(Math.random() * 200) + 10,
          review_count: Math.floor(Math.random() * 50) + 5,
          avg_rating: +(3.5 + Math.random() * 1.5).toFixed(1),
          is_active: true,
          created_at: new Date().toISOString(),
          _source: "global",
          specs: r.specs || {
            "Sourcing": "Global Network",
            "Shipping": "Air Freight (Tracked)",
            "Warranty": "1 Year International",
            "Condition": r.condition || "Brand New"
          },
        };

        return product;
      });
      const uniqueGlobal = mappedGlobal.filter(
        (g) =>
          !combined.some((c) => c.name.toLowerCase() === g.name.toLowerCase()),
      );
      combined.push(...uniqueGlobal);
    }
    return combined;
  }, [navResults, paginatedProducts, showGlobalResults, globalResults, query]);

  // Persist global products to DemoStore OUTSIDE of render (in a useEffect) to avoid
  // triggering setState on AuthProvider during render via storage events
  useEffect(() => {
    if (!showGlobalResults || globalResults.length === 0) return;
    globalResults.forEach((r) => {
      const stableId = `global-${r.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '')}`;
      const descCategories = {
        electronics: "Experience next-generation technology with this premium device. Features include advanced processing, sleek design, and industry-leading reliability. Sourced directly from verified global distributors to guarantee authenticity and the best possible price. Includes our comprehensive FairPrice Escrow protection.",
        phones: "Stay connected with this cutting-edge smartphone. Boasting a stunning display, all-day battery life, and a professional-grade camera system. Secured via our global sourcing network to bring you unbeatable value with full Escrow protection.",
        computing: "Boost your productivity with this high-performance machine. Built with premium materials and powerful components to handle your most demanding tasks. Imported through our trusted global supply chain with guaranteed quality and fair pricing.",
        default: "Discover exceptional quality and value with this premium product. Carefully selected by our AI sourcing engine from top-tier global suppliers to ensure you get the best deal without compromising on quality. Every purchase is fully secured by FairPrice Escrow."
      };
      const catList = r.category ? r.category.toLowerCase() : "default";
      let descBase = descCategories.default;
      if (catList.includes("phone")) descBase = descCategories.phones;
      else if (catList.includes("laptop") || catList.includes("comput")) descBase = descCategories.computing;
      else if (catList.includes("electronic") || catList.includes("audio")) descBase = descCategories.electronics;

      const product = {
        id: stableId,
        name: r.name,
        price: r.approxPrice || 0,
        original_price: r.approxPrice ? Math.round(r.approxPrice * 1.15) : 0,
        category: r.category || "electronics",
        description: descBase,
        image_url: r.image_url || "/assets/images/placeholder.png",
        seller_id: "global-partners",
        seller_name: "Global Stores",
        price_flag: "fair" as const,
        sold_count: 50,
        review_count: 12,
        avg_rating: 4.5,
        is_active: true,
        created_at: new Date().toISOString(),
        _source: "global",
        specs: r.specs || {
          "Sourcing": "Global Network",
          "Shipping": "Air Freight (Tracked)",
          "Warranty": "1 Year International",
          "Condition": r.condition || "Brand New"
        },
      };
      DemoStore.addRawProduct(product as any);
    });
  }, [showGlobalResults, globalResults]);

  // History tracking logic: Shift to "Customers Also Bought" when query changes
  useEffect(() => {
    // Only track history if the query ACTUALLY changed from a previous valid query
    // and don't prematurely clear navResults on the first render pass
    if (lastQueryRef.current && query && query !== lastQueryRef.current) {
      // A new search occurred. Save the previous one if it had results.
      if (lastResultsRef.current.length > 0) {
        setHistoryGroups((prev) => [
          { query: lastQueryRef.current, products: lastResultsRef.current },
          ...prev
        ].slice(0, 2)); // Keep max 2 previous searches
      }
      if (!fromNav) {
        setNavResults([]);
      }
      setShowGlobalResults(false);
      setGlobalResults([]);
      setPage(1);
      setCustomersAlsoBoughtCount(8);
    }
    lastQueryRef.current = query;
    lastResultsRef.current = combinedCurrentResults;
  }, [query, combinedCurrentResults, fromNav]);

  // Derived Customers Also Bought - Mix of relevant catalog items
  const customersAlsoBought = useMemo(() => {
    // Get popular products from the catalog that aren't already in the current search results
    const currentIds = new Set(combinedCurrentResults.map(p => p.id));
    return allProducts
      .filter(p => !currentIds.has(p.id))
      .sort((a, b) => b.sold_count - a.sold_count); // Sort by popularity
  }, [allProducts, combinedCurrentResults]);

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

            {/* Sort Dropdown as Pill (Native Select for Mobile Reliability) */}
            <div className="relative shrink-0 snap-start">
              <select
                value={sortBy}
                onChange={(e) => updateFilters({ sort: e.target.value })}
                className="appearance-none flex items-center gap-1.5 pl-4 pr-8 py-2 rounded-full text-[13px] font-bold whitespace-nowrap transition-all shadow-sm border border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="relevance">Sort by: Relevance</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="newest">Newest Arrivals</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>

            {/* Category Dropdown as Pill (Native Select) */}
            <div className="relative shrink-0 snap-start">
              <select
                value={selectedCategory || "all"}
                onChange={(e) => updateFilters({ category: e.target.value === "all" ? "" : e.target.value })}
                className="appearance-none flex items-center gap-1.5 pl-4 pr-8 py-2 rounded-full text-[13px] font-bold whitespace-nowrap transition-all shadow-sm border border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 capitalize"
              >
                <option value="all">All Categories</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>

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

            {/* Dynamic category filters as Native Select Pills */}
            {categoryFilterGroups.map((group: FilterGroup) => {
              const activeValues = attributeFilters[group.key] || [];
              const isActive = activeValues.length > 0;
              return (
                <div key={group.key} className="relative shrink-0 snap-start">
                  <select
                    value={activeValues[0] || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "clear" || !val) {
                        setAttributeFilters((prev) => ({ ...prev, [group.key]: [] }));
                        updateFilters({ [`attr_${group.key}`]: null });
                      } else {
                        setAttributeFilters((prev) => ({ ...prev, [group.key]: [val] }));
                        updateFilters({ [`attr_${group.key}`]: val });
                      }
                    }}
                    className={cn(
                      "appearance-none flex items-center gap-1.5 pl-4 pr-8 py-2 rounded-full text-[13px] font-bold whitespace-nowrap transition-all shadow-sm border focus:outline-none focus:ring-2 focus:ring-emerald-500/20",
                      isActive
                        ? "bg-gray-900 text-white border-gray-900 hover:bg-gray-800"
                        : "bg-white text-gray-700 border-gray-200 hover:border-gray-300 hover:bg-gray-50",
                    )}
                  >
                    <option value="" disabled hidden>{group.label} {isActive ? `(1)` : ''}</option>
                    {isActive && <option value="clear">✕ Clear {group.label}</option>}
                    {group.options.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className={cn("absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none", isActive ? "text-gray-400" : "text-gray-400")} />
                </div>
              );
            })}
          </div>

          {/* Bottom Row: Results Count */}
          <div className="flex items-center justify-between border-t border-gray-100/60 pt-2 px-1">
            <p className="text-sm text-gray-600 font-medium tracking-tight">
              {query ? (
                <span>Showing 1-{paginatedProducts.length || 0} of over <span className="font-bold text-gray-900">{totalResultCount > 20 ? Math.max(totalResultCount, 166) : totalResultCount}</span> results for &quot;<span className="text-brand-orange font-bold italic">{query}</span>&quot;</span>
              ) : (
                <span>Showing 1-{paginatedProducts.length || 0} of over <span className="font-bold text-gray-900">{totalResultCount > 20 ? Math.max(totalResultCount, 166) : totalResultCount}</span> results</span>
              )}
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
                    <div className="flex justify-center mt-8 mb-4">
                      <button
                        onClick={() => setPage(p => p + 1)}
                        className="px-8 py-3 rounded-full border border-gray-300 text-sm font-bold text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-colors bg-white shadow-sm flex items-center gap-2"
                      >
                        <ChevronDown className="h-4 w-4" /> View More Results
                      </button>
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

            {/* See more results Button — always visible when there's a valid query */}
            {query &&
              query.trim().length > 2 &&
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
                    disabled={isGlobalSearching}
                    className="relative flex items-center gap-2 bg-gradient-to-r from-emerald-500 hover:from-emerald-400 hover:to-teal-500 to-teal-600 text-white px-8 py-3 rounded-full font-bold shadow-xl shadow-emerald-500/20 transition-all z-10 disabled:opacity-60"
                  >
                    {isGlobalSearching ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Sparkles className="h-5 w-5 animate-pulse" />
                    )}
                    {isGlobalSearching ? 'Loading more...' : 'See more results'}
                  </motion.button>
                </div>
              )}

            {/* CUSTOMERS ALSO BOUGHT */}
            {customersAlsoBought.length > 0 && (
              <div className="mt-16 pt-10 border-t border-gray-200">
                <h3 className="text-2xl font-black text-gray-900 tracking-tight mb-6">
                  Customers Also Bought
                </h3>

                {historyGroups.map((group, gIdx) => (
                  <div key={`history-group-${gIdx}`} className="mb-8">
                    <h4 className="text-sm font-bold text-gray-500 mb-3 uppercase tracking-wide">Based on your earlier search for "{group.query}"</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {group.products
                        .slice(0, 4)
                        .map((product: any) => (
                          <SearchGridCard
                            key={`history-${gIdx}-${product.id}`}
                            product={product}
                          />
                        ))}
                    </div>
                  </div>
                ))}

                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {customersAlsoBought
                    .slice(0, customersAlsoBoughtCount)
                    .map((product: any) => (
                      <SearchGridCard
                        key={`recommended-${product.id}`}
                        product={product}
                      />
                    ))}
                </div>
                {customersAlsoBoughtCount < customersAlsoBought.length && (
                  <div className="flex justify-center mt-8 mb-8">
                    <button
                      onClick={() => setCustomersAlsoBoughtCount(c => c + 12)}
                      className="px-8 py-3 rounded-full border border-gray-300 text-sm font-bold text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-colors bg-white shadow-sm flex items-center gap-2"
                    >
                      <ChevronDown className="h-4 w-4" /> View More
                    </button>
                  </div>
                )}
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
