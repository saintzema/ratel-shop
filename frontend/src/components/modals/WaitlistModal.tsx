"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    X,
    ShieldCheck,
    Globe,
    MessageCircle,
    Truck,
    Store,
    Search,
    Sparkles,
    ArrowRight,
    CheckCircle2,
    Zap,
} from "lucide-react";

const DELAY_MS = 4000;
const DISMISS_KEY = "fairprice_waitlist_dismissed";

const FEATURES = [
    {
        icon: <Search className="h-4 w-4" />,
        title: "Price Checker",
        desc: "Search any product. See the real fair price. Never overpay.",
        color: "from-sky-400 to-blue-500",
    },
    {
        icon: <ShieldCheck className="h-4 w-4" />,
        title: "AI-Fair Pricing",
        desc: "Our AI fights inflation by ensuring true average prices.",
        color: "from-emerald-400 to-green-500",
    },
    
    {
        icon: <Globe className="h-4 w-4" />,
        title: "Ship From Anywhere",
        desc: "We source globally and deliver to your doorstep at the best price.",
        color: "from-violet-400 to-purple-500",
    },
    {
        icon: <MessageCircle className="h-4 w-4" />,
        title: "Negotiate Prices",
        desc: "The world's first store where you haggle directly with sellers.",
        color: "from-amber-400 to-orange-500",
    },
    {
        icon: <Truck className="h-4 w-4" />,
        title: "Free Delivery",
        desc: "Pay on our platform and enjoy free delivery — no hidden fees.",
        color: "from-pink-400 to-rose-500",
    },
    {
        icon: <Store className="h-4 w-4" />,
        title: "Start Selling",
        desc: "Open your store in minutes and reach millions of buyers.",
        color: "from-teal-400 to-emerald-500",
    },
];

// Global event bus so any "Add to Cart" can trigger the modal
const WAITLIST_EVENT = "fairprice-show-waitlist";

export function triggerWaitlistModal() {
    if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent(WAITLIST_EVENT));
    }
}

export function WaitlistModal() {
    const [isOpen, setIsOpen] = useState(false);
    const [email, setEmail] = useState("");
    const [submitted, setSubmitted] = useState(false);
    const [isValidEmail, setIsValidEmail] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [waitlistCount, setWaitlistCount] = useState(2847);
    const [keyboardOffset, setKeyboardOffset] = useState(0);

    const openModal = useCallback(() => {
        setIsOpen(true);
        setSubmitted(false);
        setEmail("");
        setIsValidEmail(true);
    }, []);

    useEffect(() => {
        if (typeof window === "undefined") return;

        // Only auto-show once per session (don't annoy the user)
        const alreadyDismissed = sessionStorage.getItem(DISMISS_KEY);

        const timer = !alreadyDismissed
            ? setTimeout(() => { openModal(); }, DELAY_MS)
            : undefined;

        // Listen for "Add to Cart" triggers — always show
        const handleCartTrigger = () => openModal();
        window.addEventListener(WAITLIST_EVENT, handleCartTrigger);

        // Handle iOS virtual keyboard resizing
        const handleResize = () => {
            if (window.visualViewport) {
                // If the visual viewport shrinks significantly from the window height, 
                // it means the keyboard is open.
                const offset = window.innerHeight - window.visualViewport.height;
                setKeyboardOffset(offset > 50 ? offset / 2 : 0);
            }
        };

        if (window.visualViewport) {
            window.visualViewport.addEventListener("resize", handleResize);
        }

        return () => {
            if (timer) clearTimeout(timer);
            window.removeEventListener(WAITLIST_EVENT, handleCartTrigger);
            if (window.visualViewport) {
                window.visualViewport.removeEventListener("resize", handleResize);
            }
        };
    }, [openModal]);

    const handleClose = () => {
        setIsOpen(false);
        try { sessionStorage.setItem(DISMISS_KEY, "1"); } catch { }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setIsValidEmail(false);
            return;
        }
        setIsValidEmail(true);
        setIsSubmitting(true);

        try {
            const res = await fetch("/api/waitlist", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });
            const data = await res.json();
            if (data.count) setWaitlistCount(data.count);
        } catch (err) {
            console.error("[Waitlist] API error, saving locally:", err);
        }

        // Also save to localStorage as backup
        try {
            const stored = localStorage.getItem("fairprice_waitlist_emails");
            const emails: { email: string; date: string }[] = stored ? JSON.parse(stored) : [];
            if (!emails.some(e => e.email === email)) {
                emails.push({ email, date: new Date().toISOString() });
                localStorage.setItem("fairprice_waitlist_emails", JSON.stringify(emails));
            }
        } catch { }

        setIsSubmitting(false);
        setSubmitted(true);
        setTimeout(() => {
            handleClose();
        }, 5000);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleClose}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200]"
                    />

                    {/* Modal — floating in the center of the screen on all devices */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: -keyboardOffset }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={{ type: "spring", damping: 28, stiffness: 300 }}
                        className="fixed inset-0 z-[201] flex items-center justify-center p-4 pointer-events-none transition-transform duration-300"
                    >
                        <div
                            className="relative w-full max-w-[360px] sm:max-w-md pointer-events-auto overflow-y-auto max-h-[85vh] rounded-[28px] shadow-2xl"
                            style={{
                                background: "linear-gradient(145deg, rgba(240, 253, 244, 0.97) 0%, rgba(226, 252, 235, 0.95) 40%, rgba(220, 252, 231, 0.93) 100%)",
                                backdropFilter: "blur(40px) saturate(180%)",
                                WebkitBackdropFilter: "blur(40px) saturate(180%)",
                                border: "1px solid rgba(255, 255, 255, 0.65)",
                            }}
                        >
                            {/* Decorative blobs — hidden on mobile for perf */}
                            <div className="hidden sm:block absolute -top-20 -right-20 w-48 h-48 bg-emerald-200/40 rounded-full blur-3xl pointer-events-none" />
                            <div className="hidden sm:block absolute -bottom-16 -left-16 w-40 h-40 bg-teal-200/30 rounded-full blur-3xl pointer-events-none" />

                            {/* Close button */}
                            <button
                                onClick={handleClose}
                                className="absolute top-3 right-3 z-20 h-8 w-8 rounded-full bg-gray-900/10 backdrop-blur-md border border-gray-900/10 flex items-center justify-center hover:bg-gray-900/20 transition-all group"
                            >
                                <X className="h-4 w-4 text-gray-600 group-hover:text-gray-900 transition-colors" />
                            </button>

                            <div className="relative z-10 px-4 py-8 sm:px-7 sm:py-10">
                                {!submitted ? (
                                    <>
                                        {/* Header — compact on mobile */}
                                        <div className="text-center mb-3 sm:mb-5">
                                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-600/10 border border-emerald-500/20 mb-2">
                                                <Sparkles className="h-3 w-3 text-emerald-600" />
                                                <span className="text-[10px] sm:text-[11px] font-extrabold text-emerald-700 uppercase tracking-widest">Now Live</span>
                                            </div>
                                            <h2 className="text-xl sm:text-3xl font-black text-gray-900 tracking-tight leading-tight">
                                                Tired of Being
                                                <br />
                                                <span className="bg-gradient-to-r from-emerald-600 via-green-500 to-teal-500 bg-clip-text text-transparent">
                                                    Overcharged?
                                                </span>
                                            </h2>
                                            <p className="text-gray-500 text-xs sm:text-sm mt-1.5 sm:mt-2 max-w-[280px] sm:max-w-[300px] mx-auto leading-relaxed font-medium">
                                                We{"'"}re building Africa{"'"}s first AI-powered marketplace that guarantees <span className="text-emerald-600 font-bold">fair prices</span> on everything.
                                            </p>
                                        </div>

                                        {/* Feature Grid — 2 cols, tight on mobile */}
                                        <div className="grid grid-cols-2 gap-1.5 sm:gap-2.5 mb-3.5 sm:mb-5">
                                            {FEATURES.map((feature, i) => (
                                                <motion.div
                                                    key={feature.title}
                                                    initial={{ opacity: 0, y: 8 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: 0.05 + i * 0.04 }}
                                                    className="flex items-start gap-1.5 sm:gap-2 p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-white/60 border border-white/80 shadow-sm"
                                                >
                                                    <div className={`shrink-0 h-6 w-6 sm:h-7 sm:w-7 rounded-lg sm:rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center text-white shadow-md`}>
                                                        {feature.icon}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-[10px] sm:text-[11px] font-extrabold text-gray-800 leading-tight">{feature.title}</p>
                                                        <p className="text-[8px] sm:text-[9px] text-gray-500 leading-snug mt-0.5 line-clamp-2">{feature.desc}</p>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>

                                        {/* Email Form — full width input + below button on mobile */}
                                        <form onSubmit={handleSubmit} className="space-y-2">
                                            <div className="relative">
                                                <input
                                                    type="email"
                                                    value={email}
                                                    onChange={(e) => {
                                                        setEmail(e.target.value);
                                                        setIsValidEmail(true);
                                                    }}
                                                    onFocus={() => setKeyboardOffset(150)}
                                                    onBlur={() => setKeyboardOffset(0)}
                                                    placeholder="you@email.com"
                                                    className={`w-full h-11 sm:h-13 px-4 pr-[88px] sm:pr-24 rounded-xl sm:rounded-2xl bg-white border-2 ${!isValidEmail ? "border-red-400" : "border-emerald-200 focus:border-emerald-400"} text-gray-900 placeholder:text-gray-400 text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-emerald-100 transition-all shadow-sm`}
                                                    autoComplete="email"
                                                />
                                                <button
                                                    type="submit"
                                                    disabled={isSubmitting}
                                                    className="absolute right-1 top-1 h-9 sm:h-11 px-3.5 sm:px-4 rounded-lg sm:rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 flex items-center justify-center gap-1 text-white font-bold text-xs shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-[1.02] transition-all active:scale-95 disabled:opacity-60"
                                                >
                                                    {isSubmitting ? (
                                                        <Zap className="h-3.5 w-3.5 animate-pulse" />
                                                    ) : (
                                                        <>
                                                            Join <ArrowRight className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                            {!isValidEmail && (
                                                <p className="text-red-500 text-[10px] sm:text-xs font-semibold pl-2">Please enter a valid email address</p>
                                            )}
                                            <p className="text-center text-[9px] sm:text-[11px] text-gray-400 font-medium flex items-center justify-center gap-1">
                                                <ShieldCheck className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-gray-400" />
                                                Join <span className="font-bold text-gray-500">{waitlistCount.toLocaleString()}+</span> Nigerians. No spam.
                                            </p>
                                        </form>
                                    </>
                                ) : (
                                    /* Success State */
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="text-center py-6 sm:py-8"
                                    >
                                        <div className="inline-flex items-center justify-center h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-emerald-100 border-2 border-emerald-200 mb-3 sm:mb-4">
                                            <CheckCircle2 className="h-7 w-7 sm:h-8 sm:w-8 text-emerald-600" />
                                        </div>
                                        <h3 className="text-xl sm:text-2xl font-black text-gray-900 mb-1.5 sm:mb-2">You{"'"}re In!</h3>
                                        <p className="text-gray-500 text-xs sm:text-sm max-w-xs mx-auto font-medium">
                                            Welcome to the fair pricing revolution. We{"'"}ll notify you at <span className="text-emerald-600 font-bold break-all">{email}</span> when we launch.
                                        </p>
                                        <div className="mt-3 sm:mt-4 inline-flex items-center gap-2 text-[10px] sm:text-xs text-gray-400 font-medium">
                                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                            Email saved to waitlist
                                        </div>
                                    </motion.div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
