"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { DEMO_PRODUCTS, DEMO_DEALS } from "@/lib/data";
import { formatPrice } from "@/lib/utils";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ProductCard } from "@/components/product/ProductCard";
import { Clock, Flame, Tag, Percent, ChevronRight, Zap } from "lucide-react";

export default function DealsPage() {
    const [sortBy, setSortBy] = useState<"discount" | "price-low" | "price-high" | "popular">("discount");

    // Get active deals with their products
    const activeDeals = useMemo(() => {
        const now = new Date();
        return DEMO_DEALS
            .filter(d => d.is_active && new Date(d.end_at) > now)
            .map(deal => {
                const product = DEMO_PRODUCTS.find(p => p.id === deal.product_id);
                if (!product) return null;
                const discountedPrice = Math.round(product.price * (1 - deal.discount_pct / 100));
                return {
                    ...deal,
                    product,
                    discountedPrice,
                    savings: product.price - discountedPrice,
                };
            })
            .filter(Boolean) as Array<{
                id: string;
                product_id: string;
                product: typeof DEMO_PRODUCTS[0];
                discount_pct: number;
                discountedPrice: number;
                savings: number;
                start_at: string;
                end_at: string;
                is_active: boolean;
            }>;
    }, []);

    // Also find products with significant price drops (original > price) that aren't already in deals
    const priceDropProducts = useMemo(() => {
        const dealProductIds = new Set(activeDeals.map(d => d.product_id));
        return DEMO_PRODUCTS
            .filter(p => p.original_price && p.original_price > p.price && !dealProductIds.has(p.id))
            .map(p => ({
                product: p,
                discount_pct: Math.round(((p.original_price! - p.price) / p.original_price!) * 100),
                savings: p.original_price! - p.price,
            }))
            .sort((a, b) => b.discount_pct - a.discount_pct);
    }, [activeDeals]);

    // Sort deals
    const sortedDeals = useMemo(() => {
        const items = [...activeDeals];
        switch (sortBy) {
            case "discount": return items.sort((a, b) => b.discount_pct - a.discount_pct);
            case "price-low": return items.sort((a, b) => a.discountedPrice - b.discountedPrice);
            case "price-high": return items.sort((a, b) => b.discountedPrice - a.discountedPrice);
            case "popular": return items.sort((a, b) => b.product.sold_count - a.product.sold_count);
            default: return items;
        }
    }, [activeDeals, sortBy]);

    // Countdown timer for deals
    const getTimeRemaining = (endAt: string) => {
        const diff = new Date(endAt).getTime() - Date.now();
        if (diff <= 0) return "Expired";
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        if (hours > 24) {
            const days = Math.floor(hours / 24);
            return `${days}d ${hours % 24}h left`;
        }
        return `${hours}h ${mins}m left`;
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <Navbar />

            <main className="flex-1">
                {/* Hero Banner */}
                <section className="bg-gradient-to-r from-orange-600 via-red-500 to-pink-500 text-white py-10 md:py-14">
                    <div className="container mx-auto px-4 text-center">
                        <div className="flex items-center justify-center gap-2 mb-3">
                            <Flame className="h-8 w-8 animate-pulse" />
                            <h1 className="text-3xl md:text-5xl font-black tracking-tight">Today&apos;s Deals</h1>
                            <Flame className="h-8 w-8 animate-pulse" />
                        </div>
                        <p className="text-white/80 text-lg md:text-xl max-w-lg mx-auto">
                            Limited-time offers on your favourite products. Don&apos;t miss out!
                        </p>
                        <div className="flex items-center justify-center gap-6 mt-6 text-sm">
                            <div className="flex items-center gap-1.5 bg-white/15 rounded-full px-4 py-2">
                                <Zap className="h-4 w-4" />
                                <span className="font-bold">{activeDeals.length} Active Deals</span>
                            </div>
                            <div className="flex items-center gap-1.5 bg-white/15 rounded-full px-4 py-2">
                                <Percent className="h-4 w-4" />
                                <span className="font-bold">Up to {Math.max(...activeDeals.map(d => d.discount_pct), 0)}% OFF</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Flash Deals */}
                {sortedDeals.length > 0 && (
                    <section className="container mx-auto px-4 py-8">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-red-500 flex items-center justify-center">
                                    <Zap className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-gray-900">Flash Deals</h2>
                                    <p className="text-sm text-gray-500">Hurry — these deals are ending soon!</p>
                                </div>
                            </div>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                                className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 font-medium"
                            >
                                <option value="discount">Biggest Discount</option>
                                <option value="price-low">Price: Low to High</option>
                                <option value="price-high">Price: High to Low</option>
                                <option value="popular">Most Popular</option>
                            </select>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                            {sortedDeals.map((deal) => (
                                <div key={deal.id} className="relative">
                                    {/* Discount badge */}
                                    <div className="absolute top-2 left-2 z-10 bg-red-500 text-white text-xs font-black px-2 py-1 rounded-lg shadow-md flex items-center gap-1">
                                        <Percent className="h-3 w-3" /> {deal.discount_pct}% OFF
                                    </div>
                                    {/* Countdown */}
                                    <div className="absolute top-2 right-2 z-10 bg-black/70 text-white text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1 backdrop-blur-sm">
                                        <Clock className="h-3 w-3" /> {getTimeRemaining(deal.end_at)}
                                    </div>
                                    <ProductCard product={{ ...deal.product, price: deal.discountedPrice, original_price: deal.product.price }} />
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Price Drop Products */}
                {priceDropProducts.length > 0 && (
                    <section className="container mx-auto px-4 py-8 border-t border-gray-200">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center">
                                <Tag className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-gray-900">Price Drops 🔻</h2>
                                <p className="text-sm text-gray-500">Products with reduced prices across all categories</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                            {priceDropProducts.slice(0, 20).map((item) => (
                                <div key={item.product.id} className="relative">
                                    <div className="absolute top-2 left-2 z-10 bg-emerald-500 text-white text-xs font-black px-2 py-1 rounded-lg shadow-md">
                                        Save {formatPrice(item.savings)}
                                    </div>
                                    <ProductCard product={item.product} />
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Empty state */}
                {sortedDeals.length === 0 && priceDropProducts.length === 0 && (
                    <section className="container mx-auto px-4 py-20 text-center">
                        <Flame className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-gray-700 mb-2">No Active Deals Right Now</h2>
                        <p className="text-gray-500 mb-6">Check back soon — new deals drop daily!</p>
                        <Link href="/" className="text-blue-600 hover:text-ratel-orange font-semibold inline-flex items-center gap-1">
                            Browse All Products <ChevronRight className="h-4 w-4" />
                        </Link>
                    </section>
                )}
            </main>

            <Footer />
        </div>
    );
}
