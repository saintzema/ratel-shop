"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/ui/logo";
import { Loader2, CheckCircle2, AlertCircle, Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

function ResetPasswordForm() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get("token");
    const email = searchParams.get("email");

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const passwordChecks = [
        { label: "At least 8 characters", pass: password.length >= 8 },
        { label: "One number or symbol", pass: /[0-9!@#$%^&*(),.?":{}|<>]/.test(password) },
    ];
    const allChecksPassed = passwordChecks.every(c => c.pass);
    const passwordsMatch = password.length > 0 && password === confirmPassword;

    useEffect(() => {
        if (!token || !email) {
            setError("Invalid or missing reset token. Please request a new link.");
        }
    }, [token, email]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!allChecksPassed || !passwordsMatch) return;

        setIsLoading(true);
        setError("");

        try {
            const res = await fetch("/api/auth/set-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password, token })
            });

            const data = await res.json();

            if (data.success) {
                setIsSuccess(true);
                setTimeout(() => router.push("/login"), 3000);
            } else {
                setError(data.error || "Failed to reset password.");
            }
        } catch (err) {
            setError("Something went wrong. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    if (isSuccess) {
        return (
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-12"
            >
                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="h-10 w-10 text-emerald-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Password Reset!</h2>
                <p className="text-gray-500 mb-8">Your password has been updated successfully. Redirecting you to login...</p>
                <Button 
                    onClick={() => router.push("/login")}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-8 h-12 rounded-xl"
                >
                    Go to Login
                </Button>
            </motion.div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
                <div className="relative">
                    <label className="text-[13px] font-semibold text-[#1d1d1f] mb-1.5 block">New Password</label>
                    <div className="relative">
                        <Input
                            type={showPassword ? "text" : "password"}
                            required
                            placeholder="Min. 8 characters"
                            className={cn(
                                "w-full h-12 bg-white border border-[#d2d2d7] text-[15px] rounded-xl focus:border-brand-green-500 focus:ring-4 focus:ring-brand-green-500/20 px-4 transition-all pr-12",
                                error && "border-red-500"
                            )}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>
                </div>

                <div className="relative">
                    <label className="text-[13px] font-semibold text-[#1d1d1f] mb-1.5 block">Confirm Password</label>
                    <div className="relative">
                        <Input
                            type={showConfirmPassword ? "text" : "password"}
                            required
                            placeholder="Repeat new password"
                            className={cn(
                                "w-full h-12 bg-white border border-[#d2d2d7] text-[15px] rounded-xl focus:border-brand-green-500 focus:ring-4 focus:ring-brand-green-500/20 px-4 transition-all pr-12",
                                passwordsMatch ? "border-emerald-500" : (confirmPassword && "border-red-500")
                            )}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                            {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Password Requirement Checks */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-2 border border-gray-100">
                {passwordChecks.map((check, i) => (
                    <div key={i} className="flex items-center gap-2">
                        <div className={cn(
                            "w-4 h-4 rounded-full flex items-center justify-center transition-colors",
                            check.pass ? "bg-emerald-500" : "bg-gray-200"
                        )}>
                            <CheckCircle2 className="w-3 h-3 text-white" />
                        </div>
                        <span className={cn(
                            "text-xs font-medium",
                            check.pass ? "text-emerald-700" : "text-gray-500"
                        )}>{check.label}</span>
                    </div>
                ))}
            </div>

            {error && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex gap-3 text-red-700">
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    <p className="text-sm font-medium">{error}</p>
                </div>
            )}

            <Button
                type="submit"
                disabled={isLoading || !allChecksPassed || !passwordsMatch || !!error && !token}
                className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-lg rounded-xl shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50"
            >
                {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : "Update Password"}
            </Button>
        </form>
    );
}

export default function ResetPasswordPage() {
    return (
        <div className="min-h-screen bg-[#F5F5F7] flex flex-col items-center justify-center p-6 sm:p-8">
            <div className="w-full max-w-[440px]">
                <div className="flex justify-center mb-12">
                    <Logo className="h-10 w-auto" variant="dark" />
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-[32px] shadow-[0_8px_40px_rgba(0,0,0,0.04)] border border-gray-100 p-8 sm:p-10"
                >
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-[#1d1d1f] tracking-tight mb-2">Secure Reset</h1>
                        <p className="text-emerald-600 font-medium">Enter your new password below.</p>
                    </div>

                    <Suspense fallback={<div className="flex justify-center py-12"><Loader2 className="animate-spin text-emerald-600" /></div>}>
                        <ResetPasswordForm />
                    </Suspense>
                </motion.div>

                <p className="text-center mt-8 text-gray-500 text-sm">
                    Remembered your password? <a href="/login" className="text-emerald-600 font-bold hover:underline">Back to Login</a>
                </p>
            </div>
        </div>
    );
}
