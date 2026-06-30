"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Package, User, CreditCard, Lock, MapPin, MessageSquare, Heart, Share2, Store, Ticket, Copy, Check, LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { DataSyncService } from "@/lib/sync-store";
import { useState, useEffect } from "react";
import { DeleteAccountSection } from "@/components/account/DeleteAccountSection";

import { useRouter } from "next/navigation";

export default function AccountPage() {
    const { user, logout } = useAuth();
    const router = useRouter();

    // Check if user is already a seller
    const [isSeller, setIsSeller] = useState(false);
    useEffect(() => {
        if (user) {
            // Background sync for the buyer's orders/negotiations
            DataSyncService.autoSync();

            if (user.role === 'seller' || user.role === 'admin') {
                setIsSeller(true);
                return;
            }
            const sellers = DataSyncService.getSellers();
            const localMatch = sellers.some(s => s.owner_email === user.email || s.user_id === user.id || s.id === user.id);
            if (localMatch) {
                setIsSeller(true);
            } else {
                fetch('/api/sellers?all=true')
                    .then(res => res.json())
                    .then(data => {
                        const sers = Array.isArray(data) ? data : [];
                        const match = sers.some((s: any) =>
                            s.owner_email === user.email ||
                            s.user_id === user.id ||
                            s.id === user.id
                        );
                        setIsSeller(match);
                    })
                    .catch(() => setIsSeller(false));
            }
        } else {
            setIsSeller(false);
        }
    }, [user]);

    const sellerCard = isSeller
        ? { icon: Store, title: "Seller Dashboard", desc: "Manage your store, orders & payouts", href: "/seller/dashboard" }
        : { icon: Store, title: "Become a Seller", desc: "Start selling on FairPrice today", href: "/seller/onboarding" };

    const cards = [
        {
            icon: Package,
            title: "Your Orders",
            desc: "Track, return, or buy things again",
            href: "/account/orders"
        },
        sellerCard,
        {
            icon: User,
            title: "Prime / FairPrice Premium",
            desc: "View benefits and payment settings",
            href: "/account/premium"
        },
        {
            icon: Lock,
            title: "Login & security",
            desc: "Update profile picture, and login details",
            href: "/account/profile"
        },
        {
            icon: MapPin,
            title: "Your Addresses",
            desc: "Edit addresses for orders and gifts",
            href: "/account/addresses"
        },
        {
            icon: CreditCard,
            title: "Your Payments",
            desc: "Manage payment methods and settings",
            href: "/account/payments"
        },
        {
            icon: Share2,
            title: "Referrals",
            desc: "Invite friends and earn rewards",
            href: "/account/referrals"
        },
        {
            icon: Ticket,
            title: "Coupon Balance",
            desc: "View and manage your coupons",
            href: "/account/coupons"
        }
    ];



    const [couponBalance, setCouponBalance] = useState(0);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (user) {
            const coupons = DataSyncService.getActiveCoupons(user.id || user.email || "");
            const total = coupons.reduce((sum, c) => sum + c.amount, 0);
            setCouponBalance(total);
        }
    }, [user]);

    const handleCopyReferral = async () => {
        if (!user) return;
        // Keep full encoded ID so we can decode it later on checkout
        const refCode = user.id ? btoa(user.id).replace(/=/g, '') : "DEMOREF";
        const origin = window.location.origin.includes('localhost') ? 'https://fairprice-ten.vercel.app' : window.location.origin;
        const link = `${origin}/?ref=${refCode}`;

        const { copyToClipboard } = await import("@/lib/utils");
        const success = await copyToClipboard(link);

        if (success) {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="min-h-screen bg-white flex flex-col font-sans">
            <Navbar />

            <main className="flex-1 container mx-auto px-4 py-8 max-w-5xl">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-2xl font-bold text-gray-900 leading-tight">Hello, {(user?.name || user?.email || "there").split(" ")[0]}</h1>
                </div>

                {/* Prominent Coupon & Referral Banner */}
                <div className="mb-8 rounded-2xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6" style={{ background: 'linear-gradient(135deg, #065f46 0%, #047857 40%, #b8860b 100%)' }}>
                    {/* Background decoration */}
                    <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                        <Ticket className="w-48 h-48 rotate-12" />
                    </div>

                    <div className="flex-1 relative z-10 text-center md:text-left">
                        <p className="text-brand-green-100 font-medium mb-1 uppercase tracking-wider text-sm flex items-center justify-center md:justify-start gap-2">
                            <Ticket className="w-4 h-4" /> Available Coupon Balance
                        </p>
                        <div className="text-4xl md:text-5xl font-black mb-2 tracking-tight">
                            ₦{couponBalance.toLocaleString()}
                        </div>
                        <p className="text-brand-green-100 text-sm max-w-md mx-auto md:mx-0">
                            Apply these coupons at checkout to save on your next order.
                        </p>
                    </div>

                    <div className="relative z-10 w-full md:w-auto backdrop-blur-sm rounded-xl p-5 border border-white/20 text-center flex flex-col items-center" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(184,134,11,0.25) 100%)' }}>
                        <div className="bg-brand-orange text-brand-orange-foreground text-xs font-bold px-3 py-1 rounded-full mb-3 inline-block">
                            Earn More!
                        </div>
                        <p className="font-bold text-sm mb-4">
                            Get ₦5,000 for every friend who shops.
                        </p>
                        <Button
                            onClick={handleCopyReferral}
                            className={`w-full rounded-full font-bold h-11 transition-all ${copied
                                ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                                : "bg-white text-brand-green-900 hover:bg-gray-100"
                                }`}
                        >
                            {copied ? (
                                <>
                                    <Check className="w-4 h-4 mr-2" />
                                    Copied!
                                </>
                            ) : (
                                <>
                                    <Copy className="w-4 h-4 mr-2" />
                                    Copy Referral Link
                                </>
                            )}
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {cards.map((card, i) => (
                        <Link href={card.href} key={i} className="block group">
                            <div className="border border-gray-300 rounded-lg p-6 flex items-start gap-4 hover:bg-gray-50 transition-colors h-full">
                                <div className="bg-gray-100 p-3 rounded-full group-hover:bg-brand-green-100 group-hover:text-brand-green-700 transition-colors">
                                    <card.icon className="h-8 w-8 text-gray-500 group-hover:text-brand-green-700" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-normal text-gray-900 group-hover:underline decoration-brand-orange">{card.title}</h3>
                                    <p className="text-sm text-gray-500 mt-1">{card.desc}</p>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>

                {/* In-app account deletion (App Store 5.1.1(v) / NDPR right to erasure) */}
                <DeleteAccountSection />

                {/* Secondary navigation or support links could go here */}
                <div className="mt-8 pb-10" />
            </main>

            <Footer />
        </div>
    );
}
