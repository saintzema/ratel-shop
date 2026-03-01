"use client";

import { useState, useEffect } from "react";
import {
    Download,
    TrendingUp,
    Calendar,
    BarChart3,
    FileText,
    ArrowUpRight,
    ArrowDownRight,
    Activity,
    Printer
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DemoStore } from "@/lib/demo-store";
import { formatPrice } from "@/lib/utils";

export default function AnalyticsPage() {
    const [downloading, setDownloading] = useState<string | null>(null);
    const [stats, setStats] = useState({ revenue: 0, orders: 0, conversion: 0, visits: 0 });
    const [sellerName, setSellerName] = useState("");
    const [isPrinting, setIsPrinting] = useState(false);

    useEffect(() => {
        const sellerId = DemoStore.getCurrentSellerId();
        const seller = DemoStore.getCurrentSeller();
        if (seller) setSellerName(seller.business_name);
        if (!sellerId) return;

        const loadData = () => {
            const orders = DemoStore.getOrders().filter(o => o.seller_id === sellerId);
            const totalRevenue = orders.reduce((sum, o) => sum + (o.amount || 0), 0);
            const totalOrders = orders.length;
            const simulatedVisits = totalOrders === 0 ? 0 : totalOrders * 12 + Math.floor(Math.random() * 50);
            const conversionRate = simulatedVisits === 0 ? 0 : (totalOrders / simulatedVisits) * 100;

            setStats({
                revenue: totalRevenue,
                orders: totalOrders,
                conversion: conversionRate,
                visits: simulatedVisits
            });
        };
        loadData();
    }, []);

    const handleDownloadPDF = async (reportType: string) => {
        setDownloading(reportType);
        setIsPrinting(true);
        // Allow state to update and render the print view
        setTimeout(() => {
            window.print();
            setIsPrinting(false);
            setDownloading(null);
        }, 500);
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

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
                {[
                    { title: "Total Revenue", value: formatPrice(stats.revenue), trend: "+14.5%", up: true },
                    { title: "Orders", value: stats.orders.toString(), trend: "+5.2%", up: true },
                    { title: "Conversion Rate", value: `${stats.conversion.toFixed(1)}%`, trend: "-0.4%", up: false },
                    { title: "Store Visits", value: stats.visits.toLocaleString(), trend: "+22.1%", up: true }
                ].map((stat, i) => (
                    <div key={i} className="bg-white rounded-[24px] border border-gray-100 p-6 shadow-sm">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">{stat.title}</p>
                        <div className="flex items-end justify-between">
                            <p className="text-2xl font-black text-gray-900">{stat.value}</p>
                            <div className={`flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg ${stat.up ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                {stat.up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                                {stat.trend}
                            </div>
                        </div>
                    </div>
                ))}
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
                            <p className="text-sm text-gray-500">Generate comprehensive summaries of your business metrics.</p>
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
                                    <p className="text-xs text-gray-500">Yesterday's sales and traffic</p>
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
                                    <p className="text-xs text-gray-500">Week-over-week comparisons</p>
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
                        <div className="group border border-gray-100 hover:border-indigo-200 rounded-2xl p-6 transition-all hover:shadow-lg hover:shadow-indigo-500/5 bg-gray-50/50 hover:bg-white flex flex-col">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="p-3 bg-white border border-gray-100 shadow-sm rounded-xl text-gray-400 group-hover:text-indigo-600 transition-colors">
                                    <BarChart3 className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900">Monthly Summary</h3>
                                    <p className="text-xs text-gray-500">Comprehensive end-of-month review</p>
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
                                Pro Plan
                            </div>
                            <div className="flex items-center gap-4 mb-4">
                                <div className="p-3 bg-white border border-amber-200 shadow-sm rounded-xl text-amber-500">
                                    <TrendingUp className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900">Annual Growth Report</h3>
                                    <p className="text-xs text-gray-600">Yearly trends and tax-ready data</p>
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

            {/* In-app chart placeholder */}
            <div className="bg-white rounded-[32px] border border-gray-100 p-8 shadow-sm print:hidden">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 tracking-tight">Revenue Overview</h3>
                        <p className="text-sm text-gray-500">Your earnings over the last 30 days</p>
                    </div>
                    <select className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 h-10">
                        <option>Last 30 Days</option>
                        <option>Last 7 Days</option>
                        <option>This Year</option>
                    </select>
                </div>

                <div className="h-64 w-full flex items-end justify-between gap-2 opacity-80">
                    {[30, 45, 25, 60, 40, 75, 55, 80, 65, 90, 85, 100].map((height, i) => (
                        <div key={i} className="w-full bg-indigo-50 hover:bg-indigo-100 rounded-t-sm transition-colors relative group" style={{ height: `${height}%` }}>
                            <div className="absolute opacity-0 group-hover:opacity-100 -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs font-bold py-1 px-2 rounded-md pointer-events-none transition-opacity whitespace-nowrap z-10">
                                ₦{(height * 25000).toLocaleString()}
                            </div>
                            <div className={`w-full h-full rounded-t-sm ${height === 100 ? 'bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]' : height > 70 ? 'bg-indigo-400' : 'bg-indigo-200'}`} />
                        </div>
                    ))}
                </div>
            </div>

            {/* Print-Only Report Component */}
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

            <div id="print-report" className="hidden print:block p-8 bg-white text-black font-sans">
                <div className="border-b-2 border-gray-900 pb-6 mb-8 flex justify-between items-end">
                    <div>
                        <h1 className="text-4xl font-black tracking-tighter">RatelShop</h1>
                        <p className="text-gray-500 font-medium">Business Performance Report</p>
                    </div>
                    <div className="text-right">
                        <p className="font-bold text-xl">{sellerName}</p>
                        <p className="text-sm text-gray-500">Report: {downloading || "Analytics Report"}</p>
                        <p className="text-sm text-gray-500">Generated: {new Date().toLocaleDateString()}</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-8 mb-12">
                    <div className="border border-gray-200 p-6 rounded-2xl">
                        <p className="text-sm text-gray-500 uppercase tracking-widest font-bold mb-1">Total Revenue</p>
                        <p className="text-4xl font-black">{formatPrice(stats.revenue)}</p>
                    </div>
                    <div className="border border-gray-200 p-6 rounded-2xl">
                        <p className="text-sm text-gray-500 uppercase tracking-widest font-bold mb-1">Total Orders</p>
                        <p className="text-4xl font-black">{stats.orders}</p>
                    </div>
                    <div className="border border-gray-200 p-6 rounded-2xl">
                        <p className="text-sm text-gray-500 uppercase tracking-widest font-bold mb-1">Store Visits</p>
                        <p className="text-4xl font-black">{stats.visits.toLocaleString()}</p>
                    </div>
                    <div className="border border-gray-200 p-6 rounded-2xl">
                        <p className="text-sm text-gray-500 uppercase tracking-widest font-bold mb-1">Conversion Rate</p>
                        <p className="text-4xl font-black">{stats.conversion.toFixed(1)}%</p>
                    </div>
                </div>

                <div className="border-t border-gray-200 pt-8 mt-12 text-center text-sm text-gray-400 font-medium">
                    <p>This report was automatically generated from RatelShop Analytics.</p>
                </div>
            </div>
        </div>
    );
}
