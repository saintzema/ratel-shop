"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Copy, ChevronLeft, Ticket, CheckCircle2, Clock, Info } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { DemoStore } from "@/lib/demo-store";
import { Coupon } from "@/lib/types";

export default function CouponsPage() {
    const { user } = useAuth();
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    useEffect(() => {
        if (user) {
            setCoupons(DemoStore.getCoupons(user.id));
        }
    }, [user]);

    const handleCopy = (code: string, id: string) => {
        navigator.clipboard.writeText(code);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    if (!user) return null;

    const now = new Date().toISOString();

    const activeCoupons = coupons.filter(c => !c.isUsed && !c.revokedAt && c.expiresAt > now);
    const pastCoupons = coupons.filter(c => c.isUsed || c.revokedAt || c.expiresAt <= now);

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            <Navbar />

            <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
                <div className="mb-6 flex items-center gap-4">
                    <Link href="/account" className="text-brand-green-600 hover:text-brand-green-700">
                        <ChevronLeft className="h-6 w-6" />
                    </Link>
                    <h1 className="text-2xl font-bold text-gray-900">Your Coupons</h1>
                </div>

                {/* Active Coupons Section */}
                <div className="mb-10">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <Ticket className="h-5 w-5 text-brand-green-600" />
                        Active Coupons ({activeCoupons.length})
                    </h2>

                    {activeCoupons.length === 0 ? (
                        <div className="bg-white rounded-xl p-8 text-center border border-gray-100 shadow-sm">
                            <Ticket className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                            <h3 className="text-lg font-medium text-gray-900">No active coupons</h3>
                            <p className="text-gray-500 mt-1 max-w-md mx-auto">
                                You don't have any active coupons at the moment. Invite friends or participate in promotions to earn rewards.
                            </p>
                            <Link href="/account/referrals">
                                <Button className="mt-4 bg-brand-green-600 hover:bg-brand-green-700">
                                    Refer Friends
                                </Button>
                            </Link>
                        </div>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2">
                            {activeCoupons.map(coupon => (
                                <div key={coupon.id} className="bg-white border-2 border-brand-green-100 rounded-xl overflow-hidden shadow-sm relative group">
                                    <div className="absolute top-0 right-0 p-2 opacity-50">
                                        <Ticket className="h-16 w-16 text-brand-green-50 -rotate-12" />
                                    </div>
                                    <div className="p-5 relative z-10">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="text-3xl font-black text-brand-green-600">
                                                ₦{coupon.amount.toLocaleString()}
                                            </div>
                                            <div className="bg-brand-orange text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">
                                                Active
                                            </div>
                                        </div>
                                        <p className="text-sm text-gray-600 mb-4 font-medium line-clamp-2 title-font">
                                            {coupon.reason}
                                        </p>
                                        <div className="bg-gray-50 rounded-lg p-3 flex justify-between items-center border border-gray-200">
                                            <div>
                                                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold mb-0.5">Coupon Code</p>
                                                <p className="font-mono font-bold text-gray-900 text-lg tracking-wider">{coupon.code}</p>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-brand-green-600 hover:text-brand-green-700 hover:bg-brand-green-50 gap-1.5"
                                                onClick={() => handleCopy(coupon.code, coupon.id)}
                                            >
                                                {copiedId === coupon.id ? (
                                                    <><CheckCircle2 className="h-4 w-4" /> Copied</>
                                                ) : (
                                                    <><Copy className="h-4 w-4" /> Copy</>
                                                )}
                                            </Button>
                                        </div>
                                        <p className="text-xs text-brand-orange mt-3 flex items-center gap-1 font-medium">
                                            <Clock className="h-3.5 w-3.5" />
                                            Expires: {new Date(coupon.expiresAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Past Coupons Section */}
                {pastCoupons.length > 0 && (
                    <div>
                        <h2 className="text-lg font-semibold text-gray-600 mb-4 flex items-center gap-2">
                            <Clock className="h-5 w-5" />
                            Past Coupons
                        </h2>
                        <div className="grid gap-3 md:grid-cols-2">
                            {pastCoupons.map(coupon => {
                                const isUsed = coupon.isUsed;
                                const isExpired = !isUsed && coupon.expiresAt <= now;
                                const isRevoked = !!coupon.revokedAt;

                                let statusText = "Used";
                                let statusColor = "bg-blue-100 text-blue-700";

                                if (isRevoked) {
                                    statusText = "Revoked";
                                    statusColor = "bg-red-100 text-red-700";
                                } else if (isExpired) {
                                    statusText = "Expired";
                                    statusColor = "bg-gray-200 text-gray-600";
                                }

                                return (
                                    <div key={coupon.id} className="bg-white border border-gray-200 rounded-xl p-4 flex gap-4 opacity-75">
                                        <div className="bg-gray-100 h-16 w-16 rounded-lg flex flex-col items-center justify-center shrink-0">
                                            <span className="text-[10px] text-gray-500 font-bold uppercase">Value</span>
                                            <span className="font-bold text-gray-700">₦{(coupon.amount / 1000).toFixed(0)}k</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start mb-1">
                                                <p className="font-mono text-sm font-bold text-gray-500">{coupon.code}</p>
                                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${statusColor}`}>
                                                    {statusText}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-500 line-clamp-1 mb-1">{coupon.reason}</p>
                                            <p className="text-[10px] text-gray-400">
                                                {isUsed ? `Used on ${new Date(coupon.usedAt!).toLocaleDateString()}` : `Expired ${new Date(coupon.expiresAt).toLocaleDateString()}`}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </main>

            <Footer />
        </div>
    );
}
