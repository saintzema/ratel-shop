"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { DEMO_PRODUCTS } from "@/lib/data";
import { CATEGORIES } from "@/lib/types";
import { ProductCard } from "@/components/product/ProductCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronRight, Star, ShieldCheck } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function CategoryPage() {
    const params = useParams();
    const slug = params.slug as string;
    const categoryLabel = CATEGORIES.find(c => c.value === slug)?.label || slug.replace("-", " ");

    // Filter logic (Basic for MVP)
    const products = DEMO_PRODUCTS.filter(p =>
        slug === "all" || p.category === slug || slug === "verified" && p.seller_name.includes("TechHub") // Mock logic
    );

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-zinc-950 flex flex-col">
            <Navbar />

            <main className="flex-1 container mx-auto px-4 py-6 flex gap-6">
                {/* Sidebar Filters */}
                <div className="hidden lg:block w-64 flex-shrink-0 space-y-6">

                    {/* Categories */}
                    <div>
                        <h3 className="font-bold text-sm mb-2">Departments</h3>
                        <ul className="text-sm space-y-1">
                            {CATEGORIES.map(cat => (
                                <li key={cat.value}>
                                    <Link
                                        href={`/category/${cat.value}`}
                                        className={cn(
                                            "hover:text-ratel-orange",
                                            slug === cat.value ? "font-bold text-black dark:text-white" : "text-gray-600 dark:text-gray-400"
                                        )}
                                    >
                                        <ChevronRight className="inline h-3 w-3 mr-1" />
                                        {cat.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Price Filter */}
                    <div>
                        <h3 className="font-bold text-sm mb-2">Price</h3>
                        <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                            <div className="hover:text-ratel-orange cursor-pointer">Under ₦20,000</div>
                            <div className="hover:text-ratel-orange cursor-pointer">₦20,000 to ₦100,000</div>
                            <div className="hover:text-ratel-orange cursor-pointer">₦100,000 to ₦500,000</div>
                            <div className="hover:text-ratel-orange cursor-pointer">₦500,000 & Above</div>
                        </div>
                        <div className="flex gap-2 mt-2">
                            <Input placeholder="Min" className="h-8 text-xs" />
                            <Input placeholder="Max" className="h-8 text-xs" />
                            <Button size="sm" variant="outline" className="h-8 px-2">Go</Button>
                        </div>
                    </div>

                    {/* Rating Filter */}
                    <div>
                        <h3 className="font-bold text-sm mb-2">Avg. Customer Review</h3>
                        <div className="space-y-1">
                            {[4, 3, 2, 1].map(rating => (
                                <div key={rating} className="flex items-center gap-1 text-sm cursor-pointer hover:text-ratel-orange">
                                    <div className="flex text-yellow-400">
                                        {[...Array(5)].map((_, i) => (
                                            <Star key={i} className={cn("h-4 w-4", i < rating ? "fill-current" : "text-gray-300")} />
                                        ))}
                                    </div>
                                    <span className="text-gray-600 dark:text-gray-400">& Up</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Seller Type */}
                    <div>
                        <h3 className="font-bold text-sm mb-2">Seller Type</h3>
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm cursor-pointer hover:text-ratel-orange">
                                <input type="checkbox" className="rounded border-gray-300" />
                                <span className="flex items-center gap-1"><ShieldCheck className="h-3 w-3 text-ratel-green-600" /> VDM Verified</span>
                            </label>
                            <label className="flex items-center gap-2 text-sm cursor-pointer hover:text-ratel-orange">
                                <input type="checkbox" className="rounded border-gray-300" />
                                <span>Ratel Fulfillment</span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Product Grid */}
                <div className="flex-1">
                    <div className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white dark:bg-zinc-900 p-3 rounded border dark:border-zinc-800 shadow-sm">
                        <h1 className="font-bold text-lg capitalize mb-2 sm:mb-0">
                            {products.length} results for <span className="text-ratel-orange">"{categoryLabel}"</span>
                        </h1>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">Sort by:</span>
                            <select className="text-sm bg-transparent border-none focus:ring-0 font-medium cursor-pointer">
                                <option>Featured</option>
                                <option>Price: Low to High</option>
                                <option>Price: High to Low</option>
                                <option>Avg. Customer Review</option>
                                <option>Newest Arrivals</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {products.map(product => (
                            <ProductCard key={product.id} product={product} />
                        ))}
                    </div>

                    {/* Pagination Mock */}
                    <div className="mt-8 flex justify-center">
                        <div className="flex items-center gap-2">
                            <Button variant="outline" disabled>Previous</Button>
                            <Button variant="outline" className="bg-gray-100">1</Button>
                            <Button variant="outline">2</Button>
                            <Button variant="outline">3</Button>
                            <span className="text-gray-400">...</span>
                            <Button variant="outline">Next</Button>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
