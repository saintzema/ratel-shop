"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DEMO_SELLER_STATS } from "@/lib/data";
import { NegotiationRequest, Order, Product, Seller } from "@/lib/types";
import { DemoStore } from "@/lib/demo-store";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
    MessageSquare,
    TrendingUp,
    AlertTriangle,
    CheckCircle,
    XCircle,
    Wallet,
    ShieldCheck,
    Lock,
    ArrowUpRight,
    ChevronRight,
    DollarSign,
    ShoppingBag,
    Package,
    Star
} from "lucide-react";

export default function SellerDashboard() {
    const router = useRouter();
    const [negotiations, setNegotiations] = useState<NegotiationRequest[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [currentSeller, setCurrentSeller] = useState<Seller | undefined>(undefined);
    const [cashoutSuccess, setCashoutSuccess] = useState(false);

    useEffect(() => {
        const sellerId = DemoStore.getCurrentSellerId();
        if (!sellerId) { router.push("/seller/login"); return; }

        const seller = DemoStore.getCurrentSeller();
        setCurrentSeller(seller);

        const loadData = () => {
            const allNegs = DemoStore.getNegotiations(sellerId);
            setNegotiations(allNegs);

            const allOrders = DemoStore.getOrders();
            setOrders(allOrders.filter(o => o.seller_id === sellerId));

            const allProducts = DemoStore.getProducts();
            setProducts(allProducts.filter(p => p.seller_id === sellerId));
        };

        loadData();
        window.addEventListener("storage", loadData);
        return () => window.removeEventListener("storage", loadData);
    }, [router]);

    const handleNegAction = (id: string, status: "accepted" | "rejected") => {
        DemoStore.updateNegotiationStatus(id, status);
        const sellerId = DemoStore.getCurrentSellerId();
        if (sellerId) {
            setNegotiations(DemoStore.getNegotiations(sellerId));
        }
    };

    const handleCashout = () => {
        setCashoutSuccess(true);
        setTimeout(() => setCashoutSuccess(false), 3000);
    };

    if (!currentSeller) return null;

    // Computed financials
    const escrowAmount = orders.filter(o => o.escrow_status === "held").reduce((sum, o) => sum + o.amount, 0);
    const releasedAmount = orders.filter(o => o.escrow_status === "released").reduce((sum, o) => sum + o.amount, 0);
    const availableBalance = releasedAmount; // For demo, let's treat released as available
    const pendingNegs = negotiations.filter(n => n.status === "pending");

    return (
        <div className="space-y-6 max-w-6xl">
            {/* Welcome header */}
            <div>
                <h1 className="text-2xl font-black text-white tracking-tight">
                    Welcome back, {currentSeller.business_name} 👋
                </h1>
                <p className="text-sm text-white/60 mt-1">
                    Here's what's happening with your store today.
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={<DollarSign />} label="Total Revenue" value={formatPrice(DEMO_SELLER_STATS.total_revenue)} trend="+12%" color="emerald" />
                <StatCard icon={<ShoppingBag />} label="Pending Orders" value={DEMO_SELLER_STATS.new_orders.toString()} color="amber" />
                <StatCard icon={<Package />} label="Active Listings" value={products.length.toString()} color="blue" />
                <StatCard icon={<Star />} label="Trust Score" value={`${DEMO_SELLER_STATS.trust_score}%`} color="purple" />
            </div>

            {/* Revenue & Escrow Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Available Balance */}
                <div className="bg-white/5 backdrop-blur-[12px] rounded-2xl border border-white/10 p-6 shadow-lg">
                    <div className="flex items-center gap-2 mb-1">
                        <Wallet className="h-4 w-4 text-ratel-green-400" />
                        <span className="text-xs font-bold text-white/40 uppercase tracking-wider">Available Balance</span>
                    </div>
                    <h3 className="text-3xl font-black text-white mt-2">
                        {formatPrice(availableBalance)}
                    </h3>
                    <p className="text-[11px] text-white/40 mt-1 mb-4">Ready for withdrawal</p>
                    {cashoutSuccess ? (
                        <div className="flex items-center gap-2 text-sm font-bold text-ratel-green-400 bg-ratel-green-500/10 px-4 py-2.5 rounded-xl">
                            <CheckCircle className="h-4 w-4" />
                            Cashout request submitted!
                        </div>
                    ) : (
                        <Button
                            onClick={handleCashout}
                            className="w-full bg-ratel-green-600 hover:bg-ratel-green-700 text-white font-bold rounded-xl h-10 shadow-md shadow-ratel-green-600/20"
                        >
                            <ArrowUpRight className="h-4 w-4 mr-2" />
                            Request Cashout
                        </Button>
                    )}
                </div>

                {/* In Escrow */}
                <div className="bg-white/5 backdrop-blur-[12px] rounded-2xl border border-white/10 p-6 shadow-lg">
                    <div className="flex items-center gap-2 mb-1">
                        <Lock className="h-4 w-4 text-amber-400" />
                        <span className="text-xs font-bold text-white/40 uppercase tracking-wider">In Escrow</span>
                    </div>
                    <h3 className="text-3xl font-black text-amber-400 mt-2">
                        {formatPrice(escrowAmount)}
                    </h3>
                    <p className="text-[11px] text-white/40 mt-1 mb-4">Held until delivery confirmed</p>
                    <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-500"
                            style={{ width: `${escrowAmount > 0 ? Math.min((escrowAmount / DEMO_SELLER_STATS.total_revenue) * 100, 100) : 0}%` }}
                        />
                    </div>
                    <p className="text-[10px] text-white/40 mt-2">{orders.filter(o => o.escrow_status === "held").length} orders in escrow</p>
                </div>

                {/* Released */}
                <div className="bg-white/5 backdrop-blur-[12px] rounded-2xl border border-white/10 p-6 shadow-lg">
                    <div className="flex items-center gap-2 mb-1">
                        <ShieldCheck className="h-4 w-4 text-ratel-green-400" />
                        <span className="text-xs font-bold text-white/40 uppercase tracking-wider">Total Released</span>
                    </div>
                    <h3 className="text-3xl font-black text-ratel-green-400 mt-2">
                        {formatPrice(releasedAmount)}
                    </h3>
                    <p className="text-[11px] text-white/40 mt-1 mb-4">Successfully settled</p>
                    <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-ratel-green-400 to-ratel-green-500 rounded-full transition-all duration-500"
                            style={{ width: `${releasedAmount > 0 ? Math.min((releasedAmount / DEMO_SELLER_STATS.total_revenue) * 100, 100) : 0}%` }}
                        />
                    </div>
                    <p className="text-[10px] text-white/40 mt-2">{orders.filter(o => o.escrow_status === "released").length} orders released</p>
                </div>
            </div>

            {/* Recent Negotiations (max 3) */}
            <div className="bg-white/5 backdrop-blur-[12px] rounded-2xl border border-white/10 shadow-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center">
                    <h3 className="font-bold text-sm flex items-center gap-2 text-white">
                        <MessageSquare className="h-4 w-4 text-blue-400" />
                        Recent Negotiations
                    </h3>
                    <Link href="/seller/dashboard/negotiations" className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-0.5 transition-colors">
                        View All ({negotiations.length}) <ChevronRight className="h-3 w-3" />
                    </Link>
                </div>

                <div className="divide-y divide-white/5">
                    {pendingNegs.length === 0 ? (
                        <div className="p-8 text-center text-white/40 text-sm">No pending negotiations 🎉</div>
                    ) : (
                        pendingNegs.slice(0, 3).map((neg) => {
                            const product = products.find(p => p.id === neg.product_id) || DemoStore.getProducts().find(p => p.id === neg.product_id);
                            if (!product) return null;

                            return (
                                <div key={neg.id} className="p-5 hover:bg-white/5 transition-colors">
                                    <div className="flex justify-between items-start gap-4">
                                        <div className="flex gap-3 flex-1 min-w-0">
                                            <div className="h-12 w-12 bg-white/10 rounded-xl border border-white/10 shrink-0 overflow-hidden flex items-center justify-center p-1">
                                                <img src={product.image_url} className="w-full h-full object-contain" alt="" />
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="font-bold text-sm text-white truncate">{product.name}</h4>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <span className="text-xs text-white/40 line-through">{formatPrice(product.price)}</span>
                                                    <span className="text-sm font-black text-blue-400">{formatPrice(neg.proposed_price)}</span>
                                                    <Badge variant="outline" className="text-[10px] border-amber-500/30 bg-amber-500/10 text-amber-400 py-0">
                                                        -{Math.round((1 - neg.proposed_price / product.price) * 100)}%
                                                    </Badge>
                                                </div>
                                                {neg.message && (
                                                    <p className="text-xs text-white/50 mt-1.5 line-clamp-1">"{neg.message}"</p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex gap-2 shrink-0">
                                            <Button
                                                size="sm"
                                                onClick={() => handleNegAction(neg.id, "accepted")}
                                                className="bg-ratel-green-600 hover:bg-ratel-green-700 text-white rounded-lg h-8 px-3 text-xs font-bold shadow-sm"
                                            >
                                                <CheckCircle className="h-3 w-3 mr-1" /> Accept
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleNegAction(neg.id, "rejected")}
                                                className="border-red-500/50 text-red-400 hover:bg-red-500/20 hover:text-white rounded-lg h-8 px-3 text-xs font-bold bg-transparent transition-colors"
                                            >
                                                <XCircle className="h-3 w-3 mr-1" /> Reject
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Price Alerts — Dynamic per seller */}
            {(() => {
                const overpricedItems = products.filter(p => p.price_flag === "overpriced");
                const opportunityItems = products.filter(p => p.price_flag === "fair" && p.sold_count < 10 && p.recommended_price && p.price > p.recommended_price);
                const hasAlerts = overpricedItems.length > 0 || opportunityItems.length > 0;

                return (
                    <div className="bg-white/5 backdrop-blur-[12px] rounded-2xl border border-white/10 shadow-lg p-6">
                        <h2 className="font-bold text-sm mb-4 flex items-center gap-2 text-white">
                            <AlertTriangle className="h-4 w-4 text-ratel-orange" />
                            AI Price Alerts
                        </h2>

                        {!hasAlerts ? (
                            <div className="flex items-center gap-3 p-4 bg-ratel-green-500/10 border border-ratel-green-500/20 rounded-xl">
                                <CheckCircle className="h-5 w-5 text-ratel-green-400 shrink-0" />
                                <div>
                                    <h4 className="font-bold text-ratel-green-400 text-sm">All prices look competitive! ✅</h4>
                                    <p className="text-xs text-ratel-green-400/70 mt-0.5">Your product pricing is within market range. Keep it up!</p>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {overpricedItems.slice(0, 1).map(item => {
                                    const pctAbove = item.recommended_price
                                        ? Math.round(((item.price - item.recommended_price) / item.recommended_price) * 100)
                                        : 25;
                                    return (
                                        <div key={item.id} className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                                            <h4 className="font-bold text-red-400 text-sm mb-1">⚠️ Overpriced Item Detected</h4>
                                            <p className="text-xs text-red-400/80 mb-3">
                                                Your &ldquo;{item.name.split("—")[0].trim()}&rdquo; is priced {pctAbove}% higher than market average ({formatPrice(item.recommended_price || 0)}).
                                            </p>
                                            <Link href={`/seller/products?edit=${item.id}`}>
                                                <Button size="sm" className="bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white border border-red-500/30 h-8 text-xs font-bold rounded-lg transition-colors">
                                                    Adjust Price →
                                                </Button>
                                            </Link>
                                        </div>
                                    );
                                })}

                                {opportunityItems.slice(0, 1).map(item => (
                                    <div key={item.id} className="p-4 bg-ratel-green-500/10 border border-ratel-green-500/20 rounded-xl">
                                        <h4 className="font-bold text-ratel-green-400 text-sm mb-1">💡 Price Opportunity</h4>
                                        <p className="text-xs text-ratel-green-400/80 mb-3">
                                            Your &ldquo;{item.name.split("—")[0].trim()}&rdquo; has only {item.sold_count} sales. A 5% discount could boost visibility and conversions.
                                        </p>
                                        <Button
                                            size="sm"
                                            className="bg-ratel-green-500/20 text-ratel-green-400 hover:bg-ratel-green-600 hover:text-white border border-ratel-green-500/30 h-8 text-xs font-bold rounded-lg transition-colors"
                                            onClick={() => {
                                                DemoStore.updateProduct(item.id, { price: Math.round(item.price * 0.95) });
                                                // Reload products
                                                const sellerId = DemoStore.getCurrentSellerId();
                                                if (sellerId) {
                                                    setProducts(DemoStore.getProducts().filter(p => p.seller_id === sellerId));
                                                }
                                            }}
                                        >
                                            Apply 5% Discount →
                                        </Button>
                                    </div>
                                ))}

                                {overpricedItems.length === 0 && opportunityItems.length > 0 && (
                                    <div className="flex items-center gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                                        <TrendingUp className="h-5 w-5 text-blue-400 shrink-0" />
                                        <div>
                                            <h4 className="font-bold text-blue-400 text-sm">No Overpriced Items</h4>
                                            <p className="text-xs text-blue-400/70 mt-0.5">All your product prices are within market range.</p>
                                        </div>
                                    </div>
                                )}

                                {opportunityItems.length === 0 && overpricedItems.length > 0 && (
                                    <div className="flex items-center gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                                        <TrendingUp className="h-5 w-5 text-blue-400 shrink-0" />
                                        <div>
                                            <h4 className="font-bold text-blue-400 text-sm">Sales Looking Strong 📈</h4>
                                            <p className="text-xs text-blue-400/70 mt-0.5">Your products are selling well. No discount opportunities detected.</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );
            })()}
        </div>
    );
}

// ─── StatCard ───
function StatCard({ icon, label, value, trend, color = "blue" }: { icon: React.ReactNode; label: string; value: string; trend?: string; color?: string }) {
    const colors: Record<string, string> = {
        emerald: "bg-ratel-green-500/20 text-ratel-green-400",
        amber: "bg-amber-500/20 text-amber-400",
        blue: "bg-blue-500/20 text-blue-400",
        purple: "bg-purple-500/20 text-purple-400",
    };

    return (
        <div className="bg-white/5 backdrop-blur-[12px] p-5 rounded-2xl border border-white/10 shadow-lg">
            <div className="flex items-center justify-between mb-3">
                <div className={`p-2 rounded-xl ${colors[color] || colors.blue}`}>
                    <div className="h-4 w-4">{icon}</div>
                </div>
                {trend && <span className="text-[11px] font-bold text-ratel-green-400 bg-ratel-green-500/20 px-2 py-0.5 rounded-full">{trend}</span>}
            </div>
            <h3 className="text-xl font-black text-white">{value}</h3>
            <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mt-1">{label}</p>
        </div>
    );
}
