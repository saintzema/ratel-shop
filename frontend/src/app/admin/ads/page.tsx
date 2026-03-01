"use client";

import React, { useEffect, useState } from "react";
import { DemoStore } from "@/lib/demo-store";
import { Promotion, Product, Seller } from "@/lib/types";
import { formatPrice } from "@/lib/utils";
import { Sparkles, Eye, MousePointerClick, Search as SearchIcon, XCircle, PlusCircle, AlertCircle, RefreshCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export default function SponsoredAdsPage() {
    const [promotions, setPromotions] = useState<(Promotion & { product?: Product, seller?: Seller })[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    // Action Modals State
    const [extendModalOpen, setExtendModalOpen] = useState(false);
    const [endModalOpen, setEndModalOpen] = useState(false);
    const [selectedPromo, setSelectedPromo] = useState<(Promotion & { product?: Product, seller?: Seller }) | null>(null);
    const [extendDays, setExtendDays] = useState(7);

    useEffect(() => {
        loadData();
        window.addEventListener("storage", loadData);
        return () => window.removeEventListener("storage", loadData);
    }, []);

    const loadData = () => {
        const allPromotions = DemoStore.getPromotions(); // Custom raw getter
        const allProducts = DemoStore.getProducts();
        const allSellers = DemoStore.getSellers();

        const enriched = allPromotions.map(promo => ({
            ...promo,
            product: allProducts.find(p => p.id === promo.product_id),
            seller: allSellers.find(s => s.id === promo.seller_id)
        })).sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());

        setPromotions(enriched);
        setLoading(false);
    };

    const handleEndPromotion = () => {
        if (!selectedPromo) return;
        DemoStore.endPromotion(selectedPromo.id);
        setEndModalOpen(false);
        loadData();
    };

    const handleExtendPromotion = () => {
        if (!selectedPromo) return;
        DemoStore.extendPromotion(selectedPromo.id, extendDays);
        setExtendModalOpen(false);
        setExtendDays(7);
        loadData();
    };

    const filteredPromos = promotions.filter(promo =>
        promo.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        promo.product?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        promo.seller?.business_name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const activeCount = promotions.filter(p => p.status === "active").length;
    const totalRevenue = promotions.reduce((sum, p) => sum + p.amount_paid, 0);
    const totalImpressions = promotions.reduce((sum, p) => sum + p.impressions, 0);

    const calculateDaysLeft = (expiresAt: string) => {
        const diff = new Date(expiresAt).getTime() - new Date().getTime();
        return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading promotion data...</div>;

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                        <Sparkles className="h-6 w-6 text-emerald-600" />
                        Ads & Promotions
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Manage sponsored products and seller campaigns.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" className="hidden sm:flex border-gray-200" onClick={loadData}>
                        <RefreshCcw className="h-4 w-4 mr-2" /> Refresh
                    </Button>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Total Ad Revenue</div>
                    <div className="text-3xl font-black text-emerald-600">{formatPrice(totalRevenue)}</div>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Active Campaigns</div>
                    <div className="text-3xl font-black text-gray-900">{activeCount}</div>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Total Campaigns</div>
                    <div className="text-3xl font-black text-gray-900">{promotions.length}</div>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Total Impressions</div>
                    <div className="text-3xl font-black text-purple-600">{totalImpressions.toLocaleString()}</div>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search campaigns, products, or sellers..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 pr-4 py-2.5 w-full border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
                    />
                </div>
            </div>

            {/* Campaigns Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50/50 text-gray-500 text-xs uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4 font-bold">Campaign</th>
                                <th className="px-6 py-4 font-bold">Seller</th>
                                <th className="px-6 py-4 font-bold">Duration & Status</th>
                                <th className="px-6 py-4 font-bold">Performance</th>
                                <th className="px-6 py-4 font-bold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredPromos.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                        No campaigns found matching "{searchQuery}"
                                    </td>
                                </tr>
                            ) : (
                                filteredPromos.map((promo) => {
                                    const daysLeft = calculateDaysLeft(promo.expires_at);
                                    const pctComplete = promo.status === "active"
                                        ? Math.min(100, Math.max(0, ((new Date().getTime() - new Date(promo.started_at).getTime()) / (new Date(promo.expires_at).getTime() - new Date(promo.started_at).getTime())) * 100))
                                        : 100;

                                    return (
                                        <tr key={promo.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 shrink-0 rounded-lg bg-gray-100 border border-gray-200 overflow-hidden">
                                                        {promo.product?.image_url ? (
                                                            <img src={promo.product.image_url} alt="" className="w-full h-full object-contain mix-blend-multiply p-1" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">No Img</div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-gray-900 line-clamp-1">{promo.product?.name || "Unknown Product"}</div>
                                                        <div className="text-[11px] text-gray-500 font-mono mt-0.5">{promo.id}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-gray-900">{promo.seller?.business_name || "Unknown Seller"}</div>
                                                <div className="text-[11px] text-emerald-600 font-bold">{formatPrice(promo.amount_paid)} paid</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 mb-1.5">
                                                    {promo.status === "active" ? (
                                                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 uppercase text-[10px] tracking-wider">Active • {daysLeft}d left</Badge>
                                                    ) : promo.status === "ended" ? (
                                                        <Badge className="bg-gray-100 text-gray-700 border-gray-200 uppercase text-[10px] tracking-wider">Ended</Badge>
                                                    ) : (
                                                        <Badge className="bg-red-50 text-red-700 border-red-200 uppercase text-[10px] tracking-wider">Cancelled</Badge>
                                                    )}
                                                </div>
                                                {promo.status === "active" && (
                                                    <div className="w-32">
                                                        <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                                            <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pctComplete}%` }} />
                                                        </div>
                                                        <div className="flex justify-between text-[9px] text-gray-400 font-mono mt-1 uppercase tracking-wider">
                                                            <span>{new Date(promo.started_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                                                            <span>{new Date(promo.expires_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
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
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2 text-gray-400">
                                                    {promo.status === "active" ? (
                                                        <>
                                                            <button
                                                                onClick={() => { setSelectedPromo(promo); setExtendModalOpen(true); }}
                                                                className="p-1.5 hover:bg-emerald-50 hover:text-emerald-600 rounded-lg transition-colors border border-transparent hover:border-emerald-200"
                                                                title="Extend Duration"
                                                            >
                                                                <PlusCircle className="h-4 w-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => { setSelectedPromo(promo); setEndModalOpen(true); }}
                                                                className="p-1.5 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors border border-transparent hover:border-red-200"
                                                                title="End Early"
                                                            >
                                                                <XCircle className="h-4 w-4" />
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <span className="text-xs italic text-gray-400">No actions</span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Extend Promo Modal */}
            <Dialog open={extendModalOpen} onOpenChange={setExtendModalOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Extend Campaign</DialogTitle>
                        <DialogDescription>
                            Add bonus days to this seller's promotion. This action is free for the seller and done at admin discretion.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="bg-gray-50 p-3 rounded-lg flex items-center gap-3 border border-gray-100">
                            <div className="h-10 w-10 bg-white rounded flex items-center justify-center border border-gray-200">
                                {selectedPromo?.product?.image_url && <img src={selectedPromo.product.image_url} alt="" className="h-8 w-8 object-contain" />}
                            </div>
                            <div>
                                <p className="font-bold text-sm text-gray-900 line-clamp-1">{selectedPromo?.product?.name}</p>
                                <p className="text-xs text-gray-500">{selectedPromo?.seller?.business_name}</p>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700">Days to Add</label>
                            <Input
                                type="number"
                                min={1}
                                max={30}
                                value={extendDays}
                                onChange={(e) => setExtendDays(parseInt(e.target.value) || 0)}
                                className="font-mono"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setExtendModalOpen(false)}>Cancel</Button>
                        <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleExtendPromotion}>Confirm Extension</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* End Promo Modal */}
            <Dialog open={endModalOpen} onOpenChange={setEndModalOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="text-red-600 flex items-center gap-2"><AlertCircle className="h-5 w-5" /> End Campaign Early</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to terminate this campaign immediately? The product will lose its sponsored status. This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-2">
                        <div className="bg-red-50 p-3 rounded-lg border border-red-100 text-sm text-red-800">
                            <span className="font-bold">Campaign ID:</span> {selectedPromo?.id}
                            <br />
                            <span className="font-bold">Product:</span> {selectedPromo?.product?.name}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEndModalOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleEndPromotion}>Terminate Campaign</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
