"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, DollarSign, BarChart3, Info, TrendingUp, Sparkles, Check, ChevronLeft } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

export default function NewProduct() {
    const [price, setPrice] = useState("");
    const [isanalyzing, setIsAnalyzing] = useState(false);
    const [analysis, setAnalysis] = useState<any>(null);

    const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setPrice(val);

        if (val && !isanalyzing) {
            setIsAnalyzing(true);
            setAnalysis(null);
            setTimeout(() => {
                setIsAnalyzing(false);
                const priceNum = parseInt(val);
                setAnalysis({
                    marketAvg: 1100000,
                    fairRangeLow: 1050000,
                    fairRangeHigh: 1150000,
                    status: priceNum > 1200000 ? "overpriced" : priceNum < 1000000 ? "suspicious" : "fair",
                    demand: "High",
                    salesProbability: priceNum < 1120000 ? "85%" : "40%"
                });
            }, 1500);
        }
    };

    return (
        <div className="min-h-screen bg-[var(--background-ash)] text-foreground transition-all duration-700 flex flex-col relative overflow-x-hidden -m-8 p-8">
            {/* Immersive Background Blobs */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10">
                <div className="absolute top-[10%] left-[-5%] w-[40%] h-[40%] bg-ratel-green-200/10 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[10%] right-[-5%] w-[40%] h-[40%] bg-ratel-orange/5 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
            </div>

            <div className="max-w-6xl mx-auto w-full relative z-10">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="mb-10"
                >
                    <Link href="/seller/products" className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-ratel-green-600 transition-colors">
                        <ChevronLeft className="h-4 w-4" /> Back to Dashboard
                    </Link>
                    <h1 className="text-4xl font-black tracking-tighter mt-4 text-foreground flex items-center gap-3">
                        Launch New Product <Sparkles className="text-ratel-green-600 h-8 w-8" />
                    </h1>
                    <p className="text-gray-500 font-medium">Create a high-impact listing with AI pricing guidance.</p>
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left: Product Form */}
                    <div className="lg:col-span-2 space-y-8">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="glass-card p-10"
                        >
                            <div className="flex items-center gap-4 mb-8">
                                <div className="h-12 w-12 bg-ratel-green-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center">
                                    <Info className="h-6 w-6 text-ratel-green-600" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black tracking-tight uppercase">Core Details</h2>
                                    <p className="text-xs text-gray-400 font-bold">ESSENTIAL LISTING INFO</p>
                                </div>
                            </div>

                            <div className="space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Product Name</label>
                                        <Input
                                            placeholder="e.g. iPhone 15 Pro Max"
                                            className="bg-white/40 dark:bg-zinc-900/40 border-white/20 dark:border-zinc-800 rounded-2xl h-14 font-bold text-lg px-6 focus:ring-4 focus:ring-ratel-green-500/20 shadow-sm"
                                        />
                                    </div>
                                    <div className="space-y-2 relative">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Category</label>
                                        <select className="flex h-14 w-full rounded-2xl border border-white/20 dark:border-zinc-800 bg-white/40 dark:bg-zinc-900/40 px-6 py-2 text-lg font-bold focus:outline-none focus:ring-4 focus:ring-ratel-green-500/20 appearance-none cursor-pointer">
                                            <option>Select Category</option>
                                            <option>Phones & Tablets</option>
                                            <option>Electronics</option>
                                            <option>Vehicles</option>
                                            <option>Green Energy</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Hero Description</label>
                                    <textarea
                                        className="flex min-h-[160px] w-full rounded-2xl border border-white/20 dark:border-zinc-800 bg-white/40 dark:bg-zinc-900/40 px-6 py-4 text-lg font-medium focus:outline-none focus:ring-4 focus:ring-ratel-green-500/20 shadow-sm"
                                        placeholder="What makes this product special?"
                                    />
                                </div>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="glass-card p-10"
                        >
                            <div className="flex items-center gap-4 mb-10">
                                <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center">
                                    <Upload className="h-6 w-6 text-blue-600" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black tracking-tight uppercase">Visual Media</h2>
                                    <p className="text-xs text-gray-400 font-bold">HIGH DEFINITION ASSETS</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                                {["Main Image", "Gallery", "Demo Video", "Specs PDF"].map((label, i) => (
                                    <div key={label} className="group relative aspect-square bg-white/30 dark:bg-zinc-900/30 rounded-[2rem] border-2 border-dashed border-white/40 dark:border-zinc-800 flex flex-col items-center justify-center cursor-pointer hover:border-ratel-green-500/50 hover:bg-white/50 transition-all duration-500 shadow-sm">
                                        <div className="w-16 h-16 flex items-center justify-center bg-white dark:bg-zinc-800 rounded-[1.5rem] shadow-xl mb-4 group-hover:scale-110 group-hover:-rotate-3 transition-all">
                                            <Upload className="h-6 w-6 text-gray-400 group-hover:text-ratel-green-600 transition-colors" />
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{label}</span>

                                        <div className="absolute inset-0 bg-ratel-green-600/5 rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs text-gray-400 mt-8 text-center font-bold tracking-tight opacity-75">STUNNING VISUALS RESULT IN 400% HIGHER CONVERSION RATES.</p>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="glass-card p-10"
                        >
                            <div className="flex items-center gap-4 mb-8">
                                <div className="h-12 w-12 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center">
                                    <DollarSign className="h-6 w-6 text-amber-600" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black tracking-tight uppercase">Price & Stock</h2>
                                    <p className="text-xs text-gray-400 font-bold">OPTIMIZED COMMERCE</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Initial Stock</label>
                                    <Input
                                        type="number"
                                        placeholder="1"
                                        className="bg-white/40 dark:bg-zinc-900/40 border-white/20 dark:border-zinc-800 rounded-2xl h-14 font-black text-2xl px-6 focus:ring-4 focus:ring-ratel-green-500/20 shadow-sm"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Your Price (₦)</label>
                                    <div className="relative">
                                        <span className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 font-black text-2xl group-v-hover:scale-110 transition-transform">₦</span>
                                        <Input
                                            type="number"
                                            placeholder="0"
                                            className="pl-14 bg-white/40 dark:bg-zinc-900/40 border-white/20 dark:border-zinc-800 rounded-2xl h-14 font-black text-3xl px-6 focus:ring-4 focus:ring-ratel-green-500/20 shadow-sm text-ratel-green-600"
                                            value={price}
                                            onChange={handlePriceChange}
                                        />
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        <div className="flex items-center justify-between py-10 px-4">
                            <span className="text-sm text-gray-400 font-bold italic">Drafts are saved automatically to your high-security Ratel Cloud.</span>
                            <div className="flex gap-6">
                                <Button variant="ghost" className="rounded-2xl px-10 font-black text-gray-500 hover:bg-white/40 text-lg">Save Draft</Button>
                                <Button className="bg-ratel-green-600 hover:bg-ratel-green-700 text-white rounded-[2rem] px-14 h-16 font-black text-xl shadow-2xl hover:scale-105 hover:-rotate-1 active:scale-95 transition-all duration-300">Publish Listing</Button>
                            </div>
                        </div>
                    </div>

                    {/* Right: AI Price Intelligence Panel */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-8">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-gradient-to-br from-ratel-green-900 to-black text-white rounded-[3rem] p-10 shadow-2xl border-4 border-white/10 relative overflow-hidden group"
                            >
                                <div className="absolute top-0 right-0 w-48 h-48 bg-ratel-green-400/10 rounded-full blur-[80px] group-hover:scale-150 transition-transform duration-1000"></div>

                                <div className="flex items-center gap-4 mb-10 relative z-10">
                                    <div className="p-3 bg-white/10 rounded-[1.5rem] backdrop-blur-md">
                                        <Sparkles className="h-8 w-8 text-yellow-400 animate-pulse" />
                                    </div>
                                    <h3 className="font-black text-2xl tracking-tighter uppercase leading-none">AI Market <br />Observer</h3>
                                </div>

                                {!price ? (
                                    <div className="text-center py-16 text-gray-400 relative z-10">
                                        <div className="relative mb-6">
                                            <BarChart3 className="h-20 w-20 mx-auto opacity-10" />
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <TrendingUp className="h-10 w-10 text-ratel-green-500/20 animate-bounce" />
                                            </div>
                                        </div>
                                        <p className="text-sm font-black uppercase tracking-widest leading-relaxed">System standby.<br /><span className="text-xs opacity-50">INPUT PRICE FOR ANALYSIS</span></p>
                                    </div>
                                ) : isanalyzing ? (
                                    <div className="text-center py-16 relative z-10">
                                        <div className="h-16 w-16 border-4 border-ratel-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-8 shadow-[0_0_30px_rgba(34,197,94,0.3)]"></div>
                                        <p className="text-sm font-black uppercase tracking-[0.3em] text-gray-300 animate-pulse">Scanning Markets</p>
                                    </div>
                                ) : analysis && (
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10 relative z-10">
                                        <div className={`p-8 rounded-[2.5rem] border-2 backdrop-blur-xl ${analysis.status === "fair" ? "bg-green-500/10 border-green-500/40 shadow-[0_0_40px_rgba(34,197,94,0.1)]" : "bg-red-500/10 border-red-500/40 shadow-[0_0_40px_rgba(239,68,68,0.1)]"}`}>
                                            <div className="flex items-center gap-4 mb-3">
                                                {analysis.status === "fair" ? (
                                                    <div className="bg-green-500/20 p-2 rounded-xl">
                                                        <Check className="h-6 w-6 text-green-400" />
                                                    </div>
                                                ) : (
                                                    <div className="bg-red-500/20 p-2 rounded-xl">
                                                        <Info className="h-6 w-6 text-red-400" />
                                                    </div>
                                                )}
                                                <span className={`text-2xl font-black tracking-tighter uppercase ${analysis.status === "fair" ? "text-green-400" : "text-red-400"}`}>
                                                    {analysis.status === "fair" ? "Fair Price" : "High Alert"}
                                                </span>
                                            </div>
                                            <p className="text-base font-bold text-gray-300 leading-snug">
                                                {analysis.status === "fair"
                                                    ? "Optimized for Lagos demand. You'll receive the VDM Verified Shield instantly."
                                                    : `Your listing is ₦${formatPrice(parseInt(price) - analysis.marketAvg)} above the fair market threshold.`
                                                }
                                            </p>
                                        </div>

                                        <div className="space-y-6 px-4">
                                            <div className="flex justify-between items-center">
                                                <span className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em]">Market Avg</span>
                                                <span className="font-black text-2xl tabular-nums">{formatPrice(analysis.marketAvg)}</span>
                                            </div>
                                            <div className="flex justify-between items-center group">
                                                <span className="text-ratel-green-400 text-[10px] font-black uppercase tracking-[0.2em]">Ratel Best</span>
                                                <span className="font-black text-2xl text-green-400 tabular-nums group-hover:scale-110 transition-transform">{formatPrice(analysis.fairRangeLow)}</span>
                                            </div>
                                            <div className="h-px bg-white/10" />
                                            <div className="flex justify-between items-end pt-4">
                                                <div>
                                                    <p className="text-xs font-black uppercase tracking-widest text-yellow-400 mb-1">Sales Velocity</p>
                                                    <p className="text-4xl font-black tabular-nums">{analysis.salesProbability}</p>
                                                </div>
                                                <div className="bg-yellow-400/10 p-3 rounded-2xl">
                                                    <TrendingUp className="h-10 w-10 text-yellow-400" />
                                                </div>
                                            </div>
                                        </div>

                                        {analysis.status === "overpriced" && (
                                            <Button
                                                className="w-full bg-white text-black hover:bg-gray-100 h-16 rounded-[1.5rem] font-black text-xl shadow-[0_20px_40px_rgba(255,255,255,0.1)] transition-all hover:scale-[1.02] active:scale-95"
                                                onClick={() => setPrice(analysis.marketAvg.toString())}
                                            >
                                                Apply Fair Price
                                            </Button>
                                        )}
                                    </motion.div>
                                )}
                            </motion.div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
