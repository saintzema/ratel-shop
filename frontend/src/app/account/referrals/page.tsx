"use client";

import { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { useAuth } from "@/context/AuthContext";
import { DemoStore } from "@/lib/demo-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Share2, Copy, Users, CheckCircle2, Trophy, Coins, ChevronRight, Clock } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function ReferralsPage() {
    const { user } = useAuth();
    const [referralLink, setReferralLink] = useState("");
    const [copied, setCopied] = useState(false);
    const [stats, setStats] = useState({ total_referred: 0, pending_rewards: 0, earned_rewards: 0 });
    const [referralsList, setReferralsList] = useState<any[]>([]);

    useEffect(() => {
        if (user) {
            // Generate link based on user's referral code or ID
            const code = user.referralCode || user.id.slice(0, 8);
            setReferralLink(`${window.location.origin}/?ref=${code}`);

            // Fetch stats from DemoStore
            // Fetch stats from DemoStore
            const referrals = DemoStore.getReferrals(user.id) || [];
            const completed = referrals.filter((r: any) => r.status === "completed");
            setStats({
                total_referred: referrals.length,
                pending_rewards: referrals.length - completed.length,
                earned_rewards: completed.length
            });
            setReferralsList(referrals);
        }
    }, [user]);

    const handleCopy = () => {
        navigator.clipboard.writeText(referralLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (!user) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
                <Navbar />
                <main className="flex-1 flex items-center justify-center p-4">
                    <div className="text-center bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-md w-full">
                        <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-gray-900 mb-2">Sign in to view referrals</h2>
                        <p className="text-sm text-gray-500 mb-6">You need to be logged in to access your referral dashboard and earn rewards.</p>
                        <Button asChild className="w-full bg-brand-green-600 hover:bg-emerald-600 text-white rounded-xl font-bold">
                            <Link href="/">Return Home</Link>
                        </Button>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            <Navbar />

            <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                        <Link href="/account" className="hover:text-brand-green-600 transition-colors">Account</Link>
                        <ChevronRight className="h-4 w-4" />
                        <span className="font-semibold text-gray-900">Refer & Earn</span>
                    </div>

                    <div className="bg-gradient-to-br from-brand-green-600 to-emerald-800 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl shadow-brand-green-900/10">
                        {/* Decorative background elements */}
                        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white opacity-10 rounded-full blur-2xl"></div>
                        <div className="absolute bottom-0 left-0 -ml-10 -mb-10 w-32 h-32 bg-brand-orange opacity-20 rounded-full blur-2xl"></div>

                        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                            <div className="flex-1 text-center md:text-left">
                                <h1 className="text-3xl md:text-4xl font-black mb-3">Invite Friends, Earn ₦2,000</h1>
                                <p className="text-emerald-50 text-base max-w-lg leading-relaxed">
                                    Share your unique link. When a friend signs up and makes their first purchase, you both get a ₦2,000 coupon!
                                </p>
                            </div>
                            <div className="shrink-0">
                                <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-md border border-white/20 shadow-inner">
                                    <Trophy className="h-10 w-10 text-brand-orange" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {/* Share Link Card */}
                    <div className="md:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <h2 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
                            <Share2 className="h-5 w-5 text-brand-green-600" />
                            Your Referral Link
                        </h2>
                        <p className="text-sm text-gray-500 mb-6">Copy and share this link with your friends and family.</p>

                        <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl border border-gray-200">
                            <Input
                                value={referralLink}
                                readOnly
                                className="border-0 bg-transparent text-gray-700 font-medium focus-visible:ring-0 truncate"
                            />
                            <Button
                                onClick={handleCopy}
                                className={`shrink-0 rounded-lg font-bold gap-2 transition-all ${copied ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-brand-green-600 hover:bg-emerald-600 text-white'}`}
                            >
                                {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                {copied ? "Copied!" : "Copy Link"}
                            </Button>
                        </div>
                    </div>

                    {/* Stats Card */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <h2 className="text-lg font-bold text-gray-900 mb-4">Your Stats</h2>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                                        <Users className="h-4 w-4 text-blue-600" />
                                    </div>
                                    <span className="text-sm font-medium text-gray-700">Friends Invited</span>
                                </div>
                                <span className="text-xl font-black text-gray-900">{stats.total_referred}</span>
                            </div>

                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                                        <Trophy className="h-4 w-4 text-brand-orange" />
                                    </div>
                                    <span className="text-sm font-medium text-gray-700">Pending</span>
                                </div>
                                <span className="text-xl font-black text-gray-900">{stats.pending_rewards}</span>
                            </div>

                            <div className="flex items-center justify-between p-3 bg-brand-green-50 rounded-xl border border-brand-green-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-brand-green-200 flex items-center justify-center">
                                        <Coins className="h-4 w-4 text-brand-green-700" />
                                    </div>
                                    <span className="text-sm font-bold text-brand-green-800">Earned</span>
                                </div>
                                <span className="text-xl font-black text-brand-green-700">{stats.earned_rewards}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Referral History */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                        <h2 className="font-bold text-lg text-gray-900">Referral History</h2>
                        <span className="text-xs font-bold bg-gray-200 text-gray-600 px-2 py-1 rounded-full">{referralsList.length} total</span>
                    </div>

                    {referralsList.length === 0 ? (
                        <div className="p-10 text-center flex flex-col items-center">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                <Users className="h-8 w-8 text-gray-300" />
                            </div>
                            <h3 className="text-base font-bold text-gray-900 mb-1">No referrals yet</h3>
                            <p className="text-sm text-gray-500 max-w-sm">Share your link with friends. When they sign up, they'll appear here.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {referralsList.map((ref, idx) => (
                                <div key={idx} className="p-4 sm:p-6 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0 border border-gray-200">
                                            <span className="text-sm font-bold text-gray-500">{ref.name.charAt(0).toUpperCase()}</span>
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-900 text-sm">{ref.name}</p>
                                            <p className="text-xs text-gray-500">{new Date(ref.date).toLocaleDateString()}</p>
                                        </div>
                                    </div>

                                    <div>
                                        {ref.status === "completed" ? (
                                            <span className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 text-xs font-bold px-2.5 py-1 rounded border border-green-200 shadow-sm">
                                                <CheckCircle2 className="h-3.5 w-3.5" /> Reward Sent
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 text-xs font-bold px-2.5 py-1 rounded border border-amber-200 shadow-sm">
                                                <Clock className="h-3.5 w-3.5" /> Pending Purchase
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </main>

            <Footer />
        </div>
    );
}
