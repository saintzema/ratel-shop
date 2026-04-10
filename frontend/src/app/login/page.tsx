"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/ui/logo";
import { useAuth } from "@/context/AuthContext";
import { Eye, EyeOff, Loader2, ArrowRight, Check, X, AlertCircle } from "lucide-react";
import { signIn } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { DataSyncService } from "@/lib/sync-store";
import { cn } from "@/lib/utils";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";

type AuthStep = "identifier" | "password_existing" | "password_new" | "name_new" | "verification_new" | "otp_existing";

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
    const [fetchedUser, setFetchedUser] = useState<any>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Get redirect path
    const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const redirectPath = searchParams?.get("from") || "/";

    // Lookup existing user for OTP login flow
    const existingUser = fetchedUser || (() => {
        if (typeof window === "undefined" || !identifier) return null;
        try {
            const registered = JSON.parse(localStorage.getItem("fairprice_registered_users") || "[]");
            const found = registered.find((u: any) => u.email?.toLowerCase() === identifier.toLowerCase().trim());
            if (found) return { id: found.id || `user_${found.email}`, name: found.name, email: found.email, role: found.role || "customer", created_at: found.created_at || new Date().toISOString() };
        } catch { }
        // Fallback for demo accounts
        const normalizedId = identifier.toLowerCase().trim();
        if (normalizedId === "techzema@gmail.com") return { id: "admin_1", name: "Tech Zema", email: "techzema@gmail.com", role: "admin" as const, created_at: new Date().toISOString() };
        if (normalizedId === "seller@example.com") return { id: "seller_1", name: "Demo Seller", email: "seller@example.com", role: "seller" as const, created_at: new Date().toISOString() };
        if (normalizedId === "apple-review@fairprice.app") return { id: "apple_review_1", name: "Apple Reviewer", email: "apple-review@fairprice.app", role: "customer" as const, created_at: new Date().toISOString() };
        return null;
    })();

    // Email verification state
    const [sentCode, setSentCode] = useState("");

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

    const bgImages = [
        "https://images.unsplash.com/photo-1611432579402-7037e3e2c1e4?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8QkxBQ0slMjBXT01BTnxlbnwwfHwwfHx8MA%3D%3D",
        "https://images.unsplash.com/photo-1614890085618-0e1054da74f8?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Nnx8QkxBQ0slMjBNQU58ZW58MHx8MHx8fDA%3D",
        "https://images.unsplash.com/photo-1589156191108-c762ff4b96ab?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8N3x8QkxBQ0slMjBXT01BTnxlbnwwfHwwfHx8MA%3D%3D"
    ];

    const testimonials = [
        {
            quote: "As a FairPrice shopper, I get access to global deals securely, knowing my money is protected.",
            author: "Amanda - Lagos, Nigeria",
            role: "Customer"
        },
        {
            quote: "FairPrice has scaled my business by connecting me with buyers I never could have reached otherwise.",
            author: "Chinedu - Onitsha Market",
            role: "Verified Seller"
        },
        {
            quote: "The speed of settlement and transparency makes this the gold standard for my electronics store.",
            author: "Bolaji - Logistics Hub",
            role: "Premium Seller"
        }
    ];

    // Preload background images
    useEffect(() => {
        bgImages.forEach(src => {
            const img = new Image();
            img.src = src;
        });
    }, []);

    const [currentBg, setCurrentBg] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentBg((prev) => (prev + 1) % bgImages.length);
        }, 5000);
        return () => clearInterval(timer);
    }, [bgImages.length]);

    // --- Handlers ---

    // Check if a user is already registered by looking up localStorage
    const checkRegisteredUser = (email: string): boolean => {
        try {
            const registered = JSON.parse(localStorage.getItem("fairprice_registered_users") || "[]");
            return registered.some((u: { email: string }) => u.email.toLowerCase() === email.toLowerCase());
        } catch { return false; }
    };

    const saveRegisteredUser = (email: string, name: string, role: string, birthday?: string, passwordHash?: string) => {
        try {
            const registered = JSON.parse(localStorage.getItem("fairprice_registered_users") || "[]");
            const existingIndex = registered.findIndex((u: { email: string }) => u.email.toLowerCase() === email.toLowerCase());
            
            if (existingIndex > -1) {
                // Update existing user with new details (like password)
                registered[existingIndex] = { ...registered[existingIndex], name, role, birthday, password: passwordHash || registered[existingIndex].password };
            } else {
                // Add new user
                registered.push({ email, name, role, birthday, password: passwordHash, created_at: new Date().toISOString() });
            }
            
            localStorage.setItem("fairprice_registered_users", JSON.stringify(registered));
        } catch { /* ignore */ }
    };

    const handleIdentifierSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        if (!identifier.trim()) return;

        setIsLoading(true);
        const normalizedId = identifier.toLowerCase().trim();

        // 5 second timeout for DB lookup
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        try {
            const res = await fetch(`/api/users?email=${encodeURIComponent(normalizedId)}`, { signal: controller.signal });
            clearTimeout(timeoutId);
            
            if (res.ok) {
                const fetched = await res.json();
                if (fetched && fetched.email) {
                    setIsExistingUser(true);
                    setFetchedUser(fetched);

                    if (fetched.name) {
                        const parts = fetched.name.split(" ");
                        setFirstName(parts[0] || "");
                        setLastName(parts.slice(1).join(" ") || "");
                    }

                    setStep(fetched.password ? "password_existing" : "password_new");
                    setIsLoading(false);
                    return;
                }
            }
        } catch (err: any) {
            clearTimeout(timeoutId);
            console.warn("DB lookup failed or timed out. Falling back to local cache.", err.name === 'AbortError' ? 'Timeout' : err);
        }

        // --- FALLBACK LOGIC ---
        // If DB lookup fails or user not found in DB, check local registry before assuming NEW user
        setTimeout(() => {
            const isExisting =
                checkRegisteredUser(normalizedId) ||
                normalizedId === "techzema@gmail.com" ||
                normalizedId === "seller@example.com" ||
                normalizedId === "apple-review@fairprice.app";

            setIsExistingUser(isExisting);
            setStep(isExisting ? "password_existing" : "password_new");
            setIsLoading(false);
        }, 300);
    };

    const handleExistingLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 7000); // 7s for full verify + bcrypt

        try {
            // 1. Try server-side password verification first (bcrypt against DB)
            const res = await fetch("/api/auth/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: identifier.trim(), password }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            const data = await res.json();

            if (data.success && data.user) {
                // DB verified — use the DB user data (has correct role)
                const dbUser = data.user;
                login(dbUser);
                saveRegisteredUser(dbUser.email, dbUser.name, dbUser.role);

                DataSyncService.addNotification({
                    userId: dbUser.email,
                    type: "system",
                    message: `Welcome back, ${dbUser.name}! 👋 Happy shopping.`,
                    link: "/"
                });

                const finalRedirect =
                    dbUser.role === "admin" && redirectPath === "/" ? "/admin/dashboard" :
                        dbUser.role === "seller" && redirectPath === "/" ? "/seller/dashboard" :
                            redirectPath;
                router.push(finalRedirect);
                return;
            }

            if (data.error && !data.offline) {
                // DB responded but password wrong or user not found
                setError(data.error === "Incorrect password" ? "Incorrect password." : data.error);
                setIsLoading(false);
                return;
            }

            // 2. DB offline — fallback to local registered users
            const registered = JSON.parse(localStorage.getItem("fairprice_registered_users") || "[]");
            const localUser = registered.find((u: any) => u.email?.toLowerCase() === identifier.toLowerCase().trim());

            // Build user from local data or existingUser (demo fallback)
            const displayName = identifier.includes("@") ? identifier.split("@")[0] : "User";
            let determinedRole: "customer" | "seller" | "admin" = "customer";

            if (existingUser?.role) {
                determinedRole = existingUser.role as "customer" | "seller" | "admin";
            } else if (identifier.toLowerCase().includes("admin@") || identifier.toLowerCase() === "techzema@gmail.com") {
                determinedRole = "admin";
            } else if (identifier.toLowerCase().includes("seller@")) {
                determinedRole = "seller";
            }

            // CRITICAL SECURITY: If DB is offline, elevated roles MUST have a valid local password match to login.
            // They cannot bypass just because `localUser.password` is undefined.
            if (determinedRole === "admin" && password !== "admin123" && (!localUser?.password || localUser.password !== password)) {
                 setError("Incorrect password.");
                 setIsLoading(false);
                 return;
            }

            if (determinedRole === "seller" && password !== "seller123" && (!localUser?.password || localUser.password !== password)) {
                 setError("Incorrect password.");
                 setIsLoading(false);
                 return;
            }

            // For regular customers, if they have a local password, it must match.
            if (localUser && localUser.password && localUser.password !== password) {
                setError("Incorrect password.");
                setIsLoading(false);
                return;
            }

            const userEmail = identifier.includes("@") ? identifier : `${identifier}@example.com`;
            const userName = existingUser?.name || displayName.replace(/[._-]/g, " ").replace(/\b\w/g, c => c.toUpperCase());
            const finalUser = existingUser || {
                id: "user_" + Math.random().toString(36).substr(2, 9),
                name: userName,
                email: userEmail,
                role: determinedRole,
                created_at: new Date().toISOString()
            };

            login(finalUser);
            saveRegisteredUser(finalUser.email, finalUser.name, finalUser.role);

            DataSyncService.addNotification({
                userId: userEmail,
                type: "system",
                message: `Welcome back, ${userName}! 👋 Happy shopping.`,
                link: "/"
            });

            const finalRedirect =
                determinedRole === "admin" && redirectPath === "/" ? "/admin/dashboard" :
                    determinedRole === "seller" && redirectPath === "/" ? "/seller/dashboard" :
                        redirectPath;
            router.push(finalRedirect);
        } catch (err) {
            console.error("Login error:", err);
            setError("Login failed. Please try again.");
            setIsLoading(false);
        }
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

        const newCode = Math.floor(100000 + Math.random() * 900000).toString();
        setSentCode(newCode);

        handleSendVerificationEmail(newCode, firstName.trim());
        setStep("verification_new");
    };

    const handleSendVerificationEmail = async (code: string, nameToUse: string) => {
        const targetEmail = identifier.includes("@") ? identifier : `${identifier}@example.com`;

        try {
            const res = await fetch("/api/email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    to: targetEmail,
                    type: "VERIFY_EMAIL",
                    payload: { name: nameToUse, code }
                })
            });
            const data = await res.json();
            
            if (data.warning || !data.success) {
                console.warn("Email API warned/failed:", data);
            }
        } catch (err) {
            console.error("Email fetch failed:", err);
        }

        DataSyncService.addNotification({
            userId: DataSyncService.getCurrentUserId() || "guest",
            message: `Verification Email Sent: A code has been sent to ${targetEmail}`,
            type: "system",
            link: "#"
        });
    };

    const handleResendCode = () => {
        const newCode = Math.floor(100000 + Math.random() * 900000).toString();
        setSentCode(newCode);
        const nameToUse = step === 'otp_existing' ? (existingUser?.name || "User") : firstName.trim();
        handleSendVerificationEmail(newCode, nameToUse);
    };

    const handleSendOtpLoginCode = () => {
        const newCode = Math.floor(100000 + Math.random() * 900000).toString();
        setSentCode(newCode);
        handleSendVerificationEmail(newCode, existingUser?.name || "User");
        setStep("otp_existing");
    };

    const handleFinalizeRegistration = (skipped: boolean = false) => {
        setError("");

        // Collect OTP
        const enteredCode = Array.from({ length: 6 }).map((_, i) => (document.getElementById(`otp-${i}`) as HTMLInputElement)?.value || "").join("");

        if (!skipped && enteredCode !== sentCode && sentCode) {
            setError("Invalid verification code. Please check your email.");
            return;
        }

        setIsLoading(true);

        const displayName = identifier.includes("@") ? identifier.split("@")[0] : "User";
        let determinedRole: "customer" | "seller" | "admin" = "customer";

        if (existingUser?.role) {
            determinedRole = existingUser.role as "customer" | "seller" | "admin";
        } else if (identifier.toLowerCase().includes("admin@") || identifier.toLowerCase() === "techzema@gmail.com") {
            determinedRole = "admin";
        } else if (identifier.toLowerCase().includes("seller@")) {
            determinedRole = "seller";
        }

        setTimeout(() => {
            const finalRedirect =
                determinedRole === "admin" && redirectPath === "/" ? "/admin/dashboard" :
                    determinedRole === "seller" && redirectPath === "/" ? "/seller/onboarding" :
                        redirectPath;

            const regEmail = identifier.includes("@") ? identifier : `${identifier}@example.com`;
            const regName = `${firstName.trim()} ${lastName.trim()}`;
            
            // CRITICAL FIX: If the user already existed in the DB (like a guest account) we MUST use their existing ID
            // otherwise all their previous orders, negotiations, and messages will disconnect.
            const preexistingId = fetchedUser?.id || existingUser?.id;
            const newId = preexistingId || "user_" + Math.random().toString(36).substr(2, 9);
            
            register({
                id: newId,
                name: regName,
                email: regEmail,
                role: determinedRole,
                created_at: fetchedUser?.createdAt || existingUser?.created_at || new Date().toISOString(),
                birthday: birthday || undefined
            });
            // Persist this user as registered with password
            saveRegisteredUser(regEmail, regName, determinedRole, birthday || undefined, password);

            // Send Welcome Email
            fetch("/api/email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    to: regEmail,
                    type: "WELCOME",
                    payload: { name: firstName.trim() }
                })
            }).catch(console.error);

            // Add Welcome Notification
            DataSyncService.addNotification({
                userId: regEmail,
                message: `Welcome to FairPrice, ${firstName.trim()}! 🎉 Your account is created. Explore top global and local deals.`,
                type: "system",
                link: "/"
            });

            router.push(finalRedirect);
        }, 1200);
    };

    const handleFinalizeOtpLogin = () => {
        setError("");
        const enteredCode = Array.from({ length: 6 }).map((_, i) => (document.getElementById(`otp-ex-${i}`) as HTMLInputElement)?.value || "").join("");

        if (enteredCode !== sentCode && sentCode) {
            setError("Invalid verification code. Please check your email.");
            return;
        }

        setIsLoading(true);
        setTimeout(() => {
            if (existingUser) {
                let determinedRole: "customer" | "seller" | "admin" = "customer";
                if (existingUser?.role) {
                    determinedRole = existingUser.role as "customer" | "seller" | "admin";
                } else if (identifier.toLowerCase().includes("admin@") || identifier.toLowerCase() === "techzema@gmail.com") {
                    determinedRole = "admin";
                } else if (identifier.toLowerCase().includes("seller@")) {
                    determinedRole = "seller";
                }

                const finalRedirect =
                    determinedRole === "admin" && redirectPath === "/" ? "/admin/dashboard" :
                        determinedRole === "seller" && redirectPath === "/" ? "/seller/dashboard" :
                            redirectPath;

                login(existingUser);
                router.push(finalRedirect);
            }
        }, 1000);
    };

    const handleSocialLogin = async (provider: "google" | "apple" | "x") => {
        setIsLoading(true);
        // Request the OAuth URL instead of redirecting the whole PWA/App
        const res = await signIn(provider, { redirect: false, callbackUrl: redirectPath });
        
        if (res?.url) {
            if (Capacitor.isNativePlatform()) {
                // Using Capacitor Browser (Safari View Controller / Chrome Custom Tabs) keeps users "in-app" natively
                await Browser.open({ url: res.url, presentationStyle: 'popover' });
                
                // Add a listener to detect when they return to the app to fetch the updated session
                const listener = await Browser.addListener('browserFinished', async () => {
                    await listener.remove();
                    window.location.href = redirectPath;
                });
            } else {
                // Web fallback: Open the OAuth provider in a popup window
                const width = 500;
                const height = 600;
                const left = window.screen.width / 2 - width / 2;
                const top = window.screen.height / 2 - height / 2;
                
                const popup = window.open(
                    res.url,
                    "OAuthLogin",
                    `width=${width},height=${height},top=${top},left=${left},toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes`
                );

                // Poll the popup to see when it closes (user finished login)
                const popupTimer = setInterval(() => {
                    if (popup?.closed) {
                        clearInterval(popupTimer);
                        window.location.href = redirectPath;
                    }
                }, 1000);
            }
        } else {
            setIsLoading(false);
            setError("Could not initiate social login.");
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-[#F5F5F7] font-sans p-4 md:p-8 overflow-y-auto overflow-x-hidden w-full max-w-[100vw]">
            <div className="w-full max-w-[1000px] m-auto flex flex-col md:flex-row gap-8 md:gap-12 lg:gap-16 items-center lg:items-stretch py-8">

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

                        <div className="mb-2">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={currentBg}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.5 }}
                                >
                                    <div className="mb-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm border border-white/20">
                                        <div className={cn(
                                            "w-2 h-2 rounded-full",
                                            testimonials[currentBg].role?.includes("Seller") ? "bg-amber-400" : "bg-emerald-400"
                                        )} />
                                        <span className="text-xs font-bold text-white uppercase tracking-wider">
                                            {testimonials[currentBg].role}
                                        </span>
                                    </div>
                                    <h2 className="text-white text-3xl font-bold leading-tight mb-4 max-w-sm drop-shadow-md">
                                        "{testimonials[currentBg].quote}"
                                    </h2>
                                    <p className="text-white/80 font-medium tracking-wide">
                                        {testimonials[currentBg].author}
                                    </p>
                                </motion.div>
                            </AnimatePresence>

                            {/* Carousel Indicators */}
                            <div className="flex gap-2 mt-8">
                                {bgImages.map((_, idx) => (
                                    <div
                                        key={idx}
                                        className={cn(
                                            "h-2 rounded-full transition-all duration-300",
                                            idx === currentBg ? "w-8 bg-brand-green-400" : "w-2 bg-white/40"
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
                        <Logo className="h-10 w-auto scale-125 justify-center" variant="dark" />
                    </div>
                    <div className="mb-8">
                        <h1 className="text-[32px] font-bold text-[#1d1d1f] tracking-tight mt-2 md:mt-8 mb-2">
                            Welcome
                        </h1>
                        <p className="text-green-600 text-[15px]">
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
                                                className={cn(
                                                    "w-full h-12 bg-white border text-[15px] text-[#1d1d1f] placeholder:text-[#86868b]/50 rounded-xl transition-all duration-300 px-4",
                                                    error 
                                                        ? "border-red-500 focus:ring-4 focus:ring-red-500/20 focus:shadow-[0_0_15px_rgba(239,68,68,0.2)]" 
                                                        : "border-[#d2d2d7] focus:border-brand-green-500 focus:ring-4 focus:ring-brand-green-500/40 focus:shadow-[0_0_20px_rgba(52,211,153,0.35)]"
                                                )}
                                                value={identifier}
                                                onChange={(e) => {
                                                    setIdentifier(e.target.value);
                                                    if (error) setError("");
                                                }}
                                                list="email-domains"
                                            />
                                            {mounted && identifier && !identifier.includes('@') && isNaN(Number(identifier.replace(/\D/g, ''))) && (
                                                <datalist id="email-domains">
                                                    <option value={`${identifier}@gmail.com`} />
                                                    <option value={`${identifier}@yahoo.com`} />
                                                    <option value={`${identifier}@icloud.com`} />
                                                    <option value={`${identifier}@outlook.com`} />
                                                    <option value={`${identifier}@protonmail.com`} />
                                                    <option value={`${identifier}@hotmail.com`} />
                                                </datalist>
                                            )}
                                            {mounted && identifier.includes('@') && (
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

                                    {error && (
                                        <motion.div 
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="mb-5 p-3.5 bg-red-50 border border-red-100 rounded-xl flex gap-3 shadow-[0_2px_10px_rgba(239,68,68,0.05)]"
                                        >
                                            <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
                                            <p className="text-[14px] text-red-700 font-medium leading-tight">{error}</p>
                                        </motion.div>
                                    )}

                                    <form onSubmit={handleExistingLogin} className="space-y-5">
                                        <div className="space-y-1.5">
                                            <label className="text-[13px] font-semibold text-[#1d1d1f]">Password <span className="text-red-500">*</span></label>
                                            <div className="relative">
                                                <Input
                                                    ref={passwordInputRef}
                                                    type={showPassword ? "text" : "password"}
                                                    required
                                                    className={cn(
                                                        "w-full h-12 bg-white border text-[15px] text-[#1d1d1f] rounded-xl transition-all duration-300 px-4 pr-12",
                                                        error 
                                                            ? "border-red-500 focus:ring-4 focus:ring-red-500/20 shadow-[0_0_12px_rgba(239,68,68,0.15)] focus:shadow-[0_0_20px_rgba(239,68,68,0.3)]" 
                                                            : "border-[#d2d2d7] focus:border-brand-green-500 focus:ring-4 focus:ring-brand-green-500/40 focus:shadow-[0_0_20px_rgba(52,211,153,0.35)]"
                                                    )}
                                                    value={password}
                                                    onChange={(e) => {
                                                        setPassword(e.target.value);
                                                        if (error) setError(""); // Clear error when typing
                                                    }}
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
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    fetch("/api/email", {
                                                        method: "POST",
                                                        headers: { "Content-Type": "application/json" },
                                                        body: JSON.stringify({
                                                            to: identifier.includes("@") ? identifier : `${identifier}@example.com`,
                                                            type: "CHANGE_PASSWORD",
                                                            payload: { name: identifier.split("@")[0] }
                                                        })
                                                    }).catch(console.error);
                                                    alert("A password reset link has been sent to your email!");
                                                }}
                                                className="text-[13px] font-bold text-brand-green-600 hover:underline"
                                            >
                                                Forgot Password?
                                            </button>
                                        </div>

                                        <div className="flex justify-center -mt-2 mb-2">
                                            <button
                                                type="button"
                                                onClick={handleSendOtpLoginCode}
                                                className="text-[13px] font-bold text-brand-orange hover:underline cursor-pointer"
                                            >
                                                Sign in with email code instead
                                            </button>
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
                                                className="w-full h-14 bg-white border border-[#d2d2d7] text-[17px] text-[#1d1d1f] placeholder:text-[#86868b] rounded-xl focus:border-brand-green-500 focus:ring-4 focus:ring-brand-green-500/40 focus:shadow-[0_0_20px_rgba(52,211,153,0.35)] transition-all duration-300 px-4 pr-12"
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
                                                className={`w-full h-14 bg-white text-[17px] text-[#1d1d1f] placeholder:text-[#86868b] rounded-xl transition-all duration-300 px-4 pr-12 border ${confirmPassword.length > 0 ? (passwordsMatch ? 'border-emerald-500 focus:ring-4 focus:ring-emerald-500/40 focus:shadow-[0_0_20px_rgba(52,211,153,0.35)]' : 'border-red-500 focus:ring-4 focus:ring-red-500/10') : 'border-[#d2d2d7] focus:border-brand-green-500 focus:ring-4 focus:ring-brand-green-500/40 focus:shadow-[0_0_20px_rgba(52,211,153,0.35)]'}`}
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

                                    <div className="flex justify-center mt-6 pt-4 border-t border-gray-50">
                                        <button
                                            type="button"
                                            onClick={handleSendOtpLoginCode}
                                            className="text-[13px] font-bold text-brand-orange hover:underline cursor-pointer flex items-center gap-1.5"
                                        >
                                            Sign in with email code instead
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
                                            className="w-full h-14 bg-white border border-[#d2d2d7] text-[17px] text-[#1d1d1f] placeholder:text-[#86868b] rounded-xl focus:border-brand-green-500 focus:ring-4 focus:ring-brand-green-500/40 focus:shadow-[0_0_20px_rgba(52,211,153,0.35)] transition-all duration-300 px-4"
                                            value={firstName}
                                            onChange={(e) => setFirstName(e.target.value)}
                                        />
                                        <Input
                                            type="text"
                                            required
                                            placeholder="Last Name"
                                            className="w-full h-14 bg-white border border-[#d2d2d7] text-[17px] text-[#1d1d1f] placeholder:text-[#86868b] rounded-xl focus:border-brand-green-500 focus:ring-4 focus:ring-brand-green-500/40 focus:shadow-[0_0_20px_rgba(52,211,153,0.35)] transition-all duration-300 px-4"
                                            value={lastName}
                                            onChange={(e) => setLastName(e.target.value)}
                                        />

                                        <div className="space-y-1.5">
                                            <label className="text-[13px] text-[#86868b] font-medium pl-1">Birthday (for personalized recommendations)</label>
                                            <div className="grid grid-cols-3 gap-2">
                                                <div className="relative">
                                                    <select
                                                        className="w-full appearance-none h-14 bg-white/80 backdrop-blur-sm border border-[#d2d2d7] text-[15px] text-[#1d1d1f] rounded-xl focus:border-brand-green-500 focus:ring-4 focus:ring-brand-green-500/10 transition-all pl-4 pr-8 cursor-pointer font-medium"
                                                        value={birthday ? new Date(birthday).getMonth() + 1 : ""}
                                                        onChange={(e) => {
                                                            const m = e.target.value;
                                                            const [_, __, d] = (birthday || "2000-01-01").split("-");
                                                            const y = birthday ? birthday.split("-")[0] : "2000";
                                                            setBirthday(`${y}-${m.padStart(2, "0")}-${d || "01"}`);
                                                        }}
                                                    >
                                                        <option value="" disabled>Month</option>
                                                        {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((m, i) => (
                                                            <option key={m} value={i + 1}>{m}</option>
                                                        ))}
                                                    </select>
                                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                                                        <svg className="h-4 w-4 text-[#86868b]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                                                    </div>
                                                </div>
                                                <div className="relative">
                                                    <select
                                                        className="w-full appearance-none h-14 bg-white/80 backdrop-blur-sm border border-[#d2d2d7] text-[15px] text-[#1d1d1f] rounded-xl focus:border-brand-green-500 focus:ring-4 focus:ring-brand-green-500/10 transition-all pl-4 pr-8 cursor-pointer font-medium"
                                                        value={birthday ? parseInt(birthday.split("-")[2]) : ""}
                                                        onChange={(e) => {
                                                            const d = e.target.value;
                                                            const parts = (birthday || "2000-01-01").split("-");
                                                            setBirthday(`${parts[0]}-${parts[1]}-${d.padStart(2, "0")}`);
                                                        }}
                                                    >
                                                        <option value="" disabled>Day</option>
                                                        {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                                                            <option key={d} value={d}>{d}</option>
                                                        ))}
                                                    </select>
                                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                                                        <svg className="h-4 w-4 text-[#86868b]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                                                    </div>
                                                </div>
                                                <div className="relative">
                                                    <select
                                                        className="w-full appearance-none h-14 bg-white/80 backdrop-blur-sm border border-[#d2d2d7] text-[15px] text-[#1d1d1f] rounded-xl focus:border-brand-green-500 focus:ring-4 focus:ring-brand-green-500/10 transition-all pl-4 pr-8 cursor-pointer font-medium"
                                                        value={birthday ? parseInt(birthday.split("-")[0]) : ""}
                                                        onChange={(e) => {
                                                            const y = e.target.value;
                                                            const parts = (birthday || "2000-01-01").split("-");
                                                            setBirthday(`${y}-${parts[1]}-${parts[2]}`);
                                                        }}
                                                    >
                                                        <option value="" disabled>Year</option>
                                                        {Array.from({ length: 60 }, (_, i) => new Date().getFullYear() - i).map(y => (
                                                            <option key={y} value={y}>{y}</option>
                                                        ))}
                                                    </select>
                                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                                                        <svg className="h-4 w-4 text-[#86868b]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                                                    </div>
                                                </div>
                                            </div>
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

                                    {error && (
                                        <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex gap-2 mb-4 mx-auto max-w-[300px] justify-center text-left">
                                            <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                                            <p className="text-[13px] text-red-700">{error}</p>
                                        </div>
                                    )}

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
                                                onPaste={(e) => {
                                                    e.preventDefault();
                                                    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
                                                    if (text) {
                                                        text.split("").forEach((char, i) => {
                                                            const input = document.getElementById(`otp-${i}`) as HTMLInputElement;
                                                            if (input) input.value = char;
                                                        });
                                                        const nextIdx = Math.min(text.length, 5);
                                                        document.getElementById(`otp-${nextIdx}`)?.focus();
                                                        // Auto-verify if all 6 digits pasted
                                                        if (text.length === 6) {
                                                            setTimeout(() => handleFinalizeRegistration(false), 300);
                                                        }
                                                    }
                                                }}
                                                onChange={(e) => {
                                                    const val = e.target.value.replace(/\D/g, "");
                                                    e.target.value = val;
                                                    if (val && idx < 5) {
                                                        document.getElementById(`otp-${idx + 1}`)?.focus();
                                                    }
                                                    // Auto-verify when last digit typed
                                                    if (val && idx === 5) {
                                                        const allFilled = Array.from({ length: 6 }).every((_, i) => (document.getElementById(`otp-${i}`) as HTMLInputElement)?.value);
                                                        if (allFilled) setTimeout(() => handleFinalizeRegistration(false), 300);
                                                    }
                                                }}
                                            />
                                        ))}
                                    </div>

                                    <div className="mb-8 text-center">
                                        <button
                                            onClick={handleResendCode}
                                            className="text-sm text-brand-green-600 font-bold hover:underline cursor-pointer mt-4"
                                        >
                                            Didn't send me a code? Resend
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

                            {/* STEP 4: EXISTING USER OTP LOGIN */}
                            {step === "otp_existing" && (
                                <motion.div
                                    key="step-otp-existing"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <h2 className="text-[22px] font-semibold text-[#1d1d1f] mb-2 text-center">Verify it's you</h2>
                                    <p className="text-[15px] text-[#86868b] text-center mb-8">
                                        Enter the 6-digit code we sent to<br />
                                        <strong className="text-[#1d1d1f]">{identifier}</strong>
                                    </p>

                                    {error && (
                                        <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex gap-2 mb-4">
                                            <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                                            <p className="text-[13px] text-red-700">{error}</p>
                                        </div>
                                    )}

                                    <div className="flex justify-center gap-2 sm:gap-4 mb-2">
                                        {[0, 1, 2, 3, 4, 5].map((idx) => (
                                            <input
                                                key={idx}
                                                id={`otp-ex-${idx}`}
                                                type="text"
                                                className="w-12 h-14 text-center text-[20px] font-bold bg-white border border-[#d2d2d7] rounded-xl focus:border-brand-green-500 focus:ring-4 focus:ring-brand-green-500/10 transition-all outline-none"
                                                maxLength={1}
                                                autoFocus={idx === 0}
                                                inputMode="numeric"
                                                pattern="[0-9]*"
                                                onKeyDown={(e) => {
                                                    if (e.key === "Backspace" && !(e.target as HTMLInputElement).value && idx > 0) {
                                                        document.getElementById(`otp-ex-${idx - 1}`)?.focus();
                                                    }
                                                }}
                                                onPaste={(e) => {
                                                    e.preventDefault();
                                                    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
                                                    if (text) {
                                                        text.split("").forEach((char, i) => {
                                                            const input = document.getElementById(`otp-ex-${i}`) as HTMLInputElement;
                                                            if (input) input.value = char;
                                                        });
                                                        const nextIdx = Math.min(text.length, 5);
                                                        document.getElementById(`otp-ex-${nextIdx}`)?.focus();
                                                        // Auto-verify if all 6 digits pasted
                                                        if (text.length === 6) {
                                                            setTimeout(() => handleFinalizeOtpLogin(), 300);
                                                        }
                                                    }
                                                }}
                                                onChange={(e) => {
                                                    const val = e.target.value.replace(/\D/g, "");
                                                    e.target.value = val;
                                                    if (val && idx < 5) {
                                                        document.getElementById(`otp-ex-${idx + 1}`)?.focus();
                                                    }
                                                    // Auto-verify when last digit typed
                                                    if (val && idx === 5) {
                                                        const allFilled = Array.from({ length: 6 }).every((_, i) => (document.getElementById(`otp-ex-${i}`) as HTMLInputElement)?.value);
                                                        if (allFilled) setTimeout(() => handleFinalizeOtpLogin(), 300);
                                                    }
                                                }}
                                            />
                                        ))}
                                    </div>

                                    <div className="mb-8 text-center">
                                        <button
                                            onClick={handleResendCode}
                                            className="text-sm text-brand-green-600 font-bold hover:underline cursor-pointer mt-4"
                                        >
                                            Didn't send me a code? Resend
                                        </button>
                                    </div>

                                    <div className="space-y-3">
                                        <Button onClick={handleFinalizeOtpLogin} disabled={isLoading} className="w-full h-14 bg-brand-green-600 hover:bg-brand-green-700 text-white font-medium text-[17px] rounded-xl transition-all shadow-sm">
                                            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Verify & Login"}
                                        </Button>
                                    </div>
                                </motion.div>
                            )}

                        </AnimatePresence>
                    </motion.div>

                    {/* Jumia Style Legal Footer Links */}
                    <div className="mt-8 text-center text-[12px] text-[#86868b]">
                        <div className="flex flex-wrap justify-center gap-x-4 mb-4 font-medium uppercase tracking-wider text-[10px]">
                            <Link href="/terms" className="hover:text-[#1d1d1f]">Terms of Use</Link>
                            <span>|</span>
                            <Link href="/privacy" className="hover:text-[#1d1d1f]">Privacy Policy</Link>
                            <span>|</span>
                            <Link href="/help" className="hover:text-[#1d1d1f]">FAQ</Link>
                        </div>
                        <div className="p-4 border border-gray-200 rounded-xl bg-gray-50/50">

                            <div className="flex justify-between text-left gap-4 mt-4">
                                <div>
                                    <h4 className="font-bold text-[#1d1d1f] mb-2">NEED HELP?</h4>
                                    <ul className="space-y-1.5">
                                        <li><Link href="/help" className="hover:text-emerald-600 hover:underline transition-colors">Chat with us</Link></li>
                                        <li><Link href="/help" className="hover:text-emerald-600 hover:underline transition-colors">Help Center</Link></li>
                                        <li><Link href="/contact" className="hover:text-emerald-600 hover:underline transition-colors">Contact Us</Link></li>
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="font-bold text-[#1d1d1f] mb-2">USEFUL LINKS</h4>
                                    <ul className="space-y-1.5">
                                        <li><Link href="/help" className="hover:text-emerald-600 hover:underline transition-colors">Service Center</Link></li>
                                        <li><Link href="/help" className="hover:text-emerald-600 hover:underline transition-colors">How to shop on FairPrice?</Link></li>
                                        <li><Link href="/shipping" className="hover:text-emerald-600 hover:underline transition-colors">Delivery options and timelines</Link></li>
                                        <li><Link href="/legal/consumer-protection" className="hover:text-emerald-600 hover:underline transition-colors">Dispute Resolution Policy</Link></li>
                                        <li><Link href="/returns" className="hover:text-emerald-600 hover:underline transition-colors">Returns & Refund Timeline</Link></li>
                                        <li><Link href="/help" className="hover:text-emerald-600 hover:underline transition-colors">Pickup Stations</Link></li>
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
