"use client";

import { useState, useEffect, useMemo } from "react";
import {
    Download,
    TrendingUp,
    Calendar,
    BarChart3,
    FileText,
    ArrowUpRight,
    ArrowDownRight,
    Activity,
    Minus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataSyncService } from "@/lib/sync-store";
import { formatPrice } from "@/lib/utils";
import { useRouter } from "next/navigation";

const STATUS_LABELS: Record<string, string> = {
    pending: "Pending", processing: "Processing", shipped: "Shipped",
    delivered: "Delivered", cancelled: "Cancelled", return_requested: "Return requested",
    return_approved: "Return approved", return_rejected: "Return rejected", returned: "Returned",
};

interface PeriodMetrics {
    revenue: number;
    orders: number;
    aov: number;
}

interface DayPoint {
    key: string;
    label: string;
    revenue: number;
    orders: number;
}

interface PeriodReport {
    label: string;
    periodDays: number;
    rangeText: string;
    current: PeriodMetrics;
    previous: PeriodMetrics;
    statusBreakdown: { status: string; count: number; amount: number }[];
    topProducts: { name: string; units: number; revenue: number }[];
    dailySeries: DayPoint[];
}

function pctChange(curr: number, prev: number): number {
    if (prev === 0) return curr === 0 ? 0 : 100;
    return ((curr - prev) / prev) * 100;
}

function metricsFor(orders: any[]): PeriodMetrics {
    const revenue = orders.reduce((s, o) => s + (o.amount || 0), 0);
    const count = orders.length;
    return { revenue, orders: count, aov: count ? revenue / count : 0 };
}

function dailySeriesFor(orders: any[], days: number, rangeEnd: Date): DayPoint[] {
    const buckets = new Map<string, DayPoint>();
    for (let i = 0; i < days; i++) {
        const d = new Date(rangeEnd);
        d.setDate(d.getDate() - (days - i));
        d.setHours(0, 0, 0, 0);
        const key = d.toISOString().slice(0, 10);
        buckets.set(key, {
            key,
            label: d.toLocaleDateString("en-NG", { month: "short", day: "numeric" }),
            revenue: 0,
            orders: 0,
        });
    }
    orders.forEach(o => {
        const d = new Date(o.created_at);
        d.setHours(0, 0, 0, 0);
        const key = d.toISOString().slice(0, 10);
        const bucket = buckets.get(key);
        if (bucket) { bucket.revenue += o.amount || 0; bucket.orders += 1; }
    });
    return Array.from(buckets.values());
}

/**
 * Builds one period's real numbers PLUS the equivalent prior period for a
 * genuine comparison — "trailing N full days ending yesterday" rather than
 * calendar-locked, so "Daily" is always exactly yesterday's real trading day
 * (today is still in progress and would understate itself).
 */
function buildReport(label: string, orders: any[], products: any[], days: number): PeriodReport {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const periodEnd = todayStart; // exclusive
    const periodStart = new Date(periodEnd); periodStart.setDate(periodStart.getDate() - days);
    const prevEnd = periodStart;
    const prevStart = new Date(prevEnd); prevStart.setDate(prevStart.getDate() - days);

    const inRange = (o: any, start: Date, end: Date) => {
        const t = new Date(o.created_at).getTime();
        return t >= start.getTime() && t < end.getTime();
    };

    const currentOrders = orders.filter(o => inRange(o, periodStart, periodEnd));
    const previousOrders = orders.filter(o => inRange(o, prevStart, prevEnd));

    const statusMap = new Map<string, { status: string; count: number; amount: number }>();
    currentOrders.forEach(o => {
        const e = statusMap.get(o.status) || { status: o.status, count: 0, amount: 0 };
        e.count += 1; e.amount += o.amount || 0;
        statusMap.set(o.status, e);
    });

    const productMap = new Map<string, { product_id: string; units: number; revenue: number }>();
    currentOrders.forEach(o => {
        const e = productMap.get(o.product_id) || { product_id: o.product_id, units: 0, revenue: 0 };
        e.units += o.quantity || 1; e.revenue += o.amount || 0;
        productMap.set(o.product_id, e);
    });
    const topProducts = Array.from(productMap.values())
        .map(e => ({ name: products.find((p: any) => p.id === e.product_id)?.name || "Deleted product", units: e.units, revenue: e.revenue }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

    const fmtDate = (d: Date) => d.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
    const lastDay = new Date(periodEnd); lastDay.setDate(lastDay.getDate() - 1);
    const rangeText = days === 1 ? fmtDate(periodStart) : `${fmtDate(periodStart)} — ${fmtDate(lastDay)}`;

    return {
        label,
        periodDays: days,
        rangeText,
        current: metricsFor(currentOrders),
        previous: metricsFor(previousOrders),
        statusBreakdown: Array.from(statusMap.values()).sort((a, b) => b.amount - a.amount),
        topProducts,
        dailySeries: dailySeriesFor(currentOrders, Math.min(days, 31), periodEnd),
    };
}

const REPORT_DAYS: Record<string, number> = {
    "Daily Flash": 1,
    "Weekly Performance": 7,
    "Monthly Summary": 30,
    "Annual Growth": 365,
};

export default function AnalyticsPage() {
    const [downloading, setDownloading] = useState<string | null>(null);
    const [stats, setStats] = useState({ revenue: 0, orders: 0, conversion: 0, visits: 0 });
    const [allOrders, setAllOrders] = useState<any[]>([]);
    const [allProducts, setAllProducts] = useState<any[]>([]);
    const [sellerName, setSellerName] = useState("");
    const [sellerPlan, setSellerPlan] = useState("Starter");
    const [chartDays, setChartDays] = useState(30);
    const [reportData, setReportData] = useState<PeriodReport | null>(null);
    const router = useRouter();

    useEffect(() => {
        const sellerId = DataSyncService.getCurrentSellerId();
        const seller = DataSyncService.getCurrentSeller();
        if (seller) {
            setSellerName(seller.business_name);
            setSellerPlan(seller.subscription_plan || "Starter");
        }
        if (!sellerId) return;

        // Traffic and conversion were fabricated (Math.random() layered onto order
        // count) and shown to the seller as if real — the same class of bug already
        // removed from product reviews and competitor pricing elsewhere in this app.
        // Product.viewCount is real, tracked on every product page visit — use it.
        DataSyncService.autoSync();
        DataSyncService.syncWithDB("orders", true);

        const loadData = () => {
            const orders = DataSyncService.getOrders().filter(o => o.seller_id === sellerId);
            const products = DataSyncService.getProducts({ includeInactiveSellers: true }).filter(p => p.seller_id === sellerId);
            setAllOrders(orders);
            setAllProducts(products);
            const totalRevenue = orders.reduce((sum, o) => sum + (o.amount || 0), 0);
            const totalOrders = orders.length;
            const totalVisits = products.reduce((sum, p: any) => sum + (p.view_count || 0), 0);
            const conversionRate = totalVisits === 0 ? 0 : (totalOrders / totalVisits) * 100;

            setStats({
                revenue: totalRevenue,
                orders: totalOrders,
                conversion: conversionRate,
                visits: totalVisits
            });
        };
        loadData();
        window.addEventListener("sync-store-update", loadData);
        return () => window.removeEventListener("sync-store-update", loadData);
    }, []);

    // Real trailing-30-vs-prior-30-days comparison for the top KPI badges —
    // replaces what used to be hardcoded "+14.5%" / "+5.2%" style numbers
    // that never reflected this seller's actual activity.
    const trend30 = useMemo(() => buildReport("Trend", allOrders, allProducts, 30), [allOrders, allProducts]);
    const chartSeries = useMemo(() => dailySeriesFor(allOrders, chartDays, new Date()), [allOrders, chartDays]);
    const chartMax = Math.max(1, ...chartSeries.map(d => d.revenue));

    const handleDownloadPDF = async (reportType: string) => {
        // Enforce plan tiers
        if (reportType === 'Monthly Summary') {
            if (sellerPlan === 'Starter') {
                alert("Monthly Summary reports require a PRO plan or higher. Upgrade your plan to access this feature.");
                router.push('/seller/settings/billing');
                return;
            }
        } else if (reportType === 'Annual Growth') {
            if (sellerPlan === 'Starter' || sellerPlan === 'Pro') {
                alert("Annual Growth reports require a GROWTH plan or higher. Upgrade your plan to access this feature.");
                router.push('/seller/settings/billing');
                return;
            }
        }

        const report = buildReport(reportType, allOrders, allProducts, REPORT_DAYS[reportType] || 30);
        setReportData(report);
        setDownloading(reportType);
        // Allow state to update and render the print view before invoking print.
        setTimeout(() => {
            window.print();
            setDownloading(null);
        }, 500);
    };

    const TrendBadge = ({ pct }: { pct: number }) => {
        const flat = Math.abs(pct) < 0.05;
        return (
            <div className={`flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg ${flat ? 'bg-gray-100 text-gray-500' : pct > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                {flat ? <Minus className="h-3 w-3" /> : pct > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {flat ? "0.0%" : `${pct > 0 ? "+" : ""}${pct.toFixed(1)}%`}
            </div>
        );
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Analytics & Reports</h1>
                    <p className="text-sm text-gray-500 font-medium mt-1">Export your store's performance data as professional PDF reports.</p>
                </div>
            </div>

            {/* Quick Stats Grid — Revenue/Orders trends are real (last 30 days vs
                the 30 days before); Conversion/Visits have no historical log to
                compare against, so they show a plain lifetime total instead of a
                fabricated change figure. */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
                <div className="bg-white rounded-[24px] border border-gray-100 p-6 shadow-sm">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Total Revenue</p>
                    <div className="flex items-end justify-between">
                        <p className="text-2xl font-black text-gray-900">{formatPrice(stats.revenue)}</p>
                        <TrendBadge pct={pctChange(trend30.current.revenue, trend30.previous.revenue)} />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1.5">vs. prior 30 days</p>
                </div>
                <div className="bg-white rounded-[24px] border border-gray-100 p-6 shadow-sm">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Orders</p>
                    <div className="flex items-end justify-between">
                        <p className="text-2xl font-black text-gray-900">{stats.orders.toString()}</p>
                        <TrendBadge pct={pctChange(trend30.current.orders, trend30.previous.orders)} />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1.5">vs. prior 30 days</p>
                </div>
                <div className="bg-white rounded-[24px] border border-gray-100 p-6 shadow-sm">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Conversion Rate</p>
                    <p className="text-2xl font-black text-gray-900">{stats.conversion.toFixed(1)}%</p>
                    <p className="text-[10px] text-gray-400 mt-1.5">Lifetime — orders ÷ product views</p>
                </div>
                <div className="bg-white rounded-[24px] border border-gray-100 p-6 shadow-sm">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Store Visits</p>
                    <p className="text-2xl font-black text-gray-900">{stats.visits.toLocaleString()}</p>
                    <p className="text-[10px] text-gray-400 mt-1.5">Lifetime product-page views</p>
                </div>
            </div>

            {/* Report Downloads Section */}
            <div className="bg-white rounded-[32px] border border-gray-100 p-6 md:p-10 shadow-sm relative overflow-hidden print:hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2" />

                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                            <FileText className="h-6 w-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Downloadable PDF Reports</h2>
                            <p className="text-sm text-gray-500">Real, period-scoped numbers — revenue, order mix, top products and day-by-day trend, each compared to the equivalent prior period.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Daily Report */}
                        <div className="group border border-gray-100 hover:border-indigo-200 rounded-2xl p-6 transition-all hover:shadow-lg hover:shadow-indigo-500/5 bg-gray-50/50 hover:bg-white flex flex-col">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="p-3 bg-white border border-gray-100 shadow-sm rounded-xl text-gray-400 group-hover:text-indigo-600 transition-colors">
                                    <Activity className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900">Daily Flash Report</h3>
                                    <p className="text-xs text-gray-500">Yesterday's sales, vs. the day before</p>
                                </div>
                            </div>
                            <div className="mt-auto">
                                <Button
                                    onClick={() => handleDownloadPDF('Daily Flash')}
                                    disabled={downloading === 'Daily Flash'}
                                    variant="outline"
                                    className="w-full h-12 rounded-xl border-gray-200 text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 font-bold tracking-wide transition-all group-hover:bg-indigo-600 group-hover:text-white group-hover:border-transparent"
                                >
                                    {downloading === 'Daily Flash' ? (
                                        <div className="h-5 w-5 border-2 border-current border-t-transparent animate-spin rounded-full" />
                                    ) : (
                                        <><Download className="h-4 w-4 mr-2" /> Download PDF</>
                                    )}
                                </Button>
                            </div>
                        </div>

                        {/* Weekly Report */}
                        <div className="group border border-gray-100 hover:border-indigo-200 rounded-2xl p-6 transition-all hover:shadow-lg hover:shadow-indigo-500/5 bg-gray-50/50 hover:bg-white flex flex-col">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="p-3 bg-white border border-gray-100 shadow-sm rounded-xl text-gray-400 group-hover:text-indigo-600 transition-colors">
                                    <Calendar className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900">Weekly Performance</h3>
                                    <p className="text-xs text-gray-500">Last 7 days vs. the 7 days before</p>
                                </div>
                            </div>
                            <div className="mt-auto">
                                <Button
                                    onClick={() => handleDownloadPDF('Weekly Performance')}
                                    disabled={downloading === 'Weekly Performance'}
                                    variant="outline"
                                    className="w-full h-12 rounded-xl border-gray-200 text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 font-bold tracking-wide transition-all group-hover:bg-indigo-600 group-hover:text-white group-hover:border-transparent"
                                >
                                    {downloading === 'Weekly Performance' ? (
                                        <div className="h-5 w-5 border-2 border-current border-t-transparent animate-spin rounded-full" />
                                    ) : (
                                        <><Download className="h-4 w-4 mr-2" /> Download PDF</>
                                    )}
                                </Button>
                            </div>
                        </div>

                        {/* Monthly Report */}
                        <div className="group border border-gray-100 hover:border-indigo-200 rounded-2xl p-6 transition-all hover:shadow-lg hover:shadow-indigo-500/5 bg-gray-50/50 hover:bg-white flex flex-col relative overflow-hidden">
                            <div className="absolute top-0 right-0 bg-blue-100 text-blue-700 text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-bl-lg">
                                Pro Plan
                            </div>
                            <div className="flex items-center gap-4 mb-4">
                                <div className="p-3 bg-white border border-gray-100 shadow-sm rounded-xl text-gray-400 group-hover:text-indigo-600 transition-colors">
                                    <BarChart3 className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900">Monthly Summary</h3>
                                    <p className="text-xs text-gray-500">Last 30 days vs. the 30 days before</p>
                                </div>
                            </div>
                            <div className="mt-auto">
                                <Button
                                    onClick={() => handleDownloadPDF('Monthly Summary')}
                                    disabled={downloading === 'Monthly Summary'}
                                    variant="outline"
                                    className="w-full h-12 rounded-xl border-gray-200 text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 font-bold tracking-wide transition-all group-hover:bg-indigo-600 group-hover:text-white group-hover:border-transparent"
                                >
                                    {downloading === 'Monthly Summary' ? (
                                        <div className="h-5 w-5 border-2 border-current border-t-transparent animate-spin rounded-full" />
                                    ) : (
                                        <><Download className="h-4 w-4 mr-2" /> Download PDF</>
                                    )}
                                </Button>
                            </div>
                        </div>

                        {/* Annual Report */}
                        <div className="group border border-amber-200 hover:border-amber-400 rounded-2xl p-6 transition-all hover:shadow-lg hover:shadow-amber-500/20 bg-gradient-to-br from-amber-50/50 to-orange-50/50 flex flex-col relative overflow-hidden">
                            <div className="absolute top-0 right-0 bg-amber-400 text-amber-900 text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-bl-lg">
                                Growth Plan
                            </div>
                            <div className="flex items-center gap-4 mb-4">
                                <div className="p-3 bg-white border border-amber-200 shadow-sm rounded-xl text-amber-500">
                                    <TrendingUp className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900">Annual Growth Report</h3>
                                    <p className="text-xs text-gray-600">Last 365 days vs. the 365 days before</p>
                                </div>
                            </div>
                            <div className="mt-auto">
                                <Button
                                    onClick={() => handleDownloadPDF('Annual Growth')}
                                    disabled={downloading === 'Annual Growth'}
                                    className="w-full h-12 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold tracking-wide shadow-md shadow-amber-500/20"
                                >
                                    {downloading === 'Annual Growth' ? (
                                        <div className="h-5 w-5 border-2 border-white/30 border-t-white animate-spin rounded-full" />
                                    ) : (
                                        <><Download className="h-4 w-4 mr-2" /> Download Annual PDF</>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Revenue Overview — real daily order totals for the selected
                window, not a fixed decorative bar shape. */}
            <div className="bg-white rounded-[32px] border border-gray-100 p-8 shadow-sm print:hidden">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 tracking-tight">Revenue Overview</h3>
                        <p className="text-sm text-gray-500">Your earnings over the last {chartDays} days</p>
                    </div>
                    <select
                        value={chartDays}
                        onChange={e => setChartDays(Number(e.target.value))}
                        className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 h-10"
                    >
                        <option value={7}>Last 7 Days</option>
                        <option value={30}>Last 30 Days</option>
                        <option value={365}>This Year</option>
                    </select>
                </div>

                {chartSeries.every(d => d.revenue === 0) ? (
                    <div className="h-64 flex flex-col items-center justify-center text-center gap-2">
                        <BarChart3 className="h-8 w-8 text-gray-200" />
                        <p className="text-sm text-gray-400">No orders in this window yet.</p>
                    </div>
                ) : (
                    <div className="h-64 w-full flex items-end justify-between gap-1">
                        {chartSeries.map((d) => {
                            const heightPct = Math.max(2, (d.revenue / chartMax) * 100);
                            const isPeak = d.revenue === chartMax && chartMax > 0;
                            return (
                                <div key={d.key} className="flex-1 h-full flex items-end">
                                    <div className="w-full bg-indigo-50 hover:bg-indigo-100 rounded-t-sm transition-colors relative group" style={{ height: `${heightPct}%` }}>
                                        <div className="absolute opacity-0 group-hover:opacity-100 -top-12 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs font-bold py-1.5 px-2.5 rounded-md pointer-events-none transition-opacity whitespace-nowrap z-10">
                                            {formatPrice(d.revenue)}
                                            <div className="text-[10px] text-white/60 font-medium">{d.label} · {d.orders} order{d.orders === 1 ? "" : "s"}</div>
                                        </div>
                                        <div className={`w-full h-full rounded-t-sm ${isPeak ? 'bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]' : d.revenue > chartMax * 0.6 ? 'bg-indigo-400' : d.revenue > 0 ? 'bg-indigo-200' : 'bg-gray-100'}`} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Print-Only Report Component — a genuinely different, detailed
                breakdown per report type instead of the same four lifetime
                numbers under a different heading. */}
            <style jsx global>{`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    #print-report, #print-report * {
                        visibility: visible;
                    }
                    #print-report {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                    }
                }
            `}</style>

            {reportData && (
                <div id="print-report" className="hidden print:block p-8 bg-white text-black font-sans">
                    <div className="border-b-2 border-gray-900 pb-6 mb-8 flex justify-between items-end">
                        <div>
                            <h1 className="text-4xl font-black tracking-tighter">FairPrice.ng</h1>
                            <p className="text-gray-500 font-medium">Business Performance Report</p>
                        </div>
                        <div className="text-right">
                            <p className="font-bold text-xl">{sellerName}</p>
                            <p className="text-sm text-gray-500">Report: {reportData.label}</p>
                            <p className="text-sm text-gray-500">Period: {reportData.rangeText}</p>
                            <p className="text-sm text-gray-500">Generated: {new Date().toLocaleString()}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-6 mb-10">
                        <div className="border border-gray-200 p-5 rounded-2xl">
                            <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-1">Revenue</p>
                            <p className="text-3xl font-black">{formatPrice(reportData.current.revenue)}</p>
                            <p className={`text-xs font-bold mt-1 ${reportData.current.revenue >= reportData.previous.revenue ? "text-emerald-600" : "text-rose-600"}`}>
                                {pctChange(reportData.current.revenue, reportData.previous.revenue) >= 0 ? "+" : ""}{pctChange(reportData.current.revenue, reportData.previous.revenue).toFixed(1)}% vs. prior period ({formatPrice(reportData.previous.revenue)})
                            </p>
                        </div>
                        <div className="border border-gray-200 p-5 rounded-2xl">
                            <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-1">Orders</p>
                            <p className="text-3xl font-black">{reportData.current.orders}</p>
                            <p className={`text-xs font-bold mt-1 ${reportData.current.orders >= reportData.previous.orders ? "text-emerald-600" : "text-rose-600"}`}>
                                {pctChange(reportData.current.orders, reportData.previous.orders) >= 0 ? "+" : ""}{pctChange(reportData.current.orders, reportData.previous.orders).toFixed(1)}% vs. prior period ({reportData.previous.orders})
                            </p>
                        </div>
                        <div className="border border-gray-200 p-5 rounded-2xl">
                            <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-1">Avg. Order Value</p>
                            <p className="text-3xl font-black">{formatPrice(reportData.current.aov)}</p>
                            <p className="text-xs text-gray-400 font-bold mt-1">Prior period: {formatPrice(reportData.previous.aov)}</p>
                        </div>
                    </div>

                    <div className="mb-10">
                        <h2 className="text-sm font-black uppercase tracking-widest text-gray-500 mb-3">Order status breakdown</h2>
                        {reportData.statusBreakdown.length === 0 ? (
                            <p className="text-sm text-gray-400">No orders in this period.</p>
                        ) : (
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-300 text-left text-gray-500 uppercase text-[10px] tracking-widest">
                                        <th className="py-2">Status</th>
                                        <th className="py-2 text-right">Orders</th>
                                        <th className="py-2 text-right">Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {reportData.statusBreakdown.map(s => (
                                        <tr key={s.status} className="border-b border-gray-100">
                                            <td className="py-2 font-semibold">{STATUS_LABELS[s.status] || s.status}</td>
                                            <td className="py-2 text-right">{s.count}</td>
                                            <td className="py-2 text-right font-bold">{formatPrice(s.amount)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    <div className="mb-10">
                        <h2 className="text-sm font-black uppercase tracking-widest text-gray-500 mb-3">Top products this period</h2>
                        {reportData.topProducts.length === 0 ? (
                            <p className="text-sm text-gray-400">No sales in this period.</p>
                        ) : (
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-300 text-left text-gray-500 uppercase text-[10px] tracking-widest">
                                        <th className="py-2">Product</th>
                                        <th className="py-2 text-right">Units sold</th>
                                        <th className="py-2 text-right">Revenue</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {reportData.topProducts.map((p, i) => (
                                        <tr key={i} className="border-b border-gray-100">
                                            <td className="py-2 font-semibold">{p.name}</td>
                                            <td className="py-2 text-right">{p.units}</td>
                                            <td className="py-2 text-right font-bold">{formatPrice(p.revenue)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    <div className="mb-10">
                        <h2 className="text-sm font-black uppercase tracking-widest text-gray-500 mb-3">Day-by-day{reportData.periodDays > 31 ? " (last 31 days of period)" : ""}</h2>
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-300 text-left text-gray-500 uppercase text-[10px] tracking-widest">
                                    <th className="py-2">Date</th>
                                    <th className="py-2 text-right">Orders</th>
                                    <th className="py-2 text-right">Revenue</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reportData.dailySeries.map(d => (
                                    <tr key={d.key} className="border-b border-gray-100">
                                        <td className="py-1.5">{d.label}</td>
                                        <td className="py-1.5 text-right">{d.orders}</td>
                                        <td className="py-1.5 text-right font-bold">{d.revenue > 0 ? formatPrice(d.revenue) : "—"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="border-t border-gray-200 pt-6 mt-6 flex justify-between text-xs text-gray-400 font-medium">
                        <p>Lifetime totals: {formatPrice(stats.revenue)} revenue · {stats.orders} orders · {stats.visits.toLocaleString()} store visits</p>
                        <p>This report was automatically generated from FairPrice.ng Analytics.</p>
                    </div>
                </div>
            )}
        </div>
    );
}
