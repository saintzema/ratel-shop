"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { DEMO_DEALS } from "@/lib/data";
import { DemoStore } from "@/lib/demo-store";
import { ProductCard } from "@/components/product/ProductCard";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ChevronRight, ChevronLeft, Heart, Plus, ShoppingCart, Flame, ShieldCheck, Smartphone, Gamepad2, Monitor, Plug, Car, Shirt, Sparkles, Home as HomeIcon, Dumbbell, ShoppingBasket, Star, Store as StoreIcon, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { PriceIntelModal } from "@/components/modals/PriceIntelModal";
import { RecommendedProducts } from "@/components/ui/RecommendedProducts";
import { useFavorites } from "@/context/FavoritesContext";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/utils";
import { Product } from "@/lib/types";

// ─── Amazon-Style 2×2 Category Grid Card Data ────────────────

interface SubCategory {
  label: string;
  image: string;
  href: string;
}

interface CategoryCard {
  title: string;
  link: string;
  linkText: string;
  subs: SubCategory[];
}

const CATEGORY_CARDS_ROW_1: CategoryCard[] = [
  {
    title: "Top in Phones",
    link: "/search?category=phones",
    linkText: "See all phones",
    subs: [
      { label: "Samsung", image: "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=200&h=200&fit=crop", href: "/search?category=phones&q=samsung" },
      { label: "iPhones", image: "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=200&h=200&fit=crop", href: "/search?category=phones&q=iphone" },
      { label: "Tablets", image: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=200&h=200&fit=crop", href: "/search?category=computers&q=tablet" },
      { label: "Accessories", image: "https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=200&h=200&fit=crop", href: "/search?category=electronics&q=airpods" },
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

// ─── Component ──────────────────────────────────────────────

export default function Home() {
  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
  const productSectionRef = useRef<HTMLDivElement>(null);

  // Live products from DemoStore — load only on client to avoid SSR hydration mismatch
  const [allProducts, setAllProducts] = useState<import("@/lib/types").Product[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const refresh = () => setAllProducts(DemoStore.getApprovedProducts().filter(p => p.is_active));
    refresh(); // Initial load on client
    setMounted(true);
    window.addEventListener("storage", refresh);
    window.addEventListener("demo-store-update", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("demo-store-update", refresh);
    };
  }, []);

  const fairPriceProducts = allProducts.filter(p => p.price_flag === "fair").slice(0, 30);
  const dealProducts = DEMO_DEALS.map(d => d.product).slice(0, 30);
  const phonesProducts = allProducts.filter(p => ["phones", "smartwatch"].includes(p.category || "")).slice(0, 12);
  const gamingProducts = allProducts.filter(p => ["gaming", "computers"].includes(p.category || "")).slice(0, 12);
  const computerProducts = allProducts.filter(p => ["computers", "office"].includes(p.category || "")).slice(0, 12);
  const carProducts = allProducts.filter(p => ["cars", "automotive"].includes(p.category || "")).slice(0, 12);
  const fashionProducts = allProducts.filter(p => ["fashion", "textiles"].includes(p.category || "")).slice(0, 12);
  const beautyProducts = allProducts.filter(p => ["beauty"].includes(p.category || "")).slice(0, 12);
  const homeProducts = allProducts.filter(p => ["home", "furniture"].includes(p.category || "")).slice(0, 12);
  const electronicsProducts = allProducts.filter(p => ["electronics", "energy", "solar"].includes(p.category || "")).slice(0, 12);
  const fitnessProducts = allProducts.filter(p => ["fitness", "sports"].includes(p.category || "")).slice(0, 12);
  const groceryProducts = allProducts.filter(p => ["grocery", "baby"].includes(p.category || "")).slice(0, 12);
  const topPicks = allProducts.slice(0, 30);

  // ─── From Stores You Follow ──────────────
  const { favoriteStores } = useFavorites();
  const followedStoreProducts = mounted ? (() => {
    if (favoriteStores.length === 0) return [];
    const sellers = DemoStore.getSellers();
    const followedSellerIds = new Set(favoriteStores);
    return allProducts.filter(p => {
      const seller = sellers.find(s => s.id === p.seller_id);
      return seller && followedSellerIds.has(seller.id);
    }).slice(0, 12);
  })() : [];

  const scrollToProducts = () => {
    productSectionRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-[#E3E6E6] text-foreground transition-all duration-700 flex flex-col overflow-x-hidden font-sans">
      <Navbar />

      <div className="flex-1 flex flex-col relative">
        <main className="flex-1 flex flex-col relative">
          <PriceIntelModal isOpen={isPriceModalOpen} onClose={() => setIsPriceModalOpen(false)} />

          {/* ─── Hero Section ─── */}
          <section className="relative h-[380px] w-full overflow-hidden bg-black">
            <div className="absolute inset-0">
              <img

                src="/assets/images/image_v1.png"
                onError={(e) => e.currentTarget.src = "https://images.unsplash.com/photo-1556656793-02715d8dd6f8?auto=format&fit=crop&w=2000&q=80"}
                className="w-full h-full object-cover opacity-65"
                alt="Hero"
              />
              <div
                className="absolute inset-0 transition-colors duration-700"
                style={{
                  backgroundImage: 'linear-gradient(to bottom, transparent 0%, transparent 60%, #E3E6E6 100%)'
                }}
              />
            </div>

            <div className="relative container mx-auto h-full flex flex-col justify-center px-6 text-center text-white z-10">
              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="text-5xl md:text-7xl font-black tracking-tighter mb-8 text-balance drop-shadow-2xl"
              >
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand-green-400 to-emerald-400">Fair</span>Price
              </motion.h1>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className="flex justify-center"
              >
                <Button
                  size="lg"
                  variant="apple-glass"
                  className="rounded-full px-10 py-7 text-xl backdrop-blur-md border-white/30 hover:bg-white transition-all hover:scale-105 shadow-xl text-white hover:text-gray-900 group"
                  onClick={() => setIsPriceModalOpen(true)}
                >
                  <span className="group-hover:text-gray-900 transition-colors duration-300">Calculate Fair Price</span> <span className="ml-2">✨</span>
                </Button>
              </motion.div>
            </div>
          </section>

          {/* ─── Content Body ─── */}
          <div ref={productSectionRef} className="relative z-20 -mt-16">

            {/* ═══ Best Sellers Horizontal Scroller: Top Picks ═══ */}
            {mounted && (
              <section className="container mx-auto px-4 mb-6 relative z-40">
                <BestSellersScroller title="Trending in Nigeria" link="/search" products={topPicks} icon={<TrendingUp className="h-5 w-5 text-brand-green-600" />} autoScroll={true} />
              </section>
            )}

            {/* ═══ Horizontal Sliding Products in Categories ═══ */}
            {/* (Replaced 2x2 grids with existing ProductSliders below) */}

            {/* ═══ Best Sellers Horizontal Scroller: Today's Deals ═══ */}
            <section className="container mx-auto px-4 mb-6">
              <BestSellersScroller title="Today's Hottest Deals" link="/deals" products={dealProducts} icon={<Flame className="h-5 w-5 text-orange-500" />} autoScroll />
            </section>

            {/* Category Cards Row 2 Removed */}

            {/* ═══ From Stores You Follow ═══ */}
            {mounted && followedStoreProducts.length > 0 && (
              <section className="container mx-auto px-4 mb-6">
                <BestSellersScroller title="From Stores You Follow" link="/account/lists" products={followedStoreProducts} icon={<StoreIcon className="h-5 w-5 text-brand-green-600" />} />
              </section>
            )}

            {/* Category Cards Row 3 Removed */}

            {/* ═══ Product Slider Sections ═══ */}
            {mounted && (
              <section className="container mx-auto px-4 space-y-6 mb-6">
                <ProductSlider title="Verified Fair Prices" link="/search?verified=true" products={fairPriceProducts} icon={<ShieldCheck className="h-5 w-5 text-brand-green-600" />} />
                <ProductSlider title="Phones & Tablets" link="/search?category=phones" products={phonesProducts} icon={<Smartphone className="h-5 w-5 text-blue-500" />} />
                <ProductSlider title="Best in Gaming" link="/search?category=gaming" products={gamingProducts} icon={<Gamepad2 className="h-5 w-5 text-purple-500" />} />
                <ProductSlider title="Computers & Laptops" link="/search?category=computers" products={computerProducts} icon={<Monitor className="h-5 w-5 text-gray-700" />} />
                <ProductSlider title="Electronics & Audio" link="/search?category=electronics" products={electronicsProducts} icon={<Plug className="h-5 w-5 text-yellow-600" />} />
                <ProductSlider title="Premium Certified Cars" link="/search?category=cars" products={carProducts} icon={<Car className="h-5 w-5 text-red-500" />} />
                <ProductSlider title="Fashion & Style" link="/search?category=fashion" products={fashionProducts} icon={<Shirt className="h-5 w-5 text-pink-500" />} />
                <ProductSlider title="Beauty & Skincare" link="/search?category=beauty" products={beautyProducts} icon={<Sparkles className="h-5 w-5 text-rose-400" />} />
                <ProductSlider title="Home & Living" link="/search?category=home" products={homeProducts} icon={<HomeIcon className="h-5 w-5 text-amber-600" />} />
                <ProductSlider title="Gym & Fitness" link="/search?category=fitness" products={fitnessProducts} icon={<Dumbbell className="h-5 w-5 text-emerald-600" />} />
                <ProductSlider title="Groceries & Baby Essentials" link="/search?category=grocery" products={groceryProducts} icon={<ShoppingBasket className="h-5 w-5 text-green-600" />} />
              </section>
            )}

            {/* ═══ Global Recommended Products ═══ */}
            {mounted && (
              <section className="container mx-auto px-4 mb-12">
                <RecommendedProducts products={topPicks} title="Recommended For You" subtitle="Based on your browsing history" />
              </section>
            )}
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
            <span className="text-xs font-medium text-gray-600 group-hover/tile:text-brand-green-600 transition-colors text-center leading-tight">
              {sub.label}
            </span>
          </Link>
        ))}
      </div>

      {/* Bottom Link */}
      <Link
        href={card.link}
        className="text-sm font-semibold text-blue-600 hover:text-brand-orange hover:underline mt-4 inline-block transition-colors"
      >
        {card.linkText}
      </Link>
    </motion.div>
  );
}


// ─── BestSellersScroller (Full-Width Amazon-Style Horizontal Scroller) ───

function BestSellersScroller({ title, link, products, icon, autoScroll = false }: { title: string; link: string; products: any[]; icon?: React.ReactNode; autoScroll?: boolean }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  if (products.length === 0) return null;

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = scrollRef.current.clientWidth * 0.75;
    scrollRef.current.scrollBy({ left: direction === "left" ? -amount : amount, behavior: "smooth" });
  };

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (!autoScroll) return;
    const el = scrollRef.current;
    if (!el) return;

    const startAutoScroll = () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => {
        if (!el) return;
        // Infinite loop technique: reset scroll when it reaches 1/3 since we have 3 copies
        if (el.scrollLeft >= el.scrollWidth / 3) {
          el.scrollLeft = 0;
        } else {
          el.scrollLeft += 1;
        }
      }, 30);
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
  }, [autoScroll, isHovered]);

  return (
    <div
      className="bg-white rounded-lg p-5 shadow-sm relative group/scroller"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
          {icon && <span className="shrink-0">{icon}</span>}
          {title}
        </h2>
        <Link href={link} className="text-sm font-semibold text-blue-600 hover:text-brand-orange hover:underline flex items-center gap-0.5 transition-colors">
          See all <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="relative">
        {/* Scroll Arrows */}
        <button
          onClick={() => scroll("left")}
          className="absolute -left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-20 bg-white/90 border border-gray-200 rounded-md shadow-lg flex items-center justify-center opacity-0 group-hover/scroller:opacity-100 transition-opacity hover:bg-gray-100"
          aria-label="Scroll left"
        >
          <ChevronLeft className="h-5 w-5 text-gray-700" />
        </button>
        <button
          onClick={() => scroll("right")}
          className="absolute -right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-20 bg-white/90 border border-gray-200 rounded-md shadow-lg flex items-center justify-center opacity-0 group-hover/scroller:opacity-100 transition-opacity hover:bg-gray-100"
          aria-label="Scroll right"
        >
          <ChevronRight className="h-5 w-5 text-gray-700" />
        </button>

        <div ref={scrollRef} className="flex gap-4 overflow-x-auto scrollbar-hide pb-2" style={{ scrollBehavior: isHovered ? "smooth" : "auto" }}>
          {[...products, ...products, ...products].map((product, idx) => (
            <ScrollerProductCard key={`${product.id}-${idx}`} product={product} />
          ))}
        </div>
      </div>
    </div>
  );
}


// ─── ScrollerProductCard (Product Tile with Heart for BestSellers) ───

function ScrollerProductCard({ product }: { product: any }) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const { addToCart } = useCart();
  const [showHeartBurst, setShowHeartBurst] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const lastTapRef = useRef(0);
  const liked = isFavorite(product.id);

  const handleDoubleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 350) {
      if (!liked) toggleFavorite(product.id);
      setShowHeartBurst(true);
      setTimeout(() => setShowHeartBurst(false), 800);
    }
    lastTapRef.current = now;
  }, [liked, product.id, toggleFavorite]);

  const handleHeartClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(product.id);
    if (!liked) {
      setShowHeartBurst(true);
      setTimeout(() => setShowHeartBurst(false), 800);
    }
  }, [liked, product.id, toggleFavorite]);

  const handleAddToCart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product);
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 1200);
  }, [addToCart, product]);

  return (
    <div className="min-w-[200px] max-w-[200px] md:min-w-[220px] md:max-w-[220px] h-[340px] shrink-0 group/item relative flex flex-col justify-between bg-white rounded-xl shadow-none hover:shadow-lg transition-shadow duration-300 border border-transparent hover:border-brand-green-200 p-2 pb-3">
      <Link href={`/product/${product.id}`} className="flex flex-col flex-1 h-full relative">
        <div
          className="w-full h-[200px] bg-gray-50 rounded-lg overflow-hidden mb-3 relative shrink-0"
          onClick={handleDoubleTap}
        >
          {/* Sponsored Ad Tag */}
          {product.is_sponsored && (
            <div className="absolute top-0 left-0 z-40 bg-black/85 backdrop-blur-md text-white px-2.5 py-1 text-[8px] font-black uppercase tracking-widest rounded-tl-lg rounded-br-lg shadow-md border-b border-r border-white/10 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-green-400 animate-pulse" /> Ad
            </div>
          )}
          <img
            src={product.image_url || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect fill='%23e5e7eb' width='400' height='400'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%239ca3af' font-size='14'%3ENo Image%3C/text%3E%3C/svg%3E"}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover/item:scale-110"
            loading="lazy"
          />
          {/* Heart burst animation */}
          {showHeartBurst && (
            <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
              <Heart className="h-14 w-14 text-red-500 fill-red-500 animate-heart-burst drop-shadow-lg" />
            </div>
          )}
        </div>
        <p className="text-sm text-gray-800 line-clamp-2 font-medium leading-snug group-hover/item:text-brand-green-600 transition-colors pr-6">
          {product.name}
        </p>
      </Link>
      {/* Price + Add to Cart row */}
      <div className="flex flex-col mt-auto gap-2 shrink-0">
        <span className="text-base font-black text-gray-900">{formatPrice(product.price)}</span>
        <Button
          size="sm"
          onClick={handleAddToCart}
          className={`w-full text-xs font-bold h-9 rounded-lg shadow-sm transition-all duration-300 flex items-center justify-center gap-1 cursor-pointer active:scale-95 ${addedToCart
            ? "bg-emerald-600 text-white"
            : "bg-brand-green-600 hover:bg-brand-green-700 text-white hover:shadow-md"
            }`}
        >
          {addedToCart ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
              Added
            </>
          ) : (
            <>
              <ShoppingCart className="h-4 w-4 shrink-0" strokeWidth={2.5} />
              Add to Cart
            </>
          )}
        </Button>
      </div>
      {/* Persistent heart button */}
      <button
        onClick={handleHeartClick}
        className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-md hover:scale-110 transition-transform"
        aria-label={liked ? "Remove from favorites" : "Add to favorites"}
      >
        <Heart className={`h-4 w-4 transition-colors ${liked ? "fill-red-500 text-red-500" : "text-gray-400 hover:text-red-400"}`} />
      </button>
    </div>
  );
}

function ProductSlider({ title, link, products, icon }: { title: string; link: string; products: any[]; icon?: React.ReactNode }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (scrollRef.current) {
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

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = direction === "left" ? -300 : 300;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
      setTimeout(checkScroll, 350);
    }
  };

  if (products.length === 0) return null;

  return (
    <div className="bg-white rounded-lg p-4 md:p-5 shadow-sm relative group/slider">
      <div className="flex items-center gap-4 mb-4 md:mb-6">
        <h2 className="text-lg md:text-xl font-extrabold tracking-tight text-gray-900 line-clamp-1 flex items-center gap-2">
          {icon && <span className="shrink-0">{icon}</span>}
          {title}
        </h2>
        <Link href={link} className="text-xs md:text-sm text-blue-600 hover:text-brand-orange hover:underline ml-auto flex items-center font-semibold transition-colors whitespace-nowrap">
          See more <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="relative">
        {/* Left Arrow */}
        {canScrollLeft && (
          <button
            onClick={() => scroll("left")}
            className="absolute left-0 top-1/2 -translate-y-1/2 -ml-2 z-10 bg-white/90 backdrop-blur-sm border border-gray-100 shadow-lg rounded-full p-2 text-gray-800 hover:text-brand-orange transition-all opacity-0 group-hover/slider:opacity-100 transform scale-90 hover:scale-100"
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}

        {/* Right Arrow */}
        {canScrollRight && (
          <button
            onClick={() => scroll("right")}
            className="absolute right-0 top-1/2 -translate-y-1/2 -mr-2 z-10 bg-white/90 backdrop-blur-sm border border-gray-100 shadow-lg rounded-full p-2 text-gray-800 hover:text-brand-orange transition-all opacity-0 group-hover/slider:opacity-100 transform scale-90 hover:scale-100"
            aria-label="Scroll right"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        )}

        <div
          ref={scrollRef}
          onScroll={checkScroll}
          className="flex gap-4 md:gap-5 overflow-x-auto pb-4 scrollbar-hide snap-x scroll-smooth items-stretch"
        >
          {products.map((product) => (
            <div key={product.id} className="min-w-[180px] md:min-w-[220px] snap-center flex flex-col">
              <ProductCard product={product} className="h-full w-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
