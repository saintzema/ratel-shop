"use client";

import { useParams } from "next/navigation";
import { DEMO_PRODUCTS } from "@/lib/data";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { PriceComparisonTable } from "@/components/product/PriceComparisonTable";
import { ReviewList } from "@/components/product/ReviewList";
import { ProductCard } from "@/components/product/ProductCard";
import { Star, ShieldCheck, Truck, RotateCcw, Lock } from "lucide-react";
import Link from "next/link";

export default function ProductDetailPage() {
    const params = useParams();
    const product = DEMO_PRODUCTS.find(p => p.id == params.id) || DEMO_PRODUCTS[0];

    // Mock recommendations
    const frequentBundle = DEMO_PRODUCTS.filter(p => p.category === product.category && p.id !== product.id).slice(0, 2);
    const alsoViewed = DEMO_PRODUCTS.filter(p => p.id !== product.id).slice(0, 5);

    return (
        <div className="min-h-screen bg-white dark:bg-zinc-950 flex flex-col">
            <Navbar />

            <main className="flex-1 container mx-auto px-4 py-8">
                {/* Top Product Section */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">

                    {/* 1. Image Gallery (Mock) */}
                    <div className="lg:col-span-5">
                        <div className="aspect-square bg-gray-100 dark:bg-zinc-900 rounded-lg overflow-hidden mb-4 border dark:border-zinc-800 relative">
                            <img src={product.image_url} alt={product.name} className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal" />
                            <Badge className="absolute top-4 left-4 bg-ratel-orange text-black font-bold">Best Seller</Badge>
                        </div>
                        <div className="grid grid-cols-5 gap-2">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="aspect-square bg-gray-100 dark:bg-zinc-900 rounded border hover:border-ratel-orange cursor-pointer">
                                    <img src={product.image_url} alt="thumbnail" className="w-full h-full object-contain p-2" />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 2. Product Info (Center) */}
                    <div className="lg:col-span-4 space-y-4">
                        <h1 className="text-2xl md:text-3xl font-medium text-gray-900 dark:text-white leading-tight">
                            {product.name}
                        </h1>

                        <div className="flex items-center gap-2">
                            <div className="flex text-yellow-400 text-sm">
                                {[...Array(5)].map((_, i) => (
                                    <Star key={i} className={`h-4 w-4 ${i < Math.round(product.avg_rating) ? "fill-current" : "text-gray-300"}`} />
                                ))}
                            </div>
                            <Link href="#reviews" className="text-sm text-blue-600 hover:underline hover:text-ratel-orange">
                                {product.review_count.toLocaleString()} ratings
                            </Link>
                        </div>

                        <hr className="border-gray-200 dark:border-zinc-800" />

                        <div className="space-y-2">
                            <div className="flex items-baseline gap-3">
                                <span className="text-red-600 text-xl font-light">-10%</span>
                                <span className="text-3xl font-bold">{formatPrice(product.price)}</span>
                            </div>
                            {product.original_price && (
                                <div className="text-sm text-gray-500">
                                    List Price: <span className="line-through">{formatPrice(product.original_price)}</span>
                                </div>
                            )}
                        </div>

                        <div className="text-sm space-y-3">
                            <p>{product.description}</p>
                            <div className="flex items-center gap-2 text-emerald-600 font-bold">
                                <ShieldCheck className="h-4 w-4" /> VDM Verified Fair Price
                            </div>
                        </div>

                        {/* Price Comparison Table Component */}
                        <div className="mt-6">
                            <PriceComparisonTable product={product} />
                        </div>
                    </div>

                    {/* 3. Buy Box (Right Sidebar) */}
                    <div className="lg:col-span-3">
                        <div className="border border-gray-200 dark:border-zinc-800 rounded-lg p-5 shadow-sm space-y-4 sticky top-24">
                            <div className="text-2xl font-bold">{formatPrice(product.price)}</div>

                            <div className="text-sm">
                                <div className="text-emerald-600 font-bold mb-1">In Stock.</div>
                                <div className="text-gray-500">Delivery by <span className="font-bold text-black dark:text-white">Wednesday, Feb 14</span></div>
                                <div className="text-gray-500">Deliver to <span className="text-blue-600 hover:underline cursor-pointer">Lagos</span></div>
                            </div>

                            <Button className="w-full rounded-full" variant="amazon">Add to Cart</Button>
                            <Button className="w-full rounded-full bg-orange-400 hover:bg-orange-500 text-black">Buy Now</Button>

                            <div className="text-xs text-gray-500 space-y-1 pt-2">
                                <div className="grid grid-cols-2">
                                    <span>Ships from</span> <span>Ratel Fulfillment</span>
                                </div>
                                <div className="grid grid-cols-2">
                                    <span>Sold by</span> <span className="text-blue-600 hover:underline">{product.seller_name}</span>
                                </div>
                            </div>

                            <div className="pt-4 flex items-center gap-2 text-xs text-blue-600 cursor-pointer hover:underline">
                                <Lock className="h-3 w-3" /> Secure transaction
                            </div>
                        </div>
                    </div>
                </div>

                <hr className="my-8 border-gray-200 dark:border-zinc-800" />

                {/* Frequently Bought Together */}
                <div className="mb-12">
                    <h2 className="text-xl font-bold mb-4">Frequently bought together</h2>
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                        <div className="flex items-center gap-2">
                            <div className="w-32 aspect-square border p-2 rounded"><img src={product.image_url} className="w-full h-full object-contain" /></div>
                            <div className="text-2xl text-gray-400">+</div>
                            {frequentBundle.map(p => (
                                <div key={p.id} className="flex items-center gap-2">
                                    <Link href={`/product/${p.id}`} className="w-32 aspect-square border p-2 rounded hover:border-ratel-orange">
                                        <img src={p.image_url} className="w-full h-full object-contain" />
                                    </Link>
                                    <div className="text-2xl text-gray-400 last:hidden">+</div>
                                </div>
                            ))}
                        </div>

                        <div className="ml-0 sm:ml-8">
                            <div className="text-lg font-bold">
                                Total price: <span className="text-red-700">{formatPrice(product.price + frequentBundle.reduce((sum, p) => sum + p.price, 0))}</span>
                            </div>
                            <Button size="sm" variant="amazon" className="mt-2 rounded-md">Add all 3 to Cart</Button>
                        </div>
                    </div>
                </div>

                <hr className="my-8 border-gray-200 dark:border-zinc-800" />

                {/* Customers Also Viewed Slider */}
                <div className="mb-12">
                    <h2 className="text-xl font-bold mb-4">Customers who viewed this item also viewed</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                        {alsoViewed.map(p => (
                            <ProductCard key={p.id} product={p} />
                        ))}
                    </div>
                </div>

                <hr className="my-8 border-gray-200 dark:border-zinc-800" id="reviews" />

                {/* Customer Reviews */}
                <ReviewList productId={product.id} />

            </main>

            <Footer />
        </div>
    );
}
