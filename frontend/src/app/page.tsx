"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { DEMO_PRODUCTS, DEMO_DEALS } from "@/lib/data";
import { ProductCard } from "@/components/product/ProductCard";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { motion } from "framer-motion";
import { PriceIntelModal } from "@/components/modals/PriceIntelModal";

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
      { label: "Inverters", image: "https://images.unsplash.com/photo-1697524941901-700e40561c28?w=200&h=200&fit=crop", href: "/search?category=energy&q=inverter" },
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
      { label: "Skincare", image: "https://images.unsplash.com/photo-1607611634560-637953298c9f?w=200&h=200&fit=crop", href: "/search?category=beauty&q=skincare" },
      { label: "Makeup", image: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=200&h=200&fit=crop", href: "/search?category=beauty&q=makeup" },
      { label: "Fragrance", image: "https://images.unsplash.com/photo-1541643600914-78b084683601?w=200&h=200&fit=crop", href: "/search?category=beauty&q=fragrance" },
      { label: "Hair Care", image: "https://images.unsplash.com/photo-1522338242992-e1a54571a9f7?w=200&h=200&fit=crop", href: "/search?category=beauty&q=hair" },
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
      { label: "Accessories", image: "https://images.unsplash.com/photo-1449130427888-28e206b8a8b8?w=200&h=200&fit=crop", href: "/search?category=cars&q=accessories" },
      { label: "Tires", image: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=200&h=200&fit=crop", href: "/search?category=cars&q=tires" },
    ],
  },
];

// ─── Component ──────────────────────────────────────────────

export default function Home() {
  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
  const productSectionRef = useRef<HTMLDivElement>(null);

  const fairPriceProducts = DEMO_PRODUCTS.filter(p => p.price_flag === "fair").slice(0, 8);
  const dealProducts = DEMO_DEALS.map(d => d.product).slice(0, 8);
  const gamingProducts = DEMO_PRODUCTS.filter(p => p.category === "gaming" || p.category === "electronics").slice(0, 8);
  const carProducts = DEMO_PRODUCTS.filter(p => p.category === "cars" || p.category === "automotive").slice(0, 8);
  const topPicks = DEMO_PRODUCTS.slice(0, 10);

  const scrollToProducts = () => {
    productSectionRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-[#E3E6E6] dark:bg-zinc-950 text-foreground transition-all duration-700 flex flex-col overflow-x-hidden font-sans">
      <Navbar />

      <div className="flex-1 flex flex-col relative">
        <main className="flex-1 flex flex-col relative">
          <PriceIntelModal isOpen={isPriceModalOpen} onClose={() => setIsPriceModalOpen(false)} />

          {/* ─── Hero Section ─── */}
          <section className="relative h-[600px] w-full overflow-hidden bg-black">
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
                className="text-6xl md:text-8xl font-black tracking-tighter mb-6 text-balance drop-shadow-2xl"
              >
                The <span className="bg-clip-text text-transparent bg-gradient-to-r from-ratel-green-400 to-emerald-400">Ratel</span> Shop
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.8 }}
                className="text-xl md:text-3xl text-gray-200 mb-10 max-w-3xl mx-auto font-medium drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
              >
                Nigeria's first AI-regulated marketplace. <br className="hidden md:block" /> The future of Fair Pricing
              </motion.p>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 }}
                className="flex flex-col md:flex-row justify-center gap-6"
              >
                <Button
                  size="lg"
                  className="rounded-full px-10 py-7 text-xl bg-white text-black hover:bg-gray-200 border-none shadow-2xl transition-all hover:scale-105"
                  onClick={scrollToProducts}
                >
                  Start Shopping
                </Button>
                <Button
                  size="lg"
                  variant="apple-glass"
                  className="rounded-full px-10 py-7 text-xl backdrop-blur-md border-white/30 hover:bg-white/10 transition-all hover:scale-105 shadow-xl"
                  onClick={() => setIsPriceModalOpen(true)}
                >
                  Calculate Fair Price <span className="ml-2">✨</span>
                </Button>
              </motion.div>
            </div>
          </section>

          {/* ─── Content Body ─── */}
          <div ref={productSectionRef} className="relative z-20 -mt-16">

            {/* ═══ ROW 1: Category Grid Cards ═══ */}
            <section className="container mx-auto px-4 mb-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {CATEGORY_CARDS_ROW_1.map((card, i) => (
                  <CategoryGridCard key={card.title} card={card} delay={i * 0.08} />
                ))}
              </div>
            </section>

            {/* ═══ Best Sellers Horizontal Scroller: Top Picks ═══ */}
            <section className="container mx-auto px-4 mb-6">
              <BestSellersScroller title="Top Picks for Nigeria 🇳🇬" link="/search" products={topPicks} />
            </section>

            {/* ═══ ROW 2: Category Grid Cards ═══ */}
            <section className="container mx-auto px-4 mb-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {CATEGORY_CARDS_ROW_2.map((card, i) => (
                  <CategoryGridCard key={card.title} card={card} delay={i * 0.08} />
                ))}
              </div>
            </section>

            {/* ═══ Best Sellers Horizontal Scroller: Today's Deals ═══ */}
            <section className="container mx-auto px-4 mb-6">
              <BestSellersScroller title="Today's Top Deals" link="/deals" products={dealProducts} emoji="🔥" />
            </section>

            {/* ═══ Product Slider Sections ═══ */}
            <section className="container mx-auto px-4 space-y-6 mb-6">
              <ProductSlider title="VDM Verified Fair Prices" link="/search?verified=true" products={fairPriceProducts} />
              <ProductSlider title="Best in Gaming" link="/search?category=gaming" products={gamingProducts} />
              <ProductSlider title="Premium Certified Cars" link="/search?category=cars" products={carProducts} />
            </section>
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
      className="bg-white dark:bg-zinc-900 rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow duration-300 flex flex-col"
    >
      {/* Title */}
      <h3 className="text-lg font-extrabold text-gray-900 dark:text-white mb-4 tracking-tight leading-tight">
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
            <div className="w-full aspect-square rounded-md overflow-hidden bg-gray-50 dark:bg-zinc-800 mb-1.5 relative">
              <img
                src={sub.image}
                alt={sub.label}
                className="w-full h-full object-cover transition-transform duration-500 group-hover/tile:scale-110"
                loading="lazy"
              />
            </div>
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400 group-hover/tile:text-ratel-green-600 dark:group-hover/tile:text-ratel-green-400 transition-colors text-center leading-tight">
              {sub.label}
            </span>
          </Link>
        ))}
      </div>

      {/* Bottom Link */}
      <Link
        href={card.link}
        className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-ratel-orange dark:hover:text-ratel-orange hover:underline mt-4 inline-block transition-colors"
      >
        {card.linkText}
      </Link>
    </motion.div>
  );
}


// ─── BestSellersScroller (Full-Width Amazon-Style Horizontal Scroller) ───

function BestSellersScroller({ title, link, products, emoji }: { title: string; link: string; products: any[]; emoji?: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  if (products.length === 0) return null;

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = scrollRef.current.clientWidth * 0.75;
    scrollRef.current.scrollBy({ left: direction === "left" ? -amount : amount, behavior: "smooth" });
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg p-5 shadow-sm relative group/scroller">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-extrabold text-gray-900 dark:text-white tracking-tight">
          {title} {emoji && <span className="ml-1">{emoji}</span>}
        </h2>
        <Link href={link} className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-ratel-orange hover:underline flex items-center gap-0.5 transition-colors">
          See all <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="relative">
        {/* Scroll Arrows */}
        <button
          onClick={() => scroll("left")}
          className="absolute -left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-20 bg-white/90 dark:bg-zinc-800/90 border border-gray-200 dark:border-zinc-700 rounded-md shadow-lg flex items-center justify-center opacity-0 group-hover/scroller:opacity-100 transition-opacity hover:bg-gray-100"
          aria-label="Scroll left"
        >
          <ChevronLeft className="h-5 w-5 text-gray-700 dark:text-gray-300" />
        </button>
        <button
          onClick={() => scroll("right")}
          className="absolute -right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-20 bg-white/90 dark:bg-zinc-800/90 border border-gray-200 dark:border-zinc-700 rounded-md shadow-lg flex items-center justify-center opacity-0 group-hover/scroller:opacity-100 transition-opacity hover:bg-gray-100"
          aria-label="Scroll right"
        >
          <ChevronRight className="h-5 w-5 text-gray-700 dark:text-gray-300" />
        </button>

        <div ref={scrollRef} className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth pb-2">
          {products.map((product) => (
            <Link
              key={product.id}
              href={`/product/${product.id}`}
              className="min-w-[160px] max-w-[160px] shrink-0 group/item"
            >
              <div className="aspect-square bg-gray-50 dark:bg-zinc-800 rounded-md overflow-hidden mb-2 border border-gray-100 dark:border-zinc-700">
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal p-2 transition-transform duration-300 group-hover/item:scale-110"
                  loading="lazy"
                />
              </div>
              <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-2 font-medium leading-tight group-hover/item:text-ratel-green-600 transition-colors">
                {product.name}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}


// ─── ProductSlider (Existing Product Card Scroller) ───

function ProductSlider({ title, link, products }: { title: string; link: string; products: any[] }) {
  if (products.length === 0) return null;
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg p-5 shadow-sm">
      <div className="flex items-center gap-4 mb-6">
        <h2 className="text-lg font-extrabold tracking-tight text-gray-900 dark:text-white">{title}</h2>
        <Link href={link} className="text-sm text-blue-600 dark:text-blue-400 hover:text-ratel-orange hover:underline ml-auto flex items-center font-semibold transition-colors">
          See more <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="flex gap-5 overflow-x-auto pb-4 scrollbar-hide snap-x scroll-smooth">
        {products.map((product) => (
          <div key={product.id} className="min-w-[280px] snap-center">
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </div>
  );
}
