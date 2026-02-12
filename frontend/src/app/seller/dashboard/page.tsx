"use client";

import { motion } from "framer-motion";
import {
    TrendingUp,
    Users,
    ShoppingBag,
    DollarSign,
    AlertTriangle,
    ShieldCheck,
    ArrowUpRight,
    ArrowDownRight
} from "lucide-react";
import { formatPrice } from "@/lib/utils";

export default function SellerDashboard() {
    const stats = [
        { label: "Total Revenue", value: "₦2,450,000", change: "+12.5%", icon: DollarSign, trend: "up" },
        { label: "Total Orders", value: "145", change: "+8.2%", icon: ShoppingBag, trend: "up" },
        { label: "Profile Views", value: "1,203", change: "-2.4%", icon: Users, trend: "down" },
    ];

    const trustScore = 85;

    return (
        <div className="space-y-6">
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white dark:bg-zinc-900 p-6 rounded-xl border dark:border-zinc-800 shadow-sm"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-2 bg-gray-100 dark:bg-zinc-800 rounded-lg">
                                <stat.icon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                            </div>
                            <span className={`text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 ${stat.trend === "up" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                }`}>
                                {stat.change} {stat.trend === "up" ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                            </span>
                        </div>
                        <h3 className="text-gray-500 text-sm font-medium">{stat.label}</h3>
                        <p className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">{stat.value}</p>
                    </motion.div>
                ))}

                {/* Trust Score Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white dark:bg-zinc-900 p-6 rounded-xl border dark:border-zinc-800 shadow-sm flex flex-col items-center justify-center relative overflow-hidden"
                >
                    <h3 className="text-gray-500 text-sm font-medium absolute top-6 left-6">Ratel Trust Score</h3>
                    <div className="relative w-32 h-32 flex items-center justify-center mt-4">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-gray-200 dark:text-zinc-800" />
                            <circle
                                cx="64" cy="64" r="56"
                                stroke="currentColor"
                                strokeWidth="12"
                                fill="transparent"
                                strokeDasharray={351}
                                strokeDashoffset={351 - (351 * trustScore) / 100}
                                className="text-ratel-green-600 transition-all duration-1000 ease-out"
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-3xl font-bold text-gray-900 dark:text-white">{trustScore}</span>
                            <span className="text-xs text-ratel-green-600 font-bold">Excellent</span>
                        </div>
                    </div>
                    <div className="text-xs text-center text-gray-400 mt-2">
                        Based on price fairness & delivery speed
                    </div>
                </motion.div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Recent Orders */}
                <div className="lg:col-span-2 bg-white dark:bg-zinc-900 rounded-xl border dark:border-zinc-800 shadow-sm overflow-hidden">
                    <div className="p-6 border-b dark:border-zinc-800 flex justify-between items-center">
                        <h2 className="font-bold text-lg">Recent Orders</h2>
                        <button className="text-sm text-ratel-green-600 hover:underline">View All</button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 dark:bg-zinc-800 text-gray-500">
                                <tr>
                                    <th className="px-6 py-3">Order ID</th>
                                    <th className="px-6 py-3">Product</th>
                                    <th className="px-6 py-3">Customer</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <tr key={i} className="border-b dark:border-zinc-800 last:border-0 hover:bg-gray-50 dark:hover:bg-zinc-800/50">
                                        <td className="px-6 py-4 font-medium">#ORD-283{i}</td>
                                        <td className="px-6 py-4">iPhone 14 Pro Max</td>
                                        <td className="px-6 py-4">Chidi Okeke</td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700">Pending</span>
                                        </td>
                                        <td className="px-6 py-4 font-bold">₦1,200,000</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Price Alerts */}
                <div className="bg-white dark:bg-zinc-900 rounded-xl border dark:border-zinc-800 shadow-sm p-6">
                    <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-ratel-orange" />
                        Price Alerts
                    </h2>
                    <div className="space-y-4">
                        <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-lg">
                            <h4 className="font-bold text-red-700 text-sm mb-1">Overpriced Item Detected</h4>
                            <p className="text-xs text-red-600 mb-2">
                                Your "Sony PS5 Console" is priced 25% higher than market average.
                            </p>
                            <button className="text-xs bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700">Adjust Price</button>
                        </div>

                        <div className="p-4 bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/20 rounded-lg">
                            <h4 className="font-bold text-green-700 text-sm mb-1">Price Opportunity</h4>
                            <p className="text-xs text-green-600 mb-2">
                                Demand for "Samsung S24" is high. Reducing price by 5% could increase sales by 20%.
                            </p>
                            <button className="text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700">Apply Discount</button>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
