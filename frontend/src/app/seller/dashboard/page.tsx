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

import { useAuth } from "@/context/AuthContext";

export default function SellerDashboard() {
    const router = useRouter();
    const { user } = useAuth();
    const [negotiations, setNegotiations] = useState<NegotiationRequest[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [currentSeller, setCurrentSeller] = useState<Seller | undefined>(undefined);
    const [cashoutSuccess, setCashoutSuccess] = useState(false);

    useEffect(() => {
        let sellerId = DemoStore.getCurrentSellerId();

        // If no seller session but user is logged in with seller role, auto-create seller record
        if (!sellerId && user && user.role === "seller") {
            const existingSeller = DemoStore.getSellers().find(s =>
                s.owner_email === user.email || s.id === user.id
            );

            if (existingSeller) {
                DemoStore.loginSeller(existingSeller.id);
                sellerId = existingSeller.id;
            } else {
                // Create a new seller record for this user
                const newSellerId = `seller_${Math.random().toString(36).substr(2, 9)}`;
                const newSeller: Seller = {
                    id: newSellerId,
                    business_name: user.name || "My Store",
                    owner_name: user.name || "",
                    owner_email: user.email,
                    description: "New seller on FairPrice",
                    category: "general",
                    location: "Lagos, Nigeria",
                    verified: false,
                    kyc_status: "pending",
                    trust_score: 50,
                    joined_at: new Date().toISOString(),
                };
                DemoStore.addSeller(newSeller);
                DemoStore.loginSeller(newSellerId);
                sellerId = newSellerId;
                // Redirect to onboarding for brand new sellers
                router.push("/seller/onboarding");
                return;
            }
        }

        if (!sellerId) { router.push("/seller/login"); return; }

        const seller = DemoStore.getCurrentSeller();
        setCurrentSeller(seller);

        const loadData = () => {
            const allNegs = DemoStore.getNegotiations(sellerId!);
            setNegotiations(allNegs);

            const allOrders = DemoStore.getOrders();
            setOrders(allOrders.filter(o => o.seller_id === sellerId));

            const allProducts = DemoStore.getProducts();
            setProducts(allProducts.filter(p => p.seller_id === sellerId));
        };

        loadData();
        window.addEventListener("storage", loadData);
        return () => window.removeEventListener("storage", loadData);
    }, [router, user]);

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
    const availableBalance = releasedAmount;
    const pendingNegs = negotiations.filter(n => n.status === "pending");
    const disputedOrders = orders.filter(o => o.escrow_status === "disputed");

    return (
        <div className="space-y-6 max-w-6xl">
            {/* Welcome header */}
            <div>
                <h1 className="text-2xl font-black text-gray-900 tracking-tight">
                    Welcome back, {currentSeller.business_name} 👋
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                    Here's what's happening with your store today.
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={<DollarSign />} label="Total Revenue" value={formatPrice(DEMO_SELLER_STATS.total_revenue)} trend="+12%" color="emerald" />
                <StatCard icon={<ShoppingBag />} label="Pending Orders" value={DEMO_SELLER_STATS.new_orders.toString()} color="amber" href="/seller/orders" />
                <StatCard icon={<Package />} label="Active Listings" value={products.length.toString()} color="blue" href="/seller/products" />
                <StatCard icon={<Star />} label="Trust Score" value={`${DEMO_SELLER_STATS.trust_score}%`} color="purple" />
            </div>

            {/* Dispute Alert */}
            {disputedOrders.length > 0 && (
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
                    <div className="flex-1">
                        <p className="text-sm font-bold text-rose-800">
                            {disputedOrders.length} order{disputedOrders.length !== 1 ? "s" : ""} under dispute
                        </p>
                        <p className="text-xs text-rose-600 mt-0.5">Payment is frozen until the admin resolves each dispute.</p>
                    </div>
                    <Link href="/seller/orders" className="text-xs font-bold text-rose-700 hover:text-rose-800 bg-white px-3 py-1.5 rounded-lg border border-rose-200">
                        View Orders
                    </Link>
                </div>
            )}

            {/* Revenue & Escrow Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Available Balance */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                        <Wallet className="h-4 w-4 text-emerald-600" />
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Available Balance</span>
                    </div>
                    <h3 className="text-3xl font-black text-gray-900 mt-2">
                        {formatPrice(availableBalance)}
                    </h3>
                    <p className="text-[11px] text-gray-500 mt-1 mb-4">Ready for withdrawal</p>
                    {cashoutSuccess ? (
                        <div className="flex items-center gap-2 text-sm font-bold text-emerald-700 bg-emerald-50 px-4 py-2.5 rounded-xl border border-emerald-100">
                            <CheckCircle className="h-4 w-4" />
                            Cashout request submitted!
                        </div>
                    ) : (
                        <Button
                            onClick={handleCashout}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl h-10 shadow-sm"
                        >
                            <ArrowUpRight className="h-4 w-4 mr-2" />
                            Request Cashout
                        </Button>
                    )}
                </div>

                {/* In Escrow */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                        <Lock className="h-4 w-4 text-amber-500" />
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">In Escrow</span>
                    </div>
                    <h3 className="text-3xl font-black text-amber-600 mt-2">
                        {formatPrice(escrowAmount)}
                    </h3>
                    <p className="text-[11px] text-gray-500 mt-1 mb-4">Held until delivery confirmed</p>
                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-500"
                            style={{ width: `${escrowAmount > 0 ? Math.min((escrowAmount / DEMO_SELLER_STATS.total_revenue) * 100, 100) : 0}%` }}
                        />
                    </div>
                    <p className="text-[10px] text-gray-500 mt-2 font-medium">{orders.filter(o => o.escrow_status === "held").length} orders in escrow</p>
                </div>

                {/* Released */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                        <ShieldCheck className="h-4 w-4 text-emerald-500" />
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Released</span>
                    </div>
                    <h3 className="text-3xl font-black text-emerald-600 mt-2">
                        {formatPrice(releasedAmount)}
                    </h3>
                    <p className="text-[11px] text-gray-500 mt-1 mb-4">Successfully settled</p>
                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-500"
                            style={{ width: `${releasedAmount > 0 ? Math.min((releasedAmount / DEMO_SELLER_STATS.total_revenue) * 100, 100) : 0}%` }}
                        />
                    </div>
                    <p className="text-[10px] text-gray-500 mt-2 font-medium">{orders.filter(o => o.escrow_status === "released").length} orders released</p>
                </div>
            </div>

            {/* Recent Negotiations (max 3) */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h3 className="font-bold text-sm flex items-center gap-2 text-gray-900">
                        <MessageSquare className="h-4 w-4 text-blue-500" />
                        Recent Negotiations
                    </h3>
                    <Link href="/seller/dashboard/negotiations" className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-0.5 transition-colors">
                        View All ({negotiations.length}) <ChevronRight className="h-3 w-3" />
                    </Link>
                </div>

                <div className="divide-y divide-gray-100">
                    {pendingNegs.length === 0 ? (
                        <div className="p-8 text-center text-gray-400 text-sm font-medium">No pending negotiations 🎉</div>
                    ) : (
                        pendingNegs.slice(0, 3).map((neg) => {
                            const product = products.find(p => p.id === neg.product_id) || DemoStore.getProducts().find(p => p.id === neg.product_id);
                            if (!product) return null;

                            return (
                                <div key={neg.id} className="p-5 hover:bg-gray-50/50 transition-colors">
                                    <div className="flex justify-between items-start gap-4">
                                        <div className="flex gap-4 flex-1 min-w-0">
                                            <div className="h-14 w-14 bg-white rounded-xl border border-gray-100 shrink-0 overflow-hidden flex items-center justify-center p-1.5 object-contain">
                                                <img src={product.image_url} className="w-full h-full mix-blend-multiply" alt="" />
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="font-bold text-sm text-gray-900 truncate">{product.name}</h4>
                                                <div className="flex items-center gap-3 mt-1.5">
                                                    <span className="text-xs text-gray-400 font-semibold line-through">{formatPrice(product.price)}</span>
                                                    <span className="text-sm font-black text-blue-600">{formatPrice(neg.proposed_price)}</span>
                                                    <Badge variant="outline" className="text-[10px] border-blue-200 bg-blue-50 text-blue-700 py-0 flex h-5 px-1.5 items-center font-bold">
                                                        -{Math.round((1 - neg.proposed_price / product.price) * 100)}%
                                                    </Badge>
                                                </div>
                                                {neg.message && (
                                                    <p className="text-xs text-gray-500 mt-2 line-clamp-1 italic text-balance border-l-2 border-gray-200 pl-2">"{neg.message}"</p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex gap-2 shrink-0">
                                            <Button
                                                size="sm"
                                                onClick={() => handleNegAction(neg.id, "accepted")}
                                                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-9 px-4 text-xs font-bold shadow-sm"
                                            >
                                                <CheckCircle className="h-4 w-4 mr-1.5" /> Accept
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleNegAction(neg.id, "rejected")}
                                                className="border-gray-200 text-gray-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 rounded-xl h-9 px-4 text-xs font-bold bg-white shadow-sm transition-colors"
                                            >
                                                <XCircle className="h-4 w-4 mr-1.5" /> Reject
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
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                        <h2 className="font-bold text-sm mb-4 flex items-center gap-2 text-gray-900">
                            <AlertTriangle className="h-4 w-4 text-ratel-orange" />
                            AI Price Alerts
                        </h2>

                        {!hasAlerts ? (
                            <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-100/60 rounded-xl">
                                <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
                                <div>
                                    <h4 className="font-bold text-emerald-800 text-sm">All prices look competitive! ✅</h4>
                                    <p className="text-xs text-emerald-600/80 mt-0.5">Your product pricing is within market range. Keep it up!</p>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {overpricedItems.slice(0, 1).map(item => {
                                    const pctAbove = item.recommended_price
                                        ? Math.round(((item.price - item.recommended_price) / item.recommended_price) * 100)
                                        : 25;
                                    return (
                                        <div key={item.id} className="p-4 bg-red-50 border border-red-100/60 rounded-xl shadow-sm">
                                            <h4 className="font-bold text-red-700 text-sm mb-1 flex items-center gap-1.5"><AlertTriangle className="h-3.5 w-3.5" /> Overpriced Item Detected</h4>
                                            <p className="text-xs text-red-600/90 mb-3">
                                                Your "{item.name.split("—")[0].trim()}" is priced {pctAbove}% higher than market average ({formatPrice(item.recommended_price || 0)}).
                                            </p>
                                            <Link href={`/seller/products/${item.id}/edit`}>
                                                <Button size="sm" className="bg-white text-red-600 hover:bg-red-600 hover:text-white border border-red-200 h-8 text-xs font-bold rounded-lg transition-colors">
                                                    Adjust Price →
                                                </Button>
                                            </Link>
                                        </div>
                                    );
                                })}

                                {opportunityItems.slice(0, 1).map(item => (
                                    <div key={item.id} className="p-4 bg-blue-50 border border-blue-100/60 rounded-xl shadow-sm">
                                        <h4 className="font-bold text-blue-700 text-sm mb-1 flex items-center gap-1.5"><TrendingUp className="h-3.5 w-3.5" /> Price Opportunity</h4>
                                        <p className="text-xs text-blue-600/90 mb-3">
                                            Your "{item.name.split("—")[0].trim()}" has only {item.sold_count} sales. A 5% discount could boost visibility and conversions.
                                        </p>
                                        <Button
                                            size="sm"
                                            className="bg-white text-blue-600 hover:bg-blue-600 hover:text-white border border-blue-200 h-8 text-xs font-bold rounded-lg transition-colors"
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
                                    <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-100/60 rounded-xl">
                                        <TrendingUp className="h-5 w-5 text-emerald-600 shrink-0" />
                                        <div>
                                            <h4 className="font-bold text-emerald-800 text-sm">No Overpriced Items</h4>
                                            <p className="text-xs text-emerald-600/80 mt-0.5">All your product prices are within market range.</p>
                                        </div>
                                    </div>
                                )}

                                {opportunityItems.length === 0 && overpricedItems.length > 0 && (
                                    <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-100/60 rounded-xl">
                                        <TrendingUp className="h-5 w-5 text-emerald-600 shrink-0" />
                                        <div>
                                            <h4 className="font-bold text-emerald-800 text-sm">Sales Looking Strong 📈</h4>
                                            <p className="text-xs text-emerald-600/80 mt-0.5">Your products are selling well. No discount opportunities detected.</p>
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
function StatCard({ icon, label, value, trend, color = "blue", href }: { icon: React.ReactNode; label: string; value: string; trend?: string; color?: string; href?: string }) {
    const colors: Record<string, string> = {
        emerald: "bg-emerald-50 text-emerald-600 border border-emerald-100",
        amber: "bg-amber-50 text-amber-600 border border-amber-100",
        blue: "bg-blue-50 text-blue-600 border border-blue-100",
        purple: "bg-purple-50 text-purple-600 border border-purple-100",
    };

    const content = (
        <div className={`bg-white p-5 rounded-2xl border border-gray-100 shadow-sm transition-all hover:shadow-md ${href ? 'cursor-pointer hover:border-gray-200' : ''}`}>
            <div className="flex items-center justify-between mb-3">
                <div className={`p-2.5 rounded-xl flex items-center justify-center ${colors[color] || colors.blue}`}>
                    <div className="h-4 w-4 flex items-center justify-center">{icon}</div>
                </div>
                {trend && <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full">{trend}</span>}
            </div>
            <h3 className="text-xl lg:text-2xl font-black text-gray-900">{value}</h3>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mt-1">{label}</p>
        </div>
    );

    return href ? <Link href={href}>{content}</Link> : content;
}
