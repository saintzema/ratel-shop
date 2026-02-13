"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { DEMO_SELLER_STATS, DEMO_PRODUCTS } from "@/lib/data";
import { NegotiationRequest, Seller } from "@/lib/types";
import { DemoStore } from "@/lib/demo-store";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    LayoutDashboard,
    Package,
    ShoppingBag,
    MessageSquare,
    TrendingUp,
    AlertCircle,
    CheckCircle,
    XCircle,
    Store,
    Clock,
    AlertTriangle
} from "lucide-react";
import Link from "next/link";

export default function SellerDashboard() {
    const router = useRouter();
    const [negotiations, setNegotiations] = useState<NegotiationRequest[]>([]);
    const [currentSeller, setCurrentSeller] = useState<Seller | undefined>(undefined);

    useEffect(() => {
        // Check login
        const sellerId = DemoStore.getCurrentSellerId();
        if (!sellerId) {
            router.push("/seller/login");
            return;
        }

        const seller = DemoStore.getCurrentSeller();
        setCurrentSeller(seller);

        // Load negotiations
        const loadData = () => {
            const allNegotiations = DemoStore.getNegotiations();
            const sellerProducts = DemoStore.getProducts().filter(p => p.seller_id === sellerId);
            const sellerProductIds = new Set(sellerProducts.map(p => p.id));

            const sellerNegotiations = allNegotiations.filter(n => sellerProductIds.has(n.product_id));
            setNegotiations(sellerNegotiations);
        };

        loadData();
        window.addEventListener("storage", loadData);
        return () => window.removeEventListener("storage", loadData);
    }, [router]);

    const handleAction = (id: string, status: "accepted" | "rejected") => {
        DemoStore.updateNegotiationStatus(id, status);
        // State updates automatically via storage event listener if we trigger it, 
        // but for local updates in the same window we might need to manually reload or rely on the listener if we dispatched it.
        // DemoStore.updateNegotiationStatus dispatches 'storage', so the listener should pick it up.
        // However, 'storage' events typically only fire in OTHER tabs. So we should also reload manually here.
        const sellerId = DemoStore.getCurrentSellerId();
        if (sellerId) {
            const allNegotiations = DemoStore.getNegotiations();
            const sellerProducts = DemoStore.getProducts().filter(p => p.seller_id === sellerId);
            const sellerProductIds = new Set(sellerProducts.map(p => p.id));
            setNegotiations(allNegotiations.filter(n => sellerProductIds.has(n.product_id)));
        }
    };

    if (!currentSeller) return null;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            <Navbar />

            <div className="flex flex-1">
                {/* Sidebar */}
                <aside className="w-64 bg-white border-r border-gray-200 hidden md:block">
                    <div className="p-6">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="h-10 w-10 bg-ratel-green-100 rounded-lg flex items-center justify-center">
                                <Store className="h-6 w-6 text-ratel-green-700" />
                            </div>
                            <div>
                                <h2 className="font-black text-sm">{currentSeller.business_name}</h2>
                                <p className="text-xs text-green-600 font-medium">Verified Seller</p>
                            </div>
                        </div>

                        <nav className="space-y-1">
                            <NavItem icon={<LayoutDashboard />} label="Overview" active />
                            <NavItem icon={<ShoppingBag />} label="Orders" badge="12" />
                            <NavItem icon={<Package />} label="Products" />
                            <NavItem icon={<MessageSquare />} label="Negotiations" badge={negotiations.filter(n => n.status === 'pending').length.toString()} highlight />
                            <NavItem icon={<TrendingUp />} label="Analytics" />
                        </nav>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="flex-1 p-8 pt-24">
                    <header className="flex justify-between items-center mb-8">
                        <div>
                            <h1 className="text-2xl font-black text-gray-900">Dashboard</h1>
                            <p className="text-gray-500">Welcome back, here's what's happening today.</p>
                        </div>
                        <Button variant="outline" onClick={() => { DemoStore.logout(); router.push("/seller/login"); }}>Logout</Button>
                    </header>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                        <StatCard label="Total Revenue" value={formatPrice(DEMO_SELLER_STATS.total_revenue)} trend="+12%" />
                        <StatCard label="Pending Orders" value={DEMO_SELLER_STATS.new_orders.toString()} color="orange" />
                        <StatCard label="Active Listings" value={DEMO_SELLER_STATS.products_count.toString()} />
                        <StatCard label="Trust Score" value={`${DEMO_SELLER_STATS.trust_score}%`} color="green" />
                    </div>

                    {/* Negotiation Requests */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50/50">
                            <h3 className="font-bold flex items-center gap-2">
                                <MessageSquare className="h-4 w-4 text-blue-600" />
                                Price Negotiation Requests
                            </h3>
                            <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                                {negotiations.filter(n => n.status === 'pending').length} Pending
                            </Badge>
                        </div>

                        <div className="divide-y divide-gray-100">
                            {negotiations.length === 0 ? (
                                <div className="p-8 text-center text-gray-500">No active negotiations.</div>
                            ) : (
                                negotiations.map((neg) => {
                                    const product = DEMO_PRODUCTS.find(p => p.id === neg.product_id);
                                    if (!product) return null;

                                    return (
                                        <div key={neg.id} className="p-6 hover:bg-gray-50 transition-colors">
                                            <div className="flex justify-between items-start gap-4">
                                                <div className="flex gap-4">
                                                    <div className="h-16 w-16 bg-gray-100 rounded-lg border border-gray-200 shrink-0">
                                                        <img src={product.image_url} className="w-full h-full object-contain mix-blend-multiply" />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="text-xs font-bold bg-gray-100 px-2 py-0.5 rounded text-gray-600">Product #{product.id}</span>
                                                            <span className="text-xs text-gray-400">•</span>
                                                            <span className="text-xs text-gray-500">{new Date(neg.created_at).toLocaleDateString()}</span>
                                                        </div>
                                                        <h4 className="font-bold text-gray-900 mb-1">{product.name}</h4>
                                                        <div className="flex items-center gap-4 text-sm">
                                                            <div>
                                                                <span className="text-gray-500 block text-xs uppercase tracking-wider font-bold">Listed Price</span>
                                                                <span className="font-medium text-gray-400 line-through">{formatPrice(product.price)}</span>
                                                            </div>
                                                            <div>
                                                                <span className="text-blue-600 block text-xs uppercase tracking-wider font-bold">Buyer Offer</span>
                                                                <span className="font-black text-xl text-gray-900">{formatPrice(neg.proposed_price)}</span>
                                                            </div>
                                                            {neg.status === 'pending' && <Badge variant="outline" className="ml-2 border-yellow-200 bg-yellow-50 text-yellow-700">Action Required</Badge>}
                                                            {neg.status === 'accepted' && <Badge variant="outline" className="ml-2 border-green-200 bg-green-50 text-green-700">Accepted</Badge>}
                                                            {neg.status === 'rejected' && <Badge variant="outline" className="ml-2 border-red-200 bg-red-50 text-red-700">Rejected</Badge>}
                                                        </div>

                                                        {neg.message && (
                                                            <div className="mt-3 bg-blue-50 p-3 rounded-lg text-sm text-blue-800 border border-blue-100 relative">
                                                                <div className="absolute -top-1.5 left-4 w-3 h-3 bg-blue-50 border-t border-l border-blue-100 transform rotate-45"></div>
                                                                <span className="font-bold mr-1">{neg.customer_name}:</span> "{neg.message}"
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {neg.status === 'pending' && (
                                                    <div className="flex flex-col gap-2 shrink-0">
                                                        <Button
                                                            onClick={() => handleAction(neg.id, "accepted")}
                                                            className="bg-ratel-green-600 hover:bg-ratel-green-700 text-white rounded-full font-bold shadow-sm"
                                                        >
                                                            <CheckCircle className="h-4 w-4 mr-2" /> Accept Offer
                                                        </Button>
                                                        <Button
                                                            onClick={() => handleAction(neg.id, "rejected")}
                                                            variant="outline"
                                                            className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 rounded-full font-bold"
                                                        >
                                                            <XCircle className="h-4 w-4 mr-2" /> Reject
                                                        </Button>
                                                        <Button variant="ghost" size="sm" className="text-gray-400 font-medium">Counter Offer</Button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Price Alerts */}
                    <div className="mt-8 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                        <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-ratel-orange" />
                            Price Alerts
                        </h2>
                        <div className="space-y-4">
                            <div className="p-4 bg-red-50 border border-red-100 rounded-lg">
                                <h4 className="font-bold text-red-700 text-sm mb-1">Overpriced Item Detected</h4>
                                <p className="text-xs text-red-600 mb-2">
                                    Your "Sony PS5 Console" is priced 25% higher than market average.
                                </p>
                                <Button size="sm" className="bg-red-600 text-white hover:bg-red-700 h-7 text-xs">Adjust Price</Button>
                            </div>

                            <div className="p-4 bg-green-50 border border-green-100 rounded-lg">
                                <h4 className="font-bold text-green-700 text-sm mb-1">Price Opportunity</h4>
                                <p className="text-xs text-green-600 mb-2">
                                    Demand for "Samsung S24" is high. Reducing price by 5% could increase sales by 20%.
                                </p>
                                <Button size="sm" className="bg-green-600 text-white hover:bg-green-700 h-7 text-xs">Apply Discount</Button>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
            <Footer />
        </div>
    );
}

function NavItem({ icon, label, active, badge, highlight }: any) {
    return (
        <a href="#" className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${active ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'} ${highlight ? 'text-blue-600 bg-blue-50 hover:bg-blue-100' : ''}`}>
            <div className="flex items-center gap-3">
                {icon}
                <span>{label}</span>
            </div>
            {badge && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${highlight ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                    {badge}
                </span>
            )}
        </a>
    )
}

function StatCard({ label, value, trend, color = "blue" }: any) {
    return (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{label}</p>
            <div className="flex items-end justify-between">
                <h3 className="text-2xl font-black text-gray-900">{value}</h3>
                {trend && <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">{trend}</span>}
            </div>
        </div>
    )
}
