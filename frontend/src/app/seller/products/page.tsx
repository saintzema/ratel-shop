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
    const [selectedAdPlan, setSelectedAdPlan] = useState<"3_day" | "10_day" | "30_day">("3_day");
    const [saveSuccess, setSaveSuccess] = useState(false);
    const router = useRouter();

    const [loading, setLoading] = useState(true);

    const loadProducts = async () => {
        const sellerId = DemoStore.getCurrentSellerId();
        if (!sellerId) {
            router.push("/seller/login");
            return;
        }

        setLoading(true);
        try {
            // Fetch products for this specific seller
            const res = await fetch(`/api/products?all=true`);
            if (res.ok) {
                const all = await res.json();
                setProducts(all.filter((p: any) => p.seller_id === sellerId));
            }
        } catch (error) {
            console.error("Failed to load products:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadProducts();
        window.addEventListener("demo-store-update", loadProducts);
        return () => window.removeEventListener("demo-store-update", loadProducts);
    }, []);

    const handleDelete = async (id: string) => {
        try {
            const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
            if (res.ok) {
                setDeleteConfirm(null);
                loadProducts();
            }
        } catch (error) {
            console.error("Delete failed:", error);
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

        const sellerId = DemoStore.getCurrentSellerId();
        if (sellerId) {
            // Create a promotion in DemoStore with the selected plan
            DemoStore.createPromotion(promoteModalOpen.product.id, sellerId, selectedAdPlan);
            setProducts(DemoStore.getProducts({ includeInactiveSellers: true }).filter(p => p.seller_id === sellerId));
        }

        setShowPaystack(false);
        setPromoteModalOpen({ isOpen: false, product: null });
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
    };

    return (
        <div className="max-w-6xl mx-auto py-10 px-4 sm:px-6 text-gray-900 pb-24">

            {/* Premium Header — Apple Style */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 bg-white/40 backdrop-blur-xl p-8 rounded-[32px] border border-white/60 shadow-lg">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="h-2 w-2 rounded-full bg-brand-green-500 animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Inventory Control</span>
                    </div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight">Products</h1>
                    <p className="text-sm text-gray-500 mt-1 font-medium italic opacity-70">Manage your high-performance inventory.</p>
                </div>
                <Link href="/seller/products/new">
                    <Button className="bg-gray-900 hover:bg-black text-white font-black uppercase tracking-widest rounded-2xl px-8 h-14 shadow-xl transition-all hover:scale-105 active:scale-95 text-xs">
                        <Plus className="h-5 w-5 mr-2" /> Add New Item
                    </Button>
                </Link>
            </div>

            {saveSuccess && (
                <div className="flex items-center gap-3 text-sm font-bold text-emerald-700 bg-emerald-50/80 backdrop-blur-md px-6 py-4 rounded-[20px] border border-emerald-200/50 mb-8 animate-in fade-in slide-in-from-top-4">
                    <div className="h-6 w-6 bg-emerald-500 rounded-full flex items-center justify-center">
                        <Check className="h-4 w-4 text-white" />
                    </div>
                    <span>System Sync Successful: Product changes are now live!</span>
                </div>
            )}

            {/* Search & Filter Bar: Liquid Glass */}
            <div className="flex flex-col gap-4 mb-8">
                <div className="bg-white/60 backdrop-blur-2xl border border-white/80 rounded-[24px] p-3 flex flex-col sm:flex-row gap-3 shadow-xl">
                    <div className="relative flex-1 group">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-brand-green-600 transition-colors" />
                        <Input
                            placeholder="Find an item..."
                            className="pl-12 h-14 rounded-2xl border-white/40 bg-white/40 backdrop-blur-sm focus:bg-white transition-all text-sm font-semibold shadow-inner"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <Button
                        variant="ghost"
                        className={cn(
                            "h-14 px-6 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all gap-2",
                            showFilters ? "bg-brand-green-50 text-brand-green-700 shadow-inner" : "bg-white/40 text-gray-500 hover:bg-white/80 shadow-sm border border-white/60"
                        )}
                        onClick={() => setShowFilters(!showFilters)}
                    >
                        <Filter className="h-4 w-4" />
                        {showFilters ? "Hide Panel" : "Filter Panel"}
                    </Button>
                </div>

                {/* Expanded Filters: Glass Drawer */}
                {showFilters && (
                    <div className="bg-white/40 backdrop-blur-2xl border border-white/60 rounded-[28px] p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 shadow-2xl animate-in fade-in slide-in-from-top-6">
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 pl-1">Category Domain</Label>
                            <select
                                className="w-full h-12 bg-white/60 backdrop-blur-sm border border-white rounded-[16px] px-4 text-xs font-black uppercase tracking-widest focus:ring-4 focus:ring-brand-green-500/10 outline-none transition-all shadow-sm cursor-pointer"
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                            >
                                <option value="all">Global Matrix</option>
                                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                            </select>
                        </div>
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 pl-1">Operational Status</Label>
                            <div className="flex bg-gray-200/50 p-1 rounded-[18px] gap-1 shadow-inner">
                                {["all", "live", "sponsored"].map((s) => (
                                    <button
                                        key={s}
                                        type="button"
                                        onClick={() => setStatusFilter(s)}
                                        className={cn(
                                            "flex-1 h-10 rounded-[14px] text-[9px] font-black uppercase tracking-widest transition-all",
                                            statusFilter === s ? "bg-white text-gray-900 shadow-md scale-[1.02]" : "text-gray-400 hover:text-gray-600"
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
                                className="h-12 w-full text-[10px] font-black uppercase tracking-[0.2em] text-rose-500 hover:text-rose-600 hover:bg-rose-50/50 rounded-[16px]"
                                onClick={() => {
                                    setSelectedCategory("all");
                                    setStatusFilter("all");
                                    setSearchQuery("");
                                }}
                            >
                                Flush Filters
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Products — Mobile Cards + Desktop Table */}
            <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden">

                {/* ─── Mobile Card View ─── */}
                <div className="md:hidden divide-y divide-white/20">
                    {loading ? (
                        <div className="py-24 flex flex-col items-center gap-4">
                            <div className="h-10 w-10 border-4 border-brand-green-500 border-t-transparent rounded-full animate-spin" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Loading Grid...</p>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="py-24 text-center">
                            <div className="h-16 w-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100">
                                <Package className="h-8 w-8 text-gray-200" />
                            </div>
                            <p className="text-sm font-black text-gray-900">Zero Inventory Match</p>
                            <p className="text-xs text-gray-400 mt-1 px-10">Adjust your matrix or add a new high-performance item.</p>
                        </div>
                    ) : filtered.map((product) => (
                        <div key={product.id} className="p-6 transition-colors hover:bg-white/40">
                            <div className="flex gap-5">
                                {/* Thumbnail: Elite Style */}
                                <div className="h-24 w-24 bg-white rounded-[20px] border border-gray-100 shadow-xl overflow-hidden flex items-center justify-center p-2 shrink-0 relative group">
                                    <img src={product.image_url || "/assets/images/placeholder-product.svg"} alt={product.name} className="h-full w-full object-contain mix-blend-multiply group-hover:scale-110 transition-transform" />
                                    {product.price_flag === "overpriced" && (
                                        <div className="absolute top-1 right-1 bg-rose-500 rounded-full p-1 shadow-lg">
                                            <AlertTriangle className="h-3 w-3 text-white" />
                                        </div>
                                    )}
                                </div>
                                {/* Info */}
                                <div className="flex-1 min-w-0 flex flex-col justify-center">
                                    <h3 className="font-black text-gray-900 text-[15px] leading-tight mb-1">{product.name}</h3>
                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                        <span className="text-[9px] font-black uppercase tracking-[0.1em] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">
                                            {product.category}
                                        </span>
                                        {product.is_sponsored && (
                                            <span className="text-[9px] font-black uppercase tracking-[0.1em] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-100 flex items-center gap-1">
                                                <Star className="h-2.5 w-2.5 fill-amber-500" /> PROMOTED
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-lg font-black text-gray-900">{formatPrice(product.price)}</span>
                                        <div className={cn(
                                            "flex items-center gap-1.5 px-2 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border",
                                            product.stock < 10 ? "bg-rose-50 text-rose-600 border-rose-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"
                                        )}>
                                            <Zap className="h-3 w-3" /> {product.stock} Units
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Luxury Action Tier */}
                            {deleteConfirm === product.id ? (
                                <div className="flex items-center gap-3 mt-6 animate-in slide-in-from-right-4">
                                    <div className="flex-1 flex items-center gap-2 text-[10px] font-black uppercase text-rose-600 bg-rose-50 p-3 rounded-2xl border border-rose-100">
                                        <AlertTriangle className="h-4 w-4" /> Final Confirmation?
                                    </div>
                                    <Button size="sm" variant="ghost" onClick={() => setDeleteConfirm(null)} className="h-12 px-5 font-black uppercase text-[10px] bg-white border border-gray-100 rounded-2xl">Escape</Button>
                                    <Button size="sm" variant="destructive" onClick={() => handleDelete(product.id)} className="h-12 px-6 font-black uppercase text-[10px] rounded-2xl shadow-lg shadow-rose-200">Delete</Button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-4 gap-2 mt-6">
                                    <Link href={`/product/${product.id}`} className="col-span-1">
                                        <Button size="sm" variant="ghost" className="w-full h-12 rounded-2xl bg-white border border-gray-100 shadow-sm hover:bg-gray-50 flex items-center justify-center p-0">
                                            <Eye className="h-5 w-5 text-gray-400" />
                                        </Button>
                                    </Link>
                                    <Link href={`/seller/products/${product.id}/edit`} className="col-span-1">
                                        <Button size="sm" variant="ghost" className="w-full h-12 rounded-2xl bg-white border border-gray-100 shadow-sm hover:bg-blue-50 flex items-center justify-center p-0">
                                            <Edit3 className="h-5 w-5 text-blue-500" />
                                        </Button>
                                    </Link>
                                    {!product.is_sponsored ? (
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="col-span-1 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 shadow-sm hover:bg-amber-100 flex items-center justify-center p-0"
                                            onClick={() => setPromoteModalOpen({ isOpen: true, product })}
                                        >
                                            <Megaphone className="h-5 w-5" />
                                        </Button>
                                    ) : (
                                        <div className="col-span-1 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                                            <TrendingUp className="h-5 w-5 text-emerald-600" />
                                        </div>
                                    )}
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => setDeleteConfirm(product.id)}
                                        className="col-span-1 h-12 rounded-2xl bg-rose-50 border border-rose-100 text-rose-500 hover:bg-rose-100 flex items-center justify-center p-0"
                                    >
                                        <Trash2 className="h-5 w-5" />
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
                                            <img src={product.image_url || "/assets/images/placeholder-product.svg"} alt={product.name} className="h-full w-full object-contain mix-blend-multiply" />
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

            {/* Promote Product Modal — 3-Tier Selector */}
            <Dialog open={promoteModalOpen.isOpen} onOpenChange={(open) => !open && setPromoteModalOpen({ isOpen: false, product: null })}>
                <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-black tracking-tight">Boost Your Sales</DialogTitle>
                        <DialogDescription>
                            Promote &quot;{promoteModalOpen.product?.name}&quot; to the top of search results and category pages.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-3">
                        {[
                            { key: "3_day", days: 3, price: 5000, label: "3 Days", desc: "Quick visibility boost" },
                            { key: "10_day", days: 10, price: 9999, label: "10 Days", desc: "Extended reach campaign", popular: true },
                            { key: "30_day", days: 30, price: 20000, label: "30 Days", desc: "Maximum exposure & sales" },
                        ].map(plan => (
                            <button
                                key={plan.key}
                                type="button"
                                onClick={() => setSelectedAdPlan(plan.key as any)}
                                className={cn(
                                    "w-full text-left p-4 rounded-2xl border-2 transition-all relative",
                                    selectedAdPlan === plan.key
                                        ? "border-amber-500 bg-amber-50 shadow-md"
                                        : "border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50"
                                )}
                            >
                                {plan.popular && (
                                    <span className="absolute -top-2.5 right-4 text-[9px] font-black uppercase tracking-widest bg-amber-500 text-white px-2.5 py-0.5 rounded-full">Popular</span>
                                )}
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="font-bold text-gray-900 text-sm">{plan.label}</h4>
                                        <p className="text-xs text-gray-500 mt-0.5">{plan.desc}</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-lg font-black text-gray-900">₦{plan.price.toLocaleString()}</span>
                                    </div>
                                </div>
                            </button>
                        ))}
                        <div className="pt-2 text-center">
                            <Link href="/seller/dashboard/promotions" className="text-xs text-indigo-600 font-bold hover:underline">
                                View all running ads →
                            </Link>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setPromoteModalOpen({ isOpen: false, product: null })} className="font-bold text-gray-500">Cancel</Button>
                        <Button
                            className="bg-amber-500 hover:bg-amber-600 text-white font-bold"
                            onClick={handlePromoteProductInit}
                        >
                            Promote Now — ₦{selectedAdPlan === "3_day" ? "5,000" : selectedAdPlan === "10_day" ? "9,999" : "20,000"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {showPaystack && promoteModalOpen.product && (
                <PaystackCheckout
                    amount={(selectedAdPlan === "3_day" ? 500000 : selectedAdPlan === "10_day" ? 999900 : 2000000)}
                    email={DemoStore.getCurrentSeller()?.owner_email || "seller@fairprice.ng"}
                    onSuccess={handlePromoteSuccess}
                    onClose={() => setShowPaystack(false)}
                    autoStart={true}
                />
            )}
        </div>
    );
}
