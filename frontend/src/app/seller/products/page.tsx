"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";
import { Product } from "@/lib/types";
import { DemoStore } from "@/lib/demo-store";
import { PaystackCheckout } from "@/components/payment/PaystackCheckout";
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
    TrendingUp,
    Star
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog";

export default function SellerProducts() {
    const [products, setProducts] = useState<Product[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string>("all");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [showFilters, setShowFilters] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [promoteModalOpen, setPromoteModalOpen] = useState<{ isOpen: boolean; product: Product | null }>({ isOpen: false, product: null });
    const [showPaystack, setShowPaystack] = useState(false);
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

    const filtered = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === "all" || p.category === selectedCategory;
        const matchesStatus = statusFilter === "all" || (statusFilter === "live" && p.is_active) || (statusFilter === "sponsored" && p.is_sponsored);
        return matchesSearch && matchesCategory && matchesStatus;
    });

    const categories = Array.from(new Set(products.map(p => p.category)));

    const handlePromoteProductInit = () => {
        if (!promoteModalOpen.product) return;
        setPromoteModalOpen({ ...promoteModalOpen, isOpen: false });
        setShowPaystack(true);
    };

    const handlePromoteSuccess = (reference: string) => {
        if (!promoteModalOpen.product) return;

        DemoStore.promoteProduct(promoteModalOpen.product.id, true);

        // Refresh local list
        const sellerId = DemoStore.getCurrentSellerId();
        if (sellerId) {
            setProducts(DemoStore.getProducts().filter(p => p.seller_id === sellerId));
        }

        // Update local state to reflect UI instantly
        setProducts(prev => prev.map(p =>
            p.id === promoteModalOpen.product!.id ? { ...p, is_sponsored: true } : p
        ));

        setShowPaystack(false);
        setPromoteModalOpen({ isOpen: false, product: null });
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
    };

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

            {/* Search & Filter Bar */}
            <div className="flex flex-col gap-4 mb-8">
                <div className="bg-white/80 backdrop-blur-xl border border-gray-200/60 rounded-2xl p-4 flex flex-col sm:flex-row gap-3 shadow-sm">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Search products..."
                            className="pl-11 h-11 rounded-xl border-gray-200 bg-gray-50/60 focus:bg-white transition-colors text-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <Button
                        variant={showFilters ? "secondary" : "outline"}
                        className={cn(
                            "h-11 border-gray-200 rounded-xl font-medium gap-2 text-sm transition-all",
                            showFilters ? "bg-indigo-50 text-indigo-600 border-indigo-200" : "text-gray-500 hover:bg-gray-50"
                        )}
                        onClick={() => setShowFilters(!showFilters)}
                    >
                        <Filter className="h-4 w-4" />
                        {showFilters ? "Hide Filters" : "Filter"}
                    </Button>
                </div>

                {/* Expanded Filters */}
                {showFilters && (
                    <div className="bg-white/50 backdrop-blur-md border border-gray-100 rounded-2xl p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-top-4 duration-300">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Category</Label>
                            <select
                                className="w-full h-11 bg-white border border-gray-200 rounded-xl px-4 text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                            >
                                <option value="all">All Categories</option>
                                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Status</Label>
                            <div className="flex bg-gray-100 p-1 rounded-xl gap-1">
                                {["all", "live", "sponsored"].map((s) => (
                                    <button
                                        key={s}
                                        onClick={() => setStatusFilter(s)}
                                        className={cn(
                                            "flex-1 h-9 rounded-lg text-[10px] font-black uppercase transition-all",
                                            statusFilter === s ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600"
                                        )}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="flex items-end">
                            <Button
                                variant="ghost"
                                className="h-11 w-full text-xs font-black uppercase tracking-widest text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl"
                                onClick={() => {
                                    setSelectedCategory("all");
                                    setStatusFilter("all");
                                    setSearchQuery("");
                                }}
                            >
                                Reset All
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Products — Mobile Cards + Desktop Table */}
            <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden">

                {/* ─── Mobile Card View ─── */}
                <div className="md:hidden divide-y divide-gray-100">
                    {filtered.length === 0 ? (
                        <div className="py-24 text-center text-gray-400">
                            <Package className="h-12 w-12 text-gray-200 mx-auto mb-4" />
                            <p className="text-base font-medium">No products found</p>
                            <p className="text-sm mt-1">Try adjusting your search or add a new product.</p>
                        </div>
                    ) : filtered.map((product) => (
                        <div key={product.id} className="p-4">
                            <div className="flex gap-3">
                                {/* Thumbnail */}
                                <div className="h-16 w-16 bg-gray-50 border border-gray-100 rounded-xl overflow-hidden flex items-center justify-center p-1 shrink-0 relative">
                                    <img src={product.image_url} alt={product.name} className="h-full w-full object-contain mix-blend-multiply" />
                                    {product.price_flag === "overpriced" && (
                                        <div className="absolute -top-1 -right-1 bg-orange-500 rounded-full p-0.5">
                                            <AlertTriangle className="h-2.5 w-2.5 text-white" />
                                        </div>
                                    )}
                                </div>
                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-gray-900 text-sm truncate">{product.name}</h3>
                                    <p className="text-xs text-gray-400 mt-0.5">{product.category}</p>
                                    <div className="flex items-center gap-3 mt-1.5">
                                        <span className="text-sm font-bold text-gray-900">{formatPrice(product.price)}</span>
                                        <span className={cn(
                                            "inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold",
                                            product.stock < 10 ? "bg-red-50 text-red-600" : "bg-gray-100 text-gray-600"
                                        )}>
                                            {product.stock} {product.stock === 1 ? 'unit' : 'units'}
                                        </span>
                                        {product.is_sponsored && (
                                            <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-amber-200 gap-1 font-bold text-[10px] uppercase h-5">
                                                <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" /> Sponsored
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Action buttons — always visible on mobile */}
                            {deleteConfirm === product.id ? (
                                <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-gray-100">
                                    <Button size="sm" variant="ghost" onClick={() => setDeleteConfirm(null)} className="h-8 text-xs font-semibold hover:bg-gray-100 rounded-lg">Cancel</Button>
                                    <Button size="sm" variant="destructive" onClick={() => handleDelete(product.id)} className="h-8 text-xs font-semibold rounded-lg">Delete</Button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                                    <Link href={`/product/${product.id}`} className="flex-1">
                                        <Button size="sm" variant="outline" className="w-full h-8 text-xs font-semibold rounded-lg gap-1 border-gray-200">
                                            <Eye className="h-3 w-3" /> View
                                        </Button>
                                    </Link>
                                    <Link href={`/seller/products/${product.id}/edit`} className="flex-1">
                                        <Button size="sm" variant="outline" className="w-full h-8 text-xs font-semibold text-blue-600 border-blue-200 hover:bg-blue-50 rounded-lg gap-1">
                                            <Edit3 className="h-3 w-3" /> Edit
                                        </Button>
                                    </Link>
                                    {!product.is_sponsored && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="flex-1 h-8 text-xs font-semibold text-amber-600 border-amber-200 hover:bg-amber-50 rounded-lg gap-1"
                                            onClick={() => setPromoteModalOpen({ isOpen: true, product })}
                                        >
                                            <Megaphone className="h-3 w-3" /> Promote
                                        </Button>
                                    )}
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => setDeleteConfirm(product.id)}
                                        className="h-8 w-8 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg shrink-0"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* ─── Desktop Table View ─── */}
                <table className="w-full text-left border-collapse hidden md:table">
                    <thead>
                        <tr className="border-b border-gray-100">
                            <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider w-16">Image</th>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Product</th>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Price</th>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Stock</th>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
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
                                    <td className="px-6 py-5">
                                        <div className="flex flex-col max-w-[250px]">
                                            <span className="font-semibold text-gray-900 text-sm truncate" title={product.name}>{product.name}</span>
                                            <span className="text-xs text-gray-400 mt-0.5">{product.category}</span>
                                        </div>
                                    </td>
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
                                    <td className="px-6 py-5">
                                        <span className={cn(
                                            "inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold",
                                            product.stock < 10 ? "bg-red-50 text-red-600" : "bg-gray-100 text-gray-600"
                                        )}>
                                            {product.stock} {product.stock === 1 ? 'unit' : 'units'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-5">
                                        <Badge variant="outline" className="text-xs font-semibold bg-emerald-50 text-emerald-700 border-emerald-200 uppercase tracking-wide px-2.5">
                                            Live
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                        {deleteConfirm === product.id ? (
                                            <div className="flex items-center justify-end gap-2">
                                                <Button size="sm" variant="ghost" onClick={() => setDeleteConfirm(null)} className="h-8 text-xs font-semibold hover:bg-gray-100 rounded-lg">Cancel</Button>
                                                <Button size="sm" variant="destructive" onClick={() => handleDelete(product.id)} className="h-8 text-xs font-semibold rounded-lg">Delete</Button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-end gap-1">
                                                {!product.is_sponsored ? (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-8 px-2.5 text-xs font-semibold text-amber-600 hover:bg-amber-50 hover:text-amber-700 rounded-lg gap-1.5 transition-colors"
                                                        onClick={() => setPromoteModalOpen({ isOpen: true, product })}
                                                    >
                                                        <Megaphone className="h-3.5 w-3.5" /> Promote
                                                    </Button>
                                                ) : (
                                                    <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-amber-200 gap-1 font-bold text-[10px] uppercase h-8 mr-1">
                                                        <Star className="h-3 w-3 fill-amber-500 text-amber-500" /> Sponsored
                                                    </Badge>
                                                )}
                                                <Link href={`/seller/products/${product.id}/edit`}>
                                                    <Button size="sm" variant="ghost" className="h-8 px-2.5 text-xs font-semibold hover:bg-blue-50 hover:text-blue-600 rounded-lg gap-1.5 transition-colors">
                                                        <Edit3 className="h-3.5 w-3.5" /> Edit
                                                    </Button>
                                                </Link>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => setDeleteConfirm(product.id)}
                                                    className="h-8 px-2.5 text-xs font-semibold hover:bg-red-50 hover:text-red-600 rounded-lg gap-1.5 transition-colors"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" /> Delete
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

            {/* Promote Product Modal */}
            <Dialog open={promoteModalOpen.isOpen} onOpenChange={(open) => !open && setPromoteModalOpen({ isOpen: false, product: null })}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Boost Your Sales</DialogTitle>
                        <DialogDescription>
                            Promote "{promoteModalOpen.product?.name}" to the top of search results and category pages.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-4">
                            <div className="bg-amber-100 p-2 rounded-lg h-10 w-10 flex items-center justify-center shrink-0">
                                <TrendingUp className="h-5 w-5 text-amber-700" />
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-900 text-sm">Sponsored Product Placement</h4>
                                <p className="text-xs text-gray-600 mt-1">Get up to 5x more views by featuring this product.</p>
                                <p className="text-sm font-black text-amber-700 mt-2">₦2,500 <span className="text-xs font-normal text-amber-600">/ 7 days</span></p>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setPromoteModalOpen({ isOpen: false, product: null })} className="font-bold text-gray-500">Cancel</Button>
                        <Button
                            className="bg-amber-500 hover:bg-amber-600 text-white font-bold"
                            onClick={handlePromoteProductInit}
                        >
                            Promote Now
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {showPaystack && promoteModalOpen.product && (
                <PaystackCheckout
                    amount={250000} // ₦2,500 in kobo
                    email={DemoStore.getCurrentSeller()?.owner_email || "seller@fairprice.ng"}
                    onSuccess={handlePromoteSuccess}
                    onClose={() => setShowPaystack(false)}
                    autoStart={true}
                />
            )}
        </div>
    );
}
