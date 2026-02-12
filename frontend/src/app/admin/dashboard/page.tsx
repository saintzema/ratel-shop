"use client";

import { motion } from "framer-motion";
import {
    Users,
    AlertTriangle,
    FileText,
    Gavel,
    ArrowUpRight,
    ShieldCheck,
    Ban
} from "lucide-react";
import { formatPrice } from "@/lib/utils";

export default function AdminDashboard() {
    const stats = [
        { label: "Pending KYC", value: "24", change: "+4 today", icon: FileText, color: "blue" },
        { label: "Price Alerts", value: "15", change: "+12% this week", icon: AlertTriangle, color: "red" },
        { label: "Active Sellers", value: "142", change: "+8 this month", icon: Users, color: "green" },
        { label: "Open Disputes", value: "3", change: "-2 yesterday", icon: Gavel, color: "orange" },
    ];

    return (
        <div className="space-y-6">
            <div className="bg-red-600 text-white p-6 rounded-xl shadow-lg mb-6">
                <h1 className="text-2xl font-bold mb-2">Morning, Super Admin.</h1>
                <p className="opacity-90">There are <span className="font-bold underline">15 overpriced products</span> and <span className="font-bold underline">24 sellers awaiting verification</span> today.</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white dark:bg-zinc-900 p-6 rounded-xl border dark:border-zinc-800 shadow-sm"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className={`p-2 rounded-lg bg-${stat.color}-100 dark:bg-${stat.color}-900/20`}>
                                <stat.icon className={`h-5 w-5 text-${stat.color}-600`} />
                            </div>
                            <span className="text-xs font-bold text-gray-500">{stat.change}</span>
                        </div>
                        <h3 className="text-gray-500 text-sm font-medium">{stat.label}</h3>
                        <p className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">{stat.value}</p>
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Latest Price Alerts (The "Vigilante" Feature) */}
                <div className="bg-white dark:bg-zinc-900 rounded-xl border dark:border-zinc-800 shadow-sm overflow-hidden">
                    <div className="p-6 border-b dark:border-zinc-800 flex justify-between items-center bg-red-50 dark:bg-red-900/10">
                        <h2 className="font-bold text-lg text-red-700 dark:text-red-400 flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5" /> Live Price Monitoring
                        </h2>
                        <button className="text-sm text-red-600 hover:underline">View All</button>
                    </div>
                    <div className="divide-y dark:divide-zinc-800">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-zinc-800/50">
                                <div className="flex gap-4 items-center">
                                    <div className="w-10 h-10 bg-gray-100 rounded overflow-hidden">
                                        <img src="https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=100" className="w-full h-full object-cover" />
                                    </div>
                                    <div>
                                        <div className="font-bold text-sm">iPhone 14 Pro Max</div>
                                        <div className="text-xs text-gray-500">Seller: <span className="text-blue-600 hover:underline">GadgetWorld_XYZ</span></div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-bold text-red-600">₦1,450,000</div>
                                    <div className="text-xs text-gray-400">Avg: ₦1,200,000 (+21%)</div>
                                </div>
                                <div className="flex gap-2">
                                    <button className="p-2 hover:bg-red-100 text-red-600 rounded" title="Flag & Warn"><AlertTriangle className="h-4 w-4" /></button>
                                    <button className="p-2 hover:bg-gray-100 text-gray-600 rounded" title="Force Edit"><Gavel className="h-4 w-4" /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* KYC Review Queue */}
                <div className="bg-white dark:bg-zinc-900 rounded-xl border dark:border-zinc-800 shadow-sm overflow-hidden">
                    <div className="p-6 border-b dark:border-zinc-800 flex justify-between items-center">
                        <h2 className="font-bold text-lg flex items-center gap-2">
                            <FileText className="h-5 w-5 text-blue-600" /> Pending KYC Reviews
                        </h2>
                        <button className="text-sm text-blue-600 hover:underline">View All</button>
                    </div>
                    <div className="divide-y dark:divide-zinc-800">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-zinc-800/50">
                                <div className="flex gap-4 items-center">
                                    <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-xs">
                                        JD
                                    </div>
                                    <div>
                                        <div className="font-bold text-sm">John Doe Electronics</div>
                                        <div className="text-xs text-gray-500">Submitted: 2 hrs ago</div>
                                    </div>
                                </div>
                                <div className="text-xs bg-gray-100 px-2 py-1 rounded">
                                    CAC • NIN • Utility
                                </div>
                                <button className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">Review</button>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
}
