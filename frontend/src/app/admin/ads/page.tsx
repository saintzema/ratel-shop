"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Megaphone,
    TrendingUp,
    Eye,
    MousePointerClick,
    DollarSign,
    Play,
    Pause,
    CheckCircle,
    BarChart3,
    Target,
    Zap,
    ArrowUpRight,
    ArrowDownRight,
} from "lucide-react";

interface AdCampaign {
    id: string;
    seller_name: string;
    product_name: string;
    status: "active" | "paused" | "completed";
    budget: number;
    spent: number;
    impressions: number;
    clicks: number;
    conversions: number;
    created_at: string;
}

const DEMO_CAMPAIGNS: AdCampaign[] = [
    { id: "ad_1", seller_name: "TechHub Lagos", product_name: "iPhone 15 Pro Max 256GB", status: "active", budget: 500000, spent: 234500, impressions: 45200, clicks: 1820, conversions: 89, created_at: "2026-02-01" },
    { id: "ad_2", seller_name: "BeautyGlow NG", product_name: "Ordinary Niacinamide Serum", status: "active", budget: 150000, spent: 89000, impressions: 28400, clicks: 1240, conversions: 67, created_at: "2026-02-05" },
    { id: "ad_3", seller_name: "FashionForward", product_name: "Air Jordan Retro 4 Thunder", status: "paused", budget: 200000, spent: 143200, impressions: 32100, clicks: 980, conversions: 42, created_at: "2026-01-20" },
    { id: "ad_4", seller_name: "GameZone Pro", product_name: "PS5 DualSense Controller", status: "active", budget: 100000, spent: 67800, impressions: 18900, clicks: 720, conversions: 35, created_at: "2026-02-10" },
    { id: "ad_5", seller_name: "HomeEssentials", product_name: "Smart LED Strip Lights Pack", status: "completed", budget: 80000, spent: 80000, impressions: 22300, clicks: 890, conversions: 51, created_at: "2026-01-15" },
    { id: "ad_6", seller_name: "PhonePlanet", product_name: "Samsung Galaxy S24 Ultra", status: "active", budget: 350000, spent: 178900, impressions: 38700, clicks: 1560, conversions: 78, created_at: "2026-02-08" },
    { id: "ad_7", seller_name: "FitVibes Store", product_name: "Xiaomi Mi Band 8 Pro", status: "paused", budget: 120000, spent: 55000, impressions: 15200, clicks: 620, conversions: 28, created_at: "2026-02-12" },
];

export default function SponsoredAdsPage() {
    const [campaigns, setCampaigns] = useState<AdCampaign[]>(DEMO_CAMPAIGNS);
    const [filter, setFilter] = useState<"all" | "active" | "paused" | "completed">("all");

    const filtered = filter === "all" ? campaigns : campaigns.filter(c => c.status === filter);

    const totalSpend = campaigns.reduce((sum, c) => sum + c.spent, 0);
    const totalImpressions = campaigns.reduce((sum, c) => sum + c.impressions, 0);
    const totalClicks = campaigns.reduce((sum, c) => sum + c.clicks, 0);
    const avgCTR = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : "0.00";
    const activeCampaigns = campaigns.filter(c => c.status === "active").length;

    const togglePause = (id: string) => {
        setCampaigns(prev => prev.map(c => {
            if (c.id !== id) return c;
            return { ...c, status: c.status === "active" ? "paused" as const : "active" as const };
        }));
    };

    const getStatusConfig = (status: string) => {
        switch (status) {
            case "active": return { color: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100", icon: <Play className="h-3 w-3" />, label: "Active" };
            case "paused": return { color: "bg-amber-100 text-amber-700 hover:bg-amber-100", icon: <Pause className="h-3 w-3" />, label: "Paused" };
            case "completed": return { color: "bg-gray-100 text-gray-600 hover:bg-gray-100", icon: <CheckCircle className="h-3 w-3" />, label: "Completed" };
            default: return { color: "bg-gray-100 text-gray-600", icon: null, label: status };
        }
    };

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-3xl font-black text-gray-900 tracking-tight">Sponsored Ads</h2>
                <p className="text-sm text-gray-500 font-bold uppercase tracking-wider mt-1">Campaign performance & revenue analytics</p>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: "Active Campaigns", value: activeCampaigns.toString(), change: `${campaigns.length} total`, icon: Megaphone, color: "text-blue-600", bg: "bg-blue-50" },
                    { label: "Total Ad Spend", value: `₦${totalSpend.toLocaleString()}`, change: "+12% vs last month", icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50", up: true },
                    { label: "Total Impressions", value: totalImpressions.toLocaleString(), change: "+8.3% vs last month", icon: Eye, color: "text-purple-600", bg: "bg-purple-50", up: true },
                    { label: "Avg. Click Rate", value: `${avgCTR}%`, change: "Industry avg: 2.5%", icon: MousePointerClick, color: "text-amber-600", bg: "bg-amber-50" },
                ].map(m => (
                    <div key={m.label} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                            <div className={`p-2.5 rounded-xl ${m.bg}`}>
                                <m.icon className={`h-5 w-5 ${m.color}`} />
                            </div>
                            {m.up !== undefined && (
                                <div className="flex items-center gap-1">
                                    {m.up ? <ArrowUpRight className="h-3 w-3 text-emerald-500" /> : <ArrowDownRight className="h-3 w-3 text-rose-500" />}
                                    <span className={`text-[10px] font-bold ${m.up ? "text-emerald-600" : "text-rose-600"}`}>{m.change}</span>
                                </div>
                            )}
                        </div>
                        <p className="text-2xl font-black text-gray-900">{m.value}</p>
                        <p className="text-xs text-gray-500 mt-0.5 font-medium">{m.label}</p>
                        {m.up === undefined && <p className="text-[10px] text-gray-400 mt-1">{m.change}</p>}
                    </div>
                ))}
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2">
                {(["all", "active", "paused", "completed"] as const).map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${filter === f
                            ? "bg-gray-900 text-white shadow-sm"
                            : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                            }`}
                    >
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                        {f !== "all" && <span className="ml-1 opacity-60">({campaigns.filter(c => c.status === f).length})</span>}
                    </button>
                ))}
            </div>

            {/* Campaigns Table */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-100">
                                <th className="text-left px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Campaign</th>
                                <th className="text-left px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
                                <th className="text-right px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Budget</th>
                                <th className="text-right px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Spent</th>
                                <th className="text-right px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Impressions</th>
                                <th className="text-right px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Clicks</th>
                                <th className="text-right px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">CTR</th>
                                <th className="text-right px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Conv.</th>
                                <th className="text-center px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filtered.map(camp => {
                                const ctr = camp.impressions > 0 ? ((camp.clicks / camp.impressions) * 100).toFixed(2) : "0.00";
                                const pctSpent = camp.budget > 0 ? Math.round((camp.spent / camp.budget) * 100) : 0;
                                const statusConfig = getStatusConfig(camp.status);

                                return (
                                    <tr key={camp.id} className="hover:bg-gray-50 transition-colors">
                                        {/* Campaign Info */}
                                        <td className="px-6 py-4">
                                            <p className="font-bold text-sm text-gray-900 line-clamp-1">{camp.product_name}</p>
                                            <p className="text-[11px] text-gray-500 mt-0.5">{camp.seller_name}</p>
                                        </td>

                                        {/* Status */}
                                        <td className="px-6 py-4">
                                            <Badge className={`${statusConfig.color} border-none text-[10px] font-bold flex items-center gap-1 w-fit`}>
                                                {statusConfig.icon} {statusConfig.label}
                                            </Badge>
                                        </td>

                                        {/* Budget */}
                                        <td className="px-6 py-4 text-right">
                                            <span className="text-sm font-bold text-gray-900">₦{camp.budget.toLocaleString()}</span>
                                        </td>

                                        {/* Spent */}
                                        <td className="px-6 py-4 text-right">
                                            <div>
                                                <span className="text-sm font-medium text-gray-700">₦{camp.spent.toLocaleString()}</span>
                                                <div className="w-16 h-1.5 bg-gray-100 rounded-full mt-1 ml-auto overflow-hidden">
                                                    <div className={`h-full rounded-full ${pctSpent > 80 ? "bg-rose-500" : "bg-emerald-500"}`} style={{ width: `${Math.min(pctSpent, 100)}%` }} />
                                                </div>
                                            </div>
                                        </td>

                                        {/* Impressions */}
                                        <td className="px-6 py-4 text-right">
                                            <span className="text-sm font-medium text-gray-700">{camp.impressions.toLocaleString()}</span>
                                        </td>

                                        {/* Clicks */}
                                        <td className="px-6 py-4 text-right">
                                            <span className="text-sm font-medium text-gray-700">{camp.clicks.toLocaleString()}</span>
                                        </td>

                                        {/* CTR */}
                                        <td className="px-6 py-4 text-right">
                                            <span className={`text-sm font-bold ${parseFloat(ctr) >= 3 ? "text-emerald-600" : parseFloat(ctr) >= 2 ? "text-amber-600" : "text-gray-600"}`}>
                                                {ctr}%
                                            </span>
                                        </td>

                                        {/* Conversions */}
                                        <td className="px-6 py-4 text-right">
                                            <span className="text-sm font-bold text-gray-900">{camp.conversions}</span>
                                        </td>

                                        {/* Actions */}
                                        <td className="px-6 py-4 text-center">
                                            {camp.status !== "completed" && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => togglePause(camp.id)}
                                                    className={`h-7 px-3 rounded-lg text-[10px] font-bold ${camp.status === "active"
                                                        ? "border-amber-200 text-amber-600 hover:bg-amber-50"
                                                        : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                                                        }`}
                                                >
                                                    {camp.status === "active" ? (
                                                        <><Pause className="h-3 w-3 mr-1" /> Pause</>
                                                    ) : (
                                                        <><Play className="h-3 w-3 mr-1" /> Resume</>
                                                    )}
                                                </Button>
                                            )}
                                            {camp.status === "completed" && (
                                                <span className="text-[10px] text-gray-400 font-bold">Ended</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {filtered.length === 0 && (
                    <div className="p-12 text-center">
                        <Megaphone className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                        <p className="text-sm text-gray-400 font-medium">No campaigns found</p>
                    </div>
                )}
            </div>

            {/* Info Banner */}
            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl border border-indigo-100 p-6">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-white rounded-xl shadow-sm">
                        <BarChart3 className="h-6 w-6 text-indigo-600" />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 mb-1">Sponsored Ads Revenue Model</h3>
                        <p className="text-sm text-gray-600 leading-relaxed">
                            Sellers purchase ad placements to boost product visibility. FairPrice earns revenue from Cost Per Click (CPC) and Cost Per Impression (CPM) models.
                            Performance metrics are tracked in real-time to ensure optimal ROI for advertisers.
                        </p>
                        <div className="flex gap-4 mt-3">
                            <div className="flex items-center gap-1.5">
                                <Target className="h-3.5 w-3.5 text-indigo-600" />
                                <span className="text-xs font-bold text-gray-600">CPC: ₦15-50</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Zap className="h-3.5 w-3.5 text-indigo-600" />
                                <span className="text-xs font-bold text-gray-600">CPM: ₦500-2,000</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
