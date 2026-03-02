"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
    ArrowLeft,
    Mail,
    Phone,
    MapPin,
    Calendar,
    Shield,
    ShieldCheck,
    Ban,
    ExternalLink,
    Store,
    ShoppingBag,
    Star,
    CheckCircle2,
    Clock,
    CreditCard,
    DollarSign,
    Package
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DemoStore } from "@/lib/demo-store";
import { Seller, User, Order } from "@/lib/types";

export default function AdminUserDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params?.id as string;

    const [mounted, setMounted] = useState(false);
    const [userEntity, setUserEntity] = useState<any>(null);
    const [orders, setOrders] = useState<Order[]>([]);

    useEffect(() => {
        setMounted(true);
        if (id) {
            // Check if seller
            const allSellers = DemoStore.getSellers();
            const sellerMatch = allSellers.find(s => s.id === id);

            // Or look in orders to build a mock buyer entity
            const allOrders = DemoStore.getOrders();
            let buyerMatch = null;
            if (!sellerMatch) {
                const buyerOrders = allOrders.filter(o => o.customer_id === id);
                if (buyerOrders.length > 0) {
                    buyerMatch = {
                        id,
                        business_name: buyerOrders[0].customer_name || `Buyer ${id}`,
                        email: "buyer@example.com", // Mock
                        phone: "08012345678", // Mock
                        role: "buyer",
                        status: "active",
                        created_at: "2024-01-10T10:00:00Z",
                    };
                }
            }

            setUserEntity(sellerMatch ? { ...sellerMatch, role: "seller" } : buyerMatch);

            // Load orders associated with the user
            if (sellerMatch) {
                setOrders(allOrders.filter(o => o.seller_id === id));
            } else if (buyerMatch) {
                setOrders(allOrders.filter(o => o.customer_id === id));
            }
        }
    }, [id]);

    if (!mounted) return null;

    if (!userEntity) {
        return (
            <div className="p-8 text-center">
                <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Shield className="h-8 w-8 text-gray-400" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">User Not Found</h2>
                <p className="text-gray-500 mb-6">Could not locate a user or seller with ID: {id}</p>
                <Button onClick={() => router.back()} variant="outline">
                    <ArrowLeft className="h-4 w-4 mr-2" /> Back to Directory
                </Button>
            </div>
        );
    }

    const isSeller = userEntity.role === "seller";

    // Calculate metrics
    const totalOrderVolume = orders.reduce((sum, o) => sum + o.amount, 0);
    const completedOrders = orders.filter(o => o.status === "delivered").length;
    const pendingOrders = orders.filter(o => o.status === "processing" || o.status === "shipped").length;

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {/* Nav */}
            <div className="flex items-center justify-between">
                <Button variant="ghost" className="text-gray-600 hover:bg-gray-100 -ml-4" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Users
                </Button>

                <div className="flex gap-2">
                    <Button variant="outline" className="text-indigo-600 border-indigo-200 hover:bg-indigo-50">
                        <Mail className="h-4 w-4 mr-2" /> Message User
                    </Button>
                    {isSeller && (
                        <Button variant="outline" className="text-emerald-600 border-emerald-200 hover:bg-emerald-50" asChild>
                            <Link href={`/store/${userEntity.store_url || userEntity.id}`} target="_blank">
                                <Store className="h-4 w-4 mr-2" /> View Storefront
                            </Link>
                        </Button>
                    )}
                    <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700">
                        <Ban className="h-4 w-4 mr-2" /> Suspend
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Col: Profile Card */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className={`h-24 ${isSeller ? 'bg-gradient-to-r from-emerald-500 to-teal-600' : 'bg-gradient-to-r from-blue-500 to-indigo-600'}`}></div>
                        <div className="px-6 pb-6 relative">
                            <div className="absolute -top-12 left-6 h-24 w-24 bg-white rounded-full p-1 border border-gray-100 shadow-sm">
                                <div className="h-full w-full bg-gray-100 rounded-full flex items-center justify-center overflow-hidden">
                                    {userEntity.logo_url && userEntity.logo_url !== '/assets/images/placeholder.png' ? (
                                        <img src={userEntity.logo_url} alt="Profile" className="h-full w-full object-cover" />
                                    ) : (
                                        <span className="text-3xl font-black text-gray-400">{userEntity.business_name.charAt(0)}</span>
                                    )}
                                </div>
                            </div>

                            <div className="mt-14 mb-4">
                                <div className="flex items-center gap-2 mb-1">
                                    <h1 className="text-xl font-bold text-gray-900">{userEntity.business_name}</h1>
                                    {(userEntity.verified || userEntity.kyc_status === 'approved') && (
                                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                    )}
                                </div>
                                <div className="flex items-center gap-2 mb-3 text-sm">
                                    <Badge variant="secondary" className={isSeller ? 'bg-indigo-50 text-indigo-700' : 'bg-gray-100 text-gray-700'}>
                                        {userEntity.role.toUpperCase()}
                                    </Badge>
                                    <Badge variant="outline" className={userEntity.status === 'active' ? 'border-emerald-200 text-emerald-700 bg-emerald-50' : 'border-red-200 text-red-700'}>
                                        {userEntity.status}
                                    </Badge>
                                </div>
                                <p className="text-xs text-gray-500 font-medium">ID: {userEntity.id}</p>
                            </div>

                            <div className="space-y-3 pt-4 border-t border-gray-100 text-sm">
                                <div className="flex items-center text-gray-600">
                                    <Mail className="h-4 w-4 mr-3 text-gray-400" />
                                    {userEntity.email || "No email on file"}
                                </div>
                                <div className="flex items-center text-gray-600">
                                    <Phone className="h-4 w-4 mr-3 text-gray-400" />
                                    {userEntity.phone || "No phone on file"}
                                </div>
                                <div className="flex items-start text-gray-600">
                                    <MapPin className="h-4 w-4 mr-3 text-gray-400 shrink-0 mt-0.5" />
                                    <span className="line-clamp-2">
                                        {isSeller
                                            ? `${userEntity.street_address || ''} ${userEntity.city || ''} ${userEntity.state || ''}`.trim() || userEntity.address || "No address on file"
                                            : "No address on file"}
                                    </span>
                                </div>
                                <div className="flex items-center text-gray-600">
                                    <Calendar className="h-4 w-4 mr-3 text-gray-400" />
                                    Joined {new Date(userEntity.created_at).toLocaleDateString()}
                                </div>
                            </div>
                        </div>
                    </div>

                    {isSeller && (
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                            <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <ShieldCheck className="h-5 w-5 text-indigo-600" />
                                KYC & Business Details
                            </h3>

                            <div className="space-y-4 text-sm">
                                <div className="flex justify-between items-center py-2 border-b border-gray-50">
                                    <span className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Plan</span>
                                    <Badge variant="outline" className="border-indigo-200 text-indigo-700 bg-indigo-50 font-bold">
                                        {(userEntity.subscription_plan || 'free').toUpperCase()}
                                    </Badge>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-gray-50">
                                    <span className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Fee Override</span>
                                    <span className="font-bold text-gray-900">
                                        {userEntity.commission_rate !== undefined
                                            ? `${(userEntity.commission_rate * 100).toFixed(1)}%`
                                            : "Follows Plan Tier"}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-gray-50">
                                    <span className="text-gray-500 text-xs font-semibold uppercase tracking-wider">KYC Status</span>
                                    <Badge className={userEntity.kyc_status === 'approved' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-amber-500 hover:bg-amber-600'}>
                                        {userEntity.kyc_status || 'Pending'}
                                    </Badge>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-gray-50">
                                    <span className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Registered</span>
                                    <span className="font-bold text-gray-900">
                                        {userEntity.business_registered ? 'Yes' : 'No'}
                                    </span>
                                </div>
                                {userEntity.cac_rc_number && (
                                    <div className="flex justify-between items-center py-2 border-b border-gray-50">
                                        <span className="text-gray-500 text-xs font-semibold uppercase tracking-wider">RC Number</span>
                                        <span className="font-mono text-gray-900 bg-gray-100 px-2 rounded">
                                            {userEntity.cac_rc_number}
                                        </span>
                                    </div>
                                )}
                                {userEntity.cac_document_url && (
                                    <div className="pt-2">
                                        <a
                                            href={userEntity.cac_document_url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg border border-gray-200 text-sm font-medium hover:bg-gray-50 transition-colors cursor-pointer"
                                        >
                                            <ExternalLink className="h-4 w-4 text-gray-400" />
                                            View CAC Certificate
                                        </a>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Col: Stats & Orders */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Stats */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="h-8 w-8 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0">
                                    <DollarSign className="h-4 w-4 text-emerald-600" />
                                </div>
                                <span className="text-sm font-medium text-gray-500 uppercase tracking-widest leading-none">Total Volume</span>
                            </div>
                            <span className="text-2xl font-black text-gray-900">₦{totalOrderVolume.toLocaleString()}</span>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                                    <Package className="h-4 w-4 text-blue-600" />
                                </div>
                                <span className="text-sm font-medium text-gray-500 uppercase tracking-widest leading-none">Completed</span>
                            </div>
                            <span className="text-2xl font-black text-gray-900">{completedOrders}</span>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="h-8 w-8 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0">
                                    <Clock className="h-4 w-4 text-amber-600" />
                                </div>
                                <span className="text-sm font-medium text-gray-500 uppercase tracking-widest leading-none">Pending / Active</span>
                            </div>
                            <span className="text-2xl font-black text-gray-900">{pendingOrders}</span>
                        </div>
                    </div>

                    {/* Order History Table */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-gray-900">
                                {isSeller ? "Store Orders" : "Purchase History"}
                            </h3>
                            <Badge variant="secondary">{orders.length} Records</Badge>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50/50">
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Order ID</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">{isSeller ? "Customer" : "Store"}</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Amount</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {orders.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                                No orders found for this user.
                                            </td>
                                        </tr>
                                    ) : (
                                        orders.map((o) => (
                                            <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <span className="font-mono text-sm text-gray-900 font-medium">#{o.id}</span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-500">
                                                    {new Date(o.created_at).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                                    {isSeller ? o.customer_name || 'Anonymous' : o.seller_name || 'FairPrice Global'}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="font-bold text-gray-900">₦{o.amount.toLocaleString()}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <Badge className={
                                                        o.status === 'delivered' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' :
                                                            o.status === 'processing' ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' :
                                                                o.status === 'cancelled' ? 'bg-red-100 text-red-700 hover:bg-red-200' :
                                                                    'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                                    } variant="secondary">
                                                        {o.status}
                                                    </Badge>
                                                    {o.escrow_status && o.status !== 'cancelled' && (
                                                        <div className="text-[10px] mt-1 font-medium text-gray-400 uppercase">
                                                            Escrow: {o.escrow_status}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <Button variant="ghost" size="sm" className="text-gray-500 hover:text-indigo-600 font-medium">
                                                        Details
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
