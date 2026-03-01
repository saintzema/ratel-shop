"use client";

import React, { useEffect, useState } from "react";
import { DemoStore } from "@/lib/demo-store";
import { Promotion, Product } from "@/lib/types";
import { formatPrice } from "@/lib/utils";
import { Sparkles, TrendingUp, Eye, MousePointerClick, Calendar, Clock, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function SellerPromotionsPage() {
    const [promotions, setPromotions] = useState<(Promotion & { product?: Product })[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadPromotions = () => {
            const sellerId = DemoStore.getCurrentSellerId();
            if (!sellerId) return;

            const myPromotions = DemoStore.getPromotions(sellerId);
            const allProducts = DemoStore.getProducts();

            // Attach product details to each promotion for display
            const enrichedPromotions = myPromotions.map(promo => ({
                ...promo,
                product: allProducts.find(p => p.id === promo.product_id)
            })).sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());

            setPromotions(enrichedPromotions);
            setLoading(false);
        };

        loadPromotions();
        window.addEventListener("storage", loadPromotions);
        return () => window.removeEventListener("storage", loadPromotions);
    }, []);

    const activePromotions = promotions.filter(p => p.status === "active");
    const totalImpressions = promotions.reduce((sum, p) => sum + (p.impressions || 0), 0);
    const totalClicks = promotions.reduce((sum, p) => sum + (p.clicks || 0), 0);
    const totalSpend = promotions.reduce((sum, p) => sum + p.amount_paid, 0);

    const calculateDaysLeft = (expiresAt: string) => {
        const diff = new Date(expiresAt).getTime() - new Date().getTime();
        return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    };

    if (loading) {
        return <div className="p-8 text-center text-gray-500">Loading promotions...</div>;
    }

    return (
        <div className="space-y-6 max-w-6xl">
            <div>
                <h1 className="text-2xl font-black text-gray-900 tracking-tight">
                    Promoted Products
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                    Track the performance of your sponsored listings.
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                        <Sparkles className="h-4 w-4 text-emerald-600" />
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Active Promos</span>
                    </div>
                    <h3 className="text-3xl font-black text-gray-900 mt-2">{activePromotions.length}</h3>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                        <Eye className="h-4 w-4 text-blue-600" />
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Impressions</span>
                    </div>
                    <h3 className="text-3xl font-black text-gray-900 mt-2">{totalImpressions.toLocaleString()}</h3>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                        <MousePointerClick className="h-4 w-4 text-purple-600" />
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Clicks</span>
                    </div>
                    <h3 className="text-3xl font-black text-gray-900 mt-2">{totalClicks.toLocaleString()}</h3>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="h-4 w-4 text-amber-600" />
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Spend</span>
                    </div>
                    <h3 className="text-3xl font-black text-gray-900 mt-2">{formatPrice(totalSpend)}</h3>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h3 className="font-bold text-sm text-gray-900">Promotion History</h3>
                </div>

                {promotions.length === 0 ? (
                    <div className="p-12 text-center flex flex-col items-center">
                        <div className="h-16 w-16 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
                            <Sparkles className="h-8 w-8 text-emerald-500" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">No promotions yet</h3>
                        <p className="text-sm text-gray-500 max-w-sm mb-6">Boost your products to reach more customers. Promoted items appear at the top of search results and category pages.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50/50 text-gray-500 text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-4 font-bold">Product</th>
                                    <th className="px-6 py-4 font-bold">Plan</th>
                                    <th className="px-6 py-4 font-bold">Performance</th>
                                    <th className="px-6 py-4 font-bold">Duration</th>
                                    <th className="px-6 py-4 font-bold text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {promotions.map((promo) => {
                                    const daysLeft = calculateDaysLeft(promo.expires_at);
                                    let planLabel = "7 Days";
                                    if (promo.plan === "14_day") planLabel = "14 Days";
                                    if (promo.plan === "30_day") planLabel = "30 Days";

                                    const pctComplete = promo.status === "active"
                                        ? Math.min(100, Math.max(0, ((new Date().getTime() - new Date(promo.started_at).getTime()) / (new Date(promo.expires_at).getTime() - new Date(promo.started_at).getTime())) * 100))
                                        : 100;

                                    return (
                                        <tr key={promo.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 min-w-10 rounded-lg bg-gray-100 overflow-hidden flex items-center justify-center border border-gray-200">
                                                        {promo.product?.image_url ? (
                                                            <img src={promo.product.image_url} alt="" className="w-full h-full object-contain mix-blend-multiply" />
                                                        ) : (
                                                            <span className="text-[10px] text-gray-400">No Img</span>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-gray-900 line-clamp-1">{promo.product?.name || "Unknown Product"}</div>
                                                        <div className="text-xs text-emerald-600 font-medium">{formatPrice(promo.amount_paid)} paid</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="font-medium text-gray-900">{planLabel}</div>
                                                <div className="text-[11px] text-gray-500">Plan</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-4">
                                                    <div>
                                                        <div className="text-xs font-bold text-gray-900 flex items-center gap-1"><Eye className="h-3 w-3 text-gray-400" /> {promo.impressions || 0}</div>
                                                        <div className="text-[10px] text-gray-500">Impressions</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-xs font-bold text-gray-900 flex items-center gap-1"><MousePointerClick className="h-3 w-3 text-gray-400" /> {promo.clicks || 0}</div>
                                                        <div className="text-[10px] text-gray-500">Clicks</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="w-32">
                                                    <div className="flex justify-between text-[10px] font-bold mb-1">
                                                        <span className="text-gray-500">{new Date(promo.started_at).toLocaleDateString()}</span>
                                                        <span className={promo.status === "active" ? "text-emerald-600" : "text-gray-500"}>
                                                            {promo.status === "active" ? `${daysLeft} days left` : "Ended"}
                                                        </span>
                                                    </div>
                                                    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full transition-all ${promo.status === "active" ? "bg-emerald-500" : "bg-gray-400"}`}
                                                            style={{ width: `${pctComplete}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right whitespace-nowrap">
                                                {promo.status === "active" ? (
                                                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Active</Badge>
                                                ) : promo.status === "ended" ? (
                                                    <Badge className="bg-gray-100 text-gray-700 border-gray-200">Ended</Badge>
                                                ) : (
                                                    <Badge className="bg-red-50 text-red-700 border-red-200">Cancelled</Badge>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
