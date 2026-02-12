"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Filter, MoreHorizontal, Truck, CheckCircle, XCircle, Clock } from "lucide-react";
import { formatPrice } from "@/lib/utils";

export default function SellerOrders() {
    const orders = [
        { id: "ORD-2831", customer: "Chidi Okeke", product: "iPhone 14 Pro Max", date: "Feb 12, 2026", total: 1200000, status: "Pending", payment: "Card" },
        { id: "ORD-2830", customer: "Amaka Benson", product: "Samsung Galaxy S24", date: "Feb 11, 2026", total: 950000, status: "Processing", payment: "Transfer" },
        { id: "ORD-2829", customer: "Tunde Bakare", product: "Sony PS5 Console", date: "Feb 10, 2026", total: 650000, status: "Shipped", payment: "Card" },
        { id: "ORD-2828", customer: "Grace Ibe", product: "MacBook Air M2", date: "Feb 09, 2026", total: 1500000, status: "Delivered", payment: "Bond" },
    ];

    const getStatusColor = (status: string) => {
        switch (status) {
            case "Pending": return "bg-yellow-100 text-yellow-700 border-yellow-200";
            case "Processing": return "bg-blue-100 text-blue-700 border-blue-200";
            case "Shipped": return "bg-purple-100 text-purple-700 border-purple-200";
            case "Delivered": return "bg-green-100 text-green-700 border-green-200";
            case "Cancelled": return "bg-red-100 text-red-700 border-red-200";
            default: return "bg-gray-100 text-gray-700";
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Orders</h1>
                <Button className="bg-ratel-green-600 hover:bg-ratel-green-700">Export Orders</Button>
            </div>

            <div className="bg-white dark:bg-zinc-900 border dark:border-zinc-800 rounded-lg p-4 flex gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <Input placeholder="Search order ID, customer, or product..." className="pl-9" />
                </div>
                <Button variant="outline"><Filter className="h-4 w-4 mr-2" /> Filter Status</Button>
            </div>

            <div className="bg-white dark:bg-zinc-900 rounded-lg border dark:border-zinc-800 overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 dark:bg-zinc-800 text-gray-500">
                        <tr>
                            <th className="px-6 py-3">Order ID</th>
                            <th className="px-6 py-3">Date</th>
                            <th className="px-6 py-3">Customer</th>
                            <th className="px-6 py-3">Product</th>
                            <th className="px-6 py-3">Payment</th>
                            <th className="px-6 py-3">Status</th>
                            <th className="px-6 py-3 text-right">Total</th>
                            <th className="px-6 py-3"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {orders.map((order) => (
                            <tr key={order.id} className="border-b dark:border-zinc-800 last:border-0 hover:bg-gray-50 dark:hover:bg-zinc-800/50">
                                <td className="px-6 py-4 font-medium">{order.id}</td>
                                <td className="px-6 py-4 text-gray-500">{order.date}</td>
                                <td className="px-6 py-4">
                                    <div className="font-medium">{order.customer}</div>
                                </td>
                                <td className="px-6 py-4 text-gray-500">{order.product}</td>
                                <td className="px-6 py-4 text-xs">{order.payment}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded-full text-xs font-bold border ${getStatusColor(order.status)}`}>
                                        {order.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right font-bold">{formatPrice(order.total)}</td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        {order.status === "Pending" && (
                                            <Button size="sm" variant="outline" className="text-blue-600 border-blue-200 hover:bg-blue-50">Accept</Button>
                                        )}
                                        {order.status === "Processing" && (
                                            <Button size="sm" variant="outline" className="text-purple-600 border-purple-200 hover:bg-purple-50">Ship</Button>
                                        )}
                                        <Button size="icon" variant="ghost" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
