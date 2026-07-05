"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { DataSyncService } from "@/lib/sync-store";
import { Seller } from "@/lib/types";
import { motion } from "framer-motion";
import {
  Store, ShieldCheck, Star, Search, ArrowRight,
  Handshake, Filter, TrendingUp, MapPin
} from "lucide-react";
import { Input } from "@/components/ui/input";

export default function AllStoresPage() {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"trust" | "rating" | "newest">("trust");

  useEffect(() => {
    const allSellers = DataSyncService.getSellers();
    setSellers(allSellers.filter((s) => s.status === "active"));

    // Local cache only ever contains sellers this browser has happened to touch —
    // fresh devices/admins saw an empty page despite every seller being active in the DB.
    fetch("/api/sellers")
      .then((res) => res.json())
      .then((dbSellers: any[]) => {
        if (!Array.isArray(dbSellers)) return;
        setSellers((prev) => {
          const byId = new Map(prev.map((s) => [s.id, s]));
          for (const s of dbSellers) {
            if (s.status === "active") byId.set(s.id, { ...byId.get(s.id), ...s });
          }
          return Array.from(byId.values());
        });
      })
      .catch(() => {});
  }, []);

  const filteredSellers = useMemo(() => {
    let results = [...sellers];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      results = results.filter(
        (s) =>
          s.business_name?.toLowerCase().includes(q) ||
          s.description?.toLowerCase().includes(q)
      );
    }

    switch (sortBy) {
      case "trust":
        results.sort((a, b) => (b.trust_score || 0) - (a.trust_score || 0));
        break;
      case "rating":
        results.sort(
          (a, b) => parseFloat(String(b.rating || "0")) - parseFloat(String(a.rating || "0"))
        );
        break;
      case "newest":
        results.sort(
          (a, b) =>
            new Date(b.created_at || 0).getTime() -
            new Date(a.created_at || 0).getTime()
        );
        break;
    }

    return results;
  }, [sellers, searchQuery, sortBy]);

  return (
    <div className="min-h-screen bg-white font-sans">
      <Navbar />

      <main className="pt-28 pb-32">
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white py-16 md:py-24">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.3'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />
          <div className="container mx-auto px-4 relative z-10 text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-md rounded-full px-4 py-1.5 text-sm font-bold mb-6 border border-white/20">
                <Store className="h-4 w-4" />
                {sellers.length}+ Verified Stores
              </div>
              <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-4">
                All Stores
              </h1>
              <p className="text-white/80 text-lg max-w-xl mx-auto font-medium">
                Browse verified sellers across Nigeria. Every store is vetted for quality, reliability, and fair pricing.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Filters */}
        <div className="container mx-auto px-4 -mt-8 relative z-20">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-4 md:p-6 flex flex-col md:flex-row items-center gap-4">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search stores by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-12 rounded-xl border-gray-200 text-sm font-medium w-full"
              />
            </div>
            <div className="flex items-center gap-2 shrink-0 w-full md:w-auto">
              <Filter className="h-4 w-4 text-gray-400 hidden md:block" />
              {(
                [
                  { key: "trust", label: "Top Rated", icon: <ShieldCheck className="h-3.5 w-3.5" /> },
                  { key: "rating", label: "Best Reviews", icon: <Star className="h-3.5 w-3.5" /> },
                  { key: "newest", label: "Newest", icon: <TrendingUp className="h-3.5 w-3.5" /> },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setSortBy(opt.key)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    sortBy === opt.key
                      ? "bg-emerald-600 text-white shadow-lg shadow-emerald-200"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {opt.icon} {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Store Grid */}
        <div className="container mx-auto px-4 mt-10">
          {filteredSellers.length === 0 ? (
            <div className="text-center py-20">
              <Store className="h-16 w-16 text-gray-200 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">No stores found</h2>
              <p className="text-gray-500 text-sm">
                {searchQuery ? `No stores match "${searchQuery}". Try a different search.` : "Stores will appear here once sellers are onboarded."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredSellers.map((seller, idx) => (
                <motion.div
                  key={seller.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx * 0.03, 0.3) }}
                >
                  <Link href={`/store/${seller.store_url || seller.id}`} className="group block h-full">
                    <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm hover:shadow-xl hover:shadow-emerald-500/5 transition-all duration-500 h-full flex flex-col items-center text-center hover:border-emerald-200">
                      {/* Logo */}
                      <div className="relative mb-4">
                        <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center overflow-hidden border border-emerald-200 group-hover:scale-105 transition-transform">
                          {seller.logo_url ? (
                            <img src={seller.logo_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Store className="h-10 w-10 text-emerald-600 opacity-20" />
                          )}
                        </div>
                        {seller.verified && (
                          <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white p-1 rounded-full border-2 border-white shadow-md">
                            <ShieldCheck className="h-3 w-3" />
                          </div>
                        )}
                      </div>

                      <h3 className="text-lg font-black text-gray-900 leading-tight line-clamp-1 mb-1 group-hover:text-emerald-600 transition-colors">
                        {seller.business_name}
                      </h3>

                      {seller.description && (
                        <p className="text-xs text-gray-500 line-clamp-2 mb-3 font-medium">{seller.description}</p>
                      )}

                      <div className="flex items-center gap-1.5 mb-4">
                        <div className="flex items-center text-amber-500">
                          <Star className="h-3.5 w-3.5 fill-current" />
                          <span className="text-xs font-bold ml-1">{seller.rating || "4.8"}</span>
                        </div>
                        <div className="h-1 w-1 rounded-full bg-gray-300" />
                        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                          {seller.verified ? "Verified" : "Seller"}
                        </span>
                        {seller.location && (
                          <>
                            <div className="h-1 w-1 rounded-full bg-gray-300" />
                            <span className="text-[11px] text-gray-400 flex items-center gap-0.5">
                              <MapPin className="h-2.5 w-2.5" /> {seller.location}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-2 gap-2 w-full mt-auto">
                        <div className="bg-gray-50 rounded-2xl p-3 flex flex-col items-center">
                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Trust</p>
                          <div className="flex items-center gap-1 text-emerald-600">
                            <ShieldCheck className="h-3 w-3" />
                            <span className="text-sm font-bold">{seller.trust_score || 85}%</span>
                          </div>
                        </div>
                        <div className="bg-gray-50 rounded-2xl p-3 flex flex-col items-center">
                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Deals</p>
                          <div className="flex items-center gap-1 text-blue-600">
                            <Handshake className="h-3 w-3" />
                            <span className="text-sm font-bold">85%</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 w-full">
                        <div className="w-full h-11 rounded-xl bg-gray-900 group-hover:bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2">
                          Visit Store <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
