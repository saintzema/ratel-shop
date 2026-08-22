"use client";

import { useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo, Suspense } from "react";
import Link from "next/link";
import { DataSyncService } from "@/lib/sync-store";
import { useHeaderOffset } from "@/lib/use-header-offset";

/** Below this many showable products we refuse to trust the cache and hit the DB. */
const MIN_HOMEPAGE_PRODUCTS = 12;
import { ProductCard } from "@/components/product/ProductCard";
import { CompactPriceDropCard } from "@/components/product/CompactPriceDropCard";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ChevronRight, ChevronLeft, Flame, ShieldCheck, Smartphone, Gamepad2, Monitor, Plug, Car, Shirt, Sparkles, Home as HomeIcon, Dumbbell, ShoppingBasket, Store as StoreIcon, TrendingUp, Tag } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { PriceIntelModal } from "@/components/modals/PriceIntelModal";
import { RecommendedProducts } from "@/components/ui/RecommendedProducts";
import { StoreDiscoveryRail } from "@/components/ui/StoreDiscoveryRail";
import { useRouter } from "next/navigation";
import { RecentlyViewedHorizontal } from "@/components/ui/RecentlyViewedHorizontal";
import { ProductCardSkeleton } from "@/components/ui/skeleton";
import { getProxiedImageUrl, cn } from "@/lib/utils";
import { Product } from "@/lib/types";
import { useSearchParams } from "next/navigation";
import { CategoryPanel } from "@/components/ui/CategoryPanel";
import {
  CATEGORY_CARDS_ROW_1,
  CategoryCard,
  DEFAULT_AD_SLOTS
} from "@/lib/constants";
import {
  Zema360HeroBanner,
  FlashDealsBanner,
  NewArrivalsBanner,
  TopBrandsBanner,
  ZivaAIBanner,
} from "@/components/HeroBanners";

const AD_SLOT_COMPONENTS: Record<string, React.ComponentType> = {
  "flash-deals":  FlashDealsBanner,
  "new-arrivals": NewArrivalsBanner,
  "top-brands":   TopBrandsBanner,
  "ziva-ai":      ZivaAIBanner,
};

// ZEMA360 promo is always prepended to the banner list (code-defined, not admin-configurable)
const ZEMA360_BANNER = {
  id: "__zema360",
  title: "ZEMA360 — Autonomous Commerce OS",
  type: "component",
  componentId: "zema360",
  image_url: "",
  active: true,
};




// ─── Component ──────────────────────────────────────────────

function HomeContent() {
  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
  const productSectionRef = useRef<HTMLDivElement>(null);

  // Live products from DataSyncService — load only on client to avoid SSR hydration mismatch
  // Measured header height in px. Used instead of the --fp-header-h custom
  // property for the sticky pills bar and hero padding: on production that
  // property failed to re-resolve for those elements, leaving them on the
  // hardcoded fallback (see use-header-offset.ts).
  const headerOffset = useHeaderOffset();
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  // True while the first real catalogue fetch is in flight, so the page shows
  // skeletons instead of empty shelves.
  const [productsLoading, setProductsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isSeller, setIsSeller] = useState(false);
  const [categoryGrids, setCategoryGrids] = useState(CATEGORY_CARDS_ROW_1);
  const [banners, setBanners] = useState<any[]>([]);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [heroSliderPaused, setHeroSliderPaused] = useState(false);
  const [heroConfig, setHeroConfig] = useState<any>(null);
  // Geo-aware trending label — detected from Vercel's IP header, session-cached
  const [userGeo, setUserGeo] = useState<{ name: string; flag: string } | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();

  // Tab State for swipeable categories
  const [activeTab, setActiveTab] = useState("All");
  // Category pills used to be a hardcoded, disconnected list (TEMU_CATEGORIES)
  // with labels like "EVs"/"Streaming Kits"/"Toy"/"Pets" that never had any
  // real inventory, matched against products via a fragile hardcoded keyword
  // table — so most pills either silently matched the wrong thing or matched
  // nothing at all, and a brand-new real category never appeared here no
  // matter how many products used it. Pulling the live taxonomy directly
  // means new seller categories show up automatically, with zero further
  // code changes, and every pill is guaranteed to have real products behind it.
  const [liveCategoryNames, setLiveCategoryNames] = useState<string[]>([]);
  const pills = useMemo(
    () => ["All", "Trending", "Price Drop", "Best-Selling", ...liveCategoryNames],
    [liveCategoryNames]
  );

  const handleTabChange = (cat: string) => {
    setActiveTab(cat);
    const pill = document.getElementById(`pill-${cat}`);
    const container = document.getElementById('pills-container');
    if (pill && container) {
        container.scrollTo({
            left: pill.offsetLeft - container.offsetWidth / 2 + pill.offsetWidth / 2,
            behavior: 'smooth'
        });
    }
  };

  const handleDragEnd = (_: any, info: { offset: { x: number } }) => {
    const swipeThreshold = 50;
    const currentIndex = pills.indexOf(activeTab);

    if (info.offset.x < -swipeThreshold && currentIndex < pills.length - 1) {
        handleTabChange(pills[currentIndex + 1]);
    } else if (info.offset.x > swipeThreshold && currentIndex > 0) {
        handleTabChange(pills[currentIndex - 1]);
    }
  };

  // ─── Referral Tracking System ───
  useEffect(() => {
    const ref = searchParams?.get("ref");
    if (ref) {
      localStorage.setItem("fp_referral", ref);
    }
  }, [searchParams]);

  // useLayoutEffect, not useEffect: this component remounts every time client-side
  // navigation brings the user back to "/" (visiting another page and returning).
  // The cache read inside refresh() is synchronous, but useEffect fires AFTER the
  // browser paints — so on every return trip the empty initial state painted
  // first, showing empty product rails / the skeleton for one visible frame
  // before refresh() filled them in. useLayoutEffect commits before paint, so a
  // warm cache never flashes empty. (No SSR hydration risk: this is a "use client"
  // page and the effect still runs after the same hydration commit either way —
  // only the timing of the *next* paint changes.)
  useLayoutEffect(() => {
    const refresh = () => {
      // Same "never clobber with empty" rule as the seller product list: refresh()
      // fires on every sync-store-update, and a mid-write or evicted cache returns
      // [] — which blanked the shelves and left only the category boxes showing.
      // Keep the last good catalogue until a non-empty read replaces it.
      const showable = DataSyncService.getApprovedProducts().filter(p => p.is_active);
      setAllProducts(prev => (showable.length === 0 && prev.length > 0 ? prev : showable));
      
      let hasSellerRole = false;
      try {
        const userStr = localStorage.getItem("fp_user");
        if (userStr) {
          const userObj = JSON.parse(userStr);
          hasSellerRole = userObj?.role === "seller";
        }
      } catch (e) {}

      setIsSeller(!!DataSyncService.getCurrentSellerId() || hasSellerRole);
      
      // Load Banners — ZEMA360 promo always leads, admin banners follow
      try {
        const savedBanners = localStorage.getItem("ratel_homepage_banners");
        const imageBanners = savedBanners
          ? JSON.parse(savedBanners).filter((b: any) => b.active)
          : [
              { id: "b1", title: "Mega Sale — Up to 70% Off", image_url: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=2000", link: "/category/deals", active: true },
              { id: "b2", title: "New Arrivals This Week",    image_url: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=2000", link: "/category/new",   active: true },
            ];
        setBanners([ZEMA360_BANNER, ...imageBanners]);
      } catch(e) {
        setBanners([ZEMA360_BANNER]);
      }
    };
    const loadGrids = () => {
      try {
        const saved = localStorage.getItem("ratel_homepage_grids");
        if (saved) setCategoryGrids(JSON.parse(saved));
      } catch (e) { }
    };
    const loadHeroConfig = async () => {
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const data = await res.json();
          if (data.heroConfig) setHeroConfig(data.heroConfig);
        }
      } catch (e) {
        console.error("Failed to load hero config", e);
      }
    };
    const loadLiveCategories = async () => {
      try {
        const res = await fetch("/api/admin/taxonomy");
        if (res.ok) {
          const data = await res.json();
          const names = (data.categories || [])
            .filter((c: any) => (c.product_count || 0) > 0)
            .sort((a: any, b: any) => (b.product_count || 0) - (a.product_count || 0))
            .map((c: any) => c.name);
          setLiveCategoryNames(names);
        }
      } catch (e) {
        console.error("Failed to load live categories", e);
      }
    };

    refresh(); // Initial load on client (reads localStorage)
    loadGrids();
    loadHeroConfig();
    loadLiveCategories();
    setMounted(true);

    // Pull from the DB whenever the cache can't actually fill the homepage.
    //
    // This used to test `getProducts().length === 0`, but the page renders
    // getApprovedProducts().filter(is_active) — a strictly smaller set. A cache
    // holding only stale, unapproved or deactivated rows is non-empty, so no
    // fetch fired, yet nothing was displayable: an empty homepage that never
    // corrected itself until the idle autoSync happened to run minutes later.
    // Condition on what we can actually show, not on what happens to be stored.
    const displayable = DataSyncService.getApprovedProducts().filter(p => p.is_active).length;
    if (displayable < MIN_HOMEPAGE_PRODUCTS) {
      setProductsLoading(true);
      fetch("/api/products?limit=200")
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data?.products?.length) {
            DataSyncService.addRawProducts(data.products, false);
            // addRawProducts dispatches sync-store-update → refresh() fires automatically
          }
        })
        .catch(() => {})
        .finally(() => setProductsLoading(false));
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "ratel_homepage_banners" || e.key === "ratel_homepage_grids") {
        refresh();
        loadGrids();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("sync-store-update", refresh);
    window.addEventListener("hero-config-update", loadHeroConfig);
    
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("sync-store-update", refresh);
      window.removeEventListener("hero-config-update", loadHeroConfig);
    };
  }, [searchParams]); // Only searchParams affects the content (referrals)

  // Slideshow timer — pauses on hero hover/tap, resumes on leave/re-tap
  useEffect(() => {
    if (banners.length <= 1 || heroSliderPaused) return;
    const timer = setInterval(() => {
      setCurrentBannerIndex(prev => (prev + 1) % banners.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [banners, heroSliderPaused]);

  // Geo detection — runs once per session, result cached in sessionStorage
  useEffect(() => {
    try {
      const cached = sessionStorage.getItem("fp_geo");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.name && parsed?.flag) { setUserGeo(parsed); return; }
      }
    } catch { /* sessionStorage blocked */ }

    fetch("/api/geo")
      .then(r => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.countryName && data?.flag) {
          const geo = { name: data.countryName, flag: data.flag };
          setUserGeo(geo);
          try { sessionStorage.setItem("fp_geo", JSON.stringify(geo)); } catch { /* quota */ }
        }
      })
      .catch(() => { /* fail silently — default label is fine */ });
  }, []);

  // ─── Unified Product Memoization Engine ───
  const filteredByCategory = useMemo(() => {
    if (!allProducts || !Array.isArray(allProducts)) return [];
    if (activeTab === "All") return allProducts;
    return allProducts.filter(p => 
      p && p.category && (p.category === activeTab || p.category === activeTab.toLowerCase())
    );
  }, [allProducts, activeTab]);

  const sections = useMemo(() => {
    if (!mounted || !allProducts || !Array.isArray(allProducts)) return null;
    const pool = allProducts.filter(p => p && typeof p === 'object');

    const getByCategory = (cat: string) => pool.filter(p => p && p.category && (p.category === cat || p.category === cat.toLowerCase())).slice(0, 15);

    // Pre-calculate deal end times once per product update
    const dealProducts = pool
        .filter(p => p && p.original_price && p.original_price > p.price)
        .slice(0, 30)
        .map(p => {
          const savings = (p.original_price || p.price) - p.price;
          const discountPct = Math.round((savings / (p.original_price || p.price)) * 100);
          const isGlobal = p.seller_id === 'global-partners';
          const createdPlus24h = p.created_at ? new Date(p.created_at).getTime() + 24 * 60 * 60 * 1000 : 0;
          const dealEndTime = isGlobal
            ? new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString()
            : (createdPlus24h > Date.now() 
                ? new Date(createdPlus24h).toISOString() 
                : new Date(new Date().setHours(23, 59, 59, 999)).toISOString());

          return {
            ...p,
            dealEndTime,
            dealDiscountText: `${discountPct}% OFF`
          };
        });

    return {
      // "Trending" must reflect the real catalogue, not whatever the shopper just
      // searched. Global/AI results get promoted into the local catalogue when
      // browsed, all with sold_count 0 — so after searching "macbook" the entire
      // rail filled with MacBooks, which reads as broken merchandising.
      //
      // Real sellers' stock ranks first; global-sourced items only backfill if
      // there genuinely isn't enough, and never more than a third of the rail so
      // one search can't take it over.
      topPicks: (() => {
        const isGlobal = (p: any) =>
          p?.seller_id === "global-partners" || String(p?.id || "").startsWith("global-");
        const byPopularity = (a: any, b: any) =>
          (b?.sold_count || 0) - (a?.sold_count || 0) ||
          (b?.view_count || 0) - (a?.view_count || 0);

        const local = pool.filter(p => !isGlobal(p)).sort(byPopularity);
        const global = pool.filter(isGlobal).sort(byPopularity);
        const globalCap = Math.max(0, 20 - local.length);
        return [...local, ...global.slice(0, Math.min(globalCap, 7))].slice(0, 20);
      })(),
      sponsoredProducts: pool.filter(p => p && p.is_sponsored).slice(0, 15),
      dealProducts,
      phonesProducts: getByCategory("Phones"),
      gamingProducts: getByCategory("Gaming"),
      computerProducts: getByCategory("Computers"),
      carProducts: getByCategory("Vehicles"),
      fashionProducts: getByCategory("Fashion"),
      beautyProducts: getByCategory("Beauty"),
      homeProducts: getByCategory("Home"),
      electronicsProducts: getByCategory("Electronics"),
      applianceProducts: getByCategory("Appliances"),
      fitnessProducts: getByCategory("Sports"),
      healthProducts: getByCategory("Health"),
      groceryProducts: getByCategory("Grocery"),
      fairPriceProducts: pool.filter(p => p && p.price_flag === "fair").slice(0, 20),
      followedStoreProducts: []
    };
  }, [allProducts, mounted]);

  // Prevent hydration hanging by waiting for mount
  if (!mounted) return <div className="min-h-screen bg-[#E3E6E6]" />;

  return (
    <div data-app-ready className="min-h-screen bg-[#E3E6E6] text-foreground transition-all duration-700 flex flex-col overflow-x-clip font-sans">
      <Navbar />

      <div className="flex-1 flex flex-col relative">
        <main className="flex-1 flex flex-col relative">
          <PriceIntelModal isOpen={isPriceModalOpen} onClose={() => setIsPriceModalOpen(false)} />

          {/* ─── Hero Section (Restored Single Image) ─── */}
          {/* Padding tracks the header's measured height (--fp-header-h, published by
              Navbar) plus the PWA banner. The old fixed 128px was tuned for desktop
              web and left a band of empty grey above the hero in the native app. */}
          <section
            className="relative w-full bg-[#E3E6E6] pb-5 md:pb-8"
            style={{ paddingTop: `${headerOffset + 8}px` }}
          >
            <div className="container mx-auto px-1 md:px-2 relative z-10">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 h-[160px] md:h-[240px]">
                
                <div
                  className="lg:col-span-8 relative rounded-xl md:rounded-[24px] overflow-hidden shadow-lg bg-gray-200"
                  onMouseEnter={() => setHeroSliderPaused(true)}
                  onMouseLeave={() => setHeroSliderPaused(false)}
                  onTouchStart={() => setHeroSliderPaused(p => !p)}
                >
                  <div className="absolute inset-0">
                    <AnimatePresence initial={false}>
                      <motion.div
                        key={currentBannerIndex}
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "-100%" }}
                        transition={{ x: { type: "spring", stiffness: 300, damping: 30 } }}
                        className="absolute inset-0 w-full h-full"
                        // Swipe to move between hero slides. Previously the only way
                        // to reach another banner was to wait out the 6s timer, so a
                        // slide someone wanted to look at (ZEMA 360 etc.) was
                        // unreachable on demand.
                        drag={banners.length > 1 ? "x" : false}
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={0.18}
                        onDragEnd={(_e, info) => {
                          const threshold = 60;
                          if (info.offset.x < -threshold) {
                            setCurrentBannerIndex(prev => (prev + 1) % banners.length);
                          } else if (info.offset.x > threshold) {
                            setCurrentBannerIndex(prev => (prev - 1 + banners.length) % banners.length);
                          }
                        }}
                      >
                        {banners[currentBannerIndex]?.type === "component" ? (
                          banners[currentBannerIndex]?.componentId === "zema360" ? (
                            <Zema360HeroBanner />
                          ) : null
                        ) : (
                          <img
                            src={getProxiedImageUrl(banners[currentBannerIndex]?.image_url || "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=2000")}
                            onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => e.currentTarget.src = "https://images.unsplash.com/photo-1556656793-02715d8dd6f8?auto=format&fit=crop&w=2000&q=80"}
                            className="absolute inset-0 w-full h-full object-cover"
                            alt={banners[currentBannerIndex]?.title || "Hero Banner"}
                          />
                        )}
                      </motion.div>
                    </AnimatePresence>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent pointer-events-none" />
                  </div>

                  {/* Glassy prev/next arrows. Swipe covers touch, but on desktop
                      there's no drag affordance at all — and discoverability of a
                      swipe is poor even on mobile. Siblings of the dragging layer,
                      so they hold still while the slide moves under them. */}
                  {banners.length > 1 && (
                    <>
                      {/* Right arrow only. The left one sat over the banner's own
                          headline (covering the "A" in AUTONOMOUS on the ZEMA 360
                          slide) — hero art has content on the left, so that side has
                          to stay clear. Swiping still moves both directions. */}
                      <button
                        aria-label="Next banner"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentBannerIndex(prev => (prev + 1) % banners.length);
                        }}
                        className="absolute z-30 right-2 md:right-3 top-1/2 -translate-y-1/2 h-8 w-8 md:h-10 md:w-10 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/25 text-white flex items-center justify-center transition-all active:scale-90 shadow-lg"
                      >
                        <ChevronRight className="h-4 w-4 md:h-5 md:w-5" />
                      </button>
                    </>
                  )}

                  {/* Buttons Overlay — Centered Bottom on Mobile, Center-Right on Desktop (clear of right metrics column) */}
                  <div className="absolute z-30 flex flex-row md:flex-col items-center justify-center gap-2 md:gap-3 bottom-4 md:bottom-auto left-0 right-0 md:left-auto md:right-44 md:top-1/2 md:-translate-y-1/2 px-4 md:px-0">
                    <Button
                      size="lg"
                      className="rounded-full px-4 md:px-7 h-9 md:h-12 bg-gradient-to-b from-[#fbbf24] to-brand-orange hover:from-[#fcd34d] hover:to-[#fbbf24] text-black font-black text-[10px] md:text-[14px] shadow-[0_10px_25px_-5px_rgba(245,158,11,0.5)] border border-amber-300/60 flex items-center gap-1.5 md:gap-2.5 transition-all active:scale-95 active:translate-y-0.5"
                      onClick={(e) => {
                        e.stopPropagation();
                        // /sell handles the "create the product first, finish
                        // store setup right after" flow for anyone who isn't
                        // already a seller — no separate onboarding-first step.
                        router.push(isSeller ? "/seller/dashboard" : "/sell");
                      }}
                    >
                      <StoreIcon className="h-4 w-4 md:h-5 md:w-5 text-black" />
                      {/* Routing already sent sellers to their dashboard, but the label
                          still said START SELLING — confusing for someone who plainly
                          already sells. "DASHBOARD" also keeps the pill short on mobile. */}
                      {isSeller ? "DASHBOARD" : "START SELLING"}
                    </Button>
                    <Button
                      size="lg"
                      className="rounded-full px-4 md:px-7 h-9 md:h-12 bg-emerald-500/20 hover:bg-emerald-500/30 backdrop-blur-[40px] border border-emerald-400/50 text-white font-black text-[10px] md:text-[14px] shadow-2xl flex items-center gap-1.5 md:gap-2.5 transition-all active:scale-95 group overflow-hidden"
                      onClick={() => setIsPriceModalOpen(true)}
                    >
                      PRICE CHECKER AI
                      <Sparkles className="h-4 w-4 md:h-5 md:w-5 text-[#34d399] animate-pulse" />
                    </Button>
                  </div>

                  {/* Carousel Indicators — clickable, jumps to that slide */}
                  <div className="absolute top-4 md:top-6 right-4 md:right-6 z-20 flex items-center gap-1.5 md:gap-2">
                    {heroSliderPaused && (
                      <div className="w-5 h-5 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center mr-1">
                        <svg width="8" height="9" viewBox="0 0 8 9" fill="white">
                          <rect x="0" y="0" width="2.5" height="9" rx="1"/>
                          <rect x="5.5" y="0" width="2.5" height="9" rx="1"/>
                        </svg>
                      </div>
                    )}
                    {banners.map((_, idx) => (
                      <button
                        key={idx}
                        aria-label={`Go to slide ${idx + 1}`}
                        onClick={() => { setCurrentBannerIndex(idx); setHeroSliderPaused(false); }}
                        className={cn(
                          "h-1.5 md:h-2 rounded-full transition-all duration-300 cursor-pointer hover:opacity-100",
                          idx === currentBannerIndex ? "w-6 md:w-8 bg-[#10b981]" : "w-2 bg-white/40 hover:bg-white/70"
                        )}
                      />
                    ))}
                  </div>
                </div>

                {/* Side Ad Grid */}
                <div className="hidden lg:grid lg:col-span-4 grid-cols-2 grid-rows-2 gap-2 h-full">
                  {(heroConfig?.adSlots || DEFAULT_AD_SLOTS).map((ad: any) => {
                    const AdComponent = ad.componentId ? AD_SLOT_COMPONENTS[ad.componentId] : null;
                    return (
                      <div
                        key={ad.id}
                        className="relative rounded-xl md:rounded-[20px] overflow-hidden cursor-pointer transition-all group shadow-md bg-gray-900"
                        onClick={() => {
                          if (ad.componentId === "ziva-ai" || ad.link === "#") {
                            setIsPriceModalOpen(true);
                          } else if (ad.link) {
                            router.push(ad.link);
                          }
                        }}
                      >
                        {AdComponent ? (
                          <AdComponent />
                        ) : (
                          <img
                            src={getProxiedImageUrl(ad.img)}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                            alt={ad.title || "Ad slot"}
                          />
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          {/* ─── Content Body ─── */}
          <div ref={productSectionRef} className="relative z-20 w-full bg-[#F5F5F7]">
            {/* Secondary Quick Categories Bar (Pills) - Now Sticky and Interactive */}
            {/* top offset must track --pwa-banner-h (set by PwaManager when the install
                banner shows) — a static px value here left the pills bar pinned too high
                whenever the banner pushed the fixed header down, slicing off its top edge. */}
            <div
                id="category-pills-sticky-bar"
                className="sticky z-[40] bg-[#F5F5F7]/80 backdrop-blur-xl border-b border-gray-200 shadow-sm transition-all pb-1"
                style={{ top: `${headerOffset}px` }}
            >
              <div id="pills-container" className="container mx-auto px-1 md:px-2 pt-2 pb-2 flex items-center gap-2 overflow-x-auto scrollbar-hide no-scrollbar relative scroll-smooth">
                {pills.map((cat) => {
                  const isActive = activeTab === cat;
                  return (
                    <Button
                      id={`pill-${cat}`}
                      key={cat}
                      size="sm"
                      variant="outline"
                      className={cn(
                        "rounded-full px-4 md:px-5 h-8 md:h-9 whitespace-nowrap shadow-sm text-[11px] md:text-[13px] transition-all flex-shrink-0 font-bold border",
                        isActive 
                          ? "bg-black text-white border-black hover:bg-gray-800 hover:text-white" 
                          : "bg-white border-gray-200 text-gray-800 hover:bg-gray-50"
                      )}
                      onClick={() => handleTabChange(cat)}
                    >
                      {cat === 'Best-Selling' && <Flame className="h-4 w-4 mr-1 text-orange-500" />}
                      {cat === 'Trending' && <TrendingUp className="h-4 w-4 mr-1 text-red-500" />}
                      {cat === 'Price Drop' && <Tag className="h-4 w-4 mr-1 text-purple-500 animate-pulse" />}
                      {cat}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* ═══ Initial Hydration Skeletons (show while DB is preparing) ═══ */}
            {(!mounted || !sections || (productsLoading && allProducts.length === 0)) && (
              <div className="container mx-auto px-1 md:px-2 space-y-4 pt-4 mb-10">
                <ProductSlider title={`Trending in ${userGeo?.name ?? "Nigeria"}`} link="#" products={[]} isLoading={true} icon={<TrendingUp className="h-5 w-5 text-gray-300" />} />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                  {Array(4).fill(0).map((_, i) => <div key={i} className="h-80 bg-white rounded-lg shadow-sm animate-pulse" />)}
                </div>
              </div>
            )}

            {/* ═══ Optimized Homepage Sections ═══ */}
            <div className="overflow-hidden w-full relative min-h-[600px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.2}
                  onDragEnd={handleDragEnd}
                  className="w-full"
                >
                  {activeTab === "All" ? (
                    // Don't paint a wall of empty shelves while the catalogue is
                    // still arriving — the skeleton above covers that window.
                    mounted && sections && !(productsLoading && allProducts.length === 0) && (
                      <>
                <section className="container mx-auto px-1 md:px-2 mt-2 mb-1">
                  <RecentlyViewedHorizontal />
                </section>

                <section className="container mx-auto px-1 md:px-2 mb-1 relative z-40">
                  <ProductSlider title={<>Trending in <span className='text-green-500'>{userGeo ? `${userGeo.name} ${userGeo.flag}` : "Nigeria 🇳🇬"}</span></>} link="/search" products={sections.topPicks} icon={<TrendingUp className="h-5 w-5 text-brand-green-600" />} autoScroll direction="left" />
                </section>

                <section className="container mx-auto px-1 md:px-2 mb-1">
                  <ProductSlider
                    title={<>Hottest Deals <span className="text-green-500">GenZ Favorites</span></>}
                    link="/deals"
                    products={sections.dealProducts}
                    icon={<Flame className="h-5 w-5 text-orange-500" />}
                    autoScroll
                    direction="right"
                    cardType="compact"
                  />
                </section>

                <section className="container mx-auto px-1 md:px-2 mb-1 relative z-30">
                  <ProductSlider title="Sponsored" link="/search" products={sections.sponsoredProducts} icon={<Sparkles className="h-5 w-5 text-purple-500" />} />
                </section>

                {sections.followedStoreProducts.length > 0 && (
                  <section className="container mx-auto px-1 md:px-2 mb-1">
                    <BestSellersScroller title="From Stores You Follow" link="/account/lists" products={sections.followedStoreProducts} icon={<StoreIcon className="h-5 w-5 text-brand-green-600" />} />
                  </section>
                )}

                {/* ══ Category Sections ══ */}
                <section className="container mx-auto px-1 md:px-2 space-y-3 mb-1">
                  <ProductSlider title="Verified Fair Prices" link="/search?verified=true" products={sections.fairPriceProducts} icon={<ShieldCheck className="h-5 w-5 text-brand-green-600" />} />
                  <ProductSlider title="Phones & Tablets" link="/search?category=phones" products={sections.phonesProducts} icon={<Smartphone className="h-5 w-5 text-blue-500" />} />
                  <ProductSlider title="Best in Gaming" link="/search?category=gaming" products={sections.gamingProducts} icon={<Gamepad2 className="h-5 w-5 text-purple-500" />} />
                  <ProductSlider title="PCs & Laptops" link="/search?category=computers" products={sections.computerProducts} icon={<Monitor className="h-5 w-5 text-gray-700" />} />
                  <ProductSlider title="Electronics & Audio" link="/search?category=electronics" products={sections.electronicsProducts} icon={<Plug className="h-5 w-5 text-yellow-600" />} />
                  <ProductSlider title="Verified Cars" link="/search?category=cars" products={sections.carProducts} icon={<Car className="h-5 w-5 text-red-500" />} />
                  <ProductSlider title="Fashion & Style" link="/search?category=fashion" products={sections.fashionProducts} icon={<Shirt className="h-5 w-5 text-pink-500" />} />
                  <ProductSlider title="Beauty & Skincare" link="/search?category=beauty" products={sections.beautyProducts} icon={<Sparkles className="h-5 w-5 text-rose-400" />} />
                  <ProductSlider title="Home & Living" link="/category/home" products={sections.homeProducts} icon={<HomeIcon className="h-5 w-5 text-amber-600" />} />
                  <ProductSlider title="Appliances" link="/category/appliances" products={sections.applianceProducts} icon={<Plug className="h-5 w-5 text-orange-500" />} />
                  <ProductSlider title="Gym & Fitness" link="/category/fitness" products={sections.fitnessProducts} icon={<Dumbbell className="h-5 w-5 text-emerald-600" />} />
                  <ProductSlider title="Health & Medical" link="/category/health" products={sections.healthProducts} icon={<ShieldCheck className="h-5 w-5 text-blue-600" />} />
                  <ProductSlider title="Groceries & Baby Essentials" link="/category/grocery" products={sections.groceryProducts} icon={<ShoppingBasket className="h-5 w-5 text-green-600" />} />
                </section>

                <section className="container mx-auto px-1 md:px-2 my-2 pt-2 border-t border-gray-100">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {categoryGrids.map((card, i) => (
                      <CategoryGridCard key={card.title} card={card} delay={i * 0.1} />
                    ))}
                  </div>
                </section>

                <StoreDiscoveryRail />

                <section className="w-full px-1 md:px-2 mb-8">
                  <RecommendedProducts products={allProducts} title="Recommended For You" />
                </section>
                      </>
                    )
                  ) : (
                    <CategoryPanel category={activeTab} />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </main>
      </div>

      <Footer />
    </div>
  );
}



// ─── CategoryGridCard Component (Amazon 2×2 Style + Apple Aesthetics) ───

function CategoryGridCard({ card, delay = 0 }: { card: CategoryCard; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ delay, duration: 0.4, ease: "easeOut" }}
      className="bg-white rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow duration-300 flex flex-col"
    >
      {/* Title */}
      <h3 className="text-lg font-extrabold text-gray-900 mb-4 tracking-tight leading-tight">
        {card.title}
      </h3>

      {/* 2×2 Grid of Subcategory Tiles */}
      <div className="grid grid-cols-2 gap-3 flex-1">
        {card.subs.map((sub) => (
          <Link
            key={sub.label}
            href={sub.href}
            className="group/tile flex flex-col items-center"
          >
            <div className="w-full aspect-square rounded-md overflow-hidden bg-gray-50 mb-1.5 relative">
              <img
                src={sub.image}
                alt={sub.label}
                className="w-full h-full object-cover transition-transform duration-500 group-hover/tile:scale-110"
                loading="lazy"
              />
            </div>
            <span className="text-xs font-bold text-gray-900 group-hover/tile:text-indigo-600 transition-colors text-center leading-tight tracking-tight">
              {sub.label}
            </span>
          </Link>
        ))}
      </div>

      <Link
        href={card.link}
        className="group/link text-sm font-black text-indigo-600 tracking-tight hover:text-indigo-800 mt-5 flex items-center transition-colors"
      >
        {card.linkText}
        <ChevronRight className="h-4 w-4 ml-0.5 group-hover/link:translate-x-1 transition-transform" />
      </Link>
    </motion.div>
  );
}


// ─── BestSellersScroller (Full-Width Amazon-Style Horizontal Scroller) ───

function BestSellersScroller({ title, link, products, icon, autoScroll = false, direction = "left" }: { title: string; link: string; products: any[]; icon?: React.ReactNode; autoScroll?: boolean; direction?: "left" | "right" }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const initOffsetDone = useRef(false);
  const pausedRef = useRef(false);
  const reduceMotion = useRef(false);

  const setPaused = useCallback((p: boolean) => {
    pausedRef.current = p;
    const el = scrollRef.current;
    if (p && el) {
      el.style.scrollBehavior = "auto";
      el.scrollTo({ left: el.scrollLeft });
    }
  }, []);

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = scrollRef.current.clientWidth * 0.75;
    scrollRef.current.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  };

  useEffect(() => {
    reduceMotion.current = typeof window !== "undefined"
      && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useEffect(() => {
    if (!autoScroll || reduceMotion.current) return;
    const el = scrollRef.current;
    if (!el) return;

    // Wait a tick for layout, set initial offset for right-to-left
    if (!initOffsetDone.current && direction === "right") {
      setTimeout(() => {
        if (el) el.scrollLeft = el.scrollWidth / 3;
      }, 100);
      initOffsetDone.current = true;
    }

    // Continuous loop reads pausedRef each tick so hover/tap-hold pauses instantly.
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const stepScroll = () => {
      if (!el) return;
      if (pausedRef.current || document.hidden) {
        timeoutId = setTimeout(stepScroll, 600);
        return;
      }
      const cardWidth = 240;
      const scrollAmount = direction === "left" ? cardWidth : -cardWidth;

      // Wrap around at 1/3 of total scroll width (tripled array)
      if (direction === "left" && el.scrollLeft >= el.scrollWidth / 3) {
        el.scrollLeft = 0;
      } else if (direction === "right" && el.scrollLeft <= 0) {
        el.scrollLeft = el.scrollWidth / 3;
      } else {
        el.style.scrollBehavior = "smooth";
        el.scrollBy({ left: scrollAmount, behavior: "smooth" });
      }

      timeoutId = setTimeout(stepScroll, 2800);
    };

    timeoutId = setTimeout(stepScroll, 1500);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [autoScroll, direction]);

  if (products.length === 0) return null;

  return (
    <div
      className="bg-white rounded-lg py-1.5 px-2 shadow-sm relative group/scroller"
      onPointerEnter={(e) => { if (e.pointerType === "mouse") setPaused(true); }}
      onPointerLeave={(e) => { if (e.pointerType === "mouse") setPaused(false); }}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setTimeout(() => setPaused(false), 3000)}
      onTouchCancel={() => setTimeout(() => setPaused(false), 3000)}
    >
      <div className="flex items-center justify-between mb-1.5">
        <h2 className="text-[16px] sm:text-lg font-extrabold text-gray-900 tracking-tight flex items-center gap-2 whitespace-nowrap">
          {icon && <span className="shrink-0">{icon}</span>}
          {title}
        </h2>
        <Link href={link} className="text-sm font-semibold text-blue-600 hover:text-brand-orange hover:underline flex items-center gap-0.5 transition-colors">
          See all <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="relative">
        {/* Apple Liquid Glass Scroll Arrows */}
        <button
          onClick={() => scroll("left")}
          className="absolute -left-4 top-1/2 -translate-y-1/2 z-40 w-12 h-12 bg-white/20 backdrop-blur-[20px] border border-white/40 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.1)] flex items-center justify-center opacity-0 group-hover/scroller:opacity-100 transition-all duration-500 hover:scale-110 active:scale-95 group-hover/scroller:-translate-x-2"
          aria-label="Scroll left"
        >
          <ChevronLeft className="h-6 w-6 text-gray-800 drop-shadow-sm" />
        </button>
        <button
          onClick={() => scroll("right")}
          className="absolute -right-4 top-1/2 -translate-y-1/2 z-40 w-12 h-12 bg-white/20 backdrop-blur-[20px] border border-white/40 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.1)] flex items-center justify-center opacity-0 group-hover/scroller:opacity-100 transition-all duration-500 hover:scale-110 active:scale-95 group-hover/scroller:translate-x-2"
          aria-label="Scroll right"
        >
          <ChevronRight className="h-6 w-6 text-gray-800 drop-shadow-sm" />
        </button>

        <div ref={scrollRef} className="flex gap-2.5 overflow-x-auto scrollbar-hide pb-8 px-1" style={{ touchAction: 'pan-x' }}>
          {[...products, ...products, ...products].map((product, idx) => (
            <div key={`${product.id}-${idx}`} className="w-[172px] md:w-[220px] flex-shrink-0 flex flex-col">
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}




function ProductSlider({ title, link, products, icon, autoScroll = false, direction = "left", isLoading = false, cardType = "default" }: { title: React.ReactNode; link: string; products: any[]; icon?: React.ReactNode; autoScroll?: boolean; direction?: "left" | "right", isLoading?: boolean, cardType?: "default" | "compact" }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const initOffsetDone = useRef(false);
  // Live pause flag the running loop reads each tick — lets hover/tap-hold pause
  // INSTANTLY without tearing down & rebuilding the timer chain (which dropped pauses).
  const pausedRef = useRef(false);
  const reduceMotion = useRef(false);

  // Pausing must also kill any smooth-scroll already in flight, otherwise the
  // current glide finishes and it "feels" like hover didn't pause.
  const setPaused = useCallback((p: boolean) => {
    pausedRef.current = p;
    const el = scrollRef.current;
    if (p && el) {
      // Snap to current position with instant behavior to halt in-flight momentum.
      el.style.scrollBehavior = "auto";
      el.scrollTo({ left: el.scrollLeft });
    }
  }, []);

  useEffect(() => {
    reduceMotion.current = typeof window !== "undefined"
      && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  }, []);

  const checkScroll = useCallback(() => {
    if (scrollRef.current && !autoScroll) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  }, [autoScroll]);

  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, [products, checkScroll]);

  // Step-by-step auto-scroll: advance one card, pause ~2s, repeat. The loop runs
  // continuously and reads pausedRef each tick, so a pause takes effect on the very
  // next tick instead of requiring an effect teardown (which previously dropped pauses).
  useEffect(() => {
    if (!autoScroll || isLoading || reduceMotion.current) return;

    const el = scrollRef.current;
    if (!el) return;

    // Set initial offset for right-to-left direction
    if (!initOffsetDone.current && direction === "right") {
      el.scrollLeft = el.scrollWidth / 3;
      initOffsetDone.current = true;
    }

    const CARD_WIDTH = 220; // matches md:min-w-[220px]
    let timeoutId: ReturnType<typeof setTimeout>;

    const stepScroll = () => {
      if (!el) return;
      // Skip the move while paused (hover / tap-hold) but keep the loop alive.
      if (pausedRef.current || document.hidden) {
        timeoutId = setTimeout(stepScroll, 600);
        return;
      }
      const scrollAmount = direction === "left" ? CARD_WIDTH : -CARD_WIDTH;

      // Seamless wrap-around at 1/3 of total width (tripled array)
      if (direction === "left" && el.scrollLeft >= el.scrollWidth / 3) {
        el.scrollLeft = 0;
      } else if (direction === "right" && el.scrollLeft <= 0) {
        el.scrollLeft = el.scrollWidth / 3;
      } else {
        el.style.scrollBehavior = "smooth";
        el.scrollBy({ left: scrollAmount, behavior: "smooth" });
      }

      timeoutId = setTimeout(stepScroll, 2200);
    };

    // Initial delay before first step
    timeoutId = setTimeout(stepScroll, 1800);
    return () => clearTimeout(timeoutId);
  }, [autoScroll, direction, isLoading]);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = direction === "left" ? -300 : 300;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
      setTimeout(checkScroll, 350);
    }
  };

  if (products.length === 0 && !isLoading) return null;

  // Unique Identity Guard: Ensure no duplicate IDs enter the slider before expansion
  const uniqueProducts = Array.from(new Map(products.filter(Boolean).map(p => [p.id, p])).values());
  const displayProducts = isLoading ? Array(6).fill(null) : (autoScroll ? [...uniqueProducts, ...uniqueProducts, ...uniqueProducts] : uniqueProducts);

  return (
    <div
      className="bg-white rounded-lg p-4 md:p-5 shadow-sm relative group/slider"
      // Mouse hover (desktop) pauses; pointer leave resumes.
      onPointerEnter={(e) => { if (e.pointerType === "mouse") setPaused(true); }}
      onPointerLeave={(e) => { if (e.pointerType === "mouse") setPaused(false); }}
      // Touch: tap/hold/swipe pauses immediately, resumes 3s after finger lifts.
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setTimeout(() => setPaused(false), 3000)}
      onTouchCancel={() => setTimeout(() => setPaused(false), 3000)}
    >
      <div className="flex items-center gap-4 mb-2 md:mb-2">
        <h2 className="text-[16px] sm:text-lg md:text-xl font-extrabold tracking-tight text-gray-900 flex items-center gap-2 whitespace-nowrap">
          {icon && <span className="shrink-0">{icon}</span>}
          {title}
        </h2>
        <Link href={link} className="text-xs md:text-sm text-blue-600 hover:text-brand-orange hover:underline ml-auto flex items-center font-semibold transition-colors whitespace-nowrap">
          See more <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="relative">
        {/* Apple Liquid Glass Scroll Arrows */}
        {canScrollLeft && !autoScroll && (
          <button
            onClick={() => scroll("left")}
            className="absolute -left-4 top-1/2 -translate-y-1/2 z-40 w-12 h-12 bg-white/20 backdrop-blur-[20px] border border-white/40 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.1)] hidden md:flex items-center justify-center md:opacity-0 md:group-hover/slider:opacity-100 transition-all duration-500 hover:scale-110 active:scale-95 md:group-hover/slider:-translate-x-2"
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-6 w-6 text-gray-800 drop-shadow-sm" />
          </button>
        )}

        {/* Right Arrow */}
        {canScrollRight && !autoScroll && (
          <button
            onClick={() => scroll("right")}
            className="absolute -right-4 top-1/2 -translate-y-1/2 z-40 w-12 h-12 bg-white/20 backdrop-blur-[20px] border border-white/40 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.1)] hidden md:flex items-center justify-center md:opacity-0 md:group-hover/slider:opacity-100 transition-all duration-500 hover:scale-110 active:scale-95 md:group-hover/slider:translate-x-2"
            aria-label="Scroll right"
          >
            <ChevronRight className="h-6 w-6 text-gray-800 drop-shadow-sm" />
          </button>
        )}

        <div
          ref={scrollRef}
          onScroll={!autoScroll ? checkScroll : undefined}
          className="flex gap-2 md:gap-2 overflow-x-auto pb-2 md:pb-4 scrollbar-hide snap-none items-stretch"
          // scroll-behavior is managed imperatively (setPaused / stepScroll) so pausing
          // can instantly halt an in-flight glide. Manual arrow clicks pass behavior:'smooth'.
          style={{ paddingRight: autoScroll ? '0' : '1.5rem', touchAction: 'pan-x' }}
        >
          {displayProducts.map((product, idx) => (
            <div key={product ? `${product.id}-${idx}` : `skeleton-${idx}`} className="w-[172px] md:w-[220px] flex-shrink-0 flex flex-col">
              {isLoading ? (
                <ProductCardSkeleton />
              ) : cardType === "compact" ? (
                <CompactPriceDropCard product={product} />
              ) : (
                <ProductCard 
                  product={product} 
                  dealEndTime={product.dealEndTime} 
                  dealDiscountText={product.dealDiscountText} 
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


export default function Home() {
  return (
    <Suspense fallback={null}>
      <HomeContent />
    </Suspense>
  );
}
