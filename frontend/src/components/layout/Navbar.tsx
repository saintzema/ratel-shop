"use client";

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
    ChevronRight,
    X,
    Heart,
    Handshake,
    Sparkles,
    Globe,
    History,
    TrendingUp,
    Lock,
    Shield,
    ArrowRight,
    Crown,
    MessageCircle,
    Zap,
    Phone,
    Monitor,
    Shirt,
    Paintbrush,
    Home,
    Dumbbell,
    BookOpen,
    Sofa,
    ShoppingBag,
    Baby,
    Car,
    Gamepad,
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
import { SEED_PRODUCTS } from "@/lib/data"; // Import products for search
import { DataSyncService } from "@/lib/sync-store";
import { cn, getProductUrl } from "@/lib/utils";
import { useLocation } from "@/context/LocationContext";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useMessages } from "@/context/MessageContext";

const CATEGORY_ICON_MAP: Record<string, React.ReactNode> = {
    phones: <Phone className="h-6 w-6" />,
    smartphones: <Phone className="h-6 w-6" />,
    computers: <Monitor className="h-6 w-6" />,
    laptops: <Monitor className="h-6 w-6" />,
    electronics: <Monitor className="h-6 w-6" />,
    fashion: <Shirt className="h-6 w-6" />,
    clothing: <Shirt className="h-6 w-6" />,
    beauty: <Paintbrush className="h-6 w-6" />,
    home: <Home className="h-6 w-6" />,
    gym: <Dumbbell className="h-6 w-6" />,
    office: <BookOpen className="h-6 w-6" />,
    furniture: <Sofa className="h-6 w-6" />,
    grocery: <ShoppingBag className="h-6 w-6" />
};

const RECENT_SEARCHES_KEY = 'fp_recent_searches';
const MAX_RECENT_SEARCHES = 4;

function getRecentSearches(): string[] {
    try {
        const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch { return []; }
}

function saveRecentSearch(term: string) {
    try {
        const current = getRecentSearches();
        // Remove duplicate if exists, then prepend
        const filtered = current.filter(t => t.toLowerCase() !== term.toLowerCase());
        const updated = [term, ...filtered].slice(0, MAX_RECENT_SEARCHES);
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    } catch { /* quota */ }
}

export function Navbar() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
    const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [searchQuery, setSearchQuery] = useState("");
    const [suggestions, setSuggestions] = useState<typeof SEED_PRODUCTS>([]); // State for suggestions
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isPriceIntelOpen, setIsPriceIntelOpen] = useState(false);
    const [priceIntelQuery, setPriceIntelQuery] = useState("");
    const [globalResults, setGlobalResults] = useState<{ name: string; category: string; approxPrice: number; sourceUrl?: string; id?: string; image_url?: string }[]>([]);
    const [isGlobalSearching, setIsGlobalSearching] = useState(false);
    const [autocompleteSuggestions, setAutocompleteSuggestions] = useState<string[]>([]);
    const [cachedResults, setCachedResults] = useState<any[]>([]);
    const { location, setLocation } = useLocation();
    const { cartCount } = useCart();
    const { totalUnread, openMessageBox } = useMessages();
    const prevCartCountRef = useRef(cartCount);
    const [bounceKey, setBounceKey] = useState(0);

    const [unreadNotifs, setUnreadNotifs] = useState(0);
    const { user, logout } = useAuth();
    const [mounted, setMounted] = useState(false);
    const [isSeller, setIsSeller] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (user) {
            if (user.role === 'seller' || user.role === 'admin') {
                setIsSeller(true);
                return;
            }
            const sellers = DataSyncService.getSellers();
            const localMatch = sellers.some(s => s.owner_email === user.email || s.user_id === user.id || s.id === user.id);
            if (localMatch) {
                setIsSeller(true);
            } else {
                fetch('/api/sellers?all=true')
                    .then(res => res.json())
                    .then(data => {
                        const sers = Array.isArray(data) ? data : [];
                        const match = sers.some((s: any) =>
                            s.owner_email === user.email ||
                            s.user_id === user.id ||
                            s.id === user.id
                        );
                        setIsSeller(match);
                    })
                    .catch(() => setIsSeller(false));
            }
        } else {
            setIsSeller(false);
        }
    }, [user]);

    useEffect(() => {
        const loadNotifs = async () => {
            if (!user?.email && !user?.id) { setUnreadNotifs(0); return; }

            // Always include local DataSyncService notification unread count
            const localNotifs = DataSyncService.getNotifications(user.id || user.email);
            let localUnread = localNotifs.filter(n => !n.read).length;

            // If user is a seller, also fetch notifications addressed to their seller store ID
            if (isSeller) {
                const sellerId = DataSyncService.getCurrentSellerId();
                if (sellerId && sellerId !== user.id && sellerId !== user.email) {
                    const sellerNotifs = DataSyncService.getNotifications(sellerId);
                    localUnread += sellerNotifs.filter(n => !n.read).length;
                }
            }

            try {
                const res = await fetch(`/api/notifications?user_email=${encodeURIComponent(user.email)}&count_only=true`);
                if (res.ok) {
                    const data = await res.json();
                    setUnreadNotifs(Math.max(data.unread_count ?? 0, localUnread));
                } else {
                    // API failed — use local count
                    setUnreadNotifs(localUnread);
                }
            } catch {
                // Offline — use local count
                setUnreadNotifs(localUnread);
            }
        };
        loadNotifs();
        const poll = setInterval(loadNotifs, 30000);
        // Also listen for DataSyncService changes
        const onStorageChange = () => loadNotifs();
        window.addEventListener("sync-store-update", onStorageChange);
        window.addEventListener("storage", onStorageChange);
        return () => { clearInterval(poll); window.removeEventListener("sync-store-update", onStorageChange); window.removeEventListener("storage", onStorageChange); };
    }, [user, isSeller]);

    // Trigger bounce when cart count increases
    useEffect(() => {
        if (cartCount > prevCartCountRef.current) {
            setBounceKey(k => k + 1);
        }
        prevCartCountRef.current = cartCount;
    }, [cartCount]);
    const [isCategoryOpen, setIsCategoryOpen] = useState(false);
    const categoryRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    // Search scoring algorithm
    const scoreProduct = (product: typeof SEED_PRODUCTS[0], query: string): number => {
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
        if (words.every(w => name.includes(w))) {
            score += 60;
        } else {
            // Some words match
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
    const [textSuggestions, setTextSuggestions] = useState<string[]>([]);

    // Instant: local product matches + text autocomplete suggestions (no API calls)
    useEffect(() => {
        if (searchQuery.trim().length > 0) {
            const q = searchQuery.toLowerCase();
            // Local product matches — only STRONG matches initially, but we allow slightly lower scores for explicitly globally-sourced products saved to catalogue.
            const storeProducts = DataSyncService.getProducts({ includeInactiveSellers: true });
            const allSearchProducts = [...storeProducts, ...SEED_PRODUCTS.filter(p => !storeProducts.some(sp => sp.id === p.id))];
            const scored = allSearchProducts
                .map(p => {
                    let score = scoreProduct(p, q);
                    // Boost global products added from search
                    if (p.seller_id === 'global-partners' || p.seller_name?.toLowerCase().includes('global')) {
                        score += 15;
                    }
                    return { product: p, score };
                })
                .filter(s => s.score > 40) // slightly lowered threshold to capture more inventory overlaps
                .sort((a, b) => b.score - a.score)
                .slice(0, 2); // Show only top 2 closely related local results
            setSuggestions(scored.map(s => s.product));

            // Generate smart, context-aware autocomplete suggestions (no API)
            const pool = new Set<string>();
            allSearchProducts.forEach(p => {
                if (p.name.toLowerCase().includes(q)) pool.add(p.name);
                // Smart combination (First two words)
                const words = p.name.split(' ');
                if (words.length > 1 && words[0].toLowerCase().includes(q)) {
                    pool.add(`${words[0]} ${words[1] || ''}`.trim());
                }
            });

            const sortedSuggestions = Array.from(pool)
                .sort((a, b) => {
                    const aStartsWith = a.toLowerCase().startsWith(q) ? -1 : 1;
                    const bStartsWith = b.toLowerCase().startsWith(q) ? -1 : 1;
                    if (aStartsWith !== bStartsWith) return aStartsWith - bStartsWith;
                    return a.length - b.length;
                })
                .slice(0, 5); // Increased from 3 to 5 for better autocomplete coverage
            
            // Add smart semantic permutations for the query
            const semanticSuggs: string[] = [];
            const trimQ = searchQuery.trim();
            if (trimQ.length >= 2) {
                const qLower = trimQ.toLowerCase();
                const isCarQuery = /\b(car|suv|sedan|truck|van|toyota|lexus|benz|bmw|honda|hyundai|kia|jetour|avatr|tesla|range rover|land cruiser|camry|corolla|rav4|highlander|prado|gwm|changan|geely|byd)\b/i.test(qLower);
                const isPhoneQuery = /\b(phone|iphone|samsung|galaxy|pixel|xiaomi|redmi|tecno|infinix|oppo|vivo|realme|oneplus|huawei)\b/i.test(qLower);
                const isComputeQuery = /\b(macbook|laptop|hp|dell|lenovo|asus|acer|pc|computer|desktop)\b/i.test(qLower);

                // Helper to add suggestions only if not already present
                const addUniqueSuffix = (base: string, suffix: string) => {
                    const cleanSuffix = suffix.trim();
                    const bLower = base.toLowerCase();
                    const sLower = cleanSuffix.toLowerCase();
                    
                    // Simple exclusion list for redundant terms in vehicle/electronic queries
                    const redundantTerms = ['tokunbo', 'used', 'new', 'refurbished', 'foreign'];
                    const hasRedundant = redundantTerms.some(term => bLower.includes(term) && sLower.includes(term));
                    
                    if (!bLower.includes(sLower) && !hasRedundant) {
                        semanticSuggs.push(`${base} ${cleanSuffix}`);
                    }
                };

                if (isCarQuery) {
                    addUniqueSuffix(trimQ, `2024 Model`);
                    addUniqueSuffix(trimQ, `Tokunbo (Foreign Used)`);
                    addUniqueSuffix(trimQ, `Nigerian Used`);
                    semanticSuggs.push(`Cheap ${trimQ}`);
                } else if (isPhoneQuery || isComputeQuery) {
                    addUniqueSuffix(trimQ, `Brand New`);
                    addUniqueSuffix(trimQ, `UK Used`);
                    addUniqueSuffix(trimQ, `Refurbished`);
                    semanticSuggs.push(`Cheap ${trimQ}`);
                } else {
                    addUniqueSuffix(trimQ, `Brand New`);
                    addUniqueSuffix(trimQ, `Used`);
                    addUniqueSuffix(trimQ, `Refurbished`);
                    semanticSuggs.push(`Best ${trimQ} Brands`);
                }
            }

            setTextSuggestions([...sortedSuggestions, ...semanticSuggs].slice(0, 5));
            // Instantly show fuzzy-matched cached results from past searches
            const scoredIds = new Set(scored.map(s => s.product.id));
            const cached = DataSyncService.searchCacheFuzzyMatch(searchQuery);
            setCachedResults(cached.filter(c => !scoredIds.has(c.id)));

            setShowSuggestions(true);
            setActiveIndex(-1);
        } else {
            setSuggestions([]);
            setGlobalResults([]);
            setIsGlobalSearching(false);
            setCachedResults([]);
            setTextSuggestions([]);
            setShowSuggestions(false);
        }
    }, [searchQuery]);

    // Debounced global search — fetches after user stops typing for 400ms
    useEffect(() => {
        const trimmed = searchQuery.trim();
        if (trimmed.length <= 2) {
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
        }, 250);

        return () => {
            clearTimeout(fetchTimer);
        };
    }, [searchQuery]);

    // Helper: Save results to search cache and navigate. Only promote the clicked product to catalog.
    const navigateWithResults = (clickedProductId: string) => {
        // Build product objects from global results with intelligent verification
        const globalAsProducts = globalResults.map((r: any) => {
            const slug = r.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
            const productId = `global-${slug}`;

            // ─── Real Gemini Description & Specs ───
            const catKey = (r.category || "").toLowerCase();
            const fallbackDescriptions: Record<string, string> = {
                electronics: "Experience next-generation technology with this premium device. Features include advanced processing and industry-leading reliability. Sourced via verified global distributors with FairPrice Escrow protection.",
                phones: "Stay connected with this cutting-edge smartphone. Boasting a stunning display and professional-grade camera system. Secured via our global sourcing network with full Escrow protection.",
                computing: "Boost your productivity with this high-performance machine. Powerful components to handle your most demanding tasks. Imported through our trusted global supply chain.",
                cars: "This vehicle represents exceptional engineering and value. Sourced through our verified global network with full import documentation and FairPrice Escrow protection.",
                default: "Discover exceptional quality and value with this premium product. Carefully selected from top-tier global suppliers. Fully secured by FairPrice Escrow."
            };
            
            let descFallback = fallbackDescriptions.default;
            if (catKey.includes("phone")) descFallback = fallbackDescriptions.phones;
            else if (catKey.includes("laptop") || catKey.includes("comput")) descFallback = fallbackDescriptions.computing;
            else if (catKey.includes("car") || catKey.includes("vehicle")) descFallback = fallbackDescriptions.cars;
            
            const description = (r.description && r.description.length > 30) ? r.description : descFallback;
            const realSpecs = (r.specs && typeof r.specs === 'object' && Object.keys(r.specs).length > 0) 
                ? { ...r.specs, "Condition": r.condition || "Brand New" }
                : { "Sourcing": "Global Network", "Warranty": "1 Year International", "Condition": r.condition || "Brand New" };

            let imageUrl = r.image_url || '';
            const lowerImg = imageUrl.toLowerCase();
            const isInvalid = !imageUrl || 
                              lowerImg.includes('no photo') || 
                              lowerImg.includes('no image') || 
                              lowerImg.includes('n/a') ||
                              lowerImg.includes('missing') ||
                              lowerImg.includes('placeholder') ||
                              lowerImg.includes('vertexaisearch.cloud.google.com') || 
                              lowerImg.includes('grounding-api-redirect');

            if (isInvalid) imageUrl = '/assets/images/placeholder.png';

            return {
                id: productId,
                name: r.name,
                price: r.approxPrice || 0,
                original_price: r.approxPrice ? Math.round(r.approxPrice * 1.15) : 0,
                category: r.category || 'electronics',
                description,
                image_url: imageUrl,
                images: [imageUrl],
                seller_id: 'global-partners',
                seller_name: 'Global Stores',
                price_flag: 'fair' as const,
                sold_count: Math.floor(Math.random() * 20) + 10,
                review_count: Math.floor(Math.random() * 5) + 5,
                avg_rating: +(3.5 + Math.random() * 1.5).toFixed(1),
                is_active: true,
                created_at: new Date().toISOString(),
                recommended_price: r.approxPrice,
                specs: realSpecs,
                condition: r.condition || 'good',
                source_url: r.sourceUrl || '',
            };
        })
        // ─── Vehicle Price Floor Logic (Zero Latency Sanity Check) ───
        .filter((p: any) => {
            const VEHICLE_FLOOR = 5_000_000;
            if (p.price >= VEHICLE_FLOOR) return true;
            
            const name = p.name.toLowerCase();
            const cat = (p.category || "").toLowerCase();
            
            // Allow parts/accessories/phones explicitly even if low priced
            const PART_KW = /\b(part|spare|filter|oil|brake|pad|tire|tyre|wheel|rim|bumper|headlight|mirror|sensor|plug|belt|gasket|radiator|cable|charger|adapter|case|phone|smartphone|tablet|earphone|headphone|watch|powerbank|speaker|laptop|scooter|bicycle|bike|motorcycle|accessory|accessories)\b/i;
            const WHOLE_VEH = /\b(sedan|suv|hatchback|coupe|pickup|truck|van|crossover|wagon|model\s*[s3xy]|song\s*plus|song\s*pro|han|tang|seal|dolphin|atto|seagull|camry|corolla|rav4|highlander|prado|land\s*cruiser|fortuner|hilux|civic|accord|cr-?v|tucson|santa\s*fe|elantra|sonata|creta|sportage|sorento|range\s*rover|defender|evoque|x[1-7]|a[1-8]|q[2-8]|mustang|explorer|bronco|f-?150|ranger|equinox|tahoe|silverado|uni-?[tkv]|jetour|dasheng|coolray|haval|jolion|changan|cs[0-9]+|tiggo|omoda|jaecoo|dm-?i|phev|bev|hybrid|xiaomi\s*su7|su7)\b/i;
            
            if (PART_KW.test(name)) return true;
            
            const isVehicleCat = cat.includes("car") || cat.includes("vehicle") || cat.includes("auto");
            const isWholeVeh = WHOLE_VEH.test(name);
            
            // Block if looks like a whole vehicle but price is suspiciously low
            if ((isVehicleCat || isWholeVeh) && p.price < VEHICLE_FLOOR) return false;
            return true;
        });

        // Save ALL results to search cache (for fast future retrieval)
        if (globalAsProducts.length > 0) {
            DataSyncService.addToSearchCache(searchQuery, globalAsProducts);
        }

        // Resolve __global_ prefix to actual product ID
        let resolvedClickedId = clickedProductId;
        if (clickedProductId.startsWith('__global_')) {
            const idx = parseInt(clickedProductId.replace('__global_', ''), 10);
            if (globalAsProducts[idx]) {
                resolvedClickedId = globalAsProducts[idx].id;
                // ONLY promote the clicked product from cache to catalog
                DataSyncService.promoteFromCache(resolvedClickedId) ||
                    DataSyncService.addRawProduct(globalAsProducts[idx] as any);
            }
        } else if (clickedProductId.startsWith('__cached_')) {
            const idx = parseInt(clickedProductId.replace('__cached_', ''), 10);
            if (cachedResults[idx]) {
                resolvedClickedId = cachedResults[idx].id;
                // Promote the cached result to catalog
                DataSyncService.promoteFromCache(resolvedClickedId);
            }
        }

        // Build combined results for session cache — global results FIRST so they appear
        // at the top of the SRP, then local/cached below them
        const combinedResults = [
            ...globalAsProducts.map(p => ({ ...p, _source: 'global' })),
            ...suggestions.map(p => ({ ...p, _source: 'local' })),
            ...cachedResults.map(p => ({ ...p, _source: 'cached' }))
        ];

        try {
            sessionStorage.setItem('fp_nav_search_results', JSON.stringify(combinedResults));
            sessionStorage.setItem('fp_nav_search_clicked', resolvedClickedId);
            sessionStorage.setItem('fp_nav_search_query', searchQuery);
        } catch (e) { /* quota exceeded */ }

        // Persist to recent searches
        saveRecentSearch(searchQuery);

        // ─── ELITE REVIEW GENERATION ───
        // Trigger review generation in background for the promoted global product
        if (resolvedClickedId.startsWith('global-')) {
            fetch('/api/gemini-reviews', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productId: resolvedClickedId })
            }).catch(() => {}); // Fire and forget
        }

        setShowSuggestions(false);
        router.push(`/search?q=${encodeURIComponent(searchQuery)}&from=nav`);
    };

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

    // Background Image Hydration for Global Results
    useEffect(() => {
        if (globalResults.length > 0) {
            const isValidImg = (url: string | undefined | null) =>
                url && url.trim().length > 4 &&
                !url.toLowerCase().includes('no photo') &&
                !url.toLowerCase().includes('no image') &&
                !url.toLowerCase().includes('n/a') &&
                !url.toLowerCase().includes('undefined') &&
                !url.includes('vertexaisearch.cloud.google.com') &&
                !url.includes('grounding-api-redirect');

            globalResults.forEach((product, index) => {
                const hasNoRealImage = !isValidImg(product.image_url) && !isValidImg(product.images?.[0]);
                if (hasNoRealImage && !product._imageHydrated) {
                    fetch(`/api/product-image?q=${encodeURIComponent(product.name)}`)
                        .then(res => res.json())
                        .then(data => {
                            if (data.imageUrl) {
                                setGlobalResults(prev => prev.map((p, i) => i === index ? { ...p, image_url: data.imageUrl, _imageHydrated: true } : p));
                            } else {
                                setGlobalResults(prev => prev.map((p, i) => i === index ? { ...p, _imageHydrated: true } : p));
                            }
                        })
                        .catch(() => {});
                }
            });
        }
    }, [globalResults]);

    const handleSearch = () => {
        if (searchQuery.trim()) {
            // Persist to recent searches on every search
            saveRecentSearch(searchQuery.trim());
            // Cache current results before navigating
            if (suggestions.length > 0 || globalResults.length > 0) {
                navigateWithResults('');
            } else {
                setShowSuggestions(false);
                const catMatch = CATEGORIES.find(c => c.label === selectedCategory);
                const catValue = catMatch ? catMatch.value : "All";
                router.push(`/search?q=${encodeURIComponent(searchQuery)}&category=${catValue}`);
            }
        }
    };

    const totalSuggestionItems = textSuggestions.length + suggestions.length;

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            if (activeIndex >= 0 && activeIndex < textSuggestions.length) {
                // Perform search for text suggestion
                setShowSuggestions(false);
                setSearchQuery(textSuggestions[activeIndex]);
                const catMatch = CATEGORIES.find(c => c.label === selectedCategory);
                const catValue = catMatch ? catMatch.value : "All";
                router.push(`/search?q=${encodeURIComponent(textSuggestions[activeIndex])}&category=${catValue}`);
            } else if (activeIndex >= textSuggestions.length && activeIndex < totalSuggestionItems) {
                // Navigate to product
                const product = suggestions[activeIndex - textSuggestions.length];
                setShowSuggestions(false);
                router.push(getProductUrl(product.id, product.name));
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
            <header className="fixed top-0 left-0 right-0 w-full flex-col backdrop-blur-2xl backdrop-saturate-150 shadow-sm" style={{ background: 'rgba(10, 104, 71, 0.78)', position: 'fixed', top: 0, zIndex: 9999, transform: 'translateZ(0)' }}>
                {/* Top Bar — Liquid Glass */}
                <div className="flex w-full items-center justify-between gap-1 md:gap-4 liquid-glass px-1 md:px-4 py-2.5 md:py-3 text-white relative z-10">
                    <div className="flex items-center gap-1 md:gap-4 shrink-0">
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
                    </div>

                    {/* Search Bar Container */}
                    <div className="flex flex-1 items-center w-full md:max-w-6xl mx-1 md:mx-4 relative" ref={searchRef}>
                        <div className="flex h-[44px] md:h-12 w-full rounded-2xl bg-white overflow-visible transition-all shadow-lg relative group border border-gray-200 focus-within:border-emerald-400 focus-within:shadow-[0_0_0_3px_rgba(16,185,129,0.2),0_0_16px_4px_rgba(16,185,129,0.08)]">
                            {/* Category Dropdown */}
                            <div className="relative h-full" ref={categoryRef}>
                                <button
                                    onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                                    className="hidden sm:flex h-full items-center gap-1 bg-gray-50 px-3 md:px-4 text-xs font-bold text-gray-700 hover:bg-gray-100 border-r border-gray-200 transition-colors rounded-l-2xl cursor-pointer whitespace-nowrap"
                                >
                                    {selectedCategory} <ChevronDown className="h-3 w-3 opacity-60" />
                                </button>

                                <AnimatePresence>
                                    {isCategoryOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: 5 }}
                                            className="absolute top-full left-0 mt-1 w-56 bg-white shadow-xl rounded-lg border border-gray-200 z-50 max-h-80 overflow-y-auto"
                                        >
                                            <div className="py-1.5">
                                                <button
                                                    onClick={() => {
                                                        setSelectedCategory("All");
                                                        setIsCategoryOpen(false);
                                                    }}
                                                    className={cn(
                                                        "w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-3",
                                                        selectedCategory === "All" ? "bg-emerald-50 text-emerald-700 font-bold border-l-3 border-emerald-500" : "hover:bg-gray-50 text-gray-800 font-medium"
                                                    )}
                                                >
                                                    <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0", selectedCategory === "All" ? "bg-emerald-100 text-emerald-600" : "bg-gray-100 text-gray-500")}>
                                                        <Package className="h-3.5 w-3.5" />
                                                    </div>
                                                    All Categories
                                                </button>
                                                {CATEGORIES.map((cat) => {
                                                    const iconMap: Record<string, React.ReactNode> = {
                                                        phones: <Phone className="h-3.5 w-3.5" />,
                                                        computers: <Monitor className="h-3.5 w-3.5" />,
                                                        electronics: <Zap className="h-3.5 w-3.5" />,
                                                        fashion: <Shirt className="h-3.5 w-3.5" />,
                                                        beauty: <Paintbrush className="h-3.5 w-3.5" />,
                                                        home: <Home className="h-3.5 w-3.5" />,
                                                        fitness: <Dumbbell className="h-3.5 w-3.5" />,
                                                        office: <BookOpen className="h-3.5 w-3.5" />,
                                                        furniture: <Sofa className="h-3.5 w-3.5" />,
                                                        grocery: <ShoppingBag className="h-3.5 w-3.5" />,
                                                        baby: <Baby className="h-3.5 w-3.5" />,
                                                        sports: <Dumbbell className="h-3.5 w-3.5" />,
                                                        cars: <Car className="h-3.5 w-3.5" />,
                                                        energy: <Zap className="h-3.5 w-3.5" />,
                                                        gaming: <Gamepad className="h-3.5 w-3.5" />,
                                                    };
                                                    const isSelected = selectedCategory === cat.label;
                                                    return (
                                                        <button
                                                            key={cat.value}
                                                            onClick={() => {
                                                                setSelectedCategory(cat.label);
                                                                setIsCategoryOpen(false);
                                                            }}
                                                            className={cn(
                                                                "w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-3 group/cat",
                                                                isSelected ? "bg-emerald-50 text-emerald-700 font-bold border-l-3 border-emerald-500" : "hover:bg-gray-50 text-gray-800 font-medium"
                                                            )}
                                                        >
                                                            <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors", isSelected ? "bg-emerald-100 text-emerald-600" : "bg-gray-100 text-gray-500 group-hover/cat:bg-gray-200")}>
                                                                {iconMap[cat.value] || <Package className="h-3.5 w-3.5" />}
                                                            </div>
                                                            {cat.label}
                                                            {isSelected && <ChevronDown className="h-3 w-3 ml-auto -rotate-90 text-emerald-500" />}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            <Input
                                type="text"
                                name="globalSearch"
                                autoComplete="off"
                                suppressHydrationWarning
                                className="flex-1 border-0 bg-transparent px-2 md:px-5 text-[13px] md:text-sm focus-visible:ring-0 placeholder:text-gray-400 rounded-none h-full text-gray-900 font-medium"
                                placeholder="Neck massager"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onFocus={() => setShowSuggestions(true)}
                                onKeyDown={handleKeyDown}
                            />

                            <Button
                                onClick={handleSearch}
                                className="h-full rounded-r-2xl rounded-l-none px-3 md:px-6 bg-brand-green-600 hover:bg-brand-green-700 text-white border-none transition-all duration-300 cursor-pointer relative"
                            >
                                <Search className="h-4 w-4 md:h-5 md:w-5" />
                                <Sparkles className="hidden md:block h-2.5 w-2.5 absolute top-2 right-2 text-white animate-pulse" />
                            </Button>
                        </div>


                        {/* Predictive Search Dropdown */}
                        <AnimatePresence>
                            {showSuggestions && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.1 }}
                                    className="fixed md:absolute top-[64px] md:top-full left-2 right-2 md:left-0 md:right-0 mt-2 md:mt-3 bg-white/95 backdrop-blur-[32px] rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.15)] border border-gray-100/50 overflow-hidden z-[9999] max-h-[70vh] md:max-h-[480px] overflow-y-auto"
                                >
                                    {/* Empty State: Recent & Trending (Temu-style) */}
                                    {searchQuery.trim().length === 0 && (
                                        <div className="p-5">
                                            {(() => {
                                                const recentSearches = getRecentSearches();
                                                return recentSearches.length > 0 ? (
                                                    <div className="mb-5">
                                                        <h3 className="text-[11px] font-black uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5"><History className="h-3.5 w-3.5" /> Recent Searches</h3>
                                                        <div className="flex flex-wrap gap-2">
                                                            {recentSearches.map(term => (
                                                                <button key={term} onMouseDown={(e) => { e.preventDefault(); setSearchQuery(term); document.querySelector('input')?.focus(); }} className="px-3 py-1.5 bg-gray-100/80 hover:bg-gray-200/80 text-xs font-semibold text-gray-700 rounded-lg transition-colors flex items-center gap-1.5">
                                                                    <History className="h-3 w-3 text-gray-400" />
                                                                    {term}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ) : null;
                                            })()}
                                            <div>
                                                <h3 className="text-[11px] font-black uppercase tracking-wider text-red-500 mb-3 flex items-center gap-1.5"><Heart className="h-3.5 w-3.5" /> Popular Right Now</h3>
                                                <div className="flex flex-wrap gap-2">
                                                    {['Starlink Kit', 'MacBook Air M3', 'Inverter Battery', 'AirPods Pro'].map(term => (
                                                        <button key={term} onMouseDown={(e) => { e.preventDefault(); setSearchQuery(term); document.querySelector('input')?.focus(); }} className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-xs font-bold text-red-700 rounded-lg transition-colors flex items-center gap-1.5">
                                                            <Zap className="h-3 w-3" />
                                                            {term}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* AI Searching Animation */}
                                    {searchQuery.trim().length > 0 && isGlobalSearching && (
                                        <div className="p-4 border-b border-gray-100/50 bg-gradient-to-r from-emerald-50/50 to-emerald-100/30">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center animate-pulse">
                                                    <Sparkles className="h-4 w-4 text-emerald-600 animate-spin-slow" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-emerald-800">Searching for exactly what you need...</span>
                                                    <span className="text-[11px] font-medium text-emerald-600/80">Comparing best prices. Results appearing shortly.</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Text Suggestions (Autocomplete) */}
                                    {searchQuery.trim().length >= 2 && textSuggestions.length > 0 && (
                                        <div className="border-b border-gray-100/50 py-2">
                                            {textSuggestions.map((suggestion, idx) => (
                                                <button
                                                    key={`sug-${idx}`}
                                                    onMouseDown={(e) => {
                                                        e.preventDefault();
                                                        setSearchQuery(suggestion);
                                                        document.querySelector('input')?.focus();
                                                    }}
                                                    className="w-full text-left px-4 py-2 hover:bg-emerald-50 active:bg-emerald-100 active:scale-[0.99] cursor-pointer text-[13px] md:text-sm text-gray-700 transition-all flex items-center justify-between group"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <Search className="h-3.5 w-3.5 text-emerald-600 group-hover:scale-110 transition-transform" />
                                                        <span dangerouslySetInnerHTML={{
                                                            __html: suggestion.replace(new RegExp(searchQuery.trim(), 'gi'), match => `<strong class="text-gray-900">${match}</strong>`)
                                                        }} />
                                                    </div>
                                                    <ChevronRight className="h-3.5 w-3.5 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {/* Product Suggestions */}
                                    {suggestions.map((product, i) => {
                                        const idx = textSuggestions.length + i;
                                        return (
                                            <button
                                                key={product.id}
                                                onMouseDown={(e) => { e.preventDefault(); navigateWithResults(product.id); }}
                                                className={cn(
                                                    "w-full flex items-center gap-4 p-3 transition-all border-b border-gray-50 last:border-0 text-left cursor-pointer active:scale-[0.99] active:bg-gray-100",
                                                    activeIndex === idx ? "bg-blue-50" : "hover:bg-gray-50"
                                                )}
                                            >
                                                <div className="relative h-12 w-12 shrink-0 bg-gray-50 rounded-lg p-1 overflow-hidden">
                                                    <img
                                                        src={product.images?.[0] || product.image_url || '/assets/images/placeholder.png'}
                                                        alt={product.name}
                                                        className="w-full h-full object-contain"
                                                        onError={(e) => {
                                                            e.currentTarget.src = '/assets/images/placeholder.png';
                                                        }}
                                                    />
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
                                            </button>
                                        );
                                    })}

                                    {/* Cached Results from Past Searches (instant) */}
                                    {cachedResults.length > 0 && (
                                        <div className="border-t border-gray-100">
                                            <div className="px-4 py-2 flex items-center gap-2 text-xs font-black text-blue-700 uppercase tracking-wider">
                                                <History className="h-3.5 w-3.5 text-blue-500" />
                                                PREVIOUSLY FOUND
                                            </div>
                                            {cachedResults.slice(0, 4).map((result: any, i: number) => {
                                                const cachedIdx = textSuggestions.length + suggestions.length + i;
                                                return (
                                                    <button
                                                        key={`cached-${result.id || i}`}
                                                        onMouseDown={(e) => { e.preventDefault(); navigateWithResults(`__cached_${i}`); }}
                                                        className={cn(
                                                            "w-full flex items-center gap-3 px-4 py-2.5 transition-all border-b border-gray-50 last:border-0 cursor-pointer text-left active:scale-[0.99] active:bg-blue-100",
                                                            activeIndex === cachedIdx ? "bg-blue-50" : "hover:bg-blue-50/50"
                                                        )}
                                                    >
                                                        <div className="h-10 w-10 shrink-0 bg-white border border-gray-100 rounded overflow-hidden p-1 shadow-sm">
                                                            <img
                                                                src={result.image_url || result.images?.[0] || '/assets/images/placeholder.png'}
                                                                alt={result.name}
                                                                className="w-full h-full object-contain"
                                                                onError={(e) => { e.currentTarget.src = '/assets/images/placeholder.png'; }}
                                                            />
                                                        </div>
                                                        <div className="flex flex-col flex-1 min-w-0">
                                                            <span className="text-sm font-medium text-gray-900 line-clamp-1">{result.name}</span>
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                <span className="text-xs font-bold text-blue-600">₦{result.price?.toLocaleString()}</span>
                                                                <span className="text-[11px] text-blue-500/80">More Results</span>
                                                            </div>
                                                        </div>
                                                        <span className="text-[9px] font-black text-blue-700 bg-blue-50 px-2 py-1 rounded uppercase shrink-0 border border-blue-100">FAIR</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}                                    {/* Global Search Results (from Gemini API) */}
                                    {isGlobalSearching && (
                                        <div className="border-t border-emerald-50 px-4 py-3">
                                            <div className="flex items-center gap-2 text-xs text-emerald-600 font-semibold mb-2">
                                                <Globe className="h-3.5 w-3.5 animate-spin" />
                                                Finding the best prices for you...
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

                                    {/* GLOBAL FAIRPRICE RESULTS */}
                                    {globalResults.length > 0 && (
                                        <div className="border-t border-gray-100">
                                            <div className="px-4 py-2.5 flex items-center gap-2 text-xs font-black text-emerald-700 uppercase tracking-wider">
                                                <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                                                MORE FAIRPRICE RESULTS
                                            </div>
                                            {globalResults.slice(0, 4).map((result, i) => {
                                                const globalIdx = textSuggestions.length + suggestions.length + i;
                                                return (
                                                    <button
                                                        key={`global-${result.id || i}`}
                                                        onMouseDown={(e) => {
                                                            e.preventDefault();
                                                            // The navigateWithResults will create the global product and cache it
                                                            navigateWithResults(`__global_${i}`);
                                                        }}
                                                        className={cn(
                                                            "w-full flex items-center gap-3 px-4 py-2.5 transition-all border-b border-gray-50 last:border-0 cursor-pointer text-left active:scale-[0.99] active:bg-gray-100",
                                                            activeIndex === globalIdx ? "bg-emerald-50" : "hover:bg-gray-50"
                                                        )}
                                                    >
                                                        <div className="h-10 w-10 shrink-0 bg-white border border-gray-100 rounded overflow-hidden p-1 shadow-sm">
                                                            <img
                                                                src={(!result.image_url || result.image_url.toLowerCase().includes('no photo') || result.image_url.toLowerCase().includes('n/a')) ? '/assets/images/placeholder.png' : result.image_url}
                                                                alt={result.name}
                                                                className="w-full h-full object-contain"
                                                                onError={(e) => { e.currentTarget.src = '/assets/images/placeholder.png'; }}
                                                            />
                                                        </div>
                                                        <div className="flex flex-col flex-1 min-w-0">
                                                            <span className="text-sm font-medium text-gray-900 line-clamp-1">{result.name}</span>
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                <span className="text-xs font-bold text-emerald-600">₦{result.approxPrice?.toLocaleString()}</span>
                                                                <span className="text-[11px] text-emerald-600/80">Global Partner Store</span>
                                                            </div>
                                                        </div>
                                                        <span className="text-[9px] font-black text-emerald-700 bg-emerald-50 px-2 py-1 rounded uppercase shrink-0 border border-emerald-100">FAIR</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Calculate Fair Price CTA */}
                                    {searchQuery.trim().length > 1 && (
                                        <button
                                            onClick={() => {
                                                setPriceIntelQuery(searchQuery);
                                                setIsPriceIntelOpen(true);
                                                setShowSuggestions(false);
                                            }}
                                            className="w-full flex items-center gap-3 px-4 py-4 bg-gradient-to-r from-emerald-50 to-emerald-100/50 hover:from-emerald-100 hover:to-emerald-200/60 transition-all border-t border-emerald-100"
                                        >
                                            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white shrink-0 shadow-sm">
                                                <Globe className="h-5 w-5" />
                                            </div>
                                            <div className="flex flex-col flex-1 min-w-0 text-left">
                                                <span className="text-sm font-bold text-emerald-800 flex items-center gap-1.5">
                                                    <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                                                    Calculate Fair Price
                                                </span>
                                                <span className="text-[11px] text-emerald-600/80 line-clamp-1">
                                                    Deep Search for "{searchQuery}" and get the best deals
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
                        className="hidden md:flex relative flex-col text-xs leading-tight hover:bg-white/10 p-2 rounded cursor-pointer group justify-start"
                        onMouseEnter={() => {
                            if ((window as any).__accountMenuTimer) clearTimeout((window as any).__accountMenuTimer);
                            setIsAccountMenuOpen(true);
                        }}
                        onMouseLeave={() => {
                            (window as any).__accountMenuTimer = setTimeout(() => setIsAccountMenuOpen(false), 400);
                        }}
                        onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
                    >
                        {/* Desktop View */}
                        <div className="flex flex-col">
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
                                                <Button className="w-full bg-gradient-to-r from-brand-orange to-amber-500 text-black font-bold h-8 text-xs rounded-md shadow-sm mb-2">Sign in</Button>
                                            </Link>
                                            <p className="text-[11px] text-gray-500">
                                                New customer? <Link href="/login" className="text-blue-600 hover:underline" onClick={() => setIsAccountMenuOpen(false)}>Start here.</Link>
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="p-4 bg-gray-50 border-b border-gray-200 flex flex-col gap-3">
                                            <Link href="/account" onClick={() => setIsAccountMenuOpen(false)} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                                                <div className={cn(
                                                    "h-10 w-10 min-w-10 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-sm overflow-hidden relative",
                                                    user.isPremium ? "bg-gradient-to-br from-amber-400 to-amber-600 ring-2 ring-amber-400 ring-offset-1" : "bg-gradient-to-br from-brand-green-600 to-emerald-400"
                                                )}>
                                                    <div className="relative">
                                                        <div className="h-8 w-8 rounded-full bg-brand-green-100 flex items-center justify-center text-brand-green-700 font-bold overflow-hidden">
                                                            {mounted && user?.name ? user.name.charAt(0).toUpperCase() : <User className="h-4 w-4" />}
                                                        </div>
                                                        {mounted && user?.isPremium && (
                                                            <div className="absolute -top-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
                                                                <Crown className="h-3 w-3 text-amber-500" />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-gray-900 truncate flex items-center gap-1">
                                                        {mounted ? user?.name || 'Guest' : 'Loading...'}
                                                        {mounted && user?.isPremium && <Crown className="h-3 w-3 text-amber-500" />}
                                                    </p>
                                                    <p className="text-xs text-gray-500 truncate">{mounted ? user?.email || 'user@example.com' : '...'}</p>
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
                                        {mounted && (user?.role === 'admin' ? (
                                            <>
                                                <Link href="/admin/dashboard" className="block px-4 py-1.5 hover:bg-emerald-50 text-emerald-700 font-medium" onClick={() => setIsAccountMenuOpen(false)}>Admin Dashboard</Link>
                                                <Link href="/seller/dashboard" className="block px-4 py-1.5 hover:bg-red-50 text-red-600 font-medium" onClick={() => setIsAccountMenuOpen(false)}>Seller Dashboard</Link>
                                            </>
                                        ) : isSeller ? (
                                            <Link href="/seller/dashboard" className="block px-4 py-1.5 hover:bg-red-50 text-red-600 font-medium" onClick={() => setIsAccountMenuOpen(false)}>Seller Dashboard</Link>
                                        ) : (
                                            <Link href={user ? "/seller/onboarding" : "/login?from=/seller/onboarding"} className="block px-4 py-1.5 hover:bg-red-50 text-red-600 font-medium" onClick={() => setIsAccountMenuOpen(false)}>Become a Seller</Link>
                                        ))}
                                        <Link href="/account/recommendations" className="block px-4 py-1.5 hover:bg-gray-100 text-gray-700" onClick={() => setIsAccountMenuOpen(false)}>Recommendations</Link>
                                        <Link href="/account/history" className="block px-4 py-1.5 hover:bg-gray-100 text-gray-700" onClick={() => setIsAccountMenuOpen(false)}>Browsing History</Link>
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

                    {/* Messages */}
                    <button onClick={() => user ? openMessageBox() : router.push("/login?from=/account")} className="hidden md:flex flex-col items-center justify-center hover:bg-white/10 p-2 rounded relative transition-all cursor-pointer">
                        <div className="relative">
                            <MessageCircle className="h-6 w-6 text-white" />
                            {mounted && totalUnread > 0 && (
                                <span className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 rounded-full border-2 border-brand-green-600 text-[10px] font-black text-white px-1 leading-none">
                                    {totalUnread > 99 ? '99+' : totalUnread}
                                </span>
                            )}
                        </div>
                    </button>

                    {/* Icon Group: Wishlist & Notifications */}
                    <div className="flex items-center gap-1 md:gap-2">
                        {/* Wishlist */}
                        <Link href="/account/favorites" className="flex flex-col text-xs leading-tight hover:bg-white/10 p-1 md:p-2 rounded cursor-pointer justify-center items-center relative shrink-0">
                            <Heart className="h-5 w-5 md:h-6 md:w-6 text-white" />
                            <span className="absolute top-1 md:top-2 right-1.5 md:right-2 h-2 w-2 rounded-full bg-red-500 border border-white shadow-[0_0_6px_2px_rgba(239,68,68,0.5)] animate-pulse" />
                        </Link>

                        {/* Notifications Bell — Visible on all screen sizes */}
                        <div>
                            <NotificationBell />
                        </div>
                    </div>

                    {/* Cart */}
                    <Link href="/cart" className="hidden md:flex items-end gap-1 hover:bg-white/10 p-2 rounded relative transition-all">
                        <div className="relative">
                            <ShoppingCart className="h-8 w-8 text-white" />
                            {mounted && cartCount > 0 && (
                                <Badge
                                    key={`cart-badge-${bounceKey}`}
                                    className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center rounded-full bg-brand-orange text-black font-bold p-0 border-2 border-transparent animate-cart-bounce"
                                >
                                    {cartCount}
                                </Badge>
                            )}
                        </div>
                        <span className="text-sm font-bold text-white hidden sm:inline mb-1">Cart</span>
                    </Link>
                </div >

                {/* Bottom Bar - SubNavbar */}
                < div className="flex w-full items-center justify-between bg-white/15 backdrop-blur-md px-2 md:px-4 py-1 md:py-1.5 text-xs md:text-sm text-white overflow-hidden border-t border-white/10" >
                    {/* Left: Navigation Links */}
                    < div className="flex items-center gap-1 shrink-0 overflow-x-auto no-scrollbar max-w-[100%] sm:max-w-[100%]" >
                        <Link href="/search?sort=newest" className="flex items-center gap-1 whitespace-nowrap px-2 py-0.5 hover:bg-white/10 rounded transition-all text-white/90 text-[11px] md:text-[13px] font-medium">
                            <Sparkles className="w-3 h-3 md:w-3.5 md:h-3.5" /> Best-Selling
                        </Link>
                        <Link href="/search?rating=5" className="flex items-center gap-1 whitespace-nowrap px-2 py-0.5 hover:bg-white/10 rounded transition-all text-white/90 text-[11px] md:text-[13px] font-medium">
                            <TrendingUp className="w-3 h-3 md:w-3.5 md:h-3.5" /> 5-Star Rated
                        </Link>
                        <span className="flex items-center px-2 whitespace-nowrap text-[11px] md:text-[13px]">
                            Free Delivery
                        </span>
                        <span className="whitespace-nowrap text-[11px] md:text-[13px]">
                            ₦1,000 refund on late delivery
                        </span>
                    </div >
                    {/* Right: Trust Badges */}
                    < div className="hidden md:flex items-center gap-4 shrink-0 text-white/70 text-[12px] max-w-[35%] overflow-hidden whitespace-nowrap justify-end" >
                        <span className="flex items-center gap-1 shrink-0"><Lock className="w-3 h-3" /> Secure privacy</span>
                        <span className="flex items-center gap-1 shrink-0"><Shield className="w-3 h-3" /> Purchase protection</span>
                        <Link href="#" className="flex items-center gap-1 font-bold text-white hover:text-brand-orange transition-colors shrink-0">
                            FairPrice keeps you safe <ArrowRight className="w-3 h-3" />
                        </Link>
                    </div >
                </div >
            </header >

            {/* Location Filter Modal */}
            < LocationModal
                isOpen={isLocationModalOpen}
                onClose={() => setIsLocationModalOpen(false)
                }
                currentLocation={location}
                onSelectLocation={setLocation}
            />

            {/* Sidebar Overlay */}
            <AnimatePresence>
                {
                    isSidebarOpen && (
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
                                <div className="flex items-center justify-between bg-brand-green-600 px-6 py-3 text-white font-bold text-lg">
                                    {mounted && user ? (
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
                    )
                }
            </AnimatePresence >

            {/* PriceIntel Modal — triggered from search */}
            < PriceIntelModal
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
