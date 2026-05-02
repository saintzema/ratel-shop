"use client";

import { useState, useRef, useEffect, useCallback, useMemo, Suspense } from "react";
import Link from "next/link";
import { SEED_DEALS, SEED_PRODUCTS } from "@/lib/data";
import { DataSyncService } from "@/lib/sync-store";
import { ProductCard } from "@/components/product/ProductCard";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ChevronRight, ChevronLeft, Heart, Plus, ShoppingCart, Flame, ShieldCheck, Smartphone, Gamepad2, Monitor, Plug, Car, Shirt, Sparkles, Home as HomeIcon, Dumbbell, ShoppingBasket, Star, Store as StoreIcon, TrendingUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { PriceIntelModal } from "@/components/modals/PriceIntelModal";
import { RecommendedProducts } from "@/components/ui/RecommendedProducts";
import { StoreDiscoveryRail } from "@/components/ui/StoreDiscoveryRail";
import { useRouter } from "next/navigation";
import { RecentlyViewedHorizontal } from "@/components/ui/RecentlyViewedHorizontal";
import { ProductCardSkeleton } from "@/components/ui/skeleton";
import { useFavorites } from "@/context/FavoritesContext";
import { useCart } from "@/context/CartContext";
import { formatPrice, getProductUrl, getProxiedImageUrl, cn } from "@/lib/utils";
import { Product } from "@/lib/types";
import { useSearchParams } from "next/navigation";
import { CategoryPanel } from "@/components/ui/CategoryPanel";

export const TEMU_CATEGORIES = ['All', 'Trending', 'Best-Selling', 'Solar', 'Streaming Kits', 'Phones', 'Gaming', 'Computers', 'Fashion', 'Cars', 'Grocery', 'Home Office', 'EVs', 'Industrial', 'Health', 'Automotive', 'Bags', 'Women', 'Jewelry', 'Household', 'Toy', 'Crafts', 'Men', 'Sports', 'Kids', 'Beauty', 'Office', 'Baby', 'Garden', 'Pets', 'Musical', 'Appliances', 'Food', 'Books'];

// ─── Amazon-Style 2×2 Category Grid Card Data ────────────────

interface SubCategory {
  label: string;
  image: string;
  href: string;
}

export interface CategoryCard {
  title: string;
  link: string;
  linkText: string;
  subs: SubCategory[];
}

export const CATEGORY_CARDS_ROW_1: CategoryCard[] = [
  {
    title: "Top in Phones",
    link: "/search?category=phones",
    linkText: "See all phones",
    subs: [
      { label: "Phones", image: "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=200&h=200&fit=crop", href: "/category/phones" },
      { label: "iPhones", image: "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=200&h=200&fit=crop", href: "/search?category=phones&q=iphone" },
      { label: "Tablets", image: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=200&h=200&fit=crop", href: "/category/tablets" },
      { label: "Accessories", image: "https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=200&h=200&fit=crop", href: "/search?category=phones&q=accessories" },
    ],
  },
  {
    title: "Level Up Your Gaming",
    link: "/search?category=gaming",
    linkText: "Shop gaming",
    subs: [
      { label: "PlayStation", image: "https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=200&h=200&fit=crop", href: "/search?category=gaming&q=playstation" },
      { label: "Smart TVs", image: "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=200&h=200&fit=crop", href: "/search?category=electronics&q=tv" },
      { label: "Headsets", image: "https://images.unsplash.com/photo-1599669454699-248893623440?w=200&h=200&fit=crop", href: "/search?category=gaming&q=headset" },
      { label: "Controllers", image: "https://images.unsplash.com/photo-1592840496694-26d035b52b48?w=200&h=200&fit=crop", href: "/search?category=gaming&q=controller" },
    ],
  },
  {
    title: "Power Your Home",
    link: "/search?category=energy",
    linkText: "See all energy",
    subs: [
      { label: "Solar Panels", image: "https://images.unsplash.com/photo-1613665813446-82a78c468a1d?w=200&h=200&fit=crop", href: "/search?category=energy&q=solar" },
      { label: "Inverters", image: "https://images.unsplash.com/photo-1509391366360-2e959784a276?w=200&h=200&fit=crop", href: "/search?category=energy&q=inverter" },
      { label: "Generators", image: "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=200&h=200&fit=crop", href: "/search?category=energy&q=generator" },
      { label: "Electric Cars", image: "https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=200&h=200&fit=crop", href: "/search?category=cars&q=electric" },
    ],
  },
  {
    title: "Fashion & Style",
    link: "/search?category=fashion",
    linkText: "Explore fashion",
    subs: [
      { label: "Designer Bags", image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=200&h=200&fit=crop", href: "/search?category=fashion&q=bag" },
      { label: "Sneakers", image: "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=200&h=200&fit=crop", href: "/search?category=fashion&q=sneakers" },
      { label: "Watches", image: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=200&h=200&fit=crop", href: "/search?category=fashion&q=watches" },
      { label: "Sunglasses", image: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=200&h=200&fit=crop", href: "/search?category=fashion&q=sunglasses" },
    ],
  },
];

const CATEGORY_CARDS_ROW_2: CategoryCard[] = [
  {
    title: "Beauty Essentials",
    link: "/search?category=beauty",
    linkText: "Shop beauty",
    subs: [
      { label: "Skincare", image: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=200&h=200&fit=crop", href: "/search?category=beauty&q=skincare" },
      { label: "Makeup", image: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=200&h=200&fit=crop", href: "/search?category=beauty&q=makeup" },
      { label: "Fragrance", image: "https://images.unsplash.com/photo-1541643600914-78b084683601?w=200&h=200&fit=crop", href: "/search?category=beauty&q=fragrance" },
      { label: "Hair Care", image: "https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?w=200&h=200&fit=crop", href: "/search?category=beauty&q=hair" },
    ],
  },
  {
    title: "Home & Kitchen",
    link: "/search?category=home",
    linkText: "Discover home",
    subs: [
      { label: "Appliances", image: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=200&h=200&fit=crop", href: "/search?category=home&q=appliance" },
      { label: "Cookware", image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=200&h=200&fit=crop", href: "/search?category=home&q=cookware" },
      { label: "Furniture", image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=200&h=200&fit=crop", href: "/search?category=home&q=furniture" },
      { label: "Lighting", image: "https://images.unsplash.com/photo-1524484485831-a92ffc0de03f?w=200&h=200&fit=crop", href: "/search?category=home&q=lighting" },
    ],
  },
  {
    title: "Computers & Office",
    link: "/search?category=computers",
    linkText: "See all computers",
    subs: [
      { label: "Laptops", image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=200&h=200&fit=crop", href: "/search?category=computers&q=laptop" },
      { label: "Desktops", image: "https://images.unsplash.com/photo-1593640408182-31c70c8268f5?w=200&h=200&fit=crop", href: "/search?category=computers&q=desktop" },
      { label: "Monitors", image: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=200&h=200&fit=crop", href: "/search?category=computers&q=monitor" },
      { label: "Printers", image: "https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?w=200&h=200&fit=crop", href: "/search?category=computers&q=printer" },
    ],
  },
  {
    title: "Automotive",
    link: "/search?category=cars",
    linkText: "Shop automotive",
    subs: [
      { label: "Car Parts", image: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=200&h=200&fit=crop", href: "/search?category=cars&q=parts" },
      { label: "Dash Cams", image: "https://images.unsplash.com/photo-1544654803-b69140b285a1?w=200&h=200&fit=crop", href: "/search?category=cars&q=dash+cam" },
      { label: "Accessories", image: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=200&h=200&fit=crop", href: "/search?category=cars&q=accessories" },
      { label: "Tires", image: "https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=200&h=200&fit=crop", href: "/search?category=cars&q=tires" },
    ],
  },
];

const CATEGORY_CARDS_ROW_3: CategoryCard[] = [
  {
    title: "Gym & Fitness",
    link: "/search?category=fitness",
    linkText: "Shop fitness",
    subs: [
      { label: "Dumbbells", image: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=200&h=200&fit=crop", href: "/search?category=fitness&q=dumbbell" },
      { label: "Yoga Mats", image: "https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=200&h=200&fit=crop", href: "/search?category=fitness&q=yoga" },
      { label: "Treadmills", image: "https://images.unsplash.com/photo-1576678927484-cc907957088c?w=200&h=200&fit=crop", href: "/search?category=fitness&q=treadmill" },
      { label: "Bands", image: "https://images.unsplash.com/photo-1598289431512-b97b0917affc?w=200&h=200&fit=crop", href: "/search?category=fitness&q=resistance" },
    ],
  },
  {
    title: "Office Furniture",
    link: "/search?category=office",
    linkText: "Shop office",
    subs: [
      { label: "Chairs", image: "https://images.unsplash.com/photo-1592078615290-033ee584e267?w=200&h=200&fit=crop", href: "/search?category=office&q=chair" },
      { label: "Desks", image: "https://images.unsplash.com/photo-1611269154421-4e27233ac5c7?w=200&h=200&fit=crop", href: "/search?category=office&q=desk" },
      { label: "Monitor Arms", image: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=200&h=200&fit=crop", href: "/search?category=office&q=monitor" },
      { label: "Organizers", image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop", href: "/search?category=office&q=organizer" },
    ],
  },
  {
    title: "Groceries & Market",
    link: "/search?category=grocery",
    linkText: "Shop groceries",
    subs: [
      { label: "Rice & Grains", image: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=200&h=200&fit=crop", href: "/search?category=grocery&q=rice" },
      { label: "Cooking Oil", image: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=200&h=200&fit=crop", href: "/search?category=grocery&q=oil" },
      { label: "Noodles", image: "https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=200&h=200&fit=crop", href: "/search?category=grocery&q=indomie" },
      { label: "Beverages", image: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=200&h=200&fit=crop", href: "/search?category=grocery&q=milo" },
    ],
  },
  {
    title: "Baby Products",
    link: "/search?category=baby",
    linkText: "Shop baby",
    subs: [
      { label: "Diapers", image: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=200&h=200&fit=crop", href: "/search?category=baby&q=diapers" },
      { label: "Strollers", image: "https://images.unsplash.com/photo-1566004100477-7b1e3aca3593?w=200&h=200&fit=crop", href: "/search?category=baby&q=stroller" },
      { label: "Car Seats", image: "https://images.unsplash.com/photo-1594495894542-a46cc73202eb?w=200&h=200&fit=crop", href: "/search?category=baby&q=car+seat" },
      { label: "Feeding", image: "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=200&h=200&fit=crop", href: "/search?category=baby&q=feeding" },
    ],
  },
];

const DEFAULT_AD_SLOTS = [
    { id: 'ad1', title: 'Flash Sales', img: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=400', link: '/deals' },
    { id: 'ad2', title: 'New Arrivals', img: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400', link: '/category/new' },
    { id: 'ad3', title: 'Best Sellers', img: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400', link: '/search?sort=popular' },
    { id: 'ad4', title: 'Price Checker', img: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400', link: '#' }
];

// ─── Component ──────────────────────────────────────────────

function HomeContent() {
  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
  const productSectionRef = useRef<HTMLDivElement>(null);

  // Live products from DataSyncService — load only on client to avoid SSR hydration mismatch
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [mounted, setMounted] = useState(false);
  const [isSeller, setIsSeller] = useState(false);
  const [categoryGrids, setCategoryGrids] = useState(CATEGORY_CARDS_ROW_1);
  const [banners, setBanners] = useState<any[]>([]);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [heroConfig, setHeroConfig] = useState<any>(null);
  const searchParams = useSearchParams();
  const router = useRouter();

  // Tab State for swipeable categories
  const [activeTab, setActiveTab] = useState("All");

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

  const handleDragEnd = (event: any, info: any) => {
    const swipeThreshold = 50;
    const currentIndex = TEMU_CATEGORIES.indexOf(activeTab);
    
    if (info.offset.x < -swipeThreshold && currentIndex < TEMU_CATEGORIES.length - 1) {
        handleTabChange(TEMU_CATEGORIES[currentIndex + 1]);
    } else if (info.offset.x > swipeThreshold && currentIndex > 0) {
        handleTabChange(TEMU_CATEGORIES[currentIndex - 1]);
    }
  };

  // ─── Referral Tracking System ───
  useEffect(() => {
    const ref = searchParams?.get("ref");
    if (ref) {
      localStorage.setItem("fp_referral", ref);
    }
  }, [searchParams]);

  useEffect(() => {
    const refresh = () => {
      setAllProducts(DataSyncService.getApprovedProducts().filter(p => p.is_active));
      
      let hasSellerRole = false;
      try {
        const userStr = localStorage.getItem("fp_user");
        if (userStr) {
          const userObj = JSON.parse(userStr);
          hasSellerRole = userObj?.role === "seller";
        }
      } catch (e) {}

      setIsSeller(!!DataSyncService.getCurrentSellerId() || hasSellerRole);
      
      // Load Banners
      try {
        const savedBanners = localStorage.getItem("ratel_homepage_banners");
        if (savedBanners) {
          setBanners(JSON.parse(savedBanners).filter((b: any) => b.active));
        } else {
          // Fallback to defaults
          setBanners([
            { id: "b1", title: "Mega Sale — Up to 70% Off", subtitle: "Electronics, fashion & more", image_url: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=2000", link: "/category/deals", active: true },
            { id: "b2", title: "New Arrivals This Week", subtitle: "Discover trending products", image_url: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=2000", link: "/category/new", active: true }
          ]);
        }
      } catch(e) {}
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

    refresh(); // Initial load on client
    loadGrids();
    loadHeroConfig();
    setMounted(true);
    window.addEventListener("storage", refresh);
    window.addEventListener("sync-store-update", refresh);
    window.addEventListener("storage", loadGrids);
    window.addEventListener("hero-config-update", loadHeroConfig);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("sync-store-update", refresh);
      window.removeEventListener("storage", loadGrids);
      window.removeEventListener("hero-config-update", loadHeroConfig);
    };
  }, []);

  // Slideshow timer
  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentBannerIndex(prev => (prev + 1) % banners.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [banners]);

  // ─── Unified Product Memoization Engine ───
  const sections = useMemo(() => {
    if (!mounted) return null;
    const pool = allProducts.length > 0 ? allProducts : SEED_PRODUCTS;
    if (pool.length === 0) return null;

    const getByCategory = (cat: string) => pool.filter(p => p.category === cat).slice(0, 15);

    return {
      topPicks: pool.slice(0, 20),
      sponsoredProducts: pool.filter(p => p.is_sponsored).slice(0, 15),
      dealProducts: pool.filter(p => p.original_price && p.original_price > p.price).slice(0, 30),
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
      fairPriceProducts: pool.filter(p => p.price_flag === "fair").slice(0, 20),
      followedStoreProducts: []
    };
  }, [allProducts, mounted]);

  // Prevent hydration hanging by waiting for mount
  if (!mounted) return <div className="min-h-screen bg-[#E3E6E6]" />;

  return (
    <div data-app-ready className="min-h-screen bg-[#E3E6E6] text-foreground transition-all duration-700 flex flex-col overflow-x-hidden font-sans">
      <Navbar />

      <div className="flex-1 flex flex-col relative">
        <main className="flex-1 flex flex-col relative">
          <PriceIntelModal isOpen={isPriceModalOpen} onClose={() => setIsPriceModalOpen(false)} />

          {/* ─── Hero Section (Restored Single Image) ─── */}
          <section className="relative w-full bg-[#E3E6E6] pt-[110px] md:pt-[130px] pb-5 md:pb-8">
            <div className="container mx-auto px-1 md:px-2 relative z-10">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 h-[160px] md:h-[240px]">
                
                <div className="lg:col-span-8 relative rounded-xl md:rounded-[24px] overflow-hidden shadow-lg bg-gray-200">
                  <div className="absolute inset-0">
                    <AnimatePresence mode="wait">
                      <motion.img
                        key={currentBannerIndex}
                        initial={{ opacity: 0, scale: 1.05 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1 }}
                        src={getProxiedImageUrl(banners[currentBannerIndex]?.image_url || "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=2000")}
                        onError={(e: any) => e.currentTarget.src = "https://images.unsplash.com/photo-1556656793-02715d8dd6f8?auto=format&fit=crop&w=2000&q=80"}
                        className="absolute inset-0 w-full h-full object-cover"
                        alt={banners[currentBannerIndex]?.title || "Hero Banner"}
                      />
                    </AnimatePresence>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent pointer-events-none" />
                  </div>

                  {/* Buttons Overlay — Centered Bottom on Mobile, Top-Left on Desktop */}
                  <div className="absolute z-30 flex items-center gap-2 md:gap-4 bottom-6 md:top-10 md:bottom-auto left-0 right-0 md:left-10 md:right-auto justify-center md:justify-start px-4 md:px-0">
                    <Button
                      size="lg"
                      className="rounded-full px-4 md:px-7 h-9 md:h-12 bg-white/10 hover:bg-white/20 backdrop-blur-2xl border-none text-white font-black text-[10px] md:text-[14px] shadow-2xl flex items-center gap-1.5 md:gap-2.5 transition-all active:scale-95 group overflow-hidden glassy-gradient-border"
                      onClick={() => setIsPriceModalOpen(true)}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      PRICE CHECKER AI 
                      <Sparkles className="h-4 w-4 md:h-5 md:w-5 text-[#34d399] animate-pulse" />
                    </Button>
                    <Button
                      size="lg"
                      className="rounded-full px-4 md:px-7 h-9 md:h-12 bg-gradient-to-b from-[#10b981] to-[#059669] hover:from-[#34d399] hover:to-[#10b981] text-white font-black text-[10px] md:text-[14px] shadow-[0_10px_25px_-5px_rgba(16,185,129,0.5)] border border-emerald-400/50 flex items-center gap-1.5 md:gap-2.5 transition-all active:scale-95 active:translate-y-0.5"
                      onClick={(e) => { 
                        e.stopPropagation();
                        router.push(isSeller ? "/seller/dashboard" : "/seller/onboarding");
                      }}
                    >
                      <StoreIcon className="h-4 w-4 md:h-5 md:w-5 text-white" />
                      START SELLING
                    </Button>
                  </div>

                  {/* Carousel Indicators (Green Slider) */}
                  <div className="absolute top-4 md:top-6 right-4 md:right-6 z-20 flex gap-1.5 md:gap-2">
                    {banners.map((_, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          "h-1.5 md:h-2 rounded-full transition-all duration-300",
                          idx === currentBannerIndex ? "w-6 md:w-8 bg-[#10b981]" : "w-2 bg-white/40"
                        )}
                      />
                    ))}
                  </div>
                </div>

                {/* Side Ad Grid */}
                <div className="hidden lg:grid lg:col-span-4 grid-cols-2 grid-rows-2 gap-2 h-full">
                  {(heroConfig?.adSlots || DEFAULT_AD_SLOTS).map((ad: any) => (
                    <div 
                      key={ad.id} 
                      className="relative rounded-xl md:rounded-[20px] overflow-hidden cursor-pointer transition-all group shadow-md bg-gray-200"
                      onClick={() => {
                        if (ad.id === 'ad4' || ad.link === '#') {
                          setIsPriceModalOpen(true);
                        } else if (ad.link) {
                          router.push(ad.link);
                        }
                      }}
                    >
                      <img 
                        src={getProxiedImageUrl(ad.img)} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                        alt={ad.title || "Ad slot"} 
                      />
                      <div className="absolute inset-0 bg-black/5 group-hover:bg-black/0 transition-colors pointer-events-none" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* ─── Content Body ─── */}
          <div ref={productSectionRef} className="relative z-20 w-full bg-[#F5F5F7]">
            {/* Secondary Quick Categories Bar (Pills) - Now Sticky and Interactive */}
            <div className="sticky top-[110px] md:top-[130px] z-[40] bg-[#F5F5F7]/80 backdrop-blur-xl border-b border-gray-200 shadow-sm transition-all pb-1">
              <div id="pills-container" className="container mx-auto px-1 md:px-2 pt-2 pb-2 flex items-center gap-2 overflow-x-auto scrollbar-hide no-scrollbar relative scroll-smooth">
                {TEMU_CATEGORIES.map((cat) => {
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
                      {cat}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* ═══ Initial Hydration Skeletons (show while DB is preparing) ═══ */}
            {(!mounted || !sections) && (
              <div className="container mx-auto px-1 md:px-2 space-y-4 pt-4 mb-10">
                <ProductSlider title="Trending in Nigeria" link="#" products={[]} isLoading={true} icon={<TrendingUp className="h-5 w-5 text-gray-300" />} />
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
                    mounted && sections && (
                      <>
                <section className="container mx-auto px-1 md:px-2 mt-2 mb-1">
                  <RecentlyViewedHorizontal />
                </section>

                <section className="container mx-auto px-1 md:px-2 mb-1 relative z-40">
                  <ProductSlider title="Trending in Nigeria" link="/search" products={sections.topPicks} icon={<TrendingUp className="h-5 w-5 text-brand-green-600" />} autoScroll direction="left" />
                </section>

                <section className="container mx-auto px-1 md:px-2 mb-1">
                  <ProductSlider
                    title={<>Hottest Deals <span className="text-green-500">GenZ Favorites</span></>}
                    link="/deals"
                    products={sections.dealProducts}
                    icon={<Flame className="h-5 w-5 text-orange-500" />}
                    autoScroll
                    direction="right"
                  />
                </section>

                <section className="container mx-auto px-1 md:px-2 mb-1 relative z-30">
                  <ProductSlider title="Sponsored" link="/search" products={sections.sponsoredProducts} icon={<Sparkles className="h-5 w-5 text-purple-500" />} autoScroll direction="left" />
                </section>

                {sections.followedStoreProducts.length > 0 && (
                  <section className="container mx-auto px-1 md:px-2 mb-1">
                    <BestSellersScroller title="From Stores You Follow" link="/account/lists" products={sections.followedStoreProducts} icon={<StoreIcon className="h-5 w-5 text-brand-green-600" />} autoScroll direction="right" />
                  </section>
                )}

                {/* ══ Category Sections ══ */}
                <section className="container mx-auto px-1 md:px-2 space-y-3 mb-1">
                  <ProductSlider title="Verified Fair Prices" link="/search?verified=true" products={sections.fairPriceProducts} icon={<ShieldCheck className="h-5 w-5 text-brand-green-600" />} autoScroll direction="left" />
                  <ProductSlider title="Phones & Tablets" link="/search?category=phones" products={sections.phonesProducts} icon={<Smartphone className="h-5 w-5 text-blue-500" />} autoScroll direction="right" />
                  <ProductSlider title="Best in Gaming" link="/search?category=gaming" products={sections.gamingProducts} icon={<Gamepad2 className="h-5 w-5 text-purple-500" />} autoScroll direction="left" />
                  <ProductSlider title="PCs & Laptops" link="/search?category=computers" products={sections.computerProducts} icon={<Monitor className="h-5 w-5 text-gray-700" />} autoScroll direction="right" />
                  <ProductSlider title="Electronics & Audio" link="/search?category=electronics" products={sections.electronicsProducts} icon={<Plug className="h-5 w-5 text-yellow-600" />} autoScroll direction="left" />
                  <ProductSlider title="Verified Cars" link="/search?category=cars" products={sections.carProducts} icon={<Car className="h-5 w-5 text-red-500" />} autoScroll direction="right" />
                  <ProductSlider title="Fashion & Style" link="/search?category=fashion" products={sections.fashionProducts} icon={<Shirt className="h-5 w-5 text-pink-500" />} autoScroll direction="left" />
                  <ProductSlider title="Beauty & Skincare" link="/search?category=beauty" products={sections.beautyProducts} icon={<Sparkles className="h-5 w-5 text-rose-400" />} autoScroll direction="right" />
                  <ProductSlider title="Home & Living" link="/category/home" products={sections.homeProducts} icon={<HomeIcon className="h-5 w-5 text-amber-600" />} autoScroll direction="left" />
                  <ProductSlider title="Appliances" link="/category/appliances" products={sections.applianceProducts} icon={<Plug className="h-5 w-5 text-orange-500" />} autoScroll direction="right" />
                  <ProductSlider title="Gym & Fitness" link="/category/fitness" products={sections.fitnessProducts} icon={<Dumbbell className="h-5 w-5 text-emerald-600" />} autoScroll direction="left" />
                  <ProductSlider title="Health & Medical" link="/category/health" products={sections.healthProducts} icon={<ShieldCheck className="h-5 w-5 text-blue-600" />} autoScroll direction="right" />
                  <ProductSlider title="Groceries & Baby Essentials" link="/category/grocery" products={sections.groceryProducts} icon={<ShoppingBasket className="h-5 w-5 text-green-600" />} autoScroll direction="left" />
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

// ─── Lazy Hydration Wrapper ───
// Prevents the browser from rendering off-screen sections until needed.
// This resolves the scrolling lag and white-space issues.
function LazySection({ children, height = 340, skeletonTitle }: { children: React.ReactNode; height?: number; skeletonTitle?: string }) {
  const [ref, setRef] = useState<HTMLElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!ref) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "1000px" } // Load 1000px before it enters the viewport for seamless rendering
    );
    observer.observe(ref);
    return () => observer.disconnect();
  }, [ref]);

  return (
    <div ref={setRef} style={{ minHeight: isVisible ? "auto" : `${height}px` }} className="transition-all duration-500">
      {isVisible ? (
        children
      ) : (
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-50 flex flex-col justify-center gap-4 group">
          <div className="flex items-center justify-between opacity-50">
            <div className="h-6 w-48 bg-gray-100 animate-pulse rounded" />
            <div className="h-4 w-24 bg-gray-50 animate-pulse rounded" />
          </div>
          <div className="flex gap-4 overflow-hidden">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="min-w-[200px] h-[300px] bg-gray-50/50 rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      )}
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
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const initOffsetDone = useRef(false);

  if (products.length === 0) return null;

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = scrollRef.current.clientWidth * 0.75;
    scrollRef.current.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  };

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (!autoScroll) return;
    const el = scrollRef.current;
    if (!el) return;

    // Wait a tick for layout, set initial offset for right-to-left
    if (!initOffsetDone.current && direction === "right") {
      setTimeout(() => {
        if (el) el.scrollLeft = el.scrollWidth / 3;
      }, 100);
      initOffsetDone.current = true;
    }

    const startAutoScroll = () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => {
        if (!el) return;
        const scrollAmount = direction === "left" ? 240 : -240;
        
        // Handle loop wrap around natively
        if (direction === "left" && el.scrollLeft >= el.scrollWidth / 3) {
          el.scrollLeft = 0;
        } else if (direction === "right" && el.scrollLeft <= 0) {
          el.scrollLeft = el.scrollWidth / 3;
        } else {
          el.scrollBy({ left: scrollAmount, behavior: "smooth" });
        }
      }, 3500);
    };

    if (!isHovered) {
      startAutoScroll();
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoScroll, isHovered, direction]);

  return (
    <div
      className="bg-white rounded-lg py-1.5 px-2 shadow-sm relative group/scroller"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
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

        <div ref={scrollRef} className="flex gap-2.5 overflow-x-auto scrollbar-hide pb-8 px-1" style={{ scrollBehavior: isHovered ? "smooth" : "auto" }}>
          {[...products, ...products, ...products].map((product, idx) => (
            <div key={`${product.id}-${idx}`} className="min-w-[190px] md:min-w-[220px] flex flex-col">
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}




function ProductSlider({ title, link, products, icon, autoScroll = false, direction = "left", isLoading = false }: { title: React.ReactNode; link: string; products: any[]; icon?: React.ReactNode; autoScroll?: boolean; direction?: "left" | "right", isLoading?: boolean }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const initOffsetDone = useRef(false);

  const checkScroll = () => {
    if (scrollRef.current && !autoScroll) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, [products]);

  // Auto-scroll effect
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (!autoScroll) return;
    const el = scrollRef.current;
    if (!el) return;

    // Set initial offset for right direction
    if (!initOffsetDone.current && direction === "right") {
      setTimeout(() => {
        if (el) el.scrollLeft = el.scrollWidth / 3;
      }, 100);
      initOffsetDone.current = true;
    }

    const startAutoScroll = () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => {
        if (!el) return;
        const scrollAmount = direction === "left" ? 220 : -220; // Approximately one card width
        
        // Handle native wrap around
        if (direction === "left" && el.scrollLeft >= el.scrollWidth / 3) {
          el.scrollLeft = 0;
        } else if (direction === "right" && el.scrollLeft <= 0) {
          el.scrollLeft = el.scrollWidth / 3;
        } else {
          el.scrollBy({ left: scrollAmount, behavior: "smooth" });
        }
      }, 3500);
    };

    if (!isPaused) {
      startAutoScroll();
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoScroll, isPaused, direction]);

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
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setTimeout(() => setIsPaused(false), 3000)}
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
            className="absolute -left-4 top-1/2 -translate-y-1/2 z-40 w-12 h-12 bg-white/20 backdrop-blur-[20px] border border-white/40 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.1)] flex items-center justify-center opacity-70 md:opacity-0 md:group-hover/slider:opacity-100 transition-all duration-500 hover:scale-110 active:scale-95 md:group-hover/slider:-translate-x-2"
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-6 w-6 text-gray-800 drop-shadow-sm" />
          </button>
        )}

        {/* Right Arrow */}
        {canScrollRight && !autoScroll && (
          <button
            onClick={() => scroll("right")}
            className="absolute -right-4 top-1/2 -translate-y-1/2 z-40 w-12 h-12 bg-white/20 backdrop-blur-[20px] border border-white/40 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.1)] flex items-center justify-center opacity-70 md:opacity-0 md:group-hover/slider:opacity-100 transition-all duration-500 hover:scale-110 active:scale-95 md:group-hover/slider:translate-x-2"
            aria-label="Scroll right"
          >
            <ChevronRight className="h-6 w-6 text-gray-800 drop-shadow-sm" />
          </button>
        )}

        <div
          ref={scrollRef}
          onScroll={!autoScroll ? checkScroll : undefined}
          className="flex gap-2 md:gap-2 overflow-x-auto pb-2 md:pb-4 scrollbar-hide snap-none items-stretch"
          style={{ scrollBehavior: isPaused ? "smooth" : "auto", paddingRight: autoScroll ? '0' : '1.5rem' }}
        >
          {displayProducts.map((product, idx) => (
            <div key={product ? `${product.id}-${idx}` : `skeleton-${idx}`} className="min-w-[180px] md:min-w-[220px] snap-center flex flex-col">
              {isLoading ? (
                <ProductCardSkeleton />
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
