"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
    Search,
    ShoppingBag,
    User,
    Store,
    Package,
    ArrowRight
} from "lucide-react";
import { DemoStore } from "@/lib/demo-store";
import { Product, Seller, Order } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

export default function AdminSearchPage() {
    const searchParams = useSearchParams();
    const query = searchParams?.get("q")?.toLowerCase() || "";

    const [mounted, setMounted] = useState(false);

    // Results
    const [products, setProducts] = useState<Product[]>([]);
    const [sellers, setSellers] = useState<Seller[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);

    useEffect(() => {
        setMounted(true);
        if (query) {
            // Search Products
            const allProducts = DemoStore.getApprovedProducts();
            setProducts(allProducts.filter(p =>
                p.name.toLowerCase().includes(query) ||
                p.category.toLowerCase().includes(query)
            ));

            // Search Sellers
            const allSellers = DemoStore.getSellers();
            setSellers(allSellers.filter(s =>
                s.business_name.toLowerCase().includes(query) ||
                (s.cac_rc_number && s.cac_rc_number.toLowerCase().includes(query))
            ));

            // Search Orders
            const allOrders = DemoStore.getOrders();
            setOrders(allOrders.filter(o =>
                o.id.toLowerCase().includes(query) ||
                (o.customer_name && o.customer_name.toLowerCase().includes(query)) ||
                (o.seller_name && o.seller_name.toLowerCase().includes(query))
            ));
        } else {
            setProducts([]);
            setSellers([]);
            setOrders([]);
        }
    }, [query]);

    if (!mounted) return null;

    const totalResults = products.length + sellers.length + orders.length;

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-12">
            <div className="flex items-center gap-4 mb-8">
                <div className="h-12 w-12 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600">
                    <Search className="h-6 w-6" />
                </div>
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Search Results</h1>
                    <p className="text-gray-500 mt-1">
                        {totalResults} matches across platform for <span className="font-bold text-gray-900">"{query}"</span>
                    </p>
                </div>
            </div>

            {totalResults === 0 && query && (
                <div className="bg-white rounded-[32px] p-12 text-center border border-gray-100">
                    <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-900">No results found</h3>
                    <p className="text-gray-500 mt-2">Try adjusting your search terms or ID parameters.</p>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Orders Column */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <Package className="h-5 w-5 text-blue-500" />
                            Orders
                        </h2>
                        <Badge variant="secondary" className="bg-blue-50 text-blue-700">{orders.length}</Badge>
                    </div>
                    {orders.length === 0 ? (
                        <p className="text-sm text-gray-400 py-4 italic">No matching orders.</p>
                    ) : (
                        <div className="space-y-3">
                            {orders.map(o => (
                                <Link href="/admin/orders" key={o.id} className="block bg-white p-4 rounded-xl border border-gray-100 hover:border-blue-300 hover:shadow-md transition-all group">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="font-mono text-sm font-bold text-gray-900">#{o.id}</span>
                                        <span className="text-xs font-bold text-gray-500">₦{o.amount.toLocaleString()}</span>
                                    </div>
                                    <p className="text-xs text-gray-500 mb-2">From: {o.customer_name || o.customer_id}</p>
                                    <div className="flex items-center justify-between">
                                        <Badge variant="outline" className="text-[10px] uppercase bg-gray-50">{o.status}</Badge>
                                        <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-blue-500 transition-colors" />
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

                {/* Users/Sellers Column */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <Store className="h-5 w-5 text-emerald-500" />
                            Users & Sellers
                        </h2>
                        <Badge variant="secondary" className="bg-emerald-50 text-emerald-700">{sellers.length}</Badge>
                    </div>
                    {sellers.length === 0 ? (
                        <p className="text-sm text-gray-400 py-4 italic">No matching users.</p>
                    ) : (
                        <div className="space-y-3">
                            {sellers.map(s => (
                                <Link href={`/admin/users/${s.id}`} key={s.id} className="block bg-white p-4 rounded-xl border border-gray-100 hover:border-emerald-300 hover:shadow-md transition-all group">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="h-10 w-10 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center font-bold text-lg">
                                            {s.business_name.charAt(0)}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-sm text-gray-900 group-hover:text-emerald-700 transition-colors line-clamp-1">{s.business_name}</h4>
                                            <p className="text-[11px] text-gray-400 font-mono">ID: {s.id}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                                        <Badge variant="outline" className="text-[10px] uppercase bg-emerald-50 text-emerald-700 border-none">Seller</Badge>
                                        <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-emerald-500 transition-colors" />
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

                {/* Products Column */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <ShoppingBag className="h-5 w-5 text-amber-500" />
                            Products
                        </h2>
                        <Badge variant="secondary" className="bg-amber-50 text-amber-700">{products.length}</Badge>
                    </div>
                    {products.length === 0 ? (
                        <p className="text-sm text-gray-400 py-4 italic">No matching products.</p>
                    ) : (
                        <div className="space-y-3">
                            {products.map(p => (
                                <Link href={`/product/${p.id}`} target="_blank" key={p.id} className="block bg-white p-3 rounded-xl border border-gray-100 hover:border-amber-300 hover:shadow-md transition-all group flex items-center gap-4">
                                    <div className="h-14 w-14 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                                        <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-sm text-gray-900 group-hover:text-amber-700 transition-colors truncate">{p.name}</h4>
                                        <div className="flex items-center justify-between mt-1">
                                            <span className="text-xs font-bold text-gray-900">₦{p.price.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

