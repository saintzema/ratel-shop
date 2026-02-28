"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { SearchGridCard } from "@/components/product/SearchGridCard";
import { History, Trash2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function BrowsingHistoryPage() {
    const [history, setHistory] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        try {
            const saved = localStorage.getItem("fp_browsing_history");
            if (saved) {
                setHistory(JSON.parse(saved));
            }
        } catch (e) {
            console.error("Failed to load history", e);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const clearHistory = () => {
        localStorage.removeItem("fp_browsing_history");
        setHistory([]);
    };

    const removeHistoryItem = (idToRemove: string) => {
        const updated = history.filter(item => item.id !== idToRemove);
        setHistory(updated);
        localStorage.setItem("fp_browsing_history", JSON.stringify(updated));
    };

    return (
        <div className="min-h-screen bg-gray-50/30 flex flex-col font-sans selection:bg-brand-green-200">
            <Navbar />

            <main className="flex-grow container mx-auto px-4 py-8 pt-32 max-w-7xl">
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
                    <Link href="/account" className="hover:text-brand-orange flex items-center gap-1 transition-colors">
                        <ArrowLeft className="w-4 h-4" /> Back to Account
                    </Link>
                    <span>/</span>
                    <span className="text-gray-900 font-medium">Browsing History</span>
                </div>

                <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100 mb-8">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-gray-100">
                        <div>
                            <h1 className="text-2xl font-black text-gray-900 flex items-center gap-3">
                                <History className="w-6 h-6 text-brand-orange" />
                                Browsing History
                            </h1>
                            <p className="text-gray-500 mt-2 text-sm">Products you have viewed or searched for recently.</p>
                        </div>

                        {history.length > 0 && (
                            <Button
                                variant="outline"
                                onClick={clearHistory}
                                className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 font-medium self-start sm:self-auto"
                            >
                                <Trash2 className="w-4 h-4 mr-2" /> Clear History
                            </Button>
                        )}
                    </div>

                    {isLoading ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6 animate-pulse">
                            {[...Array(10)].map((_, i) => (
                                <div key={i} className="bg-gray-100 rounded-2xl h-72"></div>
                            ))}
                        </div>
                    ) : history.length === 0 ? (
                        <div className="text-center py-20 px-4">
                            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                <History className="w-10 h-10 text-gray-300" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 mb-2">No history yet</h2>
                            <p className="text-gray-500 max-w-md mx-auto mb-8">
                                Your browsing history will appear here once you start viewing and searching for products.
                            </p>
                            <Link href="/search">
                                <Button className="bg-brand-orange hover:bg-brand-orange/90 text-white font-bold rounded-full px-8 py-6 shadow-sm">
                                    Start Shopping
                                </Button>
                            </Link>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                            {history.map((product) => (
                                <div key={product.id} className="relative group">
                                    <SearchGridCard product={product} />
                                    <button
                                        onClick={() => removeHistoryItem(product.id)}
                                        className="absolute top-2 right-2 w-8 h-8 bg-white/90 backdrop-blur shadow-sm rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 z-10"
                                        title="Remove from history"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            <Footer />
        </div>
    );
}
