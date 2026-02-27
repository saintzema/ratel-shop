"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/ui/logo";
import { useAuth } from "@/context/AuthContext";
import { Eye, EyeOff, Loader2, ArrowRight, Check, X, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { DemoStore } from "@/lib/demo-store";
import { cn } from "@/lib/utils";

type AuthStep = "identifier" | "password_existing" | "password_new" | "name_new" | "verification_new";

export default function UnifiedAuthPage() {
    const router = useRouter();
    const { login, register } = useAuth();

    // Core state
    const [step, setStep] = useState<AuthStep>("identifier");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    // Form data
    const [identifier, setIdentifier] = useState(""); // Email or Phone
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [birthday, setBirthday] = useState("");

    // UI state
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isExistingUser, setIsExistingUser] = useState(false);

    // Get redirect path
    const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const redirectPath = searchParams?.get("from") || "/";

    // Focus management
    const passwordInputRef = useRef<HTMLInputElement>(null);
    const firstNameInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (step === "password_existing" || step === "password_new") {
            setTimeout(() => passwordInputRef.current?.focus(), 100);
        } else if (step === "name_new") {
            setTimeout(() => firstNameInputRef.current?.focus(), 100);
        }
    }, [step]);

    // Validation helpers
    const passwordChecks = [
        { label: "At least 8 characters", pass: password.length >= 8 },
        { label: "One number or symbol", pass: /[0-9!@#$%^&*(),.?":{}|<>]/.test(password) },
    ];
    const allPasswordChecksPassed = passwordChecks.every(c => c.pass);
    const passwordsMatch = password.length > 0 && password === confirmPassword;

    // Background Image Carousel
    const bgImages = [
        "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=988&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=1000&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=1000&auto=format&fit=crop"
    ];
    const [currentBg, setCurrentBg] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentBg((prev) => (prev + 1) % bgImages.length);
        }, 5000);
        return () => clearInterval(timer);
    }, []);

    // --- Handlers ---

    // Check if a user is already registered by looking up localStorage
    const checkRegisteredUser = (email: string): boolean => {
        try {
            const registered = JSON.parse(localStorage.getItem("fairprice_registered_users") || "[]");
            return registered.some((u: { email: string }) => u.email.toLowerCase() === email.toLowerCase());
        } catch { return false; }
    };

    const saveRegisteredUser = (email: string, name: string, role: string, birthday?: string) => {
        try {
            const registered = JSON.parse(localStorage.getItem("fairprice_registered_users") || "[]");
            if (!registered.some((u: { email: string }) => u.email.toLowerCase() === email.toLowerCase())) {
                registered.push({ email, name, role, birthday, created_at: new Date().toISOString() });
                localStorage.setItem("fairprice_registered_users", JSON.stringify(registered));
            }
        } catch { /* ignore */ }
    };

    const handleIdentifierSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        if (!identifier.trim()) return;

        setIsLoading(true);
        setTimeout(() => {
            const normalizedId = identifier.toLowerCase().trim();
            // Check registered users first, then known demo accounts
            const isExisting =
                checkRegisteredUser(normalizedId) ||
                normalizedId === "admin@example.com" ||
                normalizedId === "seller@example.com";

            setIsExistingUser(isExisting);
            setStep(isExisting ? "password_existing" : "password_new");
            setIsLoading(false);
        }, 600);
    };

    const handleExistingLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        const displayName = identifier.includes("@") ? identifier.split("@")[0] : "User";
        let determinedRole: "customer" | "seller" | "admin" = "customer";

        if (identifier.toLowerCase().includes("admin@")) determinedRole = "admin";
        else if (identifier.toLowerCase().includes("seller@")) determinedRole = "seller";

        setTimeout(() => {
            const finalRedirect =
                determinedRole === "admin" && redirectPath === "/" ? "/admin/dashboard" :
                    determinedRole === "seller" && redirectPath === "/" ? "/seller/dashboard" :
                        redirectPath;

            const userEmail = identifier.includes("@") ? identifier : `${identifier}@example.com`;
            const userName = displayName.replace(/[._-]/g, " ").replace(/\b\w/g, c => c.toUpperCase());
            login({
                id: "user_" + Math.random().toString(36).substr(2, 9),
                name: userName,
                email: userEmail,
                role: determinedRole,
                created_at: new Date().toISOString()
            });
            // Ensure this user is in the registered users list
            saveRegisteredUser(userEmail, userName, determinedRole);
            router.push(finalRedirect);
        }, 1000);
    };

    const handleNewPasswordSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!allPasswordChecksPassed) {
            setError("Password does not meet requirements.");
            return;
        }
        if (!passwordsMatch) {
            setError("Passwords do not match.");
            return;
        }

        setStep("name_new");
    };

    const handleNameSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!firstName.trim() || !lastName.trim()) {
            setError("Please enter your full name.");
            return;
        }
        setStep("verification_new");
    };

    const handleFinalizeRegistration = (skipped: boolean = false) => {
        setIsLoading(true);

        const displayName = identifier.includes("@") ? identifier.split("@")[0] : "User";
        let determinedRole: "customer" | "seller" | "admin" = "customer";

        if (identifier.toLowerCase().includes("admin@")) determinedRole = "admin";
        else if (identifier.toLowerCase().includes("seller@")) determinedRole = "seller";

        setTimeout(() => {
            const finalRedirect =
                determinedRole === "admin" && redirectPath === "/" ? "/admin/dashboard" :
                    determinedRole === "seller" && redirectPath === "/" ? "/seller/onboarding" :
                        redirectPath;

            const regEmail = identifier.includes("@") ? identifier : `${identifier}@example.com`;
            const regName = `${firstName.trim()} ${lastName.trim()}`;
            register({
                id: "user_" + Math.random().toString(36).substr(2, 9),
                name: regName,
                email: regEmail,
                role: determinedRole,
                created_at: new Date().toISOString(),
                birthday: birthday || undefined
            });
            // Persist this user as registered
            saveRegisteredUser(regEmail, regName, determinedRole, birthday || undefined);
            router.push(finalRedirect);
        }, 1200);
    };

    const handleSocialLogin = (provider: "google" | "facebook" | "x") => {
        setIsLoading(true);
        setTimeout(() => {
            const mockUser = {
                id: `${provider}_` + Math.random().toString(36).substr(2, 9),
                name: `${provider.charAt(0).toUpperCase() + provider.slice(1)} User`,
                email: `user@${provider}.com`,
                role: "customer" as const,
                created_at: new Date().toISOString()
            };
            login(mockUser);
            router.push(redirectPath);
        }, 1500);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#F5F5F7] font-sans p-4 md:p-8">
            <div className="w-full max-w-[1000px] flex flex-col md:flex-row gap-8 md:gap-12 lg:gap-16 items-center lg:items-stretch">

                {/* Left Side: Testimonial Image Carousel (Hidden on Small Screens) */}
                <div className="hidden md:flex flex-1 relative rounded-[24px] overflow-hidden shadow-2xl min-h-[600px]">
                    <AnimatePresence mode="wait">
                        <motion.img
                            key={currentBg}
                            src={bgImages[currentBg]}
                            initial={{ opacity: 0, scale: 1.05 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 1 }}
                            alt="Testimonial Background"
                            className="absolute inset-0 w-full h-full object-cover"
                        />
                    </AnimatePresence>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/50" />

                    <div className="relative z-10 p-10 flex flex-col justify-between h-full w-full">
                        <Logo className="h-10 w-auto scale-125 origin-left" variant="light" />

                        <div>
                            <h2 className="text-white text-3xl font-bold leading-tight mb-4 max-w-sm">
                                "As a FairPrice shopper, I get access to global deals securely, knowing my money is protected."
                            </h2>
                            <p className="text-white/80 font-medium">
                                Amanda - Lagos, Nigeria
                            </p>

                            {/* Carousel Indicators */}
                            <div className="flex gap-2 mt-6">
                                {bgImages.map((_, idx) => (
                                    <div
                                        key={idx}
                                        className={cn(
                                            "h-2 rounded-full transition-all duration-300",
                                            idx === currentBg ? "w-6 bg-brand-green-400" : "w-2 bg-white/50"
                                        )}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side: Login Form */}
                <div className="flex-1 w-full max-w-[440px] flex flex-col justify-center py-8">
                    {/* Logo Area */}
                    <div className="mb-8 md:hidden">
                        <Logo className="h-10 w-auto scale-125 origin-left" />
                    </div>
                    <div className="mb-8">
                        <h1 className="text-[32px] font-bold text-[#1d1d1f] tracking-tight mt-2 md:mt-8 mb-2">
                            Welcome
                        </h1>
                        <p className="text-[#86868b] text-[15px]">
                            Log in or create a FairPrice account to continue.
                        </p>
                    </div>

                    {/* Main Card */}
                    <motion.div
                        layout
                        className="bg-white rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 p-6 sm:p-8 relative overflow-hidden"
                    >
                        <AnimatePresence mode="wait">

                            {/* STEP 1: IDENTIFIER */}
                            {step === "identifier" && (
                                <motion.div
                                    key="step-identifier"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <form onSubmit={handleIdentifierSubmit} className="space-y-5">
                                        <div className="space-y-1.5">
                                            <label className="text-[13px] font-semibold text-[#1d1d1f]">Email Address <span className="text-red-500">*</span></label>
                                            <Input
                                                type="text"
                                                required
                                                placeholder="you@email.com"
                                                className="w-full h-12 bg-white border border-[#d2d2d7] text-[15px] text-[#1d1d1f] placeholder:text-[#86868b]/50 rounded-xl focus:border-brand-green-500 focus:ring-4 focus:ring-brand-green-500/10 transition-all px-4"
                                                value={identifier}
                                                onChange={(e) => setIdentifier(e.target.value)}
                                                list="email-domains"
                                            />
                                            {identifier && !identifier.includes('@') && isNaN(Number(identifier.replace(/\D/g, ''))) && (
                                                <datalist id="email-domains">
                                                    <option value={`${identifier}@gmail.com`} />
                                                    <option value={`${identifier}@yahoo.com`} />
                                                    <option value={`${identifier}@icloud.com`} />
                                                    <option value={`${identifier}@outlook.com`} />
                                                    <option value={`${identifier}@protonmail.com`} />
                                                    <option value={`${identifier}@hotmail.com`} />
                                                </datalist>
                                            )}
                                            {identifier.includes('@') && (
                                                <datalist id="email-domains">
                                                    <option value={`${identifier.split('@')[0]}@gmail.com`} />
                                                    <option value={`${identifier.split('@')[0]}@yahoo.com`} />
                                                    <option value={`${identifier.split('@')[0]}@icloud.com`} />
                                                    <option value={`${identifier.split('@')[0]}@outlook.com`} />
                                                    <option value={`${identifier.split('@')[0]}@protonmail.com`} />
                                                    <option value={`${identifier.split('@')[0]}@hotmail.com`} />
                                                </datalist>
                                            )}
                                        </div>
                                        <Button
                                            type="submit"
                                            disabled={isLoading || !identifier.trim()}
                                            className="w-full h-[52px] bg-[#d2d2d7]/50 hover:bg-brand-green-600 hover:text-white text-[#1d1d1f] font-bold text-[16px] rounded-xl transition-all disabled:opacity-50 mt-2"
                                        >
                                            {isLoading ? <Loader2 className="h-5 w-5 animate-spin text-[#1d1d1f]" /> : "Login"}
                                        </Button>
                                    </form>

                                    <div className="relative flex items-center py-6">
                                        <div className="flex-grow border-t border-gray-200" />
                                        <span className="px-4 text-[13px] text-[#86868b] font-medium">or</span>
                                        <div className="flex-grow border-t border-gray-200" />
                                    </div>

                                    <div className="flex flex-col gap-3">
                                        <button onClick={() => handleSocialLogin("google")} className="w-full h-12 bg-white border border-[#d2d2d7] hover:bg-gray-50 rounded-xl flex items-center justify-center gap-2 text-[14px] font-bold text-[#1d1d1f] transition-all">
                                            <svg className="h-5 w-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                                            Login with Google
                                        </button>
                                        <button onClick={() => handleSocialLogin("x")} className="w-full h-12 bg-white border border-[#d2d2d7] hover:bg-gray-50 rounded-xl flex items-center justify-center gap-2 text-[14px] font-bold text-[#1d1d1f] transition-all">
                                            <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.008 5.921H5.078z" /></svg>
                                            Login with Apple
                                        </button>
                                    </div>
                                </motion.div>
                            )}


                            {/* STEP 2A: EXISTING USER PASSWORD */}
                            {step === "password_existing" && (
                                <motion.div
                                    key="step-password-existing"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <div className="flex items-center gap-3 mb-6 bg-[#f5f5f7] p-3 rounded-xl border border-gray-100">
                                        <div className="h-10 w-10 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center text-gray-600 font-medium text-lg shrink-0">
                                            {identifier.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="overflow-hidden">
                                            <p className="text-[13px] text-[#86868b] font-medium">Signing in as</p>
                                            <p className="text-[15px] font-medium text-[#1d1d1f] truncate">{identifier}</p>
                                        </div>
                                        <button onClick={() => setStep("identifier")} className="ml-auto text-[13px] text-brand-green-600 hover:underline font-bold px-2 py-1">
                                            Change
                                        </button>
                                    </div>

                                    <form onSubmit={handleExistingLogin} className="space-y-5">
                                        <div className="space-y-1.5">
                                            <label className="text-[13px] font-semibold text-[#1d1d1f]">Password <span className="text-red-500">*</span></label>
                                            <div className="relative">
                                                <Input
                                                    ref={passwordInputRef}
                                                    type={showPassword ? "text" : "password"}
                                                    required
                                                    className="w-full h-12 bg-white border border-[#d2d2d7] text-[15px] text-[#1d1d1f] rounded-xl focus:border-brand-green-500 focus:ring-4 focus:ring-brand-green-500/10 transition-all px-4 pr-12"
                                                    value={password}
                                                    onChange={(e) => setPassword(e.target.value)}
                                                />
                                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input type="checkbox" className="rounded text-brand-green-600 focus:ring-brand-green-500/20" defaultChecked />
                                                <span className="text-[13px] text-[#1d1d1f] font-medium">Remember Password</span>
                                            </label>
                                            <Link href="#" className="text-[13px] font-bold text-brand-green-600 hover:underline">Forgot Password?</Link>
                                        </div>

                                        <Button type="submit" disabled={isLoading || !password} className="w-full h-[52px] bg-brand-green-600 hover:bg-brand-green-700 text-white font-bold text-[16px] rounded-xl transition-all">
                                            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Login"}
                                        </Button>
                                    </form>
                                </motion.div>
                            )}


                            {/* STEP 2B: NEW USER PASSWORD & SOCIAL */}
                            {step === "password_new" && (
                                <motion.div
                                    key="step-password-new"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.3 }}
                                    className="space-y-6"
                                >
                                    <div className="text-center mb-6">
                                        <div className="inline-flex items-center gap-2 bg-[#f5f5f7] px-4 py-2 rounded-full border border-gray-100">
                                            <span className="text-[13px] text-[#86868b]">Creating account for</span>
                                            <span className="text-[13px] font-medium text-[#1d1d1f]">{identifier}</span>
                                            <button onClick={() => setStep("identifier")} className="ml-1 text-brand-green-600 hover:underline text-[12px] font-medium">Edit</button>
                                        </div>
                                    </div>

                                    {error && (
                                        <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex gap-2">
                                            <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                                            <p className="text-[13px] text-red-700">{error}</p>
                                        </div>
                                    )}

                                    <form onSubmit={handleNewPasswordSubmit} className="space-y-4">
                                        <div className="relative">
                                            <Input
                                                ref={passwordInputRef}
                                                type={showPassword ? "text" : "password"}
                                                required
                                                placeholder="Create New Password"
                                                className="w-full h-14 bg-white border border-[#d2d2d7] text-[17px] text-[#1d1d1f] placeholder:text-[#86868b] rounded-xl focus:border-brand-green-500 focus:ring-4 focus:ring-brand-green-500/10 transition-all px-4 pr-12"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                            />
                                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                            </button>
                                        </div>

                                        <div className="relative">
                                            <Input
                                                type={showConfirmPassword ? "text" : "password"}
                                                required
                                                placeholder="Confirm Password"
                                                className={`w-full h-14 bg-white text-[17px] text-[#1d1d1f] placeholder:text-[#86868b] rounded-xl transition-all px-4 pr-12 border ${confirmPassword.length > 0 ? (passwordsMatch ? 'border-emerald-500 focus:ring-4 focus:ring-emerald-500/10' : 'border-red-500 focus:ring-4 focus:ring-red-500/10') : 'border-[#d2d2d7] focus:border-brand-green-500 focus:ring-4 focus:ring-brand-green-500/10'}`}
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                            />
                                        </div>

                                        {password.length > 0 && (
                                            <div className="px-2 space-y-1.5 mt-2">
                                                {passwordChecks.map((check) => (
                                                    <div key={check.label} className="flex items-center gap-2">
                                                        {check.pass ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <X className="h-3.5 w-3.5 text-gray-300" />}
                                                        <span className={`text-[12px] ${check.pass ? "text-emerald-600" : "text-[#86868b]"}`}>{check.label}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        <Button type="submit" disabled={!allPasswordChecksPassed || !passwordsMatch} className="w-full h-14 bg-brand-green-600 hover:bg-brand-green-700 text-white font-medium text-[17px] rounded-xl transition-all mt-4">
                                            Continue
                                        </Button>
                                    </form>

                                    <div className="relative flex items-center py-2">
                                        <div className="flex-grow border-t border-gray-200" />
                                        <span className="px-4 text-[13px] text-[#86868b]">or sign up with</span>
                                        <div className="flex-grow border-t border-gray-200" />
                                    </div>

                                    <div className="flex flex-col gap-3">
                                        <button onClick={() => handleSocialLogin("google")} className="w-full h-12 bg-white border border-[#d2d2d7] hover:bg-gray-50 rounded-xl flex items-center justify-center gap-2 text-[15px] font-medium text-[#1d1d1f] transition-all">
                                            <svg className="h-5 w-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                                            Login with Google
                                        </button>
                                        <button onClick={() => handleSocialLogin("x")} className="w-full h-12 bg-white border border-[#d2d2d7] hover:bg-gray-50 rounded-xl flex items-center justify-center gap-2 text-[15px] font-medium text-[#1d1d1f] transition-all">
                                            <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.008 5.921H5.078z" /></svg>
                                            Login with Apple
                                        </button>
                                    </div>
                                </motion.div>
                            )}


                            {/* STEP 3: NAMES */}
                            {step === "name_new" && (
                                <motion.div
                                    key="step-name"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <h2 className="text-[22px] font-semibold text-[#1d1d1f] mb-2 text-center">A bit about you</h2>
                                    <p className="text-[15px] text-[#86868b] text-center mb-8">What should we call you?</p>

                                    {error && (
                                        <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex gap-2 mb-4">
                                            <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                                            <p className="text-[13px] text-red-700">{error}</p>
                                        </div>
                                    )}

                                    <form onSubmit={handleNameSubmit} className="space-y-4">
                                        <Input
                                            ref={firstNameInputRef}
                                            type="text"
                                            required
                                            placeholder="First Name"
                                            className="w-full h-14 bg-white border border-[#d2d2d7] text-[17px] text-[#1d1d1f] placeholder:text-[#86868b] rounded-xl focus:border-brand-green-500 focus:ring-4 focus:ring-brand-green-500/10 transition-all px-4"
                                            value={firstName}
                                            onChange={(e) => setFirstName(e.target.value)}
                                        />
                                        <Input
                                            type="text"
                                            required
                                            placeholder="Last Name"
                                            className="w-full h-14 bg-white border border-[#d2d2d7] text-[17px] text-[#1d1d1f] placeholder:text-[#86868b] rounded-xl focus:border-brand-green-500 focus:ring-4 focus:ring-brand-green-500/10 transition-all px-4"
                                            value={lastName}
                                            onChange={(e) => setLastName(e.target.value)}
                                        />

                                        <div className="space-y-1">
                                            <label className="text-[13px] text-[#86868b] font-medium pl-1">Birthday (for personalized recommendations)</label>
                                            <Input
                                                type="date"
                                                placeholder="Birthday"
                                                className="w-full h-14 bg-white border border-[#d2d2d7] text-[17px] text-[#1d1d1f] placeholder:text-[#86868b] rounded-xl focus:border-brand-green-500 focus:ring-4 focus:ring-brand-green-500/10 transition-all px-4"
                                                value={birthday}
                                                onChange={(e) => setBirthday(e.target.value)}
                                            />
                                        </div>

                                        <Button type="submit" disabled={!firstName || !lastName} className="w-full h-14 bg-brand-green-600 hover:bg-brand-green-700 text-white font-medium text-[17px] rounded-xl transition-all mt-4">
                                            Continue
                                        </Button>
                                    </form>
                                </motion.div>
                            )}


                            {/* STEP 4: VERIFICATION */}
                            {step === "verification_new" && (
                                <motion.div
                                    key="step-verification"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.3 }}
                                    className="text-center"
                                >
                                    <h2 className="text-[22px] font-semibold text-[#1d1d1f] mb-2">Verify your account</h2>
                                    <p className="text-[15px] text-[#86868b] mb-2">
                                        We've sent a code to <br /><span className="font-semibold text-[#1d1d1f]">{identifier}</span>
                                    </p>

                                    <div className="flex gap-2 justify-center mb-6 mt-6">
                                        {[0, 1, 2, 3, 4, 5].map((idx) => (
                                            <Input
                                                key={idx}
                                                id={`otp-${idx}`}
                                                className="w-12 h-14 text-center text-xl font-bold bg-[#F5F5F7] border-transparent focus:border-brand-green-500 focus:ring-2 focus:ring-brand-green-500/20 focus:bg-white rounded-xl"
                                                maxLength={1}
                                                autoFocus={idx === 0}
                                                inputMode="numeric"
                                                pattern="[0-9]*"
                                                onKeyDown={(e) => {
                                                    if (e.key === "Backspace" && !(e.target as HTMLInputElement).value && idx > 0) {
                                                        document.getElementById(`otp-${idx - 1}`)?.focus();
                                                    }
                                                }}
                                                onChange={(e) => {
                                                    const val = e.target.value.replace(/\D/g, "");
                                                    e.target.value = val;
                                                    if (val && idx < 5) {
                                                        document.getElementById(`otp-${idx + 1}`)?.focus();
                                                    }
                                                }}
                                            />
                                        ))}
                                    </div>

                                    <div className="mb-8">
                                        <button className="text-sm text-brand-green-600 font-bold hover:underline">
                                            Didn't send me a code?
                                        </button>
                                    </div>

                                    <div className="space-y-3">
                                        <Button onClick={() => handleFinalizeRegistration(false)} disabled={isLoading} className="w-full h-14 bg-brand-green-600 hover:bg-brand-green-700 text-white font-medium text-[17px] rounded-xl transition-all shadow-sm">
                                            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Verify & Sign In"}
                                        </Button>
                                    </div>
                                    <p className="text-[12px] text-[#86868b] mt-4">
                                        By continuing, I accept the <Link href="/legal/conditions" className="font-bold hover:underline">Legal Terms</Link>
                                    </p>
                                </motion.div>
                            )}

                        </AnimatePresence>
                    </motion.div>

                    {/* Jumia Style Legal Footer Links */}
                    <div className="mt-8 text-center text-[12px] text-[#86868b]">
                        <div className="flex flex-wrap justify-center gap-x-4 mb-4 font-medium uppercase tracking-wider text-[10px]">
                            <Link href="#" className="hover:text-[#1d1d1f]">Terms of Use</Link>
                            <span>|</span>
                            <Link href="#" className="hover:text-[#1d1d1f]">Privacy Policy</Link>
                            <span>|</span>
                            <Link href="#" className="hover:text-[#1d1d1f]">FAQ</Link>
                        </div>
                        <div className="p-4 border border-gray-200 rounded-xl bg-gray-50/50">
                            <h4 className="font-bold text-[#1d1d1f] mb-1">DOWNLOAD FAIRPRICE FREE APP</h4>
                            <p className="text-xs mb-4">Get access to exclusive offers!</p>

                            <div className="flex justify-between text-left gap-4 mt-4">
                                <div>
                                    <h4 className="font-bold text-[#1d1d1f] mb-2">NEED HELP?</h4>
                                    <ul className="space-y-1.5">
                                        <li><Link href="#" className="hover:text-emerald-600 hover:underline transition-colors">Chat with us</Link></li>
                                        <li><Link href="#" className="hover:text-emerald-600 hover:underline transition-colors">Help Center</Link></li>
                                        <li><Link href="#" className="hover:text-emerald-600 hover:underline transition-colors">Contact Us</Link></li>
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="font-bold text-[#1d1d1f] mb-2">USEFUL LINKS</h4>
                                    <ul className="space-y-1.5">
                                        <li><Link href="#" className="hover:text-emerald-600 hover:underline transition-colors">Service Center</Link></li>
                                        <li><Link href="#" className="hover:text-emerald-600 hover:underline transition-colors">How to shop on FairPrice?</Link></li>
                                        <li><Link href="#" className="hover:text-emerald-600 hover:underline transition-colors">Delivery options and timelines</Link></li>
                                        <li><Link href="/legal/consumer-protection" className="hover:text-emerald-600 hover:underline transition-colors">Dispute Resolution Policy</Link></li>
                                        <li><Link href="#" className="hover:text-emerald-600 hover:underline transition-colors">Returns & Refund Timeline</Link></li>
                                        <li><Link href="#" className="hover:text-emerald-600 hover:underline transition-colors">Pickup Stations</Link></li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
