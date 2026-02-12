"use client";

import { useState } from "react";
import Link from "next/link";
import { DEMO_PRODUCTS, DEMO_DEALS } from "@/lib/data";
import { ProductCard } from "@/components/product/ProductCard";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { PriceIntelModal } from "@/components/modals/PriceIntelModal";
import { useRef } from "react";

const CATEGORIES = [
  {
    name: "Smartphones",
    image: "https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?auto=format&fit=crop&w=400&q=80", // Corrected iPhone
    link: "/category/phones"
  },
  {
    name: "Certified Cars",
    image: "https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&w=400&q=80", // Tesla
    link: "/category/cars"
  },
  {
    name: "VDM Verified",
    image: "https://images.unsplash.com/photo-1519337265831-281ec6cc8514?auto=format&fit=crop&w=400&q=80", // High-end tech checkmark
    link: "/seller/verified"
  },
  {
    name: "Flash Deals",
    image: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=400&q=80", // Shopping/Deals
    link: "/deals"
  },
];

export default function Home() {
  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
  const productSectionRef = useRef<HTMLDivElement>(null);

  const fairPriceProducts = DEMO_PRODUCTS.filter(p => p.price_flag === "fair").slice(0, 6);
  const dealProducts = DEMO_DEALS.map(d => d.product).slice(0, 6);
  const gamingProducts = DEMO_PRODUCTS.filter(p => p.category === "gaming" || p.category === "electronics").slice(0, 6);
  const carProducts = DEMO_PRODUCTS.filter(p => p.category === "cars" || p.category === "automotive").slice(0, 6);
  const energyProducts = DEMO_PRODUCTS.filter(p => p.category === "energy" || p.category === "solar").slice(0, 6);

  const scrollToProducts = () => {
    productSectionRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground transition-all duration-700 flex flex-col overflow-x-hidden">
      <Navbar />

      {/* Main Background Wrapper with Ash to White Gradient */}
      <div className="flex-1 flex flex-col relative bg-gradient-to-b from-[var(--background-ash)] via-[var(--background-ash)] to-background/50">

        {/* Immersive Background Blobs for Glass Effects */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[20%] left-[-10%] w-[40%] h-[40%] bg-ratel-green-200/20 rounded-full blur-[120px] animate-pulse"></div>
          <div className="absolute top-[40%] right-[-10%] w-[40%] h-[40%] bg-ratel-orange/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
          <div className="absolute bottom-[20%] left-[20%] w-[30%] h-[30%] bg-blue-200/10 rounded-full blur-[100px]"></div>
        </div>

        <main className="flex-1 flex flex-col relative pb-10">
          <PriceIntelModal isOpen={isPriceModalOpen} onClose={() => setIsPriceModalOpen(false)} />

          {/* Apple-Style Hero Slider */}
          <section className="relative h-[650px] w-full overflow-hidden bg-black">
            {/* Background Image with Overlay */}
            <div className="absolute inset-0">
              <img
                src="/assets/images/image_v1.png"
                onError={(e) => e.currentTarget.src = "https://images.unsplash.com/photo-1556656793-02715d8dd6f8?auto=format&fit=crop&w=2000&q=80"}
                className="w-full h-full object-cover opacity-65"
                alt="Hero"
              />
              {/* Calibrated Overlay Gradient: Starts lower to blend with cards */}
              <div
                className="absolute inset-0 transition-colors duration-700"
                style={{
                  backgroundImage: 'linear-gradient(to bottom, transparent 0%, transparent 75%, var(--hero-overlay) 100%)'
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
                The <span className="bg-clip-text text-transparent bg-gradient-to-r from-ratel-green-400 to-emerald-400">Ratel Shop</span>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.8 }}
                className="text-xl md:text-3xl text-gray-200 mb-10 max-w-3xl mx-auto font-medium drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
              >
                Nigeria's first AI-regulated marketplace. <br className="hidden md:block" /> The future of Fair Pricing.
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

          {/* Categories Grid - Immersive Overlay */}
          <section className="container mx-auto px-4 -mt-24 relative z-20 pb-16">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {CATEGORIES.map((cat, i) => (
                <motion.div
                  key={cat.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="glass-card p-0 h-[280px] text-center cursor-pointer group hover:bg-white/40 dark:hover:bg-white/5 transition-all shadow-2xl overflow-hidden flex flex-col"
                >
                  <div className="flex-1 overflow-hidden relative">
                    <img
                      src={cat.image}
                      alt={cat.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                  </div>
                  <div className="p-6 bg-white/20 backdrop-blur-md border-t border-white/20">
                    <h3 className="text-lg font-bold text-ratel-green-600 group-hover:text-ratel-orange transition-colors tracking-tight">{cat.name}</h3>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>

          {/* Product Sliders */}
          <div ref={productSectionRef} className="container mx-auto px-4 space-y-12">
            {/* Auto-Scrolling Deals Section */}
            <AutoScrollingSlider title="Today's Top Deals" link="/deals" products={dealProducts} />

            <ProductSlider title="VDM Verified Fair Prices" link="/seller/verified" products={fairPriceProducts} />
            <ProductSlider title="Best in Gaming" link="/category/gaming" products={gamingProducts} />
            <ProductSlider title="Premium Certified Cars" link="/category/cars" products={carProducts} />
          </div>
        </main>

        <section className="container mx-auto px-4 py-16 border-t border-border/50 transition-colors bg-background/30 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-10">
            <h2 className="text-3xl font-black tracking-tight text-foreground">Solar Energy & Power</h2>
            <Link href="/category/energy" className="text-ratel-green-600 dark:text-ratel-green-400 hover:text-ratel-orange flex items-center gap-1 font-bold transition-colors text-lg">
              See all <ChevronRight className="h-5 w-5" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {energyProducts.slice(0, 3).map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
}

function AutoScrollingSlider({ title, link, products }: { title: string, link: string, products: any[] }) {
  if (products.length === 0) return null;

  // Duplicate products for infinite scroll
  const doubledProducts = [...products, ...products, ...products];

  return (
    <div className="py-8 overflow-hidden">
      <div className="flex items-center gap-4 mb-8 px-4">
        <h2 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
          {title} <span className="text-ratel-orange animate-pulse">🔥</span>
        </h2>
        <Link href={link} className="text-base text-ratel-green-600 dark:text-ratel-green-400 hover:underline ml-auto flex items-center font-bold">
          See more <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="relative">
        <motion.div
          className="flex gap-6 pointer-events-auto"
          animate={{ x: [0, -1500] }}
          transition={{
            duration: 30,
            repeat: Infinity,
            ease: "linear",
            repeatType: "loop"
          }}
          style={{ width: "fit-content" }}
        >
          {doubledProducts.map((product, idx) => (
            <div key={`${product.id}-${idx}`} className="min-w-[300px]">
              <ProductCard product={product} />
            </div>
          ))}
        </motion.div>

        {/* Edge Fades for a premium look */}
        <div className="absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-[var(--background-ash)] to-transparent z-10 pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-[var(--background-ash)] to-transparent z-10 pointer-events-none" />
      </div>
    </div>
  );
}

function ProductSlider({ title, link, products }: { title: string, link: string, products: any[] }) {
  if (products.length === 0) return null;
  return (
    <div className="bg-transparent py-8 transition-all">
      <div className="flex items-center gap-4 mb-8">
        <h2 className="text-2xl font-black tracking-tight text-foreground">{title}</h2>
        <Link href={link} className="text-base text-ratel-green-600 dark:text-ratel-green-400 hover:underline ml-auto flex items-center font-bold">
          See more <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="flex gap-6 overflow-x-auto pb-6 scrollbar-hide snap-x">
        {products.map((product) => (
          <div key={product.id} className="min-w-[300px] snap-center">
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </div>
  );
}
