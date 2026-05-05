"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { DEMO_SELLER_STATS } from "@/lib/data";
import { NegotiationRequest, Order, Product, Seller } from "@/lib/types";
import { DataSyncService } from "@/lib/sync-store";
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
    Landmark,
    ShieldCheck,
    Lock,
    ArrowUpRight,
    ChevronRight,
    DollarSign,
    ShoppingBag,
    Package,
    Star,
    Copy,
    Globe,
    ExternalLink,
    Crown,
    Zap,
    Link as LinkIcon,
    QrCode,
    RefreshCcw,
    Download
} from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";

import { useAuth } from "@/context/AuthContext";

export default function SellerDashboard() {
    const router = useRouter();
    const { user } = useAuth();
    const [negotiations, setNegotiations] = useState<NegotiationRequest[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [currentSeller, setCurrentSeller] = useState<Seller | undefined>(undefined);
    const [offListingInvoices, setOffListingInvoices] = useState<any[]>([]);
    const [cashoutSuccess, setCashoutSuccess] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [copiedStoreLink, setCopiedStoreLink] = useState(false);
    const [subdomainInput, setSubdomainInput] = useState("");
    const hasAttemptedCreation = useRef(false);

    // Dynamic stats calculations
    const stats = {
        negotiationCount: negotiations.length,
        completedNegotiations: negotiations.filter(n => n.status === "accepted").length,
        successRate: negotiations.length > 0
            ? Math.round((negotiations.filter(n => n.status === "accepted").length / negotiations.length) * 100)
            : 0,
        revenueTrend: "+14.2%" // Mock trend
    };

    useEffect(() => {
        const loadData = () => {
            const sellerId = DataSyncService.getCurrentSellerId();
            if (!sellerId) return;

            const seller = DataSyncService.getCurrentSeller();
            if (seller) {
                // Recalculate and persist dynamic trust score
                const dynamicScore = DataSyncService.recalculateTrustScore(seller.id);
                const enrichedSeller = { ...seller, trust_score: dynamicScore };
                setCurrentSeller(enrichedSeller);

                const allNegs = DataSyncService.getNegotiations(seller.id);
                // Sort by most recent first
                allNegs.sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime());
                setNegotiations(allNegs);

                const allOrders = DataSyncService.getOrders();
                const filteredOrders = allOrders.filter(o => o.seller_id === seller.id);
                // Sort by most recent first
                filteredOrders.sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime());
                setOrders(filteredOrders);

                const allProducts = DataSyncService.getProducts({ includeInactiveSellers: true });
                // Also include AI-generated products that are assigned to this seller
                const cachedProducts = DataSyncService.getAllCachedProducts();
                const combinedProducts = [...allProducts, ...cachedProducts];

                // deduplicate just in case 
                const uniqueProducts = Array.from(new Map(combinedProducts.map(p => [p.id, p])).values());
                setProducts(uniqueProducts.filter(p => p.seller_id === seller.id));

                // Load off-listing invoices
                const allInvoices = DataSyncService.getOffListingInvoices();
                setOffListingInvoices(allInvoices.filter(inv => inv.seller_id === seller.id));

                // Onboarding Verification Notification Logic
                if (seller.verified) {
                    const hasNotified = localStorage.getItem(`fp_notified_onboarding_${seller.id}`);
                    if (!hasNotified) {
                        // Check if they just got verified and have 0 products
                        const myProducts = allProducts.filter(p => p.seller_id === seller.id);
                        if (myProducts.length === 0) {
                            DataSyncService.addNotification({
                                userId: seller.id,
                                type: "system",
                                message: `🎉 Congratulations! Your store "${seller.business_name}" is now verified. You can start uploading products!`,
                                link: "/seller/products/new"
                            });
                            localStorage.setItem(`fp_notified_onboarding_${seller.id}`, "true");
                        }
                    }
                }
                
                setSubdomainInput(seller.store_url || (seller.business_name || 'yourstore').toLowerCase().replace(/[^a-z0-9]/g, ''));
            }
        };

        loadData();
        DataSyncService.syncWithDB("orders", true); // Proactive sync for latest orders
        DataSyncService.autoSync(); // Trigger initial DB sync immediately on mount

        // Register listeners IMMEDIATELY to catch the first sync
        window.addEventListener("storage", loadData);
        window.addEventListener("sync-store-update", loadData);

        // Periodically sync in the background (every 2 minutes)
        const syncInterval = setInterval(() => {
            DataSyncService.autoSync();
        }, 120000);

        // Polling fallback: If no seller is found, try again every 2 seconds for a bit
        const pollInterval = setInterval(() => {
            if (!DataSyncService.getCurrentSellerId()) {
                loadData();
            } else {
                clearInterval(pollInterval);
            }
        }, 2000);

        return () => {
            window.removeEventListener("storage", loadData);
            window.removeEventListener("sync-store-update", loadData);
            clearInterval(pollInterval);
            clearInterval(syncInterval);
        };
    }, [router, user?.id, user?.email]); // Added user.email for better detection

    const handleNegAction = async (id: string, status: "accepted" | "rejected") => {
        // 1. Update local state immediately for fast UI
        DataSyncService.updateNegotiationStatus(id, status, "seller");
        const sellerId = DataSyncService.getCurrentSellerId();
        if (sellerId) {
            setNegotiations(DataSyncService.getNegotiations(sellerId));
        }
        // 2. Sync to PostgreSQL database
        try {
            await fetch("/api/negotiations", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, status }),
            });
        } catch (e) {
            console.warn("DB sync for negotiation failed — will retry on next refresh", e);
        }
    };

    const handleCashout = async () => {
        // Check if seller has payout info set up
        const payoutInfo = localStorage.getItem(`fp_payout_${currentSeller?.id}`);
        if (!payoutInfo) {
            const go = window.confirm("You haven't set up your payout details yet. Would you like to add your bank details now?");
            if (go) {
                router.push("/seller/settings/payouts#bank-details");
            }
            return;
        }

        // Parse bank details for the payout request
        let bankName = "N/A", accountNumber = "N/A", accountName = "N/A";
        try {
            const parsed = JSON.parse(payoutInfo);
            bankName = parsed.bank_name || "N/A";
            accountNumber = parsed.account_number || "N/A";
            accountName = parsed.account_name || "N/A";
        } catch {}

        // Collect eligible order IDs for this payout
        const EARNINGS_ELIGIBLE = ["released", "buyer_confirmed", "auto_release_eligible"];
        const eligibleOrders = orders.filter(
            o => EARNINGS_ELIGIBLE.includes(o.escrow_status as string) && (o.payout_status === "none" || !o.payout_status)
        );
        const orderIds = eligibleOrders.map(o => o.id);

        setCashoutSuccess(true);

        // 1. Notify locally
        DataSyncService.addNotification({
            userId: currentSeller?.id || "",
            type: "system",
            message: `💰 Cashout request of ${formatPrice(availableBalance)} submitted! Funds will be transferred within 24-48 hours.`,
            link: "/seller/balance"
        });

        // 2. Write payout to PostgreSQL database
        try {
            await fetch("/api/payouts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    seller_id: currentSeller?.id,
                    amount: availableBalance,
                    bank_name: bankName,
                    account_number: accountNumber,
                    account_name: accountName,
                    order_ids: orderIds,
                }),
            });
        } catch (e) {
            console.warn("DB sync for payout failed — saved locally", e);
        }

        window.dispatchEvent(new Event("sync-store-update"));
        setTimeout(() => setCashoutSuccess(false), 3000);
    };

    const handleSubdomainUpgrade = () => {
        if (currentSeller) {
            DataSyncService.addNotification({
                userId: "admin",
                type: "system",
                message: `🚀 SUBSCRIPTION UPGRADE REQUEST: ${currentSeller.business_name} wants to upgrade to the ₦14,990 Plan with subdomain: ${subdomainInput}.fairprice.ng`,
                link: `/admin/sellers/${currentSeller.id}`
            });
        }
        router.push(`/seller/settings/billing?plan=growth&subdomain=${subdomainInput}`);
    };

    // We remove the blocking 'Syncing your store...' loader as requested by user.
    // Instead, we use a skeleton loader if the currentSeller isn't available yet,
    // avoiding the "Loading Store..." hallucination.
    if (!currentSeller) {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 animate-pulse space-y-8">
                <div className="h-32 bg-gray-100/50 rounded-[32px]" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-32 bg-gray-50 rounded-2xl border border-gray-100" />
                    ))}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="h-96 bg-gray-50 rounded-2xl border border-gray-100" />
                    <div className="h-96 bg-gray-50 rounded-2xl border border-gray-100" />
                </div>
            </div>
        );
    }

    const safeSeller = currentSeller;

    // Computed financials
    const EARNINGS_ELIGIBLE_STATES = ["released", "buyer_confirmed", "auto_release_eligible"];
    const ESCROW_STATES = ["held", "seller_confirmed"];

    const escrowAmount = orders
        .filter(o => ESCROW_STATES.includes(o.escrow_status as string))
        .reduce((sum, o) => sum + o.amount, 0);

    const releasedAmount = orders
        .filter(o => EARNINGS_ELIGIBLE_STATES.includes(o.escrow_status as string))
        .reduce((sum, o) => sum + o.amount, 0);

    const totalRevenue = releasedAmount + escrowAmount;

    // Platform takes dynamic commission on all released funds based on tier
    const COMMISSION_RATE = currentSeller ? DataSyncService.getSellerCommissionRate(currentSeller as any) : 0.05;
    const platformFee = releasedAmount * COMMISSION_RATE;
    const availableBalance = orders
        .filter(o => EARNINGS_ELIGIBLE_STATES.includes(o.escrow_status as string) && (o.payout_status === "none" || !o.payout_status))
        .reduce((sum, o) => sum + (o.amount * (1 - COMMISSION_RATE)), 0);

    const pendingNegs = negotiations.filter(n => n.status === "pending");
    const disputedOrders = orders.filter(o => o.escrow_status === "disputed");
    // "Pending" for a seller means they need to take action (Awaiting Shipment). 
    // This includes both "pending" (unpaid/COD) and "processing" (paid via Paystack).
    const newOrders = orders.filter(o => o.status === "pending" || o.status === "processing");
    const returnedOrders = orders.filter(o => o.status === "returned");

    // Success rate logic
    const successRate = negotiations.length > 0
        ? Math.round((negotiations.filter(n => n.status === "accepted").length / negotiations.length) * 100)
        : 0;
    
    const revenueTrend = totalRevenue > 0 ? "+12.4%" : undefined;

    return (
        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 max-w-6xl pb-20"
        >
            {/* Enhanced Banner: Tier Level Progress */}
            {safeSeller.verified && (
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-3xl p-3 md:p-4 flex items-center justify-between shadow-sm">
                    <div className="flex flex-col">
                        <span className="text-emerald-800 font-black text-lg md:text-xl tracking-tight flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4 text-emerald-600" />
                            {safeSeller.business_name} - Verified Partner
                        </span>
                    </div>
                </div>
            )}

            {/* Welcome header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                        Welcome back, {safeSeller.business_name} 
                        <motion.span 
                            animate={{ rotate: [0, 15, -15, 0] }}
                            transition={{ repeat: Infinity, duration: 2, delay: 1 }}
                        >👋</motion.span>
                    </h1>
                    <p className="text-sm text-zinc-500 font-medium mt-1">
                        Here's what's happening with your store today.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        className="rounded-full border-emerald-200 text-emerald-700 hover:bg-emerald-50 font-bold px-5 h-10 transition-all hover:scale-105 active:scale-95"
                        onClick={async () => {
                            setIsRefreshing(true);
                            await DataSyncService.autoSync(true); // Force clear stale local cache
                            setIsRefreshing(false);
                        }}
                    >
                        <RefreshCcw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
                        {isRefreshing ? "Refreshing..." : "Global Refresh"}
                    </Button>
                </div>
            </div>

            {/* Stats Grid */}
            <motion.div 
                layout
                className="grid grid-cols-2 md:grid-cols-4 gap-4"
            >
                <StatCard icon={<DollarSign />} label="Total Revenue" value={formatPrice(totalRevenue)} trend={revenueTrend} color="emerald" href="/seller/orders?filter=delivered" delay={0.1} />
                <StatCard icon={<ShoppingBag />} label="Pending Orders" value={newOrders.length.toString()} color="amber" href="/seller/orders" delay={0.2} />
                <StatCard icon={<TrendingUp />} label="Neg. Success" value={`${successRate}%`} color="blue" href="/seller/dashboard/messages" delay={0.3} tooltip="Accept more reasonable counter-offers and avoid letting negotiations expire to boost your success rate." />
                <StatCard icon={<Star />} label="Trust Score" value={`${safeSeller.trust_score || 50}%`} color="purple" delay={0.4} tooltip="Ship orders on time, avoid return disputes, and keep your inventory accurate to maintain a high trust score." />
            </motion.div>

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
                    <Link href="/seller/orders?filter=disputed" className="text-xs font-bold text-rose-700 hover:text-rose-800 bg-white px-3 py-1.5 rounded-lg border border-rose-200">
                        View Orders
                    </Link>
                </div>
            )}

            {/* New Orders Alert */}
            {newOrders.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center gap-3">
                    <ShoppingBag className="h-5 w-5 text-blue-600 shrink-0" />
                    <div className="flex-1">
                        <p className="text-sm font-bold text-blue-800">
                            {newOrders.length} new order{newOrders.length !== 1 ? "s" : ""} awaiting shipment
                        </p>
                        <p className="text-xs text-blue-600 mt-0.5">Ship orders quickly to maintain a high trust score.</p>
                    </div>
                    <Link href="/seller/orders" className="text-xs font-bold text-blue-700 hover:text-blue-800 bg-white px-3 py-1.5 rounded-lg border border-blue-200">
                        Process Orders
                    </Link>
                </div>
            )}

            {/* Returns Alert */}
            {returnedOrders.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
                    <Package className="h-5 w-5 text-amber-600 shrink-0" />
                    <div className="flex-1">
                        <p className="text-sm font-bold text-amber-800">
                            {returnedOrders.length} return request{returnedOrders.length !== 1 ? "s" : ""}
                        </p>
                        <p className="text-xs text-amber-600 mt-0.5">Please review pending returns and arrange for product pickup.</p>
                    </div>
                    <Link href="/seller/orders" className="text-xs font-bold text-amber-700 hover:text-amber-800 bg-white px-3 py-1.5 rounded-lg border border-amber-200">
                        Review Returns
                    </Link>
                </div>
            )}

            {/* ── Store Link Card ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                    <Globe className="h-4 w-4 text-indigo-600" />
                    <span className="text-xs font-black text-gray-500 uppercase tracking-wider">Your Store Link</span>
                </div>

                {/* Current Store Link */}
                <div className="flex flex-col gap-3 bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <div className="flex items-center gap-2">
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Live Store URL</p>
                            <p className="text-sm font-bold text-indigo-700 truncate">
                                fairprice.ng/store/{safeSeller.store_url || safeSeller.id}
                            </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                            <Link href={`/store/${safeSeller.store_url || safeSeller.id}`} target="_blank">
                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50">
                                    <ExternalLink className="h-3.5 w-3.5" />
                                </Button>
                            </Link>
                        </div>
                    </div>

                    <div className="border-t border-gray-200/60 pt-4 flex flex-col items-center">
                        <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-inner mb-4 relative group">
                            <div className="absolute inset-0 bg-emerald-500/5 blur-xl group-hover:bg-emerald-500/10 transition-colors" />
                            <div className="relative">
                                <QRCodeCanvas 
                                    id="store-sharing-qr"
                                    value={safeSeller.store_url ? `https://fairprice.ng/store/${safeSeller.store_url}` : `https://fairprice.ng/store/${safeSeller.id}`}
                                    size={140}
                                    level="H"
                                    imageSettings={{
                                        src: (safeSeller as any).logo_url || "/logo.svg",
                                        x: undefined,
                                        y: undefined,
                                        height: 24,
                                        width: 24,
                                        excavate: true,
                                    }}
                                    fgColor="#000000"
                                    className="rounded-lg"
                                />
                            </div>
                        </div>
                        
                        <div className="flex gap-2 mb-6">
                            <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-8 text-[10px] font-black uppercase tracking-widest rounded-lg border-gray-100"
                                onClick={() => {
                                    const canvas = document.getElementById("store-sharing-qr") as HTMLCanvasElement;
                                    if (canvas) {
                                        const url = canvas.toDataURL("image/png");
                                        const link = document.createElement("a");
                                        link.href = url;
                                        link.download = `${safeSeller.business_name}-Store-QR.png`;
                                        link.click();
                                    }
                                }}
                            >
                                <Download className="h-3 w-3 mr-1.5" /> Download QR
                            </Button>
                        </div>

                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Share via Social Media</p>
                        <div className="grid grid-cols-5 gap-2 sm:gap-4 w-full">
                            <a
                                href={`https://wa.me/?text=${encodeURIComponent(`Check out my store on FairPrice: https://fairprice.ng/store/${safeSeller.store_url || safeSeller.id}`)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center p-3 rounded-2xl transition-all hover:-translate-y-1 hover:shadow-md border border-[#25D366]/20 bg-[#25D366]/5 group"
                            >
                                <div className="h-7 w-7 shrink-0 rounded-full bg-[#25D366] text-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                                </div>
                            </a>
                            <a
                                href={`https://instagram.com`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center p-3 rounded-2xl transition-all hover:-translate-y-1 hover:shadow-md border border-pink-500/20 bg-pink-500/5 group"
                            >
                                <div className="h-7 w-7 shrink-0 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 text-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                                </div>
                            </a>
                            <a
                                href={`https://tiktok.com`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center p-3 rounded-2xl transition-all hover:-translate-y-1 hover:shadow-md border border-gray-300 bg-gray-50 group"
                            >
                                <div className="h-7 w-7 shrink-0 rounded-full bg-black text-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 2.63-1.87 5.09-4.39 6-2.5.89-5.46.46-7.55-1.12-2.06-1.55-3.08-4.22-2.58-6.72.5-2.47 2.5-4.37 4.97-4.8 2.05-.36 4.19.12 5.86 1.34v4.32c-1.07-.63-2.39-.77-3.56-.37-1.16.39-2.02 1.36-2.28 2.56-.25 1.18.15 2.45.98 3.28 1.11 1.1 3.02 1.11 4.15.15 1.25-1.05 1.66-2.73 1.66-4.32-.03-5.74-.01-11.48-.01-17.22h.01z"/></svg>
                                </div>
                            </a>
                            <a
                                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`https://fairprice.ng/store/${safeSeller.store_url || safeSeller.id}`)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center p-3 rounded-2xl transition-all hover:-translate-y-1 hover:shadow-md border border-[#1877F2]/20 bg-[#1877F2]/5 group"
                            >
                                <div className="h-7 w-7 shrink-0 rounded-full bg-[#1877F2] text-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                                </div>
                            </a>
                            <button
                                onClick={() => {
                                    const url = `https://fairprice.ng/store/${safeSeller.store_url || safeSeller.id}`;
                                    navigator.clipboard.writeText(url);
                                    setCopiedStoreLink(true);
                                    setTimeout(() => setCopiedStoreLink(false), 2000);
                                }}
                                className={`flex items-center justify-center p-3 rounded-2xl transition-all hover:-translate-y-1 hover:shadow-md border group ${copiedStoreLink ? 'border-emerald-300 bg-emerald-50' : 'border-gray-200 bg-white'}`}
                            >
                                <div className={`h-7 w-7 shrink-0 rounded-full flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform ${copiedStoreLink ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-700'}`}>
                                    {copiedStoreLink ? (
                                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                    ) : (
                                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>
                                    )}
                                </div>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Custom Subdomain CTA */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-gradient-to-r from-amber-50/80 to-orange-50/60 rounded-xl p-4 border border-amber-100/60">
                    <div className="flex-1 min-w-0 w-full">
                        <div className="flex items-center gap-1.5 mb-2">
                            <Crown className="h-3 w-3 text-amber-500" />
                            <p className="text-[10px] font-black text-amber-600 uppercase tracking-wider">Custom Subdomain</p>
                        </div>
                        <div className="flex items-center bg-white border border-amber-200 rounded-lg overflow-hidden shadow-sm focus-within:ring-2 ring-amber-500/20 max-w-sm w-full">
                            <input 
                                type="text"
                                value={subdomainInput}
                                onChange={(e) => setSubdomainInput(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                                className="flex-1 min-w-0 px-3 py-2 text-sm font-bold text-gray-700 outline-none placeholder:text-gray-300"
                                placeholder="yourstore"
                            />
                            <div className="px-3 py-2 bg-gray-50 border-l border-amber-100 text-sm font-bold text-gray-500 whitespace-nowrap">
                                .fairprice.ng
                            </div>
                        </div>
                    </div>
                    <Button
                        onClick={handleSubdomainUpgrade}
                        className="w-full sm:w-auto h-10 px-5 rounded-lg text-xs font-black bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-md transition-all hover:scale-105 active:scale-95 whitespace-nowrap"
                    >
                        <Crown className="h-3.5 w-3.5 mr-1.5" /> Get Store Link
                    </Button>
                </div>
            </div>
            

            {/* Recent Activity Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Negotiations (max 3) */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                    <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                        <h3 className="font-bold text-sm flex items-center gap-2 text-gray-900">
                            <MessageSquare className="h-4 w-4 text-blue-500" />
                            Recent Negotiations
                        </h3>
                        <Link href="/seller/dashboard/messages" className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-0.5 transition-colors">
                            View All ({negotiations.length}) <ChevronRight className="h-3 w-3" />
                        </Link>
                    </div>

                    <div className="divide-y divide-gray-100 flex-1">
                        {pendingNegs.length === 0 ? (
                            <div className="p-8 text-center text-gray-400 text-sm font-medium h-full flex items-center justify-center">No pending negotiations</div>
                        ) : (
                            pendingNegs.slice(0, 3).map((neg) => {
                                const product = products.find(p => p.id === neg.product_id) || DataSyncService.getProducts({ includeInactiveSellers: true }).find(p => p.id === neg.product_id);
                                if (!product) return null;

                                return (
                                    <div key={neg.id} className="p-5 hover:bg-gray-50/50 transition-colors">
                                        <div className="flex justify-between items-start gap-4">
                                            <div className="flex gap-4 flex-1 min-w-0">
                                                <div className="h-14 w-14 bg-white rounded-xl border border-gray-100 shrink-0 overflow-hidden flex items-center justify-center p-1.5">
                                                    <img src={product.image_url || (product as any).imageUrl || "/placeholder.png"} className="w-full h-full mix-blend-multiply object-contain" alt="" />
                                                </div>
                                                <div className="min-w-0">
                                                    <h4 className="font-bold text-sm text-gray-900 truncate">{product.name}</h4>
                                                    <div className="flex items-center gap-3 mt-1.5">
                                                        <span className="text-xs text-gray-400 font-semibold line-through">{formatPrice(product.price)}</span>
                                                        <span className="text-sm font-black text-blue-600">{formatPrice(neg.proposed_price)}</span>
                                                        <Badge variant="outline" className="text-[10px] border-blue-200 bg-blue-50 text-blue-700 py-0 flex h-5 px-1.5 items-center font-bold hover:bg-blue-100 hover:text-blue-800 transition-colors cursor-default">
                                                            -{Math.round((1 - neg.proposed_price / product.price) * 100)}%
                                                        </Badge>
                                                    </div>
                                                    {neg.message && (
                                                        <p className="text-xs text-gray-500 mt-2 line-clamp-1 italic text-balance border-l-2 border-gray-200 pl-2">"{neg.message}"</p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-2 shrink-0">
                                                <Button size="sm" onClick={() => handleNegAction(neg.id, "accepted")} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-8 px-4 text-xs font-bold shadow-sm">
                                                    <CheckCircle className="h-4 w-4 mr-1.5" /> Accept
                                                </Button>
                                                <Button size="sm" variant="outline" onClick={() => handleNegAction(neg.id, "rejected")} className="border-gray-200 text-gray-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 rounded-xl h-8 px-4 text-xs font-bold bg-white shadow-sm transition-colors">
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

                {/* Recent Orders (max 3) */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                    <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                        <h3 className="font-bold text-sm flex items-center gap-2 text-gray-900">
                            <ShoppingBag className="h-4 w-4 text-emerald-500" />
                            Recent Orders
                        </h3>
                        <Link href="/seller/orders" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5 transition-colors">
                            View All ({newOrders.length}) <ChevronRight className="h-3 w-3" />
                        </Link>
                    </div>

                    <div className="divide-y divide-gray-100 flex-1">
                        {newOrders.length === 0 ? (
                            <div className="p-8 text-center text-gray-400 text-sm font-medium h-full flex items-center justify-center">No new orders yet 📦</div>
                        ) : (
                            newOrders.slice(0, 3).map((order) => {
                                const product = order.product;
                                if (!product) return null;

                                return (
                                    <div key={order.id} className="p-5 hover:bg-gray-50/50 transition-colors">
                                        <div className="flex justify-between items-start gap-4">
                                            <div className="flex gap-4 flex-1 min-w-0">
                                                <div className="h-14 w-14 bg-white rounded-xl border border-gray-100 shrink-0 overflow-hidden flex items-center justify-center p-1.5">
                                                    <img src={product.image_url || (product as any).imageUrl || "/placeholder.png"} className="w-full h-full object-contain mix-blend-multiply" alt="" />
                                                </div>
                                                <div className="min-w-0">
                                                    <h4 className="font-bold text-sm text-gray-900 truncate">{product.name}</h4>
                                                    <div className="flex items-center gap-3 mt-1 5">
                                                        <span className="text-sm font-black text-emerald-600">{formatPrice(order.amount)}</span>
                                                    </div>
                                                    <p className="text-[11px] text-gray-500 mt-1 font-medium bg-gray-100 inline-block px-2 py-0.5 rounded-md">#{order.id.split('-')[1] || order.id.substring(0, 8)}</p>
                                                </div>
                                            </div>
                                            <Link href={`/seller/orders`}>
                                                <Button size="sm" className="bg-white border-emerald-200 text-emerald-700 hover:bg-emerald-50 rounded-xl h-8 px-3 text-xs font-bold shadow-sm transition-colors border">
                                                    Process
                                                </Button>
                                            </Link>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>

            {/* Revenue & Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Available Balance */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                        <Landmark className="h-4 w-4 text-emerald-600" />
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Available Balance</span>
                    </div>
                    <h3 className="text-3xl font-black text-gray-900 mt-2">
                        {formatPrice(availableBalance)}
                    </h3>
                    <p className="text-[11px] text-gray-500 mt-1 mb-4">After {COMMISSION_RATE * 100}% platform commission fees</p>
                    <Link href="/seller/balance">
                        <Button
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl h-10 shadow-sm"
                        >
                            <ArrowUpRight className="h-4 w-4 mr-2" />
                            Manage Balance & Settlements
                        </Button>
                    </Link>
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
                            style={{ width: `${escrowAmount > 0 ? Math.min((escrowAmount / (totalRevenue || 1)) * 100, 100) : 0}%` }}
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
                            style={{ width: `${releasedAmount > 0 ? Math.min((releasedAmount / (totalRevenue || 1)) * 100, 100) : 0}%` }}
                        />
                    </div>
                    <p className="text-[10px] text-gray-500 mt-2 font-medium">{orders.filter(o => o.escrow_status === "released").length} orders released</p>
                </div>
            </div>

            {/* Premium Payout Tracker */}
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-white rounded-[32px] border border-zinc-100 p-7 shadow-sm overflow-hidden relative group"
            >
                <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-50/40 rounded-full blur-3xl -mr-24 -mt-24 group-hover:bg-emerald-100/40 transition-colors duration-700" />
                
                <div className="flex items-center justify-between mb-8 relative">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200">
                            <Landmark className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-zinc-900 leading-none">Payout Lifecycle</h3>
                            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-1">Fund Tracking & Escrow Release</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider mb-1">Available to Cashout</p>
                        <div className="text-2xl font-black text-emerald-600 flex items-center justify-end gap-1.5">
                            {formatPrice(availableBalance)}
                            <div className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 relative px-2">
                    <PayoutStep 
                        label="In Escrow" 
                        amount={escrowAmount} 
                        status="pending" 
                        icon={<Lock className="h-4 w-4" />}
                        description="Buyer payment held"
                        active={escrowAmount > 0}
                    />
                    <PayoutStep 
                        label="Released" 
                        amount={releasedAmount} 
                        status="completed" 
                        icon={<ShieldCheck className="h-4 w-4" />}
                        description="Verified for payout"
                        active={releasedAmount > 0}
                    />
                    <PayoutStep 
                        label="Processing" 
                        amount={0} 
                        status="pending" 
                        icon={<TrendingUp className="h-4 w-4" />}
                        description="Bank transfer in dev"
                        active={false}
                    />
                    <PayoutStep 
                        label="Paid Out" 
                        amount={orders.filter(o => o.payout_status === "paid").reduce((s, o) => s + o.amount, 0)} 
                        status="completed" 
                        icon={<CheckCircle className="h-4 w-4" />}
                        description="Settled to account"
                        active={false}
                    />
                    
                    {/* Progress Connecting Line (Desktop) */}
                    <div className="hidden lg:block absolute top-[19px] left-[12%] right-[12%] h-[1px] bg-zinc-100 -z-10">
                        <div 
                            className="h-full bg-emerald-500 transition-all duration-1000" 
                            style={{ width: releasedAmount > 0 ? '66%' : escrowAmount > 0 ? '33%' : '0%' }}
                        />
                    </div>
                </div>

                <div className="mt-8 pt-6 border-t border-zinc-50 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2 p-2 px-3 bg-amber-50/50 rounded-xl border border-amber-100/50">
                        <ShieldCheck className="h-3.5 w-3.5 text-amber-600" />
                        <span className="text-[10px] text-amber-900 font-bold">
                            Gold Accent Tier: Platform fee ({COMMISSION_RATE * 100}%) is <strong>{formatPrice(platformFee)}</strong>
                        </span>
                    </div>
                    <Button 
                        disabled={availableBalance <= 1000}
                        className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-8 rounded-full font-bold h-11 text-sm shadow-xl shadow-emerald-100 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                        Request Instant Payout
                    </Button>
                </div>
            </motion.div>


            {/* Price Alerts — Dynamic per seller */}
            {(() => {
                const overpricedItems = products.filter(p => p.price_flag === "overpriced");
                const opportunityItems = products.filter(p => p.price_flag === "fair" && p.sold_count < 10 && p.recommended_price && p.price > p.recommended_price);
                const hasAlerts = overpricedItems.length > 0 || opportunityItems.length > 0;

                return (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                        <h2 className="font-bold text-sm mb-4 flex items-center gap-2 text-gray-900">
                            <AlertTriangle className="h-4 w-4 text-brand-orange" />
                            AI Price Alerts
                        </h2>

                        {!hasAlerts ? (
                            <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-100/60 rounded-xl">
                                <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
                                <div>
                                    <h4 className="font-bold text-emerald-800 text-sm">All prices look competitive!</h4>
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
                                                DataSyncService.updateProduct(item.id, { price: Math.round(item.price * 0.95) });
                                                // Reload products
                                                const sellerId = DataSyncService.getCurrentSellerId();
                                                if (sellerId) {
                                                    setProducts(DataSyncService.getProducts({ includeInactiveSellers: true }).filter(p => p.seller_id === sellerId));
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
            {/* Direct Checkout Activity Ledger */}
            <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm overflow-hidden mt-8">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <LinkIcon className="h-4 w-4 text-emerald-600" />
                            Direct Checkout Activity
                        </h2>
                        <p className="text-sm text-gray-500 font-medium mt-1">History of off-platform payment links generated.</p>
                    </div>
                    <Link href="/seller/dashboard/payments">
                        <Button size="sm" variant="outline" className="rounded-xl border-gray-200 text-gray-600 font-bold h-9">
                            Generate New Link
                        </Button>
                    </Link>
                </div>
                
                <div className="overflow-x-auto">
                    {offListingInvoices.length === 0 ? (
                        <div className="p-12 flex flex-col items-center justify-center text-center bg-gray-50/30">
                            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4">
                                <QrCode className="h-8 w-8 text-gray-300" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-1">No Direct Links Yet</h3>
                            <p className="text-sm text-gray-500 max-w-sm">When you generate direct checkout links or QR codes, they will appear here for tracking.</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50">
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Date</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Ref ID</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Customer</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right">Amount</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {offListingInvoices.slice(0, 5).map((inv) => (
                                    <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-bold text-gray-900">
                                                {new Date(inv.created_at).toLocaleDateString()}
                                            </div>
                                            <div className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">
                                                {new Date(inv.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-xs font-mono text-gray-500">
                                            #{inv.id.substring(0, 8)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-bold text-gray-900">{inv.customer_name || "Guest Customer"}</div>
                                            <div className="text-[10px] text-gray-400 font-bold truncate max-w-[150px]">{inv.customer_email || "No email provided"}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <div className="text-sm font-black text-gray-900">
                                                {formatPrice(inv.amount)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <Badge className={`
                                                ${inv.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}
                                                border-none justify-center font-black text-[10px] uppercase tracking-wider px-2 py-0.5
                                            `}>
                                                {inv.status}
                                            </Badge>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
                {offListingInvoices.length > 5 && (
                    <div className="p-4 border-t border-gray-100 text-center bg-gray-50/30">
                        <Link href="/seller/dashboard/payments" className="text-xs font-bold text-emerald-600 hover:text-emerald-700">
                            View all {offListingInvoices.length} invoices
                        </Link>
                    </div>
                )}
            </div>
        </motion.div>
    );
}

interface PayoutStepProps {
    label: string;
    amount: number;
    status: "pending" | "completed";
    icon: React.ReactNode;
    description: string;
    active?: boolean;
}

function PayoutStep({ label, amount, status, icon, description, active }: PayoutStepProps) {
    return (
        <div className="flex flex-row md:flex-col items-center md:items-start gap-4 md:gap-2">
            <div className={`
                w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all duration-500
                ${active ? "bg-emerald-600 text-white shadow-lg shadow-emerald-200 scale-110" : "bg-zinc-100 text-zinc-400"}
                ${status === "completed" && active ? "ring-2 ring-amber-400 ring-offset-2" : ""}
            `}>
                {icon}
            </div>
            <div className="min-w-0">
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-tight leading-none mb-1">{label}</p>
                <div className="flex items-baseline gap-1">
                    <p className="text-sm font-black text-zinc-900">{formatPrice(amount)}</p>
                    {active && <div className="w-1 h-1 rounded-full bg-amber-400 animate-pulse" />}
                </div>
                <p className="text-[9px] text-zinc-400 font-medium leading-tight">{description}</p>
            </div>
        </div>
    );
}

// ─── StatCard ───
function StatCard({ icon, label, value, trend, color = "blue", href, delay = 0, tooltip }: { icon: React.ReactNode; label: string; value: string; trend?: string; color?: string; href?: string; delay?: number; tooltip?: string }) {
    const [showTooltip, setShowTooltip] = useState(false);
    
    const colors: Record<string, string> = {
        emerald: "bg-emerald-50 text-emerald-600 border border-emerald-100",
        amber: "bg-amber-50 text-amber-600 border border-amber-100",
        blue: "bg-blue-50 text-blue-600 border border-blue-100",
        purple: "bg-purple-50 text-purple-600 border border-purple-100",
    };

    const content = (
        <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay, type: "spring", stiffness: 300, damping: 25 }}
            onClick={(e) => {
                if (tooltip) {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowTooltip(!showTooltip);
                }
            }}
            className={`bg-white p-5 rounded-3xl border border-zinc-100 shadow-sm transition-all relative overflow-hidden group ${href ? 'cursor-pointer hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-500/5 hover:-translate-y-1' : ''}`}
        >
            {/* Subtle Gold Pulse for positive trends */}
            {trend && trend.includes("+") && (
                <div className="absolute top-0 right-0 p-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
                </div>
            )}

            <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 duration-500 ${colors[color] || colors.blue}`}>
                    <div className="h-4 w-4 flex items-center justify-center">{icon}</div>
                </div>
                {trend && (
                    <span className="text-[11px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-full tracking-tight">
                        {trend}
                    </span>
                )}
            </div>
            <h3 className="text-2xl font-black text-zinc-900 tracking-tight leading-none mb-2">{value}</h3>
            <div className="flex items-center gap-2 relative">
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{label}</p>
                {href && !tooltip && <ChevronRight className="h-3 w-3 text-zinc-300 group-hover:text-emerald-500 transition-colors" />}
                
                {tooltip && showTooltip && (
                    <div className="absolute left-0 bottom-full mb-2 w-52 bg-gray-900 border border-gray-700 text-white text-[11px] font-medium p-3 rounded-2xl z-50 shadow-2xl leading-relaxed animate-in fade-in slide-in-from-bottom-2">
                        <div className="flex items-center gap-1.5 mb-1.5">
                            <Zap className="h-3 w-3 text-amber-400" />
                            <span className="font-black text-white uppercase tracking-widest text-[9px]">Insight</span>
                        </div>
                        {tooltip}
                        <div className="absolute left-6 -bottom-1 w-2 h-2 bg-gray-900 border-b border-r border-gray-700 rotate-45" />
                    </div>
                )}
            </div>
        </motion.div>
    );

    return href && !tooltip ? <Link href={href} className="group outline-none">{content}</Link> : <div className="group">{content}</div>;
}
