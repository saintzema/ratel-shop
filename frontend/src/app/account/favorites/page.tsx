"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Product } from "@/lib/types";
import { DemoStore } from "@/lib/demo-store";
import { useFavorites } from "@/context/FavoritesContext";
import { ProductCard } from "@/components/product/ProductCard";
import { Heart, ShoppingBag, ArrowRight, Share2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";

export default function FavoritesPage() {
    const { favorites } = useFavorites();
    const { user } = useAuth();
    const searchParams = useSearchParams();
    const [products, setProducts] = useState<Product[]>([]);

    // Shared Wishlist State
    const sharedUserId = searchParams.get("shared_by");
    const isSharedView = !!sharedUserId;
    const [sharedFavorites, setSharedFavorites] = useState<string[]>([]);
    const [sharedUserName, setSharedUserName] = useState<string>("A friend");
    const [isCopied, setIsCopied] = useState(false);

    useEffect(() => {
        const all = DemoStore.getProducts();
        setProducts(all);

        const update = () => setProducts(DemoStore.getProducts());
        window.addEventListener("demo-store-update", update);

        // Mock loading a shared wishlist if shared_by exists
        if (isSharedView) {
            // In a real app, this would fetch the user's favorites from the DB
            // For the demo, we'll simulate a shared list from local storage or just random items if none exist
            const mockShared = all.sort(() => 0.5 - Math.random()).slice(0, 4).map(p => p.id);
            setSharedFavorites(mockShared);

            // Try to look up the user in DEMO_USERS, or use a placeholder
            if (sharedUserId === "u1") setSharedUserName("Chukwudi Amaechi");
            if (sharedUserId === "u2") setSharedUserName("Aisha Bello");
            if (sharedUserId === "u3") setSharedUserName("Emily");
        }

        return () => window.removeEventListener("demo-store-update", update);
    }, [isSharedView, sharedUserId]);

    const activeFavoritesList = isSharedView ? sharedFavorites : favorites;
    const favoritedProducts = products.filter(p => activeFavoritesList.includes(p.id));

    const handleShare = () => {
        if (!user) return; // Must be logged in to share own list
        const url = new URL(window.location.href);
        url.searchParams.set("shared_by", user.id);

        navigator.clipboard.writeText(url.toString());
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            <Navbar />

            <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-50 rounded-xl shrink-0">
                            <Heart className={`h-5 w-5 ${isSharedView ? 'text-pink-500 fill-pink-500' : 'text-red-500 fill-red-500'}`} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">
                                {isSharedView ? `${sharedUserName}'s Wishlist` : "Your Favorites"}
                            </h1>
                            <p className="text-sm text-gray-500">
                                {isSharedView
                                    ? "Help them get what they want by checking out these items."
                                    : "Products you've liked. Double-tap any product to add it here."}
                            </p>
                        </div>
                    </div>

                    {!isSharedView && favoritedProducts.length > 0 && user && (
                        <Button
                            onClick={handleShare}
                            variant="outline"
                            className="shrink-0 rounded-full border-gray-200 hover:bg-gray-50 text-gray-700 font-bold shadow-sm transition-all"
                        >
                            {isCopied ? (
                                <><Check className="h-4 w-4 mr-2 text-emerald-500" /> Link Copied!</>
                            ) : (
                                <><Share2 className="h-4 w-4 mr-2" /> Share Wishlist</>
                            )}
                        </Button>
                    )}
                </div>

                {favoritedProducts.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-16 text-center">
                        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Heart className="h-8 w-8 text-red-300" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-800 mb-1">
                            {isSharedView ? "This wishlist is empty" : "No favorites yet"}
                        </h3>
                        <p className="text-sm text-gray-500 mb-4 max-w-sm mx-auto">
                            {isSharedView
                                ? "It looks like they haven't saved any items yet."
                                : "Double-tap any product image or click the heart icon to add it to your favorites."}
                        </p>
                        <Link href="/">
                            <Button className="bg-gray-900 text-white rounded-xl font-semibold px-6">
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
