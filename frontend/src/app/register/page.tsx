"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Eye, EyeOff, ArrowRight, Loader2, Check, X, AlertCircle, CheckCircle2 } from "lucide-react";
import { Suspense, useEffect } from "react";
import { Logo } from "@/components/ui/logo";

function RegisterForm() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { register } = useAuth();

    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [passwordConfirm, setPasswordConfirm] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const fromCheckout = searchParams.get("from") === "checkout";

    useEffect(() => {
        const emailParam = searchParams.get("email");
        const nameParam = searchParams.get("name");

        if (emailParam) setEmail(emailParam);
        if (nameParam) {
            const parts = nameParam.split(" ");
            setFirstName(parts[0]);
            if (parts.length > 1) setLastName(parts.slice(1).join(" "));
        }
    }, [searchParams]);

    const passwordChecks = [
        { label: "At least 8 characters", pass: password.length >= 8 },
        { label: "One uppercase letter", pass: /[A-Z]/.test(password) },
        { label: "One number", pass: /[0-9]/.test(password) },
        { label: "One special character (!@#$%)", pass: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
    ];
    const allPasswordChecksPassed = passwordChecks.every(c => c.pass);
    const passwordsMatch = password.length > 0 && password === passwordConfirm;

    const handleRegister = (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!firstName.trim() || !lastName.trim()) {
            setError("Please enter your first and last name.");
            return;
        }
        if (!allPasswordChecksPassed) {
            setError("Your password does not meet all requirements.");
            return;
        }
        if (!passwordsMatch) {
            setError("Passwords do not match.");
            return;
        }

        setIsLoading(true);
        setTimeout(() => {
            register({
                id: "user_" + Math.random().toString(36).substr(2, 9),
                name: `${firstName.trim()} ${lastName.trim()}`,
                email,
                role: "customer",
                created_at: new Date().toISOString()
            });
            // If from checkout, maybe redirect to order confirmation or dashboard?
            // For now, let's go to homepage/dashboard as standard flow
            router.push(fromCheckout ? "/account/orders" : "/");
        }, 1500);
    };

    return (
        <div className="relative bg-white/80 backdrop-blur-2xl border border-gray-200/60 rounded-3xl p-8 shadow-xl shadow-gray-200/40">
            {fromCheckout ? (
                <div className="mb-6">
                    <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
                        <div>
                            <h3 className="text-sm font-bold text-emerald-800">Payment Successful!</h3>
                            <p className="text-sm text-emerald-700 mt-1">Please create a password to secure your account and track your order.</p>
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-1">Finalize Account</h2>
                    <p className="text-gray-500 text-sm mb-6">Confirm your details to access your dashboard</p>
                </div>
            ) : (
                <>
                    <h2 className="text-2xl font-bold text-gray-900 mb-1">Create account</h2>
                    <p className="text-gray-500 text-sm mb-6">Start shopping with fair, transparent prices</p>
                </>
            )}

            {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                    <p className="text-sm text-red-700">{error}</p>
                </div>
            )}

            <form className="space-y-4" onSubmit={handleRegister}>
                {/* First and Last Name side by side */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wider">First Name</label>
                        <Input placeholder="John" required className="w-full h-11 bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 rounded-xl focus:border-emerald-500 focus:ring-emerald-500/20 transition-all" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wider">Last Name</label>
                        <Input placeholder="Doe" required className="w-full h-11 bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 rounded-xl focus:border-emerald-500 focus:ring-emerald-500/20 transition-all" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wider">Email</label>
                    <Input type="email" placeholder="user@example.com" required className="w-full h-11 bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 rounded-xl focus:border-emerald-500 focus:ring-emerald-500/20 transition-all" value={email} onChange={(e) => setEmail(e.target.value)} readOnly={fromCheckout} />
                    {/* Make email readonly if from checkout to prevent mismatch unless user insists? No, let them edit if they made a typo, but warns it might unlink order? For now, allowing edit is fine as long as Register updates the context which matches ID? Actually demo app uses email as ID. If they curb the email, they lose the order link. Let's make it readOnly if fromCheckout for safety. */}
                </div>

                <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wider">Password</label>
                    <div className="relative">
                        <Input type={showPassword ? "text" : "password"} placeholder="Create a strong password" required className="w-full h-11 bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 rounded-xl pr-12 focus:border-emerald-500 focus:ring-emerald-500/20 transition-all" value={password} onChange={(e) => setPassword(e.target.value)} />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    </div>
                    {/* Password strength indicators */}
                    {password.length > 0 && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-100 space-y-1.5">
                            {passwordChecks.map((check) => (
                                <div key={check.label} className="flex items-center gap-2">
                                    {check.pass ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <X className="h-3.5 w-3.5 text-gray-300" />}
                                    <span className={`text-xs ${check.pass ? "text-emerald-600 font-medium" : "text-gray-400"}`}>{check.label}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wider">Confirm Password</label>
                    <Input type="password" placeholder="Re-enter password" required className={`w-full h-11 bg-gray-50 text-gray-900 placeholder:text-gray-400 rounded-xl focus:ring-emerald-500/20 transition-all ${passwordConfirm.length > 0 ? (passwordsMatch ? "border-emerald-500/60 focus:border-emerald-500" : "border-red-400/60 focus:border-red-400") : "border-gray-200"}`} value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} />
                    {passwordConfirm.length > 0 && !passwordsMatch && (
                        <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Passwords do not match</p>
                    )}
                    {passwordConfirm.length > 0 && passwordsMatch && (
                        <p className="text-xs text-emerald-600 mt-1.5 flex items-center gap-1"><Check className="h-3 w-3" /> Passwords match</p>
                    )}
                </div>

                <Button type="submit" disabled={isLoading || !allPasswordChecksPassed || !passwordsMatch} className="w-full h-12 bg-gradient-to-r from-emerald-500 to-cyan-600 hover:from-emerald-400 hover:to-cyan-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98] mt-2 disabled:opacity-40 disabled:cursor-not-allowed">
                    {isLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                        <span className="flex items-center gap-2">{fromCheckout ? "Secure Account & Order" : "Create Account"} <ArrowRight className="h-4 w-4" /></span>
                    )}
                </Button>

                <p className="text-center text-xs text-gray-400 mt-3">
                    By creating an account, you agree to our <Link href="#" className="text-emerald-600 hover:underline">Terms</Link> and <Link href="#" className="text-emerald-600 hover:underline">Privacy Policy</Link>.
                </p>
            </form>
        </div>
    );
}

export default function RegisterPage() {
    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden font-sans bg-gradient-to-br from-gray-50 via-white to-gray-100">
            {/* Subtle gradient accents */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-emerald-100/40 rounded-full blur-[120px] -translate-y-1/3 -translate-x-1/4" />
                <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-purple-100/30 rounded-full blur-[100px] translate-y-1/3 translate-x-1/4" />
            </div>

            <div className="relative z-10 w-full max-w-[420px] px-4 py-8">
                {/* Logo */}
                <div className="text-center mb-6">
                    <Logo className="h-10 w-auto mx-auto scale-150" />
                    <p className="text-gray-400 text-sm mt-4 font-medium tracking-wide">Join the fair commerce revolution</p>
                </div>

                {/* Glass Card */}
                <div className="relative">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-200/30 via-cyan-200/30 to-purple-200/30 rounded-3xl blur-sm" />

                    <Suspense fallback={<div className="bg-white/80 h-[600px] rounded-3xl flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-emerald-500" /></div>}>
                        <RegisterForm />
                    </Suspense>
                </div>

                {/* Sign in link */}
                <div className="mt-6 text-center">
                    <p className="text-gray-500 text-sm">
                        Already have an account?{" "}
                        <Link href="/login" className="text-emerald-600 hover:text-emerald-700 font-bold transition-colors">
                            Sign in
                        </Link>
                    </p>
                </div>

                <div className="mt-6 text-center text-[11px] text-gray-400">
                    <span>&copy; 2026 RatelShop</span>
                </div>
            </div>
        </div>
    );
}


