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

    const [sortBy, setSortBy] = useState("featured");

    // Filter & Sort logic
    const products = DEMO_PRODUCTS.filter(p =>
        slug === "all" || p.category === slug || (slug === "verified" && p.seller_name.includes("TechHub"))
    ).sort((a, b) => {
        switch (sortBy) {
            case "price_asc": return a.price - b.price;
            case "price_desc": return b.price - a.price;
            case "rating": return b.avg_rating - a.avg_rating;
            case "newest": return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            default: return 0;
        }
    });

    return (
        <div className="min-h-screen bg-ratel-green-50 flex flex-col font-sans text-gray-900">
            <Navbar />

            <main className="flex-1 container mx-auto px-4 py-6 flex gap-6">
                {/* Sidebar Filters */}
                <div className="hidden lg:block w-64 flex-shrink-0 space-y-6 text-gray-900">

                    {/* Categories */}
                    <div>
                        <h3 className="font-bold text-sm mb-2 text-black border-b border-gray-200 pb-1">Departments</h3>
                        <ul className="text-sm space-y-2">
                            {CATEGORIES.map(cat => (
                                <li key={cat.value}>
                                    <Link
                                        href={`/category/${cat.value}`}
                                        className={cn(
                                            "block hover:text-ratel-green-600 transition-colors",
                                            slug === cat.value ? "font-bold text-ratel-green-700 bg-white shadow-sm rounded-md px-2 py-1" : "text-gray-700"
                                        )}
                                    >
                                        <ChevronRight className="inline h-3 w-3 mr-1 text-gray-400" />
                                        {cat.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Price Filter */}
                    <div>
                        <h3 className="font-bold text-sm mb-2 text-black border-b border-gray-200 pb-1">Price</h3>
                        <div className="space-y-1 text-sm text-gray-700">
                            <div className="hover:text-ratel-green-600 cursor-pointer hover:underline">Under ₦20,000</div>
                            <div className="hover:text-ratel-green-600 cursor-pointer hover:underline">₦20,000 to ₦100,000</div>
                            <div className="hover:text-ratel-green-600 cursor-pointer hover:underline">₦100,000 to ₦500,000</div>
                            <div className="hover:text-ratel-green-600 cursor-pointer hover:underline">₦500,000 & Above</div>
                        </div>
                        <div className="flex gap-2 mt-2">
                            <Input placeholder="Min" className="h-8 text-xs bg-white border-gray-300 text-black placeholder:text-gray-400" />
                            <Input placeholder="Max" className="h-8 text-xs bg-white border-gray-300 text-black placeholder:text-gray-400" />
                            <Button size="sm" variant="outline" className="h-8 px-2 bg-white text-black border-gray-300 hover:bg-gray-100">Go</Button>
                        </div>
                    </div>

                    {/* Rating Filter */}
                    <div>
                        <h3 className="font-bold text-sm mb-2 text-black border-b border-gray-200 pb-1">Avg. Customer Review</h3>
                        <div className="space-y-1">
                            {[4, 3, 2, 1].map(rating => (
                                <div key={rating} className="flex items-center gap-1 text-sm cursor-pointer hover:text-ratel-green-600 group">
                                    <div className="flex text-amber-400">
                                        {[...Array(5)].map((_, i) => (
                                            <Star key={i} className={cn("h-4 w-4", i < rating ? "fill-current" : "text-gray-300")} />
                                        ))}
                                    </div>
                                    <span className="text-gray-700 group-hover:text-ratel-green-600 font-medium">& Up</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Seller Type */}
                    <div>
                        <h3 className="font-bold text-sm mb-2 text-black border-b border-gray-200 pb-1">Seller Type</h3>
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm cursor-pointer hover:text-ratel-green-600 group">
                                <input type="checkbox" className="rounded border-gray-400 text-ratel-green-600 focus:ring-ratel-green-600" />
                                <span className="flex items-center gap-1 text-gray-800"><ShieldCheck className="h-3 w-3 text-ratel-green-600" /> VDM Verified</span>
                            </label>
                            <label className="flex items-center gap-2 text-sm cursor-pointer hover:text-ratel-green-600 group">
                                <input type="checkbox" className="rounded border-gray-400 text-ratel-green-600 focus:ring-ratel-green-600" />
                                <span className="text-gray-800">Ratel Fulfillment</span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Product Grid */}
                <div className="flex-1">
                    <div className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                        <h1 className="font-bold text-lg capitalize mb-2 sm:mb-0 text-black">
                            {products.length} results for <span className="text-ratel-green-700">"{categoryLabel}"</span>
                        </h1>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600 font-medium">Sort by:</span>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="text-sm bg-transparent border-gray-300 rounded focus:ring-ratel-green-500 font-medium cursor-pointer text-gray-800"
                            >
                                <option value="featured">Featured</option>
                                <option value="price_asc">Price: Low to High</option>
                                <option value="price_desc">Price: High to Low</option>
                                <option value="rating">Avg. Customer Review</option>
                                <option value="newest">Newest Arrivals</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {products.map(product => (
                            <ProductCard
                                key={product.id}
                                product={product}
                                className="bg-white border-gray-200 text-black shadow-sm"
                            />
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
