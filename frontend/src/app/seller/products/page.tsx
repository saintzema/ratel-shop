"use client";

import { useEffect, useLayoutEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";
import { Product } from "@/lib/types";
import { DataSyncService } from "@/lib/sync-store";
import { PaystackCheckout } from "@/components/payment/PaystackCheckout";
import { formatPrice, cn, getProxiedImageUrl } from "@/lib/utils";
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
    Star,
    ArrowUpDown,
    Flame,
    ChevronLeft,
    ChevronRight,
    Loader2,
    LayoutGrid,
    List,
    X,
    CheckCircle2,
    Share2,
    Rocket
} from "lucide-react";
import { Pagination } from "@/components/ui/Pagination";
import { BoostPackageModal } from "@/components/seller/BoostPackageModal";
import { useNotification } from "@/components/ui/NotificationProvider";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog";

function SellerProductsContent() {
    const [products, setProducts] = useState<Product[]>([]);
    const [activeDeals, setActiveDeals] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string>("all");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    // A listing can be perfectly fine and still invisible to buyers because the
    // STORE hasn't been approved yet — getApprovedProducts() filters on seller
    // status/KYC, not on the product. Sellers had no way to tell that apart from
    // "my listing is broken", so surface it as an explicit Reviewing state.
    const [storeAwaitingApproval, setStoreAwaitingApproval] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [sortBy, setSortBy] = useState<string>("newest");
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
    const [viewMode, setViewMode] = useState<"table" | "grid">("table");
    
    const [promoteModalOpen, setPromoteModalOpen] = useState<{ isOpen: boolean; product: Product | null }>({ isOpen: false, product: null });
    // Tiered on-platform boost (Basic/Premium/VIP). Separate from the existing
    // "Promote" flow above, which drives the Meta-ads path.
    const [boostModal, setBoostModal] = useState<{ isOpen: boolean; product: Product | null }>({ isOpen: false, product: null });
    const [dealModalOpen, setDealModalOpen] = useState<{ isOpen: boolean; product: Product | null }>({ isOpen: false, product: null });
    const [dealDiscount, setDealDiscount] = useState("15");
    const [dealDurationHours, setDealDurationHours] = useState("24");
    const [showPaystack, setShowPaystack] = useState(false);
    const [selectedAdPlan, setSelectedAdPlan] = useState<"3_day" | "10_day" | "30_day">("3_day");
    const [saveSuccess, setSaveSuccess] = useState(false);
    const { showNotification } = useNotification();
    const router = useRouter();
    const [loading, setLoading] = useState(true);

    // Pagination State
    const searchParams = useSearchParams();
    const [itemsPerPage, setItemsPerPage] = useState(50);
    const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get("page") || "1"));

    const loadProducts = async () => {
        const sellerId = DataSyncService.getCurrentSellerId();
        const sellerInfo = DataSyncService.getCurrentSeller();
        if (!sellerId) {
            // Do NOT navigate away here.
            //
            // getCurrentSellerId() reads localStorage, and it is transiently null
            // on a cold start before the seller layout's auto-login has resolved
            // the store. Redirecting on that race is what made tapping "Products"
            // paint the page and then immediately bounce back to Overview — and
            // what sent the payout alert to onboarding for a fully registered
            // seller. The layout owns the auth decision and will redirect for a
            // genuinely signed-out user; this page just waits for the session.
            setLoading(false);
            return;
        }

        setActiveDeals(DataSyncService.getDeals());
        // Mirrors the visibility rule in getApprovedProducts().
        setStoreAwaitingApproval(
            !!sellerInfo &&
            !(sellerInfo.status === "active" || sellerInfo.verified === true || (sellerInfo as any).kyc_status === "approved")
        );
        setLoading(true);
        try {
            // Fetch products for this specific seller from global sync store first for better consistency
            const all = DataSyncService.getProducts({ includeInactiveSellers: true });
            const sellerProducts = all.filter((p: any) => p.seller_id === sellerId || (sellerInfo && p.seller_id === sellerInfo.user_id));
            // Never replace a populated list with an empty one.
            //
            // loadProducts re-runs on every sync-store-update, and the shared
            // product cache is capped and can be evicted or written mid-sync. When
            // that happened this filter returned [] and wiped a good list — the
            // "166 items, then 0 items" flash. An empty local result is far more
            // likely to mean "cache not ready" than "this seller has no products",
            // so keep what we have and let the authoritative DB fetch below settle
            // it. It clears legitimately via the explicit delete path.
            setProducts(prev => (sellerProducts.length === 0 && prev.length > 0 ? prev : sellerProducts));

            // The DB is the source of truth for a seller's own product list.
            //
            // This fetch used to be image-patch-only: it pulled every product for the
            // seller and then threw all of it away except the image URLs, so the list
            // itself was whatever happened to be in this device's localStorage. Any
            // product this browser had never personally seen — an Instagram catalog
            // import, something created on another device, anything added after the
            // cache was last written — simply didn't exist here. That's why imports
            // "didn't appear in Products" and why the list looked empty after
            // navigating back with a cold cache.
            //
            // Now the fresh rows are merged in (DB wins on conflicts, since it's
            // authoritative) and written back to the local store so the rest of the
            // app sees them too.
            fetch(`/api/products?sellerId=${sellerId}&all=true`)
                .then(r => r.ok ? r.json() : null)
                .then((data: any) => {
                    if (!data) return;
                    const fresh: any[] = Array.isArray(data) ? data : (data.products || []);
                    if (!fresh.length) return;

                    setProducts(prev => {
                        const byId = new Map<string, any>(prev.map((p: any) => [p.id, p]));
                        for (const f of fresh) {
                            const existing = byId.get(f.id);
                            // Keep a locally-known good image if the DB row has none.
                            const img = (f.image_url || f.imageUrl) || existing?.image_url;
                            byId.set(f.id, { ...existing, ...f, image_url: img });
                        }
                        return Array.from(byId.values());
                    });

                    // Persist through DataSyncService (quota-aware) rather than a raw
                    // localStorage.setItem, which threw and lost the whole write once
                    // storage filled up.
                    try { DataSyncService.addRawProducts(fresh as any, false); } catch { /* non-critical */ }
                })
                .catch(() => {});
        } catch (error) {
            console.error("Failed to load products:", error);
        } finally {
            setLoading(false);
        }
    };

    // useLayoutEffect: this page remounts every time the seller navigates back
    // to it. The DataSyncService.getProducts() read inside loadProducts is
    // synchronous — only the DB-merge fetch after it is async — but useEffect
    // fires after paint, so the empty initial `products` state showed for one
    // frame on every return trip. useLayoutEffect commits before paint.
    useLayoutEffect(() => {
        loadProducts();

        // Restore view mode preference
        const savedMode = localStorage.getItem("seller_products_view_mode");
        if (savedMode === "grid" || savedMode === "table") {
            setViewMode(savedMode as any);
        }

        window.addEventListener("sync-store-update", loadProducts);
        return () => window.removeEventListener("sync-store-update", loadProducts);
    }, []);

    // Save view mode preference
    useEffect(() => {
        localStorage.setItem("seller_products_view_mode", viewMode);
    }, [viewMode]);

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, selectedCategory, statusFilter, sortBy]);

    const handleDelete = async (id: string) => {
        try {
            // Use canonical DataSyncService to ensure tombstoning and local cleanup
            DataSyncService.deleteProduct(id);
            setDeleteConfirm(null);
            setSelectedProductIds(prev => prev.filter(pid => pid !== id));
            showNotification({
                type: "success",
                title: "Item Purged",
                message: "Product has been successfully removed from inventory.",
                duration: 3000
            });
            loadProducts();
        } catch (error) {
            console.error("Delete failed:", error);
            showNotification({
                type: "error",
                title: "Purge Failed",
                message: "We encountered an error while removing the item.",
                duration: 4000
            });
        }
    };

    const handleBulkDelete = () => {
        if (confirm(`Are you sure you want to delete ${selectedProductIds.length} products? This cannot be undone.`)) {
            selectedProductIds.forEach(id => DataSyncService.deleteProduct(id));
            const count = selectedProductIds.length;
            setSelectedProductIds([]);
            showNotification({
                type: "success",
                title: "Bulk Purge Complete",
                message: `Successfully removed ${count} items from your catalog.`,
                duration: 4000
            });
            loadProducts();
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        }
    };

    const handleBulkPromote = () => {
        if (selectedProductIds.length === 0) return;
        setPromoteModalOpen({ isOpen: true, product: null });
    };

    const toggleSelectAll = () => {
        if (selectedProductIds.length === paginatedProducts.length) {
            setSelectedProductIds([]);
        } else {
            setSelectedProductIds(paginatedProducts.map(p => p.id));
        }
    };

    const toggleSelectProduct = (id: string) => {
        setSelectedProductIds(prev => 
            prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
        );
    };

    const filtered = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === "all" || p.category === selectedCategory;
        const matchesStatus =
            statusFilter === "all" ||
            // "Live" now means genuinely visible to buyers: active AND the store
            // itself is approved. Previously a pending store's listings all showed
            // as Live while being invisible on the actual marketplace.
            (statusFilter === "live" && p.is_active && !storeAwaitingApproval) ||
            (statusFilter === "reviewing" && p.is_active && storeAwaitingApproval) ||
            (statusFilter === "sponsored" && p.is_sponsored);
        return matchesSearch && matchesCategory && matchesStatus;
    }).sort((a, b) => {
        switch (sortBy) {
            case "newest":
                return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
            case "price-high":
                return b.price - a.price;
            case "price-low":
                return a.price - b.price;
            case "low-stock":
                return a.stock - b.stock;
            case "most-bought":
                return (b.sold_count || 0) - (a.sold_count || 0);
            case "name-az":
                return a.name.localeCompare(b.name);
            default:
                return 0;
        }
    });

    // Pagination Calculation
    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const paginatedProducts = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const categories = Array.from(new Set(products.map(p => p.category)));

    const handlePromoteProductInit = () => {
        // If product is null, it's a bulk promotion
        setPromoteModalOpen({ ...promoteModalOpen, isOpen: false });
        setShowPaystack(true);
    };

    const handlePromoteSuccess = (reference: string) => {
        const sellerId = DataSyncService.getCurrentSellerId();
        const sellerInfo = DataSyncService.getCurrentSeller();
        
        if (sellerId) {
            if (dealModalOpen.isOpen && dealModalOpen.product) {
                const hours = parseInt(dealDurationHours) || 24;
                const discountPct = parseInt(dealDiscount) || 15;
                const endAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
                const startAt = new Date().toISOString();
                
                DataSyncService.addDeal({
                    product_id: dealModalOpen.product.id,
                    product: dealModalOpen.product,
                    discount_pct: discountPct,
                    start_at: startAt,
                    end_at: endAt,
                    is_active: true
                });

                if (sellerInfo) {
                    DataSyncService.addNotification({
                        userId: sellerInfo.owner_email || sellerInfo.id,
                        type: "promo",
                        message: `🔥 Your paid deal for "${dealModalOpen.product.name}" is now live! ${discountPct}% off for ${hours} hours.`,
                        link: "/deals"
                    });
                }
                setDealModalOpen({ isOpen: false, product: null });
            } else if (promoteModalOpen.isOpen || selectedProductIds.length > 0) {
                const idsToPromote = promoteModalOpen.product ? [promoteModalOpen.product.id] : selectedProductIds;
                
                idsToPromote.forEach(pid => {
                    DataSyncService.createPromotion(pid, sellerId, selectedAdPlan);
                });

                if (sellerInfo) {
                    DataSyncService.addNotification({
                        userId: sellerInfo.owner_email || sellerInfo.id,
                        type: "promo",
                        message: `🚀 ${idsToPromote.length > 1 ? `${idsToPromote.length} products` : `"${promoteModalOpen.product?.name || 'Your product'}"`} ${idsToPromote.length > 1 ? 'are' : 'is'} now sponsored!`,
                        link: "/seller/dashboard"
                    });
                }
                setPromoteModalOpen({ isOpen: false, product: null });
                setSelectedProductIds([]);
            }
        }

        setShowPaystack(false);
        setSaveSuccess(true);
        showNotification({
            type: "success",
            title: "Market Boost Active",
            message: promoteModalOpen.isOpen ? "Promotion successfully launched!" : "Product deal is now live!",
            duration: 4000
        });
        setTimeout(() => setSaveSuccess(false), 3000);
        loadProducts();
    };

    const handlePromoteToDeal = () => {
        if (!dealModalOpen.product) return;
        const seller = DataSyncService.getCurrentSeller();
        const discountPct = parseInt(dealDiscount) || 15;
        const hours = parseInt(dealDurationHours) || 24;
        const endAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
        const startAt = new Date().toISOString();
        
        DataSyncService.addDeal({
            product_id: dealModalOpen.product.id,
            product: dealModalOpen.product,
            discount_pct: discountPct,
            start_at: startAt,
            end_at: endAt,
            is_active: true
        });

        if (seller) {
            DataSyncService.addNotification({
                userId: seller.owner_email || seller.id,
                type: "promo",
                message: `🔥 Your free deal for "${dealModalOpen.product.name}" is live!`,
                link: "/deals"
            });
        }

        window.dispatchEvent(new Event("sync-store-update"));
        setDealModalOpen({ isOpen: false, product: null });
        setSaveSuccess(true);
        showNotification({
            type: "success",
            title: "Hot Deal Live",
            message: "Your free deal promotion has been activated.",
            duration: 4000
        });
        setTimeout(() => setSaveSuccess(false), 3000);
    };

    return (
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 text-gray-900 pb-32">
            
            {/* Apple-Style Responsive Header */}
            <div className="flex flex-col gap-6 mb-10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="hidden sm:flex items-center gap-2 mb-1.5">
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-100 text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full">
                                Inventory Systems
                            </Badge>
                            <span className="text-[11px] font-bold text-gray-400">/ Catalog Control</span>
                        </div>
                        <div className="flex items-center gap-3 sm:gap-4">
                            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-gray-900 tracking-tight">Products</h1>
                            <span className="bg-gray-100 text-gray-500 text-xs sm:text-sm font-black px-2.5 sm:px-3 py-1 rounded-full">{filtered.length} items</span>
                        </div>
                    </div>
                    {/* Previously "hidden sm:flex" — invisible on every phone in portrait,
                        which is why rotating to landscape was the only way to see it. */}
                    <Link href="/seller/products/new" className="w-full sm:w-auto">
                        <Button className="w-full sm:w-auto bg-gray-900 hover:bg-black text-white font-black uppercase tracking-widest rounded-2xl px-6 h-12 shadow-xl transition-all active:scale-95 text-[10px] flex items-center justify-center">
                            <Plus className="h-4 w-4 mr-2" /> Add Item
                        </Button>
                    </Link>
                </div>

                {/* Search & Bulk Toolbar */}
                <div className="bg-white/60 backdrop-blur-xl border border-white/80 rounded-[28px] p-2.5 shadow-xl flex flex-col lg:flex-row gap-3 items-center">
                    <div className="relative flex-1 w-full group">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-brand-green-600 transition-colors" />
                        <Input
                            placeholder="Find an item in your warehouse..."
                            className="pl-12 pr-12 h-14 rounded-[22px] border-white/40 bg-white/40 backdrop-blur-sm focus:bg-white transition-all text-sm font-semibold shadow-inner w-full"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && (
                            <button 
                                onClick={() => setSearchQuery("")}
                                className="absolute right-5 top-1/2 -translate-y-1/2 h-6 w-6 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition-all"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                    
                    <div className="flex items-center gap-2 w-full lg:w-auto overflow-x-auto scrollbar-hide p-1">
                        <div className="relative shrink-0">
                            <ArrowUpDown className="absolute left-4 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="h-14 pl-10 pr-8 rounded-[22px] bg-white/40 backdrop-blur-sm border border-white/60 text-[10px] font-black uppercase tracking-widest text-gray-600 focus:ring-4 focus:ring-brand-green-500/10 outline-none transition-all shadow-sm cursor-pointer appearance-none min-w-[150px]"
                            >
                                <option value="newest">Newest</option>
                                <option value="price-high">Price: High</option>
                                <option value="price-low">Price: Low</option>
                                <option value="low-stock">Low Stock</option>
                                <option value="most-bought">Popular</option>
                            </select>
                        </div>

                        <Button
                            variant="ghost"
                            className={cn(
                                "h-14 px-6 rounded-[22px] font-black uppercase tracking-widest text-[10px] transition-all gap-2 shrink-0 border border-white/60",
                                showFilters ? "bg-brand-green-50 text-brand-green-700 shadow-inner" : "bg-white/40 text-gray-500 hover:bg-white/80"
                            )}
                            onClick={() => setShowFilters(!showFilters)}
                        >
                            <Filter className="h-4 w-4" /> Filters
                        </Button>

                        <div className="h-14 bg-gray-100/50 p-1.5 rounded-[22px] flex gap-1 border border-white/40 shrink-0">
                            <button 
                                onClick={() => setViewMode("table")}
                                className={cn("px-4 rounded-xl transition-all", viewMode === "table" ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600")}
                            >
                                <List className="h-4 w-4" />
                            </button>
                            <button 
                                onClick={() => setViewMode("grid")}
                                className={cn("px-4 rounded-xl transition-all", viewMode === "grid" ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600")}
                            >
                                <LayoutGrid className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Bulk Actions Floating Bar */}
                {selectedProductIds.length > 0 && (
                    <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 bg-gray-900/90 backdrop-blur-2xl px-8 py-4 rounded-[32px] border border-white/10 shadow-2xl flex items-center gap-8 animate-in fade-in slide-in-from-bottom-10">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 bg-brand-green-500 rounded-full flex items-center justify-center">
                                <Check className="h-4 w-4 text-white" />
                            </div>
                            <span className="text-sm font-black text-white uppercase tracking-widest">{selectedProductIds.length} Selected</span>
                        </div>
                        <div className="h-8 w-px bg-white/10" />
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" onClick={() => setSelectedProductIds([])} className="text-white/60 hover:text-white font-bold text-[10px] uppercase tracking-widest">
                                Deselect
                            </Button>
                            <Button 
                                onClick={handleBulkPromote}
                                className="bg-amber-500 hover:bg-amber-600 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl h-10 px-6 shadow-lg shadow-amber-500/20"
                            >
                                <Megaphone className="h-4 w-4 mr-2" /> Bulk Promote
                            </Button>
                            <Button 
                                variant="destructive" 
                                onClick={handleBulkDelete}
                                className="bg-rose-500 hover:bg-rose-600 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl h-10 px-6 shadow-lg shadow-rose-500/20"
                            >
                                <Trash2 className="h-4 w-4 mr-2" /> Bulk Delete
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Quick Status Filters */}
            {showFilters && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 animate-in fade-in slide-in-from-top-4">
                    <div className="bg-white/40 backdrop-blur-xl p-6 rounded-[28px] border border-white/60">
                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-3 block">Category</Label>
                        <select
                            className="w-full h-12 bg-white/60 border border-white rounded-2xl px-4 text-xs font-black uppercase tracking-widest outline-none"
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                        >
                            <option value="all">All Categories</option>
                            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                    </div>
                    <div className="bg-white/40 backdrop-blur-xl p-6 rounded-[28px] border border-white/60">
                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-3 block">Market Status</Label>
                        <div className="flex bg-gray-100 p-1 rounded-2xl gap-1">
                            {["all", "live", "reviewing", "sponsored"].map((s) => (
                                <button
                                    key={s}
                                    onClick={() => setStatusFilter(s)}
                                    className={cn(
                                        "flex-1 h-10 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                                        statusFilter === s ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600"
                                    )}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="flex items-center justify-center">
                        <Button 
                            variant="ghost" 
                            className="text-[10px] font-black uppercase text-rose-500 hover:text-rose-600"
                            onClick={() => { setSelectedCategory("all"); setStatusFilter("all"); setSearchQuery(""); }}
                        >
                            Clear All Filters
                        </Button>
                    </div>
                </div>
            )}

            {/* Content Area */}
            <div className={cn(
                "transition-all duration-500",
                loading ? "opacity-50 grayscale" : "opacity-100"
            )}>
                {paginatedProducts.length === 0 ? (
                    <div className="py-32 text-center bg-white/40 backdrop-blur-xl rounded-[40px] border border-dashed border-gray-200">
                        <div className="h-20 w-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-gray-100">
                            <Package className="h-10 w-10 text-gray-200" />
                        </div>
                        <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Zero Items Found</h2>
                        <p className="text-sm text-gray-500 mt-2 font-medium italic">Adjust your filters or add a new high-performance item.</p>
                        <Link href="/seller/products/new" className="mt-8 inline-block">
                            <Button className="bg-gray-900 text-white font-black uppercase tracking-widest rounded-2xl px-8 h-12">Launch Product</Button>
                        </Link>
                    </div>
                ) : viewMode === "table" ? (
                    /* ─── Premium Responsive Table ─── */
                    <div className="bg-white/40 backdrop-blur-xl rounded-[32px] border border-white/60 shadow-xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-gray-100/50">
                                        <th className="px-6 py-5 w-12">
                                            <div 
                                                className={cn(
                                                    "h-5 w-5 rounded-md border-2 transition-all flex items-center justify-center cursor-pointer",
                                                    selectedProductIds.length === paginatedProducts.length && paginatedProducts.length > 0 ? "bg-gray-900 border-gray-900" : "border-gray-200"
                                                )}
                                                onClick={toggleSelectAll}
                                            >
                                                {selectedProductIds.length === paginatedProducts.length && paginatedProducts.length > 0 && <Check className="h-3 w-3 text-white" />}
                                            </div>
                                        </th>
                                        <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Product Item</th>
                                        <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Pricing</th>
                                        <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest hidden md:table-cell">Inventory</th>
                                        <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest hidden lg:table-cell">Status</th>
                                        <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Control</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100/50">
                                    {paginatedProducts.map((product) => (
                                        <tr key={product.id} className={cn(
                                            "transition-all duration-300 group",
                                            selectedProductIds.includes(product.id) ? "bg-brand-green-50/30" : "hover:bg-white/60"
                                        )}>
                                            <td className="px-6 py-6">
                                                <div 
                                                    className={cn(
                                                        "h-5 w-5 rounded-md border-2 transition-all flex items-center justify-center cursor-pointer",
                                                        selectedProductIds.includes(product.id) ? "bg-gray-900 border-gray-900" : "border-gray-200 group-hover:border-gray-400"
                                                    )}
                                                    onClick={() => toggleSelectProduct(product.id)}
                                                >
                                                    {selectedProductIds.includes(product.id) && <Check className="h-3 w-3 text-white" />}
                                                </div>
                                            </td>
                                            <td className="px-6 py-6">
                                                <div className="flex items-center gap-5">
                                                    <div className="h-16 w-16 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex items-center justify-center p-2 relative shrink-0">
                                                        <img 
                                                            src={getProxiedImageUrl(product.image_url)} 
                                                            alt={product.name} 
                                                            className="h-full w-full object-contain mix-blend-multiply group-hover:scale-110 transition-transform duration-500" 
                                                            onError={(e) => { e.currentTarget.src = "/assets/images/placeholder-product.svg"; }} 
                                                        />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h3 className="font-black text-gray-900 text-sm truncate max-w-[200px] xl:max-w-[300px]">{product.name}</h3>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="text-[9px] font-black uppercase text-gray-400">{product.category}</span>
                                                            {product.is_sponsored && <Badge className="bg-amber-100 text-amber-700 text-[8px] font-black uppercase px-1.5 h-4">Ads Live</Badge>}
                                                        </div>
                                                        {/* Per-listing engagement, so "is this ad working?" is answerable
                                                            without leaving the page (and gives a boost something to be
                                                            measured against). */}
                                                        <div className="flex items-center gap-3 mt-1.5 text-[10px] font-bold text-gray-400">
                                                            <span className="flex items-center gap-1" title="Views">
                                                                <Eye className="h-3 w-3" />{product.view_count ?? 0}
                                                            </span>
                                                            <span className="flex items-center gap-1" title="Phone/contact reveals">
                                                                <Megaphone className="h-3 w-3" />{product.phone_view_count ?? 0}
                                                            </span>
                                                            <span className="flex items-center gap-1" title="Chats started">
                                                                <Share2 className="h-3 w-3" />{product.chat_count ?? 0}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-6">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-black text-gray-900">{formatPrice(product.price)}</span>
                                                    {product.original_price && (
                                                        <span className="text-[10px] text-gray-400 line-through">₦{product.original_price.toLocaleString()}</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-6 hidden md:table-cell">
                                                <div className={cn(
                                                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border shadow-sm",
                                                    product.stock < 10 ? "bg-rose-50 text-rose-600 border-rose-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"
                                                )}>
                                                    <Zap className="h-3 w-3" /> {product.stock} Units
                                                </div>
                                            </td>
                                            <td className="px-6 py-6 hidden lg:table-cell">
                                                {/* Was hardcoded "Active Live" for every row, including listings
                                                    buyers genuinely can't see yet. */}
                                                {!product.is_active ? (
                                                    <Badge variant="outline" className="text-[9px] font-black bg-gray-100 text-gray-500 border-gray-200 uppercase tracking-widest px-2.5">
                                                        Paused
                                                    </Badge>
                                                ) : storeAwaitingApproval ? (
                                                    <Badge variant="outline" className="text-[9px] font-black bg-amber-50 text-amber-700 border-amber-200 uppercase tracking-widest px-2.5" title="Your store is still being reviewed — listings go live once it's approved.">
                                                        Reviewing
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="text-[9px] font-black bg-emerald-50 text-emerald-700 border-emerald-200 uppercase tracking-widest px-2.5">
                                                        Active Live
                                                    </Badge>
                                                )}
                                            </td>
                                            <td className="px-6 py-6 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    {!product.is_sponsored ? (
                                                        <Button
                                                            variant="ghost"
                                                            className="h-10 px-4 rounded-xl hover:bg-amber-50 hover:text-amber-600 transition-colors gap-2 text-[10px] font-black uppercase tracking-widest"
                                                            onClick={() => setBoostModal({ isOpen: true, product })}
                                                            title="Promote this listing — pick a boost package"
                                                        >
                                                            <Rocket className="h-4 w-4" /> Promote
                                                        </Button>
                                                    ) : (
                                                        <div className="h-10 px-4 rounded-xl bg-amber-50 flex items-center justify-center gap-2 border border-amber-100" title="Promotion Active">
                                                            <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                                                            <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Promoted</span>
                                                        </div>
                                                    )}
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-10 w-10 rounded-xl hover:bg-purple-50 hover:text-purple-600 transition-colors"
                                                        onClick={() => setDealModalOpen({ isOpen: true, product })}
                                                        title="Add to Deals"
                                                    >
                                                        <Flame className="h-4 w-4" />
                                                    </Button>
                                                    <Link href={`/seller/social?product=${product.id}`}>
                                                        <Button size="icon" variant="ghost" className="h-10 w-10 rounded-xl hover:bg-indigo-50 hover:text-indigo-600 transition-colors" title="Share to social media">
                                                            <Share2 className="h-4 w-4" />
                                                        </Button>
                                                    </Link>
                                                    <Link href={`/seller/products/${product.id}/edit?page=${currentPage}`}>
                                                        <Button size="icon" variant="ghost" className="h-10 w-10 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-colors" title="Edit Item">
                                                            <Edit3 className="h-4 w-4" />
                                                        </Button>
                                                    </Link>
                                                    <Button
                                                        size="icon" 
                                                        variant="ghost" 
                                                        className="h-10 w-10 rounded-xl hover:bg-rose-50 hover:text-rose-600 transition-colors"
                                                        onClick={() => setDeleteConfirm(product.id)}
                                                        title="Delete Item"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                    
                                                    {/* Confirmation overlay if delete clicked */}
                                                    {deleteConfirm === product.id && (
                                                        <div className="absolute right-6 z-10 bg-white shadow-2xl border border-gray-200 p-2 rounded-2xl flex items-center gap-2 animate-in slide-in-from-right-4">
                                                            <span className="text-[10px] font-black uppercase px-2 text-rose-600">Delete Permanently?</span>
                                                            <Button size="sm" variant="ghost" className="h-8 text-[9px] font-black uppercase rounded-lg" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
                                                            <Button size="sm" variant="destructive" className="h-8 text-[9px] font-black uppercase rounded-lg px-4" onClick={() => handleDelete(product.id)}>Delete</Button>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    /* ─── Premium Grid Mode ─── */
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {paginatedProducts.map((product) => (
                            <div key={product.id} className={cn(
                                "group bg-white/40 backdrop-blur-xl rounded-[32px] border border-white/60 p-6 shadow-xl transition-all duration-500 relative",
                                selectedProductIds.includes(product.id) ? "ring-2 ring-gray-900 border-transparent bg-white/80" : "hover:bg-white/80"
                            )}>
                                {/* Selection Checkbox */}
                                <div 
                                    className={cn(
                                        "absolute top-5 left-5 z-10 h-6 w-6 rounded-lg border-2 transition-all flex items-center justify-center cursor-pointer",
                                        selectedProductIds.includes(product.id) ? "bg-gray-900 border-gray-900" : "bg-white/40 border-white opacity-0 group-hover:opacity-100"
                                    )}
                                    onClick={() => toggleSelectProduct(product.id)}
                                >
                                    {selectedProductIds.includes(product.id) && <Check className="h-3.5 w-3.5 text-white" />}
                                </div>

                                <div className="aspect-square bg-white rounded-3xl mb-6 p-4 border border-gray-100 shadow-sm relative overflow-hidden flex items-center justify-center">
                                    <img 
                                        src={getProxiedImageUrl(product.image_url)} 
                                        alt={product.name} 
                                        className="h-full w-full object-contain mix-blend-multiply group-hover:scale-110 transition-transform duration-700" 
                                        onError={(e) => { e.currentTarget.src = "/assets/images/placeholder-product.svg"; }} 
                                    />
                                    {product.stock < 10 && (
                                        <div className="absolute bottom-4 left-4 bg-rose-500 text-white text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full shadow-lg">Low Stock</div>
                                    )}
                                </div>
                                
                                <div className="space-y-1">
                                    <h3 className="font-black text-gray-900 text-sm line-clamp-1">{product.name}</h3>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{product.category}</p>
                                </div>
                                
                                <div className="mt-4 flex flex-col gap-3">
                                    <div>
                                        <span className="text-xl font-black text-gray-900 break-all">{formatPrice(product.price)}</span>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Badge variant="outline" className="text-[8px] font-bold h-4">Live</Badge>
                                            {product.is_sponsored && <Badge className="bg-amber-500 text-white text-[8px] font-bold h-4 border-none">Promoted</Badge>}
                                        </div>
                                    </div>
                                    <div className="flex gap-1.5 items-center flex-wrap">
                                        {!product.is_sponsored ? (
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-9 w-9 rounded-xl bg-white border border-gray-100 shadow-sm hover:bg-amber-50 hover:text-amber-600"
                                                onClick={() => setBoostModal({ isOpen: true, product })}
                                                title="Promote this listing — pick a boost package"
                                            >
                                                <Rocket className="h-4 w-4" />
                                            </Button>
                                        ) : (
                                            <div className="h-9 px-3 rounded-xl bg-amber-50 flex items-center justify-center gap-1.5 border border-amber-100" title="Promotion Active">
                                                <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                                                <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest">Promoted</span>
                                            </div>
                                        )}
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-9 w-9 rounded-xl bg-white border border-gray-100 shadow-sm hover:bg-purple-50 hover:text-purple-600"
                                            onClick={() => setDealModalOpen({ isOpen: true, product })}
                                            title="Add to Deals"
                                        >
                                            <Flame className="h-4 w-4" />
                                        </Button>
                                        <Link href={`/seller/social?product=${product.id}`}>
                                            <Button size="icon" variant="ghost" className="h-9 w-9 rounded-xl bg-white border border-gray-100 shadow-sm hover:bg-indigo-50 hover:text-indigo-600" title="Share to social media">
                                                <Share2 className="h-4 w-4" />
                                            </Button>
                                        </Link>
                                        <Link href={`/seller/products/${product.id}/edit?page=${currentPage}`}>
                                            <Button size="icon" variant="ghost" className="h-9 w-9 rounded-xl bg-white border border-gray-100 shadow-sm" title="Edit Item">
                                                <Edit3 className="h-4 w-4" />
                                            </Button>
                                        </Link>

                                        <Button 
                                            size="icon" 
                                            variant="ghost" 
                                            className="h-9 w-9 rounded-xl bg-rose-50 text-rose-500 border border-rose-100"
                                            onClick={() => setDeleteConfirm(product.id)}
                                            title="Delete Item"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>

                                {deleteConfirm === product.id && (
                                    <div className="absolute inset-0 z-20 bg-gray-900/90 backdrop-blur-md rounded-[32px] p-8 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in-95">
                                        <AlertTriangle className="h-10 w-10 text-rose-500 mb-4" />
                                        <h4 className="text-white font-black uppercase tracking-widest text-xs mb-2">Confirm Removal</h4>
                                        <p className="text-white/60 text-[10px] mb-6">This product will be permanently purged from the marketplace.</p>
                                        <div className="flex gap-3 w-full">
                                            <Button variant="ghost" className="flex-1 text-white hover:bg-white/10 rounded-2xl h-12" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
                                            <Button variant="destructive" className="flex-1 bg-rose-500 rounded-2xl h-12" onClick={() => handleDelete(product.id)}>Delete</Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
                
                {/* Modern Pagination */}
                {totalPages > 1 && (
                    <div className="mt-12 bg-white/40 backdrop-blur-xl p-4 rounded-[28px] border border-white/60 shadow-lg">
                        <Pagination 
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={(page) => {
                                setCurrentPage(page);
                                const params = new URLSearchParams(window.location.search);
                                params.set("page", page.toString());
                                router.replace(`${window.location.pathname}?${params.toString()}`, { scroll: false });
                            }}
                            itemsPerPage={itemsPerPage}
                            totalItems={filtered.length}
                            onItemsPerPageChange={(val) => { setItemsPerPage(val); setCurrentPage(1); }}
                            type="items"
                            className="bg-transparent"
                        />
                    </div>
                )}
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

            {showPaystack && (promoteModalOpen.product || dealModalOpen.product) && (
                <PaystackCheckout
                    amount={dealModalOpen.isOpen ? 
                        (dealDurationHours === "6" ? 200000 : dealDurationHours === "24" ? 500000 : 1200000) : 
                        (selectedAdPlan === "3_day" ? 500000 : selectedAdPlan === "10_day" ? 999900 : 2000000)}
                    email={DataSyncService.getCurrentSeller()?.owner_email || "seller@fairprice.ng"}
                    metadata={{
                        type: "sponsored_ad",
                        product_id: promoteModalOpen.product?.id || dealModalOpen.product?.id,
                        plan: dealModalOpen.isOpen ? `deal_${dealDurationHours}` : selectedAdPlan,
                        seller_id: DataSyncService.getCurrentSellerId()
                    }}
                    onSuccess={handlePromoteSuccess}
                    onClose={() => setShowPaystack(false)}
                    autoStart={true}
                />
            )}

            {/* Promote to Deal Modal */}
            <Dialog open={dealModalOpen.isOpen} onOpenChange={(open) => !open && setDealModalOpen({ isOpen: false, product: null })}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black flex items-center gap-2"><Flame className="text-purple-600" /> Promote to Deals</DialogTitle>
                    </DialogHeader>
                    {dealModalOpen.product && (() => {
                        const currentSeller = DataSyncService.getCurrentSeller();
                        const currentPlan = currentSeller?.subscription_plan || "Starter";
                        
                        // Calculate free deal slots based on plan
                        const maxFreeDeals = currentPlan === "Scale" ? 2 : currentPlan === "Growth" ? 2 : currentPlan === "Pro" ? 1 : 0;
                        const activeDealsCount = (DataSyncService.getDeals() || []).filter(d => 
                            d.is_active && 
                            new Date(d.end_at) > new Date() &&
                            DataSyncService.getProducts().find(p => p.id === d.product_id)?.seller_id === currentSeller?.id
                        ).length;

                        const availableFreeDeals = Math.max(0, maxFreeDeals - activeDealsCount);

                        const dealPackages = [
                            { id: "flash", name: "Flash Deal", hours: 6, price: 2000, desc: "Quick boost" },
                            { id: "day", name: "Day Deal", hours: 24, price: 5000, desc: "Full day visibility" },
                            { id: "weekend", name: "Weekend Deal", hours: 72, price: 12000, desc: "Max exposure" }
                        ];

                        return (
                            <div className="py-2 space-y-4">
                                <div className="flex items-center gap-4 bg-gray-50 p-3 rounded-xl border border-gray-100 mb-2">
                                    <img src={getProxiedImageUrl(dealModalOpen.product.image_url)} alt="" className="w-12 h-12 rounded object-contain" onError={(e) => { e.currentTarget.src = '/assets/images/placeholder.png'; }} />
                                    <div>
                                        <p className="font-bold text-sm text-gray-900 line-clamp-1">{dealModalOpen.product.name}</p>
                                        <p className="text-xs text-gray-500">Current: ₦{dealModalOpen.product.price.toLocaleString()}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 mb-1 block">Discount (%)</label>
                                        <Input type="number" value={dealDiscount} onChange={(e) => setDealDiscount(e.target.value)} min="1" max="99" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 mb-1 block">Package</label>
                                        <select 
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
                                            value={dealDurationHours}
                                            onChange={(e) => setDealDurationHours(e.target.value)}
                                        >
                                            {dealPackages.map(pkg => (
                                                <option key={pkg.id} value={pkg.hours}>
                                                    {pkg.name} ({pkg.hours}h) - ₦{pkg.price.toLocaleString()}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {maxFreeDeals > 0 && (
                                     <div className={`mt-4 p-3 rounded-lg border text-sm ${availableFreeDeals > 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold">Plan Perks ({currentPlan})</span>
                                            <span className="font-mono bg-white px-2 py-0.5 rounded text-xs">{activeDealsCount}/{maxFreeDeals} Used</span>
                                        </div>
                                        <p className="text-xs mt-1">
                                            {availableFreeDeals > 0 
                                                ? `You have ${availableFreeDeals} free Hot Deal promotion${availableFreeDeals > 1 ? 's' : ''} remaining.` 
                                                : "You've used all your free Hot Deal promotions. Standard rates apply."}
                                        </p>
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setDealModalOpen({ isOpen: false, product: null })}>Cancel</Button>
                        <Button 
                            onClick={() => {
                                const currentSeller = DataSyncService.getCurrentSeller();
                                const currentPlan = currentSeller?.subscription_plan || "Starter";
                                const maxFreeDeals = currentPlan === "Scale" ? 2 : currentPlan === "Growth" ? 2 : currentPlan === "Pro" ? 1 : 0;
                                const activeDealsCount = (DataSyncService.getDeals() || []).filter(d => 
                                    d.is_active && 
                                    new Date(d.end_at) > new Date() &&
                                    DataSyncService.getProducts().find(p => p.id === d.product_id)?.seller_id === currentSeller?.id
                                ).length;
                                
                                const availableFreeDeals = Math.max(0, maxFreeDeals - activeDealsCount);
                                
                                if (availableFreeDeals > 0) {
                                    handlePromoteToDeal(); // Free checkout
                                } else {
                                    // Trigger Paystack — keep dealModalOpen intact so handlePromoteSuccess knows it's a deal flow
                                    setSelectedAdPlan("3_day");
                                    setShowPaystack(true);
                                }
                            }} 
                            className="bg-purple-600 hover:bg-purple-700 text-white"
                        >
                            Promote to Deals <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <BoostPackageModal
                product={boostModal.product}
                isOpen={boostModal.isOpen}
                onClose={() => setBoostModal({ isOpen: false, product: null })}
                onBoosted={loadProducts}
            />
        </div>
    );
}

export default function SellerProducts() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center py-20">
                <div className="h-6 w-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
            </div>
        }>
            <SellerProductsContent />
        </Suspense>
    );
}
