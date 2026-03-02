"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ProductCard } from "@/components/product/ProductCard";
import { DemoStore } from "@/lib/demo-store";
import { Product } from "@/lib/types";
import { History, ChevronLeft, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function BrowsingHistoryPage() {
    const [historyProducts, setHistoryProducts] = useState<Product[]>([]);
    const [mounted, setMounted] = useState(false);
    const router = useRouter();

    useEffect(() => {
        setMounted(true);
        // Load history purely from DemoStore which handles the logic
        const history = DemoStore.getSearchHistoryProducts();
        setHistoryProducts(history);
    }, []);

    if (!mounted) return null;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <Navbar />

            <main className="flex-1 container mx-auto px-4 py-8 pt-24 pb-20">
                <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="flex items-center gap-4 mb-8">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.back()}
                            className="h-10 w-10 rounded-full hover:bg-white shrink-0"
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </Button>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-black text-gray-900 flex items-center gap-3">
                                <History className="h-6 w-6 md:h-8 md:w-8 text-emerald-600" />
                                Browsing History
                            </h1>
                            <p className="text-sm text-gray-500 mt-1">Products you've viewed recently across all devices.</p>
                        </div>
                    </div>

                    {historyProducts.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                            {historyProducts.map((product) => (
                                <ProductCard key={product.id} product={product} />
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl border border-gray-100 p-12 flex flex-col items-center justify-center text-center shadow-sm h-[50vh]">
                            <div className="h-20 w-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                <History className="h-8 w-8 text-gray-400" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 mb-2">No Browsing History</h2>
                            <p className="text-gray-500 mb-6 max-w-sm">
                                You haven't viewed any products yet. Keep exploring to build your history!
                            </p>
                            <Button
                                onClick={() => router.push("/")}
                                className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white border-0 shadow-md font-bold px-8"
                            >
                                <ShoppingBag className="w-4 h-4 mr-2" /> Start Shopping
                            </Button>
                        </div>
                    )}
                </div>
            </main>

            <Footer />
        </div>
    );
}
