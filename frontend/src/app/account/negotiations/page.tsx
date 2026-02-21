"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { NegotiationRequest, Product } from "@/lib/types";
import { DemoStore } from "@/lib/demo-store";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/context/CartContext";
import { Navbar } from "@/components/layout/Navbar";
import {
    CheckCircle,
    XCircle,
    MessageSquare,
    Clock,
    ShoppingCart,
    AlertTriangle,
    ArrowRight,
    Check
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function NegotiationsPage() {
    const [negotiations, setNegotiations] = useState<NegotiationRequest[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [filter, setFilter] = useState<"all" | "pending" | "accepted" | "rejected">("all");
    const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
    const { addToCart } = useCart();
    const { user } = useAuth();
    const router = useRouter();

    useEffect(() => {
        const userId = user?.id || "u1";

        const loadData = () => {
            const all = DemoStore.getNegotiations();
            // Show negotiations belonging to the logged-in user AND legacy demo data ("u1")
            const myNegotiations = all.filter(n => n.customer_id === userId || n.customer_id === "u1");
            setNegotiations(myNegotiations);
            setProducts(DemoStore.getProducts());
        };

        loadData();
        window.addEventListener("storage", loadData);
        return () => window.removeEventListener("storage", loadData);
    }, [user]);

    const handleAction = (id: string, status: "accepted" | "rejected") => {
        DemoStore.updateNegotiationStatus(id, status);

        const userId = user?.id || "u1";
        const all = DemoStore.getNegotiations();
        const myNegotiations = all.filter(n => n.customer_id === userId);
        setNegotiations(myNegotiations);
    };

    const handleAddToCart = (neg: NegotiationRequest, product: Product) => {
        const finalPrice = neg.counter_status === "accepted" ? (neg.counter_price || neg.proposed_price) : neg.proposed_price;

        const discountedProduct = {
            ...product,
            price: finalPrice,
            name: `${product.name} (Negotiated Price)`
        };

        addToCart(discountedProduct);
        setAddedIds(prev => new Set(prev).add(neg.id));

        // Auto-redirect to checkout after a moment
        setTimeout(() => {
            router.push("/checkout");
        }, 800);
    };

    const filteredNegs = filter === "all" ? negotiations : negotiations.filter(n => n.status === filter);

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900">
            <Navbar />
            <div className="container mx-auto px-4 py-8 max-w-5xl">
                <div className="mb-8">
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">
                        Your Negotiations
                    </h1>
                    <p className="text-gray-500 mt-2">
                        Track your offers and responses from sellers.
                    </p>
                </div>

                {/* Filter chips */}
                <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                    {(["all", "pending", "accepted", "rejected"] as const).map((f) => (
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

                {/* Negotiations List */}
                <div className="space-y-4">
                    {filteredNegs.length === 0 ? (
                        <div className="text-center py-20 bg-white shadow-sm rounded-3xl border border-dashed border-gray-200">
                            <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                            <h3 className="font-bold text-lg text-gray-900">No negotiations found</h3>
                            <p className="text-gray-500">You haven&apos;t made any offers yet.</p>
                            <Link href="/">
                                <Button className="mt-4 rounded-full font-bold bg-ratel-green-600 hover:bg-ratel-green-700 text-white">Start Shopping</Button>
                            </Link>
                        </div>
                    ) : (
                        filteredNegs.map((neg) => {
                            const product = products.find(p => p.id === neg.product_id);
                            if (!product) return null;

                            const isCounterOffer = neg.counter_status === "pending";
                            const justAdded = addedIds.has(neg.id);

                            return (
                                <div key={neg.id} className="bg-white shadow-sm backdrop-blur-[12px] border border-gray-200 rounded-2xl p-4 sm:p-6 shadow-lg hover:bg-gray-100 transition-colors">
                                    <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                                        {/* Product Image */}
                                        <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gray-100 rounded-xl flex items-center justify-center p-2 shrink-0 mx-auto sm:mx-0">
                                            <img src={product.image_url} alt={product.name} className="max-w-full max-h-full object-contain" />
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-4 mb-4">
                                                <div className="min-w-0">
                                                    <Link href={`/product/${product.id}`} className="font-bold text-base sm:text-lg hover:text-ratel-green-400 text-gray-900 line-clamp-2 transition-colors">
                                                        {product.name}
                                                    </Link>
                                                    <p className="text-xs sm:text-sm text-gray-500">Sold by {product.seller_name}</p>
                                                </div>

                                                <div className="flex items-center gap-2 shrink-0">
                                                    {neg.status === "pending" && !isCounterOffer && (
                                                        <Badge className="bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border-none text-[10px] sm:text-xs">Pending</Badge>
                                                    )}
                                                    {isCounterOffer && neg.status === "pending" && (
                                                        <Badge className="bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border-none animate-pulse text-[10px] sm:text-xs">Counter Offer</Badge>
                                                    )}
                                                    {neg.status === "accepted" && (
                                                        <Badge className="bg-ratel-green-500/20 text-ratel-green-400 hover:bg-ratel-green-500/30 border-none text-[10px] sm:text-xs">Accepted</Badge>
                                                    )}
                                                    {neg.status === "rejected" && (
                                                        <Badge className="bg-red-500/20 text-red-400 hover:bg-red-500/30 border-none text-[10px] sm:text-xs">Rejected</Badge>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Price Details */}
                                            <div className="flex flex-wrap items-center gap-4 sm:gap-6 p-3 sm:p-4 bg-white shadow-sm rounded-xl border border-gray-200">
                                                <div>
                                                    <div className="text-[10px] sm:text-xs text-gray-500 uppercase font-bold">List Price</div>
                                                    <div className="text-xs sm:text-sm line-through text-gray-400">{formatPrice(product.price)}</div>
                                                </div>
                                                <div>
                                                    <div className="text-[10px] sm:text-xs text-gray-500 uppercase font-bold">Your Offer</div>
                                                    <div className="font-bold text-sm sm:text-base text-gray-900">{formatPrice(neg.proposed_price)}</div>
                                                </div>
                                                {(neg.counter_price || isCounterOffer) && (
                                                    <div className="flex-1 border-l pl-4 sm:pl-6 border-gray-200">
                                                        <div className="text-[10px] sm:text-xs text-blue-400 uppercase font-bold mb-1">Counter Offer</div>
                                                        <div className="flex items-baseline gap-2 flex-wrap">
                                                            <span className="text-lg sm:text-xl font-black text-blue-400">
                                                                {formatPrice(neg.counter_price || 0)}
                                                            </span>
                                                            {neg.counter_message && (
                                                                <span className="text-xs sm:text-sm text-gray-900/70 italic">&quot;{neg.counter_message}&quot;</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Actions */}
                                            <div className="mt-4 sm:mt-6 flex flex-wrap gap-2 sm:gap-3">
                                                {isCounterOffer && (
                                                    <>
                                                        <Button
                                                            onClick={() => handleAction(neg.id, "accepted")}
                                                            className="bg-ratel-green-600 hover:bg-ratel-green-700 text-white font-bold rounded-full text-xs sm:text-sm h-9 sm:h-10"
                                                        >
                                                            <CheckCircle className="w-4 h-4 mr-1.5" />
                                                            Accept
                                                        </Button>
                                                        <Button
                                                            onClick={() => handleAction(neg.id, "rejected")}
                                                            variant="outline"
                                                            className="border-red-500/50 text-red-400 hover:bg-red-500/20 hover:text-gray-900 rounded-full font-bold text-xs sm:text-sm h-9 sm:h-10 bg-transparent transition-colors"
                                                        >
                                                            Reject
                                                        </Button>
                                                    </>
                                                )}

                                                {neg.status === "accepted" && (
                                                    <Button
                                                        onClick={() => handleAddToCart(neg, product)}
                                                        disabled={justAdded}
                                                        className={`rounded-full font-bold text-xs sm:text-sm h-9 sm:h-10 shadow-lg transition-all ${justAdded
                                                            ? "bg-ratel-green-600 text-white shadow-ratel-green-500/20"
                                                            : "bg-ratel-orange hover:bg-amber-500 text-black shadow-orange-500/20"
                                                            }`}
                                                    >
                                                        {justAdded ? (
                                                            <><Check className="w-4 h-4 mr-1.5" /> Added — Going to Checkout</>
                                                        ) : (
                                                            <><ShoppingCart className="w-4 h-4 mr-1.5" /> Buy at {formatPrice(neg.counter_status === 'accepted' ? (neg.counter_price || neg.proposed_price) : neg.proposed_price)} <ArrowRight className="w-3 h-3 ml-1" /></>
                                                        )}
                                                    </Button>
                                                )}

                                                {neg.status === "rejected" && (
                                                    <Link href={`/product/${product.id}`}>
                                                        <Button variant="outline" className="rounded-full text-xs sm:text-sm h-9 sm:h-10 border-gray-300 text-gray-900 hover:bg-gray-100 bg-transparent">View Product</Button>
                                                    </Link>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
