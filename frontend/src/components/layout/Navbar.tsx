import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image"; // Added for thumbnails
import {
    Search,
    ShoppingCart,
    Menu,
    User,
    MapPin,
    ChevronDown,
    X,
    Phone,
    Monitor,
    Sofa,
    Home,
    Zap,
    ShoppingBag,
    Car,
    Gamepad,
    Heart,
    Handshake,
    Sparkles,
    Globe,
    Shirt,
    Baby,
    Dumbbell,
    BookOpen,
    Wrench,
    Paintbrush,
    Package
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/ui/logo";
import { NotificationBell } from "@/components/ui/NotificationBell";
import { LocationModal } from "@/components/modals/LocationModal";
import { PriceIntelModal } from "@/components/modals/PriceIntelModal";
import { CATEGORIES } from "@/lib/types";
import { DEMO_PRODUCTS } from "@/lib/data"; // Import products for search
import { DemoStore } from "@/lib/demo-store";
import { cn } from "@/lib/utils";
import { useLocation } from "@/context/LocationContext";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";

// Category icon map for product image fallback
const CATEGORY_ICON_MAP: Record<string, React.ReactNode> = {
    phones: <Phone className="h-6 w-6" />,
    electronics: <Monitor className="h-6 w-6" />,
    computing: <Monitor className="h-6 w-6" />,
    fashion: <Shirt className="h-6 w-6" />,
    home: <Home className="h-6 w-6" />,
    furniture: <Sofa className="h-6 w-6" />,
    cars: <Car className="h-6 w-6" />,
    gaming: <Gamepad className="h-6 w-6" />,
    energy: <Zap className="h-6 w-6" />,
    baby: <Baby className="h-6 w-6" />,
    sports: <Dumbbell className="h-6 w-6" />,
    books: <BookOpen className="h-6 w-6" />,
    tools: <Wrench className="h-6 w-6" />,
    beauty: <Paintbrush className="h-6 w-6" />,
    grocery: <ShoppingBag className="h-6 w-6" />,
};

function CategoryIconFallback({ category }: { category: string }) {
    const cat = category?.toLowerCase() || "";
    const icon = Object.entries(CATEGORY_ICON_MAP).find(([key]) => cat.includes(key))?.[1] || <Package className="h-6 w-6" />;
    return (
        <div className="w-full h-full rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white">
            {icon}
        </div>
    );
}

export function Navbar() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
    const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [searchQuery, setSearchQuery] = useState("");
    const [suggestions, setSuggestions] = useState<typeof DEMO_PRODUCTS>([]); // State for suggestions
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isPriceIntelOpen, setIsPriceIntelOpen] = useState(false);
    const [priceIntelQuery, setPriceIntelQuery] = useState("");
    const [globalResults, setGlobalResults] = useState<{ name: string; category: string; approxPrice: number; sourceUrl?: string }[]>([]);
    const [isGlobalSearching, setIsGlobalSearching] = useState(false);
    const [autocompleteSuggestions, setAutocompleteSuggestions] = useState<string[]>([]);
    const { location, setLocation } = useLocation();
    const { cartCount } = useCart();
    const prevCartCountRef = useRef(cartCount);
    const [bounceKey, setBounceKey] = useState(0);

    // Trigger bounce when cart count increases
    useEffect(() => {
        if (cartCount > prevCartCountRef.current) {
            setBounceKey(k => k + 1);
        }
        prevCartCountRef.current = cartCount;
    }, [cartCount]);
    const { user, logout } = useAuth();
    const [isCategoryOpen, setIsCategoryOpen] = useState(false);
    const categoryRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    // Amazon-style search scoring algorithm
    const scoreProduct = (product: typeof DEMO_PRODUCTS[0], query: string): number => {
        const q = query.toLowerCase();
        const name = product.name.toLowerCase();
        const cat = product.category.toLowerCase();
        const seller = product.seller_name.toLowerCase();
        const words = q.split(/\s+/).filter(w => w.length > 0);
        let score = 0;

        // Exact name match → highest priority
        if (name === q) score += 100;
        // Name starts with query
        else if (name.startsWith(q)) score += 80;
        // Every query word found in name
        else if (words.every(w => name.includes(w))) score += 60;
        // Some words match
        else {
            const matchCount = words.filter(w => name.includes(w) || cat.includes(w) || seller.includes(w)).length;
            score += (matchCount / words.length) * 40;
        }

        // Category match bonus
        if (cat.includes(q) || words.some(w => cat.includes(w))) score += 15;
        // Seller match bonus
        if (seller.includes(q)) score += 5;
        // Popularity signals
        score += Math.min(product.sold_count / 100, 10);
        score += product.avg_rating;
        // Fair price bonus
        if (product.price_flag === "fair") score += 3;

        return score;
    };

    // Predictive Search Logic — ranked
    const [activeIndex, setActiveIndex] = useState(-1);
    const [categorySuggestions, setCategorySuggestions] = useState<string[]>([]);

    // Instant: local product matches + text autocomplete suggestions (no API calls)
    useEffect(() => {
        if (searchQuery.trim().length > 0) {
            const q = searchQuery.toLowerCase();
            // Local product matches — only STRONG matches
            const storeProducts = DemoStore.getApprovedProducts();
            const allSearchProducts = [...storeProducts, ...DEMO_PRODUCTS.filter(p => !storeProducts.some(sp => sp.id === p.id))];
            const scored = allSearchProducts
                .map(p => ({ product: p, score: scoreProduct(p, q) }))
                .filter(s => s.score > 30)
                .sort((a, b) => b.score - a.score)
                .slice(0, 3);
            setSuggestions(scored.map(s => s.product));

            // Category suggestions
            const matchedCats = CATEGORIES.filter(c =>
                c.label.toLowerCase().includes(q) || c.value.includes(q)
            ).slice(0, 3).map(c => c.label);
            setCategorySuggestions(matchedCats);

            // Generate smart, context-aware autocomplete suggestions (no API)
            const autoSuggs: string[] = [];
            const trimQ = searchQuery.trim();
            if (trimQ.length >= 2) {
                // Detect product type for smart suggestions
                const qLower = trimQ.toLowerCase();
                const isCarQuery = /\b(car|suv|sedan|truck|van|toyota|lexus|benz|bmw|honda|hyundai|kia|jetour|avatr|tesla|range rover|land cruiser|camry|corolla|rav4|highlander|prado|gwm|changan|geely|byd)\b/i.test(qLower);
                const isPhoneQuery = /\b(phone|iphone|samsung|galaxy|pixel|xiaomi|redmi|tecno|infinix|oppo|vivo|realme|oneplus|huawei)\b/i.test(qLower);
                const isElectronicsQuery = /\b(laptop|macbook|ps5|playstation|xbox|airpods|earbuds|headphone|speaker|tv|monitor|tablet|ipad)\b/i.test(qLower);

                if (isCarQuery) {
                    // Smart car suggestions with years and conditions
                    const hasYear = /\b(20[1-2]\d)\b/.test(trimQ);
                    if (!hasYear) {
                        autoSuggs.push(`${trimQ} 2025 Brand New`);
                        autoSuggs.push(`${trimQ} 2024 Foreign Used`);
                    } else {
                        autoSuggs.push(`${trimQ} Brand New`);
                        autoSuggs.push(`${trimQ} Foreign Used (Tokunbo)`);
                    }
                    autoSuggs.push(`${trimQ} Nigerian Used`);
                } else if (isPhoneQuery) {
                    autoSuggs.push(`${trimQ} Brand New`);
                    autoSuggs.push(`${trimQ} Refurbished`);
                    autoSuggs.push(`${trimQ} best price Nigeria`);
                } else if (isElectronicsQuery) {
                    autoSuggs.push(`${trimQ} Brand New`);
                    autoSuggs.push(`${trimQ} best deal`);
                    autoSuggs.push(`Buy ${trimQ} online Nigeria`);
                } else {
                    // Generic product suggestions
                    const nameSuggs = allSearchProducts
                        .filter(p => p.name.toLowerCase().includes(qLower) && !p.name.toLowerCase().includes('duty') && !p.name.toLowerCase().includes('levy') && !p.name.toLowerCase().includes('cif'))
                        .map(p => p.name)
                        .slice(0, 2);
                    autoSuggs.push(...nameSuggs);
                    if (autoSuggs.length < 4) autoSuggs.push(`${trimQ} best deal`);
                    if (autoSuggs.length < 4) autoSuggs.push(`Buy ${trimQ} online`);
                }
            }
            setAutocompleteSuggestions(autoSuggs.slice(0, 4));

            setShowSuggestions(true);
            setActiveIndex(-1);
        } else {
            setSuggestions([]);
            setCategorySuggestions([]);
            setGlobalResults([]);
            setIsGlobalSearching(false);
            setAutocompleteSuggestions([]);
            setShowSuggestions(false);
        }
    }, [searchQuery]);

    // Debounced global search — only fetches after user stops typing for 300ms AND has typed 2+ words
    useEffect(() => {
        const trimmed = searchQuery.trim();
        const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
        if (trimmed.length <= 2 || wordCount < 2) {
            setGlobalResults([]);
            setIsGlobalSearching(false);
            return;
        }

        setIsGlobalSearching(true);
        setGlobalResults([]);
        const fetchTimer = setTimeout(() => {
            fetch('/api/gemini-price', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productName: trimmed, mode: 'search' })
            })
                .then(res => res.json())
                .then(data => {
                    if (data.suggestions && Array.isArray(data.suggestions)) {
                        setGlobalResults(data.suggestions.filter((s: any) => !/\b(duty|levy|tariff|cif|customs|clearance fee|fertilizer|supplement|chemical)\b/i.test(s.name)).slice(0, 10));
                    }
                })
                .catch(() => { })
                .finally(() => setIsGlobalSearching(false));
        }, 300); // Super fast 300ms debounce

        return () => {
            clearTimeout(fetchTimer);
        };
    }, [searchQuery]);

    // Close suggestions when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
            if (categoryRef.current && !categoryRef.current.contains(event.target as Node)) {
                setIsCategoryOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSearch = () => {
        if (searchQuery.trim()) {
            setShowSuggestions(false);
            const catMatch = CATEGORIES.find(c => c.label === selectedCategory);
            const catValue = catMatch ? catMatch.value : "All";
            router.push(`/search?q=${encodeURIComponent(searchQuery)}&category=${catValue}`);
        }
    };

    const totalSuggestionItems = categorySuggestions.length + suggestions.length;

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            if (activeIndex >= 0 && activeIndex < categorySuggestions.length) {
                // Navigate to category
                setShowSuggestions(false);
                const catMatch = CATEGORIES.find(c => c.label === categorySuggestions[activeIndex]);
                const catValue = catMatch ? catMatch.value : "All";
                router.push(`/search?q=${encodeURIComponent(searchQuery)}&category=${catValue}`);
            } else if (activeIndex >= categorySuggestions.length && activeIndex < totalSuggestionItems) {
                // Navigate to product
                const product = suggestions[activeIndex - categorySuggestions.length];
                setShowSuggestions(false);
                router.push(`/product/${product.id}`);
            } else {
                handleSearch();
            }
        } else if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIndex(prev => Math.min(prev + 1, totalSuggestionItems - 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIndex(prev => Math.max(prev - 1, -1));
        } else if (e.key === "Escape") {
            setShowSuggestions(false);
        }
    };

    return (
        <>
            <header className="fixed top-0 left-0 right-0 z-50 w-full flex-col backdrop-blur-2xl backdrop-saturate-150" style={{ background: 'rgba(10, 104, 71, 0.78)' }}>
                {/* Top Bar — Liquid Glass */}
                <div className="flex w-full items-center gap-2 md:gap-4 liquid-glass px-3 md:px-4 py-3 text-white relative z-10">
                    {/* Logo */}
                    <Logo variant="light" hideTextMobile />

                    {/* Deliver To - Now Clickable */}
                    <button
                        onClick={() => setIsLocationModalOpen(true)}
                        className="hidden md:flex flex-col text-left text-xs leading-tight hover:bg-white/10 p-2 rounded cursor-pointer transition-all"
                    >
                        <span className="text-white ml-3">Deliver to</span>
                        <div className="flex items-center font-bold text-white">
                            <MapPin className="mr-1 h-3.5 w-3.5 text-white/70" />
                            {location}
                        </div>
                    </button>

                    {/* Search Bar Container */}
                    <div className="flex flex-1 items-center max-w-3xl mx-2 md:mx-4 relative" ref={searchRef}>
                        <div className="flex h-11 w-full rounded-xl bg-white text-black overflow-visible border border-gray-300 focus-within:border-ratel-orange focus-within:shadow-[0_0_0_3px_rgba(249,115,22,0.15)] transition-all relative">
                            {/* Category Dropdown */}
                            <div className="relative h-full" ref={categoryRef}>
                                <button
                                    onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                                    className="hidden sm:flex h-full items-center gap-1 bg-gray-100 px-3 text-xs text-gray-700 hover:bg-gray-200 border-r border-gray-300 transition-colors rounded-l-lg cursor-pointer whitespace-nowrap"
                                >
                                    {selectedCategory} <ChevronDown className="h-3 w-3" />
                                </button>

                                <AnimatePresence>
                                    {isCategoryOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: 5 }}
                                            className="absolute top-full left-0 mt-1 w-56 bg-white shadow-xl rounded-lg border border-gray-200 z-50 max-h-80 overflow-y-auto"
                                        >
                                            <div className="p-1">
                                                <button
                                                    onClick={() => {
                                                        setSelectedCategory("All");
                                                        setIsCategoryOpen(false);
                                                    }}
                                                    className={cn(
                                                        "w-full text-left px-3 py-2 text-sm rounded-md transition-colors",
                                                        selectedCategory === "All" ? "bg-ratel-green-50 text-ratel-green-700 font-medium" : "hover:bg-gray-100 text-gray-700"
                                                    )}
                                                >
                                                    All Categories
                                                </button>
                                                {CATEGORIES.map((cat) => (
                                                    <button
                                                        key={cat.value}
                                                        onClick={() => {
                                                            setSelectedCategory(cat.label);
                                                            setIsCategoryOpen(false);
                                                        }}
                                                        className={cn(
                                                            "w-full text-left px-3 py-2 text-sm rounded-md transition-colors flex items-center gap-2",
                                                            selectedCategory === cat.label ? "bg-ratel-green-50 text-ratel-green-700 font-medium" : "hover:bg-gray-100 text-gray-700"
                                                        )}
                                                    >
                                                        <span>{cat.icon}</span>
                                                        {cat.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            <Input
                                className="flex-1 border-0 bg-transparent px-4 text-sm focus-visible:ring-0 placeholder:text-gray-500 rounded-none h-full text-black"
                                placeholder="Search FairPrice..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onFocus={() => searchQuery.length > 1 && setShowSuggestions(true)}
                                onKeyDown={handleKeyDown}
                            />

                            <Button
                                onClick={handleSearch}
                                className="h-full rounded-r-lg rounded-l-none px-5 bg-ratel-orange hover:bg-amber-500 text-black border-none transition-colors duration-300 cursor-pointer relative"
                            >
                                <Search className="h-5 w-5" />
                                <Sparkles className="h-2.5 w-2.5 absolute top-1.5 right-1.5 text-white/80" />
                            </Button>
                        </div>

                        {/* Predictive Search Dropdown — Amazon Style */}
                        <AnimatePresence>
                            {showSuggestions && (suggestions.length > 0 || categorySuggestions.length > 0 || searchQuery.trim().length > 1) && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.1 }}
                                    className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden z-[9999] max-h-[420px] overflow-y-auto"
                                >
                                    {/* Category Suggestions */}
                                    {categorySuggestions.length > 0 && (
                                        <div className="border-b border-gray-100">
                                            {categorySuggestions.map((catLabel, i) => {
                                                const catValue = CATEGORIES.find(c => c.label === catLabel)?.value || "All";
                                                return (
                                                    <Link
                                                        href={`/search?q=${encodeURIComponent(searchQuery)}&category=${catValue}`}
                                                        key={catLabel}
                                                        onClick={() => setShowSuggestions(false)}
                                                        className={cn(
                                                            "flex items-center gap-3 px-4 py-2.5 transition-colors text-sm",
                                                            activeIndex === i ? "bg-blue-50" : "hover:bg-gray-50"
                                                        )}
                                                    >
                                                        <Search className="h-4 w-4 text-gray-400 shrink-0" />
                                                        <span className="text-gray-900">{searchQuery}</span>
                                                        <span className="text-xs text-gray-400">in</span>
                                                        <span className="text-xs font-bold text-blue-600">{catLabel}</span>
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Text Autocomplete Suggestions (instant, no API) */}
                                    {autocompleteSuggestions.length > 0 && suggestions.length === 0 && (
                                        <div className="border-b border-gray-100">
                                            {autocompleteSuggestions.map((suggestion, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => {
                                                        setSearchQuery(suggestion);
                                                        setAutocompleteSuggestions([]);
                                                    }}
                                                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left"
                                                >
                                                    <Search className="h-4 w-4 text-gray-300 shrink-0" />
                                                    <span className="text-sm text-gray-700">{suggestion}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {/* Product Suggestions */}
                                    {suggestions.map((product, i) => {
                                        const idx = categorySuggestions.length + i;
                                        return (
                                            <Link
                                                href={`/product/${product.id}`}
                                                key={product.id}
                                                onClick={() => setShowSuggestions(false)}
                                                className={cn(
                                                    "flex items-center gap-4 p-3 transition-colors border-b border-gray-50 last:border-0",
                                                    activeIndex === idx ? "bg-blue-50" : "hover:bg-gray-50"
                                                )}
                                            >
                                                <div className="relative h-12 w-12 shrink-0 bg-gray-50 rounded-lg p-1 overflow-hidden">
                                                    <img
                                                        src={product.images?.[0] || product.image_url}
                                                        alt={product.name}
                                                        className="w-full h-full object-contain"
                                                        onError={(e) => {
                                                            // Hide the broken image and show category icon fallback
                                                            e.currentTarget.style.display = 'none';
                                                            const fallback = e.currentTarget.nextElementSibling;
                                                            if (fallback) (fallback as HTMLElement).style.display = 'flex';
                                                        }}
                                                    />
                                                    <div className="absolute inset-0 hidden items-center justify-center">
                                                        <CategoryIconFallback category={product.category} />
                                                    </div>
                                                </div>
                                                <div className="flex flex-col flex-1 min-w-0">
                                                    <span className="text-sm font-medium text-gray-900 line-clamp-1">{product.name}</span>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className="text-xs font-bold text-green-600">₦{product.price.toLocaleString()}</span>
                                                        <span className="text-[10px] text-gray-400">·</span>
                                                        <span className="text-[10px] text-gray-400">⭐ {product.avg_rating}</span>
                                                        <span className="text-[10px] text-gray-400">·</span>
                                                        <span className="text-[10px] text-gray-400">{product.seller_name}</span>
                                                    </div>
                                                </div>
                                                {product.price_flag === "fair" && (
                                                    <span className="text-[8px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full uppercase shrink-0">Fair</span>
                                                )}
                                            </Link>
                                        );
                                    })}

                                    {/* Global Search Results (from Gemini API) */}
                                    {isGlobalSearching && (
                                        <div className="border-t border-emerald-50 px-4 py-3">
                                            <div className="flex items-center gap-2 text-xs text-emerald-600 font-semibold mb-2">
                                                <Globe className="h-3.5 w-3.5 animate-spin" />
                                                Searching global markets...
                                            </div>
                                            {[1, 2, 3].map(i => (
                                                <div key={i} className="flex items-center gap-3 p-2.5 animate-pulse">
                                                    <div className="h-10 w-10 bg-emerald-50 rounded-lg" />
                                                    <div className="flex-1 space-y-1.5">
                                                        <div className="h-3 bg-gray-100 rounded w-3/4" />
                                                        <div className="h-2.5 bg-emerald-50 rounded w-1/3" />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {globalResults.length > 0 && (
                                        <div className="border-t border-emerald-50">
                                            <div className="px-4 py-2 bg-emerald-50/50 flex items-center gap-2 text-xs text-emerald-700 font-bold">
                                                <Globe className="h-3.5 w-3.5" />
                                                Global Results — Click to analyze price
                                            </div>
                                            {globalResults.map((result, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => {
                                                        setPriceIntelQuery(result.name);
                                                        setIsPriceIntelOpen(true);
                                                        setShowSuggestions(false);
                                                    }}
                                                    className="w-full flex items-center gap-3 p-3 transition-colors border-b border-gray-50 last:border-0 hover:bg-emerald-50/50 text-left"
                                                >
                                                    <div className="h-10 w-10 shrink-0 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg flex items-center justify-center">
                                                        <Globe className="h-5 w-5 text-emerald-500" />
                                                    </div>
                                                    <div className="flex flex-col flex-1 min-w-0">
                                                        <span className="text-sm font-medium text-gray-900 line-clamp-1">{result.name}</span>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className="text-xs font-bold text-emerald-600">₦{result.approxPrice?.toLocaleString()}</span>
                                                            <span className="text-[10px] text-gray-400">·</span>
                                                            <span className="text-[10px] text-gray-400 capitalize">{result.category}</span>
                                                        </div>
                                                    </div>
                                                    <span className="text-[8px] font-black text-white bg-emerald-500 px-2 py-0.5 rounded-full uppercase shrink-0 shadow-sm">Analyze</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {/* Global Search / Calculate Fair Price CTA */}
                                    {searchQuery.trim().length > 1 && (
                                        <button
                                            onClick={() => {
                                                setPriceIntelQuery(searchQuery);
                                                setIsPriceIntelOpen(true);
                                                setShowSuggestions(false);
                                            }}
                                            className="w-full flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-emerald-50 to-emerald-100/50 hover:from-emerald-100 hover:to-emerald-200/60 transition-all border-t border-emerald-100"
                                        >
                                            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white shrink-0 shadow-sm">
                                                <Globe className="h-5 w-5" />
                                            </div>
                                            <div className="flex flex-col flex-1 min-w-0 text-left">
                                                <span className="text-sm font-bold text-emerald-800 flex items-center gap-1.5">
                                                    <Sparkles className="h-3.5 w-3.5" />
                                                    Calculate Fair Price
                                                </span>
                                                <span className="text-[11px] text-emerald-600/80 line-clamp-1">
                                                    Search globally for "{searchQuery}" and get the best deal
                                                </span>
                                            </div>
                                            <span className="text-emerald-500 font-bold text-xs shrink-0">→</span>
                                        </button>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Account & Lists Dropdown */}
                    <div
                        className="relative flex flex-col text-xs leading-tight hover:bg-white/10 p-2 rounded cursor-pointer group justify-center md:justify-start"
                        onMouseEnter={() => setIsAccountMenuOpen(true)}
                        onMouseLeave={() => setIsAccountMenuOpen(false)}
                        onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
                    >
                        {/* Mobile View */}
                        <div className="md:hidden flex flex-col items-center">
                            <User className="h-6 w-6 text-white" />
                        </div>

                        {/* Desktop View */}
                        <div className="hidden md:flex flex-col">
                            <span className="text-white">Hello, {user ? user.name.split(" ")[0] : "Sign in"}</span>
                            <span className="font-bold text-white flex items-center">Account & Lists <ChevronDown className="ml-1 h-3 w-3" /></span>
                        </div>

                        {/* Dropdown Menu */}
                        <AnimatePresence>
                            {isAccountMenuOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    transition={{ duration: 0.2, ease: "easeOut" }}
                                    className="absolute top-full right-0 w-64 bg-white border border-gray-200 shadow-xl rounded-lg overflow-hidden z-[100] origin-top-right text-sm"
                                >
                                    {!user ? (
                                        <div className="p-4 bg-gray-50 border-b border-gray-200 text-center">
                                            <Link href="/login" onClick={() => setIsAccountMenuOpen(false)}>
                                                <Button className="w-full bg-gradient-to-r from-ratel-orange to-amber-500 text-black font-bold h-8 text-xs rounded-md shadow-sm mb-2">Sign in</Button>
                                            </Link>
                                            <p className="text-[11px] text-gray-500">
                                                New customer? <Link href="/login" className="text-blue-600 hover:underline" onClick={() => setIsAccountMenuOpen(false)}>Start here.</Link>
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="p-4 bg-gray-50 border-b border-gray-200 flex flex-col gap-3">
                                            <Link href="/account" onClick={() => setIsAccountMenuOpen(false)} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                                                <div className="h-10 w-10 min-w-10 rounded-full bg-gradient-to-br from-ratel-green-600 to-emerald-400 flex items-center justify-center text-white font-bold text-lg shadow-sm overflow-hidden">
                                                    {(() => {
                                                        const pic = typeof window !== 'undefined' ? localStorage.getItem('ratel_profile_pic') : null;
                                                        return pic ? <img src={pic} alt="" className="w-full h-full object-cover" /> : user.name.charAt(0).toUpperCase();
                                                    })()}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-gray-900 truncate">{user.name}</p>
                                                    <p className="text-xs text-gray-500 truncate">{user.email || 'user@example.com'}</p>
                                                </div>
                                            </Link>
                                            <button
                                                onClick={() => {
                                                    logout();
                                                    setIsAccountMenuOpen(false);
                                                }}
                                                className="w-full text-center py-1.5 text-xs font-bold text-gray-500 border border-gray-200 rounded hover:bg-white hover:text-red-600 transition-colors"
                                            >
                                                Sign Out
                                            </button>
                                        </div>
                                    )}

                                    {/* Favorites & Negotiations — promoted */}
                                    <div className="py-1">
                                        <Link href="/account/favorites" className="flex items-center gap-2 px-4 py-2 hover:bg-red-50 text-gray-700 font-medium transition-colors" onClick={() => setIsAccountMenuOpen(false)}>
                                            <Heart className="h-4 w-4 text-red-500 fill-red-500" />
                                            <span>Favorites</span>
                                        </Link>
                                        <Link href="/account/negotiations" className="flex items-center gap-2 px-4 py-2 hover:bg-emerald-50 text-gray-700 font-medium transition-colors" onClick={() => setIsAccountMenuOpen(false)}>
                                            <Handshake className="h-4 w-4 text-emerald-600" />
                                            <span>Negotiate a Price</span>
                                            <span className="ml-auto text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">New</span>
                                        </Link>
                                    </div>

                                    <div className="border-t border-gray-100 my-1"></div>

                                    <div className="py-1">
                                        <div className="px-4 py-2 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Your Account</div>
                                        <Link href="/account" className="block px-4 py-1.5 hover:bg-gray-100 text-gray-700" onClick={() => setIsAccountMenuOpen(false)}>Account</Link>
                                        <Link href="/account/orders" className="block px-4 py-1.5 hover:bg-gray-100 text-gray-700" onClick={() => setIsAccountMenuOpen(false)}>Orders</Link>
                                        <Link href={user ? "/seller/onboarding" : "/login?from=/seller/onboarding"} className="block px-4 py-1.5 hover:bg-red-50 text-red-600 font-medium" onClick={() => setIsAccountMenuOpen(false)}>Become a Seller</Link>
                                        <Link href="#" className="block px-4 py-1.5 hover:bg-gray-100 text-gray-700">Recommendations</Link>
                                        <Link href="#" className="block px-4 py-1.5 hover:bg-gray-100 text-gray-700">Browsing History</Link>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Returns & Orders */}
                    <Link href="/account/orders" className="hidden md:flex flex-col text-xs leading-tight hover:bg-white/10 p-2 rounded cursor-pointer transition-all">
                        <span className="font-bold text-white">Orders</span>
                        <span className="font-bold text-white">& Returns</span>
                    </Link>

                    {/* Notifications */}
                    <div className="hidden md:block">
                        <NotificationBell />
                    </div>

                    {/* Cart */}
                    <Link href="/cart" className="flex items-end gap-1 hover:bg-white/10 p-2 rounded relative transition-all">
                        <div className="relative">
                            <ShoppingCart className="h-8 w-8 text-white" />
                            {cartCount > 0 && (
                                <Badge
                                    key={`cart-badge-${bounceKey}`}
                                    className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center rounded-full bg-ratel-orange text-black font-bold p-0 border-2 border-transparent animate-cart-bounce"
                                >
                                    {cartCount}
                                </Badge>
                            )}
                        </div>
                        <span className="text-sm font-bold text-white hidden sm:inline mb-1">Cart</span>
                    </Link>
                </div>

                {/* Bottom Bar - Navigation */}
                <div className="flex w-full items-center gap-4 liquid-glass-sub px-4 py-2 text-sm text-white/90 overflow-x-auto no-scrollbar scroll-smooth relative z-0">
                    <button
                        onClick={toggleSidebar}
                        className="flex items-center gap-1 font-bold hover:bg-white/10 px-2 py-1 rounded transition-all text-white"
                    >
                        <Menu className="h-5 w-5" /> All
                    </button>

                    {[
                        { label: "Best-Selling Items", href: "/search?sort=bestselling" },
                        { label: "5-Star Rated", href: "/search?rating=5" },
                        { label: "New In", href: "/search?sort=newest" },
                        { label: "Categories", href: "#" },
                        { label: "Today's Deals", href: "/deals" },
                        { label: "Verified Listings", href: "/search?verified=true" },
                        { label: "Electronics", href: "/category/electronics" },
                        { label: "Phones", href: "/category/phones" },
                        { label: "Solar Energy", href: "/category/solar" },
                        { label: "Cars", href: "/category/cars" },
                        { label: "Help", href: "/help" },
                    ].map((item) => (
                        <Link
                            key={item.label}
                            href={item.href}
                            className="whitespace-nowrap px-2 py-1 hover:bg-white/10 rounded transition-all"
                        >
                            {item.label}
                        </Link>
                    ))}
                </div>
            </header>

            {/* Spacer for fixed navbar height */}
            <div className="h-[120px]" />

            {/* Location Filter Modal */}
            <LocationModal
                isOpen={isLocationModalOpen}
                onClose={() => setIsLocationModalOpen(false)}
                currentLocation={location}
                onSelectLocation={setLocation}
            />

            {/* Sidebar Overlay */}
            <AnimatePresence>
                {isSidebarOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.5 }}
                            exit={{ opacity: 0 }}
                            onClick={toggleSidebar}
                            className="fixed inset-0 z-40 bg-black"
                        />
                        <motion.div
                            initial={{ x: "-100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "-100%" }}
                            transition={{ type: "tween", duration: 0.3 }}
                            className="fixed inset-y-0 left-0 z-50 w-80 bg-white shadow-xl overflow-y-auto"
                        >
                            <div className="flex items-center justify-between bg-ratel-green-600 px-6 py-3 text-white font-bold text-lg">
                                {user ? (
                                    <div className="flex items-center gap-2">
                                        <User className="h-6 w-6" /> Hello, {user.name.split(" ")[0]}
                                    </div>
                                ) : (
                                    <Link href="/login" className="flex items-center gap-2 hover:underline">
                                        <User className="h-6 w-6" /> Hello, Sign in
                                    </Link>
                                )}
                                <button onClick={toggleSidebar} className="text-white/80 hover:text-white">
                                    <X className="h-6 w-6" />
                                </button>
                            </div>

                            <div className="py-2">
                                <div className="px-6 py-3 font-bold text-lg text-gray-800">Shop By Category</div>
                                <ul className="space-y-1">
                                    {/* Mock Categories for Sidebar */}
                                    {["Electronics", "Computers", "Smart Home", "Arts & Crafts", "Automotive", "Baby", "Beauty and Personal Care", "Women's Fashion", "Men's Fashion", "Girls' Fashion", "Boys' Fashion", "Health and Household", "Home and Kitchen", "Industrial and Scientific", "Luggage", "Movies & Television", "Pet Supplies", "Software", "Sports and Outdoors", "Tools & Home Improvement", "Toys and Games", "Video Games"].map((cat) => (
                                        <li key={cat}>
                                            <Link
                                                href={`/category/${cat.toLowerCase().replace(/ /g, "-").replace(/&/g, "and")}`}
                                                className="flex items-center justify-between px-6 py-3 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                                onClick={() => setIsSidebarOpen(false)}
                                            >
                                                <span>{cat}</span>
                                                <ChevronDown className="h-4 w-4 -rotate-90 text-gray-400" />
                                            </Link>
                                        </li>
                                    ))}
                                </ul>

                                <hr className="my-2 border-gray-200" />

                                <div className="px-6 py-3 font-bold text-lg text-gray-800">Help & Settings</div>
                                <ul>
                                    {["Your Account", "Customer Service", user ? "Sign Out" : "Sign In"].map((item) => (
                                        <li key={item}>
                                            <button
                                                onClick={() => {
                                                    if (item === "Sign Out") {
                                                        logout();
                                                    } else if (item === "Sign In") {
                                                        router.push("/login");
                                                    } else {
                                                        router.push(`/${item.toLowerCase().replace(" ", "-")}`);
                                                    }
                                                    setIsSidebarOpen(false);
                                                }}
                                                className="w-full text-left px-6 py-3 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                            >
                                                {item}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* PriceIntel Modal — triggered from search */}
            <PriceIntelModal
                isOpen={isPriceIntelOpen}
                onClose={() => setIsPriceIntelOpen(false)}
                initialQuery={priceIntelQuery}
            />
        </>
    );
}

// Fallback CATEGORIES if import fails or is not available in the context
const FALLBACK_CATEGORIES = [
    { label: "Phones & Tablets", value: "phones" },
    { label: "Electronics", value: "electronics" },
    { label: "Vehicles", value: "cars" },
    { label: "Green Energy", value: "energy" },
    { label: "Fashion", value: "fashion" },
    { label: "Gaming", value: "gaming" },
];
