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
    const { cart, cartTotal, removeFromCart, updateQuantity, clearCart } = useCart();
    const router = useRouter();
    const { user, login } = useAuth();
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
    const [isEditingAddress, setIsEditingAddress] = useState(false);
    const [checkoutStep, setCheckoutStep] = useState<1 | 2 | 3>(1);
    const [paymentMethod, setPaymentMethod] = useState<"paystack" | "cod">("paystack");

    const [deliveryMethod, setDeliveryMethod] = useState<"doorstep" | "pickup">("doorstep");
    const [pickupDetails, setPickupDetails] = useState({ state: "", city: "", station: "" });

    const [baseDoorFee, setBaseDoorFee] = useState(4000);
    const [basePickupFee, setBasePickupFee] = useState(2500);

    const PICKUP_STATIONS: Record<string, Record<string, string[]>> = {
        "Lagos": {
            "Ikeja": ["Ikeja Under Bridge Park", "Oshodi Transport Interchange", "Computer Village Hub"],
            "Lekki": ["Lekki Toll Gate Hub", "Ajah Under Bridge Park", "Sangotedo Junction"],
            "Victoria Island": ["CMS Bus Terminal", "Obalende Motor Park", "Adeola Odeku Hub"],
            "Surulere": ["Ojuelegba Motor Park", "Stadium Bus Stop Hub", "Adeniran Ogunsanya Hub"],
            "Yaba": ["Yaba Bus Stop Hub", "Sabo Market Station", "UNILAG Main Gate"],
            "Agege": ["Agege Pen Cinema Park", "Ogba Bus Stop Hub"],
            "Ikorodu": ["Ikorodu Garage Park", "Benson Bus Stop Hub"],
            "Epe": ["Epe T-Junction Park"],
            "Badagry": ["Badagry Roundabout Park", "Agbara Junction Hub"]
        },
        "Abuja (FCT)": {
            "Garki": ["Garki Area 11 Park", "Area 1 Motor Park"],
            "Wuse": ["Berger Roundabout Hub", "Wuse Zone 3 Park", "Banex Junction"],
            "Wuse 2": ["Aminu Kano Crescent Hub", "Jabi Motor Park"],
            "Maitama": ["Maitama Roundabout Hub"],
            "Asokoro": ["AYA Roundabout Park", "Asokoro Junction Hub"],
            "Gwarinpa": ["Gwarinpa 3rd Avenue Park", "Life Camp Junction"],
            "Kubwa": ["Kubwa Express Junction", "PW Junction Hub", "Byazhin Hub"],
            "Lugbe": ["Police Signboard Hub", "FHA Junction Park", "Lugbe Market Hub"]
        },
        "Anambra": {
            "Awka": ["Unizik Junction Park", "Aroma Hub", "Amawbia Park"],
            "Onitsha": ["Upper Iweka Motor Park", "Onitsha Main Market Hub", "Nkpor Junction"],
            "Obosi": ["Obosi Junction Hub"],
            "Nnewi": ["Nkwo Nnewi Market Park", "Nnewi Motor Park"]
        },
        "Rivers": {
            "Port Harcourt": ["Mile 1 Motor Park", "Waterlines Junction", "Rumuola Park", "Choba Junction Hub", "Garrison Junction"],
            "Obio-Akpor": ["Rumuokwuta Hub", "Elelenwo Junction"],
            "Bonny": ["Bonny Waterside Hub"],
            "Degema": ["Degema Waterside Park"],
            "Okrika": ["Okrika Mainland Hub"]
        },
        "Oyo": {
            "Ibadan": ["Iwo Road Motor Park", "Challenge Motor Park", "Dugbe Hub", "Bodija Market Junction", "New Garage Park"],
            "Ogbomosho": ["Ogbomosho Central Park", "LAUTECH Gate Hub"],
            "Oyo": ["Oyo Town Park", "Atiba Market Hub"],
            "Iseyin": ["Iseyin Motor Park"]
        },
        "Kano": {
            "Kano": ["Sabon Gari Market Hub", "Kano Central Motor Park", "Zoo Road Junction", "Bompai Hub"],
            "Rano": ["Rano Motor Park"],
            "Gwarzo": ["Gwarzo Junction Hub"]
        },
        "Kaduna": {
            "Kaduna": ["Kasuwan Barchi Motor Park", "Ahmadu Bello Way Hub", "Kawo Motor Park"],
            "Zaria": ["PZ Zaria Hub", "Samaru Market Park"],
            "Kafanchan": ["Kafanchan Motor Park"]
        },
        "Enugu": {
            "Enugu": ["Holy Ghost Motor Park", "Ogbete Market Hub", "New Haven Park", "Abakpa Motor Park"],
            "Nsukka": ["UNN Gate Hub", "Nsukka Motor Park"],
            "Agbani": ["ESUT Junction Hub"]
        },
        "Delta": {
            "Warri": ["Effurun Roundabout Park", "PTI Junction Hub", "Warri Main Market Park"],
            "Asaba": ["Asaba Head Bridge Motor Park", "Summit Junction Hub", "Nnebisi Road Hub"],
            "Sapele": ["Sapele Motor Park"],
            "Ughelli": ["Ughelli Motor Park", "Otokutu Junction"]
        },
        "Ogun": {
            "Abeokuta": ["Kuto Motor Park", "Panseke Hub", "Lafenwa Motor Park"],
            "Ijebu-Ode": ["Ijebu-Ode Motor Park"],
            "Sagamu": ["Sagamu Interchange Hub"],
            "Ota": ["Sango-Ota Motor Park", "Joju Junction Hub"]
        },
        "Edo": {
            "Benin City": ["Uselu Motor Park", "Ring Road Hub", "New Benin Market Park", "UNIBEN Ugbowo Gate"],
            "Auchi": ["Auchi Poly Gate Hub", "Auchi Motor Park"],
            "Ekpoma": ["AAU Gate Hub"]
        },
        "Osun": {
            "Ile-Ife": ["OAU Gate Hub", "Mayfair Junction Park"],
            "Osogbo": ["Olaiya Junction Hub", "Old Garage Motor Park"],
            "Ipetumodu": ["Ipetumodu Motor Park"]
        },
        "Imo": {
            "Owerri": ["Control Post Motor Park", "World Bank Hub", "Owerri Main Market"],
            "Orlu": ["Orlu Motor Park"]
        },
        "Abia": {
            "Aba": ["Aba Motor Park", "Ariaria Market Hub", "Eziukwu Motor Park"],
            "Umuahia": ["Umuahia Motor Park"]
        },
        "Akwa Ibom": {
            "Uyo": ["Itam Motor Park", "Uyo Motor Park"],
            "Eket": ["Eket Motor Park"]
        },
        "Cross River": {
            "Calabar": ["Calabar Motor Park", "Watt Market Hub"],
            "Ikom": ["Ikom Motor Park"]
        }
    };

    const searchParams = useSearchParams();
    const negotiationId = searchParams?.get("negotiation");

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

        if (typeof window !== "undefined") {
            setBaseDoorFee(Number(localStorage.getItem("ratel_doorstep_fee")) || 4000);
            setBasePickupFee(Number(localStorage.getItem("ratel_pickup_fee")) || 2500);
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

    // Global items logic: Apply 1.5x multiplier to bases if any product is globally sourced
    const hasGlobalProduct = checkoutItems.some(item => item.product.seller_id === "global-partners" || item.product.seller_name.toLowerCase().includes("global"));
    const shippingMultiplier = hasGlobalProduct ? 1.5 : 1;

    // Shipping: FREE for online payments (Paystack), charged for pay-on-delivery
    const shipping = paymentMethod === "paystack" ? 0 : (
        deliveryMethod === "pickup"
            ? Math.round(basePickupFee * shippingMultiplier)
            : Math.round(baseDoorFee * shippingMultiplier)
    );

    const total = subtotal + shipping;
    const canPayOnDelivery = subtotal < 50000; // Only allow COD for orders under ₦50k

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
        if (!address.phone.trim()) {
            setAddressError("Please enter your phone number.");
            setIsEditingAddress(true);
            return;
        }
        if (deliveryMethod === "doorstep") {
            if (!address.street.trim()) {
                setAddressError("Please enter your street address.");
                setIsEditingAddress(true);
                return;
            }
            if (!pickupDetails.state) {
                setAddressError("Please select your state.");
                setIsEditingAddress(true);
                return;
            }
            if (!address.city.trim()) {
                setAddressError("Please select your city / area.");
                setIsEditingAddress(true);
                return;
            }
        }
        if (deliveryMethod === "pickup" && (!pickupDetails.state || !pickupDetails.city || !pickupDetails.station)) {
            setAddressError("Please select a valid pickup station.");
            setIsEditingAddress(true);
            return;
        }
        setAddressError("");

        // Auto-save this address for next time if doorstep
        if (deliveryMethod === "doorstep" && address.street.trim()) {
            saveCurrentAddress();
        }

        // Payment routing
        if (paymentMethod === "cod") {
            // Pay on delivery — skip Paystack, go straight to order confirmation
            finalizeOrder("COD-" + Date.now());
        } else {
            const paystackKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY;
            if (paystackKey && paystackKey.startsWith("pk_")) {
                setShowPaystack(true);
            } else {
                // Demo mode — no Paystack key configured
                finalizeOrder("DEMO-" + Date.now());
            }
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
                    shipping_address: deliveryMethod === "pickup"
                        ? `${fullName}, Pickup at: ${pickupDetails.station}, ${pickupDetails.city}, ${pickupDetails.state}`
                        : `${fullName}, ${address.street}, ${address.city}`
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
                // Auto-create an account for the guest and log them in
                login({
                    id: "usr_" + Date.now(),
                    email: address.email,
                    name: fullName || "Guest User",
                    role: "customer",
                    created_at: new Date().toISOString()
                });
                router.push("/account/orders?success=true");
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
                    <section className={`bg-white rounded-2xl shadow-sm border ${checkoutStep === 1 ? 'border-ratel-green-500 ring-1 ring-ratel-green-500' : 'border-gray-100'} overflow-hidden transition-all duration-300`}>
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 cursor-pointer" onClick={() => checkoutStep > 1 && setCheckoutStep(1)}>
                            <h2 className={`font-bold text-lg flex items-center gap-2 ${checkoutStep === 1 ? 'text-gray-900' : 'text-gray-500'}`}>
                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${checkoutStep === 1 ? 'bg-black text-white' : checkoutStep > 1 ? 'bg-ratel-green-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                                    {checkoutStep > 1 ? <Check className="h-4 w-4" /> : '1'}
                                </span>
                                Shipping Address
                            </h2>
                            {checkoutStep > 1 && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); setCheckoutStep(1); }}
                                    className="text-xs font-bold text-blue-600 hover:text-ratel-orange"
                                >
                                    CHANGE
                                </button>
                            )}
                        </div>

                        {checkoutStep === 1 ? (
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
                                    <div className="space-y-6">
                                        {/* Delivery Method Toggle */}
                                        <div className="flex bg-gray-100 p-1 rounded-xl">
                                            <button
                                                onClick={() => setDeliveryMethod("doorstep")}
                                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-all ${deliveryMethod === "doorstep" ? 'bg-white shadow-sm text-ratel-green-600' : 'text-gray-500 hover:text-gray-900'}`}
                                            >
                                                <Truck className="h-4 w-4" /> Door Delivery ({formatPrice(Math.round(baseDoorFee * shippingMultiplier))})
                                            </button>
                                            <button
                                                onClick={() => setDeliveryMethod("pickup")}
                                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-all ${deliveryMethod === "pickup" ? 'bg-white shadow-sm text-ratel-green-600' : 'text-gray-500 hover:text-gray-900'}`}
                                            >
                                                <MapPin className="h-4 w-4" /> Pickup Station ({formatPrice(Math.round(basePickupFee * shippingMultiplier))})
                                            </button>
                                        </div>

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
                                            <div className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-xl text-sm mb-2">
                                                <Check className="h-4 w-4 text-green-600" />
                                                <span className="text-green-700">Order receipt will be sent to <strong>{user.email}</strong></span>
                                            </div>
                                        )}
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold uppercase text-gray-400">Phone Number <span className="text-red-400">*</span></label>
                                            <Input
                                                value={address.phone}
                                                onChange={e => setAddress({ ...address, phone: e.target.value })}
                                                placeholder="+234 xxx xxx xxxx"
                                                required
                                                className="rounded-xl border-gray-300 bg-white focus:border-ratel-orange/50 focus:ring-ratel-orange/20"
                                            />
                                        </div>

                                        {deliveryMethod === "doorstep" ? (
                                            <div className="space-y-4">
                                                <div className="space-y-1">
                                                    <label className="text-xs font-bold uppercase text-gray-400">Street Address <span className="text-red-400">*</span></label>
                                                    <Input
                                                        value={address.street}
                                                        onChange={e => setAddress({ ...address, street: e.target.value })}
                                                        placeholder="123 Example Street, Lekki Phase 1"
                                                        required
                                                        className="rounded-xl border-gray-300 bg-white focus:border-ratel-orange/50 focus:ring-ratel-orange/20"
                                                    />
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="space-y-1">
                                                        <label className="text-xs font-bold uppercase text-gray-400">State <span className="text-red-400">*</span></label>
                                                        <div className="relative">
                                                            <select
                                                                className="w-full appearance-none rounded-2xl border border-gray-200 bg-gray-50/80 backdrop-blur-sm text-sm h-12 pl-4 pr-10 text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 hover:border-gray-300 transition-all cursor-pointer"
                                                                value={pickupDetails.state || ""}
                                                                required
                                                                onChange={e => {
                                                                    setPickupDetails({ state: e.target.value, city: "", station: "" });
                                                                    const firstCity = Object.keys(PICKUP_STATIONS[e.target.value] || {})[0] || "";
                                                                    setAddress({ ...address, city: firstCity || e.target.value });
                                                                }}
                                                            >
                                                                <option value="" disabled>Select State</option>
                                                                {Object.keys(PICKUP_STATIONS).map(state => (
                                                                    <option key={state} value={state}>{state}</option>
                                                                ))}
                                                            </select>
                                                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                                                                <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-xs font-bold uppercase text-gray-400">City / Area <span className="text-red-400">*</span></label>
                                                        <div className="relative">
                                                            <select
                                                                className="w-full appearance-none rounded-2xl border border-gray-200 bg-gray-50/80 backdrop-blur-sm text-sm h-12 pl-4 pr-10 text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 hover:border-gray-300 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                                                value={address.city}
                                                                onChange={e => setAddress({ ...address, city: e.target.value })}
                                                                disabled={!pickupDetails.state}
                                                                required
                                                            >
                                                                <option value="" disabled>Select City</option>
                                                                {pickupDetails.state && Object.keys(PICKUP_STATIONS[pickupDetails.state]).map(city => (
                                                                    <option key={city} value={city}>{city}</option>
                                                                ))}
                                                            </select>
                                                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                                                                <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-4 bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="space-y-1">
                                                        <label className="text-xs font-bold uppercase text-emerald-700">State <span className="text-red-400">*</span></label>
                                                        <div className="relative">
                                                            <select
                                                                className="w-full appearance-none rounded-2xl border border-emerald-200 bg-white backdrop-blur-sm text-sm h-12 pl-4 pr-10 text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 hover:border-emerald-300 transition-all cursor-pointer"
                                                                value={pickupDetails.state}
                                                                required
                                                                onChange={e => setPickupDetails({ state: e.target.value, city: "", station: "" })}
                                                            >
                                                                <option value="" disabled>Select State</option>
                                                                {Object.keys(PICKUP_STATIONS).map(state => (
                                                                    <option key={state} value={state}>{state}</option>
                                                                ))}
                                                            </select>
                                                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                                                                <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-xs font-bold uppercase text-emerald-700">City <span className="text-red-400">*</span></label>
                                                        <div className="relative">
                                                            <select
                                                                className="w-full appearance-none rounded-2xl border border-emerald-200 bg-white backdrop-blur-sm text-sm h-12 pl-4 pr-10 text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 hover:border-emerald-300 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                                                value={pickupDetails.city}
                                                                onChange={e => setPickupDetails({ ...pickupDetails, city: e.target.value, station: "" })}
                                                                disabled={!pickupDetails.state}
                                                                required
                                                            >
                                                                <option value="" disabled>Select City</option>
                                                                {pickupDetails.state && Object.keys(PICKUP_STATIONS[pickupDetails.state]).map(city => (
                                                                    <option key={city} value={city}>{city}</option>
                                                                ))}
                                                            </select>
                                                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                                                                <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-xs font-bold uppercase text-emerald-700">Pickup Station / Motor Park <span className="text-red-400">*</span></label>
                                                    <div className="relative">
                                                        <select
                                                            className="w-full appearance-none rounded-2xl border border-emerald-200 bg-white backdrop-blur-sm text-sm h-12 pl-4 pr-10 text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 hover:border-emerald-300 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                                            value={pickupDetails.station}
                                                            onChange={e => setPickupDetails({ ...pickupDetails, station: e.target.value })}
                                                            disabled={!pickupDetails.city}
                                                            required
                                                        >
                                                            <option value="" disabled>Select a Station</option>
                                                            {pickupDetails.city && PICKUP_STATIONS[pickupDetails.state][pickupDetails.city].map(station => (
                                                                <option key={station} value={station}>{station}</option>
                                                            ))}
                                                        </select>
                                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                                                            <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                                                        </div>
                                                    </div>
                                                </div>
                                                {pickupDetails.station && (
                                                    <div className="flex gap-2 items-start mt-2 p-3 bg-white rounded-lg border border-emerald-100">
                                                        <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                                                        <p className="text-xs text-gray-600 leading-relaxed">
                                                            Your items will be available at <strong className="text-emerald-700">{pickupDetails.station}</strong>. We will notify you via email and SMS when it is ready for pickup.
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {addressError && (
                                            <p className="text-sm text-red-500 font-semibold bg-red-50 p-3 rounded-lg flex items-center gap-2"><X className="h-4 w-4 shrink-0" /> {addressError}</p>
                                        )}
                                        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                                            {(address.street.trim() || savedAddresses.length > 0) && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => { setAddressError(""); setIsEditingAddress(false); }}
                                                    className="rounded-xl border-gray-300 text-gray-700 font-semibold"
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
                                                    if (!address.phone.trim()) {
                                                        setAddressError("Phone number is required.");
                                                        return;
                                                    }
                                                    if (deliveryMethod === "doorstep") {
                                                        if (!address.street.trim()) {
                                                            setAddressError("Please enter your delivery street address.");
                                                            return;
                                                        }
                                                        if (!pickupDetails.state) {
                                                            setAddressError("Please select your state.");
                                                            return;
                                                        }
                                                        if (!address.city.trim()) {
                                                            setAddressError("Please select your city / area.");
                                                            return;
                                                        }
                                                    }
                                                    if (deliveryMethod === "pickup" && (!pickupDetails.state || !pickupDetails.city || !pickupDetails.station)) {
                                                        setAddressError("Please select a valid pickup station.");
                                                        return;
                                                    }
                                                    setAddressError("");
                                                    if (deliveryMethod === "doorstep" && address.street.trim()) saveCurrentAddress();
                                                    setIsEditingAddress(false);
                                                    setCheckoutStep(2);
                                                }}
                                                className="rounded-xl bg-black hover:bg-gray-900 text-white font-bold px-6"
                                            >
                                                Confirm Details
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="flex items-start gap-4">
                                            <div className="w-10 h-10 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
                                                {deliveryMethod === "pickup" ? <MapPin className="h-5 w-5 text-ratel-green-600" /> : <Truck className="h-5 w-5 text-gray-400" />}
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-900">{address.firstName} {address.lastName}</p>
                                                {deliveryMethod === "doorstep" ? (
                                                    <p className="text-sm text-gray-500 mt-1">{address.street}{address.street && ", "}{address.city}</p>
                                                ) : (
                                                    <p className="text-sm text-gray-500 mt-1">
                                                        <span className="font-bold text-ratel-green-600">Pickup Station:</span> {pickupDetails.station}, {pickupDetails.city}, {pickupDetails.state}
                                                    </p>
                                                )}
                                                <p className="text-sm text-gray-500 flex items-center gap-2 mt-1.5 font-medium">
                                                    <Phone className="h-3.5 w-3.5" /> {address.phone || "No phone provided"}
                                                </p>
                                                <button
                                                    onClick={() => setIsEditingAddress(true)}
                                                    className="text-sm font-bold text-blue-600 hover:text-blue-700 mt-3"
                                                >
                                                    Edit Details
                                                </button>
                                            </div>
                                        </div>
                                        {!user && (
                                            <div className="pt-4 border-t border-gray-100">
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
                                        <div className="mt-6 flex justify-end">
                                            <Button
                                                onClick={() => setCheckoutStep(2)}
                                                className="w-full md:w-auto bg-ratel-green-600 hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 text-white rounded-xl font-bold px-8"
                                            >
                                                PROCEED TO PAYMENT
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="px-6 py-4 flex items-center gap-4 bg-gray-50/50">
                                {deliveryMethod === "pickup" ? <MapPin className="h-5 w-5 text-gray-400" /> : <Truck className="h-5 w-5 text-gray-400" />}
                                <div>
                                    <p className="text-sm font-bold text-gray-900">{address.firstName} {address.lastName}</p>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        {deliveryMethod === "doorstep"
                                            ? `${address.street}, ${address.city}`
                                            : `Pickup: ${pickupDetails.station}, ${pickupDetails.city}`
                                        }
                                    </p>
                                </div>
                            </div>
                        )}
                    </section>

                    {/* Step 2: Payment Method */}
                    <section className={`bg-white rounded-2xl shadow-sm border ${checkoutStep === 2 ? 'border-ratel-green-500 ring-1 ring-ratel-green-500' : 'border-gray-100'} overflow-hidden transition-all duration-300`}>
                        <div className={`p-6 border-b border-gray-100 flex justify-between items-center ${checkoutStep === 2 ? 'bg-gray-50/50' : 'bg-gray-50/30'}`} onClick={() => checkoutStep > 2 ? setCheckoutStep(2) : checkoutStep === 1 && address.street.trim() && setCheckoutStep(2)}>
                            <h2 className={`font-bold text-lg flex items-center gap-2 ${checkoutStep === 2 ? 'text-gray-900' : 'text-gray-400'}`}>
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${checkoutStep === 2 ? 'bg-black text-white' : checkoutStep > 2 ? 'bg-ratel-green-600 text-white' : 'bg-gray-200 text-gray-400'}`}>
                                    {checkoutStep > 2 ? <Check className="h-4 w-4" /> : '2'}
                                </div>
                                Payment Method
                            </h2>
                            {checkoutStep > 2 && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); setCheckoutStep(2); }}
                                    className="text-xs font-bold text-blue-600 hover:text-ratel-orange"
                                >
                                    CHANGE
                                </button>
                            )}
                        </div>

                        {checkoutStep === 2 && (
                            <div className="p-6 space-y-3">
                                {/* Paystack (Online Payment) */}
                                <label className={`flex items-center gap-4 p-4 border rounded-xl cursor-pointer transition-all ${paymentMethod === 'paystack' ? 'border-ratel-orange/50 bg-orange-50/50' : 'border-gray-200 hover:border-gray-300'}`}>
                                    <input type="radio" name="payment" checked={paymentMethod === 'paystack'} onChange={() => setPaymentMethod('paystack')} className="h-5 w-5 text-ratel-orange focus:ring-ratel-orange" />
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <span className="font-bold text-gray-900">Paystack (Card / Bank Transfer)</span>
                                            <CreditCard className="h-4 w-4 text-gray-400" />
                                        </div>
                                        <p className="text-xs text-gray-500">Secured online payment</p>
                                        <p className="text-xs text-emerald-600 font-bold mt-1">🎉 FREE delivery when you pay online!</p>
                                    </div>
                                </label>

                                {/* Pay on Delivery */}
                                {canPayOnDelivery ? (
                                    <label className={`flex items-center gap-4 p-4 border rounded-xl cursor-pointer transition-all ${paymentMethod === 'cod' ? 'border-amber-400 bg-amber-50/50' : 'border-gray-200 hover:border-gray-300'}`}>
                                        <input type="radio" name="payment" checked={paymentMethod === 'cod'} onChange={() => setPaymentMethod('cod')} className="h-5 w-5 text-amber-500 focus:ring-amber-500" />
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <span className="font-bold text-gray-900">Pay on Delivery</span>
                                                <Truck className="h-4 w-4 text-amber-500" />
                                            </div>
                                            <p className="text-xs text-gray-500">Pay cash when your order arrives</p>
                                            <p className="text-xs text-amber-600 font-semibold mt-1">
                                                Delivery fee: {formatPrice(deliveryMethod === 'pickup' ? Math.round(basePickupFee * shippingMultiplier) : Math.round(baseDoorFee * shippingMultiplier))} will be added
                                            </p>
                                        </div>
                                    </label>
                                ) : (
                                    <div className="flex items-center gap-4 p-4 border border-gray-100 rounded-xl bg-gray-50/50 opacity-60">
                                        <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
                                        <div>
                                            <span className="font-bold text-gray-500">Pay on Delivery</span>
                                            <p className="text-xs text-gray-400">Not available for orders above ₦50,000</p>
                                        </div>
                                    </div>
                                )}

                                <DiscountSection />

                                <div className="mt-6 flex justify-end">
                                    <Button
                                        onClick={() => setCheckoutStep(3)}
                                        className="w-full md:w-auto bg-ratel-green-600 hover:bg-emerald-600 text-white rounded-lg font-bold"
                                    >
                                        PROCEED TO SUMMARY
                                    </Button>
                                </div>
                            </div>
                        )}
                        {checkoutStep > 2 && (
                            <div className="px-6 py-4 flex items-center gap-4 bg-white opacity-80">
                                {paymentMethod === 'paystack' ? <CreditCard className="h-5 w-5 text-gray-400" /> : <Truck className="h-5 w-5 text-amber-500" />}
                                <div>
                                    <p className="text-sm font-bold text-gray-900">{paymentMethod === 'paystack' ? 'Paystack (Card / Bank Transfer)' : 'Pay on Delivery'}</p>
                                    <p className={`text-xs font-medium ${paymentMethod === 'paystack' ? 'text-green-600' : 'text-amber-600'}`}>
                                        {paymentMethod === 'paystack' ? 'Secured online payment · FREE delivery' : `Delivery fee: ${formatPrice(shipping)}`}
                                    </p>
                                </div>
                            </div>
                        )}
                    </section>

                    {/* Step 3: Review Items */}
                    <section className={`bg-white rounded-2xl shadow-sm border ${checkoutStep === 3 ? 'border-ratel-green-500 ring-1 ring-ratel-green-500' : 'border-gray-100'} overflow-hidden transition-all duration-300`}>
                        <div className={`p-6 border-b border-gray-100 flex justify-between items-center ${checkoutStep === 3 ? 'bg-gray-50/50' : 'bg-gray-50/30'}`}>
                            <h2 className={`font-bold text-lg flex items-center gap-2 ${checkoutStep === 3 ? 'text-gray-900' : 'text-gray-400'}`}>
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${checkoutStep === 3 ? 'bg-black text-white' : 'bg-gray-200 text-gray-400'}`}>3</div>
                                Review Items
                            </h2>
                        </div>

                        {checkoutStep === 3 && (
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
                                                            {item.product.image_url ? (
                                                                <img src={item.product.image_url} className="w-full h-full object-contain mix-blend-multiply transition-transform group-hover/item:scale-105" alt="" onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling && ((e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex'); }} />
                                                            ) : null}
                                                            <div className={`w-full h-full ${item.product.image_url ? 'hidden' : 'flex'} items-center justify-center bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-lg`}>
                                                                <span className="text-emerald-600 font-black text-lg">{item.product.name.charAt(0)}</span>
                                                            </div>
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
                        )}
                    </section>

                </div>

                {/* Right Column: Summary */}
                <div className={`w-full lg:w-96 ${checkoutStep !== 3 ? 'hidden lg:block' : ''}`}>
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 lg:sticky top-24 relative mb-24 lg:mb-0">
                        <div className="hidden lg:block">
                            <Button
                                size="lg"
                                onClick={handlePlaceOrder}
                                disabled={isProcessing}
                                className="w-full rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-14 shadow-lg shadow-emerald-600/25 mb-4 text-base transition-all active:scale-[0.98]"
                            >
                                {isProcessing ? "Processing..." : "Place Your Order"}
                            </Button>

                            <p className="text-xs text-center text-gray-500 mb-6 px-4">
                                By placing your order, you agree to FairPrice's privacy notice and conditions of use.
                            </p>
                        </div>

                        {/* Item thumbnails */}
                        <div className="space-y-3 border-b border-gray-100 pb-4 mb-4">
                            <h4 className="text-xs font-bold uppercase text-gray-400">Items ({checkoutItems.reduce((a, b) => a + b.quantity, 0)})</h4>
                            {checkoutItems.map((item, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-gray-50 rounded-lg border border-gray-100 p-1 shrink-0 overflow-hidden">
                                        {item.product.image_url ? (
                                            <img src={item.product.image_url} alt={item.product.name} className="w-full h-full object-contain mix-blend-multiply" onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling && ((e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex'); }} />
                                        ) : null}
                                        <div className={`w-full h-full ${item.product.image_url ? 'hidden' : 'flex'} items-center justify-center bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-md`}>
                                            <span className="text-emerald-500 font-bold text-xs">{item.product.name.charAt(0)}</span>
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium text-gray-700 line-clamp-1">{item.product.name}</p>
                                        <p className="text-xs text-gray-500">Qty: {item.quantity} × {formatPrice(item.price)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="space-y-3 text-sm lg:border-t border-gray-100 lg:pt-4">
                            <h3 className="font-bold text-lg mb-4 lg:hidden">Order Summary</h3>
                            <div className="flex justify-between text-gray-600">
                                <span>Item's total ({checkoutItems.reduce((a, b) => a + b.quantity, 0)}):</span>
                                <span className="font-medium">{formatPrice(subtotal)}</span>
                            </div>
                            <div className="flex justify-between text-gray-600">
                                <span>Delivery fees:</span>
                                {paymentMethod === 'paystack' ? (
                                    <span className="font-bold text-emerald-600">FREE ✨</span>
                                ) : (
                                    <span className="font-medium">{formatPrice(shipping)}</span>
                                )}
                            </div>

                            <div className="flex justify-between items-end border-t border-gray-200 pt-4 mt-2">
                                <span className="font-bold text-lg text-gray-900">Total:</span>
                                <span className="font-black text-2xl text-gray-900">{formatPrice(total)}</span>
                            </div>
                        </div>

                        {/* Mobile Sticky CTA */}
                        <div className="lg:hidden fixed bottom-[60px] left-0 right-0 p-4 bg-white border-t-2 border-gray-100 z-[90] shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
                            <div className="flex items-center justify-between mb-3 px-1">
                                <span className="font-bold text-gray-500 uppercase tracking-widest text-xs">Total</span>
                                <span className="font-black text-xl text-ratel-orange">{formatPrice(total)}</span>
                            </div>
                            <Button
                                size="lg"
                                onClick={handlePlaceOrder}
                                disabled={isProcessing}
                                className="w-full rounded-xl bg-gradient-to-r from-ratel-green-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-600 text-white font-black h-14 shadow-xl shadow-emerald-500/20 text-lg transition-all"
                            >
                                {isProcessing ? "Processing..." : "Confirm & Pay"}
                            </Button>
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
