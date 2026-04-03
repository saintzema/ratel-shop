"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShieldCheck, ArrowRight, Store, Star, Handshake } from "lucide-react";
import { DataSyncService } from "@/lib/sync-store";
import { Seller } from "@/lib/types";
import { motion } from "framer-motion";

export function StoreDiscoveryRail() {
    const [topSellers, setTopSellers] = useState<Seller[]>([]);

    useEffect(() => {
        const loadSellers = () => {
            const allSellers = DataSyncService.getSellers();
            // Filter for verified/active sellers and sort by trust score
            const sorted = allSellers
                .filter(s => s.status === "active")
                .sort((a, b) => (b.trust_score || 0) - (a.trust_score || 0))
                .slice(0, 8);
            setTopSellers(sorted);
        };

        loadSellers();
        window.addEventListener("storage", loadSellers);
        return () => window.removeEventListener("storage", loadSellers);
    }, []);

    if (topSellers.length === 0) return null;

    return (
        <section className="w-full py-12 bg-gray-50/50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-end justify-between mb-8">
                    <div>
                        <h2 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                            <Store className="h-7 w-7 text-emerald-600" />
                            Discover Top Verified Stores
                        </h2>
                        <p className="text-gray-500 font-medium mt-1">Shop with confidence from the most reliable sellers in the matrix.</p>
                    </div>
                    <Link 
                        href="/categories" 
                        className="group flex items-center gap-2 text-sm font-black text-emerald-600 uppercase tracking-widest hover:text-emerald-700 transition-colors"
                    >
                        View All Stores
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                </div>

                <div className="flex gap-6 overflow-x-auto pb-8 scrollbar-hide -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
                    {topSellers.map((seller, idx) => (
                        <motion.div
                            key={seller.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="shrink-0 w-72 group"
                        >
                            <Link href={`/store/${seller.store_url || seller.id}`}>
                                <div className="bg-white rounded-[32px] border border-gray-100 p-6 shadow-sm hover:shadow-xl hover:shadow-emerald-500/5 transition-all duration-500 h-full flex flex-col items-center text-center">
                                    {/* Logo / Avatar */}
                                    <div className="relative mb-4">
                                        <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center overflow-hidden border border-emerald-200">
                                            {seller.logo_url ? (
                                                <img src={seller.logo_url} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <Store className="h-10 w-10 text-emerald-600 opacity-20" />
                                            )}
                                        </div>
                                        <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white p-1 rounded-full border-2 border-white shadow-md">
                                            <ShieldCheck className="h-3 w-3" />
                                        </div>
                                    </div>

                                    <h3 className="text-lg font-black text-gray-900 leading-tight line-clamp-1 mb-1 group-hover:text-emerald-600 transition-colors">
                                        {seller.business_name}
                                    </h3>
                                    
                                    <div className="flex items-center gap-1.5 mb-4">
                                        <div className="flex items-center text-amber-500">
                                            <Star className="h-3.5 w-3.5 fill-current" />
                                            <span className="text-xs font-bold ml-1">{seller.rating || "4.8"}</span>
                                        </div>
                                        <div className="h-1 w-1 rounded-full bg-gray-300" />
                                        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                                            {seller.verified ? "Verified" : "Top Seller"}
                                        </span>
                                    </div>

                                    {/* Stats Grid */}
                                    <div className="grid grid-cols-2 gap-2 w-full mt-auto">
                                        <div className="bg-gray-50 rounded-2xl p-3 flex flex-col items-center justify-center">
                                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Trust Score</p>
                                            <div className="flex items-center gap-1 text-emerald-600">
                                                <ShieldCheck className="h-3 w-3" />
                                                <span className="text-sm font-bold">{seller.trust_score || 85}%</span>
                                            </div>
                                        </div>
                                        <div className="bg-gray-50 rounded-2xl p-3 flex flex-col items-center justify-center">
                                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Acceptance</p>
                                            <div className="flex items-center gap-1 text-blue-600">
                                                <Handshake className="h-3 w-3" />
                                                <span className="text-sm font-bold">85%</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-5 w-full">
                                        <button className="w-full h-11 rounded-xl bg-gray-900 hover:bg-black text-white text-[10px] font-black uppercase tracking-widest transition-all">
                                            Visit Store
                                        </button>
                                    </div>
                                </div>
                            </Link>
                        </motion.div>
                    ))}
                    
                    {/* View All Card */}
                    <Link href="/categories" className="group shrink-0 h-full">
                        <div className="w-72 h-full min-h-[340px] bg-emerald-600 rounded-[32px] p-8 flex flex-col items-center justify-center text-center group-hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-500/20">
                            <div className="h-16 w-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center mb-6">
                                <ArrowRight className="h-8 w-8 text-white" />
                            </div>
                            <h3 className="text-2xl font-black text-white tracking-tight mb-2">Explore All Matrix Stores</h3>
                            <p className="text-emerald-50/70 text-sm font-medium">Join 500+ verified sellers across Nigeria</p>
                        </div>
                    </Link>
                </div>
            </div>
        </section>
    );
}
