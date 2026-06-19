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
    Package,
    Plug,
    AlertTriangle,
    Flame
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
import type { Product } from "@/lib/types";
// NOTE: SEED_PRODUCTS is NOT imported here. Navbar renders in the root layout, so a static
// import would force the 139KB seed blob into the shared bundle for every page AND get
// fuzzy-scored on every keystroke — the navsearch hang. Instant suggestions now come from
// the live synced catalog (DataSyncService), with global/server search filling the rest.
import { DataSyncService } from "@/lib/sync-store";
import { cn, getProductUrl, getProxiedImageUrl, generateCompliantId, isGroundingUrl } from "@/lib/utils";
import { useLocation } from "@/context/LocationContext";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { SmartImage } from "@/components/ui/SmartImage";
import { useMessages } from "@/context/MessageContext";
const NAV_SEARCH_CACHE = new Map<string, any[]>();
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
    grocery: <ShoppingBag className="h-6 w-6" />,
    appliances: <Plug className="h-6 w-6" />,
    health: <Shield className="h-6 w-6" />,
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
    const [apiError, setApiError] = useState<string | null>(null);
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [searchQuery, setSearchQuery] = useState("");
    const [suggestions, setSuggestions] = useState<Product[]>([]); // State for suggestions
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isPriceIntelOpen, setIsPriceIntelOpen] = useState(false);
    const [priceIntelQuery, setPriceIntelQuery] = useState("");
    const [globalResults, setGlobalResults] = useState<{ name: string; category: string; approxPrice: number; sourceUrl?: string; id?: string; image_url?: string }[]>([]);
    const [isGlobalSearching, setIsGlobalSearching] = useState(false);
    const [autocompleteSuggestions, setAutocompleteSuggestions] = useState<string[]>([]);
    const [matchingBrands, setMatchingBrands] = useState<string[]>([]);
    const [cachedResults, setCachedResults] = useState<any[]>([]);
    const [globalSearchCaching, setGlobalSearchCaching] = useState(true);
    const [imagePool, setImagePool] = useState<Record<string, string>>({});
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

    // Load global settings
    useEffect(() => {
        fetch('/api/admin/settings')
            .then(res => res.json())
            .then(data => {
                if (data && data.globalSearchCaching !== undefined) {
                    setGlobalSearchCaching(data.globalSearchCaching);
                }
            })
            .catch(() => {});
    }, []);

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
    const hydratedProductIds = useRef<Set<string>>(new Set());
    const lastNavSyncRef = useRef<number>(0);

    // Background sync: freshen local store from DB so newly added products (e.g. via WhatsApp) appear
    const triggerNavSync = () => {
        const now = Date.now();
        if (now - lastNavSyncRef.current < 60_000) return; // max once per minute
        lastNavSyncRef.current = now;
        fetch('/api/products?limit=200')
            .then(r => r.json())
            .then(data => {
                if (data.products && Array.isArray(data.products)) {
                    data.products.forEach((p: any) => {
                        try { DataSyncService.addRawProduct(p, false); } catch {}
                    });
                }
            })
            .catch(() => {});
    };
    const router = useRouter();

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    // Search scoring algorithm
    const scoreProduct = (product: Product, query: string): number => {
        const q = query.toLowerCase();
        const name = (product.name || "").toLowerCase();
        const cat = (product.category || "").toLowerCase();
        const seller = (product.seller_name || "").toLowerCase();
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
        if (searchQuery.trim().length === 0) {
            setSuggestions([]);
            setMatchingBrands([]);
            setGlobalResults([]);
            setIsGlobalSearching(false);
            setCachedResults([]);
            setTextSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        const timer = setTimeout(() => {
          try {
            const q = searchQuery.toLowerCase();
            // Search candidates come from the live synced catalog only (these are the same
            // products the DB seeds, so no static seed array is needed). Server search (below)
            // and the global search API cover anything not yet in the local store.
            const storeProducts = DataSyncService.getProducts({ includeInactiveSellers: true });
            const allSearchProducts = storeProducts.filter((p: any) => p && p.name);

            // 1. Local product matches (The "PRODUCTS" section)
            const words = q.split(/\s+/).filter(w => w.length > 1);
            const scored = allSearchProducts
                .map(p => {
                    let score = scoreProduct(p, q);
                    if (p.seller_id === 'global-partners' || p.seller_name?.toLowerCase().includes('global')) {
                        score += 15;
                    }
                    return { product: p, score };
                })
                // For multi-word queries require at least one word to appear as a distinct token in the product name,
                // preventing short words like "pro" from matching "professional" unrelated products.
                .filter(s => {
                    if (s.score <= 55) return false;
                    if (words.length < 2) return true;
                    const name = (s.product.name || "").toLowerCase();
                    return words.some(w => w.length <= 2 ? name.includes(w) : new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(name));
                })
                .sort((a, b) => b.score - a.score)
                .slice(0, 5);
            setSuggestions(scored.map(s => s.product));

            // 2. Text Suggestions (The "SUGGESTIONS" section)
            const textPool = new Set<string>();
            const brandsPool = new Set<string>();
            
            allSearchProducts.forEach(p => {
                const name = p.name;
                const brand = (p.specs?.Brand || "").toString();
                
                if (name.toLowerCase().includes(q)) {
                    textPool.add(name);
                }
                
                if (brand && brand.toLowerCase().includes(q) && brand.toLowerCase() !== q) {
                    brandsPool.add(brand);
                }
                
                if (brand && q.includes(brand.toLowerCase())) {
                    textPool.add(`${brand} ${p.category || ''}`.trim());
                }
            });

            if (textPool.size < 5) {
                allSearchProducts.forEach(p => {
                    const words = p.name.split(' ');
                    if (words.length > 2 && words[0].toLowerCase().includes(q)) {
                        textPool.add(`${words[0]} ${words[1]} ${words[2]}`.trim());
                    }
                });
            }

            const sortedText = Array.from(textPool)
                .sort((a, b) => {
                    const aStarts = a.toLowerCase().startsWith(q);
                    const bStarts = b.toLowerCase().startsWith(q);
                    if (aStarts && !bStarts) return -1;
                    if (!aStarts && bStarts) return 1;
                    return a.length - b.length;
                })
                .map(name => {
                    const p = allSearchProducts.find(prod => prod.name === name);
                    if (p && p.category) {
                        const catLabel = CATEGORIES.find(c => c.value === p.category)?.label || p.category;
                        return `${name} in ${catLabel}`;
                    }
                    return name;
                })
                .slice(0, 6);
            
            setTextSuggestions(sortedText);
            setMatchingBrands(Array.from(brandsPool).slice(0, 3));

            // 3. Cached Results
            const scoredIds = new Set(scored.map(s => s.product.id));
            const cached = DataSyncService.searchCacheFuzzyMatch(searchQuery);
            setCachedResults(cached.filter(c => !scoredIds.has(c.id)));

            setShowSuggestions(true);
            setActiveIndex(-1);
          } catch (err) {
            console.error('[NavSearch] instant search error:', err);
          }
        }, 200); // 200ms debounce for local search

        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Debounced global search — fetches after user stops typing for 350ms
    useEffect(() => {
        // Reset hydration tracking so every new search gets fresh image hydration
        hydratedProductIds.current.clear();
        const trimmed = searchQuery.trim();

        // ─── Persistent Client-Side Cache Check ───
        try {
            const sessionCache = sessionStorage.getItem(`nav_search_${trimmed}`);
            if (sessionCache) {
                const results = JSON.parse(sessionCache);
                setGlobalResults(results);
                setIsGlobalSearching(false);
                setApiError(null);
                return;
            }
        } catch { /* session storage blocked */ }

        if (trimmed.length <= 3) {
            setGlobalResults([]);
            setIsGlobalSearching(false);
            return;
        }

        setIsGlobalSearching(true);
        setApiError(null);
        const fetchTimer = setTimeout(() => {
            fetch('/api/gemini-price', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productName: trimmed, mode: 'search' })
            })
                .then(res => {
                    if (res.status === 429) {
                        setApiError("AI search is currently resting. Please try again later or use the popular searches below.");
                        return { suggestions: [] };
                    }
                    return res.json();
                })
                .then(data => {
                    if (data.suggestions && Array.isArray(data.suggestions)) {
                        const filtered = data.suggestions.filter((s: any) => !/\b(duty|levy|tariff|cif|customs|clearance fee|fertilizer|supplement|chemical)\b/i.test(s.name)).slice(0, 10);
                        setGlobalResults(filtered);
                        // Save to persistent session cache
                        try {
                            sessionStorage.setItem(`nav_search_${trimmed}`, JSON.stringify(filtered));
                        } catch { /* quota */ }
                    } else {
                        setGlobalResults([]);
                    }
                })
                .catch((err) => {
                    console.error("Gemini price fetch failed:", err);
                    setGlobalResults([]);
                })
                .finally(() => setIsGlobalSearching(false));
        }, 800);

        return () => {
            clearTimeout(fetchTimer);
        };
    }, [searchQuery]);

    // Helper: Save results to search cache and navigate.
    // - toDetail=false (default, used by Enter/Search button): navigate to SRP with hydrated results
    // - toDetail=true (used by result-button clicks): promote clicked product, navigate to its detail page
    const navigateWithResults = (clickedProductId: string, toDetail: boolean = false) => {
        // We no longer close UI immediately to prevent "flicker" before navigation.
        // The unmounting of the Navbar during page transition will handle cleanup.
        try {

        // 2. Synchronous mapping and hydration
        // Attempt to find a valid shared image from any result to use as a fallback for others in the same query
        const validSharedImage = globalResults.find((r: any) => 
            r && r.image_url && r.image_url.startsWith('http') && r.image_url.length < 2000 && !r.image_url.includes('placeholder') && !r.image_url.includes('logo.png')
        )?.image_url;

        // Build product objects from global results with intelligent verification
        const globalAsProducts = globalResults.filter((r: any) => r && r.name).map((r: any) => {
            const productId = generateCompliantId(r.name);

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

            let rawImageUrl = r.image_url;

            // Drop base64 images if they are huge to prevent QuotaExceeded crashes
            if (rawImageUrl && rawImageUrl.startsWith('data:image') && rawImageUrl.length > 5000) {
                 rawImageUrl = null;
            }

            // Prefer a previously hydrated image from the search cache (localStorage) over the React
            // state value — applyImageUpdate writes there synchronously, but setState is async, so
            // the state snapshot in this closure may still carry a placeholder even after hydration.
            const _isHydrated = (u: string | null | undefined) =>
                typeof u === 'string' && u.startsWith('http') && u.length < 2000 &&
                !u.includes('placeholder') && !u.includes('logo.png');
            if (!_isHydrated(rawImageUrl)) {
                const cached = DataSyncService.getAllCachedProducts().find((cp: any) => cp.id === productId);
                if (_isHydrated(cached?.image_url)) rawImageUrl = cached.image_url;
            }

            // Share valid image among similar products if still missing or placeholder
            if (!_isHydrated(rawImageUrl)) {
                 rawImageUrl = validSharedImage || rawImageUrl;
            }

            let imageUrl = getProxiedImageUrl(rawImageUrl);

            return {
                id: productId,
                name: r.name,
                price: r.approxPrice || 0,
                original_price: r.approxPrice ? Math.round(r.approxPrice * 1.15) : 0,
                category: (catKey.includes('car') || catKey.includes('vehicle') || catKey.includes('auto')) ? 'cars' : (r.category || 'electronics'),
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
        // ─── Vehicle & Premium Phone Price Floor Logic (Zero Latency Sanity Check) ───
        .filter((p: any) => {
            const name = p.name.toLowerCase();
            const cat = (p.category || "").toLowerCase();
            
            // 1. Determine floors based on product year/type
            const itemYearMatch = name.match(/\b(202[0-9]|20[0-1][0-9]|19[0-9]{2})\b/);
            const itemYear = itemYearMatch ? parseInt(itemYearMatch[0], 10) : null;
            
            // 2022+ cars should never be below 18M. 2015-2021 should never be below 8M. Older cars at 5M.
            const VEHICLE_FLOOR = (itemYear && itemYear >= 2022) ? 18_000_000 : (itemYear && itemYear >= 2015) ? 8_000_000 : 5_000_000;
            
            // iPhone 13+, Galaxy S22+
            const isPremiumPhone = /\b(iphone\s*(13|14|15|16)|galaxy\s*s(22|23|24|25|26))\b/i.test(name);
            const PHONE_FLOOR = (name.includes("pro max") || name.includes("ultra") || name.includes("fold")) ? 650_000 : 350_000;

            // Allow parts/accessories explicitly even if low priced
            const PART_KW = /\b(part|spare|filter|oil|brake|pad|tire|tyre|wheel|rim|bumper|headlight|taillight|mirror|sensor|plug|belt|gasket|radiator|alternator|starter|bearing|cable|fuse|relay|wiper|muffler|exhaust|caliper|rotor|hose|seal|cap|cover|mount|arm|link|joint|boot|liner|mat|key|fob|charger|adapter|case|phone\s*case|screen\s*protector|cable|toy|scale\s*model|diecast|miniature)\b/i;
            const WHOLE_VEH = /\b(sedan|suv|hatchback|coupe|convertible|pickup|truck|van|minivan|crossover|wagon|limo|limousine|roadster|model\s*[s3xy]|song\s*plus|song\s*pro|han|tang|seal|dolphin|atto|seagull|camry|corolla|rav4|highlander|prado|land\s*cruiser|fortuner|hilux|civic|accord|cr-?v|tucson|santa\s*fe|elantra|sonata|creta|venue|seltos|sportage|sorento|range\s*rover|defender|discovery|evoque|velar|mustang|explorer|escape|bronco|f-?150|ranger|malibu|equinox|trailblazer|tahoe|suburban|silverado|uni-?[tkv]|jetour|dasheng|coolray|emgrand|azkarra|okavango|haval|jolion|cannon|tank|gwm|changan|cs[0-9]+|tiggo|omoda|jaecoo|dm-?i|phev|bev|hybrid|xiaomi\s*su7|su7|lexus|rx\s*350|gx\s*460|lx\s*570|lx\s*600|benz|mercedes|bmw|audi|porsche)\b/i;
            
            if (PART_KW.test(name)) return true;
            
            const isVehicleCat = cat.includes("car") || cat.includes("vehicle") || cat.includes("auto");
            const isWholeVeh = WHOLE_VEH.test(name);
            
            // Block if looks like a whole vehicle but price is suspiciously low
            if ((isVehicleCat || isWholeVeh) && p.price < VEHICLE_FLOOR) {
                console.warn(`🛡️ Navbar: Blocked price hallucination for vehicle "${p.name}" at ${p.price}`);
                return false;
            }

            // Block if looks like a premium phone but price is suspiciously low
            if (isPremiumPhone && p.price < PHONE_FLOOR) {
                console.warn(`🛡️ Navbar: Blocked price hallucination for phone "${p.name}" at ${p.price}`);
                return false;
            }

            return true;
        });

        // Save ALL results to search cache (for fast future retrieval)
        if (globalAsProducts.length > 0) {
            DataSyncService.addToSearchCache(searchQuery, globalAsProducts);
        }

        // Build imagePool from local catalogue for cross-page image sharing
        try {
            const localImagesPool: Record<string, string> = {};
            const allLocalProducts = DataSyncService.getApprovedProducts();
            allLocalProducts.forEach((p: any) => {
                if (p.image_url && p.name) {
                    const key = (p.name || '').toLowerCase().trim();
                    if (!localImagesPool[key]) {
                        localImagesPool[key] = getProxiedImageUrl(p.image_url);
                    }
                }
            });
            // Merge with globalAsProducts images for better coverage
            globalAsProducts.forEach((p: any) => {
                if (p.image_url && p.name && !p.image_url.includes('placeholder')) {
                    const key = (p.name || '').toLowerCase().trim();
                    if (!localImagesPool[key]) {
                        localImagesPool[key] = p.image_url;
                    }
                }
            });
            setImagePool(localImagesPool);
            sessionStorage.setItem('fp_nav_image_pool', JSON.stringify(localImagesPool));
        } catch { /* quota or storage blocked */ }

        // Resolve __global_ prefix to actual product ID
        let resolvedClickedId = clickedProductId;
        if (clickedProductId.startsWith('__global_')) {
            const idx = parseInt(clickedProductId.replace('__global_', ''), 10);
            if (globalAsProducts[idx]) {
                resolvedClickedId = globalAsProducts[idx].id;
                // ONLY promote the clicked product from cache to catalog (respecting admin toggle)
                DataSyncService.promoteFromCache(resolvedClickedId, globalSearchCaching) ||
                    DataSyncService.addRawProduct(globalAsProducts[idx] as any, globalSearchCaching);
            }
        } else if (clickedProductId.startsWith('__cached_')) {
            const idx = parseInt(clickedProductId.replace('__cached_', ''), 10);
            if (cachedResults[idx]) {
                resolvedClickedId = cachedResults[idx].id;
                // Promote the cached result to catalog (respecting admin toggle)
                DataSyncService.promoteFromCache(resolvedClickedId, globalSearchCaching);
            }
        }

        // Build combined results for session cache — global results FIRST so they appear
        // at the top of the SRP. We DO NOT pass all fuzzy suggestions to prevent irrelevant
        // results from polluting the SRP. We only pass the explicitly clicked local/cached item.
        const combinedResults: any[] = [
            ...globalAsProducts.map(p => ({ ...p, _source: 'global' }))
        ];
        
        const clickedLocal = suggestions.find(s => s.id === resolvedClickedId);
        if (clickedLocal) combinedResults.push({ ...clickedLocal, _source: 'local', source_url: '' });
        
        const clickedCached = cachedResults.find(s => s.id === resolvedClickedId);
        if (clickedCached) combinedResults.push({ ...clickedCached, _source: 'cached', source_url: '' });

        try {
            sessionStorage.setItem('fp_nav_search_results', JSON.stringify(combinedResults));
            sessionStorage.setItem('fp_nav_search_clicked', resolvedClickedId);
            sessionStorage.setItem('fp_nav_search_query', searchQuery);
        } catch (e) { /* quota exceeded */ }

        // Persist to recent searches
        saveRecentSearch(searchQuery);

        // 3. Navigation
        if (toDetail) {
            // Find the clicked product (local / cached / global) and route to its detail page
            const clickedGlobal = globalAsProducts.find((p: any) => p.id === resolvedClickedId);
            const clickedProd = clickedLocal || clickedCached || clickedGlobal;

            // Canonicalize: persist the clicked global product to the DB so the
            // server-rendered PDP shows IDENTICAL data on every device (fixes the
            // cross-device "same URL, different price/image" bug). Fire-and-forget;
            // keepalive lets it complete through the navigation that follows.
            if (clickedProd && /^global[-_]/i.test(clickedProd.id)) {
                try {
                    fetch('/api/products/global', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ product: clickedProd }),
                        keepalive: true,
                    }).catch(() => {});
                } catch { /* never block navigation on persistence */ }
            }

            if (clickedProd) {
                setShowSuggestions(false);
                setIsCategoryOpen(false);
                setTimeout(() => {
                    router.push(getProductUrl(clickedProd.id, clickedProd.name, clickedProd.slug));
                }, 10);
            } else {
                setShowSuggestions(false);
                setIsCategoryOpen(false);
                // Fallback to SRP if we can't resolve a product
                setTimeout(() => {
                    router.push(`/search?q=${encodeURIComponent(searchQuery)}&from=nav`);
                }, 10);
            }
        } else {
            setShowSuggestions(false);
            setIsCategoryOpen(false);
            // Default (Enter / Search button): navigate to SRP
            setTimeout(() => {
                router.push(`/search?q=${encodeURIComponent(searchQuery)}&from=nav`);
            }, 10);
        }

        // NOTE: Review generation removed from NavSearch to conserve Gemini quota.
        // Reviews are now generated on-demand when user views the PDP reviews section.


        } catch (err) {
            console.error('[NavSearch] navigateWithResults error:', err);
            // Still navigate even if state-prep fails
            setTimeout(() => {
                router.push(`/search?q=${encodeURIComponent(searchQuery)}&from=nav`);
            }, 10);
        }
    };

    // Close suggestions when clicking outside (Apple-level smoothness)
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const path = event.composedPath();
            const isInsideSearch = searchRef.current && path.includes(searchRef.current);
            const isInsideCategory = categoryRef.current && path.includes(categoryRef.current);
            const isInsideAccount = containerRef.current && path.includes(containerRef.current);

            // Robust check: don't close if we're still focusing the input
            const isFocusingInput = document.activeElement?.getAttribute('name') === 'globalSearch';

            if (!isInsideSearch && !isFocusingInput) {
                setShowSuggestions(false);
            }
            if (!isInsideCategory) {
                setIsCategoryOpen(false);
            }
            if (!isInsideAccount) {
               setIsAccountMenuOpen(false);
            }
        };
        const containerRef = { current: document.querySelector('.account-menu-trigger') };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // ─── Elite Background Image Hydration (Production-Hardened) ───
    // Fetches real product images, then persists to ALL layers:
    // 1. React state (instant UI update)
    // 2. Per-query session cache (prevents stale cache hits)
    // 3. fp_nav_search_results session storage (SRP hydration)
    // 4. DataSyncService search cache (cross-session persistence)
    // 5. DataSyncService products + DB (permanent persistence)
    useEffect(() => {
        let cancelled = false;

        const isValidImg = (url: string | undefined | null) =>
            !!url &&
            url.trim().length > 4 &&
            !url.toLowerCase().includes('placeholder') &&
            !url.toLowerCase().includes('no photo') &&
            !url.toLowerCase().includes('no image') &&
            !url.toLowerCase().includes('sample') &&
            !url.toLowerCase().includes('n/a') &&
            !isGroundingUrl(url) &&
            !url.startsWith('data:');

        const queue: Array<{ product: any; kind: 'global' | 'local' | 'cached' }> = [
            ...globalResults.map(p => ({ product: p, kind: 'global' as const })),
            ...suggestions.map(p => ({ product: p, kind: 'local' as const })),
            ...cachedResults.map(p => ({ product: p, kind: 'cached' as const })),
        ].filter(({ product }) => {
            const key = product.id || product.name;
            if (hydratedProductIds.current.has(key)) return false;
            if (isValidImg(product.image_url)) {
                hydratedProductIds.current.add(key); // already good
                return false;
            }
            return true;
        });

        if (queue.length === 0) return;

        let active = 0;
        const MAX_CONCURRENT = 8;
        const currentQuery = searchQuery.trim();

        const applyImageUpdate = (product: any, imageUrl: string, imageUrls: string[]) => {
            if (cancelled) return;

            // Proxy raw CDN URLs so browsers can load them without CORS/mixed-content issues.
            // Raw URLs are kept for DB persistence; proxied URLs are used for all UI layers.
            const proxiedUrl = getProxiedImageUrl(imageUrl);
            const proxiedUrls = imageUrls.map(u => getProxiedImageUrl(u));

            // ─── Layer 1: React State (instant UI) ───
            const updateFn = (prev: any[]) =>
                prev.map(p =>
                    (p.id === product.id || p.name === product.name)
                        ? { ...p, image_url: proxiedUrl, images: proxiedUrls, _imageHydrated: true }
                        : p
                );
            if (product._kind === 'global') setGlobalResults(updateFn);
            else if (product._kind === 'local') setSuggestions(updateFn);
            else if (product._kind === 'cached') setCachedResults(updateFn);

            // ─── Layer 2: Per-query session cache (prevents stale cache hits) ───
            try {
                const cacheKey = `nav_search_${currentQuery}`;
                const cached = sessionStorage.getItem(cacheKey);
                if (cached) {
                    const parsed = JSON.parse(cached);
                    const updated = parsed.map((p: any) =>
                        (p.name === product.name)
                            ? { ...p, image_url: proxiedUrl, images: proxiedUrls }
                            : p
                    );
                    sessionStorage.setItem(cacheKey, JSON.stringify(updated));
                }
            } catch { /* quota */ }

            // ─── Layer 3: SRP session storage ───
            try {
                const raw = sessionStorage.getItem('fp_nav_search_results');
                if (raw) {
                    const parsed = JSON.parse(raw);
                    const updated = parsed.map((p: any) =>
                        (p.id === product.id || p.name === product.name)
                            ? { ...p, image_url: proxiedUrl, images: proxiedUrls }
                            : p
                    );
                    sessionStorage.setItem('fp_nav_search_results', JSON.stringify(updated));
                }
            } catch { /* quota */ }

            // ─── Layer 4: DataSyncService search cache (cross-session) ───
            const productId = product.id || generateCompliantId(product.name);
            try {
                DataSyncService.updateSearchCacheProduct(productId, {
                    image_url: proxiedUrl,
                    images: proxiedUrls,
                });
            } catch { /* non-critical */ }

            // ─── Layer 5: DataSyncService products + DB (permanent) ───
            // DB gets the raw URL so it stays portable if the proxy path ever changes.
            try {
                const existing = DataSyncService.getProducts().find((p: any) => p.id === productId);
                if (existing) {
                    DataSyncService.updateProduct(productId, {
                        image_url: proxiedUrl,
                        images: proxiedUrls,
                    } as any);
                }
                // Fire-and-forget: persist raw image URL to Postgres
                fetch('/api/products', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: productId,
                        image_url: imageUrl,   // raw URL for DB portability
                        images: imageUrls,
                        _imageOnly: true,
                    }),
                }).catch(() => {});
            } catch { /* non-critical */ }
        };

        const processNext = () => {
            while (active < MAX_CONCURRENT && queue.length > 0) {
                const { product, kind } = queue.shift()!;
                const key = product.id || product.name;
                hydratedProductIds.current.add(key);
                active++;

                const q = encodeURIComponent(product.name);
                const cat = encodeURIComponent(product.category || '');
                fetch(`/api/product-image?q=${q}&category=${cat}`)
                    .then(res => res.ok ? res.json() : null)
                    .then(data => {
                        if (!data || cancelled) return;
                        // Handle both { imageUrls: [...] } and { imageUrl: "..." }
                        const urls: string[] = data.imageUrls?.length
                            ? data.imageUrls
                            : data.imageUrl
                            ? [data.imageUrl]
                            : [];
                        if (urls.length > 0) {
                            applyImageUpdate({ ...product, _kind: kind }, urls[0], urls);
                        }
                    })
                    .catch(() => {})
                    .finally(() => { active--; if (!cancelled) processNext(); });
            }
        };

        processNext();

        return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [globalResults.length, suggestions.length, cachedResults.length]);

    const handleSearch = () => {
        if (searchQuery.trim()) {
            // Persist to recent searches on every search
            saveRecentSearch(searchQuery.trim());
            // Cache current results before navigating
            if (suggestions.length > 0 || globalResults.length > 0) {
                navigateWithResults('');
            } else {
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
                setSearchQuery(textSuggestions[activeIndex]);
                const catMatch = CATEGORIES.find(c => c.label === selectedCategory);
                const catValue = catMatch ? catMatch.value : "All";
                router.push(`/search?q=${encodeURIComponent(textSuggestions[activeIndex])}&category=${catValue}`);
            } else if (activeIndex >= textSuggestions.length && activeIndex < totalSuggestionItems) {
                // Navigate to product
                const product = suggestions[activeIndex - textSuggestions.length];
                router.push(getProductUrl(product.id, product.name, product.slug));
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
            <header className="fixed left-0 right-0 w-full flex-col backdrop-blur-2xl backdrop-saturate-150 shadow-sm" style={{ background: 'rgba(10, 104, 71, 0.78)', position: 'fixed', top: 'var(--pwa-banner-h, 0px)', zIndex: 100 }}>
                {/* Top Bar — Liquid Glass */}
                <div className="flex w-full items-center justify-between gap-1 md:gap-3 lg:gap-4 liquid-glass px-1 md:px-2 lg:px-4 py-2.5 md:py-3 text-white relative z-10">
                    <div className="flex items-center gap-1 md:gap-2 lg:gap-4 shrink-0 relative z-[10001]">
                        {/* Logo - Enhanced hit area for mobile */}
                        <div className="py-1 px-1 -ml-1">
                            <Link href="/">
                                <Logo variant="light" hideTextMobile />
                            </Link>
                        </div>

                        {/* Deliver To - Now Clickable */}
                        <button
                            onClick={() => setIsLocationModalOpen(true)}
                            className="hidden lg:flex flex-col text-left text-xs leading-tight hover:bg-white/10 p-2 rounded cursor-pointer transition-all"
                        >
                            <span className="text-white ml-3">Deliver to</span>
                            <div className="flex items-center font-bold text-white">
                                <MapPin className="mr-1 h-3.5 w-3.5 text-white/70" />
                                {location}
                            </div>
                        </button>
                    </div>

                    {/* Search Bar Container */}
                    <div className="flex flex-1 items-center w-full md:max-w-full lg:max-w-[85%] xl:max-w-7xl mx-1 md:mx-2 lg:mx-4 relative" ref={searchRef}>
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
                                                        appliances: <Plug className="h-3.5 w-3.5" />,
                                                        health: <Shield className="h-3.5 w-3.5" />,
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
                                placeholder="Search products here..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onFocus={() => { setShowSuggestions(true); triggerNavSync(); }}
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
                                    className="fixed md:absolute top-[70px] md:top-full left-2 right-2 md:left-0 md:right-0 mt-2 md:mt-3 bg-white/95 backdrop-blur-[32px] rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.15)] border border-gray-100/50 overflow-hidden z-[9999] max-h-[70vh] md:max-h-[480px] overflow-y-auto"
                                >
                                    {/* Empty State: Recent & Trending (Temu-style) */}
                                    {searchQuery.trim().length === 0 && (
                                        <div className="p-5">
                                            {(() => {
                                                const recentSearches = getRecentSearches();
                                                return (
                                                    <>
                                                        {recentSearches.length > 0 && (
                                                            <div className="mb-6">
                                                                <h3 className="text-[11px] font-black uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5">
                                                                    <History className="h-3.5 w-3.5" /> Recent Searches
                                                                </h3>
                                                                <div className="flex flex-wrap gap-2">
                                                                    {recentSearches.map(term => (
                                                                        <button
                                                                            key={term}
                                                                            onMouseDown={(e) => {
                                                                                e.preventDefault();
                                                                                e.stopPropagation();
                                                                                setSearchQuery(term);
                                                                                setShowSuggestions(true);
                                                                                if (term.trim().length > 2) setIsGlobalSearching(true);
                                                                                setTimeout(() => {
                                                                                    searchRef.current?.querySelector<HTMLInputElement>('input[name="globalSearch"]')?.focus();
                                                                                }, 10);
                                                                            }}
                                                                            className="px-3 py-1.5 bg-gray-100/80 hover:bg-gray-200/80 text-xs font-semibold text-gray-700 rounded-lg transition-colors flex items-center gap-1.5"
                                                                        >
                                                                            <History className="h-3 w-3 text-gray-400" />
                                                                            {term}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                        <div>
                                                            <h3 className="text-[11px] font-black uppercase tracking-wider text-red-500 mb-3 flex items-center gap-1.5">
                                                                <TrendingUp className="h-3.5 w-3.5" /> Trending Searches
                                                            </h3>
                                                            <div className="flex flex-wrap gap-2">
                                                                {['Starlink Kit', 'MacBook Air M3', 'Inverter Battery', 'AirPods Pro'].map(term => (
                                                                    <button
                                                                        key={term}
                                                                        onMouseDown={(e) => {
                                                                            e.preventDefault();
                                                                            e.stopPropagation();
                                                                            setSearchQuery(term);
                                                                            setShowSuggestions(true);
                                                                            if (term.trim().length > 2) setIsGlobalSearching(true);
                                                                            setTimeout(() => {
                                                                                searchRef.current?.querySelector<HTMLInputElement>('input[name="globalSearch"]')?.focus();
                                                                            }, 10);
                                                                        }}
                                                                        className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-xs font-bold text-red-700 rounded-lg transition-colors flex items-center gap-1.5"
                                                                    >
                                                                        <Zap className="h-3 w-3" />
                                                                        {term}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </>
                                                );
                                            })()}
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

                                    {/* Text Suggestions (The "SUGGESTIONS" section) */}
                                    {textSuggestions.length > 0 && (
                                        <div className="border-b border-gray-50 bg-gray-50/30">
                                            <div className="px-4 py-2 text-[11px] font-black text-gray-400 uppercase tracking-widest">
                                                Suggestions
                                            </div>
                                            {textSuggestions.map((suggestion, idx) => (
                                                <button
                                                    key={`sug-${idx}`}
                                                    onMouseDown={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        setSearchQuery(suggestion);
                                                        setShowSuggestions(true);
                                                        setTimeout(() => {
                                                            searchRef.current?.querySelector('input')?.focus();
                                                        }, 10);
                                                    }}
                                                    className="w-full text-left px-4 py-2.5 hover:bg-white active:bg-gray-100 cursor-pointer text-[13px] text-gray-700 transition-all flex items-center justify-between group"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <Search className="h-3.5 w-3.5 text-gray-400 group-hover:text-brand-green-600 transition-colors" />
                                                        <span dangerouslySetInnerHTML={{
                                                            __html: suggestion.replace(new RegExp(searchQuery.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), match => `<strong class="text-gray-900">${match}</strong>`)
                                                        }} />
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {/* Product Suggestions (The "PRODUCTS" section) */}
                                    {suggestions.length > 0 && (
                                        <div className="border-b border-gray-50">
                                            <div className="px-4 py-2 text-[11px] font-black text-gray-400 uppercase tracking-widest">
                                                Products
                                            </div>
                                            {suggestions.map((product, i) => {
                                                const idx = textSuggestions.length + i;
                                                return (
                                                    <button
                                                        key={product.id}
                                                        onMouseDown={(e) => { 
                                                            e.preventDefault(); 
                                                            e.stopPropagation();
                                                            navigateWithResults(product.id, false); 
                                                        }}
                                                        className={cn(
                                                            "w-full flex items-center gap-4 p-3 transition-all border-b border-gray-50/50 last:border-0 text-left cursor-pointer active:scale-[0.99] active:bg-gray-100",
                                                            activeIndex === idx ? "bg-emerald-50" : "hover:bg-gray-50"
                                                        )}
                                                    >
                                                        <div className="relative h-12 w-12 shrink-0 bg-white border border-gray-100 rounded-lg p-1 overflow-hidden">
                                                            <img
                                                                src={getProxiedImageUrl(product.images?.[0] || product.image_url)}
                                                                alt={product.name}
                                                                className="w-full h-full object-contain"
                                                                onError={(e) => {
                                                                    e.currentTarget.src = '/assets/images/placeholder.png';
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="flex flex-col flex-1 min-w-0">
                                                            <span className="text-sm font-bold text-gray-900 line-clamp-1">{product.name}</span>
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                <span className="text-xs font-black text-emerald-600">₦{product.price.toLocaleString()}</span>
                                                                <span className="text-[10px] text-gray-400">·</span>
                                                                <span className="text-[10px] text-gray-400">⭐ {product.avg_rating}</span>
                                                                <span className="text-[10px] text-gray-400">·</span>
                                                                <span className="text-[10px] text-gray-400">{product.seller_name}</span>
                                                            </div>
                                                        </div>
                                                        {product.price_flag === "fair" && (
                                                            <span className="text-[8px] font-black text-white bg-brand-green-600 px-1.5 py-0.5 rounded uppercase shrink-0">Fair</span>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Matching Brands (The "MATCHING BRANDS" section) */}
                                    {matchingBrands.length > 0 && (
                                        <div className="border-b border-gray-50">
                                            <div className="px-4 py-2 text-[11px] font-black text-gray-400 uppercase tracking-widest">
                                                Matching Brands
                                            </div>
                                            <div className="p-2 flex flex-wrap gap-2">
                                                {matchingBrands.map(brand => (
                                                    <button
                                                        key={brand}
                                                        onMouseDown={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            setSearchQuery(brand);
                                                            setShowSuggestions(true);
                                                        }}
                                                        className="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-xs font-bold text-gray-700 rounded-md transition-colors uppercase tracking-wider"
                                                    >
                                                        {brand}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Cached Results from Past Searches (instant) — capped at 2 to keep dropdown tight */}
                                    {cachedResults.length > 0 && (
                                        <div className="border-t border-gray-100">
                                            <div className="px-4 py-2 flex items-center gap-2 text-xs font-black text-blue-700 uppercase tracking-wider">
                                                <History className="h-3.5 w-3.5 text-blue-500" />
                                                PREVIOUSLY FOUND
                                            </div>
                                            {cachedResults.slice(0, 2).map((result: any, i: number) => {
                                                const cachedIdx = textSuggestions.length + suggestions.length + i;
                                                return (
                                                    <button
                                                        key={`cached-${result.id || i}`}
                                                        onMouseDown={(e) => { e.preventDefault(); navigateWithResults(`__cached_${i}`, false); }}
                                                        className={cn(
                                                            "w-full flex items-center gap-3 px-4 py-2.5 transition-all border-b border-gray-50 last:border-0 cursor-pointer text-left active:scale-[0.99] active:bg-blue-100",
                                                            activeIndex === cachedIdx ? "bg-blue-50" : "hover:bg-blue-100"
                                                        )}
                                                    >
                                                        <div className="h-10 w-10 shrink-0 bg-white border border-gray-100 rounded overflow-hidden shadow-sm">
                                                            <SmartImage
                                                                src={result.image_url || result.images?.[0] || null}
                                                                alt={result.name}
                                                                productName={result.name}
                                                                category={result.category}
                                                                imagePool={imagePool}
                                                                iconSize={18}
                                                                className="w-10 h-10"
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
                                    )}

                                    {/* Fallback Empty State / No Results State */}
                                    {searchQuery.trim().length > 0 && !isGlobalSearching && globalResults.length === 0 && suggestions.length === 0 && (
                                        <div className="p-8 text-center flex flex-col items-center justify-center">
                                            <div className="h-16 w-16 rounded-full bg-gray-50 flex items-center justify-center mb-4">
                                                <Search className="h-8 w-8 text-gray-300" />
                                            </div>
                                            <h3 className="text-sm font-bold text-gray-800 mb-1">No instant results found</h3>
                                            <p className="text-xs text-gray-500 mb-6 px-4">Try a different term or browse our trending categories.</p>
                                            
                                            <div className="w-full max-w-xs space-y-2">
                                                <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-600 text-left px-1 flex items-center gap-1">
                                                    <Flame className="h-3 w-3 text-orange-500 fill-orange-500" /> 
                                                    Trending in Nigeria
                                                </h4>
                                                <div className="flex flex-wrap gap-2">
                                                    {['Starlink Kit', 'Solar Inverter', 'Skin Care', 'Generator', 'iPhone 15 Pro', 'Power Bank', 'Sneakers', 'Laptops', 'PS5', 'Designer Bags'].map(term => (
                                                        <button 
                                                            key={term}
                                                            onMouseDown={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                setSearchQuery(term);
                                                                setShowSuggestions(true);
                                                                setTimeout(() => {
                                                                    searchRef.current?.querySelector('input')?.focus();
                                                                }, 10);
                                                            }}
                                                            className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-[11px] font-bold text-red-700 rounded-lg transition-colors border border-red-100 shadow-sm flex items-center gap-1"
                                                        >
                                                            <Flame className="h-2.5 w-2.5 text-orange-400 fill-orange-400" />
                                                            {term}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}                                    {/* Global search skeleton — only shown when no other results exist yet */}
                                    {isGlobalSearching && globalResults.length === 0 && suggestions.length === 0 && cachedResults.length === 0 && (
                                        <div className="border-t border-blue-50 px-4 py-3">
                                            <div className="flex items-center gap-2 text-xs text-green-600 font-semibold mb-2">
                                                <Globe className="h-3.5 w-3.5 animate-spin" />
                                                Finding the best prices for you...
                                            </div>
                                            {[1, 2, 3].map(i => (
                                                <div key={i} className="flex items-center gap-3 p-2.5 animate-pulse">
                                                    <div className="h-10 w-10 bg-blue-50 rounded-lg" />
                                                    <div className="flex-1 space-y-1.5">
                                                        <div className="h-3 bg-gray-100 rounded w-3/4" />
                                                        <div className="h-2.5 bg-blue-50 rounded w-1/3" />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    
                                    {/* API Error Message */}
                                    {apiError && (
                                        <div className="mx-4 my-2 p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2.5">
                                            <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                                            <div className="flex flex-col">
                                                <span className="text-[11px] font-bold text-red-700">Service Alert</span>
                                                <span className="text-[10px] text-red-600/90 leading-tight">{apiError}</span>
                                            </div>
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
                                                            e.stopPropagation();
                                                            // The navigateWithResults will create the global product and cache it
                                                            navigateWithResults(`__global_${i}`, false);
                                                        }}
                                                        className={cn(
                                                            "w-full flex items-center gap-3 px-4 py-2.5 transition-all border-b border-gray-50 last:border-0 cursor-pointer text-left active:scale-[0.99] active:bg-emerald-100",
                                                            activeIndex === globalIdx ? "bg-emerald-50" : "hover:bg-emerald-100/50"
                                                        )}
                                                    >
                                                        <div className="h-10 w-10 shrink-0 bg-white border border-gray-100 rounded overflow-hidden shadow-sm">
                                                            <SmartImage
                                                                src={result.image_url ? getProxiedImageUrl(result.image_url) : (imagePool[(result.name || '').toLowerCase().trim()] || null)}
                                                                alt={result.name}
                                                                productName={result.name}
                                                                category={result.category}
                                                                imagePool={imagePool}
                                                                iconSize={20}
                                                                className="w-10 h-10"
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

                                    {/* AI Price Checker CTA */}
                                    {searchQuery.trim().length > 1 && (
                                        <button
                                            onClick={() => {
                                                setPriceIntelQuery(searchQuery);
                                                setIsPriceIntelOpen(true);
                                                setShowSuggestions(false);
                                            }}
                                            className="w-full flex items-center gap-3 px-4 py-4 backdrop-blur-sm bg-white/60 hover:backdrop-blur-md hover:bg-emerald-50/80 transition-all border-t border-emerald-100/60 cursor-pointer glassy-gradient-border"
                                        >
                                            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white shrink-0 shadow-sm">
                                                <Globe className="h-5 w-5" />
                                            </div>
                                            <div className="flex flex-col flex-1 min-w-0 text-left">
                                                <span className="text-sm font-bold text-emerald-800 flex items-center gap-1.5">
                                                    AI Price Checker
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
                        onClick={(e) => {
                            // Only toggle if we're not clicking an item inside
                            if (e.target === e.currentTarget || (e.target as HTMLElement).closest('.account-menu-trigger-inner')) {
                                setIsAccountMenuOpen(!isAccountMenuOpen);
                            }
                        }}
                    >
                        {/* Desktop View */}
                        <div 
                            className="flex flex-col relative py-2 cursor-pointer account-menu-trigger-inner"
                            onMouseEnter={() => setIsAccountMenuOpen(true)}
                            onClick={(e) => {
                                e.stopPropagation();
                                if (user) router.push('/account');
                                else router.push('/login');
                            }}
                        >
                            <span className="text-white text-[11px] opacity-80 leading-none">Hello, {user ? user.name.split(" ")[0] : "Sign in"}</span>
                            <span className="font-bold text-white flex items-center gap-1 hover:underline">My Account & Lists <ChevronDown className={cn("h-3 w-3 transition-transform duration-300", isAccountMenuOpen && "rotate-180")} /></span>
                        </div>

                        {/* Dropdown Menu */}
                        <AnimatePresence>
                            {isAccountMenuOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                                    className="absolute top-full right-0 w-64 bg-white/95 backdrop-blur-xl border border-gray-200 shadow-2xl rounded-2xl overflow-hidden z-[100] origin-top-right text-sm"
                                    onMouseLeave={() => {
                                        // Wait a bit before closing to avoid accidental closes
                                        // But per user request, we primarily rely on click-outside
                                    }}
                                >
                                    {!user ? (
                                        <div className="p-4 bg-gray-50 border-b border-gray-200 text-center">
                                            <Button 
                                                className="w-full bg-gradient-to-r from-brand-orange to-amber-500 text-black font-bold h-8 text-xs rounded-md shadow-sm mb-2 cursor-pointer"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setIsAccountMenuOpen(false);
                                                    router.push("/login");
                                                }}
                                            >
                                                Sign in
                                            </Button>
                                            <p className="text-[11px] text-gray-500">
                                                New customer? <button 
                                                    className="text-blue-600 hover:underline cursor-pointer" 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setIsAccountMenuOpen(false);
                                                        router.push("/login");
                                                    }}
                                                >
                                                    Start here.
                                                </button>
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="p-4 bg-gray-50 border-b border-gray-200 flex flex-col gap-3">
                                            <button onClick={() => { setIsAccountMenuOpen(false); router.push("/account"); }} className="flex items-center text-left gap-3 hover:bg-gray-200 p-2 rounded-lg transition-colors cursor-pointer">
                                                <div className={cn(
                                                    "h-10 w-10 min-w-10 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-sm overflow-hidden relative",
                                                    user.isPremium ? "bg-gradient-to-br from-amber-400 to-amber-600 ring-2 ring-amber-400 ring-offset-1" : "bg-gradient-to-br from-brand-green-600 to-emerald-400"
                                                )}>
                                                    <div className="relative w-full h-full">
                                                        <div className="h-full w-full bg-brand-green-100 flex items-center justify-center text-brand-green-700 font-bold overflow-hidden">
                                                            {mounted && (user?.avatar_url || localStorage.getItem('fp_profile_pic')) ? (
                                                                <img src={user?.avatar_url || localStorage.getItem('fp_profile_pic')!} alt="" className="w-full h-full object-cover" />
                                                            ) : mounted && user?.name ? (
                                                                user.name.charAt(0).toUpperCase()
                                                            ) : (
                                                                <User className="h-4 w-4" />
                                                            )}
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
                                            </button>
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
                                        <button onClick={() => { setIsAccountMenuOpen(false); router.push("/account/favorites"); }} className="w-full flex items-center gap-2 px-4 py-3 hover:bg-red-50 text-gray-700 font-bold transition-all cursor-pointer active:scale-95 group">
                                            <Heart className="h-4 w-4 text-red-500 fill-red-500 group-hover:scale-110 transition-transform" />
                                            <span>My Favorites</span>
                                        </button>
                                        <button onClick={() => { setIsAccountMenuOpen(false); router.push("/account/negotiations"); }} className="w-full flex items-center gap-2 px-4 py-3 hover:bg-emerald-50 text-gray-700 font-bold transition-all cursor-pointer active:scale-95 group">
                                            <Handshake className="h-4 w-4 text-emerald-600 group-hover:scale-110 transition-transform" />
                                            <span>Negotiate a Price</span>
                                            <span className="ml-auto text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">New</span>
                                        </button>
                                    </div>

                                    <div className="border-t border-gray-100 my-1"></div>

                                    <div className="py-1">
                                        <div className="px-4 py-2 text-[11px] font-black text-gray-400 uppercase tracking-wider">Your Account</div>
                                        <button onClick={() => { setIsAccountMenuOpen(false); router.push("/account"); }} className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-gray-800 font-bold cursor-pointer transition-all active:bg-gray-100">My Account</button>
                                        <button onClick={() => { setIsAccountMenuOpen(false); router.push("/account/payments"); }} className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 text-gray-800 font-bold cursor-pointer transition-all active:bg-gray-100">
                                            My Balance
                                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[9px] h-4">Active</Badge>
                                        </button>
                                        <button onClick={() => { setIsAccountMenuOpen(false); router.push("/account/addresses"); }} className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-gray-800 font-bold cursor-pointer transition-all active:bg-gray-100">Delivery Address</button>
                                        <button onClick={() => { setIsAccountMenuOpen(false); router.push("/account/orders"); }} className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-gray-800 font-bold cursor-pointer transition-all active:bg-gray-100">My Orders</button>
                                        {mounted && (user?.role === 'admin' ? (
                                            <>
                                                <button onClick={(e) => { e.stopPropagation(); setIsAccountMenuOpen(false); router.push("/admin/products"); }} className="w-full text-left px-4 py-2 hover:bg-emerald-50 text-emerald-700 font-bold cursor-pointer transition-all border-l-4 border-transparent hover:border-emerald-500">Admin Dashboard</button>
                                                <button onClick={(e) => { e.stopPropagation(); setIsAccountMenuOpen(false); router.push("/seller/dashboard"); }} className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 font-bold cursor-pointer transition-all border-l-4 border-transparent hover:border-red-500">Seller Dashboard</button>
                                            </>
                                        ) : isSeller ? (
                                            <button onClick={() => { setIsAccountMenuOpen(false); router.push("/seller/dashboard"); }} className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 font-bold cursor-pointer transition-all border-l-4 border-transparent hover:border-red-500">Seller Dashboard</button>
                                        ) : (
                                            <button onClick={() => { setIsAccountMenuOpen(false); router.push(user ? "/seller/onboarding" : "/login?from=/seller/onboarding"); }} className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 font-bold cursor-pointer transition-all border-l-4 border-transparent hover:border-red-500">Become a Seller</button>
                                        ))}
                                        <button onClick={() => { setIsAccountMenuOpen(false); router.push("/account/recommendations"); }} className="w-full text-left px-4 py-2 hover:bg-gray-50 text-gray-800 font-bold cursor-pointer transition-all">Recommendations</button>
                                        <button onClick={() => { setIsAccountMenuOpen(false); router.push("/account/history"); }} className="w-full text-left px-4 py-2 hover:bg-gray-50 text-gray-800 font-bold cursor-pointer transition-all">Browsing History</button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Returns & Orders */}
                    <Link href="/account/orders" className="hidden lg:flex flex-col text-xs leading-tight hover:bg-white/10 p-2 rounded cursor-pointer transition-all">
                        <span className="font-medium text-white/80">My Orders</span>
                        <span className="font-bold text-white">& Returns</span>
                    </Link>

                    {/* Messages */}
                    <button onClick={() => user ? openMessageBox() : router.push("/login?from=/account")} className="hidden lg:flex flex-col items-center justify-center hover:bg-white/10 p-2 rounded relative transition-all cursor-pointer">
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
                        <span className="text-sm font-bold text-white hidden lg:inline mb-1">Cart</span>
                    </Link>
                </div >

                {/* Bottom Bar - SubNavbar */}
                < div className="flex w-full items-center justify-between bg-white/15 backdrop-blur-md px-2 md:px-4 py-1 md:py-1.5 text-xs md:text-sm text-white overflow-hidden border-t border-white/10" >
                    {/* Left: Navigation Links */}
                    < div className="flex items-center gap-1 shrink-0 overflow-x-auto no-scrollbar max-w-[100%] sm:max-w-[100%]" >
                        <Link href="/search?sort=best_selling" className="flex items-center gap-1 whitespace-nowrap px-2 py-0.5 hover:bg-white/10 rounded transition-all text-white/90 text-[11px] md:text-[13px] font-medium">
                            <Sparkles className="w-3 h-3 md:w-3.5 md:h-3.5" /> Best-Selling
                        </Link>
                        <Link href="/search?sort=top_rated" className="flex items-center gap-1 whitespace-nowrap px-2 py-0.5 hover:bg-white/10 rounded transition-all text-white/90 text-[11px] md:text-[13px] font-medium">
                            <TrendingUp className="w-3 h-3 md:w-3.5 md:h-3.5" /> 5-Star Rated
                        </Link>
                        <SlidingSubnavTexts />
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
                                         <Link href="/account" className="flex items-center gap-3" onClick={() => setIsSidebarOpen(false)}>
                                             <div className="h-10 w-10 rounded-full overflow-hidden border-2 border-white/50 bg-white/20 flex items-center justify-center">
                                                 {(user.avatar_url || localStorage.getItem('fp_profile_pic')) ? (
                                                     <img src={user.avatar_url || localStorage.getItem('fp_profile_pic')!} alt="" className="w-full h-full object-cover" />
                                                 ) : (
                                                     <User className="h-6 w-6 text-white" />
                                                 )}
                                             </div>
                                             <div className="flex flex-col leading-tight">
                                                 <span className="text-sm font-bold">Hello, {(user.name || "there").split(" ")[0]}</span>
                                                 <span className="text-[10px] text-emerald-100 font-medium">My Account & Settings</span>
                                             </div>
                                         </Link>
                                    ) : (
                                        <Link href="/login" className="flex items-center gap-2 hover:underline" onClick={() => setIsSidebarOpen(false)}>
                                             <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                                                 <User className="h-6 w-6" />
                                             </div>
                                             <span>Hello, Sign in</span>
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

const SlidingSubnavTexts = () => {
    const [index, setIndex] = useState(0);
    const router = useRouter();
    
    useEffect(() => {
        const timer = setInterval(() => {
            setIndex((prev) => (prev + 1) % 2);
        }, 4000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="relative h-5 md:h-6 w-40 md:w-56 overflow-hidden flex items-center shrink-0 ml-1">
            <AnimatePresence mode="wait">
                {index === 0 ? (
                    <motion.button
                        key="free-delivery"
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -20, opacity: 0 }}
                        transition={{ duration: 0.4 }}
                        className="absolute inset-0 flex items-center justify-start gap-1.5 whitespace-nowrap px-2 md:px-3 py-0.5 hover:bg-white/10 rounded transition-all text-emerald-50 font-bold tracking-wide text-[10px] md:text-[12px] bg-white/5 border border-white/10 shadow-sm cursor-pointer"
                        onClick={() => router.push('/search?delivery=free')}
                    >
                        <Package className="w-3 h-3 text-emerald-400 shrink-0" /> <span className="truncate">FREE DELIVERY EVERYWHERE</span>
                    </motion.button>
                ) : (
                    <motion.button
                        key="late-refund"
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -20, opacity: 0 }}
                        transition={{ duration: 0.4 }}
                        className="absolute inset-0 flex items-center justify-start gap-1.5 whitespace-nowrap px-2 md:px-3 py-0.5 hover:bg-white/10 rounded transition-all text-amber-50 font-bold tracking-wide text-[10px] md:text-[12px] bg-white/5 border border-white/10 shadow-sm cursor-pointer"
                        onClick={() => router.push('/buyer-protection')}
                    >
                        <Shield className="w-3 h-3 text-amber-400 shrink-0" /> <span className="truncate">₦1,000 LATE DELIVERY REFUND</span>
                    </motion.button>
                )}
            </AnimatePresence>
        </div>
    );
};
