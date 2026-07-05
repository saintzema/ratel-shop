"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, X, Loader2, Lock, CreditCard, Smartphone, Building, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

declare global {
    interface Window {
        PaystackPop: {
            setup: (config: Record<string, unknown>) => { openIframe: () => void };
        };
    }
}

interface PaystackCheckoutProps {
    amount: number; // in kobo
    email: string;
    onSuccess: (reference: string) => void;
    onClose: () => void;
    metadata?: Record<string, unknown>;
    autoStart?: boolean;
    // Paystack Subaccount split — when set, the seller's exact cut routes to
    // their own subaccount at the moment of payment and Paystack settles it
    // to their bank automatically (no Transfer API call on our end).
    subaccount?: string;
    transactionCharge?: number; // platform's cut, in kobo — overrides the subaccount's default percentage_charge for this transaction
    bearer?: "account" | "subaccount"; // who eats Paystack's own processing fee
}

// Helper to check if we are in live mode based on the key prefix
const IS_PRODUCTION = process.env.NODE_ENV === "production";


function loadPaystackScript(): Promise<void> {
    return new Promise((resolve, reject) => {
        // If already loaded and API available
        if (window.PaystackPop && typeof window.PaystackPop.setup === "function") {
            resolve();
            return;
        }
        // Remove any old broken script tag
        const existing = document.getElementById("paystack-script");
        if (existing) existing.remove();

        const script = document.createElement("script");
        script.id = "paystack-script";
        script.src = "https://js.paystack.co/v1/inline.js";
        script.async = true;
        script.onload = () => {
            // Wait for PaystackPop to be available on window
            let attempts = 0;
            const check = () => {
                if (window.PaystackPop && typeof window.PaystackPop.setup === "function") {
                    resolve();
                } else if (attempts < 20) {
                    attempts++;
                    setTimeout(check, 100);
                } else {
                    reject(new Error("PaystackPop not available after script load"));
                }
            };
            check();
        };
        script.onerror = () => reject(new Error("Failed to load Paystack SDK"));
        document.head.appendChild(script);
    });
}

export function PaystackCheckout({ amount, email, onSuccess, onClose, metadata, autoStart = false, subaccount, transactionCharge, bearer }: PaystackCheckoutProps) {
    const [step, setStep] = useState<"loading" | "summary" | "processing" | "success" | "error">("loading");
    const [errorMsg, setErrorMsg] = useState("");
    const [dynamicKey, setDynamicKey] = useState<string | null>(null);

    const IS_LIVE_MODE = dynamicKey?.startsWith("pk_live_") || false;

    // Explicit demo escape hatch for recording demo videos without a real card:
    //   /checkout?demo=1   (only honoured when NOT using a live key)
    const DEMO_FLAG =
        typeof window !== "undefined" &&
        new URLSearchParams(window.location.search).get("demo") === "1";

    const cleanupPaystack = useCallback(() => {
        document.querySelectorAll('iframe').forEach(iframe => {
            if (iframe.src.includes('paystack.co') || iframe.name.includes('paystack')) {
                let el: HTMLElement | null = iframe;
                while (el && el.parentElement && el.parentElement !== document.body) {
                    el = el.parentElement;
                }
                if (el && el.parentElement === document.body) {
                    el.remove();
                }
            }
        });
    }, []);

    useEffect(() => {
        // Do NOT aggressively clean up paystack iframe on unmount during React strict mode,
        // it breaks window.PaystackPop's internal state if it tries to reuse the iframe.
        // Paystack handles its own cleanup and hiding.
    }, []);

    const runDemoFallback = useCallback((keyForMode?: string) => {
        // CRITICAL: never fake a successful payment when a live key is configured.
        // A real Paystack failure must surface as an error so no order is recorded
        // without an actual charge. Mock success is allowed ONLY in test/no-key mode,
        // or when the demo escape hatch (?demo=1) is explicitly set on a non-live key.
        //
        // Determine live-mode from the key actually in use, NOT the dynamicKey state —
        // on a quick retry startPayment(key) can run before setDynamicKey() re-renders,
        // and a stale IS_LIVE_MODE=false would wrongly emit a mock_ref on a LIVE key.
        const isLive = (keyForMode ?? dynamicKey)?.startsWith("pk_live_") || false;
        if (isLive && !DEMO_FLAG) {
            setErrorMsg("We couldn't reach the payment provider. You have NOT been charged. Please try again.");
            setStep("error");
            return;
        }

        // Explicit demo hatch (?demo=1, non-live key) emits a DEMO- reference that
        // the checkout treats as off-platform and records without a real charge.
        // Otherwise (test/no-key) emit a mock_ref_ which the checkout REJECTS.
        const fakeRef = DEMO_FLAG ? `DEMO-${Date.now()}` : `mock_ref_${Date.now()}`;
        setStep("processing");
        setTimeout(() => {
            setStep("success");
            setTimeout(() => {
                onSuccess(fakeRef);
                if (!autoStart) onClose();
            }, 2000);
        }, 2000);
    }, [onSuccess, onClose, autoStart, dynamicKey, DEMO_FLAG]);

    const startPayment = (key: string) => {
        setStep("processing");

        // Demo / mock mode — no real Paystack key configured
        if (!key || key === "mock_key" || key.startsWith("pk_test_mock")) {
            runDemoFallback(key);
            return;
        }

        // Guard: ensure PaystackPop is actually available before calling setup
        if (!window.PaystackPop || typeof window.PaystackPop.setup !== "function") {
            console.warn("PaystackPop not available, falling back to demo mode");
            runDemoFallback(key);
            return;
        }

        // Paystack's SDK sometimes crashes internally with
        //   "null is not an object (evaluating 'this.iframe.contentWindow.postMessage')"
        // because it immediately posts to an iframe it just created before the browser
        // has fully attached it to the DOM. We wrap everything in try-catch and always
        // fall back gracefully to demo-mode on any error.
        let handler: { openIframe: () => void } | null = null;

        try {
            handler = window.PaystackPop.setup({
                key,
                email,
                amount,
                currency: "NGN",
                ref: `FP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                ...(subaccount ? {
                    subaccount,
                    transaction_charge: transactionCharge,
                    bearer: bearer || "account",
                } : {}),
                metadata: {
                    ...metadata,
                    custom_fields: [
                        { display_name: "Platform", variable_name: "platform", value: "FairPrice" },
                        ...(metadata ? Object.entries(metadata).map(([k, v]) => ({
                            display_name: k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                            variable_name: k.toLowerCase(),
                            value: v as string
                        })) : []),
                    ],
                },
                callback: (response: { reference: string }) => {
                    cleanupPaystack();
                    setStep("success");

                    // Track payment completed
                    if (typeof window !== "undefined" && (window as any).pendo) {
                        (window as any).pendo.track("payment_completed", {
                            payment_reference: response.reference,
                            amount_kobo: amount,
                            email: email,
                            is_live_mode: IS_LIVE_MODE,
                            currency: "NGN",
                        });
                    }

                    setTimeout(() => {
                        onSuccess(response.reference);
                        if (!autoStart) onClose();
                    }, 2000);
                },
                onClose: () => {
                    cleanupPaystack();
                    if (autoStart) {
                        onClose();
                    } else {
                        setStep("summary");
                    }
                },
            });
        } catch (setupErr) {
            console.warn("Paystack setup() threw — falling back to demo mode:", setupErr);
            runDemoFallback(key);
            return;
        }

        if (!handler || typeof handler.openIframe !== "function") {
            console.warn("Paystack handler missing openIframe, falling back to demo mode");
            runDemoFallback(key);
            return;
        }

        // Give the browser multiple frames to fully attach the Paystack iframe
        // before we ask it to open. Two rAF + setTimeout gives the most reliable result.
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                setTimeout(() => {
                    try {
                        handler!.openIframe();
                    } catch (iframeErr) {
                        console.warn("Paystack openIframe() threw — falling back to demo mode:", iframeErr);
                        cleanupPaystack();
                        runDemoFallback(key);
                    }
                }, 150);
            });
        });
    };

    useEffect(() => {
        const initPaystack = async () => {
            try {
                // 1. Fetch dynamic key
                const keyRes = await fetch('/api/settings/paystack-key');
                const keyData = await keyRes.json();
                const key = keyData.key || "";
                setDynamicKey(key);

                // 2. Load script
                await loadPaystackScript();

                if (autoStart) {
                    startPayment(key);
                } else {
                    setStep("summary");
                }
            } catch (err) {
                console.error("Paystack init failed:", err);
                if (autoStart) {
                    startPayment("");
                } else {
                    setStep("summary");
                }
            }
        };

        initPaystack();
    }, [autoStart]);

    const initiatePayment = useCallback(() => {
        startPayment(dynamicKey || "");
    }, [dynamicKey]);

    // Retry in place (error screen) — re-fetch key, reload script, re-open the
    // popup without forcing the user to refresh the whole checkout page.
    const retryPayment = async () => {
        cleanupPaystack();
        setErrorMsg("");
        setStep("loading");
        try {
            const keyRes = await fetch('/api/settings/paystack-key');
            const keyData = await keyRes.json();
            const key = keyData.key || "";
            setDynamicKey(key);
            await loadPaystackScript();
            startPayment(key);
        } catch {
            startPayment("");
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
            {/* Light backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/20 backdrop-blur-sm z-0"
                onClick={onClose}
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative z-20 w-full max-w-md"
            >
                <div className="relative bg-white rounded-2xl overflow-hidden shadow-2xl border border-gray-200">

                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-100">
                                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                            </div>
                            <div>
                                <h3 className="text-gray-900 font-bold leading-none">Secure Checkout</h3>
                                <p className={cn(
                                    "text-[10px] uppercase tracking-widest mt-1 font-bold",
                                    IS_LIVE_MODE ? "text-emerald-500" : "text-amber-500"
                                )}>
                                    Paystack {IS_LIVE_MODE ? "Live" : "Test Mode"}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <X className="h-5 w-5 text-gray-400" />
                        </button>
                    </div>

                    <div className="p-6 sm:p-8">
                        <AnimatePresence mode="wait">
                            {step === "loading" && (
                                <motion.div
                                    key="loading"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="py-12 text-center"
                                >
                                    <Loader2 className="h-12 w-12 text-indigo-500 animate-spin mx-auto" />
                                    <p className="mt-6 text-gray-900 font-bold text-lg">Connecting...</p>
                                    <p className="text-gray-400 text-sm mt-1">Setting up secure payment</p>
                                </motion.div>
                            )}

                            {step === "summary" && (
                                <motion.div
                                    key="summary"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-6"
                                >
                                    {/* Amount */}
                                    <div className="text-center space-y-1">
                                        <p className="text-gray-500 text-sm font-medium">You're paying</p>
                                        <h2 className="text-4xl font-black text-gray-900 flex items-start justify-center gap-1">
                                            <span className="text-xl mt-1 text-gray-400">₦</span>
                                            {(amount / 100).toLocaleString("en-NG", { minimumFractionDigits: 2 })}
                                        </h2>
                                        <p className="text-gray-400 text-xs font-medium">{email}</p>
                                    </div>

                                    {/* Payment Method Card */}
                                    <div className="border border-gray-200 rounded-xl p-4">
                                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Payment method</p>
                                        <div className="flex items-center gap-3">
                                            <div className="bg-indigo-600 text-white text-[10px] font-black px-2 py-1 rounded">VISA</div>
                                            <span className="text-sm font-medium text-gray-700">Credit Card •••• 4242</span>
                                        </div>
                                    </div>

                                    {/* Methods Grid */}
                                    <div className="grid grid-cols-3 gap-3">
                                        {[
                                            { icon: CreditCard, label: "Card", active: true },
                                            { icon: Building, label: "Bank", active: false },
                                            { icon: Smartphone, label: "USSD", active: false }
                                        ].map((method) => (
                                            <div key={method.label} className={cn(
                                                "p-3 rounded-xl flex flex-col items-center gap-2 transition-all cursor-pointer border",
                                                method.active
                                                    ? "border-indigo-500 bg-indigo-50 text-indigo-600"
                                                    : "border-gray-200 bg-gray-50 text-gray-400 hover:border-gray-300"
                                            )}>
                                                <method.icon className="h-5 w-5" />
                                                <span className="text-[10px] font-bold uppercase tracking-wider">{method.label}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Order Summary */}
                                    <div className="border-t border-gray-100 pt-4 space-y-3">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">Subtotal</span>
                                            <span className="font-medium text-gray-900">₦{(amount / 100).toLocaleString("en-NG", { minimumFractionDigits: 2 })}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">Taxes & fees</span>
                                            <span className="font-medium text-gray-900">₦0.00</span>
                                        </div>
                                        <div className="flex justify-between text-base font-bold border-t border-gray-100 pt-3">
                                            <span className="text-gray-900">Total</span>
                                            <span className="text-gray-900">₦{(amount / 100).toLocaleString("en-NG", { minimumFractionDigits: 2 })}</span>
                                        </div>
                                    </div>

                                    <p className="text-xs text-gray-400 text-center px-4">
                                        By completing payment, you agree to our Terms of Service and Privacy Policy.
                                    </p>

                                    <div className="flex items-center gap-3 pt-2">
                                        <Button
                                            variant="outline"
                                            onClick={onClose}
                                            className="flex-1 h-12 rounded-xl font-bold text-indigo-600 border-gray-200 hover:bg-gray-50"
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            onClick={initiatePayment}
                                            className="flex-1 h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all"
                                        >
                                            Complete payment
                                        </Button>
                                    </div>
                                </motion.div>
                            )}

                            {step === "processing" && (
                                <motion.div
                                    key="processing"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="py-16 text-center space-y-6"
                                >
                                    <Loader2 className="h-16 w-16 text-indigo-500 animate-spin mx-auto" />
                                    <div className="space-y-2">
                                        <h4 className="text-xl font-bold text-gray-900">Authorizing...</h4>
                                        <p className="text-gray-400 text-sm max-w-[240px] mx-auto">Please authorize the payment in the Paystack popup.</p>
                                    </div>
                                </motion.div>
                            )}

                            {step === "success" && (
                                <motion.div
                                    key="success"
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="py-12 text-center"
                                >
                                    <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-200">
                                        <CheckCircle2 className="h-10 w-10 text-emerald-600" />
                                    </div>
                                    <h2 className="text-2xl font-black text-gray-900 mb-2">Payment Verified!</h2>
                                    <p className="text-gray-500 font-medium">Redirecting you to your order...</p>
                                </motion.div>
                            )}

                            {step === "error" && (
                                <motion.div
                                    key="error"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="py-12 text-center space-y-6"
                                >
                                    <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto border-2 border-pink-300">
                                        <X className="h-10 w-10 text-pink-400" />
                                    </div>
                                    <div className="space-y-2">
                                        <h2 className="text-xl font-bold text-gray-900">Payment Failed</h2>
                                        <p className="text-gray-500 text-sm px-8">{errorMsg || "The customer canceled the payment."}</p>
                                    </div>
                                    <div className="flex items-center justify-center gap-3">
                                        <Button
                                            onClick={onClose}
                                            variant="outline"
                                            className="h-11 px-6 rounded-xl border-gray-200 text-gray-700 font-bold hover:bg-gray-50"
                                        >
                                            Close
                                        </Button>
                                        <Button
                                            onClick={retryPayment}
                                            className="h-11 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                                        >
                                            Try Again
                                        </Button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-center gap-6">
                        <img
                            src="https://paystack.com/assets/img/login/paystack-logo.png"
                            alt="Paystack Secure"
                            className="h-4 opacity-40 grayscale hover:grayscale-0 hover:opacity-100 transition-all cursor-help"
                        />
                        <div className="h-4 w-px bg-gray-200" />
                        <div className="flex items-center gap-1.5">
                            <Lock className="h-3 w-3 text-gray-300" />
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">PCI-DSS Level 1</span>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
