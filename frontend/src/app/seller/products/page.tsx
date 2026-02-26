"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Product } from "@/lib/types";
import { DemoStore } from "@/lib/demo-store";
import { formatPrice, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
    Search,
    Filter,
    Plus,
    Check,
    Edit3,
    Trash2,
    Package,
    AlertTriangle,
    Megaphone,
    Zap,
    MoreHorizontal,
    Eye,
    TrendingUp
} from "lucide-react";

export default function SellerProducts() {
    const [products, setProducts] = useState<Product[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const sellerId = DemoStore.getCurrentSellerId();
        if (!sellerId) return;

        const loadProducts = () => {
            const allProducts = DemoStore.getProducts();
            setProducts(allProducts.filter(p => p.seller_id === sellerId));
        };

        loadProducts();
        window.addEventListener("storage", loadProducts);
        return () => window.removeEventListener("storage", loadProducts);
    }, []);

    const handleDelete = (id: string) => {
        DemoStore.deleteProduct(id);
        setDeleteConfirm(null);
        const sellerId = DemoStore.getCurrentSellerId();
        if (sellerId) {
            setProducts(DemoStore.getProducts().filter(p => p.seller_id === sellerId));
        }
    };

    const filtered = products.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="max-w-6xl mx-auto py-10 px-4 sm:px-6 text-gray-900">

            {/* Page Header — Apple Style */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                <div>
                    <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Products</h1>
                    <p className="text-lg text-gray-500 mt-2 font-normal">Manage your inventory, pricing, and promotions.</p>
                </div>
                <Link href="/seller/products/new">
                    <Button className="bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-full px-7 h-11 shadow-sm transition-all hover:shadow-md text-sm">
                        <Plus className="h-4 w-4 mr-2" /> Add Product
                    </Button>
                </Link>
            </div>

            {saveSuccess && (
                <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700 bg-emerald-50 px-5 py-3.5 rounded-2xl border border-emerald-200 mb-6 animate-in fade-in slide-in-from-top-2">
                    <Check className="h-5 w-5" /> Product updated successfully — changes are live!
                </div>
            )}

            {/* Search Bar */}
            <div className="bg-white/80 backdrop-blur-xl border border-gray-200/60 rounded-2xl p-4 flex flex-col sm:flex-row gap-3 shadow-sm mb-8">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder="Search products..."
                        className="pl-11 h-11 rounded-xl border-gray-200 bg-gray-50/60 focus:bg-white transition-colors text-sm"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <Button variant="outline" className="h-11 border-gray-200 text-gray-500 rounded-xl font-medium gap-2 text-sm hover:bg-gray-50">
                    <Filter className="h-4 w-4" /> Filter
                </Button>
            </div>

            {/* Products Table */}
            <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-gray-100">
                            <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider w-16">Image</th>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Product</th>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Price</th>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">Stock</th>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden sm:table-cell">Status</th>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {filtered.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="py-24 text-center text-gray-400">
                                    <Package className="h-12 w-12 text-gray-200 mx-auto mb-4" />
                                    <p className="text-base font-medium">No products found</p>
                                    <p className="text-sm mt-1">Try adjusting your search or add a new product.</p>
                                </td>
                            </tr>
                        ) : (
                            filtered.map((product) => (
                                <tr key={product.id} className="hover:bg-gray-50/50 transition-colors">
                                    {/* Image */}
                                    <td className="px-6 py-5">
                                        <div className="h-14 w-14 bg-gray-50 border border-gray-100 rounded-xl overflow-hidden flex items-center justify-center p-1 relative">
                                            <img src={product.image_url} alt={product.name} className="h-full w-full object-contain mix-blend-multiply" />
                                            {product.price_flag === "overpriced" && (
                                                <div className="absolute -top-1 -right-1 bg-orange-500 rounded-full p-0.5">
                                                    <AlertTriangle className="h-2.5 w-2.5 text-white" />
                                                </div>
                                            )}
                                        </div>
                                    </td>

                                    {/* Product Name */}
                                    <td className="px-6 py-5">
                                        <div className="flex flex-col max-w-[250px]">
                                            <span className="font-semibold text-gray-900 text-sm truncate" title={product.name}>{product.name}</span>
                                            <span className="text-xs text-gray-400 mt-0.5">{product.category}</span>
                                        </div>
                                    </td>

                                    {/* Price */}
                                    <td className="px-6 py-5">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-gray-900">{formatPrice(product.price)}</span>
                                            {product.price_flag === "overpriced" && (
                                                <span className="text-[10px] font-semibold text-orange-600 uppercase flex items-center gap-1 mt-0.5">
                                                    <AlertTriangle className="h-2.5 w-2.5" /> Above Market
                                                </span>
                                            )}
                                            {product.price_flag === "fair" && (
                                                <span className="text-[10px] font-semibold text-emerald-600 uppercase flex items-center gap-1 mt-0.5">
                                                    <Check className="h-2.5 w-2.5" /> Fair Price
                                                </span>
                                            )}
                                        </div>
                                    </td>

                                    {/* Stock */}
                                    <td className="px-6 py-5 hidden md:table-cell">
                                        <span className={cn(
                                            "inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold",
                                            product.stock < 10 ? "bg-red-50 text-red-600" : "bg-gray-100 text-gray-600"
                                        )}>
                                            {product.stock} {product.stock === 1 ? 'unit' : 'units'}
                                        </span>
                                    </td>

                                    {/* Status */}
                                    <td className="px-6 py-5 hidden sm:table-cell">
                                        <Badge variant="outline" className="text-xs font-semibold bg-emerald-50 text-emerald-700 border-emerald-200 uppercase tracking-wide px-2.5">
                                            Live
                                        </Badge>
                                    </td>

                                    {/* Actions — ALWAYS VISIBLE (no hover hide) */}
                                    <td className="px-6 py-5 text-right">
                                        {deleteConfirm === product.id ? (
                                            <div className="flex items-center justify-end gap-2">
                                                <Button size="sm" variant="ghost" onClick={() => setDeleteConfirm(null)} className="h-8 text-xs font-semibold hover:bg-gray-100 rounded-lg">Cancel</Button>
                                                <Button size="sm" variant="destructive" onClick={() => handleDelete(product.id)} className="h-8 text-xs font-semibold rounded-lg">Delete</Button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-end gap-1">
                                                {/* Promote */}
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-8 px-2.5 text-xs font-semibold text-amber-600 hover:bg-amber-50 hover:text-amber-700 rounded-lg gap-1.5 transition-colors"
                                                    onClick={() => {
                                                        // TODO: Open promote modal
                                                        alert(`Promote "${product.name}" — Sponsored Ads coming soon!`);
                                                    }}
                                                >
                                                    <Megaphone className="h-3.5 w-3.5" />
                                                    <span className="hidden sm:inline">Promote</span>
                                                </Button>

                                                {/* Edit — links to full edit page */}
                                                <Link href={`/seller/products/${product.id}/edit`}>
                                                    <Button size="sm" variant="ghost" className="h-8 px-2.5 text-xs font-semibold hover:bg-blue-50 hover:text-blue-600 rounded-lg gap-1.5 transition-colors">
                                                        <Edit3 className="h-3.5 w-3.5" />
                                                        <span className="hidden sm:inline">Edit</span>
                                                    </Button>
                                                </Link>

                                                {/* Delete */}
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => setDeleteConfirm(product.id)}
                                                    className="h-8 px-2.5 text-xs font-semibold hover:bg-red-50 hover:text-red-600 rounded-lg gap-1.5 transition-colors"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                    <span className="hidden sm:inline">Delete</span>
                                                </Button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
