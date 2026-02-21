"use client";

import { useAuth } from "@/context/AuthContext";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Heart, Store, Star, ChevronRight, ShoppingCart, X, Package } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useFavorites } from "@/context/FavoritesContext";
import { DemoStore } from "@/lib/demo-store";
import { Product, Seller } from "@/lib/types";
import { formatPrice } from "@/lib/utils";
import { useCart } from "@/context/CartContext";

export default function ListsPage() {
    const { user } = useAuth();
    const { favorites, favoriteStores, toggleFavorite, toggleFavoriteStore } = useFavorites();
    const { addToCart } = useCart();
    const [activeTab, setActiveTab] = useState<"products" | "stores">("products");
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);

    // Load favorited products
    const favProducts: Product[] = mounted
        ? favorites.map(id => DemoStore.getProducts().find(p => p.id === id)).filter(Boolean) as Product[]
        : [];

    // Load favorited stores
    const favSellers: Seller[] = mounted
        ? favoriteStores.map(id => DemoStore.getSellers().find(s => s.id === id)).filter(Boolean) as Seller[]
        : [];

    // Get products from favorited stores
    const storeProducts: Record<string, Product[]> = {};
    if (mounted) {
        for (const seller of favSellers) {
            storeProducts[seller.id] = DemoStore.getProducts()
                .filter(p => p.seller_id === seller.id && p.is_active)
                .slice(0, 4);
        }
    }

    const tabs = [
        { key: "products" as const, label: "Favorite Products", count: favorites.length, icon: Heart },
        { key: "stores" as const, label: "Favorite Stores", count: favoriteStores.length, icon: Store },
    ];

    return (
        <div className="min-h-screen bg-[#E3E6E6] flex flex-col font-sans text-black">
            <Navbar />

            <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-3xl font-black tracking-tight">Your Favorites</h1>
                    <p className="text-gray-500 text-sm mt-1">Products and stores you've saved</p>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-6">
                    {tabs.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all ${activeTab === tab.key
                                    ? "bg-gray-900 text-gray-900 shadow-lg"
                                    : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
                                }`}
                        >
                            <tab.icon className="h-4 w-4" />
                            {tab.label}
                            {tab.count > 0 && (
                                <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === tab.key ? "bg-gray-200" : "bg-gray-100"
                                    }`}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Favorite Products Tab */}
                {activeTab === "products" && (
                    <div>
                        {favProducts.length === 0 ? (
                            <div className="bg-white rounded-2xl p-16 text-center shadow-sm">
                                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-5">
                                    <Heart className="h-10 w-10 text-gray-200" />
                                </div>
                                <h2 className="text-xl font-bold mb-2">No favorite products yet</h2>
                                <p className="text-gray-500 max-w-sm mx-auto mb-6 text-sm">
                                    Tap the heart icon on any product to save it here for easy access later.
                                </p>
                                <Link href="/">
                                    <Button className="rounded-full px-8 bg-gray-900 text-gray-900 hover:bg-gray-800 font-bold">
                                        Browse Products
                                    </Button>
                                </Link>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {favProducts.map(product => (
                                    <div key={product.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden group hover:shadow-md transition-shadow">
                                        <Link href={`/product/${product.id}`}>
                                            <div className="aspect-square bg-gray-50 p-4 relative">
                                                <img
                                                    src={product.image_url}
                                                    alt={product.name}
                                                    className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-300"
                                                />
                                                <button
                                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFavorite(product.id); }}
                                                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center hover:scale-110 transition-transform"
                                                >
                                                    <Heart className="h-4 w-4 fill-red-500 text-red-500" />
                                                </button>
                                            </div>
                                        </Link>
                                        <div className="p-4">
                                            <Link href={`/product/${product.id}`}>
                                                <h3 className="text-sm font-bold text-gray-900 line-clamp-2 mb-2 group-hover:text-ratel-green-600 transition-colors">
                                                    {product.name}
                                                </h3>
                                            </Link>
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-lg font-black text-gray-900">{formatPrice(product.price)}</p>
                                                    {product.original_price && (
                                                        <p className="text-xs text-gray-400 line-through">{formatPrice(product.original_price)}</p>
                                                    )}
                                                </div>
                                                <Button
                                                    size="sm"
                                                    className="rounded-full bg-ratel-green-600 hover:bg-ratel-green-700 text-white h-9 px-4 text-xs font-bold"
                                                    onClick={() => addToCart(product)}
                                                >
                                                    <ShoppingCart className="h-3.5 w-3.5 mr-1" />
                                                    Add
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Favorite Stores Tab */}
                {activeTab === "stores" && (
                    <div>
                        {favSellers.length === 0 ? (
                            <div className="bg-white rounded-2xl p-16 text-center shadow-sm">
                                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-5">
                                    <Store className="h-10 w-10 text-gray-200" />
                                </div>
                                <h2 className="text-xl font-bold mb-2">No favorite stores yet</h2>
                                <p className="text-gray-500 max-w-sm mx-auto mb-6 text-sm">
                                    Follow stores you love to see their products on your homepage and get notified about new listings.
                                </p>
                                <Link href="/">
                                    <Button className="rounded-full px-8 bg-gray-900 text-gray-900 hover:bg-gray-800 font-bold">
                                        Discover Stores
                                    </Button>
                                </Link>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {favSellers.map(seller => (
                                    <div key={seller.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                                        {/* Seller Header */}
                                        <div className="p-5 flex items-center gap-4 border-b border-gray-50">
                                            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-ratel-green-500 to-emerald-600 flex items-center justify-center text-gray-900 font-bold text-xl shadow-lg">
                                                {seller.business_name.charAt(0)}
                                            </div>
                                            <div className="flex-1">
                                                <Link href={`/store/${seller.id}`} className="font-bold text-lg text-gray-900 hover:text-ratel-green-600 transition-colors">
                                                    {seller.business_name}
                                                </Link>
                                                <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                                                    <span className="flex items-center gap-1">
                                                        <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                                                        <span className="font-bold text-gray-700">{seller.rating}</span>
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Package className="h-3 w-3" />
                                                        {storeProducts[seller.id]?.length || 0} products
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Link href={`/store/${seller.id}`}>
                                                    <Button size="sm" className="rounded-full bg-gray-900 text-gray-900 hover:bg-gray-800 font-bold text-xs h-9 px-5">
                                                        Visit Store <ChevronRight className="h-3.5 w-3.5 ml-1" />
                                                    </Button>
                                                </Link>
                                                <button
                                                    onClick={() => toggleFavoriteStore(seller.id)}
                                                    className="w-9 h-9 rounded-full bg-red-50 border border-red-100 flex items-center justify-center hover:bg-red-100 transition-colors"
                                                    title="Unfollow store"
                                                >
                                                    <Heart className="h-4 w-4 fill-red-500 text-red-500" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Seller Products Preview */}
                                        {storeProducts[seller.id] && storeProducts[seller.id].length > 0 && (
                                            <div className="p-4">
                                                <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
                                                    {storeProducts[seller.id].map(product => (
                                                        <Link key={product.id} href={`/product/${product.id}`} className="min-w-[140px] max-w-[140px] shrink-0 group/item">
                                                            <div className="aspect-square bg-gray-50 rounded-lg overflow-hidden border border-gray-100 mb-1.5 p-2">
                                                                <img
                                                                    src={product.image_url}
                                                                    alt={product.name}
                                                                    className="w-full h-full object-contain mix-blend-multiply group-hover/item:scale-110 transition-transform duration-300"
                                                                />
                                                            </div>
                                                            <p className="text-xs text-gray-700 line-clamp-1 font-medium">{product.name}</p>
                                                            <p className="text-sm font-bold text-gray-900">{formatPrice(product.price)}</p>
                                                        </Link>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </main>

            <Footer />
        </div>
    );
}
