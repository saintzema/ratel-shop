"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Product } from "@/lib/types";
import { DemoStore } from "@/lib/demo-store";
import { useFavorites } from "@/context/FavoritesContext";
import { ProductCard } from "@/components/product/ProductCard";
import { Heart, ShoppingBag, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

export default function FavoritesPage() {
    const { favorites } = useFavorites();
    const [products, setProducts] = useState<Product[]>([]);

    useEffect(() => {
        const all = DemoStore.getProducts();
        setProducts(all);

        const update = () => setProducts(DemoStore.getProducts());
        window.addEventListener("demo-store-update", update);
        return () => window.removeEventListener("demo-store-update", update);
    }, []);

    const favoritedProducts = products.filter(p => favorites.includes(p.id));

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            <Navbar />

            <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-red-50 rounded-xl">
                        <Heart className="h-5 w-5 text-red-500 fill-red-500" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Your Favorites</h1>
                        <p className="text-sm text-gray-500">Products you&apos;ve liked. Double-tap any product to add it here.</p>
                    </div>
                </div>

                {favoritedProducts.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-16 text-center">
                        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Heart className="h-8 w-8 text-red-300" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-800 mb-1">No favorites yet</h3>
                        <p className="text-sm text-gray-500 mb-4 max-w-sm mx-auto">
                            Double-tap any product image or click the heart icon to add it to your favorites.
                        </p>
                        <Link href="/">
                            <Button className="bg-gray-900 text-gray-900 rounded-xl font-semibold px-6">
                                <ShoppingBag className="h-4 w-4 mr-2" /> Browse Products <ArrowRight className="h-4 w-4 ml-2" />
                            </Button>
                        </Link>
                    </div>
                ) : (
                    <motion.div
                        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                    >
                        <AnimatePresence>
                            {favoritedProducts.map((product, i) => (
                                <motion.div
                                    key={product.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ delay: i * 0.04 }}
                                >
                                    <ProductCard product={product} />
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </motion.div>
                )}
            </main>

            <Footer />
        </div>
    );
}
