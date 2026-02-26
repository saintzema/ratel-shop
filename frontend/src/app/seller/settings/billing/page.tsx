"use client";

import { useState } from "react";
import { CheckCircle2, Crown, Zap, TrendingUp, ShieldCheck, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const PLANS = [
    {
        name: "Starter",
        price: "Free",
        duration: "Forever",
        description: "Perfect for getting offline businesses online.",
        icon: <Zap className="h-6 w-6 text-gray-500" />,
        color: "gray",
        features: [
            "Up to 50 Products",
            "Basic Analytics",
            "Customer Messaging",
            "Standard Support",
            "FairPrice Subdomain (.fairprice.ng)",
            "1 Staff Account"
        ],
        current: true
    },
    {
        name: "Pro",
        price: "₦5,000",
        duration: "per month",
        description: "For growing businesses needing more power.",
        icon: <TrendingUp className="h-6 w-6 text-ratel-green-600" />,
        color: "ratel-green",
        popular: true,
        features: [
            "Up to 500 Products",
            "Advanced Analytics & PDF Reports",
            "Connect Custom Domain",
            "Priority Support",
            "Discount & Coupon Engine",
            "Instagram DM Integration",
            "3 Staff Accounts"
        ]
    },
    {
        name: "Growth",
        price: "₦15,000",
        duration: "per month",
        description: "Scale your business with advanced CRM tools.",
        icon: <ShieldCheck className="h-6 w-6 text-blue-600" />,
        color: "blue",
        features: [
            "Unlimited Products",
            "Full CRM Dashboard",
            "Custom Domain with Free SSL",
            "Advanced Logistics (Fez/Shipbubble)",
            "Bookkeeping Tools",
            "10 Staff Accounts"
        ]
    },
    {
        name: "Scale",
        price: "₦50,000",
        duration: "per month",
        description: "Enterprise features for established businesses.",
        icon: <Crown className="h-6 w-6 text-amber-500" />,
        color: "amber",
        features: [
            "Everything in Growth",
            "Manage Multiple Businesses",
            "Dedicated Account Manager",
            "API Access",
            "Wholesale Purchasing Limits",
            "Unlimited Staff Accounts"
        ]
    }
];

export default function BillingPage() {
    const [billingCycle, setBillingCycle] = useState<"monthly" | "annually">("monthly");
    const [processingPlan, setProcessingPlan] = useState<string | null>(null);

    const handleUpgrade = async (planName: string) => {
        setProcessingPlan(planName);
        // Simulate Paystack popup delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        setProcessingPlan(null);
        alert(`Integration Placeholder: Open Paystack Checkout for ${planName} Plan.`);
    };

    return (
        <div className="max-w-7xl mx-auto space-y-12 pb-20 p-4 sm:p-6 lg:p-8">
            <div className="text-center space-y-4 max-w-3xl mx-auto">
                <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight">Supercharge your Store</h1>
                <p className="text-lg text-gray-500 font-medium">
                    Upgrade to a premium plan to unlock custom domains, advanced analytics, multiple businesses, and dedicated support.
                </p>

                {/* Billing Toggle */}
                <div className="flex items-center justify-center pt-6">
                    <div className="bg-gray-100 p-1.5 rounded-2xl flex items-center relative">
                        <button
                            onClick={() => setBillingCycle("monthly")}
                            className={`px-6 py-2.5 rounded-xl text-sm font-bold tracking-widest uppercase transition-all z-10 ${billingCycle === "monthly" ? "text-gray-900 shadow-sm bg-white" : "text-gray-500 hover:text-gray-900"}`}
                        >
                            Monthly
                        </button>
                        <button
                            onClick={() => setBillingCycle("annually")}
                            className={`px-6 py-2.5 rounded-xl text-sm font-bold tracking-widest uppercase transition-all z-10 flex items-center gap-2 ${billingCycle === "annually" ? "text-gray-900 shadow-sm bg-white" : "text-gray-500 hover:text-gray-900"}`}
                        >
                            Annually <span className="text-[10px] bg-ratel-green-100 text-ratel-green-800 px-2 py-0.5 rounded-full font-black">Save 20%</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
                {PLANS.map((plan) => {
                    const isProcessing = processingPlan === plan.name;

                    return (
                        <div
                            key={plan.name}
                            className={`relative bg-white rounded-[32px] border flex flex-col transition-all duration-300 ${plan.popular ? 'border-ratel-green-500 shadow-[0_8px_40px_rgba(22,163,74,0.12)] scale-105 z-10' : 'border-gray-200 hover:border-gray-300 hover:shadow-xl'}`}
                        >
                            {plan.popular && (
                                <div className="absolute -top-4 left-0 right-0 flex justify-center">
                                    <div className="bg-ratel-green-600 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-lg">
                                        Most Popular
                                    </div>
                                </div>
                            )}

                            <div className="p-8 pb-6 border-b border-gray-100">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-xl font-bold tracking-tight text-gray-900">{plan.name}</h3>
                                    <div className={`p-2 rounded-xl ${plan.color === 'ratel-green' ? 'bg-ratel-green-50' : plan.color === 'blue' ? 'bg-blue-50' : plan.color === 'amber' ? 'bg-amber-50' : 'bg-gray-50'}`}>
                                        {plan.icon}
                                    </div>
                                </div>
                                <div className="mb-2">
                                    <span className="text-4xl font-black tracking-tighter text-gray-900">
                                        {billingCycle === "annually" && plan.price !== "Free"
                                            ? `₦${(parseInt(plan.price.replace(/[^\d]/g, '')) * 0.8).toLocaleString()}`
                                            : plan.price}
                                    </span>
                                    {plan.price !== "Free" && <span className="text-gray-500 font-medium ml-1">/{billingCycle === "monthly" ? "mo" : "mo, billed yearly"}</span>}
                                </div>
                                <p className="text-sm text-gray-500 h-10">{plan.description}</p>
                            </div>

                            <div className="p-8 pt-6 flex-1 flex flex-col">
                                <ul className="space-y-4 mb-8 flex-1">
                                    {plan.features.map((feature, i) => (
                                        <li key={i} className="flex flex-items gap-3">
                                            <CheckCircle2 className={`h-5 w-5 shrink-0 ${plan.popular ? 'text-ratel-green-500' : 'text-gray-400'}`} />
                                            <span className="text-[13px] font-medium text-gray-700">{feature}</span>
                                        </li>
                                    ))}
                                </ul>

                                <Button
                                    onClick={() => handleUpgrade(plan.name)}
                                    disabled={plan.current || isProcessing}
                                    className={`w-full h-14 rounded-2xl text-[13px] font-black uppercase tracking-widest transition-all shadow-sm flex flex-items gap-2 items-center justify-center ${plan.current
                                        ? 'bg-gray-100 text-gray-500 hover:bg-gray-100 cursor-not-allowed'
                                        : plan.popular
                                            ? 'bg-ratel-green-600 hover:bg-ratel-green-700 text-white shadow-ratel-green-600/20 hover:shadow-lg'
                                            : 'bg-gray-900 hover:bg-black text-white'}`}
                                >
                                    {isProcessing ? (
                                        <div className="h-5 w-5 border-2 border-white/30 border-t-white animate-spin rounded-full" />
                                    ) : plan.current ? (
                                        <>Current Plan <Check className="h-4 w-4" /></>
                                    ) : (
                                        <>Upgrade to {plan.name} <ArrowRight className="h-4 w-4" /></>
                                    )}
                                </Button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Enterprise / Multiple Business Banner */}
            <div className="max-w-7xl mx-auto mt-16 bg-gray-900 rounded-[32px] p-8 md:p-12 text-white relative overflow-hidden shadow-2xl shadow-gray-900/40 border border-gray-800">
                <div className="absolute top-0 right-0 w-96 h-96 bg-ratel-green-500/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="max-w-2xl">
                        <h2 className="text-3xl font-black tracking-tight mb-4">Running Multiple Ventures?</h2>
                        <p className="text-gray-400 font-medium mb-6 text-lg">
                            The Scale plan allows you to manage multiple standalone businesses from a single unified Dashboard, switch between stores seamlessly, and consolidate your payouts.
                        </p>
                        <div className="flex gap-4">
                            <div className="bg-white/10 px-4 py-2 rounded-xl flex items-center gap-2 border border-white/5">
                                <CheckCircle2 className="h-4 w-4 text-ratel-green-400" /> <span className="text-sm font-bold">One Login</span>
                            </div>
                            <div className="bg-white/10 px-4 py-2 rounded-xl flex items-center gap-2 border border-white/5">
                                <CheckCircle2 className="h-4 w-4 text-ratel-green-400" /> <span className="text-sm font-bold">Separate Inventories</span>
                            </div>
                        </div>
                    </div>
                    <div>
                        <Button className="bg-white text-gray-900 hover:bg-gray-100 font-black tracking-widest uppercase h-14 px-8 rounded-2xl shadow-lg">
                            Contact Enterprise Sales
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
