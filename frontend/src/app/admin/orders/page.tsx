"use client";

import { useState, useEffect } from "react";
import { DataSyncService } from "@/lib/sync-store";
import { Package, Search, MessageSquare, ExternalLink } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateExact, cn } from "@/lib/utils";

export default function AdminOrdersPage() {
    const [orders, setOrders] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState("");

    const [isLoading, setIsLoading] = useState(true);

    const loadOrders = async () => {
        // Fallback to local sync store while fetching
        setOrders(DataSyncService.getOrders().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
        
        try {
            const res = await fetch("/api/orders?all=true");
            if (res.ok) {
                const data = await res.json();
                if (data.orders) {
                    setOrders(data.orders.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
                }
            }
        } catch (e) {
            console.error("Failed to fetch fresh orders", e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadOrders();
        const syncDB = () => setOrders(DataSyncService.getOrders().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
        window.addEventListener("storage", syncDB);
        window.addEventListener("sync-store-update", syncDB);
        return () => {
            window.removeEventListener("storage", syncDB);
            window.removeEventListener("sync-store-update", syncDB);
        };
    }, []);

    const filteredOrders = orders.filter(o => 
        o.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
        o.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.product?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight">Platform Orders</h1>
                    <p className="text-sm text-gray-500 mt-1">View and manage all global transactions</p>
                </div>
                <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input 
                        placeholder="Search orders..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 h-10 bg-white border-gray-200 rounded-xl"
                    />
                </div>
            </div>

            <div className="bg-white/40 backdrop-blur-xl rounded-3xl border border-white/50 shadow-xl shadow-green-900/10 overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-b from-white/40 to-transparent pointer-events-none" />
                <div className="overflow-x-auto relative z-10">
                    <table className="w-full text-left text-sm border-collapse">
                        <thead>
                            <tr className="bg-white/20 text-[10px] font-black uppercase tracking-widest text-emerald-800 border-b border-white/30 backdrop-blur-md">
                                <th className="px-6 py-4">Order ID & Date</th>
                                <th className="px-6 py-4">Customer</th>
                                <th className="px-6 py-4">Product</th>
                                <th className="px-6 py-4">Amount</th>
                                <th className="px-6 py-4">Status & Escrow</th>
                                <th className="px-6 py-4">Logistics</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredOrders.length === 0 ? (
                                <tr>
                                    <td colSpan={6}>
                                        <div className="flex flex-col items-center justify-center py-12 text-center">
                                            <Package className="h-12 w-12 text-gray-300 mb-4 opacity-50" />
                                            <p className="text-sm font-bold text-gray-400">No orders found.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredOrders.map((order) => {
                                    const buyerName = order.customer_name || order.customer_id.split('@')[0];
                                    
                                    return (
                                        <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-mono text-xs font-bold text-gray-900">
                                                    #{order.id.split('_')[1]?.substring(0, 8) || order.id.substring(0, 8)}
                                                </div>
                                                <div className="text-[11px] text-gray-500 mt-0.5">
                                                    {formatDateExact(order.created_at)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 font-bold text-gray-900">
                                                <Link href={`/admin/users/${order.customer_id}`} className="hover:text-indigo-600 hover:underline">
                                                    {buyerName}
                                                </Link>
                                            </td>
                                            <td className="px-6 py-4 text-gray-600 max-w-[200px] truncate md:whitespace-normal">
                                                {order.product?.name || "Product"}
                                                <div className="text-[10px] text-indigo-600 font-bold mt-0.5">{order.product?.seller_name || "FairPrice"}</div>
                                            </td>
                                            <td className="px-6 py-4 font-black text-gray-900">
                                                ₦{order.amount.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 space-y-2">
                                                <div>
                                                    <span className={cn(
                                                        "text-[10px] font-black uppercase px-2 py-1 rounded-full",
                                                        order.status === 'delivered' ? "bg-emerald-100 text-emerald-700" :
                                                        order.status === 'shipped' ? "bg-blue-100 text-blue-700" :
                                                        order.status === 'cancelled' ? "bg-gray-100 text-gray-600" :
                                                        "bg-amber-100 text-amber-700"
                                                    )}>
                                                        {order.status || 'pending'}
                                                    </span>
                                                </div>
                                                {order.escrow_status && (
                                                    <div>
                                                        <span className={cn(
                                                            "text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border",
                                                            order.escrow_status === 'released' ? "border-emerald-200 text-emerald-600 bg-emerald-50" :
                                                            order.escrow_status === 'refunded' ? "border-gray-200 text-gray-600 bg-gray-50" :
                                                            order.escrow_status === 'disputed' ? "border-rose-200 text-rose-600 bg-rose-50" :
                                                            "border-amber-200 text-amber-600 bg-amber-50"
                                                        )}>
                                                            Escrow: {order.escrow_status}
                                                        </span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-xs min-w-[150px]">
                                                {order.status === 'shipped' || order.status === 'delivered' ? (
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="font-bold text-gray-900">{order.carrier || "Standard"}</span>
                                                        <span className="text-[10px] text-gray-400 font-mono tracking-wider">{order.tracking_id || "N/A"}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 italic text-[11px]">Awaiting Dispatch</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                                                <Link href={`/admin/inbox/orders?order=${order.id}`}>
                                                    <Button size="sm" variant="outline" className="h-8 rounded-xl text-xs font-bold text-emerald-700 bg-white/50 border-white/60 hover:bg-white hover:shadow-lg transition-all">
                                                        <MessageSquare className="w-3 h-3 mr-1.5" />
                                                        View Ziva Chat
                                                    </Button>
                                                </Link>
                                                <Link href={`/admin/orders/${order.id}`}>
                                                    <Button size="sm" variant="ghost" className="h-8 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50/50 hover:bg-emerald-100">
                                                        <ExternalLink className="w-3 h-3 md:mr-0 lg:mr-1.5" />
                                                        <span className="hidden lg:inline">Details</span>
                                                    </Button>
                                                </Link>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
