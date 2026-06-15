"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { NegotiationRequest, Product } from "@/lib/types";
import { DataSyncService } from "@/lib/sync-store";
import { formatPrice, cn, getProductUrl } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/context/CartContext";
import { Navbar } from "@/components/layout/Navbar";
import { YouMayAlsoLike } from "@/components/product/YouMayAlsoLike";
import { ProductCard } from "@/components/product/ProductCard";
import {
    CheckCircle,
    XCircle,
    MessageSquare,
    Clock,
    ShoppingCart,
    AlertTriangle,
    ArrowRight,
    Check,
    ChevronLeft,
    TrendingUp
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useMessages } from "@/context/MessageContext";

export default function NegotiationsPage() {
    const [negotiations, setNegotiations] = useState<NegotiationRequest[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [filter, setFilter] = useState<"all" | "pending" | "accepted" | "rejected" | "purchased">("all");
    const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
    const { addToCart } = useCart();
    const { user } = useAuth();
    const router = useRouter();
    const { openMessageBox } = useMessages();

    useEffect(() => {
        const userId = user?.id || user?.email || "";

        const loadData = () => {
            let all = DataSyncService.getNegotiations(undefined, userId);
            // Sort by most recent activity first
            all.sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime());
            setNegotiations(all);
            setProducts(DataSyncService.getProducts({ includeInactiveSellers: true }));
        };

        loadData();
        const syncTimer = setInterval(() => {
            DataSyncService.syncNegotiations();
        }, 5000); // 5 sec heartbeat for real-time buyer sync

        window.addEventListener("storage", loadData);
        window.addEventListener("sync-store-update", loadData);
        return () => {
            clearInterval(syncTimer);
            window.removeEventListener("storage", loadData);
            window.removeEventListener("sync-store-update", loadData);
        };
    }, [user]);

    const handleAction = (id: string, status: "accepted" | "rejected") => {
        DataSyncService.updateNegotiationStatus(id, status, "buyer");

        const userId = user?.id || user?.email || "";
        const all = DataSyncService.getNegotiations(undefined, userId);
        setNegotiations(all);
    };

    const handleAddToCart = (neg: NegotiationRequest, product: Product) => {
        // Agreed price logic:
        // - If the BUYER accepted the seller's counter → counter_price is what was agreed
        // - If the SELLER accepted the buyer's offer  → proposed_price is what was agreed
        // Never use counter_price when status="accepted" (seller accepted buyer's offer, counter was just a prior round)
        const finalPrice = neg.counter_status === "accepted"
            ? (neg.counter_price || neg.proposed_price)
            : neg.proposed_price;

        addToCart(product, 1, finalPrice);
        setAddedIds(prev => new Set(prev).add(neg.id));

        // Auto-redirect to checkout after a moment
        setTimeout(() => {
            router.push("/checkout");
        }, 800);
    };

    const filteredNegs = filter === "all" ? negotiations : negotiations.filter(n => {
        const s = (n.status || "").toLowerCase();
        const cs = (n.counter_status || "").toLowerCase();
        
        if (filter === "accepted") return s === "accepted" || cs === "accepted";
        if (filter === "rejected") return s === "rejected" || cs === "rejected" || s === "declined" || cs === "declined";
        if (filter === "pending") return s === "pending" || (s === "countered" && cs === "pending");
        if (filter === "purchased") return s === "purchased" || n.purchased === true;
        return s === filter;
    });
    const userTier = DataSyncService.getUserTier(user?.id || user?.email || "");

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900">
            <Navbar />
            <div className="container mx-auto px-4 py-8 max-w-5xl mt-20">
                <div className="mb-8 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.push('/')}
                            className="h-10 w-10 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center hover:bg-gray-50 transition-colors shrink-0"
                        >
                            <ChevronLeft className="h-5 w-5 text-gray-600" />
                        </button>
                        <div>
                            <h1 className="text-3xl font-black text-gray-900 tracking-tight">
                                Your Negotiations
                            </h1>
                            <p className="text-gray-500 mt-2">
                                Track your offers and responses from sellers.
                            </p>
                        </div>
                    </div>
                    {/* Gamification Badge */}
                    <div className={`hidden md:flex flex-col items-end px-4 py-2 rounded-2xl border ${userTier.color}`}>
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Your Negotiator Status</span>
                        <div className="flex items-center gap-2 mt-0.5">
                            <TrendingUp className="h-4 w-4" />
                            <span className="font-bold">{userTier.name}</span>
                        </div>
                    </div>
                </div>


                {/* Filter chips */}
                <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                    {(["all", "pending", "accepted", "rejected", "purchased"] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${filter === f
                                ? "bg-gray-200 text-gray-900"
                                : "bg-white shadow-sm text-gray-500 hover:bg-gray-100"
                                }`}
                        >
                            {f.charAt(0).toUpperCase() + f.slice(1)}
                        </button>
                    ))}
                </div>

                {/* Negotiations Table */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    {filteredNegs.length === 0 ? (
                        <div className="text-center py-20">
                            <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                            <h3 className="font-bold text-lg text-gray-900">No negotiations found</h3>
                            <p className="text-gray-500">You haven&apos;t made any offers yet.</p>
                            <Link href="/">
                                <Button className="mt-4 rounded-full font-bold bg-brand-green-600 hover:bg-brand-green-700 text-white">Start Shopping</Button>
                            </Link>
                        </div>
                    ) : (
                        <>
                            {/* Desktop Table Header */}
                            <div className="hidden md:grid grid-cols-[48px_minmax(0,1.5fr)_100px_100px_120px_90px_130px] gap-3 px-5 py-3 bg-gray-50 border-b border-gray-200 text-[11px] font-bold text-gray-500 uppercase tracking-wider sticky top-0 z-10">
                                <span></span>
                                <span>Product</span>
                                <span>List Price</span>
                                <span>Your Offer</span>
                                <span>Counter</span>
                                <span>Status</span>
                                <span className="text-right">Action</span>
                            </div>

                            {/* Scrollable list */}
                            <div className="max-h-[60vh] overflow-y-auto divide-y divide-gray-100">
                                {filteredNegs.map((neg) => {
                                    const product = products.find(p => p.id === neg.product_id);
                                    // Senior Tech Lead: Don't just return null, show a stub so user knows what's happening
                                    const productName = product?.name || "Product Info Unavailable";
                                    const sellerName = product?.seller_name || "Unknown Seller";
                                    const productImage = product?.image_url || "/assets/images/placeholder.png";
                                    const listPrice = product?.price || 0;

                                    // isCounterOffer: there's a pending counter AND the deal hasn't been accepted yet
                                    const isCounterOffer = neg.counter_status === "pending" && neg.status !== "accepted";
                                    const justAdded = addedIds.has(neg.id);

                                    const statusBadge = neg.status === "purchased" || neg.purchased
                                        ? <Badge className="bg-indigo-500/15 text-indigo-600 border-none text-[10px]">Purchased</Badge>
                                        : (neg.status === "accepted" || neg.counter_status === "accepted")
                                            ? <Badge className="bg-brand-green-500/15 text-brand-green-600 border-none text-[10px]">Accepted Deal</Badge>
                                            : isCounterOffer && neg.status === "countered"
                                                ? <Badge className="bg-blue-500/15 text-blue-600 border-none text-[10px] animate-pulse">Counter Offer</Badge>
                                                : neg.status === "pending"
                                                    ? <Badge className="bg-amber-500/15 text-amber-600 border-none text-[10px]">Pending</Badge>
                                                    : <Badge className="bg-red-500/15 text-red-600 border-none text-[10px]">Rejected</Badge>;

                                    return (
                                        <div key={neg.id}>
                                            {/* Desktop Row */}
                                            <div 
                                                onClick={() => openMessageBox(`neg_${neg.product_id}`)}
                                                className="hidden md:grid grid-cols-[48px_minmax(0,1.5fr)_100px_100px_120px_90px_130px] gap-3 px-5 py-3 items-center hover:bg-indigo-50/30 transition-colors cursor-pointer group/row"
                                            >
                                                <Link href={getProductUrl(product)} onClick={(e) => e.stopPropagation()} className="h-10 w-10 bg-gray-50 rounded-lg border border-gray-200 p-1 shrink-0 block hover:border-brand-green-400 transition-colors">
                                                    <img src={productImage} alt={productName} className="h-full w-full object-contain" />
                                                </Link>
                                                <div className="min-w-0">
                                                    <Link href={getProductUrl(product)} onClick={(e) => e.stopPropagation()} className="text-sm font-semibold text-gray-900 hover:text-brand-green-600 transition-colors line-clamp-1 block">
                                                        {productName}
                                                    </Link>
                                                    <span className="text-[10px] text-gray-400">{sellerName}</span>
                                                </div>
                                                <span className="text-xs text-gray-400 line-through">{formatPrice(listPrice)}</span>
                                                <span className={cn("text-sm font-bold", neg.counter_price ? "text-gray-400 font-medium line-through" : "text-gray-900")}>
                                                    {formatPrice(neg.proposed_price)}
                                                </span>
                                                <div>
                                                    {neg.counter_price ? (
                                                        <span className="text-sm font-black text-blue-600">{formatPrice(neg.counter_price)}</span>
                                                    ) : (
                                                        <span className="text-xs text-gray-300">—</span>
                                                    )}
                                                </div>
                                                {statusBadge}
                                                <div className="flex justify-end gap-1">
                                                    <Button 
                                                        size="sm" 
                                                        variant="ghost" 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            // Use negotiation id for unique conversation — same product can have multiple negotiations
                                                            openMessageBox(`neg_${neg.id}`);
                                                        }}
                                                        className="text-[10px] font-bold rounded-lg h-7 px-2 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                                                    >
                                                        Chat
                                                    </Button>
                                                    {isCounterOffer && (
                                                        <>
                                                            <Button size="sm" onClick={(e) => { e.stopPropagation(); handleAction(neg.id, "accepted"); }} className="text-[10px] font-bold bg-brand-green-600 hover:bg-brand-green-700 text-white rounded-lg h-7 px-2">Accept</Button>
                                                            <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleAction(neg.id, "rejected"); }} className="text-[10px] font-bold rounded-lg h-7 px-2 border-red-200 text-red-600 hover:bg-red-50 bg-transparent">Reject</Button>
                                                        </>
                                                    )}
                                                    {(neg.status === "accepted" || neg.counter_status === "accepted") && neg.status !== "purchased" && !neg.purchased && (
                                                        <Button size="sm" onClick={(e) => { e.stopPropagation(); product && handleAddToCart(neg, product); }} disabled={justAdded || !product} className={`text-[10px] font-bold rounded-lg h-7 px-3 ${justAdded ? "bg-brand-green-600 text-white" : "bg-brand-orange hover:bg-amber-500 text-black"}`}>
                                                            {justAdded ? "✓ Added" : <>Buy Deal <ArrowRight className="h-3 w-3 ml-1" /></>}
                                                        </Button>
                                                    )}
                                                    {neg.status === "rejected" && (
                                                        <Link href={getProductUrl(product)} onClick={(e) => e.stopPropagation()}>
                                                            <Button size="sm" variant="outline" className="text-[10px] font-bold rounded-lg h-7 px-2 border-gray-300 text-gray-600 hover:bg-gray-100 bg-transparent">View</Button>
                                                        </Link>
                                                    )}
                                                    {neg.status === "pending" && !isCounterOffer && (
                                                        <span className="text-[10px] text-gray-400 italic">Awaiting seller</span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Mobile Card */}
                                            <div 
                                                onClick={() => openMessageBox(`neg_${neg.id}`)}
                                                className="md:hidden p-4 space-y-3 cursor-pointer active:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <Link href={getProductUrl(product)} onClick={(e) => e.stopPropagation()} className="h-12 w-12 bg-gray-50 rounded-xl border border-gray-200 p-1.5 shrink-0 block hover:border-brand-green-400 transition-colors">
                                                        <img src={productImage} alt={productName} className="h-full w-full object-contain" />
                                                    </Link>
                                                    <div className="flex-1 min-w-0">
                                                        <Link href={getProductUrl(product)} onClick={(e) => e.stopPropagation()} className="text-sm font-semibold text-gray-900 line-clamp-1 hover:text-brand-green-600 transition-colors">
                                                            {productName}
                                                        </Link>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            {statusBadge}
                                                            <span className="text-[10px] text-gray-400">{sellerName}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4 text-xs bg-gray-50 rounded-xl px-3 py-2">
                                                    <div>
                                                        <div className="text-[9px] text-gray-400 uppercase font-bold">Listed</div>
                                                        <div className="line-through text-gray-400">{formatPrice(listPrice)}</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-[9px] text-gray-400 uppercase font-bold">Offer</div>
                                                        <div className={cn("text-gray-900", neg.counter_price ? "text-gray-400 line-through scale-90" : "font-bold")}>{formatPrice(neg.proposed_price)}</div>
                                                    </div>
                                                    {neg.counter_price && (
                                                        <div className="border-l border-gray-200 pl-4">
                                                            <div className="text-[9px] text-blue-500 uppercase font-bold">Counter</div>
                                                            <div className="font-black text-blue-600">{formatPrice(neg.counter_price)}</div>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex gap-2">
                                                    {isCounterOffer && (
                                                        <>
                                                            <Button size="sm" onClick={() => handleAction(neg.id, "accepted")} className="flex-1 text-xs rounded-lg font-bold bg-brand-green-600 hover:bg-brand-green-700 text-white">
                                                                <CheckCircle className="h-3 w-3 mr-1" /> Accept
                                                            </Button>
                                                            <Button size="sm" variant="outline" onClick={() => handleAction(neg.id, "rejected")} className="flex-1 text-xs rounded-lg font-bold border-red-200 text-red-600 hover:bg-red-50 bg-transparent">
                                                                Reject
                                                            </Button>
                                                        </>
                                                    )}
                                                    {neg.status === "accepted" && (
                                                        <Button size="sm" onClick={() => product && handleAddToCart(neg, product)} disabled={justAdded || !product} className={`flex-1 text-xs rounded-lg font-bold ${justAdded ? "bg-brand-green-600 text-white" : "bg-brand-orange hover:bg-amber-500 text-black"}`}>
                                                            {justAdded ? <>✓ Added — Checkout</> : <>Buy at {formatPrice(neg.counter_status === 'accepted' ? (neg.counter_price || neg.proposed_price) : neg.proposed_price)} <ArrowRight className="h-3 w-3 ml-1" /></>}
                                                        </Button>
                                                    )}
                                                    {neg.status === "rejected" && (
                                                        <Link href={getProductUrl(product)} className="flex-1">
                                                            <Button size="sm" variant="outline" className="w-full text-xs rounded-lg font-bold border-gray-300 text-gray-600 hover:bg-gray-100 bg-transparent">View Product</Button>
                                                        </Link>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Count footer */}
                            <div className="px-5 py-2.5 bg-gray-50 border-t border-gray-200 text-[11px] text-gray-400 font-semibold">
                                Showing {filteredNegs.length} negotiation{filteredNegs.length !== 1 ? "s" : ""}
                            </div>
                        </>
                    )}
                </div>

                {/* Customers Also Bought Section */}
                <div className="mt-10">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <ShoppingCart className="h-5 w-5 text-blue-600" />
                            <h2 className="text-lg font-bold text-gray-900">Customers Also Bought</h2>
                        </div>
                        <Link href="/search">
                            <Button variant="ghost" size="sm" className="text-xs font-bold text-brand-green-600 hover:text-brand-green-700">
                                View More <ArrowRight className="h-3 w-3 ml-1" />
                            </Button>
                        </Link>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                        {(() => {
                            const allProds = DataSyncService.getProducts();
                            // Use negotiated product categories to find related items
                            const negCategories = new Set(
                                negotiations.map(n => products.find(p => p.id === n.product_id)?.category).filter(Boolean)
                            );
                            const negProductIds = new Set(negotiations.map(n => n.product_id));
                            // Prioritize same-category products, then fill with popular items
                            const related = allProds
                                .filter(p => !negProductIds.has(p.id))
                                .sort((a, b) => {
                                    const aMatch = negCategories.has(a.category) ? 1 : 0;
                                    const bMatch = negCategories.has(b.category) ? 1 : 0;
                                    if (aMatch !== bMatch) return bMatch - aMatch;
                                    return b.sold_count - a.sold_count;
                                });
                            return related.slice(0, 5).map(p => (
                                <ProductCard key={p.id} product={p} />
                            ));
                        })()}
                    </div>
                </div>

                {/* You May Also Like Section */}
                <div className="mt-10">
                    <YouMayAlsoLike
                        cartCategories={negotiations.map(n => products.find(p => p.id === n.product_id)?.category || "").filter(Boolean)}
                        cartIds={new Set(negotiations.map(n => n.product_id))}
                    />
                </div>
            </div>
        </div>
    );
}
