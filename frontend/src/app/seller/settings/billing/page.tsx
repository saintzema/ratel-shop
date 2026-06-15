"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, Crown, Zap, TrendingUp, ShieldCheck, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataSyncService } from "@/lib/sync-store";
import { PaystackCheckout } from "@/components/payment/PaystackCheckout";

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
            "Standard Store URL",
            "1 Staff Account"
        ]
    },
    {
        name: "Pro",
        price: "₦4,990",
        duration: "per month",
        description: "For growing businesses needing more power.",
        icon: <TrendingUp className="h-6 w-6 text-brand-green-600" />,
        color: "brand-green",
        popular: true,
        features: [
            "Up to 500 Products",
            "Advanced Analytics & PDF Reports",
            "Connect Custom Domain",
            "FairPrice Subdomain (.fairprice.ng)",
            "Priority Support",
            "Discount & Coupon Engine",
            "Instagram DM Integration",
            "Premium QR Logo Branding",
            "3 Staff Accounts"
        ]
    },
    {
        name: "Growth",
        price: "₦14,990",
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
            "Premium QR Logo Branding",
            "10 Staff Accounts"
        ]
    },
    {
        name: "Scale",
        price: "₦49,990",
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
            "Premium QR Logo Branding",
            "Unlimited Staff Accounts"
        ]
    }
];

export default function BillingPage() {
    const [billingCycle, setBillingCycle] = useState<"monthly" | "annually">("monthly");
    const [processingPlan, setProcessingPlan] = useState<string | null>(null);
    const [currentPlan, setCurrentPlan] = useState<string>("Starter");
    const [showPaystack, setShowPaystack] = useState(false);
    const [paystackAmount, setPaystackAmount] = useState(0);
    const [paystackPlan, setPaystackPlan] = useState("");

    useEffect(() => {
        const seller = DataSyncService.getCurrentSeller();
        if (seller?.subscription_plan) {
            setCurrentPlan(seller.subscription_plan);
        }
    }, []);

    const handleUpgrade = (planName: string, priceStr: string) => {
        if (priceStr === "Free") {
            const sellerId = DataSyncService.getCurrentSellerId();
            if (sellerId) {
                DataSyncService.updateSeller(sellerId, { subscription_plan: planName as any });
                setCurrentPlan(planName);
                window.dispatchEvent(new Event("storage"));
            }
            return;
        }

        const monthlyPrice = parseInt(priceStr.replace(/[^\d]/g, ''));
        // Annual: 20% discount, billed as one lump sum for 12 months
        const annualMonthly = Math.round(monthlyPrice * 0.8);
        const totalAmount = billingCycle === "annually" ? annualMonthly * 12 : monthlyPrice;

        setPaystackPlan(planName);
        setPaystackAmount(totalAmount * 100); // Convert to kobo for Paystack
        setShowPaystack(true);
    };

    const handlePaystackSuccess = (reference: string) => {
        const sellerId = DataSyncService.getCurrentSellerId();
        const seller = DataSyncService.getCurrentSeller();
        if (sellerId) {
            DataSyncService.updateSeller(sellerId, { subscription_plan: paystackPlan as any });
            setCurrentPlan(paystackPlan);
            window.dispatchEvent(new Event("storage"));
            window.dispatchEvent(new Event("sync-store-update")); // Ensure global sync
            
            // Send Notification
            if (seller) {
                DataSyncService.addNotification({
                     userId: seller.owner_email || seller.id,
                     type: "order", // Using order icon for billing/admin messages
                     message: `🚀 Congratulations! Your store has been upgraded to the ${paystackPlan} plan. Enjoy your new premium features!`,
                     link: "/seller/dashboard"
                });
                
                // Fire and forget email attempt
                fetch('/api/send-email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        to: seller.owner_email || 'demo@fairprice.store',
                        subject: `Store Upgraded to ${paystackPlan}`,
                        type: 'security_alert', // Using generic template
                        data: {
                            storeName: seller.business_name,
                            message: `Your store has been successfully upgraded to the ${paystackPlan} plan.`
                        }
                    })
                }).catch(() => {});

                // Notify Admin for Custom Subdomain Provisioning (Pro/Growth/Scale include subdomain)
                if (['Pro', 'Growth', 'Scale'].includes(paystackPlan)) {
                    const requestedSubdomain = (seller.business_name || 'store').toLowerCase().replace(/[^a-z0-9]/g, '');
                    
                    // Admin notification
                    DataSyncService.addNotification({
                        userId: 'admin',
                        type: 'order',
                        message: `🌐 Subdomain Request: "${seller.business_name}" upgraded to ${paystackPlan}. Provision ${requestedSubdomain}.fairprice.ng`,
                        link: `/admin/users/${seller.id}`
                    });

                    // Admin email(s)
                    const adminEmails = ['techzema@gmail.com', 'fairprice2026@gmail.com'];
                    adminEmails.forEach((adminEmail) => {
                        fetch('/api/send-email', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                to: adminEmail,
                                subject: `[ACTION REQUIRED] Custom Subdomain Request: ${requestedSubdomain}.fairprice.ng`,
                                type: 'security_alert',
                                data: {
                                    storeName: seller.business_name,
                                    message: `Seller "${seller.business_name}" (${seller.owner_email}) has upgraded to the ${paystackPlan} plan and is requesting subdomain: ${requestedSubdomain}.fairprice.ng\n\nPayment Ref: ${reference}\n\nPlease add the subdomain to Vercel and configure the DNS records.`
                                }
                            })
                        }).catch(() => {});
                    });
                }
            }
        }
        setShowPaystack(false);
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
                            Annually <span className="text-[10px] bg-brand-green-100 text-brand-green-800 px-2 py-0.5 rounded-full font-black">Save 20%</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
                {PLANS.map((plan) => {
                    const isProcessing = processingPlan === plan.name;
                    const isCurrent = currentPlan === plan.name;

                    return (
                        <div
                            key={plan.name}
                            className={`relative bg-white rounded-[32px] border flex flex-col transition-all duration-300 ${plan.popular ? 'border-brand-green-500 shadow-[0_8px_40px_rgba(22,163,74,0.12)] md:scale-105 z-10' : 'border-gray-200 hover:border-gray-300 hover:shadow-xl'}`}
                        >
                            {plan.popular && (
                                <div className="absolute -top-4 left-0 right-0 flex justify-center">
                                    <div className="bg-brand-green-600 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-lg">
                                        Most Popular
                                    </div>
                                </div>
                            )}

                            <div className="p-8 pb-6 border-b border-gray-100">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-xl font-bold tracking-tight text-gray-900">{plan.name}</h3>
                                    <div className={`p-2 rounded-xl ${plan.color === 'brand-green' ? 'bg-brand-green-50' : plan.color === 'blue' ? 'bg-blue-50' : plan.color === 'amber' ? 'bg-amber-50' : 'bg-gray-50'}`}>
                                        {plan.icon}
                                    </div>
                                </div>
                                <div className="mb-2">
                                    <span className="text-4xl font-black tracking-tighter text-gray-900">
                                        {billingCycle === "annually" && plan.price !== "Free"
                                            ? `₦${Math.round(parseInt(plan.price.replace(/[^\d]/g, '')) * 0.8).toLocaleString()}`
                                            : plan.price}
                                    </span>
                                    {plan.price !== "Free" && <span className="text-gray-500 font-medium ml-1">/{billingCycle === "monthly" ? "mo" : "mo"}</span>}
                                    {billingCycle === "annually" && plan.price !== "Free" && (
                                        <p className="text-xs text-emerald-600 font-bold mt-1">
                                            ₦{(Math.round(parseInt(plan.price.replace(/[^\d]/g, '')) * 0.8) * 12).toLocaleString()}/yr · Save ₦{(parseInt(plan.price.replace(/[^\d]/g, '')) * 12 - Math.round(parseInt(plan.price.replace(/[^\d]/g, '')) * 0.8) * 12).toLocaleString()}
                                        </p>
                                    )}
                                </div>
                                <p className="text-sm text-gray-500 h-10">{plan.description}</p>
                            </div>

                            <div className="p-8 pt-6 flex-1 flex flex-col">
                                <ul className="space-y-4 mb-8 flex-1">
                                    {plan.features.map((feature, i) => (
                                        <li key={i} className="flex items-center gap-3">
                                            <CheckCircle2 className={`h-5 w-5 shrink-0 ${plan.popular ? 'text-brand-green-500' : 'text-gray-400'}`} />
                                            <span className="text-[13px] font-medium text-gray-700">{feature}</span>
                                        </li>
                                    ))}
                                </ul>

                                <Button
                                    onClick={() => handleUpgrade(plan.name, plan.price)}
                                    disabled={isCurrent || isProcessing}
                                    className={`w-full h-14 rounded-2xl text-[13px] font-black uppercase tracking-widest transition-all shadow-sm flex items-center justify-center gap-2 ${isCurrent
                                        ? 'bg-gray-100 text-gray-500 hover:bg-gray-100 cursor-not-allowed'
                                        : plan.popular
                                            ? 'bg-brand-green-600 hover:bg-brand-green-700 text-white shadow-brand-green-600/20 hover:shadow-lg'
                                            : 'bg-gray-900 hover:bg-black text-white'}`}
                                >
                                    {isProcessing ? (
                                        <div className="h-5 w-5 border-2 border-white/30 border-t-white animate-spin rounded-full" />
                                    ) : isCurrent ? (
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
                <div className="absolute top-0 right-0 w-96 h-96 bg-brand-green-500/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="max-w-2xl">
                        <h2 className="text-3xl font-black tracking-tight mb-4">Running Multiple Ventures?</h2>
                        <p className="text-gray-400 font-medium mb-6 text-lg">
                            The Scale plan allows you to manage multiple standalone businesses from a single unified Dashboard, switch between stores seamlessly, and consolidate your payouts.
                        </p>
                        <div className="flex gap-4">
                            <div className="bg-white/10 px-4 py-2 rounded-xl flex items-center gap-2 border border-white/5">
                                <CheckCircle2 className="h-4 w-4 text-brand-green-400" /> <span className="text-sm font-bold">One Login</span>
                            </div>
                            <div className="bg-white/10 px-4 py-2 rounded-xl flex items-center gap-2 border border-white/5">
                                <CheckCircle2 className="h-4 w-4 text-brand-green-400" /> <span className="text-sm font-bold">Separate Inventories</span>
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

            {showPaystack && (
                <PaystackCheckout
                    amount={paystackAmount}
                    email={DataSyncService.getCurrentSeller()?.owner_email || "seller@fairprice.ng"}
                    metadata={{
                        type: "account_upgrade",
                        user_id: DataSyncService.getCurrentSellerId(),
                        role: "seller",
                        plan: paystackPlan
                    }}
                    onSuccess={handlePaystackSuccess}
                    onClose={() => setShowPaystack(false)}
                    autoStart={true}
                />
            )}
        </div>
    );
}
