"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { HistorySquareCard } from "@/components/product/HistorySquareCard";
import { History, Trash2, ArrowLeft, ShoppingBag } from "lucide-react";
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
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans selection:bg-emerald-100">
            <Navbar />

            <main className="flex-grow container mx-auto px-4 py-8 pt-32 max-w-7xl">
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-8">
                    <Link href="/account" className="hover:text-emerald-600 flex items-center gap-1 transition-colors font-medium">
                        <ArrowLeft className="w-4 h-4" /> Account
                    </Link>
                    <span className="text-gray-300">/</span>
                    <span className="text-gray-900 font-bold tracking-tight">Browsing History</span>
                </div>

                <div className="bg-white rounded-[32px] p-8 md:p-10 shadow-sm border border-gray-100 mb-12">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 pb-8 border-b border-gray-50">
                        <div className="space-y-1">
                            <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                                <div className="h-10 w-10 bg-emerald-100 rounded-2xl flex items-center justify-center">
                                    <History className="w-5 h-5 text-emerald-600" />
                                </div>
                                Browsing History
                            </h1>
                            <p className="text-gray-500 font-medium ml-1">Your recent activity and product discoveries</p>
                        </div>

                        {history.length > 0 && (
                            <Button
                                variant="outline"
                                onClick={clearHistory}
                                className="text-red-500 border-red-100 bg-red-50/30 hover:bg-red-50 hover:border-red-200 font-bold rounded-2xl h-12 px-6 self-start md:self-auto transition-all"
                            >
                                <Trash2 className="w-4 h-4 mr-2" /> Clear History
                            </Button>
                        )}
                    </div>

                    {isLoading ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 md:gap-8">
                            {[...Array(12)].map((_, i) => (
                                <div key={i} className="space-y-3 animate-pulse">
                                    <div className="bg-gray-50 rounded-[24px] aspect-square w-full"></div>
                                    <div className="h-3 bg-gray-50 rounded-full w-2/3 mx-auto"></div>
                                    <div className="h-3 bg-gray-50 rounded-full w-1/2 mx-auto"></div>
                                </div>
                            ))}
                        </div>
                    ) : history.length === 0 ? (
                        <div className="text-center py-24 px-4 bg-gray-50/50 rounded-[40px] border border-dashed border-gray-200">
                            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-8 shadow-sm border border-gray-50">
                                <ShoppingBag className="w-10 h-10 text-gray-200" />
                            </div>
                            <h2 className="text-2xl font-black text-gray-900 mb-3 tracking-tight">Your history is empty</h2>
                            <p className="text-gray-500 font-medium max-w-sm mx-auto mb-10 leading-relaxed">
                                Explore our curated collections to find your next favorite item.
                            </p>
                            <Link href="/search">
                                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-full px-10 py-7 shadow-lg shadow-emerald-600/20 transition-all hover:scale-[1.02] active:scale-95 text-lg">
                                    Start Exploring
                                </Button>
                            </Link>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 md:gap-10">
                            {history.map((product) => (
                                <HistorySquareCard 
                                    key={product.id} 
                                    product={product} 
                                    onRemove={removeHistoryItem} 
                                />
                            ))}
                        </div>
                    )}
                </div>
            </main>

            <Footer />
        </div>
    );
}
