"use client";

import { useState, useEffect } from "react";
import { DemoStore } from "@/lib/demo-store";
import { AlertCircle, TrendingUp, BarChart3, Clock, Target, CreditCard, ChevronRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function PromotionsPage() {
    const [seller, setSeller] = useState<any>(null);
    const [products, setProducts] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showTopUp, setShowTopUp] = useState(false);

    // Mock wallet balance for ads
    const [adWalletBalance, setAdWalletBalance] = useState(15000);

    const loadData = () => {
        setIsLoading(true);
        const currentId = DemoStore.getCurrentSellerId();
        if (currentId) {
            const sellers = DemoStore.getSellers();
            setSeller(sellers.find((s) => s.id === currentId));
            const allProducts = DemoStore.getProducts({ includeInactiveSellers: true });
            setProducts(allProducts.filter(p => p.seller_id === currentId));
        }
        setIsLoading(false);
    };

    useEffect(() => {
        loadData();
        window.addEventListener("demo-store-update", loadData);
        window.addEventListener("storage", loadData);
        return () => {
            window.removeEventListener("demo-store-update", loadData);
            window.removeEventListener("storage", loadData);
        };
    }, []);

    const promotedProducts = products.filter(p => p.is_sponsored);
    const activeAdsCount = promotedProducts.length;

    if (isLoading) return <div className="p-8 text-center text-gray-500 animate-pulse">Loading ad network metrics...</div>;

    if (!seller) return (
        <div className="p-10 flex flex-col items-center justify-center text-center">
            <AlertCircle className="h-10 w-10 text-rose-500 mb-4" />
            <h2 className="text-xl font-black text-gray-900">Seller Identity Missing</h2>
            <p className="text-gray-500 max-w-sm mt-2">Create an account or login to access the Promotions Dashboard.</p>
        </div>
    );

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 relative z-10 pb-20">
            {/* Header / Wallet Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                        Promotions <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">Beta</span>
                    </h1>
                    <p className="text-sm md:text-base text-gray-500 font-medium mt-2 max-w-xl">
                        Boost your visibility across the FairPrice marketplace using our AI-driven ad engine.
                    </p>
                </div>
                <div className="bg-white/70 backdrop-blur-xl border border-white p-4 rounded-2xl shadow-sm flex items-center justify-between gap-6 shadow-indigo-500/5">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Ad Wallet Balance</p>
                        <p className="text-2xl font-black text-gray-900 mt-1">₦{adWalletBalance.toLocaleString()}</p>
                    </div>
                    <Button
                        onClick={() => setShowTopUp(true)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20"
                    >
                        Top Up
                    </Button>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white/60 backdrop-blur-md rounded-[24px] p-6 border border-white shadow-sm flex flex-col justify-between">
                    <div className="flex items-start justify-between">
                        <div className="h-10 w-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                            <Target className="h-5 w-5" />
                        </div>
                        <span className="text-[10px] bg-emerald-50 text-emerald-600 font-bold px-2 py-1 rounded-full">+12.4%</span>
                    </div>
                    <div className="mt-4">
                        <p className="text-[10px] uppercase font-bold tracking-widest text-gray-400">Total Impressions</p>
                        <h4 className="text-2xl font-black text-gray-900 mt-1">45,291</h4>
                    </div>
                </div>

                <div className="bg-white/60 backdrop-blur-md rounded-[24px] p-6 border border-white shadow-sm flex flex-col justify-between">
                    <div className="flex items-start justify-between">
                        <div className="h-10 w-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                            <TrendingUp className="h-5 w-5" />
                        </div>
                        <span className="text-[10px] bg-emerald-50 text-emerald-600 font-bold px-2 py-1 rounded-full">+8.1%</span>
                    </div>
                    <div className="mt-4">
                        <p className="text-[10px] uppercase font-bold tracking-widest text-gray-400">Total Clicks</p>
                        <h4 className="text-2xl font-black text-gray-900 mt-1">3,812</h4>
                    </div>
                </div>

                <div className="bg-white/60 backdrop-blur-md rounded-[24px] p-6 border border-white shadow-sm flex flex-col justify-between">
                    <div className="flex items-start justify-between">
                        <div className="h-10 w-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
                            <Zap className="h-5 w-5" />
                        </div>
                        <span className="text-[10px] bg-gray-100 text-gray-500 font-bold px-2 py-1 rounded-full">—</span>
                    </div>
                    <div className="mt-4">
                        <p className="text-[10px] uppercase font-bold tracking-widest text-gray-400">Avg. CTR</p>
                        <h4 className="text-2xl font-black text-gray-900 mt-1">8.42%</h4>
                    </div>
                </div>

                <div className="bg-white/60 backdrop-blur-md rounded-[24px] p-6 border border-white shadow-sm flex flex-col justify-between">
                    <div className="flex items-start justify-between">
                        <div className="h-10 w-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                            <BarChart3 className="h-5 w-5" />
                        </div>
                    </div>
                    <div className="mt-4">
                        <p className="text-[10px] uppercase font-bold tracking-widest text-gray-400">Ad Spend Today</p>
                        <h4 className="text-2xl font-black text-gray-900 mt-1">₦2,100</h4>
                    </div>
                </div>
            </div>

            {/* Active Campaigns */}
            <div className="bg-white/80 backdrop-blur-2xl rounded-[32px] border border-white/60 shadow-xl shadow-indigo-900/5 overflow-hidden">
                <div className="p-6 md:p-8 flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-gray-100/50">
                    <div>
                        <h3 className="text-lg font-black text-gray-900">Active Campaigns ({activeAdsCount})</h3>
                        <p className="text-xs font-bold text-gray-400 mt-1 tracking-wide">Products currently boosted in global search</p>
                    </div>
                    <Link href="/seller/products">
                        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20">
                            Promote New Product
                        </Button>
                    </Link>
                </div>

                <div className="overflow-x-auto">
                    {activeAdsCount === 0 ? (
                        <div className="p-16 text-center flex flex-col items-center justify-center bg-gray-50/50">
                            <div className="h-16 w-16 bg-white rounded-3xl shadow-sm flex items-center justify-center mb-4">
                                <Zap className="h-8 w-8 text-gray-300" />
                            </div>
                            <h4 className="text-lg font-black text-gray-900 mt-2">No Active Promotions</h4>
                            <p className="text-sm font-medium text-gray-500 mt-1 max-w-xs">You aren't running any sponsored ads right now. Boost your best sellers to dominate search results.</p>
                            <Link href="/seller/products" className="mt-6">
                                <Button variant="outline" className="border-gray-200 text-gray-900 font-bold rounded-xl">Go to Catalog</Button>
                            </Link>
                        </div>
                    ) : (
                        <table className="w-full text-left text-sm border-collapse min-w-[700px]">
                            <thead>
                                <tr className="bg-gray-50/50 text-[10px] font-black uppercase tracking-widest text-gray-400">
                                    <th className="px-8 py-4">Product</th>
                                    <th className="px-6 py-4">Est. ROI</th>
                                    <th className="px-6 py-4">Impressions</th>
                                    <th className="px-6 py-4">Clicks</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {promotedProducts.map(product => (
                                    <tr key={product.id} className="hover:bg-gray-50/30 transition-colors group">
                                        <td className="px-8 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="h-12 w-12 rounded-2xl bg-gray-100 border border-gray-200/50 overflow-hidden shrink-0">
                                                    {product.image_url ? (
                                                        <img src={product.image_url} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-gray-400 font-black text-xl">
                                                            P
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="min-w-0 pr-4">
                                                    <p className="font-bold text-gray-900 text-sm truncate">{product.name}</p>
                                                    <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">{product.category || 'General'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 text-emerald-600 text-xs font-bold">
                                                <TrendingUp className="h-3 w-3" />
                                                3.2x
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-bold text-gray-900">{(Math.random() * 5000 + 1000).toFixed(0)}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-bold text-gray-900">{(Math.random() * 500 + 50).toFixed(0)}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="border-gray-200 text-gray-600 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-100 rounded-xl font-bold transition-all text-[11px] uppercase tracking-wider h-8"
                                                onClick={() => DemoStore.promoteProduct(product.id, false)}
                                            >
                                                Stop Ad
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Wallet Top-up Modal */}
            <Dialog open={showTopUp} onOpenChange={setShowTopUp}>
                <DialogContent className="sm:max-w-[425px] overflow-hidden rounded-[32px] p-0 border-0 shadow-2xl">
                    <div className="p-8 pb-6 bg-gradient-to-br from-indigo-600 to-indigo-900 text-white relative">
                        {/* Abstract Background Vectors */}
                        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white opacity-[0.03] rotate-45 pointer-events-none" />
                        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 rounded-full bg-white opacity-[0.03] pointer-events-none" />

                        <DialogHeader>
                            <DialogTitle className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                                <CreditCard className="h-6 w-6 opacity-80" /> Top Up Wallet
                            </DialogTitle>
                            <DialogDescription className="text-indigo-100/70 font-medium pt-2">
                                Add funds to your advertising wallet to keep your sponsored campaigns running.
                            </DialogDescription>
                        </DialogHeader>
                    </div>

                    <div className="p-8 pt-6 space-y-6 bg-white/60 backdrop-blur-xl">
                        <div className="grid grid-cols-3 gap-3">
                            {[5000, 10000, 25000].map(amt => (
                                <button
                                    key={amt}
                                    onClick={() => {
                                        setAdWalletBalance(prev => prev + amt);
                                        setShowTopUp(false);
                                    }}
                                    className="bg-white border-2 border-gray-100 hover:border-indigo-600 hover:bg-indigo-50/50 p-4 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all group shadow-sm hover:shadow-md"
                                >
                                    <span className="text-sm font-black text-gray-900 group-hover:text-indigo-700">₦{amt.toLocaleString()}</span>
                                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">+{(amt * 0.1).toFixed(0)} Bonus</span>
                                </button>
                            ))}
                        </div>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-gray-100" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-[#FAF9FC] px-3 font-bold text-gray-400 tracking-wider">or custom amount</span>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <div className="relative flex-1">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₦</span>
                                <input
                                    type="number"
                                    placeholder="Enter amount"
                                    className="w-full pl-8 pr-4 h-12 rounded-xl border border-gray-200 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none font-bold text-gray-900 placeholder:text-gray-300"
                                />
                            </div>
                            <Button
                                onClick={() => {
                                    setAdWalletBalance(prev => prev + 5000); // Mock logic
                                    setShowTopUp(false);
                                }}
                                className="h-12 px-6 bg-gray-900 hover:bg-black text-white rounded-xl font-bold"
                            >
                                Pay
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

        </div>
    );
}
