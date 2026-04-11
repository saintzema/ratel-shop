"use client";

import Link from "next/link";
import { SEED_PRODUCTS, DEMO_NEGOTIATIONS } from "@/lib/data";
import { formatPrice, cn } from "@/lib/utils";
import { isVehicle, calculateMonthlyPayment, getVehicleDepositPercent } from "@/lib/financing-utils";
import { 
    calculateTieredEscrowFee, 
    ESCROW_TIERS 
} from "@/lib/escrow-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronDown, Trash2, Plus, X, Globe, ShieldCheck } from "lucide-react";
import { Check, Lock, ChevronRight, CreditCard, Tag, MapPin, Phone, Truck, Package, CheckCircle2, Crown, Building, Sparkles } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "@/context/CartContext";
import { Product, Coupon } from "@/lib/types";
import { DataSyncService } from "@/lib/sync-store";
import { ProductCard } from "@/components/product/ProductCard";
import { Logo } from "@/components/ui/logo";
import { useAuth } from "@/context/AuthContext";
import { PaystackCheckout } from "@/components/payment/PaystackCheckout";
import { PostOrderConciergeChat } from "@/components/modals/PostOrderConciergeChat";
import { Navbar } from "@/components/layout/Navbar";
import { RecommendedProducts } from "@/components/ui/RecommendedProducts";
import { ExitIntentModal } from "@/components/modals/ExitIntentModal";
import { playDingSound } from "@/lib/audio";

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

function DiscountSection({
    availableCoupons,
    appliedCoupon,
    subtotal,
    userId,
    onApplyCoupon
}: {
    availableCoupons: Coupon[];
    appliedCoupon: Coupon | null;
    subtotal: number;
    userId?: string;
    onApplyCoupon: (coupon: Coupon | null) => void;
}) {
    const [code, setCode] = useState("");
    const [msg, setMsg] = useState("");
    const [showDropdown, setShowDropdown] = useState(false);

    const handleApply = async (manualCode?: string) => {
        const targetCode = manualCode || code;
        if (!targetCode) return;

        setMsg("Validating...");

        // First check DataSyncService defined coupons
        const validCoupon = availableCoupons.find(c => c.code.toUpperCase() === targetCode.toUpperCase());

        if (validCoupon) {
            onApplyCoupon(validCoupon);
            setMsg(`Discount Applied: ₦${validCoupon.amount.toLocaleString()} OFF`);
            setShowDropdown(false);
            return;
        }

        // If not found in DataSyncService, check the database via the API
        try {
            const res = await fetch(`/api/discounts/validate?code=${targetCode.toUpperCase()}${userId ? `&userId=${userId}` : ''}`);
            if (res.ok) {
                const discount = await res.json();
                
                let amountOff = 0;
                let reasonStr = "";
                
                if (discount.type === 'percentage') {
                    amountOff = Math.round(subtotal * (discount.value / 100));
                    reasonStr = `${discount.value}% off storewide discount`;
                } else if (discount.type === 'fixed') {
                    amountOff = discount.value;
                    reasonStr = `₦${discount.value.toLocaleString()} flat discount`;
                } else if (discount.type === 'shipping') {
                    amountOff = 0; // Handled separately or mock a typical shipping cost as discount
                    reasonStr = `Free Shipping discount`;
                }

                const mappedCoupon: Coupon = {
                    id: discount.id,
                    userId: "all",
                    code: discount.code,
                    amount: amountOff,
                    reason: reasonStr,
                    isUsed: false,
                    issuedBy: discount.sellerId || "system",
                    createdAt: new Date().toISOString(),
                    expiresAt: new Date(Date.now() + 86400000).toISOString()
                };

                onApplyCoupon(mappedCoupon);
                setMsg(`Discount Applied: ₦${amountOff.toLocaleString()} OFF`);
                setShowDropdown(false);
            } else {
                const data = await res.json();
                setMsg(data.error || "Invalid or expired discount code");
                setTimeout(() => setMsg(""), 4000);
            }
        } catch (e) {
            setMsg("Error validating code. Please try again.");
            setTimeout(() => setMsg(""), 3000);
        }
    };

    const handleRemove = () => {
        onApplyCoupon(null);
        setCode("");
        setMsg("");
    };

    return (
        <div className="pt-4 space-y-3 relative">
            <label className="text-xs font-bold uppercase text-gray-500">Have a Coupon?</label>

            {appliedCoupon ? (
                <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl p-3">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                            <Tag className="h-4 w-4 text-green-600" />
                        </div>
                        <div>
                            <p className="font-bold text-green-800 tracking-wider text-sm">{appliedCoupon.code}</p>
                            <p className="text-xs text-green-600 font-medium">₦{appliedCoupon.amount.toLocaleString()} discount applied</p>
                        </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={handleRemove} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                        Remove
                    </Button>
                </div>
            ) : (
                <div className="space-y-2">
                    {availableCoupons.length > 0 && (
                        <div className="mb-3">
                            <button
                                onClick={() => setShowDropdown(!showDropdown)}
                                className="w-full flex items-center justify-between bg-emerald-50 border border-emerald-100 p-3 rounded-xl hover:border-emerald-300 transition-colors"
                            >
                                <span className="flex items-center gap-2 text-sm font-bold text-emerald-800">
                                    <Tag className="h-4 w-4" /> You have {availableCoupons.length} available coupon(s)
                                </span>
                                <ChevronDown className={`h-4 w-4 text-emerald-600 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
                            </button>
                            {showDropdown && (
                                <div className="mt-2 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden divide-y divide-gray-100 max-h-48 overflow-y-auto">
                                    {availableCoupons.map(coupon => (
                                        <button
                                            key={coupon.id}
                                            onClick={() => handleApply(coupon.code)}
                                            className="w-full text-left p-3 hover:bg-gray-50 flex items-center justify-between group transition-colors"
                                        >
                                            <div>
                                                <p className="font-bold text-gray-900 group-hover:text-brand-green-600 transition-colors">₦{coupon.amount.toLocaleString()} OFF</p>
                                                <p className="text-xs text-gray-500">{coupon.reason}</p>
                                            </div>
                                            <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-1 rounded font-bold uppercase tracking-wider group-hover:bg-brand-green-100 group-hover:text-brand-green-700 transition-colors">
                                                Apply
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                    <div className="flex items-center gap-2">
                        <Input
                            placeholder="Enter discount code"
                            className="max-w-xs h-10 text-sm border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:border-brand-orange/50 focus:ring-brand-orange/20 rounded-xl"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                        />
                        <Button
                            variant="outline"
                            className="h-10 rounded-xl border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900 font-bold px-6"
                            onClick={() => handleApply()}
                            disabled={!code}
                        >
                            Apply
                        </Button>
                    </div>
                </div>
            )}

            {msg && !appliedCoupon && (
                <p className="text-xs text-red-500 font-bold">
                    {msg}
                </p>
            )}
        </div>
    );
}

export default function CheckoutPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading checkout...</div>}>
            <ExitIntentModal />
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
    email: string;
    street: string;
    city: string;
    state?: string;
    station?: string;
    method: "doorstep" | "pickup";
    whatsappPhone?: string;
}

function getAddressKey(): string {
    if (typeof window === "undefined") return "fp_saved_addresses";
    try {
        const raw = localStorage.getItem("fp_user");
        if (raw) {
            const user = JSON.parse(raw);
            if (user?.id) return `fp_saved_addresses_${user.id}`;
        }
    } catch { }
    return "fp_saved_addresses";
}

function getSavedAddresses(): SavedAddress[] {
    if (typeof window === "undefined") return [];
    try {
        return JSON.parse(localStorage.getItem(getAddressKey()) || "[]");
    } catch { return []; }
}

function persistAddresses(addresses: SavedAddress[]) {
    localStorage.setItem(getAddressKey(), JSON.stringify(addresses));
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
        state: "Lagos",
        phone: "",
        email: ""
    });
    const [addressError, setAddressError] = useState("");
    const shippingAddressRef = useRef<HTMLElement>(null);
    const [createAccount, setCreateAccount] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showPaystack, setShowPaystack] = useState(false);
    const [isEditingAddress, setIsEditingAddress] = useState(true); // Default open for guests
    const [checkoutStep, setCheckoutStep] = useState<1 | 2 | 3>(1);

    // Added state for the "View More" feature
    const [loadedMore, setLoadedMore] = useState(false);
    const [visibleProductsCount, setVisibleProductsCount] = useState(8);
    const [paymentMethod, setPaymentMethod] = useState<"paystack" | "transfer" | "cod">("paystack");
    const [showConcierge, setShowConcierge] = useState(false);
    const [conciergeProduct, setConciergeProduct] = useState<Product | null>(null);
    const [conciergeOrderId, setConciergeOrderId] = useState<string | null>(null);
    const [showPushOptIn, setShowPushOptIn] = useState(false);

    // Coupon System
    const [availableCoupons, setAvailableCoupons] = useState<Coupon[]>([]);
    const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);

    // Savings Breakdown Toggle
    const [showSavingsBreakdown, setShowSavingsBreakdown] = useState(false);

    // Initial load effects
    useEffect(() => {
        setIsClient(true);
        if (user) {
            setAvailableCoupons(DataSyncService.getActiveCoupons(user.id));
        }
    }, [user]);

    // Email domain autocomplete
    const [emailSuggestions, setEmailSuggestions] = useState<string[]>([]);
    const [showEmailDropdown, setShowEmailDropdown] = useState(false);
    const EMAIL_DOMAINS = ["gmail.com", "icloud.com", "yahoo.com", "hotmail.com", "outlook.com", "protonmail.com", "aol.com", "live.com", "mail.com"];

    // Phone country code + WhatsApp
    const [countryCode, setCountryCode] = useState("+234");
    const [showCountryDropdown, setShowCountryDropdown] = useState(false);
    const [whatsappPhone, setWhatsappPhone] = useState("");
    const [showWhatsappField, setShowWhatsappField] = useState(false);
    const [whatsappCountryCode, setWhatsappCountryCode] = useState("+234");

    const COUNTRY_CODES = [
        { code: "+234", country: "Nigeria", flag: "🇳🇬" },
        { code: "+233", country: "Ghana", flag: "🇬🇭" },
        { code: "+254", country: "Kenya", flag: "🇰🇪" },
        { code: "+27", country: "South Africa", flag: "🇿🇦" },
        { code: "+1", country: "USA/Canada", flag: "🇺🇸" },
        { code: "+44", country: "UK", flag: "🇬🇧" },
        { code: "+91", country: "India", flag: "🇮🇳" },
        { code: "+86", country: "China", flag: "🇨🇳" },
        { code: "+971", country: "UAE", flag: "🇦🇪" },
        { code: "+966", country: "Saudi Arabia", flag: "🇸🇦" },
        { code: "+49", country: "Germany", flag: "🇩🇪" },
        { code: "+33", country: "France", flag: "🇫🇷" },
        { code: "+81", country: "Japan", flag: "🇯🇵" },
        { code: "+61", country: "Australia", flag: "🇦🇺" },
        { code: "+55", country: "Brazil", flag: "🇧🇷" },
        { code: "+237", country: "Cameroon", flag: "🇨🇲" },
        { code: "+251", country: "Ethiopia", flag: "🇪🇹" },
        { code: "+255", country: "Tanzania", flag: "🇹🇿" },
        { code: "+256", country: "Uganda", flag: "🇺🇬" },
        { code: "+221", country: "Senegal", flag: "🇸🇳" },
    ];

    const handleEmailChange = (value: string) => {
        setAddress({ ...address, email: value });
        const atIdx = value.indexOf("@");
        if (atIdx >= 1) {
            const typed = value.substring(atIdx + 1).toLowerCase();
            const prefix = value.substring(0, atIdx);
            const filtered = EMAIL_DOMAINS.filter(d => d.startsWith(typed) && d !== typed);
            setEmailSuggestions(filtered.map(d => `${prefix}@${d}`));
            setShowEmailDropdown(filtered.length > 0);
        } else {
            setEmailSuggestions([]);
            setShowEmailDropdown(false);
        }
    };

    const [deliveryMethod, setDeliveryMethod] = useState<"doorstep" | "pickup">("pickup");
    const [pickupDetails, setPickupDetails] = useState({ state: "", city: "", station: "" });

    const [isGuestCheckout, setIsGuestCheckout] = useState(false);
    const [showGuestPasswordSetup, setShowGuestPasswordSetup] = useState(false);
    const [guestPassword, setGuestPassword] = useState("");
    const [isSettingPassword, setIsSettingPassword] = useState(false);
    const [passwordError, setPasswordError] = useState("");

    const [baseDoorFee, setBaseDoorFee] = useState(4000);
    const [basePickupFee, setBasePickupFee] = useState(2500);
    const [escrowFeePayNow, setEscrowFeePayNow] = useState(1950);

    // COD settings from admin
    const [codThreshold, setCodThreshold] = useState(50000);
    const [codEnabled, setCodEnabled] = useState(true);
    const [codAllowExpensiveCategories, setCodAllowExpensiveCategories] = useState(true);
    // COD for global products — admin-controlled (default enabled for seamless UX)
    const [codGlobalEnabled, setCodGlobalEnabled] = useState(true);
    const [codGlobalThreshold, setCodGlobalThreshold] = useState(20000);

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

    const [dynamicPickups, setDynamicPickups] = useState<Record<string, Record<string, string[]>>>(PICKUP_STATIONS);

    const searchParams = useSearchParams();
    const negotiationId = searchParams?.get("negotiation");

    // Load saved addresses and auto-fill from user on mount
    useEffect(() => {
        // Only load saved addresses for authenticated users to prevent cross-session leaks
        if (user) {
            const saved = getSavedAddresses();
            setSavedAddresses(saved);

            if (saved.length > 0) {
                const latest = saved[0];
                setAddress({
                    firstName: latest.firstName,
                    lastName: latest.lastName,
                    street: latest.street,
                    city: latest.city,
                    state: latest.state || "Lagos",
                    phone: latest.phone,
                    email: latest.email || user?.email || ""
                });
                if (latest.method === "pickup") {
                    setDeliveryMethod("pickup");
                    setPickupDetails({
                        state: latest.state || "",
                        city: latest.city || "",
                        station: latest.station || ""
                    });
                } else {
                    setDeliveryMethod("doorstep");
                }
                if (latest.whatsappPhone) {
                    setShowWhatsappField(true);
                    setWhatsappPhone(latest.whatsappPhone);
                }
                setIsEditingAddress(false);
            } else {
                const nameParts = (user.name || "").split(" ");
                const firstName = nameParts[0] || "";
                const lastName = nameParts.slice(1).join(" ") || "";
                setAddress(prev => ({
                    ...prev,
                    firstName,
                    lastName,
                    email: user.email,
                    phone: (user as any)?.phone || ""
                }));
                setIsEditingAddress(true);
            }
        } else {
            // Guest: start with empty address, never load saved data
            setIsEditingAddress(true);
        }

        if (typeof window !== "undefined") {
            setBaseDoorFee(Number(localStorage.getItem("fp_doorstep_fee")) || 4000);
            setBasePickupFee(Number(localStorage.getItem("fp_pickup_fee")) || 2500);
        }

        // Load COD settings from admin API
        fetch("/api/admin/settings")
            .then(res => res.ok ? res.json() : null)
            .then(data => {
                if (data) {
                    if (data.codThreshold != null) setCodThreshold(Number(data.codThreshold));
                    if (data.codEnabled != null) setCodEnabled(data.codEnabled);
                    if (data.codAllowExpensiveCategories != null) setCodAllowExpensiveCategories(data.codAllowExpensiveCategories);
                    if (data.doorstepFee) setBaseDoorFee(Number(data.doorstepFee));
                    if (data.pickupFee) setBasePickupFee(Number(data.pickupFee));
                    // Global COD settings
                    if (data.codGlobalEnabled != null) setCodGlobalEnabled(data.codGlobalEnabled);
                    if (data.codGlobalThreshold != null) setCodGlobalThreshold(Number(data.codGlobalThreshold));
                    if (data.escrowFeePayNow != null) setEscrowFeePayNow(Number(data.escrowFeePayNow));

                    if (data.supportConfig?.serviceCenters?.length > 0) {
                        setDynamicPickups(prev => {
                            const updated = { ...prev };
                            if (!updated["Platform Offices / Hubs"]) updated["Platform Offices / Hubs"] = {};
                            if (!updated["Platform Offices / Hubs"]["Service Centers"]) updated["Platform Offices / Hubs"]["Service Centers"] = [];
                            
                            data.supportConfig.serviceCenters.forEach((center: any) => {
                                if (center.name && !updated["Platform Offices / Hubs"]["Service Centers"].includes(center.name)) {
                                    updated["Platform Offices / Hubs"]["Service Centers"].push(center.name);
                                }
                            });
                            return updated;
                        });
                    }
                }
            })
            .catch(() => { });
    }, [user]);

    // Determine items to show
    let checkoutItems: { product: Product, price: number, quantity: number, isNegotiated?: boolean }[] = [];

    if (negotiationId) {
        // Buy Now / Negotiation Flow
        const negotiation = DEMO_NEGOTIATIONS.find(n => n.id === negotiationId);
        if (negotiation) {
            const negotiatedProduct = SEED_PRODUCTS.find(p => p.id === negotiation.product_id);
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
            price: item.negotiatedPrice || item.product.price,
            quantity: item.quantity,
            isNegotiated: !!item.negotiatedPrice
        }));
    }

    // Redirect if empty
    useEffect(() => {
        if (!negotiationId && cart.length === 0) {
            // router.push("/cart"); // Commented out to prevent flicker during dev if context loads late
        }
    }, [negotiationId, cart, router]);

    // Auto-clear shipping address error when user fills in fields
    useEffect(() => {
        if (addressError) setAddressError("");
    }, [address.firstName, address.lastName, address.email, address.phone, address.street, address.city, address.state, pickupDetails.state, pickupDetails.city, pickupDetails.station, deliveryMethod]);

    const subtotal = checkoutItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);

    // Global items logic: Apply 1.5x multiplier to bases if any product is globally sourced
    const hasGlobalProduct = checkoutItems.some(item => item.product.seller_id === "global-partners" || item.product.seller_name.toLowerCase().includes("global"));
    const hasVehicleItem = checkoutItems.some(item => isVehicle(item.product));
    
    // Calculate dynamic deposit for vehicles (admin-configurable)
    const vehicleDepositRate = getVehicleDepositPercent();
    const vehicleDepositPctDisplay = Math.round(vehicleDepositRate * 100);
    const carSubtotal = checkoutItems.reduce((acc, item) => isVehicle(item.product) ? acc + (item.price * item.quantity) : acc, 0);
    const carDeposit = Math.round(carSubtotal * vehicleDepositRate);
    const nonCarSubtotal = subtotal - carSubtotal;
    const itemsPayableNow = carDeposit + nonCarSubtotal;

    const shippingMultiplier = hasGlobalProduct ? 1.5 : 1;

    // Shipping Policy (GMC-compliant):
    // - FREE shipping for orders ≥ ₦50,000 (regardless of payment method)
    // - FREE shipping for online payments (Paystack/Transfer)
    // - FREE shipping for Premium users
    // - FREE shipping if a Free Shipping coupon is applied
    // - Price-based shipping for COD orders under ₦50,000
    const isFreeShippingDiscount = appliedCoupon?.reason === "Free Shipping discount";
    const isPremiumFreeDelivery = user?.isPremium;
    const isFreeShippingByOrderValue = subtotal >= 50000;
    // COD orders ALWAYS pay delivery fee (no free shipping for COD)
    const getBaseShipping = () => {
        const state = (deliveryMethod === "pickup" ? pickupDetails.state : address.state || "").toLowerCase();
        
        // Premium localized pricing per user request
        if (state.includes("lagos")) return 3350;
        if (state.includes("abuja") || state.includes("fct")) return 5750;
        
        // Fallback to defaults if no state match
        return deliveryMethod === "pickup" ? 2500 : 4000;
    };

    const baseFee = getBaseShipping();
    const shipping = (paymentMethod !== "cod" && (paymentMethod === "paystack" || paymentMethod === "transfer" || isPremiumFreeDelivery || isFreeShippingDiscount || isFreeShippingByOrderValue)) ? 0 : (
        Math.round((baseFee * shippingMultiplier) / 50) * 50
    );

    // Dynamic Tiered Escrow Fee Calculation (Apple-level logic)
    const escrowFee = (paymentMethod === "paystack" || paymentMethod === "transfer") 
        ? calculateTieredEscrowFee(subtotal) 
        : 0;

    const productSavings = checkoutItems.reduce((acc, item) => {
        const orig = item.product.original_price || item.product.recommended_price || (item.isNegotiated ? item.product.price : 0);
        if (orig && orig > item.price) {
            const actualSave = orig - item.price;
            return acc + (actualSave * item.quantity);
        }
        return acc;
    }, 0);

    const deliverySavings = shipping === 0 ? (deliveryMethod === "pickup" ? Math.round(basePickupFee * shippingMultiplier) : Math.round(baseDoorFee * shippingMultiplier)) : 0;
    const totalSavings = productSavings + deliverySavings + (appliedCoupon?.amount || 0);

    const total = Math.max(0, itemsPayableNow + shipping + escrowFee - (appliedCoupon?.amount || 0));

    // COD eligibility: admin-configurable threshold + expensive category override
    const EXPENSIVE_CATEGORIES = ["cars", "automotive", "vehicles"];
    const hasExpensiveCategoryItem = checkoutItems.some(item =>
        EXPENSIVE_CATEGORIES.some(cat => (item.product.category || "").toLowerCase().includes(cat))
    );
    const canPayOnDelivery = codEnabled && !hasVehicleItem && (
        // Local products: standard COD rules
        (!hasGlobalProduct && (total <= codThreshold || (codAllowExpensiveCategories && hasExpensiveCategoryItem))) ||
        // Global products: only if global COD is enabled & within global threshold
        (hasGlobalProduct && codGlobalEnabled && total <= codGlobalThreshold)
    );

    // Save address to localStorage
    const saveCurrentAddress = () => {
        const newAddr: SavedAddress = {
            id: `addr_${Date.now()}`,
            label: `${address.firstName}'s Address – ${deliveryMethod === 'pickup' ? pickupDetails.station : address.city}`,
            firstName: address.firstName,
            lastName: address.lastName,
            phone: address.phone,
            email: address.email || user?.email || "",
            street: address.street,
            city: address.city,
            state: deliveryMethod === "pickup" ? pickupDetails.state : address.state,
            station: pickupDetails.station,
            method: deliveryMethod,
            whatsappPhone: showWhatsappField ? whatsappPhone : undefined
        };
        // Avoid duplicates by matching street + city + method (case-insensitive and trimmed)
        const normalize = (str?: string) => (str || "").trim().toLowerCase();
        const existing = savedAddresses.filter(a => !(
            a.method === newAddr.method &&
            normalize(a.street) === normalize(newAddr.street) &&
            normalize(a.city) === normalize(newAddr.city)
        ));
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
            email: addr.email || prev.email,
            street: addr.street,
            city: addr.city
        }));
        setDeliveryMethod(addr.method || "doorstep");
        if (addr.method === "pickup") {
            setPickupDetails({
                state: addr.state || "",
                city: addr.city || "",
                station: addr.station || ""
            });
        }
        if (addr.whatsappPhone) {
            setShowWhatsappField(true);
            setWhatsappPhone(addr.whatsappPhone);
        } else {
            setShowWhatsappField(false);
            setWhatsappPhone("");
        }
        setShowAddressPicker(false);
        setIsEditingAddress(false);
    };

    const deleteSavedAddress = (id: string) => {
        const updated = savedAddresses.filter(a => a.id !== id);
        setSavedAddresses(updated);
        persistAddresses(updated);
    };

    const scrollToShippingAddress = () => {
        setCheckoutStep(1);
        setIsEditingAddress(true);
        setTimeout(() => {
            shippingAddressRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    };

    const handlePlaceOrder = () => {
        const email = user?.email || address.email;
        if (!address.firstName.trim() || !email.trim()) {
            setAddressError(user ? "Please enter your first name." : "Please enter your name and email address.");
            scrollToShippingAddress();
            return;
        }
        if (!address.phone.trim()) {
            setAddressError("Please enter your phone number.");
            scrollToShippingAddress();
            return;
        }
        const cleanPhone = address.phone.replace(/\D/g, '');
        if (cleanPhone.length < 10 || cleanPhone.length > 11) {
            setAddressError("Please enter a valid 10-11 digit phone number.");
            scrollToShippingAddress();
            return;
        }
        if (deliveryMethod === "doorstep") {
            if (!address.street.trim()) {
                setAddressError("Please enter your street address.");
                scrollToShippingAddress();
                return;
            }
            if (!pickupDetails.state) {
                setAddressError("Please select your state.");
                scrollToShippingAddress();
                return;
            }
            if (!address.city.trim()) {
                setAddressError("Please select your city / area.");
                scrollToShippingAddress();
                return;
            }
        }
        if (deliveryMethod === "pickup" && (!pickupDetails.state || !pickupDetails.city || !pickupDetails.station)) {
            setAddressError("Please select a valid pickup station.");
            scrollToShippingAddress();
            return;
        }
        setAddressError("");

        // Auto-save this address for next time
        if ((deliveryMethod === "doorstep" && address.street.trim()) || (deliveryMethod === "pickup" && pickupDetails.station)) {
            saveCurrentAddress();
        }

        // Payment routing
        if (paymentMethod === "cod") {
            // Pay on delivery — skip Paystack, go straight to order confirmation
            finalizeOrder("COD-" + Date.now());
        } else {
            // Both card and transfer go through Paystack
            setShowPaystack(true);
        }
    };

    const finalizeOrder = (_reference?: string) => {
        setShowPaystack(false);
        setIsProcessing(true);
        playDingSound(); // Play the sweet glass chime on successful order initiation/finalization
        setTimeout(() => {
            // Create and save the order(s)
            // Use the provided email as the user_id if not logged in
            const orderUserId = user?.email || address.email;
            const fullName = `${address.firstName} ${address.lastName}`.trim();

            const createdOrders: any[] = [];
            checkoutItems.forEach(item => {
                // Calculate financing details for vehicle products
                const isVehicleProduct = isVehicle(item.product);
                const vehicleDeposit = isVehicleProduct ? Math.round(item.price * item.quantity * 0.15) : 0;
                const loanCalc = isVehicleProduct ? calculateMonthlyPayment(item.price * item.quantity, 'bnpl', 'foreign_used') : null;

                const newOrder = DataSyncService.addOrder({
                    product_id: item.product.id,
                    customer_id: orderUserId,
                    customer_name: fullName || address.firstName || "Customer",
                    customer_email: user?.email || address.email,
                    seller_id: item.product.seller_id,
                    seller_name: item.product.seller_name,
                    amount: isVehicleProduct ? vehicleDeposit : item.price * item.quantity,
                    status: "pending",
                    escrow_status: "held",
                    shipping_address: deliveryMethod === "pickup"
                        ? `${fullName}, Pickup at: ${pickupDetails.station}, ${pickupDetails.city}, ${pickupDetails.state}`
                        : `${fullName}, ${address.street}, ${address.city}`,
                    delivery_method: deliveryMethod,
                    customer_phone: `${countryCode} ${address.phone}`,
                    customer_whatsapp: showWhatsappField ? `${whatsappCountryCode} ${whatsappPhone}` : undefined,
                    discount_id: appliedCoupon?.id,
                    // Attach full financing breakdown for vehicle orders
                    ...(isVehicleProduct && loanCalc ? {
                        financing: {
                            is_vehicle_loan: true,
                            vehicle_price: item.price * item.quantity,
                            deposit_paid: vehicleDeposit,
                            loan_balance: (item.price * item.quantity) - vehicleDeposit,
                            monthly_payment: loanCalc.monthlyPayment,
                            tenor_months: loanCalc.tenorMonths,
                            interest_rate: loanCalc.interestRate,
                            total_repayment: loanCalc.totalAmount,
                            condition: 'foreign_used',
                            loan_type: 'bnpl',
                        }
                    } : {})
                }, item.product);
                createdOrders.push({ order: newOrder, product: item.product, item });
            });

            if (negotiationId) {
                // Mark negotiation as purchased to clear notification
                DataSyncService.updateNegotiationStatus(negotiationId, "purchased");
            } else {
                clearCart();
            }

            if (appliedCoupon && user) {
                DataSyncService.useCoupon(appliedCoupon.code, user.id);
            }

            // ─── Referral Rewards Dispensation ───
            const refCode = localStorage.getItem("fp_referral");
            if (refCode && typeof window !== "undefined") {
                try {
                    const referrerId = atob(refCode);
                    // Prevent self-referral abuse and null IDs
                    if (referrerId && referrerId !== user?.id) {
                        DataSyncService.addCoupon({
                            amount: 5000,
                            userId: referrerId,
                            issuedBy: "referral",
                            reason: `Referral bonus unlocked! Assigned for new purchase by ${fullName || orderUserId}.`,
                            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // Extends 30 Days
                        });
                        // Remove hook to prevent infinite coupon payouts on subsequent orders
                        localStorage.removeItem("fp_referral");
                    }
                } catch (e) {
                    console.error("Failed to decode referral payload mapping", e);
                }
            }

            // Dispatch event to update navbar/orders page immediately
            window.dispatchEvent(new Event("storage"));

            // Set up concierge for the first item
            if (checkoutItems.length > 0) {
                setConciergeProduct(checkoutItems[0].product);
                if (createdOrders.length > 0) {
                    setConciergeOrderId(createdOrders[0].order.id);
                }
            }

            if (!user) {
                // Auto-create an account for the guest and log them in
                const guestId = "usr_" + Date.now();
                const guestUser = {
                    id: guestId,
                    email: address.email,
                    name: fullName || "Guest User",
                    role: "customer" as const,
                    created_at: new Date().toISOString()
                };
                login(guestUser);
                setIsGuestCheckout(true);

                // Sync guest user to DB with a default password so they can log in later if they skip (though we'll force setup)
                fetch("/api/users", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        id: guestId,
                        email: address.email,
                        name: fullName || "Guest User",
                        role: "customer",
                        password: "fairprice123", // Default password — user will be prompted to change
                        phone: `${countryCode} ${address.phone}`,
                        whatsapp: showWhatsappField ? `${whatsappCountryCode} ${whatsappPhone}` : undefined,
                        address: deliveryMethod === "doorstep"
                            ? `${address.street}, ${address.city}`
                            : `Pickup: ${pickupDetails.station}, ${pickupDetails.city}, ${pickupDetails.state}`
                    })
                }).catch(console.error);
            }
            // Show concierge before redirect
            setShowConcierge(true);

            // Don't auto-redirect — let the concierge close trigger the redirect (via handleConciergeClose)
            // The redirect happens in handleConciergeClose after optional push notification prompt
            if (user?.email || address.email) {
                const targetEmail = user?.email || address.email;
                const firstOrder = createdOrders[0];
                const realOrderId = firstOrder?.order?.id || "PENDING";
                fetch("/api/email", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        to: targetEmail,
                        type: "ORDER_PLACED",
                        payload: {
                            name: address.firstName || "Customer",
                            orderId: realOrderId,
                            productName: checkoutItems.length > 1 ? `${checkoutItems[0].product.name} +${checkoutItems.length - 1} more` : checkoutItems[0].product.name,
                            amount: checkoutItems.reduce((acc, item) => acc + (item.price * item.quantity), 0),
                            trackingUrl: `https://fairprice.ng/account/orders`
                        }
                    })
                }).catch(console.error);
            }

            // Fire off Order Alert Email & Notification to SELLER(s)
            const sellerGroups = new Map<string, { sellerEmail: string, sellerName: string, orders: typeof createdOrders }>();
            createdOrders.forEach(co => {
                const sellers = DataSyncService.getSellers();
                const seller = sellers.find(s => s.id === co.product.seller_id);
                
                if (seller) {
                    // Send In-App Dashboard Notification to Seller
                    DataSyncService.addNotification({
                        userId: seller.user_id || seller.id, // Notification targets the seller's user ID
                        type: "order",
                        message: `New Order Received! A customer just purchased ${co.product.name}.`,
                        link: "/seller/orders"
                    });

                    // Queue email for Seller
                    const sellerEmail = seller.owner_email || seller.user_id;
                    if (sellerEmail && sellerEmail.includes("@")) {
                        if (!sellerGroups.has(seller.id)) {
                            sellerGroups.set(seller.id, { sellerEmail: sellerEmail, sellerName: seller.business_name || "Seller", orders: [] });
                        }
                        sellerGroups.get(seller.id)!.orders.push(co);
                    }
                }
            });
            
            sellerGroups.forEach(({ sellerEmail, sellerName, orders: sellerOrders }) => {
                const firstSellerOrder = sellerOrders[0];
                const productNames = sellerOrders.map(o => o.product.name).join(", ");
                const totalAmount = sellerOrders.reduce((sum: number, o: any) => sum + o.order.amount, 0);
                fetch("/api/email", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        to: sellerEmail,
                        type: "SELLER_NEW_ORDER",
                        payload: {
                            name: sellerName,
                            orderId: firstSellerOrder.order.id,
                            productName: productNames,
                            amount: totalAmount,
                            trackingUrl: `https://fairprice.ng/seller/orders`
                        }
                    })
                }).catch(console.error);
            });
        }, 1500);
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            {/* Header */}
            <Navbar />

            <main className="flex-1 container mx-auto max-w-6xl px-4 py-30 flex flex-col lg:flex-row gap-8">

                {/* Left Column: Checkout steps */}
                <div className="flex-1 space-y-6">

                    {/* Step 1: Shipping Address */}
                    <section ref={shippingAddressRef} className={`bg-white rounded-2xl shadow-sm border ${addressError ? 'border-red-400 ring-1 ring-red-400' : checkoutStep === 1 ? 'border-brand-green-500 ring-1 ring-brand-green-500' : 'border-gray-100'} overflow-hidden transition-all duration-300`}>
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 cursor-pointer" onClick={() => { if (checkoutStep > 1) setCheckoutStep(1); }}>
                            <h2 className={`font-bold text-lg flex items-center gap-2 ${checkoutStep === 1 ? 'text-gray-900' : 'text-gray-500'}`}>
                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${checkoutStep === 1 ? 'bg-black text-white' : checkoutStep > 1 ? 'bg-brand-green-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                                    {checkoutStep > 1 ? <Check className="h-4 w-4" /> : '1'}
                                </span>
                                Shipping Address
                            </h2>
                            {addressError && (
                                <p className="text-sm text-red-500 font-semibold">Please enter your delivery address</p>
                            )}
                            {checkoutStep > 1 && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); setCheckoutStep(1); }}
                                    className="text-xs font-bold text-blue-600 hover:text-brand-orange"
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
                                            className="w-full flex items-center justify-between p-3 rounded-xl border border-dashed border-gray-300 hover:border-brand-orange/50 text-sm text-gray-600 hover:text-gray-900 transition-colors"
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
                                                            <p className="text-xs text-gray-500">
                                                                {addr.method === "pickup" ? `Pickup: ${addr.station}, ${addr.city}` : `${addr.street}, ${addr.city}`} · {addr.phone}
                                                            </p>
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
                                        <div className="flex bg-gray-100 p-1 rounded-xl gap-1">
                                            <button
                                                onClick={() => setDeliveryMethod("doorstep")}
                                                className={`flex-1 flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 py-2 text-[11px] sm:text-sm font-bold rounded-lg transition-all ${deliveryMethod === "doorstep" ? 'bg-white shadow-sm text-brand-green-600' : 'text-gray-500 hover:text-gray-900'}`}
                                            >
                                                <div className="flex items-center gap-1"><Truck className="h-4 w-4 shrink-0" /> <span>Door Delivery</span></div>
                                                <span className="font-medium opacity-80 whitespace-nowrap">({formatPrice(Math.round(baseDoorFee * shippingMultiplier))})</span>
                                            </button>
                                            <button
                                                onClick={() => setDeliveryMethod("pickup")}
                                                className={`flex-1 flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 py-2 text-[11px] sm:text-sm font-bold rounded-lg transition-all ${deliveryMethod === "pickup" ? 'bg-white shadow-sm text-brand-green-600' : 'text-gray-500 hover:text-gray-900'}`}
                                            >
                                                <div className="flex items-center gap-1"><MapPin className="h-4 w-4 shrink-0" /> <span>Pickup Station</span></div>
                                                <span className="font-medium opacity-80 whitespace-nowrap">({formatPrice(Math.round(basePickupFee * shippingMultiplier))})</span>
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold uppercase text-gray-400">First Name</label>
                                                <Input
                                                    value={address.firstName}
                                                    onChange={e => setAddress({ ...address, firstName: e.target.value })}
                                                    placeholder="Enter first name"
                                                    className="rounded-xl border-gray-300 bg-white focus:border-brand-orange/50 focus:ring-brand-orange/20"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold uppercase text-gray-400">Last Name</label>
                                                <Input
                                                    value={address.lastName}
                                                    onChange={e => setAddress({ ...address, lastName: e.target.value })}
                                                    placeholder="Enter last name"
                                                    className="rounded-xl border-gray-300 bg-white focus:border-brand-orange/50 focus:ring-brand-orange/20"
                                                />
                                            </div>
                                        </div>
                                        {/* Only show email for guest users */}
                                        {!user && (
                                            <div className="space-y-1 relative">
                                                <label className="text-xs font-bold uppercase text-gray-400">Email Address</label>
                                                <Input
                                                    type="email"
                                                    value={address.email}
                                                    onChange={e => handleEmailChange(e.target.value)}
                                                    onFocus={() => { if (emailSuggestions.length > 0) setShowEmailDropdown(true); }}
                                                    onBlur={() => setTimeout(() => setShowEmailDropdown(false), 200)}
                                                    placeholder="your@email.com"
                                                    autoComplete="off"
                                                    className="rounded-xl border-gray-300 bg-white focus:border-brand-orange/50 focus:ring-brand-orange/20"
                                                />
                                                {/* Email domain autocomplete */}
                                                {showEmailDropdown && emailSuggestions.length > 0 && (
                                                    <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden">
                                                        {emailSuggestions.map((suggestion, i) => (
                                                            <button
                                                                key={i}
                                                                type="button"
                                                                onMouseDown={(e) => e.preventDefault()}
                                                                onClick={() => {
                                                                    setAddress({ ...address, email: suggestion });
                                                                    setShowEmailDropdown(false);
                                                                    setEmailSuggestions([]);
                                                                }}
                                                                className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors flex items-center gap-2 font-medium"
                                                            >
                                                                <span className="text-gray-400 text-xs">📧</span>
                                                                {suggestion}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
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
                                            <div className="flex gap-2">
                                                {/* Country Code Dropdown */}
                                                <div className="relative">
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                                                        className="h-10 px-3 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 flex items-center gap-1.5 text-sm font-medium text-gray-700 transition-colors min-w-[90px]"
                                                    >
                                                        <span>{COUNTRY_CODES.find(c => c.code === countryCode)?.flag || "🌍"}</span>
                                                        <span className="font-semibold">{countryCode}</span>
                                                        <svg className="h-3 w-3 text-gray-400 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                                                    </button>
                                                    {showCountryDropdown && (
                                                        <div className="absolute z-50 top-full left-0 mt-1 w-56 bg-white rounded-xl border border-gray-200 shadow-xl max-h-52 overflow-y-auto">
                                                            {COUNTRY_CODES.map(c => (
                                                                <button
                                                                    key={c.code}
                                                                    type="button"
                                                                    onClick={() => { setCountryCode(c.code); setShowCountryDropdown(false); }}
                                                                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-emerald-50 transition-colors ${countryCode === c.code ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-gray-700'}`}
                                                                >
                                                                    <span className="text-base">{c.flag}</span>
                                                                    <span className="flex-1 text-left font-medium">{c.country}</span>
                                                                    <span className="text-gray-400 text-xs font-mono">{c.code}</span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                                <Input
                                                    value={address.phone}
                                                    onChange={e => setAddress({ ...address, phone: e.target.value })}
                                                    placeholder="xxx xxx xxxx"
                                                    required
                                                    className="flex-1 rounded-xl border-gray-300 bg-white focus:border-brand-orange/50 focus:ring-brand-orange/20"
                                                />
                                            </div>
                                        </div>

                                        {/* WhatsApp Toggle */}
                                        <div className="space-y-2">
                                            <label className="flex items-center gap-3 cursor-pointer group">
                                                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${showWhatsappField ? 'bg-emerald-600 border-emerald-600' : 'border-gray-300 group-hover:border-emerald-400'}`}>
                                                    {showWhatsappField && <Check className="h-3 w-3 text-white" />}
                                                    <input suppressHydrationWarning type="checkbox" className="hidden" checked={showWhatsappField} onChange={() => setShowWhatsappField(!showWhatsappField)} />
                                                </div>
                                                <span className="text-xs font-medium text-gray-600 flex items-center gap-1.5">
                                                    <svg className="h-4 w-4 text-green-500" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                                                    My WhatsApp number is different
                                                </span>
                                            </label>
                                            {showWhatsappField && (
                                                <div className="flex gap-2 pl-8">
                                                    <div className="relative">
                                                        <button
                                                            type="button"
                                                            onClick={() => { }}
                                                            className="h-10 px-3 rounded-xl border border-gray-300 bg-white flex items-center gap-1.5 text-sm font-medium text-gray-700 min-w-[90px]"
                                                        >
                                                            <span>{COUNTRY_CODES.find(c => c.code === whatsappCountryCode)?.flag || "🌍"}</span>
                                                            <span className="font-semibold">{whatsappCountryCode}</span>
                                                        </button>
                                                    </div>
                                                    <Input
                                                        value={whatsappPhone}
                                                        onChange={e => setWhatsappPhone(e.target.value)}
                                                        placeholder="WhatsApp number"
                                                        className="flex-1 rounded-xl border-gray-300 bg-white focus:border-green-400 focus:ring-green-200"
                                                    />
                                                </div>
                                            )}
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
                                                        className="rounded-xl border-gray-300 bg-white focus:border-brand-orange/50 focus:ring-brand-orange/20"
                                                    />
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="space-y-1">
                                                        <label className="text-xs font-bold uppercase text-gray-400">State <span className="text-red-400">*</span></label>
                                                        <div className="relative">
                                                            <select suppressHydrationWarning
                                                                className="w-full appearance-none rounded-2xl border border-gray-200 bg-gray-50/80 backdrop-blur-sm text-sm h-12 pl-4 pr-10 text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 hover:border-gray-300 transition-all cursor-pointer"
                                                                value={address.state || ""}
                                                                required
                                                                onChange={e => {
                                                                    const newState = e.target.value;
                                                                    const firstCity = Object.keys(PICKUP_STATIONS[newState] || {})[0] || "";
                                                                    setAddress({ ...address, state: newState, city: firstCity || address.city });
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
                                                            <select suppressHydrationWarning
                                                                className="w-full appearance-none rounded-2xl border border-gray-200 bg-gray-50/80 backdrop-blur-sm text-sm h-12 pl-4 pr-10 text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 hover:border-gray-300 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                                                value={address.city}
                                                                onChange={e => setAddress({ ...address, city: e.target.value })}
                                                                disabled={!address.state}
                                                                required
                                                            >
                                                                <option value="" disabled>Select City</option>
                                                                {address.state && PICKUP_STATIONS[address.state] && Object.keys(PICKUP_STATIONS[address.state]).map(city => (
                                                                    <option key={city} value={city}>{city}</option>
                                                                ))}
                                                            </select>
                                                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                                                                <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Nearest Landmark — helps delivery rider */}
                                                {pickupDetails.state && address.city && dynamicPickups[pickupDetails.state]?.[address.city] && (
                                                    <div className="space-y-1">
                                                        <label className="text-xs font-bold uppercase text-gray-400">Nearest Landmark <span className="text-gray-300 normal-case">(helps our rider find you faster)</span></label>
                                                        <div className="relative">
                                                            <select suppressHydrationWarning
                                                                className="w-full appearance-none rounded-2xl border border-gray-200 bg-gray-50/80 backdrop-blur-sm text-sm h-12 pl-4 pr-10 text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 hover:border-gray-300 transition-all cursor-pointer"
                                                                value={pickupDetails.station || ""}
                                                                onChange={e => setPickupDetails({ ...pickupDetails, station: e.target.value })}
                                                            >
                                                                <option value="">Select nearest landmark (optional)</option>
                                                                {(dynamicPickups[pickupDetails.state]?.[address.city] || []).map(landmark => (
                                                                    <option key={landmark} value={landmark}>{landmark}</option>
                                                                ))}
                                                            </select>
                                                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                                                                <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="space-y-4 bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="space-y-1">
                                                        <label className="text-xs font-bold uppercase text-emerald-700">State <span className="text-red-400">*</span></label>
                                                        <div className="relative">
                                                            <select suppressHydrationWarning
                                                                className="w-full appearance-none rounded-2xl border border-emerald-200 bg-white backdrop-blur-sm text-sm h-12 pl-4 pr-10 text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 hover:border-emerald-300 transition-all cursor-pointer"
                                                                value={pickupDetails.state}
                                                                required
                                                                onChange={e => setPickupDetails({ state: e.target.value, city: "", station: "" })}
                                                            >
                                                                <option value="" disabled>Select State</option>
                                                                {Object.keys(dynamicPickups).map(state => (
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
                                                            <select suppressHydrationWarning
                                                                className="w-full appearance-none rounded-2xl border border-emerald-200 bg-white backdrop-blur-sm text-sm h-12 pl-4 pr-10 text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 hover:border-emerald-300 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                                                value={pickupDetails.city}
                                                                onChange={e => setPickupDetails({ ...pickupDetails, city: e.target.value, station: "" })}
                                                                disabled={!pickupDetails.state}
                                                                required
                                                            >
                                                                <option value="" disabled>Select City</option>
                                                                {pickupDetails.state && dynamicPickups[pickupDetails.state] && Object.keys(dynamicPickups[pickupDetails.state]).map(city => (
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
                                                        <select suppressHydrationWarning
                                                            className="w-full appearance-none rounded-2xl border border-emerald-200 bg-white backdrop-blur-sm text-sm h-12 pl-4 pr-10 text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 hover:border-emerald-300 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                                            value={pickupDetails.station}
                                                            onChange={e => setPickupDetails({ ...pickupDetails, station: e.target.value })}
                                                            disabled={!pickupDetails.city}
                                                            required
                                                        >
                                                            <option value="" disabled>Select a Station</option>
                                                            {pickupDetails.city && dynamicPickups[pickupDetails.state]?.[pickupDetails.city] && dynamicPickups[pickupDetails.state][pickupDetails.city].map(station => (
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
                                                    const cleanPhone = address.phone.replace(/\D/g, '');
                                                    if (cleanPhone.length < 10 || cleanPhone.length > 11) {
                                                        setAddressError("Please enter a valid 10-11 digit phone number.");
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
                                                    if ((deliveryMethod === "doorstep" && address.street.trim()) || (deliveryMethod === "pickup" && pickupDetails.station)) {
                                                        saveCurrentAddress();
                                                    }
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
                                                {deliveryMethod === "pickup" ? <MapPin className="h-5 w-5 text-brand-green-600" /> : <Truck className="h-5 w-5 text-gray-400" />}
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-900">{address.firstName} {address.lastName}</p>
                                                {deliveryMethod === "doorstep" ? (
                                                    <p className="text-sm text-gray-500 mt-1">{address.street}{address.street && ", "}{address.city}</p>
                                                ) : (
                                                    <p className="text-sm text-gray-500 mt-1">
                                                        <span className="font-bold text-brand-green-600">Pickup Station:</span> {pickupDetails.station}, {pickupDetails.city}, {pickupDetails.state}
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
                                                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${createAccount ? "bg-brand-green-600 border-brand-green-600" : "border-gray-300 group-hover:border-brand-green-600"}`}>
                                                        {createAccount && <Check className="h-3 w-3 text-white" />}
                                                        <input suppressHydrationWarning
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
                                                className="w-full md:w-auto bg-brand-green-600 hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 text-white rounded-xl font-bold px-8"
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
                    <section className={`bg-white rounded-2xl shadow-sm border ${checkoutStep === 2 ? 'border-brand-green-500 ring-1 ring-brand-green-500' : 'border-gray-100'} overflow-hidden transition-all duration-300`}>
                        <div className={`p-6 border-b border-gray-100 flex justify-between items-center ${checkoutStep === 2 ? 'bg-gray-50/50' : 'bg-gray-50/30'}`} onClick={() => checkoutStep > 2 ? setCheckoutStep(2) : checkoutStep === 1 && address.street.trim() && setCheckoutStep(2)}>
                            <h2 className={`font-bold text-lg flex items-center gap-2 ${checkoutStep === 2 ? 'text-gray-900' : 'text-gray-400'}`}>
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${checkoutStep === 2 ? 'bg-black text-white' : checkoutStep > 2 ? 'bg-brand-green-600 text-white' : 'bg-gray-200 text-gray-400'}`}>
                                    {checkoutStep > 2 ? <Check className="h-4 w-4" /> : '2'}
                                </div>
                                Payment Method
                            </h2>
                            {checkoutStep > 2 && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); setCheckoutStep(2); }}
                                    className="text-xs font-bold text-blue-600 hover:text-brand-orange"
                                >
                                    CHANGE
                                </button>
                            )}
                        </div>

                        {checkoutStep === 2 && (
                            <div className="p-6 space-y-3">
                                {/* Paystack (Card Payment) */}
                                <label className={`flex items-center gap-4 p-4 border rounded-xl cursor-pointer transition-all ${paymentMethod === 'paystack' ? 'border-brand-orange/50 bg-orange-50/50' : 'border-gray-200 hover:border-gray-300'}`}>
                                    <input suppressHydrationWarning type="radio" name="payment" checked={paymentMethod === 'paystack'} onChange={() => setPaymentMethod('paystack')} className="h-5 w-5 text-brand-orange focus:ring-brand-orange" />
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <span className="font-bold text-gray-900">Pay with Card</span>
                                            <div className="flex items-center gap-1.5 ml-1">
                                                {/* Mastercard SVG */}
                                                <svg className="w-6 h-4" viewBox="0 0 36 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <circle cx="12" cy="12" r="12" fill="#EB001B"/>
                                                    <circle cx="24" cy="12" r="12" fill="#F79E1B"/>
                                                    <path d="M18 20.4853C20.6698 18.6702 22.5 15.5422 22.5 12C22.5 8.45778 20.6698 5.32982 18 3.51472C15.3302 5.32982 13.5 8.45778 13.5 12C13.5 15.5422 15.3302 18.6702 18 20.4853Z" fill="#FF5F00"/>
                                                </svg>
                                                {/* Visa SVG */}
                                                <svg className="w-8 h-4 rounded-sm bg-blue-800 flex items-center justify-center px-1" viewBox="0 0 36 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M14.6548 0.625366L9.61334 11.3752H6.26257L3.95544 3.12565C3.81848 2.50285 3.65588 2.2155 3.19702 1.95679C2.42255 1.51737 1.15112 1.0504 0 0.825226V0.625366H5.21045C5.86792 0.625366 6.45288 1.04543 6.61157 1.83186L7.91528 8.63229L11.3533 0.625366H14.6548ZM26.3779 7.64716C26.3989 4.79374 22.464 4.6346 22.4854 3.32832C22.4922 2.92345 22.8804 2.49352 23.7549 2.37895C24.1956 2.3168 25.4377 2.27453 26.4302 2.73463L27.0176 0.111816C26.4819 0.00976562 25.5459 0 24.4379 0C21.4324 0 19.4175 1.54719 19.3958 3.75087C19.3765 5.37839 20.9163 6.28822 22.072 6.83763C23.2644 7.40445 23.6655 7.765 23.6624 8.27211C23.6565 9.04753 22.6953 9.39558 21.8491 9.39558C20.3013 9.39558 19.4121 8.98036 18.7842 8.68205L18.1729 11.3653C18.7905 11.6462 20.071 11.875 21.4019 11.875C24.5886 11.875 26.3572 10.3343 26.3779 7.64716ZM34.2144 11.3752H37.0503L34.1866 0.625366H31.5496C30.9824 0.625366 30.5093 0.94101 30.292 1.45564L25.8601 11.3752H29.3093L29.9978 9.53535H34.2144V11.3752ZM30.9839 6.80531L32.656 2.36894L33.623 6.80531H30.9839ZM18.4233 11.3752L15.4243 0.625366H12.3552L15.3523 11.3752H18.4233Z" fill="white"/>
                                                </svg>
                                                {/* OPay Stylized Text */}
                                                <div className="h-4 px-1.5 flex items-center justify-center bg-emerald-500 rounded-sm">
                                                    <span className="text-[10px] font-black text-white italic tracking-tighter">OPay</span>
                                                </div>
                                            </div>
                                        </div>
                                        <p className="text-xs text-gray-500 flex items-center gap-1">
                                            <Lock className="h-3 w-3" /> Debit or credit card · Secured by Paystack
                                        </p>
                                        <p className="text-xs text-emerald-600 font-bold mt-1">FREE delivery when you pay online 🎉</p>
                                    </div>
                                </label>

                                {/* Pay with Transfer */}
                                <label className={`flex items-center gap-4 p-4 border rounded-xl cursor-pointer transition-all ${paymentMethod === 'transfer' ? 'border-blue-400 bg-blue-50/50' : 'border-gray-200 hover:border-gray-300'}`}>
                                    <input suppressHydrationWarning type="radio" name="payment" checked={paymentMethod === 'transfer'} onChange={() => setPaymentMethod('transfer')} className="h-5 w-5 text-blue-500 focus:ring-blue-500" />
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <span className="font-bold text-gray-900">Pay with Transfer</span>
                                            <Building className="h-4 w-4 text-blue-500" />
                                        </div>
                                        <p className="text-xs text-gray-500 flex items-center gap-1">
                                            <Lock className="h-3 w-3" /> Bank transfer via Paystack
                                        </p>
                                        <p className="text-xs text-emerald-600 font-bold mt-1">FREE delivery when you pay online 🎉</p>
                                    </div>
                                </label>

                                {/* Pay on Delivery */}
                                {canPayOnDelivery ? (
                                    <label className={`flex items-center gap-4 p-4 border rounded-xl cursor-pointer transition-all ${paymentMethod === 'cod' ? 'border-amber-400 bg-amber-50/50' : 'border-gray-200 hover:border-gray-300'}`}>
                                        <input suppressHydrationWarning type="radio" name="payment" checked={paymentMethod === 'cod'} onChange={() => setPaymentMethod('cod')} className="h-5 w-5 text-amber-500 focus:ring-amber-500" />
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <span className="font-bold text-gray-900">Pay on Delivery</span>
                                                <Truck className="h-4 w-4 text-amber-500" />
                                            </div>
                                            <p className="text-xs text-gray-500">Pay cash when your order arrives</p>
                                            <p className="text-xs text-amber-600 font-semibold mt-1">
                                                {(() => {
                                                    const codFee = deliveryMethod === 'pickup' ? Math.round(basePickupFee * shippingMultiplier) : Math.round(baseDoorFee * shippingMultiplier);
                                                    return codFee === 0 ? "FREE delivery" : `Delivery fee: ${formatPrice(codFee)} will be added`;
                                                })()}
                                            </p>
                                        </div>
                                    </label>
                                ) : (
                                    <div className="flex items-center gap-4 p-4 border border-gray-100 rounded-xl bg-gray-50/50 opacity-60">
                                        <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
                                        <div>
                                            <span className="font-bold text-gray-500">Pay on Delivery</span>
                                            <p className="text-xs text-gray-400">
                                                {!codEnabled
                                                    ? "Pay on Delivery is currently disabled"
                                                    : hasGlobalProduct
                                                        ? "Your order doesnt't qualify for this payment method"
                                                        : `Not available for orders above ₦${codThreshold.toLocaleString()}`}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                <DiscountSection
                                    availableCoupons={availableCoupons}
                                    appliedCoupon={appliedCoupon}
                                    subtotal={subtotal}
                                    userId={user?.id}
                                    onApplyCoupon={setAppliedCoupon}
                                />

                                <div className="mt-6 flex justify-end">
                                    <Button
                                        onClick={() => setCheckoutStep(3)}
                                        className="w-full md:w-auto bg-brand-green-600 hover:bg-emerald-600 text-white rounded-lg font-bold"
                                    >
                                        PROCEED TO SUMMARY
                                    </Button>
                                </div>
                            </div>
                        )}
                        {checkoutStep > 2 && (
                            <div className="px-6 py-4 flex items-center gap-4 bg-white opacity-80">
                                {paymentMethod === 'paystack' ? <CreditCard className="h-5 w-5 text-gray-400" /> : paymentMethod === 'transfer' ? <Building className="h-5 w-5 text-blue-500" /> : <Truck className="h-5 w-5 text-amber-500" />}
                                <div>
                                    <p className="text-sm font-bold text-gray-900">{paymentMethod === 'paystack' ? 'Pay with Card' : paymentMethod === 'transfer' ? 'Pay with Transfer' : 'Pay on Delivery'}</p>
                                    <p className={`text-xs font-medium ${paymentMethod === 'cod' ? 'text-amber-600' : 'text-green-600'}`}>
                                        {paymentMethod === 'paystack' ? 'Secured card payment · FREE delivery' : paymentMethod === 'transfer' ? 'Bank transfer via Paystack · FREE delivery' : `Delivery fee: ${formatPrice(shipping)}`}
                                    </p>
                                </div>
                            </div>
                        )}
                    </section>

                    {/* Step 3: Review Items */}
                    <section className={`bg-white rounded-2xl shadow-sm border ${checkoutStep === 3 ? 'border-brand-green-500 ring-1 ring-brand-green-500' : 'border-gray-100'} overflow-hidden transition-all duration-300`}>
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
                                                            className="w-20 h-20 bg-white rounded-xl border border-gray-100 shrink-0 p-2 cursor-pointer hover:border-emerald-300 transition-colors flex items-center justify-center overflow-hidden"
                                                        >
                                                            <img
                                                                src={item.product.image_url || "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=200&q=80"}
                                                                className="w-full h-full object-contain transition-transform group-hover/item:scale-105"
                                                                alt={item.product.name}
                                                                onError={e => {
                                                                    e.currentTarget.src = "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=200&q=80";
                                                                }}
                                                            />
                                                        </button>
                                                        <div className="flex-1">
                                                            <div className="flex justify-between items-start">
                                                                <div
                                                                    className="cursor-pointer group-hover/item:text-emerald-700 transition-colors"
                                                                    onClick={(e) => { e.preventDefault(); setPreviewProduct(item.product); }}
                                                                >
                                                                    <h3 className="font-bold text-gray-900 line-clamp-1 group-hover/item:text-emerald-600 transition-colors">{item.product.name}</h3>
                                                                    <div className="flex items-center gap-2 mt-1">
                                                                        <span className="font-bold text-brand-green-600">{formatPrice(item.price)}</span>
                                                                        {item.isNegotiated && (
                                                                            <span className="text-[10px] bg-brand-green-100 text-brand-green-700 px-1.5 py-0.5 rounded font-bold flex items-center gap-1">
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
                <div className="w-full lg:w-96">
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
                                <div key={i} className="flex items-center gap-3 group">
                                    <div className="w-12 h-12 bg-white rounded-lg border border-gray-100 p-1 shrink-0 overflow-hidden flex items-center justify-center">
                                        <img
                                            src={item.product.image_url || "/assets/images/placeholder.png"}
                                            alt={item.product.name}
                                            className="w-full h-full object-contain"
                                            onError={e => {
                                                e.currentTarget.src = "/assets/images/placeholder.png";
                                            }}
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium text-gray-700 line-clamp-1">{item.product.name}</p>
                                        <p className="text-xs text-gray-500">Qty: {item.quantity} × {formatPrice(item.price)}</p>
                                    </div>
                                    <button 
                                        onClick={() => {
                                            if (negotiationId) {
                                                router.push("/cart");
                                            } else {
                                                removeFromCart(item.product.id);
                                            }
                                        }}
                                        className="p-1.5 bg-gray-100 hover:bg-red-50 text-gray-500 hover:text-red-600 rounded-full transition-colors shadow-sm"
                                        title="Remove item"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="space-y-3 text-sm lg:border-t border-gray-100 lg:pt-4">
                            <h3 className="font-bold text-lg mb-4 lg:hidden">Order Summary</h3>
                            <div className="flex justify-between text-gray-600">
                                <span>Item's total ({checkoutItems.reduce((a, b) => a + b.quantity, 0)}):</span>
                                <span className={cn("font-medium", hasVehicleItem && "line-through text-gray-400 opacity-50")}>{formatPrice(subtotal)}</span>
                            </div>

                            {hasVehicleItem && (
                                <div className="space-y-2 py-2 border-y border-dashed border-gray-100 animate-in fade-in slide-in-from-top-2">
                                    <div className="flex justify-between text-gray-900 font-bold">
                                        <span className="flex items-center gap-1.5">
                                            <Sparkles className="h-3.5 w-3.5 text-brand-orange animate-pulse" />
                                            Loan Deposit ({vehicleDepositPctDisplay}%):
                                        </span>
                                        <span>{formatPrice(carDeposit)}</span>
                                    </div>
                                    <div className="flex justify-between text-gray-500 text-[11px] leading-tight">
                                        <span>Pay {vehicleDepositPctDisplay}% now to secure your vehicle. Our agent will contact you for physical inspection and financing.</span>
                                    </div>
                                    {nonCarSubtotal > 0 && (
                                        <div className="flex justify-between text-gray-600 text-xs mt-1">
                                            <span>Other items:</span>
                                            <span>{formatPrice(nonCarSubtotal)}</span>
                                        </div>
                                    )}
                                </div>
                            )}
                            <div className="flex justify-between text-gray-600">
                                <span>Delivery fees:</span>
                                {shipping === 0 ? (
                                    <span className="font-bold text-emerald-600 flex items-center gap-1">
                                        FREE
                                        {user?.isPremium && subtotal >= 50000 && paymentMethod === 'cod' && <Crown className="h-3 w-3" />}
                                    </span>
                                ) : (
                                    <span className="font-medium">{formatPrice(shipping)}</span>
                                )}
                            </div>

                            {escrowFee > 0 && (
                                <div className="flex justify-between text-gray-600 animate-in fade-in slide-in-from-top-1">
                                    <span className="flex items-center gap-1.5">
                                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                                        Charges & Tax:
                                    </span>
                                    <span className="font-medium text-emerald-700">{formatPrice(escrowFee)}</span>
                                </div>
                            )}

                            {/* Interactive Order Savings Breakdown */}
                            {totalSavings > 0 ? (
                                <div className="space-y-2 mt-2">
                                    <button
                                        onClick={() => setShowSavingsBreakdown(!showSavingsBreakdown)}
                                        className={cn(
                                            "w-full flex flex-col bg-emerald-50/80 px-4 py-3 rounded-2xl border border-emerald-100 shadow-sm transition-all hover:bg-emerald-100/80 active:scale-[0.98] cursor-pointer text-left",
                                            showSavingsBreakdown && "rounded-b-none border-b-transparent shadow-none"
                                        )}
                                    >
                                        <div className="flex justify-between items-center mb-0.5">
                                            <span className="text-emerald-700 font-bold text-sm flex items-center gap-2">
                                                <Sparkles className="h-4 w-4 text-emerald-500 animate-pulse" />
                                                You Saved:
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <span className="font-black text-emerald-600 text-base">{formatPrice(totalSavings)}</span>
                                                <ChevronDown className={cn("h-4 w-4 text-emerald-500 transition-transform", showSavingsBreakdown && "rotate-180")} />
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-emerald-600/60 text-[10px] uppercase font-bold tracking-wider">Discounts & Delivery</span>
                                            <span className="text-emerald-500/80 text-[10px] font-bold italic">Tap to reveal breakdown</span>
                                        </div>
                                    </button>

                                    <AnimatePresence>
                                        {showSavingsBreakdown && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: "auto", opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="bg-emerald-50/50 -mt-2 pt-2 px-4 pb-4 rounded-b-2xl border-x border-b border-emerald-100 overflow-hidden"
                                            >
                                                <div className="space-y-3 pt-2">
                                                    {productSavings > 0 && (
                                                        <div className="flex justify-between items-center text-[13px]">
                                                            <div className="flex flex-col">
                                                                <span className="text-gray-500 font-medium">Market Difference</span>
                                                                <span className="text-[10px] text-gray-400 line-through">
                                                                    {formatPrice(checkoutItems.reduce((acc, item) => acc + ((item.product.original_price || item.product.recommended_price || item.price) * item.quantity), 0))}
                                                                </span>
                                                            </div>
                                                            <span className="font-bold text-emerald-600">-{formatPrice(productSavings)}</span>
                                                        </div>
                                                    )}
                                                    
                                                    {deliverySavings > 0 && (
                                                        <div className="flex justify-between items-center text-[13px]">
                                                            <div className="flex flex-col">
                                                                <span className="text-gray-500 font-medium">Free Delivery Promo</span>
                                                                <span className="text-[10px] text-gray-400 line-through">
                                                                    {formatPrice(deliveryMethod === "pickup" ? Math.round(basePickupFee * shippingMultiplier) : Math.round(baseDoorFee * shippingMultiplier))}
                                                                </span>
                                                            </div>
                                                            <span className="font-bold text-emerald-600">-{formatPrice(deliverySavings)}</span>
                                                        </div>
                                                    )}

                                                    {appliedCoupon && (
                                                        <div className="flex justify-between items-center text-[13px]">
                                                            <div className="flex flex-col">
                                                                <span className="text-gray-500 font-medium">Coupon ({appliedCoupon.code})</span>
                                                                <span className="text-[10px] text-gray-400">Promo Discount Applied</span>
                                                            </div>
                                                            <span className="font-bold text-emerald-600">-{formatPrice(appliedCoupon.amount)}</span>
                                                        </div>
                                                    )}

                                                    <div className="pt-2 border-t border-emerald-100/50 mt-2">
                                                        <p className="text-[10px] text-emerald-600/70 font-medium italic">
                                                            * Real-time savings verified by Price Intelligence Engine
                                                        </p>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            ) : null}

                            <div className="flex justify-between items-end border-t border-gray-200 pt-4 mt-2">
                                <div className="space-y-1">
                                    <span className="font-bold text-lg text-gray-900 block">Total:</span>
                                    {totalSavings > 0 && (
                                        <div className="flex flex-col gap-1">
                                            {appliedCoupon && (
                                                <span className="text-[10px] font-black text-brand-green-600 uppercase tracking-wider bg-brand-green-50 px-2 py-0.5 rounded border border-brand-green-100 w-fit">
                                                    Coupon: -₦{appliedCoupon.amount.toLocaleString()}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div className="text-right">
                                    {appliedCoupon && (
                                        <span className="text-sm text-gray-400 line-through mr-2 font-medium">
                                            {formatPrice(subtotal + shipping)}
                                        </span>
                                    )}
                                    <span className="font-black text-2xl text-gray-900">{formatPrice(total)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Mobile Sticky CTA */}
                        <div className="lg:hidden fixed bottom-[calc(64px+env(safe-area-inset-bottom))] left-0 right-0 p-4 bg-white border-t-2 border-slate-100 z-[90] shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
                            <div className="flex items-center justify-between mb-3 px-1">
                                <span className="font-bold text-gray-500 uppercase tracking-widest text-xs">Total</span>
                                <div className="flex flex-col items-end">
                                    <span className="font-black text-xl text-brand-orange">{formatPrice(total)}</span>
                                    {totalSavings > 0 && (
                                        <span className="text-[10px] font-black text-emerald-600 flex items-center gap-1">
                                            <Sparkles className="h-2.5 w-2.5" /> SAVED ₦{totalSavings.toLocaleString()}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <Button
                                size="lg"
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    handlePlaceOrder();
                                }}
                                disabled={isProcessing}
                                className="w-full rounded-xl bg-gradient-to-r from-brand-green-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-600 text-white font-black h-14 shadow-xl shadow-emerald-500/20 text-lg transition-all"
                            >
                                {isProcessing ? "Processing..." : "Confirm & Pay"}
                            </Button>
                        </div>
                    </div>
                </div>

            </main >

            {/* Global cross-sell at bottom of checkout */}
            {isClient && (
                <div className="container mx-auto max-w-6xl px-4 mt-6 mb-32">
                    <RecommendedProducts
                        products={DataSyncService.getApprovedProducts().slice(8, 16)}
                        title="Frequently Bought Together"
                        subtitle="Customers also added these items"
                    />
                    <div className="text-center mt-4">
                        {/* You May Also Like — more products from the same or related categories */}
                        {visibleProductsCount > 8 && (() => {
                            const youMayLike = DataSyncService.getApprovedProducts()
                                .filter(p => !checkoutItems.map(i => i.product.id).includes(p.id))
                                .sort(() => Math.random() - 0.5)
                                .slice(0, visibleProductsCount - 8);
                            if (youMayLike.length === 0) return null;
                            return (
                                <div className="mt-8 text-left mb-6">
                                    <h2 className="text-xl md:text-2xl font-extrabold tracking-tight text-gray-900 mb-6 flex items-center gap-2">
                                        You May Also Like
                                    </h2>
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                                        {youMayLike.map(product => (
                                            <div key={product.id}>
                                                <ProductCard product={product} className="h-full w-full" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })()}

                        {/* View More Button */}
                        <div className="flex flex-col items-center gap-8 mt-6">
                            <Button
                                variant="outline"
                                className="rounded-full justify-center items-center px-8 py-4 text-sm font-bold text-gray-700 hover:text-black hover:bg-gray-50 border-gray-200 hover:border-gray-300 shadow-sm transition-all"
                                onClick={() => {
                                    if (!loadedMore) {
                                        setLoadedMore(true);
                                    } else {
                                        setVisibleProductsCount(prev => prev + 8);
                                    }
                                }}
                            >
                                VIEW MORE <ChevronDown className="h-4 w-4 ml-2" />
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            <AnimatePresence>
                {showPaystack && (
                    <PaystackCheckout
                        amount={total * 100}
                        email={user?.email || address.email || "guest@example.com"}
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
                                            {previewProduct.seller_id === "global-store" ? <Globe className="h-4 w-4 text-blue-500" /> : <Package className="h-4 w-4 text-gray-400" />}
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

            {/* Post-Order Concierge Chat */}
            <PostOrderConciergeChat
                isOpen={showConcierge}
                onClose={() => {
                    setShowConcierge(false);
                    if (isGuestCheckout) {
                        setShowGuestPasswordSetup(true);
                    } else if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
                        setShowPushOptIn(true);
                    } else {
                        router.push("/account/orders?success=true");
                    }
                }}
                product={conciergeProduct}
                orderId={conciergeOrderId || undefined}
                mode="post_order"
            />

            {/* Guest Password Setup Modal */}
            <AnimatePresence>
                {showGuestPasswordSetup && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative z-10 w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden p-8 text-center border overflow-y-auto"
                        >
                            <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-5 border border-emerald-200 shadow-sm">
                                <Lock className="h-7 w-7 text-emerald-600" />
                            </div>
                            <h2 className="text-2xl font-black text-gray-900 mb-2">Secure Your Account</h2>
                            <p className="text-gray-500 mb-6 text-sm">
                                Your order was placed successfully! Please create a password to track this order and shop faster next time.
                            </p>
                            
                            <form 
                                onSubmit={async (e) => {
                                    e.preventDefault();
                                    setPasswordError("");
                                    if (!guestPassword || guestPassword.length < 6) {
                                        setPasswordError("Password must be at least 6 characters.");
                                        return;
                                    }
                                    setIsSettingPassword(true);
                                    try {
                                        const res = await fetch("/api/users", {
                                            method: "POST",
                                            headers: { "Content-Type": "application/json" },
                                            body: JSON.stringify({ email: address.email, password: guestPassword })
                                        });
                                        if (res.ok) {
                                            setShowGuestPasswordSetup(false);
                                            // Handle success route
                                            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
                                                setShowPushOptIn(true);
                                            } else {
                                                router.push("/account/orders?success=true");
                                            }
                                        } else {
                                            throw new Error("Failed to secure account");
                                        }
                                    } catch (err) {
                                        setPasswordError("Failed to set password. Try again later.");
                                    } finally {
                                        setIsSettingPassword(false);
                                    }
                                }}
                            >
                                {passwordError && (
                                    <div className="mb-4 text-sm font-medium text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">
                                        {passwordError}
                                    </div>
                                )}
                                <div className="mb-6 relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                    <Input 
                                        type="password"
                                        placeholder="Create a secure password"
                                        value={guestPassword}
                                        onChange={(e) => setGuestPassword(e.target.value)}
                                        className="pl-10 h-12 text-base font-medium rounded-xl border-gray-200 bg-gray-50 focus:border-brand-green-500 focus:ring-1 focus:ring-brand-green-500 shadow-inner"
                                        required
                                        minLength={6}
                                        disabled={isSettingPassword}
                                    />
                                </div>
                                
                                <Button 
                                    type="submit" 
                                    disabled={isSettingPassword} 
                                    className="w-full h-12 rounded-xl text-base font-bold bg-brand-green-600 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20"
                                >
                                    {isSettingPassword ? <span className="animate-spin mr-2">⏳</span> : null}
                                    Create Password & View Order
                                </Button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Push Notification Opt-In Modal */}
            <AnimatePresence>
                {showPushOptIn && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                            onClick={() => {
                                setShowPushOptIn(false);
                                router.push("/account/orders?success=true");
                            }}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative z-10 w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden"
                        >
                            <div className="p-8 text-center">
                                <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center mb-5 shadow-lg shadow-emerald-500/30">
                                    <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                    </svg>
                                </div>
                                <h3 className="text-xl font-black text-gray-900 mb-2">Stay Updated! 🔔</h3>
                                <p className="text-sm text-gray-500 leading-relaxed mb-6">
                                    Get instant notifications about your <strong>order status</strong>, <strong>delivery updates</strong>, and <strong>exclusive deals</strong>.
                                </p>
                                <div className="space-y-3">
                                    <Button
                                        onClick={async () => {
                                            try {
                                                const permission = await Notification.requestPermission();
                                                if (permission === 'granted') {
                                                    new Notification('FairPrice Notifications Enabled! 🎉', {
                                                        body: 'You will now receive order updates and deals.',
                                                        icon: '/favicon.ico'
                                                    });
                                                }
                                            } catch { /* ignore */ }
                                            setShowPushOptIn(false);
                                            router.push("/account/orders?success=true");
                                        }}
                                        className="w-full h-12 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 text-base"
                                    >
                                        Enable Notifications
                                    </Button>
                                    <button
                                        onClick={() => {
                                            setShowPushOptIn(false);
                                            router.push("/account/orders?success=true");
                                        }}
                                        className="w-full py-2.5 text-sm font-medium text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        Maybe Later
                                    </button>
                                </div>
                            </div>
                            <div className="px-6 py-3 bg-gray-50 border-t border-gray-100">
                                <p className="text-[10px] text-gray-400 text-center">
                                    You can change this anytime in your browser settings
                                </p>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div >
    );
}
