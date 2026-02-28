"use client";

import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Crown, Check, Shield, Truck, Zap, Clock, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { PaystackCheckout } from "@/components/payment/PaystackCheckout";
import { DemoStore } from "@/lib/demo-store";
import { AnimatePresence } from "framer-motion";
export default function PremiumPage() {
    const { user, login } = useAuth();
    const isPremium = user?.isPremium || false;
    const [showPaystack, setShowPaystack] = useState(false);

    const handleSuccess = (reference: string) => {
        if (user) {
            DemoStore.addPremiumSubscription(user.id);
            // Refresh auth state to get new premium flag
            const updatedUser = DemoStore.getUser(user.email);
            if (updatedUser) login(updatedUser);
            window.dispatchEvent(new Event("storage"));
            setShowPaystack(false);
        }
    };
    const benefits = [
        { icon: Truck, title: "Free Same-Day Delivery", desc: "On all orders above ₦5,000 within Lagos, Abuja, and Port Harcourt" },
        { icon: Shield, title: "Extended Return Window", desc: "30-day returns instead of 7 days for all products" },
        { icon: Zap, title: "Priority AI Price Checks", desc: "Faster and more detailed price analysis from Ziva AI" },
        { icon: Clock, title: "Early Access to Deals", desc: "Get 6-hour early access to flash sales and exclusive deals" },
        { icon: Star, title: "Premium Customer Support", desc: "Dedicated support line with under 2-minute wait times" },
        { icon: Crown, title: "Seller Priority", desc: "Premium sellers get featured placement and lower commission rates" },
    ];

    return (
        <div className="min-h-screen bg-white flex flex-col font-sans">
            <Navbar />
            <main className="flex-1 container mx-auto px-4 py-8 max-w-3xl">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-1.5 rounded-full text-sm font-bold mb-4">
                        <Crown className="h-4 w-4" /> FairPrice Premium
                    </div>
                    <h1 className="text-3xl font-black text-gray-900 mb-2">Upgrade Your Shopping Experience</h1>
                    <p className="text-gray-500 max-w-lg mx-auto">Get free delivery, extended returns, and exclusive deals for just ₦5,000/month</p>
                </div>

                {/* Status Card */}
                <div className={`p-6 rounded-2xl border-2 mb-8 text-center ${isPremium ? "border-amber-400 bg-gradient-to-br from-amber-50 to-orange-50" : "border-gray-200 bg-gray-50"}`}>
                    {isPremium ? (
                        <div>
                            <Crown className="h-10 w-10 text-amber-500 mx-auto mb-2" />
                            <h2 className="text-xl font-black text-gray-900 mb-1">You&apos;re Premium! 🎉</h2>
                            <p className="text-sm text-gray-600 mb-4">Enjoy all premium benefits. Your next billing date is {new Date(user?.premiumExpiresAt || Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}.</p>
                            <Button variant="outline" className="rounded-xl border-amber-400 text-amber-700 font-bold hover:bg-amber-100" onClick={() => { /* Real app would handle cancellation here */ alert("Cancellation requested"); }}>
                                Cancel Subscription
                            </Button>
                        </div>
                    ) : (
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 mb-1">Not yet a Premium member</h2>
                            <p className="text-sm text-gray-500 mb-4">Subscribe today for only ₦5,000/month</p>
                            <Button onClick={() => setShowPaystack(true)} className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black px-8 h-12 text-base shadow-lg hover:shadow-xl transition-all">
                                <Crown className="h-5 w-5 mr-2" /> Subscribe Now
                            </Button>
                        </div>
                    )}
                </div>

                {/* Benefits Grid */}
                <h2 className="text-lg font-bold text-gray-900 mb-4">Premium Benefits</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {benefits.map((b, i) => (
                        <div key={i} className="p-4 rounded-2xl border border-gray-200 hover:border-amber-300 hover:bg-amber-50/30 transition-all flex items-start gap-3">
                            <div className="p-2 bg-amber-100 rounded-xl shrink-0">
                                <b.icon className="h-5 w-5 text-amber-600" />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 text-sm">{b.title}</h3>
                                <p className="text-xs text-gray-500 mt-0.5">{b.desc}</p>
                            </div>
                            {isPremium && <Check className="h-5 w-5 text-emerald-500 shrink-0 ml-auto" />}
                        </div>
                    ))}
                </div>
            </main>

            <AnimatePresence>
                {showPaystack && (
                    <PaystackCheckout
                        amount={500000} // ₦5,000 in kobo
                        email={user?.email || "guest@example.com"}
                        onSuccess={handleSuccess}
                        onClose={() => setShowPaystack(false)}
                        autoStart={true}
                    />
                )}
            </AnimatePresence>

            <Footer />
        </div>
    );
}
