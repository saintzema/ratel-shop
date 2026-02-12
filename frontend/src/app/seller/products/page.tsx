"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, DollarSign, BarChart3, Info, Check, Plus, Search, Filter } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import Link from "next/link";
import { DEMO_PRODUCTS } from "@/lib/data";

export default function SellerProducts() {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">My Products</h1>
                <Link href="/seller/products/new">
                    <Button className="bg-ratel-green-600 hover:bg-ratel-green-700">
                        <Plus className="h-4 w-4 mr-2" /> Add New Product
                    </Button>
                </Link>
            </div>

            <div className="bg-white dark:bg-zinc-900 border dark:border-zinc-800 rounded-lg p-4 flex gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <Input placeholder="Search products..." className="pl-9" />
                </div>
                <Button variant="outline"><Filter className="h-4 w-4 mr-2" /> Filter</Button>
            </div>

            <div className="bg-white dark:bg-zinc-900 rounded-lg border dark:border-zinc-800 overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 dark:bg-zinc-800 text-gray-500">
                        <tr>
                            <th className="px-6 py-3">Product</th>
                            <th className="px-6 py-3">Price</th>
                            <th className="px-6 py-3">Stock</th>
                            <th className="px-6 py-3">Status</th>
                            <th className="px-6 py-3">Market Analysis</th>
                            <th className="px-6 py-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {DEMO_PRODUCTS.slice(0, 5).map((p) => (
                            <tr key={p.id} className="border-b dark:border-zinc-800 last:border-0 hover:bg-gray-50 dark:hover:bg-zinc-800/50">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded bg-gray-100 dark:bg-zinc-800 overflow-hidden">
                                            <img src={p.image_url} className="w-full h-full object-cover" />
                                        </div>
                                        <div>
                                            <div className="font-medium text-gray-900 dark:text-white line-clamp-1">{p.name}</div>
                                            <div className="text-xs text-gray-500">SKU: R-{p.id}382</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 font-bold">{formatPrice(p.price)}</td>
                                <td className="px-6 py-4">
                                    {p.stock < 10 ? (
                                        <span className="text-red-600 font-bold">{p.stock} (Low)</span>
                                    ) : (
                                        <span>{p.stock}</span>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    <span className="px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">Active</span>
                                </td>
                                <td className="px-6 py-4 text-xs">
                                    {p.price_flag === "fair" ? (
                                        <div className="text-green-600 font-bold flex items-center gap-1"><Check className="h-3 w-3" /> Fair Pricing</div>
                                    ) : p.price_flag === "overpriced" ? (
                                        <div className="text-red-600 font-bold flex items-center gap-1">Over Market Avg</div>
                                    ) : (
                                        <div className="text-gray-500"> analyzing...</div>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    <button className="text-blue-600 hover:underline mr-3">Edit</button>
                                    <button className="text-red-600 hover:underline">Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
