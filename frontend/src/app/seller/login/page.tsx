"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DemoStore } from "@/lib/demo-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Store, ArrowRight, Eye, EyeOff, Mail, Lock, User, Briefcase, MapPin, ChevronRight, CheckCircle2, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/logo";

type AuthMode = "login" | "register";

export default function SellerLoginPage() {
    const router = useRouter();
    const [mode, setMode] = useState<AuthMode>("login");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    // Login fields
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    // Register fields
    const [regData, setRegData] = useState({
        business_name: "",
        owner_name: "",
        owner_email: "",
        password: "",
        category: "Electronics",
        location: "",
    });

    // Check if already logged in
    useEffect(() => {
        const sellerId = DemoStore.getCurrentSellerId();
        if (sellerId) {
            router.push("/seller/dashboard");
        }
    }, [router]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        // Check against registered sellers in the store
        const sellers = DemoStore.getSellers();
        const match = sellers.find(
            (s) => s.owner_email?.toLowerCase() === email.toLowerCase()
        );

        if (match) {
            DemoStore.loginSeller(match.id);
            router.push("/seller/dashboard");
        } else {
            setError("No seller account found with this email. Please register first.");
        }
        setLoading(false);
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!regData.business_name || !regData.owner_name || !regData.owner_email || !regData.password) {
            setError("All fields are required.");
            return;
        }

        setLoading(true);

        // Check if email already exists
        const existing = DemoStore.getSellers().find(
            (s) => s.owner_email?.toLowerCase() === regData.owner_email.toLowerCase()
        );
        if (existing) {
            setError("A seller with this email already exists. Please login instead.");
            setLoading(false);
            return;
        }

        // Create new seller via API
        try {
            const res = await fetch("/api/sellers", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    business_name: regData.business_name,
                    owner_name: regData.owner_name,
                    owner_email: regData.owner_email,
                    category: regData.category,
                    location: regData.location,
                    status: "pending",
                    verified: false,
                    trust_score: 50,
                    store_url: regData.business_name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
                }),
            });

            if (res.ok) {
                const newSeller = await res.json();
                // Also add locally so login works immediately
                DemoStore.addSeller(newSeller);
                DemoStore.loginSeller(newSeller.id);
                router.push("/seller/dashboard");
            } else {
                // Fallback: create locally
                const newId = `s_${Date.now()}`;
                const newSeller = {
                    id: newId,
                    business_name: regData.business_name,
                    owner_name: regData.owner_name,
                    owner_email: regData.owner_email,
                    category: regData.category,
                    location: regData.location || "Nigeria",
                    status: "pending" as const,
                    verified: false,
                    trust_score: 50,
                    store_url: regData.business_name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
                    description: "",
                    logo_url: "",
                    cover_image_url: "",
                    created_at: new Date().toISOString(),
                    kyc_status: "pending" as const,
                };
                DemoStore.addSeller(newSeller as any);
                DemoStore.loginSeller(newId);
                router.push("/seller/dashboard");
            }
        } catch {
            // Network error — create locally
            const newId = `s_${Date.now()}`;
            const newSeller = {
                id: newId,
                business_name: regData.business_name,
                owner_name: regData.owner_name,
                owner_email: regData.owner_email,
                category: regData.category,
                location: regData.location || "Nigeria",
                status: "pending" as const,
                verified: false,
                trust_score: 50,
                store_url: regData.business_name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
                description: "",
                logo_url: "",
                cover_image_url: "",
                created_at: new Date().toISOString(),
                kyc_status: "pending" as const,
            };
            DemoStore.addSeller(newSeller as any);
            DemoStore.loginSeller(newId);
            router.push("/seller/dashboard");
        }

        setLoading(false);
    };

    const categories = ["Electronics", "Fashion", "Home & Living", "Beauty & Health", "Phones", "Cars", "Energy", "Grocery", "Baby", "Sports", "Office", "Fitness", "Gaming", "Other"];

    return (
        <div className="min-h-screen bg-[#F5F5F7] flex flex-col">
            <Navbar />

            <main className="flex-1 flex items-center justify-center px-4 py-12">
                <div className="w-full max-w-[460px]">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-[20px] bg-gradient-to-br from-emerald-500 to-emerald-600 mb-4 shadow-lg shadow-emerald-500/30">
                            <Store className="h-8 w-8 text-white" />
                        </div>
                        <h1 className="text-3xl font-black text-[#1d1d1f] tracking-tight">
                            {mode === "login" ? "Seller Login" : "Start Selling"}
                        </h1>
                        <p className="text-sm text-gray-500 mt-2 font-medium">
                            {mode === "login"
                                ? "Access your seller dashboard and manage your store."
                                : "Register your business and start reaching millions of Nigerian buyers."}
                        </p>
                    </div>

                    {/* Auth Toggle */}
                    <div className="flex bg-gray-200/60 p-1 rounded-2xl mb-6 gap-1">
                        <button
                            type="button"
                            onClick={() => { setMode("login"); setError(""); }}
                            className={cn(
                                "flex-1 h-11 rounded-[14px] text-sm font-bold transition-all",
                                mode === "login"
                                    ? "bg-white text-gray-900 shadow-md"
                                    : "text-gray-500 hover:text-gray-700"
                            )}
                        >
                            Login
                        </button>
                        <button
                            type="button"
                            onClick={() => { setMode("register"); setError(""); }}
                            className={cn(
                                "flex-1 h-11 rounded-[14px] text-sm font-bold transition-all",
                                mode === "register"
                                    ? "bg-white text-gray-900 shadow-md"
                                    : "text-gray-500 hover:text-gray-700"
                            )}
                        >
                            Register
                        </button>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm font-semibold px-4 py-3 rounded-xl mb-4 animate-in fade-in">
                            {error}
                        </div>
                    )}

                    {/* Login Form */}
                    {mode === "login" && (
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div className="bg-white rounded-[20px] border border-gray-200/50 p-6 shadow-sm space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Email Address</label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <Input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="your@email.com"
                                            required
                                            className="h-12 pl-11 rounded-xl border-gray-200 bg-gray-50 focus:bg-white"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Password</label>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <Input
                                            type={showPassword ? "text" : "password"}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="••••••••"
                                            required
                                            className="h-12 pl-11 pr-11 rounded-xl border-gray-200 bg-gray-50 focus:bg-white"
                                        />
                                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <Button
                                type="submit"
                                disabled={loading}
                                className="w-full h-14 rounded-2xl bg-gray-900 hover:bg-black text-white font-bold text-sm shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                            >
                                {loading ? (
                                    <div className="h-5 w-5 border-2 border-white/30 border-t-white animate-spin rounded-full" />
                                ) : (
                                    <>Sign In to Dashboard <ArrowRight className="h-4 w-4 ml-2" /></>
                                )}
                            </Button>
                        </form>
                    )}

                    {/* Register Form */}
                    {mode === "register" && (
                        <form onSubmit={handleRegister} className="space-y-4">
                            <div className="bg-white rounded-[20px] border border-gray-200/50 p-6 shadow-sm space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Business Name</label>
                                    <div className="relative">
                                        <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <Input
                                            value={regData.business_name}
                                            onChange={(e) => setRegData({ ...regData, business_name: e.target.value })}
                                            placeholder="e.g. TechHub Lagos"
                                            required
                                            className="h-12 pl-11 rounded-xl border-gray-200 bg-gray-50 focus:bg-white"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Full Name</label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <Input
                                            value={regData.owner_name}
                                            onChange={(e) => setRegData({ ...regData, owner_name: e.target.value })}
                                            placeholder="Your full name"
                                            required
                                            className="h-12 pl-11 rounded-xl border-gray-200 bg-gray-50 focus:bg-white"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Email Address</label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <Input
                                            type="email"
                                            value={regData.owner_email}
                                            onChange={(e) => setRegData({ ...regData, owner_email: e.target.value })}
                                            placeholder="your@email.com"
                                            required
                                            className="h-12 pl-11 rounded-xl border-gray-200 bg-gray-50 focus:bg-white"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Password</label>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <Input
                                            type={showPassword ? "text" : "password"}
                                            value={regData.password}
                                            onChange={(e) => setRegData({ ...regData, password: e.target.value })}
                                            placeholder="Create a password"
                                            required
                                            className="h-12 pl-11 pr-11 rounded-xl border-gray-200 bg-gray-50 focus:bg-white"
                                        />
                                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Category</label>
                                        <select
                                            value={regData.category}
                                            onChange={(e) => setRegData({ ...regData, category: e.target.value })}
                                            className="flex h-12 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium focus:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                                        >
                                            {categories.map((c) => (
                                                <option key={c} value={c}>{c}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Location</label>
                                        <div className="relative">
                                            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                            <Input
                                                value={regData.location}
                                                onChange={(e) => setRegData({ ...regData, location: e.target.value })}
                                                placeholder="Lagos"
                                                className="h-12 pl-11 rounded-xl border-gray-200 bg-gray-50 focus:bg-white"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Benefits */}
                            <div className="bg-emerald-50/50 rounded-2xl p-4 border border-emerald-100/50">
                                <div className="flex items-center gap-2 mb-3">
                                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                                    <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">What you get</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    {["Instant dashboard access", "AI price analysis", "Free store page", "Escrow protection"].map((b) => (
                                        <div key={b} className="flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
                                            <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                                            {b}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <Button
                                type="submit"
                                disabled={loading}
                                className="w-full h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-xl shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                            >
                                {loading ? (
                                    <div className="h-5 w-5 border-2 border-white/30 border-t-white animate-spin rounded-full" />
                                ) : (
                                    <>Create Seller Account <ArrowRight className="h-4 w-4 ml-2" /></>
                                )}
                            </Button>
                        </form>
                    )}

                    {/* Switch mode */}
                    <p className="text-center text-sm text-gray-500 mt-6 font-medium">
                        {mode === "login" ? (
                            <>Don&apos;t have a seller account? <button type="button" onClick={() => { setMode("register"); setError(""); }} className="text-emerald-600 font-bold hover:underline">Register here</button></>
                        ) : (
                            <>Already have an account? <button type="button" onClick={() => { setMode("login"); setError(""); }} className="text-emerald-600 font-bold hover:underline">Sign in</button></>
                        )}
                    </p>
                </div>
            </main>

            <Footer />
        </div>
    );
}
