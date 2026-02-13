"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DEMO_SELLERS } from "@/lib/data";
import { DemoStore } from "@/lib/demo-store";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { CheckCircle2, Store } from "lucide-react";

export default function SellerLoginPage() {
    const router = useRouter();
    const [loadingId, setLoadingId] = useState<string | null>(null);

    const handleLogin = (sellerId: string) => {
        setLoadingId(sellerId);
        // Simulate network delay
        setTimeout(() => {
            DemoStore.loginSeller(sellerId);
            router.push("/seller/dashboard");
        }, 800);
    };

    return (
        <div className="min-h-screen bg-zinc-50 flex flex-col">
            <Navbar />

            <main className="flex-1 container mx-auto px-4 py-10 max-w-4xl">
                <div className="text-center mb-10">
                    <h1 className="text-3xl font-black mb-4">Seller Demo Login</h1>
                    <p className="text-zinc-500">Select a demo seller account to manage products and negotiations.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {DEMO_SELLERS.map((seller) => (
                        <div
                            key={seller.id}
                            className="bg-white p-6 rounded-xl border border-zinc-200 hover:border-ratel-green-600 transition-all cursor-pointer group shadow-sm hover:shadow-md"
                            onClick={() => handleLogin(seller.id)}
                        >
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 bg-zinc-100 rounded-lg flex items-center justify-center shrink-0">
                                    {seller.logo_url ? (
                                        <img src={seller.logo_url} alt={seller.business_name} className="w-8 h-8 object-contain" />
                                    ) : (
                                        <Store className="w-6 h-6 text-zinc-400" />
                                    )}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="font-bold text-lg group-hover:text-ratel-green-600 transition-colors">
                                            {seller.business_name}
                                        </h3>
                                        {seller.verified && (
                                            <CheckCircle2 className="w-4 h-4 text-blue-500" />
                                        )}
                                    </div>
                                    <p className="text-sm text-zinc-500 line-clamp-2 mb-3">{seller.description}</p>

                                    <div className="flex items-center gap-4 text-xs font-medium text-zinc-400">
                                        <span>Trust Score: <span className="text-black">{seller.trust_score}%</span></span>
                                        <span>•</span>
                                        <span className="capitalize">{seller.category}</span>
                                    </div>
                                </div>
                                <div className="self-center">
                                    <Button
                                        disabled={loadingId === seller.id}
                                        className="rounded-full bg-black text-white hover:bg-ratel-green-600 w-[100px]"
                                    >
                                        {loadingId === seller.id ? "Logging in..." : "Login"}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </main>

            <Footer />
        </div>
    );
}
