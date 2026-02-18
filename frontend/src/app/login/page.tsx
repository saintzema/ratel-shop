"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/ui/logo";
import { useAuth } from "@/context/AuthContext";
import { Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuth();
    const router = useRouter();
    const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const redirectPath = searchParams?.get("from") || "/";

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        // Fallback name from email
        const displayName = email.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, c => c.toUpperCase());

        setTimeout(() => {
            login({
                id: "user_" + Math.random().toString(36).substr(2, 9),
                name: displayName || "User",
                email,
                role: "customer",
                created_at: new Date().toISOString()
            });
            router.push(redirectPath);
        }, 1000);
    };

    const handleSocialLogin = (provider: "google" | "facebook") => {
        setIsLoading(true);
        // Simulate OAuth Popup Flow
        setTimeout(() => {
            const mockUser = {
                id: `${provider}_` + Math.random().toString(36).substr(2, 9),
                name: provider === "google" ? "Google User" : "Facebook User",
                email: `user@${provider}.com`,
                image: provider === "google"
                    ? "https://lh3.googleusercontent.com/a/default-user"
                    : "https://platform-lookaside.fbsbx.com/platform/profilepic/",
                role: "customer" as const,
                created_at: new Date().toISOString()
            };

            login(mockUser);
            router.push(redirectPath);
        }, 1500); // Slightly longer delay for social "connection"
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden font-sans bg-gradient-to-br from-gray-50 via-white to-gray-100">
            {/* Subtle gradient accents */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-cyan-100/40 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/4" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-100/30 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/4" />
                <div className="absolute top-1/2 left-1/2 w-[400px] h-[400px] bg-emerald-100/20 rounded-full blur-[80px] -translate-x-1/2 -translate-y-1/2" />
            </div>

            <div className="relative z-10 w-full max-w-[420px] px-4">
                {/* Logo */}
                <div className="text-center mb-8">
                    <Logo className="h-10 w-auto mx-auto scale-150" />
                    <p className="text-gray-400 text-sm mt-4 font-medium tracking-wide">Welcome back</p>
                </div>

                {/* Glass Card */}
                <div className="relative">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-200/30 via-purple-200/30 to-emerald-200/30 rounded-3xl blur-sm" />

                    <div className="relative bg-white/80 backdrop-blur-2xl border border-gray-200/60 rounded-3xl p-8 shadow-xl shadow-gray-200/40">
                        <h2 className="text-2xl font-bold text-gray-900 mb-1">Sign in</h2>
                        <p className="text-gray-500 text-sm mb-8">Enter your credentials to continue</p>

                        <form className="space-y-5" onSubmit={handleLogin}>
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wider">Email</label>
                                <Input
                                    type="email"
                                    required
                                    placeholder="user@example.com"
                                    className="w-full h-12 bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 rounded-xl focus:border-cyan-500 focus:ring-cyan-500/20 transition-all"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Password</label>
                                    <Link href="#" className="text-xs text-cyan-600 hover:text-cyan-700 font-medium transition-colors">Forgot?</Link>
                                </div>
                                <div className="relative">
                                    <Input
                                        type={showPassword ? "text" : "password"}
                                        required
                                        placeholder="••••••••"
                                        className="w-full h-12 bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 rounded-xl pr-12 focus:border-cyan-500 focus:ring-cyan-500/20 transition-all"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>

                            <Button
                                type="submit"
                                disabled={isLoading}
                                className="w-full h-12 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-cyan-500/20 transition-all active:scale-[0.98] mt-2"
                            >
                                {isLoading ? (
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                ) : (
                                    <span className="flex items-center gap-2">Sign in <ArrowRight className="h-4 w-4" /></span>
                                )}
                            </Button>

                            {/* Social divider */}
                            <div className="relative flex items-center py-3">
                                <div className="flex-grow border-t border-gray-200" />
                                <span className="px-4 text-xs text-gray-400 font-medium">or continue with</span>
                                <div className="flex-grow border-t border-gray-200" />
                            </div>

                            {/* Social buttons */}
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => handleSocialLogin("google")}
                                    className="flex items-center justify-center gap-2 h-11 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl text-gray-700 text-sm font-medium transition-all"
                                >
                                    <svg className="h-5 w-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                                    Google
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleSocialLogin("facebook")}
                                    className="flex items-center justify-center gap-2 h-11 bg-[#1877F2] hover:bg-[#166fe5] border border-transparent rounded-xl text-white text-sm font-medium transition-all"
                                >
                                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036c-2.148 0-2.971.956-2.971 3.594v.376h3.428l-.538 3.667h-2.89l-.003 7.98h-4.841z" /></svg>
                                    Facebook
                                </button>
                            </div>

                            <p className="text-center text-xs text-gray-400 mt-4">
                                By signing in, you agree to our <Link href="#" className="text-cyan-600 hover:underline">Terms</Link> and <Link href="#" className="text-cyan-600 hover:underline">Privacy Policy</Link>.
                            </p>
                        </form>
                    </div>
                </div>

                {/* Create account */}
                <div className="mt-6 text-center">
                    <p className="text-gray-500 text-sm">
                        New to RatelShop?{" "}
                        <Link href="/register" className="text-cyan-600 hover:text-cyan-700 font-bold transition-colors">
                            Create an account
                        </Link>
                    </p>
                </div>

                {/* Footer */}
                <div className="mt-8 text-center text-[11px] text-gray-400 space-x-4">
                    <Link href="#" className="hover:text-gray-600 transition-colors">Terms</Link>
                    <Link href="#" className="hover:text-gray-600 transition-colors">Privacy</Link>
                    <Link href="#" className="hover:text-gray-600 transition-colors">Help</Link>
                    <span className="block mt-2">&copy; 2026 RatelShop</span>
                </div>
            </div>
        </div>
    );
}
