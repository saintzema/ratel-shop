"use client";

import Link from "next/link";
import { DEMO_PRODUCTS, DEMO_NEGOTIATIONS } from "@/lib/data";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronDown, Trash2, Plus, X, Globe, ShieldCheck } from "lucide-react";
import { Check, Lock, ChevronRight, CreditCard, Tag, MapPin, Phone, Truck, Package, CheckCircle2 } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "@/context/CartContext";
import { Product } from "@/lib/types";
import { DemoStore } from "@/lib/demo-store";
import { Logo } from "@/components/ui/logo";
import { useAuth } from "@/context/AuthContext";
import { PaystackCheckout } from "@/components/payment/PaystackCheckout";
import { Navbar } from "@/components/layout/Navbar";
import { RecommendedProducts } from "@/components/ui/RecommendedProducts";

// Helper: compute a future delivery date (5-7 business days from now)
function getDeliveryDateRange(): string {
    const now = new Date();
    const addBusinessDays = (date: Date, days: number): Date => {
        const result = new Date(date);
        let added = 0;
        while (added < days) {
            result.setDate(result.getDate() + 1);
            const dow = result.getDay();
            if (dow !== 0 && dow !== 6) added++;
        }
        return result;
    };
    const early = addBusinessDays(now, 5);
    const late = addBusinessDays(now, 7);
    const fmt = (d: Date) => d.toLocaleDateString("en-NG", { month: "short", day: "numeric", year: "numeric" });
    return `${fmt(early)} – ${fmt(late)}`;
}

function DiscountSection() {
    const [code, setCode] = useState("");
    const [applied, setApplied] = useState(false);
    const [msg, setMsg] = useState("");

    const handleApply = () => {
        if (!code) return;
        if (code.toLowerCase() === "ratel2026") {
            setApplied(true);
            setMsg("Discount Applied: 10% OFF");
        } else {
            setMsg("Invalid discount code");
            setTimeout(() => setMsg(""), 3000);
        }
    };

    return (
        <div className="pt-4 space-y-2">
            <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-gray-400" />
                <Input
                    placeholder="Enter discount code"
                    className="max-w-xs h-9 text-sm border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:border-ratel-orange/50 focus:ring-ratel-orange/20"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    disabled={applied}
                />
                <Button
                    variant="outline"
                    size="sm"
                    className="h-9 border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900 font-semibold"
                    onClick={handleApply}
                    disabled={applied || !code}
                >
                    {applied ? "✓ Applied" : "Apply"}
                </Button>
            </div>
            {msg && (
                <p className={`text-xs ${applied ? "text-green-600" : "text-red-500"} pl-6 font-bold`}>
                    {msg}
                </p>
            )}
        </div>
    );
}

export default function CheckoutPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading checkout...</div>}>
            <CheckoutContent />
        </Suspense>
    );
}

// ─── Saved Address helpers ──────────────────────────────────
interface SavedAddress {
    id: string;
    label: string;
    firstName: string;
    lastName: string;
    phone: string;
    street: string;
    city: string;
}

function getSavedAddresses(): SavedAddress[] {
    if (typeof window === "undefined") return [];
    try {
        return JSON.parse(localStorage.getItem("ratel_saved_addresses") || "[]");
    } catch { return []; }
}

function persistAddresses(addresses: SavedAddress[]) {
    localStorage.setItem("ratel_saved_addresses", JSON.stringify(addresses));
}

function CheckoutContent() {
    const { items, cartTotal, removeFromCart, updateQuantity, clearCart } = useCart();
    const router = useRouter();
    const { user } = useAuth();
    const [isClient, setIsClient] = useState(false);

    const [previewProduct, setPreviewProduct] = useState<Product | null>(null);
    const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
    const [showAddressPicker, setShowAddressPicker] = useState(false);
    const [address, setAddress] = useState({
        firstName: "",
        lastName: "",
        street: "",
        city: "Lagos",
        phone: "",
        email: ""
    });
    const [addressError, setAddressError] = useState("");
    const [createAccount, setCreateAccount] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showPaystack, setShowPaystack] = useState(false);

    // Load saved addresses and auto-fill from user on mount
    useEffect(() => {
        const saved = getSavedAddresses();
        setSavedAddresses(saved);

        if (user) {
            const nameParts = (user.name || "").split(" ");
            const firstName = nameParts[0] || "";
            const lastName = nameParts.slice(1).join(" ") || "";
            // If user has a saved address, use the most recent one
            if (saved.length > 0) {
                const latest = saved[0];
                setAddress({
                    firstName: latest.firstName || firstName,
                    lastName: latest.lastName || lastName,
                    street: latest.street,
                    city: latest.city,
                    phone: latest.phone || (user as any)?.phone || "",
                    email: user.email
                });
                setIsEditingAddress(false);
            } else {
                setAddress(prev => ({
                    ...prev,
                    firstName,
                    lastName,
                    email: user.email,
                    phone: (user as any)?.phone || ""
                }));
            }
        } else if (saved.length > 0) {
            const latest = saved[0];
            setAddress({
                firstName: latest.firstName,
                lastName: latest.lastName,
                street: latest.street,
                city: latest.city,
                phone: latest.phone,
                email: ""
            });
            setIsEditingAddress(false);
        }
    }, [user]);

    // Determine items to show
    let checkoutItems: { product: Product, price: number, quantity: number, isNegotiated?: boolean }[] = [];

    if (negotiationId) {
        // Buy Now / Negotiation Flow
        const negotiation = DEMO_NEGOTIATIONS.find(n => n.id === negotiationId);
        if (negotiation) {
            const negotiatedProduct = DEMO_PRODUCTS.find(p => p.id === negotiation.product_id);
            if (negotiatedProduct) {
                checkoutItems = [{
                    product: negotiatedProduct,
                    price: negotiation.proposed_price,
                    quantity: 1,
                    isNegotiated: true
                }];
            }
        }
    } else {
        // Standard Cart Flow
        checkoutItems = cart.map(item => ({
            product: item.product,
            price: item.product.price,
            quantity: item.quantity
        }));
    }

    // Redirect if empty
    useEffect(() => {
        if (!negotiationId && cart.length === 0) {
            // router.push("/cart"); // Commented out to prevent flicker during dev if context loads late
        }
    }, [negotiationId, cart, router]);

    const subtotal = checkoutItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const shipping = 2500;
    const total = subtotal + shipping;

    // Save address to localStorage
    const saveCurrentAddress = () => {
        const newAddr: SavedAddress = {
            id: `addr_${Date.now()}`,
            label: `${address.firstName}'s Address – ${address.city}`,
            firstName: address.firstName,
            lastName: address.lastName,
            phone: address.phone,
            street: address.street,
            city: address.city
        };
        // Avoid duplicates by matching street + city
        const existing = savedAddresses.filter(a => !(a.street === newAddr.street && a.city === newAddr.city));
        const updated = [newAddr, ...existing].slice(0, 5); // Keep max 5
        setSavedAddresses(updated);
        persistAddresses(updated);
    };

    const selectSavedAddress = (addr: SavedAddress) => {
        setAddress(prev => ({
            ...prev,
            firstName: addr.firstName,
            lastName: addr.lastName,
            phone: addr.phone,
            street: addr.street,
            city: addr.city
        }));
        setShowAddressPicker(false);
        setIsEditingAddress(false);
    };

    const deleteSavedAddress = (id: string) => {
        const updated = savedAddresses.filter(a => a.id !== id);
        setSavedAddresses(updated);
        persistAddresses(updated);
    };

    const handlePlaceOrder = () => {
        const email = user?.email || address.email;
        if (!address.firstName.trim() || !email.trim()) {
            setAddressError(user ? "Please enter your first name." : "Please enter your name and email address.");
            setIsEditingAddress(true);
            return;
        }
        if (!address.street.trim()) {
            setAddressError("Please enter your delivery address.");
            setIsEditingAddress(true);
            return;
        }
        setAddressError("");

        // Auto-save this address for next time
        if (address.street.trim()) {
            saveCurrentAddress();
        }

        const paystackKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY;
        if (paystackKey && paystackKey.startsWith("pk_")) {
            setShowPaystack(true);
        } else {
            // Demo mode — no Paystack key configured
            finalizeOrder("DEMO-" + Date.now());
        }
    };

    const finalizeOrder = (_reference?: string) => {
        setShowPaystack(false);
        setIsProcessing(true);
        setTimeout(() => {
            // Create and save the order(s)
            // Use the provided email as the user_id if not logged in
            const orderUserId = user?.email || address.email;
            const fullName = `${address.firstName} ${address.lastName}`.trim();

            checkoutItems.forEach(item => {
                DemoStore.addOrder({
                    product_id: item.product.id,
                    customer_id: orderUserId,
                    seller_id: item.product.seller_id,
                    amount: item.price * item.quantity,
                    status: "pending",
                    escrow_status: "held",
                    shipping_address: `${fullName}, ${address.street}, ${address.city}`
                }, item.product);
            });

            if (negotiationId) {
                // Mark negotiation as purchased to clear notification
                DemoStore.updateNegotiationStatus(negotiationId, "purchased");
            } else {
                clearCart();
            }

            // Dispatch event to update navbar/orders page immediately
            window.dispatchEvent(new Event("storage"));

            if (!user) {
                // Redirect guest to register to claim their order
                const searchParams = new URLSearchParams();
                searchParams.set("email", address.email);
                searchParams.set("name", `${address.firstName} ${address.lastName}`.trim());
                searchParams.set("phone", address.phone);
                searchParams.set("from", "checkout");
                router.push(`/register?${searchParams.toString()}`);
            } else {
                router.push("/account/orders?success=true");
            }
        }, 1500);
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            {/* Header */}
            <Navbar />

            <main className="flex-1 container mx-auto max-w-6xl px-4 py-8 flex flex-col lg:flex-row gap-8">

                {/* Left Column: Checkout steps */}
                <div className="flex-1 space-y-6">

                    {/* Step 1: Shipping Address */}
                    <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h2 className="font-bold text-lg flex items-center gap-2 text-gray-900">
                                <span className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center text-xs">1</span>
                                Shipping Address
                            </h2>
                            {!isEditingAddress && (
                                <button
                                    onClick={() => setIsEditingAddress(true)}
                                    className="text-xs font-bold text-blue-600 hover:text-ratel-orange"
                                >
                                    Change
                                </button>
                            )}
                        </div>

                        <div className="p-6">
                            {/* Saved address picker */}
                            {savedAddresses.length > 0 && isEditingAddress && (
                                <div className="mb-4">
                                    <button
                                        onClick={() => setShowAddressPicker(!showAddressPicker)}
                                        className="w-full flex items-center justify-between p-3 rounded-xl border border-dashed border-gray-300 hover:border-ratel-orange/50 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                                    >
                                        <span className="flex items-center gap-2">
                                            <MapPin className="h-4 w-4" />
                                            Use a saved address ({savedAddresses.length})
                                        </span>
                                        <ChevronDown className={`h-4 w-4 transition-transform ${showAddressPicker ? "rotate-180" : ""}`} />
                                    </button>
                                    {showAddressPicker && (
                                        <div className="mt-2 border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
                                            {savedAddresses.map(addr => (
                                                <div key={addr.id} className="flex items-center justify-between p-3 hover:bg-gray-50 cursor-pointer group">
                                                    <div onClick={() => selectSavedAddress(addr)} className="flex-1">
                                                        <p className="font-semibold text-sm text-gray-900">{addr.firstName} {addr.lastName}</p>
                                                        <p className="text-xs text-gray-500">{addr.street}, {addr.city} · {addr.phone}</p>
                                                    </div>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); deleteSavedAddress(addr.id); }}
                                                        className="p-1.5 rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-50 text-gray-300 hover:text-red-500 transition-all"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {isEditingAddress ? (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold uppercase text-gray-400">First Name</label>
                                            <Input
                                                value={address.firstName}
                                                onChange={e => setAddress({ ...address, firstName: e.target.value })}
                                                placeholder="Enter first name"
                                                className="rounded-xl border-gray-300 bg-white focus:border-ratel-orange/50 focus:ring-ratel-orange/20"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold uppercase text-gray-400">Last Name</label>
                                            <Input
                                                value={address.lastName}
                                                onChange={e => setAddress({ ...address, lastName: e.target.value })}
                                                placeholder="Enter last name"
                                                className="rounded-xl border-gray-300 bg-white focus:border-ratel-orange/50 focus:ring-ratel-orange/20"
                                            />
                                        </div>
                                    </div>
                                    {/* Only show email for guest users */}
                                    {!user && (
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold uppercase text-gray-400">Email Address</label>
                                            <Input
                                                type="email"
                                                value={address.email}
                                                onChange={e => setAddress({ ...address, email: e.target.value })}
                                                placeholder="your@email.com"
                                                className="rounded-xl border-gray-300 bg-white focus:border-ratel-orange/50 focus:ring-ratel-orange/20"
                                            />
                                        </div>
                                    )}
                                    {user && (
                                        <div className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-xl text-sm">
                                            <Check className="h-4 w-4 text-green-600" />
                                            <span className="text-green-700">Order receipt will be sent to <strong>{user.email}</strong></span>
                                        </div>
                                    )}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold uppercase text-gray-400">Phone Number</label>
                                            <Input
                                                value={address.phone}
                                                onChange={e => setAddress({ ...address, phone: e.target.value })}
                                                placeholder="+234 xxx xxx xxxx"
                                                className="rounded-xl border-gray-300 bg-white focus:border-ratel-orange/50 focus:ring-ratel-orange/20"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold uppercase text-gray-400">City</label>
                                            <Input
                                                value={address.city}
                                                onChange={e => setAddress({ ...address, city: e.target.value })}
                                                placeholder="Lagos"
                                                className="rounded-xl border-gray-300 bg-white focus:border-ratel-orange/50 focus:ring-ratel-orange/20"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold uppercase text-gray-400">Street Address</label>
                                        <Input
                                            value={address.street}
                                            onChange={e => setAddress({ ...address, street: e.target.value })}
                                            placeholder="123 Example Street, Lekki Phase 1"
                                            className="rounded-xl border-gray-300 bg-white focus:border-ratel-orange/50 focus:ring-ratel-orange/20"
                                        />
                                    </div>
                                    {addressError && (
                                        <p className="text-sm text-red-500 font-semibold bg-red-50 p-3 rounded-lg">{addressError}</p>
                                    )}
                                    <div className="flex justify-end gap-2">
                                        {(address.street.trim() || savedAddresses.length > 0) && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => { setAddressError(""); setIsEditingAddress(false); }}
                                                className="rounded-full"
                                            >
                                                Cancel
                                            </Button>
                                        )}
                                        <Button
                                            size="sm"
                                            onClick={() => {
                                                const email = user?.email || address.email;
                                                if (!address.firstName.trim() || !email.trim()) {
                                                    setAddressError(user ? "First name is required." : "Name and email are required.");
                                                    return;
                                                }
                                                if (!address.street.trim()) {
                                                    setAddressError("Please enter your delivery address.");
                                                    return;
                                                }
                                                setAddressError("");
                                                saveCurrentAddress();
                                                setIsEditingAddress(false);
                                            }}
                                            className="rounded-full bg-black text-white"
                                        >
                                            Save Address
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                                            <MapPin className="h-5 w-5 text-gray-400" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-900">{address.firstName} {address.lastName}</p>
                                            <p className="text-sm text-gray-500">{address.street}{address.street && ", "}{address.city}</p>
                                            <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                                                <Phone className="h-3 w-3" /> {address.phone}
                                            </p>
                                        </div>
                                    </div>
                                    {!user && (
                                        <div className="pt-2 border-t border-gray-100">
                                            <label className="flex items-center gap-3 cursor-pointer group">
                                                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${createAccount ? "bg-ratel-green-600 border-ratel-green-600" : "border-gray-300 group-hover:border-ratel-green-600"}`}>
                                                    {createAccount && <Check className="h-3 w-3 text-white" />}
                                                    <input
                                                        type="checkbox"
                                                        className="hidden"
                                                        checked={createAccount}
                                                        onChange={() => setCreateAccount(!createAccount)}
                                                    />
                                                </div>
                                                <span className="text-sm font-medium text-gray-700">Save my details and create an account</span>
                                            </label>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Step 2: Payment Method */}
                    <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h2 className="font-bold text-lg flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center text-xs">2</div>
                                Payment Method
                            </h2>
                        </div>

                        <div className="p-6 space-y-3">
                            <label className="flex items-center gap-4 p-4 border border-ratel-orange/50 bg-orange-50/50 rounded-xl cursor-pointer transition-all hover:bg-orange-50">
                                <input type="radio" name="payment" defaultChecked className="h-5 w-5 text-ratel-orange focus:ring-ratel-orange" />
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <span className="font-bold text-gray-900">Pay with Card / Bank Transfer</span>
                                        <CreditCard className="h-4 w-4 text-gray-400" />
                                    </div>
                                    <p className="text-xs text-gray-500">Secured by Paystack</p>
                                </div>
                            </label>

                            <label className="flex items-center gap-4 p-4 border border-gray-200 rounded-xl opacity-50 cursor-not-allowed bg-gray-50">
                                <input type="radio" name="payment" disabled className="h-5 w-5" />
                                <div className="flex-1">
                                    <div className="font-bold text-gray-500">Pay on Delivery</div>
                                    <p className="text-xs text-gray-400">Not available for orders over ₦100,000</p>
                                </div>
                            </label>

                            <DiscountSection />
                        </div>
                    </section>

                    {/* Step 3: Review Items */}
                    <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h2 className="font-bold text-lg flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center text-xs">3</div>
                                Review Items
                            </h2>
                        </div>

                        <div className="p-6">
                            {/* Group items by seller */}
                            {(() => {
                                // Group by seller
                                const groups: Record<string, typeof checkoutItems> = {};
                                checkoutItems.forEach(item => {
                                    const seller = item.product.seller_name || "Unknown Seller";
                                    if (!groups[seller]) groups[seller] = [];
                                    groups[seller].push(item);
                                });
                                const sellerNames = Object.keys(groups);

                                return sellerNames.map((sellerName, gi) => (
                                    <div key={sellerName} className={gi > 0 ? "mt-6 pt-6 border-t border-gray-100" : ""}>
                                        {/* Seller header (only if multi-vendor) */}
                                        {sellerNames.length > 1 && (
                                            <div className="flex items-center gap-2 mb-3">
                                                <Package className="h-4 w-4 text-gray-400" />
                                                <span className="text-sm font-bold text-gray-700">Sold by: {sellerName}</span>
                                            </div>
                                        )}

                                        {/* Delivery estimate per seller */}
                                        <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm mb-4 bg-emerald-50 p-3 rounded-lg w-fit">
                                            <Truck className="h-4 w-4" />
                                            Delivery by {getDeliveryDateRange()}
                                        </div>

                                        <div className="space-y-6">
                                            {groups[sellerName].map((item, i) => (
                                                <div key={i} className="flex gap-4 group/item">
                                                    <button
                                                        onClick={(e) => { e.preventDefault(); setPreviewProduct(item.product); }}
                                                        className="w-20 h-20 bg-gray-50 rounded-xl border border-gray-100 shrink-0 p-2 cursor-pointer hover:border-emerald-300 transition-colors"
                                                    >
                                                        <img src={item.product.image_url} className="w-full h-full object-contain mix-blend-multiply transition-transform group-hover/item:scale-105" alt="" />
                                                    </button>
                                                    <div className="flex-1">
                                                        <div className="flex justify-between items-start">
                                                            <div
                                                                className="cursor-pointer group-hover/item:text-emerald-700 transition-colors"
                                                                onClick={(e) => { e.preventDefault(); setPreviewProduct(item.product); }}
                                                            >
                                                                <h3 className="font-bold text-gray-900 line-clamp-1 group-hover/item:text-emerald-600 transition-colors">{item.product.name}</h3>
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    <span className="font-bold text-ratel-green-600">{formatPrice(item.price)}</span>
                                                                    {item.isNegotiated && (
                                                                        <span className="text-[10px] bg-ratel-green-100 text-ratel-green-700 px-1.5 py-0.5 rounded font-bold flex items-center gap-1">
                                                                            <Tag className="h-3 w-3" /> Negotiated Price
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                {item.isNegotiated && (
                                                                    <p className="text-xs text-gray-400 line-through mt-0.5">{formatPrice(item.product.price)}</p>
                                                                )}
                                                            </div>
                                                            {!negotiationId && (
                                                                <button
                                                                    onClick={() => removeFromCart(item.product.id)}
                                                                    className="text-gray-400 hover:text-red-500 transition-colors"
                                                                >
                                                                    <span className="sr-only">Remove</span>
                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                                                                </button>
                                                            )}
                                                        </div>

                                                        <div className="flex items-center gap-3 mt-3">
                                                            <p className="text-sm text-gray-500">Quantity:</p>
                                                            {!negotiationId ? (
                                                                <div className="flex items-center border border-gray-200 rounded-lg bg-gray-50">
                                                                    <button
                                                                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                                                                        className="px-2 py-1 hover:bg-gray-200 rounded-l-lg transition-colors"
                                                                        disabled={item.quantity <= 1}
                                                                    >
                                                                        -
                                                                    </button>
                                                                    <span className="px-2 text-sm font-bold w-6 text-center">{item.quantity}</span>
                                                                    <button
                                                                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                                                                        className="px-2 py-1 hover:bg-gray-200 rounded-r-lg transition-colors"
                                                                    >
                                                                        +
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <span className="text-sm font-bold">{item.quantity}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ));
                            })()}
                        </div>
                    </section>

                </div>

                {/* Right Column: Summary */}
                <div className="w-full lg:w-96">
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 sticky top-24">
                        <Button
                            size="lg"
                            onClick={handlePlaceOrder}
                            disabled={isProcessing}
                            className="w-full rounded-xl bg-gradient-to-r from-ratel-orange to-amber-500 hover:from-amber-500 hover:to-amber-600 text-black font-bold h-12 shadow-lg shadow-orange-500/20 mb-4 text-base"
                        >
                            {isProcessing ? "Processing..." : "Place Your Order"}
                        </Button>

                        <p className="text-xs text-center text-gray-500 mb-6 px-4">
                            By placing your order, you agree to RatelShop's privacy notice and conditions of use.
                        </p>

                        <div className="space-y-3 text-sm border-t border-gray-100 pt-6">
                            <div className="flex justify-between text-gray-600">
                                <span>Item's total ({checkoutItems.reduce((a, b) => a + b.quantity, 0)}):</span>
                                <span className="font-medium">{formatPrice(subtotal)}</span>
                            </div>
                            <div className="flex justify-between text-gray-600">
                                <span>Delivery fees:</span>
                                <span className="font-medium">{formatPrice(shipping)}</span>
                            </div>

                            <div className="flex justify-between items-end border-t border-gray-200 pt-4 mt-2">
                                <span className="font-bold text-lg text-gray-900">Total:</span>
                                <span className="font-black text-2xl text-gray-900">{formatPrice(total)}</span>
                            </div>
                        </div>
                    </div>
                </div>

            </main >

            {/* Global cross-sell at bottom of checkout */}
            <div className="container mx-auto max-w-6xl px-4 mt-6 mb-16">
                <RecommendedProducts
                    products={DemoStore.getProducts().slice(8, 16)}
                    title="Frequently Bought Together"
                    subtitle="Customers also added these items"
                />
            </div>

            <AnimatePresence>
                {showPaystack && (
                    <PaystackCheckout
                        amount={total * 100}
                        email={user?.email || "guest@example.com"}
                        onSuccess={(ref) => finalizeOrder(ref)}
                        onClose={() => setShowPaystack(false)}
                        autoStart={true}
                    />
                )}
            </AnimatePresence>

            {/* Product Preview Modal */}
            <AnimatePresence>
                {previewProduct && (
                    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                            onClick={() => setPreviewProduct(null)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col"
                        >
                            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                <h3 className="font-bold text-lg text-gray-900">Product Details</h3>
                                <button onClick={() => setPreviewProduct(null)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                                    <X className="h-5 w-5 text-gray-500" />
                                </button>
                            </div>
                            <div className="p-6 overflow-y-auto max-h-[70vh]">
                                <div className="w-full h-48 bg-gray-50 rounded-2xl border border-gray-100 mb-6 p-4 flex items-center justify-center">
                                    <img src={previewProduct.image_url} alt={previewProduct.name} className="w-full h-full object-contain mix-blend-multiply" />
                                </div>
                                <h2 className="text-xl font-black text-gray-900 mb-2">{previewProduct.name}</h2>
                                <p className="text-2xl font-bold text-emerald-600 mb-4">{formatPrice(previewProduct.price)}</p>

                                <div className="space-y-4">
                                    <div>
                                        <h4 className="text-xs font-bold uppercase text-gray-400 mb-1">Description</h4>
                                        <p className="text-sm text-gray-700 leading-relaxed font-medium">{previewProduct.description}</p>
                                    </div>

                                    <div className="flex flex-wrap gap-3 bg-gray-50 p-4 rounded-xl border border-gray-100">
                                        <div className="flex items-center gap-2 text-xs font-bold text-gray-600">
                                            <ShieldCheck className="h-4 w-4 text-emerald-500" /> Verified Escrow
                                        </div>
                                        <div className="flex items-center gap-2 text-xs font-bold text-gray-600">
                                            {previewProduct.seller_id === "ratel-concierge" ? <Globe className="h-4 w-4 text-blue-500" /> : <Package className="h-4 w-4 text-gray-400" />}
                                            {previewProduct.seller_name}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
                                <Button
                                    onClick={() => setPreviewProduct(null)}
                                    className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold px-6"
                                >
                                    Continue to Checkout
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div >
    );
}
