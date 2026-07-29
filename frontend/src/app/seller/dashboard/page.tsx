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
    Download,
    BadgeCheck,
    Smartphone,
    Bell,
    ChevronDown,
    ChevronUp,
} from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";

import { useAuth } from "@/context/AuthContext";
import { WhatsAppCatalogImporter } from "@/components/seller/WhatsAppCatalogImporter";
import { InstagramCatalogImporter } from "@/components/seller/InstagramCatalogImporter";
import { SellerFeatureSpotlight } from "@/components/seller/SellerFeatureSpotlight";


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
    const [qrDesc, setQrDesc] = useState("");
    const [qrAmount, setQrAmount] = useState("");
    const [copiedPayLink, setCopiedPayLink] = useState(false);
    const [sellerAlerts, setSellerAlerts] = useState<any[]>([]);
    const [payouts, setPayouts] = useState<any[]>([]);
    const [alertsExpanded, setAlertsExpanded] = useState(false);
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

                // Load important seller alerts (orders, negotiations, refunds, payouts, etc.)
                try {
                    const notifs = DataSyncService.getNotifications(seller.id) || [];
                    const important = notifs
                        .filter((n: any) => n.type !== "system" && !(n.message || "").startsWith("Welcome to FairPrice"))
                        .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                    setSellerAlerts(important);
                } catch { /* non-critical */ }

                // Local storage cache misses anything created server-side (new orders,
                // payment-received) on a device that hasn't personally seen it before —
                // merge in the real DB feed so alerts don't silently lag behind reality.
                if (seller.owner_email) {
                    fetch(`/api/notifications?user_email=${encodeURIComponent(seller.owner_email)}`)
                        .then(r => r.json())
                        .then((dbNotifs: any[]) => {
                            if (!Array.isArray(dbNotifs)) return;
                            setSellerAlerts(prev => {
                                const byId = new Map(prev.map((n: any) => [n.id, n]));
                                for (const n of dbNotifs) {
                                    if (n.type !== "system") byId.set(n.id, n);
                                }
                                return Array.from(byId.values()).sort(
                                    (a: any, b: any) => new Date(b.timestamp || b.createdAt).getTime() - new Date(a.timestamp || a.createdAt).getTime()
                                );
                            });
                        })
                        .catch(() => {});
                }

                // Real payout records (QR settlements bypass per-order payout_status
                // entirely, so they never showed up here before).
                fetch(`/api/payouts?sellerId=${seller.id}`)
                    .then(r => r.json())
                    .then((data: any) => { if (Array.isArray(data?.payouts)) setPayouts(data.payouts); })
                    .catch(() => {});

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
        // Bank details set up via onboarding/settings live on the seller's DB record,
        // not a per-device localStorage key — checking that key falsely told sellers
        // "you haven't set up payout details" on any device that hadn't personally
        // written it, even with real bank details already on file.
        let bankName = currentSeller?.bank_name || "N/A";
        let accountNumber = currentSeller?.account_number || "N/A";
        let accountName = currentSeller?.account_name || "N/A";

        if (bankName === "N/A" || accountNumber === "N/A") {
            const payoutInfo = localStorage.getItem(`fp_payout_${currentSeller?.id}`);
            try {
                const parsed = payoutInfo ? JSON.parse(payoutInfo) : null;
                if (parsed) {
                    bankName = parsed.bank_name || bankName;
                    accountNumber = parsed.account_number || accountNumber;
                    accountName = parsed.account_name || accountName;
                }
            } catch {}
        }

        // Both fallbacks above only ever read PER-DEVICE local storage — a seller who
        // entered bank details during onboarding on a different device/browser (or after
        // a cache clear) would see neither, and get falsely told to set them up again
        // even though the DB has them. Ask the DB directly before giving up.
        if ((bankName === "N/A" || accountNumber === "N/A") && currentSeller?.id) {
            try {
                const authHeaders = (): Record<string, string> => {
                    const token = localStorage.getItem("fp_token");
                    return token ? { Authorization: `Bearer ${token}` } : {};
                };
                const res = await fetch(`/api/sellers/${currentSeller.id}`, { headers: authHeaders() });
                if (res.ok) {
                    const dbSeller = await res.json();
                    bankName = dbSeller.bankName || dbSeller.bank_name || bankName;
                    accountNumber = dbSeller.accountNumber || dbSeller.account_number || accountNumber;
                    accountName = dbSeller.accountName || dbSeller.account_name || accountName;
                }
            } catch { /* fall through to the setup prompt below */ }
        }

        if (bankName === "N/A" || accountNumber === "N/A") {
            const go = window.confirm("You haven't set up your payout details yet. Would you like to add your bank details now?");
            if (go) {
                router.push("/seller/settings/payouts#bank-details");
            }
            return;
        }

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

    // Clean, shareable store link — never expose the raw internal seller id
    // (e.g. "s_user_techzema@gmail.com"). Falls back to a slugified business name,
    // which the /store/[slug] route resolves via its business-name-slug branch.
    const cleanStoreSlug =
        safeSeller?.store_url ||
        (safeSeller?.business_name ? safeSeller.business_name.toLowerCase().replace(/\s+/g, "-") : "") ||
        safeSeller?.id ||
        "";
    const dashOrigin = typeof window !== "undefined" ? window.location.origin : "https://fairprice.ng";
    const dashDisplayOrigin = dashOrigin.replace(/^https?:\/\//, "");
    const cleanStoreUrl = `${dashOrigin}/store/${cleanStoreSlug}`;

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
            <SellerFeatureSpotlight sellerId={safeSeller.id} />

            {/* First alert: no WhatsApp on file yet — QR payments, WhatsApp product
                uploads, and negotiation alerts all require it. Deep-links straight to
                the activation control in Settings instead of just telling the seller
                to go find it themselves. */}
            {!((safeSeller as any).whatsapp_enabled && (safeSeller as any).whatsapp_number) && (
                <Link
                    href="/seller/settings#whatsapp-activate"
                    className="flex items-center justify-between gap-3 bg-amber-50 border border-amber-200 rounded-3xl p-4 shadow-sm hover:bg-amber-100/70 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-2xl bg-amber-100 flex items-center justify-center shrink-0">
                            <MessageSquare className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-sm font-black text-amber-900">Activate Ziva WhatsApp to unlock QR payments</p>
                            <p className="text-xs font-semibold text-amber-700 mt-0.5">Upload products, generate QR codes, and get instant order alerts — all tied to your own number.</p>
                        </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-amber-500 shrink-0" />
                </Link>
            )}

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
                        Share your store link to get more sales today.
                    </p>
                    {/* Store link — open · WhatsApp share · copy */}
                    <div className="mt-3 inline-flex items-center gap-1 max-w-full rounded-xl bg-zinc-50 border border-zinc-100 pl-3 pr-1 py-1">
                        <span className="text-[11px] sm:text-xs font-bold text-indigo-700 truncate mr-1">
                            {dashDisplayOrigin}/store/{cleanStoreSlug}
                        </span>
                        {/* Open */}
                        <Link href={`/store/${cleanStoreSlug}`} target="_blank" className="shrink-0">
                            <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg text-zinc-400 hover:text-indigo-600 hover:bg-white" title="Open store">
                                <ExternalLink className="h-3.5 w-3.5" />
                            </Button>
                        </Link>
                        {/* WhatsApp share */}
                        <a
                            href={`https://wa.me/?text=${encodeURIComponent(`Shop from my FairPrice store: ${cleanStoreUrl}`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 h-7 w-7 rounded-lg flex items-center justify-center text-emerald-600 hover:bg-emerald-50 transition-colors"
                            title="Share on WhatsApp"
                        >
                            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                            </svg>
                        </a>
                        {/* Copy */}
                        <Button
                            size="icon"
                            variant="ghost"
                            className={`h-7 w-7 rounded-lg shrink-0 transition-all ${copiedStoreLink ? "text-emerald-600 bg-emerald-50" : "text-zinc-400 hover:text-indigo-600 hover:bg-white"}`}
                            onClick={() => { navigator.clipboard.writeText(cleanStoreUrl); setCopiedStoreLink(true); setTimeout(() => setCopiedStoreLink(false), 2000); }}
                            title="Copy link"
                        >
                            {copiedStoreLink ? <CheckCircle className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        </Button>
                    </div>
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

            {/* ── First product CTA — new sellers had no clear next step after onboarding
                besides discovering the sidebar nav or noticing a notification, which
                dropped some sellers between KYC completion and their first product form
                visit. Only the sidebar/notification path existed before this. ── */}
            {products.length === 0 && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center">
                    <Package className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
                    <h3 className="font-bold text-lg text-gray-900">List your first product</h3>
                    <p className="text-sm text-gray-600 mt-1">Your store is live — start adding products so buyers can find you.</p>
                    <Link href="/seller/products/new">
                        <Button className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl">
                            Add Your First Product
                        </Button>
                    </Link>
                </div>
            )}

            {/* ── Important Alerts — foldable, newest first ── */}
            {sellerAlerts.length > 0 && (
                <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
                    <button
                        onClick={() => setAlertsExpanded(v => !v)}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-50/60 transition-colors"
                    >
                        <div className="flex items-center gap-2.5">
                            <div className="relative">
                                <div className="h-8 w-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                                    <Bell className="h-4 w-4 text-indigo-600" />
                                </div>
                                {sellerAlerts.some(a => !a.read) && (
                                    <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center border border-white">
                                        {sellerAlerts.filter(a => !a.read).length}
                                    </span>
                                )}
                            </div>
                            <div className="text-left">
                                <p className="text-sm font-black text-gray-900">Alerts</p>
                                <p className="text-[10px] text-gray-400 font-medium">New orders, negotiations, refunds & payouts</p>
                            </div>
                        </div>
                        {alertsExpanded
                            ? <ChevronUp className="h-4 w-4 text-gray-400" />
                            : <ChevronDown className="h-4 w-4 text-gray-400" />}
                    </button>
                    <div className="px-3 pb-3 space-y-1.5">
                        {(alertsExpanded ? sellerAlerts : sellerAlerts.slice(0, 2)).map((a) => (
                            <Link
                                key={a.id}
                                href={a.link || "/seller/dashboard/messages"}
                                className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${a.read ? "border-zinc-100 bg-white hover:bg-zinc-50" : "border-indigo-100 bg-indigo-50/40 hover:bg-indigo-50"}`}
                            >
                                <div className={`mt-0.5 h-2 w-2 rounded-full shrink-0 ${a.read ? "bg-zinc-300" : "bg-indigo-500"}`} />
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-gray-800 leading-snug line-clamp-2">{a.message}</p>
                                    <p className="text-[10px] text-gray-400 font-medium mt-0.5">
                                        {new Date(a.timestamp).toLocaleDateString("en-NG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                                    </p>
                                </div>
                                <ChevronRight className="h-3.5 w-3.5 text-zinc-300 shrink-0 mt-0.5" />
                            </Link>
                        ))}
                        {!alertsExpanded && sellerAlerts.length > 2 && (
                            <button
                                onClick={() => setAlertsExpanded(true)}
                                className="w-full text-center text-[11px] font-black text-indigo-500 hover:text-indigo-700 uppercase tracking-widest py-1.5"
                            >
                                Show {sellerAlerts.length - 2} more
                            </button>
                        )}
                    </div>
                </div>
            )}

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

            {/* ── Growth & Sharing Tools ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Store Link + FairPay QR — combined card */}
                {(() => {
                    const storeSlug = cleanStoreSlug;
                    const origin = dashOrigin;
                    const storeUrl = cleanStoreUrl;
                    const isPayMode = qrDesc.trim() !== "" || qrAmount.trim() !== "";
                    const paymentUrl = `${origin}/checkout/direct?sellerId=${safeSeller.id}&name=${encodeURIComponent(safeSeller.business_name || "")}&label=${encodeURIComponent(qrDesc.trim() || `Payment to ${safeSeller.business_name || "Seller"}`)}&image=${encodeURIComponent((safeSeller as any).logo_url || "")}${qrAmount ? `&amount=${qrAmount}` : ""}`;
                    const activeQrUrl = isPayMode ? paymentUrl : storeUrl;
                    const activeShareText = isPayMode
                        ? `${qrAmount ? `Pay ₦${parseInt(qrAmount).toLocaleString()} ` : ""}${qrDesc.trim() ? `for ${qrDesc.trim()} ` : ""}via FairPrice: ${paymentUrl}`
                        : `Check out my store on FairPrice: ${storeUrl}`;
                    const displayOrigin = origin.replace(/^https?:\/\//, "");

                    return (
                        <div className="bg-white rounded-3xl border border-zinc-100 shadow-sm overflow-hidden flex flex-col">
                            {/* ── Header — matches /seller/dashboard/payments design ── */}
                            <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-blue-500 to-emerald-500" />
                            <div className="px-6 pt-5 pb-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <div className="h-11 w-11 rounded-[16px] bg-gradient-to-br from-indigo-600 via-indigo-500 to-blue-500 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                                            <QrCode className="h-5 w-5 text-white" />
                                        </div>
                                        <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center">
                                            <BadgeCheck className="h-2.5 w-2.5 text-white" />
                                        </div>
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-baseline gap-1 whitespace-nowrap">
                                            <span className="text-lg font-black tracking-tight text-gray-900">FairPay</span>
                                            <span className="text-lg font-black tracking-tight bg-gradient-to-r from-indigo-600 to-blue-500 bg-clip-text text-transparent">QR&nbsp;Scan</span>
                                        </div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 -mt-0.5">Scan to Pay</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-700 text-[10px] font-black">
                                        <ShieldCheck className="h-3 w-3" /> Secure
                                    </div>
                                    <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-black">
                                        <Zap className="h-3 w-3 fill-indigo-500" /> Instant
                                    </div>
                                </div>
                            </div>
                            <div className="px-6 pb-0">
                                <p className="text-xs text-gray-500 font-medium">Generate a QR or link to collect payment in seconds.</p>
                            </div>
                            <div className="px-6 pt-4">

                            {/* ── Collect a Payment ── always green/active */}
                            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 mb-4">
                                <p className="text-[10px] font-black uppercase tracking-widest mb-3 flex items-center gap-1.5 text-emerald-600">
                                    <QrCode className="h-3.5 w-3.5 text-emerald-500" />
                                    {isPayMode ? "Payment QR — Ready to share" : "Collect a Payment"}
                                </p>

                                <div className="space-y-2.5">
                                    {/* Description */}
                                    <div>
                                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1 block">
                                            What's this payment for?
                                        </label>
                                        <input
                                            value={qrDesc}
                                            onChange={e => setQrDesc(e.target.value)}
                                            placeholder="e.g. iPhone case, School fees, 2 bags of rice…"
                                            className="w-full h-10 px-3 rounded-xl border border-emerald-200 bg-white text-sm font-medium placeholder:text-zinc-300 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
                                        />
                                    </div>
                                    {/* Amount */}
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-black text-sm pointer-events-none">₦</span>
                                        <input
                                            type="number"
                                            value={qrAmount}
                                            onChange={e => setQrAmount(e.target.value)}
                                            placeholder="Amount — leave blank for open amount"
                                            className="w-full h-10 pl-8 pr-3 rounded-xl border border-emerald-200 bg-white text-sm font-medium placeholder:text-zinc-300 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
                                        />
                                    </div>
                                </div>

                                {isPayMode && (
                                    <button
                                        onClick={() => { setQrDesc(""); setQrAmount(""); }}
                                        className="mt-2.5 text-[11px] font-bold text-zinc-400 hover:text-zinc-600 transition-colors"
                                    >
                                        ✕ Clear — back to store QR
                                    </button>
                                )}
                            </div>

                            {/* Customer Scans + Instant Sync info tiles */}
                            <div className="grid grid-cols-2 gap-2 mb-4">
                                {[
                                    { icon: Smartphone, color: "blue", title: "Customer Scans", desc: "Works with any smartphone camera. No app download required." },
                                    { icon: Zap, color: "emerald", title: "Instant Sync", desc: "Payment credited to your balance instantly upon success." },
                                ].map(({ icon: Icon, color, title, desc }) => (
                                    <div key={title} className={`rounded-2xl p-3 border flex flex-col gap-2 ${color === "blue" ? "bg-blue-50/60 border-blue-100" : "bg-emerald-50/60 border-emerald-100"}`}>
                                        <div className={`h-8 w-8 rounded-xl flex items-center justify-center ${color === "blue" ? "bg-blue-100 text-blue-600" : "bg-emerald-100 text-emerald-600"}`}>
                                            <Icon className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-gray-900">{title}</p>
                                            <p className="text-[10px] font-medium text-gray-500 mt-0.5 leading-relaxed">{desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* QR display */}
                            <div className="flex flex-col items-center gap-3">
                                <div className={`p-3 rounded-2xl border shadow-sm relative group transition-all duration-300 ${isPayMode ? "border-emerald-200 bg-white shadow-emerald-100" : "border-zinc-100 bg-white"}`}>
                                    {isPayMode && (
                                        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full shadow-md whitespace-nowrap">
                                            💳 Payment QR
                                        </span>
                                    )}
                                    <QRCodeCanvas
                                        id="dashboard-active-qr"
                                        value={activeQrUrl}
                                        size={120}
                                        level="H"
                                        imageSettings={{
                                            src: (safeSeller as any).logo_url || "/logo.svg",
                                            x: undefined, y: undefined, height: 22, width: 22, excavate: true,
                                        }}
                                        className="rounded-lg block"
                                    />
                                    <Button
                                        size="icon"
                                        variant="secondary"
                                        title="Download QR"
                                        className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full shadow-lg border border-white"
                                        onClick={() => {
                                            const canvas = document.getElementById("dashboard-active-qr") as HTMLCanvasElement;
                                            if (canvas) {
                                                const link = document.createElement("a");
                                                link.href = canvas.toDataURL("image/png");
                                                link.download = `${safeSeller.business_name}-${isPayMode ? "payment" : "store"}-QR.png`;
                                                link.click();
                                            }
                                        }}
                                    >
                                        <Download className="h-3 w-3" />
                                    </Button>
                                </div>

                                <p className="text-[11px] text-center text-zinc-400 font-medium max-w-[200px] leading-snug">
                                    {isPayMode
                                        ? qrAmount
                                            ? `Scan to pay ₦${parseInt(qrAmount || "0").toLocaleString()}${qrDesc.trim() ? ` for ${qrDesc.trim()}` : ""}`
                                            : `Scan to pay${qrDesc.trim() ? ` for ${qrDesc.trim()}` : ""}`
                                        : "Scan to browse your store"}
                                </p>

                                {/* Copy payment link */}
                                {isPayMode && (
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(paymentUrl);
                                            setCopiedPayLink(true);
                                            setTimeout(() => setCopiedPayLink(false), 2000);
                                        }}
                                        className={`flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all ${copiedPayLink ? "bg-emerald-50 text-emerald-600" : "bg-zinc-100 text-zinc-500 hover:bg-emerald-50 hover:text-emerald-600"}`}
                                    >
                                        {copiedPayLink ? <CheckCircle className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                        {copiedPayLink ? "Link copied!" : "Copy payment link"}
                                    </button>
                                )}
                            </div>

                            </div>{/* end px-6 pt-4 */}

                            {/* Social share row */}
                            <div className="flex justify-center gap-3 mt-4 pt-4 px-6 pb-4 border-t border-zinc-50">
                                <a href={`https://wa.me/?text=${encodeURIComponent(activeShareText)}`} target="_blank" rel="noopener noreferrer"
                                    className="h-10 w-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-200 hover:scale-110 transition-all" title="Share on WhatsApp">
                                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                                </a>
                                <a href="https://instagram.com" target="_blank" rel="noopener noreferrer"
                                    className="h-10 w-10 rounded-xl bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-pink-200 hover:scale-110 transition-all" title="Share on Instagram">
                                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                                </a>
                                <a href="https://facebook.com" target="_blank" rel="noopener noreferrer"
                                    className="h-10 w-10 rounded-xl bg-[#1877F2] text-white flex items-center justify-center shadow-lg shadow-blue-200 hover:scale-110 transition-all" title="Share on Facebook">
                                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                                </a>
                                <Link href="/seller/dashboard/payments">
                                    <div className="h-10 w-10 rounded-xl bg-zinc-800 text-white flex items-center justify-center shadow-lg shadow-zinc-300 hover:scale-110 transition-all" title="Full FairPay dashboard">
                                        <QrCode className="h-4 w-4" />
                                    </div>
                                </Link>
                            </div>

                            {/* ── Recent Payment Links ── */}
                            {(() => {
                                const recentInvoices = offListingInvoices.slice(0, 3);
                                return (
                                    <div className="px-6 pb-6">
                                        {/* How it works */}
                                        <div className="bg-zinc-50 rounded-2xl p-4 mb-3 border border-zinc-100">
                                            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2.5">How Payment QR Works</p>
                                            <ol className="space-y-1.5">
                                                {[
                                                    "Enter amount + description (optional), QR updates live",
                                                    "Share the QR or payment link with your customer",
                                                    "Customer scans → goes straight to FairPrice checkout",
                                                    "Payment is secured in FairPrice escrow until delivery",
                                                ].map((step, i) => (
                                                    <li key={i} className="flex items-start gap-2 text-[11px] text-zinc-600 font-medium">
                                                        <span className="shrink-0 h-4 w-4 rounded-full bg-indigo-100 text-indigo-600 text-[9px] font-black flex items-center justify-center mt-0.5">{i + 1}</span>
                                                        {step}
                                                    </li>
                                                ))}
                                            </ol>
                                        </div>

                                        {/* Recent links */}
                                        {recentInvoices.length > 0 && (
                                            <>
                                                <div className="flex items-center justify-between mb-2">
                                                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Recent Payment Links</p>
                                                    <Link href="/seller/dashboard/payments" className="text-[10px] font-black text-indigo-500 hover:text-indigo-700 uppercase tracking-widest">
                                                        View All →
                                                    </Link>
                                                </div>
                                                <div className="space-y-2">
                                                    {recentInvoices.map((inv: any) => (
                                                        <Link key={inv.id} href="/seller/dashboard/payments" className="flex items-center gap-3 p-3 rounded-2xl border border-zinc-100 bg-white hover:bg-zinc-50 hover:border-indigo-100 transition-all group">
                                                            <div className="h-9 w-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0 group-hover:bg-indigo-100 transition-colors">
                                                                <QrCode className="h-4 w-4 text-indigo-500" />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-xs font-bold text-gray-900 truncate">{inv.label || "Payment"}</p>
                                                                <p className="text-[10px] text-gray-400 font-medium">{new Date(inv.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}</p>
                                                            </div>
                                                            <div className="text-right shrink-0">
                                                                <p className="text-sm font-black text-gray-900">{inv.amount > 0 ? `₦${Number(inv.amount).toLocaleString()}` : "Open"}</p>
                                                                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${inv.status === "paid" ? "bg-emerald-100 text-emerald-600" : inv.status === "revoked" ? "bg-red-100 text-red-500" : "bg-amber-100 text-amber-600"}`}>
                                                                    {inv.status}
                                                                </span>
                                                            </div>
                                                        </Link>
                                                    ))}
                                                </div>
                                            </>
                                        )}

                                        {recentInvoices.length === 0 && (
                                            <Link href="/seller/dashboard/payments" className="flex items-center justify-center gap-2 h-11 rounded-xl border-2 border-dashed border-brand-green-400 hover:border-brand-green-600 bg-brand-green-50/50 hover:bg-brand-green-50 text-gray-900 hover:text-brand-green-700 text-[11px] font-black uppercase tracking-wide transition-all active:scale-[0.98] shadow-sm">
                                                <QrCode className="h-4 w-4" /> Generate your first payment link →
                                            </Link>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>
                    );
                })()}

                {/* WhatsApp Sync Card */}
                <WhatsAppCatalogImporter />

                {/* Instagram Sync Card */}
                <InstagramCatalogImporter />
            </div>

            {/* Custom Subdomain CTA (Moved below sharing tools) */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-[32px] p-6 border border-amber-100 shadow-sm">
                <div className="flex-1 min-w-0 w-full">
                    <div className="flex items-center gap-1.5 mb-2">
                        <Crown className="h-4 w-4 text-amber-500" />
                        <p className="text-xs font-black text-amber-600 uppercase tracking-wider">Premium Store Link</p>
                    </div>
                    <div className="flex items-center bg-white border border-amber-200 rounded-xl overflow-hidden shadow-sm focus-within:ring-2 ring-amber-500/20 max-w-sm w-full">
                        <input 
                            type="text"
                            value={subdomainInput}
                            onChange={(e) => setSubdomainInput(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                            className="flex-1 min-w-0 px-4 py-2.5 text-sm font-bold text-zinc-700 outline-none placeholder:text-zinc-300"
                            placeholder="yourstore"
                        />
                        <div className="px-4 py-2.5 bg-zinc-50 border-l border-amber-100 text-sm font-bold text-zinc-500 whitespace-nowrap">
                            .fairprice.ng
                        </div>
                    </div>
                </div>
                <Button
                    onClick={handleSubdomainUpgrade}
                    className="w-full sm:w-auto h-12 px-8 rounded-xl text-sm font-black bg-zinc-900 hover:bg-zinc-800 text-white shadow-xl transition-all hover:scale-105 active:scale-95 whitespace-nowrap"
                >
                    <Crown className="h-4 w-4 mr-2" /> Upgrade to Custom Link
                </Button>
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
                        <button
                            onClick={handleCashout}
                            disabled={availableBalance <= 0 || cashoutSuccess}
                            className="mt-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-200 disabled:text-zinc-400 disabled:cursor-not-allowed rounded-full px-4 py-1.5 transition-colors"
                        >
                            {cashoutSuccess ? "Requested ✓" : "Request Payout"}
                        </button>
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
                        amount={payouts.filter(p => p.status === "pending" || p.status === "processing").reduce((s, p) => s + (p.amount || 0), 0)}
                        status="pending"
                        icon={<TrendingUp className="h-4 w-4" />}
                        description="Awaiting bank transfer"
                        active={payouts.some(p => p.status === "pending" || p.status === "processing")}
                    />
                    <PayoutStep
                        label="Paid Out"
                        amount={payouts.filter(p => p.status === "completed").reduce((s, p) => s + (p.amount || 0), 0)}
                        status="completed"
                        icon={<CheckCircle className="h-4 w-4" />}
                        description="Settled to account"
                        active={payouts.some(p => p.status === "completed")}
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
