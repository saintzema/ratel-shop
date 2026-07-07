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
import { ChevronDown, Trash2, Plus, X, Globe, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { Check, Lock, ChevronRight, CreditCard, Tag, MapPin, Phone, Truck, Package, CheckCircle2, Crown, Building, Sparkles, QrCode } from "lucide-react";
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
import { CountryCodeSelect } from "@/components/ui/CountryCodeSelect";
import { COUNTRY_CODES } from "@/lib/constants/countries";
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

        // Intercept Cart Abandonment Coupon (SAVE2000)
        if (targetCode.toUpperCase() === "SAVE2000") {
            const mappedCoupon: Coupon = {
                id: "exit-intent-save2000",
                userId: "all",
                code: "SAVE2000",
                amount: 2000,
                reason: "Cart Abandonment Recovery",
                isUsed: false,
                issuedBy: "system",
                createdAt: new Date().toISOString(),
                expiresAt: new Date(Date.now() + 86400000).toISOString()
            };
            onApplyCoupon(mappedCoupon);
            setMsg(`Discount Applied: ₦2,000 OFF`);
            setShowDropdown(false);

            // Track coupon applied
            if (typeof window !== "undefined" && window.pendo) {
                window.pendo.track("coupon_applied", {
                    coupon_code: "SAVE2000",
                    discount_amount: 2000,
                    discount_type: "fixed",
                    coupon_source: "exit_intent",
                    cart_subtotal: subtotal,
                });
            }

            return;
        }

        // First check DataSyncService defined coupons
        const validCoupon = availableCoupons.find(c => c.code.toUpperCase() === targetCode.toUpperCase());

        if (validCoupon) {
            onApplyCoupon(validCoupon);
            setMsg(`Discount Applied: ₦${validCoupon.amount.toLocaleString()} OFF`);
            setShowDropdown(false);

            // Track coupon applied
            if (typeof window !== "undefined" && window.pendo) {
                window.pendo.track("coupon_applied", {
                    coupon_code: validCoupon.code,
                    discount_amount: validCoupon.amount,
                    discount_type: "fixed",
                    coupon_source: "local",
                    cart_subtotal: subtotal,
                });
            }

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

                // Track coupon applied
                if (typeof window !== "undefined" && window.pendo) {
                    window.pendo.track("coupon_applied", {
                        coupon_code: discount.code,
                        discount_amount: amountOff,
                        discount_type: discount.type || "fixed",
                        coupon_source: "api",
                        cart_subtotal: subtotal,
                    });
                }
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
    const { cart, cartTotal, removeFromCart, updateQuantity, clearCart, isLoaded: isCartLoaded } = useCart();
    const router = useRouter();
    const { user, login, updateUser } = useAuth();
    const [isClient, setIsClient] = useState(false);
    
    const searchParams = useSearchParams();
    const negotiationId = searchParams?.get("negotiation");
    
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

    const isDirectPaymentOnly = checkoutItems.length > 0 && checkoutItems.every(item => (item.product as any).is_direct_payment);

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
    const paymentSectionRef = useRef<HTMLElement>(null);

    const [isEditingAddress, setIsEditingAddress] = useState(true); // Default open for guests
    const [checkoutStep, setCheckoutStep] = useState<1 | 2 | 3>(1);
    const [guestId] = useState(() => "guest_" + Math.random().toString(36).substring(2, 11));

    useEffect(() => {
        // isDirectPaymentOnly depends on checkoutItems, which starts empty before cart/QR
        // data finishes hydrating from localStorage. If checkoutStep was already 3 at that
        // point (persisted state, or the QR fast-path effect), this ran with
        // isDirectPaymentOnly still evaluating false — scrolling to payment on a page the
        // customer just landed on, before they'd even seen what they were paying for.
        // Waiting on isCartLoaded closes that race.
        if (checkoutStep === 3 && !isDirectPaymentOnly && isCartLoaded) {
            setTimeout(() => {
                paymentSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 150);
        } else if (checkoutStep === 2 && isEditingAddress) {
            setTimeout(() => {
                shippingAddressRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 150);
        }
    }, [checkoutStep, isEditingAddress, isDirectPaymentOnly, isCartLoaded]);
    const [createAccount, setCreateAccount] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showPaystack, setShowPaystack] = useState(false);

    // ─── Smart Recommendations Logic ───────────────────────────
    const CROSS_SELL_MAP: Record<string, string[]> = {
        "solar": ["solar", "energy", "batteries", "industrial"],
        "energy": ["solar", "energy", "batteries"],
        "phones": ["electronics", "tablets", "smartwatch"],
        "computers": ["electronics", "office", "gaming"],
        "gaming": ["electronics", "computers", "gaming"],
        "cars": ["automotive", "industrial", "vehicles"],
        "automotive": ["cars", "industrial", "vehicles"],
        "fashion": ["bags", "women", "men", "jewelry", "beauty"],
        "beauty": ["fashion", "women", "jewelry"],
        "electronics": ["phones", "computers", "gaming", "tablets"],
        "appliances": ["home", "household", "energy"],
        "home": ["appliances", "household", "furniture", "garden"],
        "fitness": ["health", "sports"],
        "sports": ["fitness", "health", "fashion"],
    };

    const frequentlyBoughtTogether = useMemo(() => {
        if (!isClient) return [];
        
        const cartProductIds = checkoutItems.map(i => i.product.id);
        const cartCategories = checkoutItems.map(i => i.product.category);
        const cartNames = checkoutItems.map(i => i.product.name.toLowerCase());
        
        const targetCategories = new Set<string>();
        cartCategories.forEach(cat => {
            const related = CROSS_SELL_MAP[cat as string] || [];
            related.forEach(r => targetCategories.add(r));
            targetCategories.add(cat as string);
        });

        const allProducts = DataSyncService.getApprovedProducts();

        // Filter and prioritize
        let smartProducts = allProducts.filter(p => 
            !cartProductIds.includes(p.id) && 
            (targetCategories.has(p.category as string) || targetCategories.has("all"))
        );

        // Keyword-based refinement (e.g. Inverter -> Panel/Battery)
        const hasInverter = cartNames.some(n => n.includes("inverter"));
        const hasSolar = cartNames.some(n => n.includes("solar") || n.includes("panel"));
        const hasPhone = cartNames.some(n => n.includes("phone") || n.includes("iphone") || n.includes("samsung"));
        
        if (hasInverter && !hasSolar) {
            smartProducts.sort((a, b) => {
                const aRel = a.name.toLowerCase().includes("panel") || a.name.toLowerCase().includes("battery") ? 1 : 0;
                const bRel = b.name.toLowerCase().includes("panel") || b.name.toLowerCase().includes("battery") ? 1 : 0;
                return bRel - aRel;
            });
        } else if (hasSolar && !hasInverter) {
            smartProducts.sort((a, b) => {
                const aRel = a.name.toLowerCase().includes("inverter") ? 1 : 0;
                const bRel = b.name.toLowerCase().includes("inverter") ? 1 : 0;
                return bRel - aRel;
            });
        } else if (hasPhone) {
            smartProducts.sort((a, b) => {
                const aRel = a.name.toLowerCase().includes("case") || a.name.toLowerCase().includes("charger") || a.name.toLowerCase().includes("earbud") || a.name.toLowerCase().includes("airpod") ? 1 : 0;
                const bRel = b.name.toLowerCase().includes("case") || b.name.toLowerCase().includes("charger") || b.name.toLowerCase().includes("earbud") || b.name.toLowerCase().includes("airpod") ? 1 : 0;
                return bRel - aRel;
            });
        }

        // Fill to at least 8 if needed
        if (smartProducts.length < 8) {
            const others = allProducts.filter(p => !cartProductIds.includes(p.id) && !smartProducts.some(sp => sp.id === p.id));
            smartProducts = [...smartProducts, ...others.slice(0, 8 - smartProducts.length)];
        }

        return smartProducts.slice(0, 8);
    }, [checkoutItems, isClient]);

    // Added state for the "View More" feature
    const [loadedMore, setLoadedMore] = useState(false);
    const [visibleProductsCount, setVisibleProductsCount] = useState(8);
    const [paymentMethod, setPaymentMethod] = useState<"paystack" | "transfer" | "cod" | "whatsapp">("paystack");
    const [showConcierge, setShowConcierge] = useState(false);
    const [conciergeProduct, setConciergeProduct] = useState<Product | null>(null);
    const [conciergeOrderId, setConciergeOrderId] = useState<string | null>(null);
    const [showPushOptIn, setShowPushOptIn] = useState(false);
    const [isReviewExpanded, setIsReviewExpanded] = useState(false);

    // Coupon System
    const [availableCoupons, setAvailableCoupons] = useState<Coupon[]>([]);
    const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);

    // Savings Breakdown Toggle
    const [showSavingsBreakdown, setShowSavingsBreakdown] = useState(false);

    // Paystack Metadata (for webhook tracking)
    const [paystackMetadata, setPaystackMetadata] = useState<any>(null);
    const [paystackSplit, setPaystackSplit] = useState<{ subaccount: string; transactionCharge: number; bearer: "account" | "subaccount" } | null>(null);

    // Collapsible Address State
    const [isAddressExpanded, setIsAddressExpanded] = useState(true);
    const hasPhysicalProduct = useMemo(() => {
        const physicalCategories = ["phones", "electronics", "home", "fashion", "beauty", "sports", "fitness", "cars", "energy", "appliances", "baby", "grocery", "computers", "textiles", "automotive"];
        return checkoutItems.some(item => physicalCategories.includes(item.product.category?.toLowerCase() || ""));
    }, [checkoutItems]);

    // Identity Reconciliation State
    // Catch both wa- (legacy) and wa_ (current) placeholder emails
    const isWhatsAppPlaceholder = (user?.email?.startsWith("wa-") || user?.email?.startsWith("wa_")) && user?.email?.endsWith("@fairprice.ng");
    // The synthetic wa_...@fairprice.ng placeholder is truthy, so every
    // `user?.email || address.email` fallback in this file picked the placeholder over
    // the real email the buyer typed at checkout — Paystack, the order record, and the
    // confirmation page all showed/received the fake address. This is the single value
    // everything downstream should use.
    const effectiveEmail = (isWhatsAppPlaceholder ? address.email : user?.email) || address.email || user?.email || "";
    const [showIdentityPrompt, setShowIdentityPrompt] = useState(false);
    const [identityReconciled, setIdentityReconciled] = useState(false);
    // Email conflict: null = unchecked, 'none' = safe, 'conflict' = email belongs to another account
    const [emailConflictStatus, setEmailConflictStatus] = useState<null | 'none' | 'conflict'>(null);
    // Supplier/proxy-order mode: logged-in user ordering in someone else's name
    const [orderEmailMode, setOrderEmailMode] = useState<'account' | 'order_only' | 'create_account'>('account');

    useEffect(() => {
        if (isWhatsAppPlaceholder && !identityReconciled) {
            setShowIdentityPrompt(true);
        }
    }, [isWhatsAppPlaceholder, identityReconciled]);

    // Auto-expand address if physical product detected
    useEffect(() => {
        if (hasPhysicalProduct) {
            setIsAddressExpanded(true);
        }
    }, [hasPhysicalProduct]);

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

    // Note: Local COUNTRY_CODES array removed in favor of global import.

    const handleEmailChange = (value: string) => {
        setAddress({ ...address, email: value });
        setEmailConflictStatus(null); // reset on change
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
    const [showGuestPassword, setShowGuestPassword] = useState(false);
    const [isSettingPassword, setIsSettingPassword] = useState(false);
    const [passwordError, setPasswordError] = useState("");
    const [guestEmailHasAccount, setGuestEmailHasAccount] = useState(false);
    // Real contact details the guest can attach to replace a synthetic
    // guest_<ts>@fairprice.ng identity (QR/direct payments auto-generate one).
    const [guestRealEmail, setGuestRealEmail] = useState("");
    const [guestWhatsapp, setGuestWhatsapp] = useState("");

    const [baseDoorFee, setBaseDoorFee] = useState(4000);
    const [basePickupFee, setBasePickupFee] = useState(2500);
    const [escrowFeePayNow, setEscrowFeePayNow] = useState(1950);

    // COD settings from admin
    const [codThreshold, setCodThreshold] = useState(50000);
    const [codEnabled, setCodEnabled] = useState(true);
    const [codAllowExpensiveCategories, setCodAllowExpensiveCategories] = useState(true);
    // COD for global products — admin-controlled (default enabled for seamless UX)
    const [codGlobalEnabled, setCodGlobalEnabled] = useState(true);
    const [codGlobalThreshold, setCodGlobalThreshold] = useState(150000);

    // WhatsApp Order Number (admin-configurable)
    const [whatsappOrderNumber, setWhatsappOrderNumber] = useState("2348162816305");

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

    // Load saved addresses and auto-fill from user on mount
    useEffect(() => {
        // Only load saved addresses for authenticated users to prevent cross-session leaks
        if (user) {
            const local = getSavedAddresses();
            // If localStorage is empty (new device/cleared storage), pull from DB
            if (local.length === 0 && user.id) {
                fetch(`/api/addresses?userId=${encodeURIComponent(user.id)}`)
                    .then(r => r.ok ? r.json() : null)
                    .then(data => {
                        if (data?.addresses?.length > 0) {
                            setSavedAddresses(data.addresses);
                        }
                    })
                    .catch(() => {});
            }
            const saved = local.length > 0 ? local : [];
            setSavedAddresses(saved);

            if (isWhatsAppPlaceholder && !identityReconciled) {
                // Pre-fill address with empty values to force the user to provide their real name and email
                setAddress({
                    firstName: "",
                    lastName: "",
                    street: saved[0]?.street || "",
                    city: saved[0]?.city || "Lagos",
                    state: saved[0]?.state || "Lagos",
                    phone: saved[0]?.phone || (user as any)?.phone || "",
                    email: ""
                });
                setIsEditingAddress(true);
                if (saved.length > 0 && saved[0].method === "pickup") {
                    setDeliveryMethod("pickup");
                    setPickupDetails({
                        state: saved[0].state || "",
                        city: saved[0].city || "",
                        station: saved[0].station || ""
                    });
                } else {
                    setDeliveryMethod("doorstep");
                }
            } else if (saved.length > 0) {
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
                        state: latest.state || "Lagos",
                        city: latest.city || "Lagos",
                        station: latest.station || ""
                    });
                } else {
                    setDeliveryMethod("doorstep");
                    // Ensure pickup details are blank for doorstep-first loads to prevent leakage
                    setPickupDetails({ state: "", city: "", station: "" });
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
                    // WhatsApp Order Number
                    if (data.supportConfig?.whatsappOrderNumber) {
                        setWhatsappOrderNumber(data.supportConfig.whatsappOrderNumber);
                        localStorage.setItem("fp_whatsapp_order_number", data.supportConfig.whatsappOrderNumber);
                    } else if (data.supportConfig?.whatsapp) {
                        // Fallback to 'whatsapp' field if 'whatsappOrderNumber' is missing
                        setWhatsappOrderNumber(data.supportConfig.whatsapp);
                        localStorage.setItem("fp_whatsapp_order_number", data.supportConfig.whatsapp);
                    }

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
    const shipping = (paymentMethod !== "cod" && paymentMethod !== "whatsapp" && (paymentMethod === "paystack" || paymentMethod === "transfer" || isPremiumFreeDelivery || isFreeShippingDiscount || isFreeShippingByOrderValue)) ? 0 : (
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

        // Best-effort DB persist so the address syncs cross-device to /account/addresses.
        // Fire-and-forget — a failure here must NEVER affect the order. (WhatsApp number
        // is intentionally not sent: the Address model has no column for it, so it stays
        // in localStorage only.)
        const dbUserId = user?.id || user?.email;
        if (dbUserId && newAddr.street.trim() && newAddr.state) {
            fetch("/api/addresses", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: dbUserId,
                    label: newAddr.label,
                    street: newAddr.street,
                    city: newAddr.city,
                    state: newAddr.state,
                    phone: newAddr.phone || null,
                }),
            }).catch(() => { /* non-blocking */ });
        }
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
                state: addr.state || "Lagos",
                city: addr.city || "Lagos",
                station: addr.station || ""
            });
        } else {
            // If switching to doorstep, clear pickup details to prevent stale data leakage
            setPickupDetails({ state: "", city: "", station: "" });
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
        setCheckoutStep(3); // Auto-advance to payment when selecting saved address
    };

    const deleteSavedAddress = (id: string) => {
        const updated = savedAddresses.filter(a => a.id !== id);
        setSavedAddresses(updated);
        persistAddresses(updated);
    };

    const scrollToShippingAddress = () => {
        setCheckoutStep(2); // Fix: Keep on Step 2 where shipping info resides
        setIsEditingAddress(true);
        setTimeout(() => {
            shippingAddressRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    };

    // QR customers are impatient — skip straight to the payment step the instant
    // the scanned item lands in the cart, instead of making them click through
    // "Review Items" and "Shipping" steps that don't apply to an in-person payment.
    useEffect(() => {
        if (isDirectPaymentOnly && isCartLoaded && checkoutStep < 3) {
            setCheckoutStep(3);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isDirectPaymentOnly, isCartLoaded]);

    const handlePlaceOrder = async () => {
        const email = (user && !isWhatsAppPlaceholder) ? user.email : address.email;

        // QR/direct payments are instant in-person transactions — a customer standing
        // at a till scanning a QR shouldn't have to type a name/email/phone before
        // paying. Fill in sensible defaults instead of blocking them.
        if (isDirectPaymentOnly) {
            const filled = {
                ...address,
                firstName: address.firstName.trim() || "Guest",
                email: email.trim() || `guest_${Date.now()}@fairprice.ng`,
                phone: address.phone.trim() || "00000000000",
            };
            Object.assign(address, filled); // synchronous read for the rest of this function
            setAddress(filled); // keep UI/state in sync for any re-render before navigation
        } else {
            if (!address.firstName.trim() || !email.trim()) {
                setAddressError((user && !isWhatsAppPlaceholder) ? "Please enter your first name." : "Please enter your real name and email address.");
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
        }
        if (!isDirectPaymentOnly && deliveryMethod === "doorstep") {
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
        if (!isDirectPaymentOnly && deliveryMethod === "pickup" && (!pickupDetails.state || !pickupDetails.city || !pickupDetails.station)) {
            setAddressError("Please select a valid pickup station.");
            scrollToShippingAddress();
            return;
        }
        setAddressError("");

        const continueWithOrder = async () => {
            // Auto-save this address for next time
            if ((deliveryMethod === "doorstep" && address.street.trim()) || (deliveryMethod === "pickup" && pickupDetails.station)) {
                saveCurrentAddress();
            }

            // Payment routing
            if (paymentMethod === "whatsapp") {
                // WhatsApp ordering — finalize order locally then redirect to wa.me
                const waOrderId = "WA-" + Date.now();
                finalizeOrder(waOrderId);

                // Track WhatsApp order placed
                if (typeof window !== "undefined" && window.pendo) {
                    window.pendo.track("whatsapp_order_placed", {
                        order_id: waOrderId,
                        total_amount: checkoutItems.reduce((acc, item) => acc + (item.price * item.quantity), 0),
                        item_count: checkoutItems.length,
                        delivery_method: deliveryMethod,
                        customer_state: address.state || pickupDetails.state || "",
                    });
                }

                // Generate the message and redirect
                const msg = generateWhatsAppMessage(waOrderId);
                const waUrl = `https://wa.me/${whatsappOrderNumber}?text=${encodeURIComponent(msg)}`;
                // Small delay so the order can be saved before redirecting
                setTimeout(() => {
                    window.open(waUrl, '_blank');
                }, 800);
            } else if (paymentMethod === "cod") {
                // Pay on delivery — skip Paystack, go straight to order confirmation
                finalizeOrder("COD-" + Date.now());
            } else {
                // Generate IDs for all items in this transaction before starting Paystack
                // This allows the webhook to update these specific orders
                const orderIds = checkoutItems.map(item => `ORDER-${Math.random().toString(36).substr(2, 8).toUpperCase()}`);
                // Collect unique seller IDs so the webhook can route escrow settlements
                const uniqueSellerIds = [...new Set(checkoutItems.map(item => item.product.seller_id))];
                if (isDirectPaymentOnly) {
                    // QR/direct payments are in-person transactions — there's no delivery
                    // to wait on, so they must NOT enter the order-escrow flow (where funds
                    // sat "held" forever with nobody to confirm delivery). Route them
                    // through the webhook's qr_payment branch, which settles instantly:
                    // the seller receives EXACTLY the amount they set on their QR
                    // (seller_amount = subtotal), and the platform fee (the difference
                    // between what the customer paid and seller_amount) stays with us.
                    setPaystackMetadata({
                        type: "qr_payment",
                        seller_id: uniqueSellerIds[0],
                        seller_amount: subtotal,
                        label: checkoutItems[0]?.product?.name || "QR Payment",
                        order_ids: orderIds.join(','),
                        customer_id: user?.id || user?.email || address.email,
                        total_amount: total
                    });

                    // If this seller has a Paystack Subaccount on file, route the split at
                    // the moment of payment instead of relying on the webhook's Transfer
                    // call — Paystack settles the seller's cut to their bank automatically,
                    // no third-party-transfer permission needed at all.
                    try {
                        const subRes = await fetch(`/api/sellers/${uniqueSellerIds[0]}/subaccount`);
                        const subData = await subRes.json();
                        if (subData?.subaccountCode) {
                            setPaystackSplit({
                                subaccount: subData.subaccountCode,
                                transactionCharge: Math.round((total - subtotal) * 100), // platform fee, in kobo
                                bearer: "account",
                            });
                        } else {
                            setPaystackSplit(null);
                        }
                    } catch {
                        setPaystackSplit(null);
                    }
                } else {
                    setPaystackMetadata({
                        type: "order",
                        order_ids: orderIds.join(','),
                        seller_ids: uniqueSellerIds.join(','),
                        customer_id: user?.id || user?.email || address.email,
                        total_amount: total
                    });
                }
                setShowPaystack(true);
            }
        };

        if (isWhatsAppPlaceholder && address.email && address.email !== user?.email && !identityReconciled) {
            setIsProcessing(true);

            if (orderEmailMode === 'order_only') {
                // Don't update account — just use this email for order notifications
                setIdentityReconciled(true);
                setShowIdentityPrompt(false);
                setIsProcessing(false);
                continueWithOrder();
                return;
            }

            if (orderEmailMode === 'create_account') {
                // Create a new account for this email — don't modify the WA account
                fetch(`/api/auth/register`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        email: address.email,
                        name: `${address.firstName} ${address.lastName}`.trim(),
                        role: 'customer',
                    })
                }).then(() => {
                    setIdentityReconciled(true);
                    setShowIdentityPrompt(false);
                    setIsProcessing(false);
                    continueWithOrder();
                }).catch(() => {
                    setIsProcessing(false);
                    continueWithOrder(); // non-fatal
                });
                return;
            }

            // Default (orderEmailMode === 'account'): link the email to the WA account
            fetch(`/api/users`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: user?.id,
                    email: address.email,
                    name: `${address.firstName} ${address.lastName}`.trim()
                })
            }).then(async (res) => {
                if (res.ok) {
                    await fetch("/api/auth/migrate-guest", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ oldId: user?.id, newId: user?.id, email: address.email })
                    });
                    // Hot-update the in-memory session so navbar + review emails use the real address
                    updateUser({
                        email: address.email,
                        name: `${address.firstName} ${address.lastName}`.trim() || user?.name
                    } as any);
                    setIdentityReconciled(true);
                    setShowIdentityPrompt(false);
                    setIsProcessing(false);
                    continueWithOrder();
                } else {
                    // If update failed (e.g. email conflict race), fall through to order_only
                    setOrderEmailMode('order_only');
                    setIdentityReconciled(true);
                    setShowIdentityPrompt(false);
                    setIsProcessing(false);
                    continueWithOrder();
                }
            }).catch(() => {
                setIsProcessing(false);
                setAddressError("Error communicating with server.");
                scrollToShippingAddress();
            });
            return;
        }

        continueWithOrder();
    };

    // Generate a clean, receipt-style WhatsApp order message
    const generateWhatsAppMessage = (orderId: string): string => {
        const fullName = `${address.firstName} ${address.lastName}`.trim();
        const phone = `${countryCode} ${address.phone}`;
        const deliveryAddr = deliveryMethod === "pickup"
            ? `Pickup: ${pickupDetails.station}, ${pickupDetails.city}, ${pickupDetails.state}`
            : `${address.street}, ${address.city}, ${address.state || ''}`;

        let lines: string[] = [];
        lines.push(`🛒 *NEW ORDER — #${orderId}*`);
        lines.push(``);

        checkoutItems.forEach(item => {
            const itemTotal = item.price * item.quantity;
            lines.push(`*${item.quantity}x* ${item.product.name}`);
            lines.push(`₦${itemTotal.toLocaleString()}`);
            lines.push(``);
        });

        lines.push(`---`);
        lines.push(`Item Total: ₦${subtotal.toLocaleString()}`);
        if (shipping > 0) {
            lines.push(`Delivery: ₦${shipping.toLocaleString()}`);
        } else {
            lines.push(`Delivery: FREE`);
        }
        if (appliedCoupon) {
            lines.push(`Discount: -₦${appliedCoupon.amount.toLocaleString()}`);
        }
        lines.push(`*Total: ₦${total.toLocaleString()}*`);
        lines.push(``);
        lines.push(`👤 Customer: ${fullName}`);
        lines.push(`📞 Phone: ${phone}`);
        if (user?.email || address.email) {
            lines.push(`📧 Email: ${user?.email || address.email}`);
        }
        lines.push(`🚚 Service: ${deliveryMethod === 'pickup' ? 'Pickup' : 'Delivery'}`);
        lines.push(`📍 Address: ${deliveryAddr}`);
        lines.push(`💳 Payment: Pay on Delivery (WhatsApp)`);
        lines.push(``);
        lines.push(`Placed via www.fairprice.ng`);

        return lines.join('\n');
    };

    // Entry point from the Paystack popup / COD / WhatsApp flows.
    // Paystack references MUST be verified server-side before we credit an order;
    // COD- and WA- references are off-platform and skip verification.
    const finalizeOrder = async (_reference?: string) => {
        const ref = _reference || "";
        // COD/WA are off-platform; DEMO- is the explicit ?demo=1 escape hatch (non-live key only).
        const isOffPlatform = ref.startsWith("COD-") || ref.startsWith("WA-") || ref.startsWith("DEMO-");

        if (!isOffPlatform) {
            // Reject the client-side demo/mock fallback outright — it never charged.
            if (ref.startsWith("mock_")) {
                setShowPaystack(false);
                setIsProcessing(false);
                alert("Payment could not be completed. No charge was made — please try again.");
                return;
            }
            // Confirm the charge against Paystack with our secret key.
            try {
                const vRes = await fetch("/api/paystack/verify", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ reference: ref, expectedAmount: Math.round(total * 100) }),
                });
                const vData = await vRes.json().catch(() => ({}));
                if (!vRes.ok || !vData?.ok) {
                    setShowPaystack(false);
                    setIsProcessing(false);
                    alert("We couldn't confirm your payment. If you were charged, contact support — no order was placed.");
                    console.warn("[checkout] Paystack verification failed:", vData);
                    return;
                }
            } catch (err) {
                setShowPaystack(false);
                setIsProcessing(false);
                alert("Payment verification failed. Please try again.");
                console.error("[checkout] verify request error", err);
                return;
            }
        }

        recordOrder(_reference);
    };

    // Records the order(s) after a payment reference is confirmed. Split out so
    // we can gate it behind server-side Paystack verification.
    const recordOrder = (_reference?: string) => {
        setShowPaystack(false);
        setIsProcessing(true);
        playDingSound(); // Play the sweet glass chime on successful order initiation/finalization
        setTimeout(() => {
            // Create and save the order(s)
            // Use the provided email as the user_id if not logged in
            const orderUserId = DataSyncService.getCurrentUserId() || user?.email || address.email;
            const fullName = `${address.firstName} ${address.lastName}`.trim();

            const createdOrders: any[] = [];
            const preGeneratedIds = paystackMetadata?.order_ids?.split(',') || [];

            checkoutItems.forEach((item, index) => {
                // Calculate financing details for vehicle products
                // Uses the dynamic vehicleDepositRate (from getVehicleDepositPercent) computed at render-level
                const isVehicleProduct = isVehicle(item.product);
                const vehicleDeposit = isVehicleProduct ? Math.round(item.price * item.quantity * vehicleDepositRate) : 0;
                const loanCalc = isVehicleProduct ? calculateMonthlyPayment(item.price * item.quantity, 2, 'foreign_used') : null;

                // Use pre-generated ID if available (from Paystack flow)
                const manualId = preGeneratedIds[index] || undefined;

                const newOrder = DataSyncService.addOrder({
                    id: manualId, // Pass the ID we used for Paystack
                    product_id: item.product.id,
                    customer_id: orderUserId,
                    customer_name: fullName || address.firstName || "Customer",
                    customer_email: effectiveEmail,
                    seller_id: item.product.seller_id,
                    seller_name: item.product.seller_name,
                    amount: isVehicleProduct ? vehicleDeposit : item.price * item.quantity,
                    status: (_reference?.startsWith("COD-") || _reference?.startsWith("WA-")) ? "pending" : "processing", // COD and WA are pending
                    escrow_status: "held",
                    shipping_address: deliveryMethod === "pickup"
                        ? `${fullName}, Pickup at: ${pickupDetails.station}, ${pickupDetails.city}, ${pickupDetails.state}`.replace(/, ,/g, ', ')
                        : `${fullName}, ${address.street}, ${address.city}, ${address.state || 'Lagos'}`.replace(/, ,/g, ', '),
                    delivery_method: deliveryMethod,
                    customer_phone: `${countryCode} ${address.phone}`,
                    customer_whatsapp: showWhatsappField ? `${whatsappCountryCode} ${whatsappPhone}` : undefined,
                    discount_id: appliedCoupon?.id,
                    // @ts-ignore - Flag for off-platform payment tracking
                    off_listing: (item.product as any).off_listing || false,
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

                // 🔔 Notify Seller (In-app & Push via hook)
                DataSyncService.addNotification({
                    userId: item.product.seller_id,
                    type: "order",
                    title: "New Order Received! 🛒",
                    message: `You have a new order for ${item.product.name} (₦${(item.price * item.quantity).toLocaleString()}).`,
                    link: `/seller/orders?id=${newOrder.id}`
                });

                // 📧 Notify Seller (Email)
                const seller = DataSyncService.getSellers().find(s => s.id === item.product.seller_id);
                const sellerEmail = seller?.owner_email || (seller as any)?.email;
                if (sellerEmail) {
                    fetch("/api/email", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            to: sellerEmail,
                            type: "SELLER_NEW_ORDER",
                            payload: {
                                name: seller?.business_name || "Seller",
                                orderId: newOrder.id,
                                productName: item.product.name,
                                amount: item.price * item.quantity,
                                trackingUrl: `https://www.fairprice.ng/seller/orders`
                            }
                        })
                    }).catch(() => {}); // Silently fail email — in-app notification is the source of truth
                }

                // 👨‍💼 Notify Admin (In-app & Push via hook)
                DataSyncService.addNotification({
                    userId: "admin",
                    type: "order",
                    title: "System: New Order Placed 📦",
                    message: `New order #${newOrder.id} placed by ${fullName} for ${item.product.name}.`,
                    link: `/admin/orders?id=${newOrder.id}`
                });

                createdOrders.push({ order: newOrder, product: item.product, item });
            });

            // Track order placed event
            if (typeof window !== "undefined" && window.pendo) {
                window.pendo.track("order_placed", {
                    order_id: createdOrders[0]?.order?.id || "",
                    payment_method: _reference?.startsWith("COD-") ? "cod" : _reference?.startsWith("WA-") ? "whatsapp" : "paystack",
                    total_amount: checkoutItems.reduce((acc, item) => acc + (item.price * item.quantity), 0),
                    item_count: checkoutItems.length,
                    has_negotiated_items: checkoutItems.some(item => item.isNegotiated),
                    has_vehicle_items: checkoutItems.some(item => isVehicle(item.product)),
                    has_global_products: hasGlobalProduct,
                    delivery_method: deliveryMethod,
                    shipping_cost: shipping,
                    discount_applied: !!appliedCoupon,
                    discount_amount: appliedCoupon?.amount || 0,
                    is_guest_checkout: !user,
                    customer_state: address.state || pickupDetails.state || "",
                });
            }

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
                        
                        // Register the referral in the tracker
                        DataSyncService.addReferral(referrerId, orderUserId, fullName || "A Friend", "completed");
                        
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
                // We no longer auto-login the guest here.
                // They will be prompted to secure their account after the order is finalized.
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
                        whatsapp: showWhatsappField ? `${whatsappCountryCode}${whatsappPhone.replace(/\D/g,'')}` : undefined,
                        address: deliveryMethod === "doorstep"
                            ? `${address.street}, ${address.city}`
                            : `Pickup: ${pickupDetails.station}, ${pickupDetails.city}, ${pickupDetails.state}`
                    })
                }).catch(console.error);
            } else if (user && showWhatsappField && whatsappPhone.trim()) {
                // Logged-in user: save WA number to their profile so it's linked and available for broadcasts
                const token = typeof window !== 'undefined' ? localStorage.getItem('fp_token') : null;
                fetch("/api/users", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    },
                    body: JSON.stringify({
                        id: user.id,
                        email: user.email,
                        whatsappNumber: `${whatsappCountryCode}${whatsappPhone.replace(/\D/g,'')}`,
                    })
                }).then(async (res) => {
                    if (res.ok) {
                        const updated = await res.json();
                        // Reflect in local context so profile page shows it immediately
                        updateUser({ whatsappNumber: updated.whatsappNumber } as any);
                    }
                }).catch(console.error);
            }
            // Show concierge before redirect (ONLY for signed in users per user request)
            if (user && !isGuestCheckout) {
                setShowConcierge(true);
            } else {
                // For guests, skip concierge and go straight to password setup
                setShowGuestPasswordSetup(true);
            }

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
                            trackingUrl: `https://www.fairprice.ng/account/orders`
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
                            trackingUrl: `https://www.fairprice.ng/seller/orders`
                        }
                    })
                }).catch(console.error);
            });
        }, 1500);
    };

    // While the cart is still hydrating from localStorage (e.g. right after a hard
    // navigation from a QR/direct-payment scan), avoid flashing "Review Items (0)".
    if (!negotiationId && !isCartLoaded) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
                <Navbar />
                <main className="flex-1 container mx-auto max-w-6xl px-4 py-30 flex items-center justify-center">
                    <div className="text-center">
                        <div className="h-10 w-10 border-4 border-gray-200 border-t-brand-green-600 rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-gray-500 text-sm">Loading your order...</p>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            {/* Header */}
            <Navbar />

            <main className="flex-1 container mx-auto max-w-6xl px-4 py-30 flex flex-col lg:flex-row gap-8">

                {/* Left Column: Checkout steps */}
                <div className="flex-1 space-y-6">

                    {showIdentityPrompt && (
                        <div className="p-4 rounded-xl bg-orange-50 border border-orange-200 text-orange-800 flex items-start gap-3 transition-opacity">
                            <ShieldCheck className="h-6 w-6 text-orange-500 shrink-0 mt-0.5" />
                            <div>
                                <h3 className="font-bold text-sm">Action Required: Secure Your Account</h3>
                                <p className="text-xs mt-1">We noticed you logged in via WhatsApp. Please enter your real name and email address in the Shipping section below to complete your profile.</p>
                            </div>
                        </div>
                    )}

                    {/* Step 1: Review Items */}
                    <section className={`bg-white rounded-2xl shadow-sm border transition-all duration-300 ${checkoutStep >= 1 ? 'border-brand-green-500 ring-1 ring-brand-green-500' : 'border-gray-100'} overflow-hidden`}>
                        <div 
                            className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50"
                        >
                            <h2 className="font-bold text-lg flex items-center gap-2 text-gray-900">
                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${checkoutStep > 1 ? 'bg-brand-green-600 text-white' : 'bg-black text-white'}`}>
                                    {checkoutStep > 1 ? <Check className="h-4 w-4" /> : '1'}
                                </span>
                                Review Items ({checkoutItems.length})
                            </h2>
                        </div>

                        {
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

                                <div className="mt-8 flex justify-end">
                                    <Button 
                                        onClick={() => {
                                            if (checkoutStep < 2) setCheckoutStep(2);
                                            shippingAddressRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                        }}
                                        className="rounded-xl h-12 px-8 bg-brand-green-600 hover:bg-brand-green-700 text-white font-bold"
                                    >
                                        Confirm Items & Continue
                                    </Button>
                                </div>
                            </div>
                        }
                    </section>

                    {/* Step 2: Shipping & Delivery Info */}
                    <section ref={shippingAddressRef} className={`bg-white rounded-2xl shadow-sm border ${addressError ? 'border-red-400 ring-1 ring-red-400' : checkoutStep >= 2 ? 'border-brand-green-500 ring-1 ring-brand-green-500' : 'border-gray-100'} overflow-hidden transition-all duration-300`}>
                        <div className={`p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 ${checkoutStep === 3 ? 'cursor-pointer' : ''}`} onClick={() => { if (checkoutStep === 3) setCheckoutStep(2); }}>
                            <h2 className={`font-bold text-lg flex items-center gap-2 ${checkoutStep >= 2 ? 'text-gray-900' : 'text-gray-500'}`}>
                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${checkoutStep > 2 ? 'bg-brand-green-600 text-white' : checkoutStep >= 2 ? 'bg-black text-white' : 'bg-gray-200 text-gray-500'}`}>
                                    {checkoutStep > 2 ? <Check className="h-4 w-4" /> : '2'}
                                </span>
                                Shipping & Delivery Info
                            </h2>
                            {addressError && (
                                <p className="text-sm text-red-500 font-semibold">Please enter your delivery address</p>
                            )}
                            {checkoutStep === 3 && (
                                <button
                                    onClick={() => setCheckoutStep(2)}
                                    className="text-xs font-bold text-blue-600 hover:text-brand-orange"
                                >
                                    CHANGE
                                </button>
                            )}
                        </div>

                        {checkoutStep < 3 ? (
                            <div className="p-6">
                                {isDirectPaymentOnly && (
                                    <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium">
                                        This is an instant in-person payment — delivery address isn't required. Just confirm your name & phone and continue to payment.
                                    </div>
                                )}
                                {/* Saved Address Card List - ALWAYS RENDER AT TOP */}
                                {savedAddresses.length > 0 && (
                                    <div className="mb-8">
                                        <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
                                            <Sparkles className="h-3 w-3 text-brand-orange" />
                                            Saved Delivery Addresses
                                        </h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {savedAddresses.map(addr => (
                                                <div 
                                                    key={addr.id} 
                                                    onClick={() => selectSavedAddress(addr)}
                                                    className={cn(
                                                        "relative p-4 rounded-xl border-2 cursor-pointer transition-all hover:shadow-md group",
                                                        (!isEditingAddress && address.street === addr.street) 
                                                            ? "border-brand-green-500 bg-brand-green-50/30" 
                                                            : "border-gray-100 bg-white hover:border-brand-green-200"
                                                    )}
                                                >
                                                    {(!isEditingAddress && address.street === addr.street) && (
                                                        <div className="absolute top-3 right-3">
                                                            <CheckCircle2 className="h-5 w-5 text-brand-green-600" />
                                                        </div>
                                                    )}
                                                    <p className="font-black text-[13px] text-gray-900 mb-1">{addr.firstName} {addr.lastName}</p>
                                                    <p className="text-[12px] text-gray-500 leading-snug line-clamp-2 mb-2">
                                                        {addr.method === "pickup" ? `Pickup: ${addr.station}` : addr.street}, {addr.city}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-auto">
                                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 uppercase">
                                                            {addr.method}
                                                        </span>
                                                        <span className="text-[11px] text-gray-400 font-medium">
                                                            {addr.phone}
                                                        </span>
                                                    </div>
                                                    
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); deleteSavedAddress(addr.id); }}
                                                        className="absolute bottom-3 right-3 p-1.5 rounded-lg bg-gray-50 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            ))}
                                            
                                            <button
                                                onClick={() => {
                                                    setAddress({
                                                        firstName: "", lastName: "", street: "", city: "Lagos", state: "Lagos", phone: "", email: user?.email || ""
                                                    });
                                                    setDeliveryMethod("doorstep");
                                                    setIsEditingAddress(true);
                                                }}
                                                className="p-4 rounded-xl border-2 border-dashed border-gray-200 hover:border-brand-green-300 hover:bg-gray-50 flex flex-col items-center justify-center gap-2 transition-all group"
                                            >
                                                <div className="w-8 h-8 rounded-full bg-gray-100 group-hover:bg-brand-green-100 flex items-center justify-center transition-colors">
                                                    <Plus className="h-4 w-4 text-gray-400 group-hover:text-brand-green-600" />
                                                </div>
                                                <span className="text-xs font-bold text-gray-500 group-hover:text-brand-green-600">Add New Address</span>
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {isEditingAddress ? (
                                    <div className="space-y-6">
                                        {/* Progressive Checkout: Collapsible Address Header */}
                                        <div 
                                            onClick={() => setIsAddressExpanded(!isAddressExpanded)}
                                            className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center">
                                                    <MapPin className={cn("h-5 w-5", !!isAddressExpanded ? "text-brand-green-600" : "text-gray-400")} />
                                                </div>
                                                <div>
                                                    <h3 className="text-sm font-black text-gray-900">Shipping & Delivery Info</h3>
                                                    <p className="text-[11px] text-gray-500 font-medium">
                                                        {!!isAddressExpanded ? "Enter your delivery details below" : (address.street ? `${address.street}, ${address.city}` : "Click to add delivery address")}
                                                    </p>
                                                </div>
                                            </div>
                                            <Button variant="ghost" size="sm" className="text-brand-green-600 font-bold text-xs">
                                                {!!isAddressExpanded ? "Collapse" : "Expand"}
                                            </Button>
                                        </div>

                                        <AnimatePresence mode="wait">
                                            {!!isAddressExpanded && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: "auto", opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.3, ease: "easeInOut" }}
                                                    className="overflow-hidden space-y-6 pt-2"
                                                >
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
                                                <label className="text-xs font-bold uppercase text-gray-400">First Name <span className="text-red-400">*</span></label>
                                                <Input
                                                    value={address.firstName}
                                                    onChange={e => setAddress({ ...address, firstName: e.target.value })}
                                                    placeholder="Enter first name"
                                                    required
                                                    className="rounded-xl border-gray-300 bg-white focus:border-brand-orange/50 focus:ring-brand-orange/20"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold uppercase text-gray-400">Last Name <span className="text-red-400">*</span></label>
                                                <Input
                                                    value={address.lastName}
                                                    onChange={e => setAddress({ ...address, lastName: e.target.value })}
                                                    placeholder="Enter last name"
                                                    required
                                                    className="rounded-xl border-gray-300 bg-white focus:border-brand-orange/50 focus:ring-brand-orange/20"
                                                />
                                            </div>
                                        </div>
                                        {/* Email — guest / WA placeholder / supplier (ordering in someone else's name) */}
                                        {(!user || isWhatsAppPlaceholder) && (
                                            <div className="space-y-1 relative">
                                                <label className="text-xs font-bold uppercase text-gray-400">Email Address <span className="text-red-400">*</span></label>
                                                <Input
                                                    type="email"
                                                    value={address.email}
                                                    onChange={e => handleEmailChange(e.target.value)}
                                                    onFocus={() => { if (emailSuggestions.length > 0) setShowEmailDropdown(true); }}
                                                    onBlur={async () => {
                                                        setTimeout(() => setShowEmailDropdown(false), 200);
                                                        // Only check conflict for WA users entering a real email
                                                        if (isWhatsAppPlaceholder && address.email && address.email.includes('@') && !address.email.startsWith('wa')) {
                                                            try {
                                                                const res = await fetch(`/api/users?email=${encodeURIComponent(address.email)}`);
                                                                const d = await res.json();
                                                                if (d.exists && d.userId !== user?.id) {
                                                                    setEmailConflictStatus('conflict');
                                                                } else {
                                                                    setEmailConflictStatus('none');
                                                                    setOrderEmailMode('account'); // default: link to WA account
                                                                }
                                                            } catch { /* ignore */ }
                                                        }
                                                    }}
                                                    placeholder="your@email.com"
                                                    autoComplete="off"
                                                    className={`rounded-xl bg-white focus:ring-brand-orange/20 ${emailConflictStatus === 'conflict' ? 'border-amber-400 focus:border-amber-400' : 'border-gray-300 focus:border-brand-orange/50'}`}
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

                                                {/* Email conflict resolution */}
                                                {emailConflictStatus === 'conflict' && isWhatsAppPlaceholder && (
                                                    <div className="mt-2 p-3 rounded-xl bg-amber-50 border border-amber-200">
                                                        <p className="text-xs font-bold text-amber-800 mb-2">⚠️ This email is linked to another account. What would you like to do?</p>
                                                        <div className="space-y-1.5">
                                                            {[
                                                                { value: 'order_only', label: '📦 Use for this order only (no account link)', hint: 'Order updates go to this email. Your WhatsApp account stays separate.' },
                                                                { value: 'create_account', label: '🆕 Create a new account with this email', hint: 'A separate account will be created. Your WhatsApp account & orders stay here.' },
                                                            ].map(opt => (
                                                                <label key={opt.value} className={`flex items-start gap-2 p-2 rounded-lg cursor-pointer border transition-all ${orderEmailMode === opt.value ? 'border-amber-400 bg-amber-100/60' : 'border-transparent hover:bg-amber-100/30'}`}>
                                                                    <input type="radio" name="emailMode" value={opt.value} checked={orderEmailMode === opt.value} onChange={() => setOrderEmailMode(opt.value as typeof orderEmailMode)} className="mt-0.5 accent-amber-500" />
                                                                    <div>
                                                                        <p className="text-xs font-bold text-amber-900">{opt.label}</p>
                                                                        <p className="text-[10px] text-amber-600">{opt.hint}</p>
                                                                    </div>
                                                                </label>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Safe: email is new — offer to link to WA account */}
                                                {emailConflictStatus === 'none' && isWhatsAppPlaceholder && address.email && (
                                                    <div className="mt-2 p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                                                        <p className="text-xs font-bold text-emerald-800 mb-1.5">✅ Email is available. How should we use it?</p>
                                                        <div className="space-y-1.5">
                                                            {[
                                                                { value: 'account', label: '🔗 Add to my account (login with email in future)', hint: 'This email becomes a login option for your WhatsApp account.' },
                                                                { value: 'order_only', label: '📦 This order only', hint: 'Order updates go here. Your account keeps using WhatsApp to login.' },
                                                            ].map(opt => (
                                                                <label key={opt.value} className={`flex items-start gap-2 p-2 rounded-lg cursor-pointer border transition-all ${orderEmailMode === opt.value ? 'border-emerald-400 bg-emerald-100/60' : 'border-transparent hover:bg-emerald-100/30'}`}>
                                                                    <input type="radio" name="emailMode" value={opt.value} checked={orderEmailMode === opt.value} onChange={() => setOrderEmailMode(opt.value as typeof orderEmailMode)} className="mt-0.5 accent-emerald-500" />
                                                                    <div>
                                                                        <p className="text-xs font-bold text-emerald-900">{opt.label}</p>
                                                                        <p className="text-[10px] text-emerald-600">{opt.hint}</p>
                                                                    </div>
                                                                </label>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Logged-in (non-WA) user: show account email but allow ordering in another name */}
                                        {user && !isWhatsAppPlaceholder && (
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-xl text-sm">
                                                    <Check className="h-4 w-4 text-green-600" />
                                                    <span className="text-green-700">Receipts → <strong>{user.email}</strong></span>
                                                </div>
                                                {/* Supplier mode: ordering in customer's name */}
                                                {(address.firstName || address.email) && (address.email !== user.email) && (
                                                    <div className="px-3 py-2.5 rounded-xl bg-blue-50 border border-blue-100 text-xs text-blue-700">
                                                        <p className="font-bold mb-1">🏪 Ordering in a customer's name?</p>
                                                        <p className="text-blue-600 mb-2">Order updates will also be sent to <strong>{address.email || 'the email you enter'}</strong>.</p>
                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                checked={orderEmailMode === 'create_account'}
                                                                onChange={e => setOrderEmailMode(e.target.checked ? 'create_account' : 'order_only')}
                                                                className="accent-blue-600"
                                                            />
                                                            <span className="font-medium">Create a FairPrice account for that customer email</span>
                                                        </label>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold uppercase text-gray-400">Phone Number <span className="text-red-400">*</span></label>
                                            <div className="flex gap-2">
                                                {/* Country Code Dropdown */}
                                                <CountryCodeSelect 
                                                    value={countryCode} 
                                                    onChange={setCountryCode} 
                                                />
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
                                                    <CountryCodeSelect 
                                                        value={whatsappCountryCode} 
                                                        onChange={setWhatsappCountryCode} 
                                                    />
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
                                            {isDirectPaymentOnly && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => { setAddressError(""); setIsEditingAddress(false); setCheckoutStep(3); }}
                                                    className="rounded-xl border-gray-300 text-gray-700 font-semibold"
                                                >
                                                    Skip — I don't need this
                                                </Button>
                                            )}
                                            {!isDirectPaymentOnly && (address.street.trim() || savedAddresses.length > 0) && (
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
                                                    setCheckoutStep(3); // Auto-advance to payment after confirming address
                                                }}
                                                className="rounded-xl bg-black hover:bg-gray-900 text-white font-bold px-6"
                                            >
                                                Confirm Details
                                            </Button>
                                        </div>
                                    </motion.div>
                                            )}
                                        </AnimatePresence>
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
                                                onClick={() => setCheckoutStep(3)}
                                                className="w-full md:w-auto bg-brand-green-600 hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 text-white rounded-xl font-bold px-8"
                                            >
                                                PROCEED TO PAYMENT
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : isDirectPaymentOnly && !address.street.trim() && !pickupDetails.station ? (
                            <button
                                onClick={() => { setIsEditingAddress(true); setCheckoutStep(2); }}
                                className="w-full px-6 py-4 flex items-center gap-3 bg-gray-50/50 hover:bg-gray-100 transition-colors text-left"
                            >
                                <Plus className="h-5 w-5 text-gray-400" />
                                <div>
                                    <p className="text-sm font-bold text-gray-900">Add delivery details (optional)</p>
                                    <p className="text-xs text-gray-500 mt-0.5">Only if you want this shipped instead of picking it up in person</p>
                                </div>
                            </button>
                        ) : (
                            <div className="px-6 py-4 flex items-center gap-4 bg-gray-50/50">
                                {deliveryMethod === "pickup" ? <MapPin className="h-5 w-5 text-gray-400" /> : <Truck className="h-5 w-5 text-gray-400" />}
                                <div>
                                    <p className="text-sm font-bold text-gray-900">{address.firstName} {address.lastName}</p>
                                            <p className="text-xs text-gray-500 mt-0.5">
                                                {deliveryMethod === "doorstep"
                                                    ? `${address.street}${address.street ? ", " : ""}${address.city}`
                                                    : `Pickup: ${pickupDetails.station}, ${pickupDetails.city}`
                                                }
                                            </p>
                                </div>
                            </div>
                        )}
                    </section>

                    {/* Step 3: Payment Method */}
                    <section ref={paymentSectionRef} className={`bg-white rounded-2xl shadow-sm border ${checkoutStep === 3 ? 'border-brand-green-500 ring-1 ring-brand-green-500' : 'border-gray-100'} overflow-hidden transition-all duration-300`}>
                        <div className={`p-6 border-b border-gray-100 flex justify-between items-center ${checkoutStep === 3 ? 'bg-gray-50/50' : 'bg-gray-50/30'}`} onClick={() => checkoutStep > 3 ? setCheckoutStep(3) : checkoutStep === 2 && address.street.trim() && setCheckoutStep(3)}>
                            <h2 className={`font-bold text-lg flex items-center gap-2 ${checkoutStep === 3 ? 'text-gray-900' : 'text-gray-400'}`}>
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${checkoutStep === 3 ? 'bg-black text-white' : checkoutStep > 3 ? 'bg-brand-green-600 text-white' : 'bg-gray-200 text-gray-400'}`}>
                                    {checkoutStep > 3 ? <Check className="h-4 w-4" /> : '3'}
                                </div>
                                Payment Method
                            </h2>
                            {checkoutStep > 3 && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); setCheckoutStep(3); }}
                                    className="text-xs font-bold text-blue-600 hover:text-brand-orange"
                                >
                                    CHANGE
                                </button>
                            )}
                        </div>
                        {checkoutStep === 3 && (
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
                                            {/* OPay Stylized Text */}
                                                <div className="h-4 px-1.5 flex items-center justify-center bg-emerald-500 rounded-sm">
                                                    <span className="text-[10px] font-black text-white italic tracking-tighter">OPay</span>
                                                </div>
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
                                                    ? "Pay on Delivery is currently unavailable"
                                                    : "This order doesn't qualify for Pay on Delivery"}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Order via WhatsApp */}
                                <label className={`flex items-center gap-4 p-4 border rounded-xl cursor-pointer transition-all ${paymentMethod === 'whatsapp' ? 'border-[#25D366] bg-[#25D366]/5 ring-1 ring-[#25D366]/30' : 'border-gray-200 hover:border-[#25D366]/40'}`}>
                                    <input suppressHydrationWarning type="radio" name="payment" checked={paymentMethod === 'whatsapp'} onChange={() => setPaymentMethod('whatsapp')} className="h-5 w-5 text-[#25D366] focus:ring-[#25D366] accent-[#25D366]" />
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <span className="font-bold text-gray-900">Order via WhatsApp</span>
                                            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="#25D366">
                                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                                            </svg>
                                            <span className="text-[9px] font-black uppercase tracking-widest bg-[#25D366] text-white px-2 py-0.5 rounded-full">NEW</span>
                                        </div>
                                        <p className="text-xs text-gray-500">Send your order directly to FairPrice on WhatsApp</p>
                                        <p className="text-xs text-[#25D366] font-bold mt-1">Opens in WhatsApp · Pay on delivery 💬</p>
                                    </div>
                                </label>

                                <DiscountSection
                                    availableCoupons={availableCoupons}
                                    appliedCoupon={appliedCoupon}
                                    subtotal={subtotal}
                                    userId={user?.id}
                                    onApplyCoupon={setAppliedCoupon}
                                />

                                <div className="mt-6 flex justify-end lg:hidden">
                                    <Button
                                        onClick={() => {
                                            setCheckoutStep(3);
                                            setTimeout(() => paymentSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
                                        }}
                                        className="w-full md:w-auto bg-brand-green-600 hover:bg-emerald-600 text-white rounded-lg font-bold px-8"
                                    >
                                        PROCEED TO ORDER SUMMARY
                                    </Button>
                                </div>
                            </div>
                        )}
                        {checkoutStep > 2 && (
                            <div className="px-6 py-4 flex items-center gap-4 bg-white opacity-80">
                                {paymentMethod === 'paystack' ? <CreditCard className="h-5 w-5 text-gray-400" /> : paymentMethod === 'transfer' ? <Building className="h-5 w-5 text-blue-500" /> : paymentMethod === 'whatsapp' ? (
                                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                                ) : <Truck className="h-5 w-5 text-amber-500" />}
                                <div>
                                    <p className="text-sm font-bold text-gray-900">{paymentMethod === 'paystack' ? 'Pay with Card' : paymentMethod === 'transfer' ? 'Pay with Transfer' : paymentMethod === 'whatsapp' ? 'Order via WhatsApp' : 'Pay on Delivery'}</p>
                                    <p className={`text-xs font-medium ${paymentMethod === 'cod' ? 'text-amber-600' : paymentMethod === 'whatsapp' ? 'text-[#25D366]' : 'text-green-600'}`}>
                                        {paymentMethod === 'paystack' ? 'Secured card payment · FREE delivery' : paymentMethod === 'transfer' ? 'Bank transfer via Paystack · FREE delivery' : paymentMethod === 'whatsapp' ? 'Order sent via WhatsApp · Pay on Delivery' : `Delivery fee: ${formatPrice(shipping)}`}
                                    </p>
                                </div>
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
                                className={`w-full rounded-2xl text-white font-bold h-14 shadow-lg mb-4 text-base transition-all active:scale-[0.98] ${paymentMethod === 'whatsapp' ? 'bg-[#25D366] hover:bg-[#1da851] shadow-[#25D366]/25' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25'}`}
                            >
                                {isProcessing ? "Processing..." : paymentMethod === 'whatsapp' ? (
                                    <span className="flex items-center gap-2">
                                        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                                        Order via WhatsApp
                                    </span>
                                ) : "Place Your Order"}
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
                                        {item.product.image_url === "SPECIAL:QR_PAYMENT" ? (
                                            <div className="w-full h-full bg-emerald-50 rounded-md flex items-center justify-center">
                                                <QrCode className="h-6 w-6 text-emerald-600" />
                                            </div>
                                        ) : (
                                            <img
                                                src={item.product.image_url || "/assets/images/placeholder.png"}
                                                alt={item.product.name}
                                                className="w-full h-full object-contain"
                                                onError={e => {
                                                    e.currentTarget.src = "/assets/images/placeholder.png";
                                                }}
                                            />
                                        )}
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
                                className={`w-full rounded-xl text-white font-black h-14 shadow-xl text-lg transition-all ${paymentMethod === 'whatsapp' ? 'bg-[#25D366] hover:bg-[#1da851] shadow-[#25D366]/20' : 'bg-gradient-to-r from-brand-green-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-600 shadow-emerald-500/20'}`}
                            >
                                {isProcessing ? "Processing..." : paymentMethod === 'whatsapp' ? (
                                    <span className="flex items-center gap-2">
                                        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                                        Send WhatsApp
                                    </span>
                                ) : "Confirm & Pay"}
                            </Button>
                        </div>
                    </div>
                </div>

            </main >

            {/* Global cross-sell at bottom of checkout */}
            {isClient && (
                <div className="container mx-auto max-w-6xl px-4 mt-6 mb-32">
                    <RecommendedProducts
                        products={frequentlyBoughtTogether}
                        title="Frequently Bought Together"
                        subtitle="Smart suggestions based on your cart"
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
                        email={effectiveEmail || "guest@example.com"}
                        metadata={paystackMetadata}
                        onSuccess={(ref) => finalizeOrder(ref)}
                        onClose={() => setShowPaystack(false)}
                        autoStart={true}
                        subaccount={paystackSplit?.subaccount}
                        transactionCharge={paystackSplit?.transactionCharge}
                        bearer={paystackSplit?.bearer}
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
                        // Check if this email already has a full account with password
                        fetch(`/api/users?email=${encodeURIComponent(address.email)}`)
                            .then(r => r.ok ? r.json() : null)
                            .then(user => { if (user?.password) setGuestEmailHasAccount(true); })
                            .catch(() => {});
                        setShowGuestPasswordSetup(true);
                    } else if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
                        setShowPushOptIn(true);
                    } else {
                        const deliveryDate = new Date(Date.now() + 4 * 86400000).toISOString().slice(0, 10);
                        const customerEmail = effectiveEmail;
                        router.push(`/order-confirmation?id=${encodeURIComponent(conciergeOrderId || '')}&email=${encodeURIComponent(customerEmail)}&date=${deliveryDate}`);
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
                            <h2 className="text-2xl font-black text-gray-900 mb-2">
                                {guestEmailHasAccount ? "Welcome Back!" : "Secure Your Account"}
                            </h2>
                            <p className="text-gray-500 mb-2 text-sm">
                                {guestEmailHasAccount
                                    ? "Looks like you already have a FairPrice account with this email. Sign in to track your order."
                                    : "Your order was placed successfully! Create a password to track this order and shop faster next time."}
                            </p>

                            {/* Show the email that was used — synthetic guest emails get a
                                friendlier framing since they're not a real address */}
                            {(address?.email?.startsWith("guest_") && address?.email?.endsWith("@fairprice.ng")) ? (
                                <p className="text-xs text-gray-400 mb-6">Your order is saved under a temporary guest ID — add your real email or WhatsApp below to keep it.</p>
                            ) : (
                                <div className="flex items-center justify-center gap-2 mb-6 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5">
                                    <span className="text-xs text-gray-500 font-medium">Order placed as</span>
                                    <span className="text-sm font-bold text-gray-900 truncate max-w-[200px]">{address?.email}</span>
                                </div>
                            )}

                            {guestEmailHasAccount ? (
                                /* Existing account: direct to login */
                                <div className="space-y-3">
                                    <Button
                                        onClick={() => router.push(`/login?email=${encodeURIComponent(address.email)}&phone=${encodeURIComponent(address.phone)}&from=/account/orders`)}
                                        className="w-full h-12 rounded-xl text-base font-bold bg-brand-green-600 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20"
                                    >
                                        Sign In to View Order
                                    </Button>
                                    <button
                                        type="button"
                                        onClick={() => { setShowGuestPasswordSetup(false); router.push("/account/orders?success=true"); }}
                                        className="w-full text-sm text-gray-400 hover:text-gray-600 font-medium py-2"
                                    >
                                        Skip for now
                                    </button>
                                </div>
                            ) : (
                                /* New account: create password */
                                <form
                                    onSubmit={async (e) => {
                                        e.preventDefault();
                                        setPasswordError("");
                                        if (!guestPassword || guestPassword.length < 6) {
                                            setPasswordError("Password must be at least 6 characters.");
                                            return;
                                        }
                                        const isSyntheticGuest = address.email?.startsWith("guest_") && address.email?.endsWith("@fairprice.ng");
                                        if (isSyntheticGuest && !guestRealEmail.trim() && !guestWhatsapp.trim()) {
                                            setPasswordError("Add your real email or WhatsApp number so you can log back in.");
                                            return;
                                        }
                                        setIsSettingPassword(true);
                                        try {
                                            // Guests have no JWT, so the old set-password call always
                                            // 401'd ("Authentication required"). claim-guest proves
                                            // ownership via the checkout-session guest email, swaps in
                                            // the real contact details, sets the password, and returns
                                            // a token in one shot.
                                            const res = await fetch("/api/auth/claim-guest", {
                                                method: "POST",
                                                headers: { "Content-Type": "application/json" },
                                                body: JSON.stringify({
                                                    guestEmail: address.email,
                                                    realEmail: guestRealEmail.trim() || undefined,
                                                    whatsapp: guestWhatsapp.trim() || undefined,
                                                    name: address.firstName && address.firstName !== "Guest" ? `${address.firstName} ${address.lastName || ""}`.trim() : undefined,
                                                    password: guestPassword,
                                                })
                                            });
                                            const data = await res.json();
                                            if (data.code === "ALREADY_SECURED" || data.code === "EMAIL_CONFLICT") {
                                                setGuestEmailHasAccount(true);
                                                setIsSettingPassword(false);
                                                return;
                                            }
                                            if (res.ok && data.success) {
                                                if (data.token) localStorage.setItem("fp_token", data.token);
                                                if (data.user) await login(data.user);
                                                // Track guest account secured
                                                if (typeof window !== "undefined" && window.pendo) {
                                                    window.pendo.track("guest_account_secured", {
                                                        email: address.email || "",
                                                        order_id: conciergeOrderId || "",
                                                    });
                                                }

                                                setShowGuestPasswordSetup(false);
                                                if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
                                                    setShowPushOptIn(true);
                                                } else {
                                                    router.push("/account/orders?success=true");
                                                }
                                            } else {
                                                throw new Error(data.error || "Failed to secure account");
                                            }
                                        } catch (err: any) {
                                            setPasswordError(err.message || "Failed to set password. Try again later.");
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
                                    {(address?.email?.startsWith("guest_") && address?.email?.endsWith("@fairprice.ng")) && (
                                        <>
                                            <div className="mb-3 text-left">
                                                <Input
                                                    type="email"
                                                    placeholder="Your email address"
                                                    value={guestRealEmail}
                                                    onChange={(e) => setGuestRealEmail(e.target.value)}
                                                    className="h-12 text-base font-medium rounded-xl border-gray-200 bg-gray-50 focus:border-brand-green-500 focus:ring-1 focus:ring-brand-green-500"
                                                    disabled={isSettingPassword}
                                                />
                                            </div>
                                            <div className="mb-4 text-left">
                                                <Input
                                                    type="tel"
                                                    placeholder="WhatsApp number (optional)"
                                                    value={guestWhatsapp}
                                                    onChange={(e) => setGuestWhatsapp(e.target.value)}
                                                    className="h-12 text-base font-medium rounded-xl border-gray-200 bg-gray-50 focus:border-brand-green-500 focus:ring-1 focus:ring-brand-green-500"
                                                    disabled={isSettingPassword}
                                                />
                                            </div>
                                        </>
                                    )}
                                    <div className="mb-4 relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                        <Input
                                            type={showGuestPassword ? "text" : "password"}
                                            placeholder="Create a secure password"
                                            value={guestPassword}
                                            onChange={(e) => setGuestPassword(e.target.value)}
                                            className="pl-10 pr-12 h-12 text-base font-medium rounded-xl border-gray-200 bg-gray-50 focus:border-brand-green-500 focus:ring-1 focus:ring-brand-green-500 shadow-inner"
                                            required
                                            minLength={6}
                                            disabled={isSettingPassword}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowGuestPassword(p => !p)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        >
                                            {showGuestPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                        </button>
                                    </div>

                                    <Button
                                        type="submit"
                                        disabled={isSettingPassword}
                                        className="w-full h-12 rounded-xl text-base font-bold bg-brand-green-600 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 mb-3"
                                    >
                                        {isSettingPassword ? <span className="animate-spin mr-2">⏳</span> : null}
                                        Create Password & View Order
                                    </Button>

                                    {/* Sign in option for users who already have account */}
                                    <p className="text-xs text-gray-400">
                                        Already have an account?{" "}
                                        <button
                                            type="button"
                                            onClick={() => router.push(`/login?email=${encodeURIComponent(address.email)}&phone=${encodeURIComponent(address.phone)}&from=/account/orders`)}
                                            className="text-brand-green-600 font-bold hover:underline"
                                        >
                                            Sign in instead
                                        </button>
                                    </p>
                                </form>
                            )}
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
                                const deliveryDate = new Date(Date.now() + 4 * 86400000).toISOString().slice(0, 10);
                                const customerEmail = effectiveEmail;
                                router.push(`/order-confirmation?id=${encodeURIComponent(conciergeOrderId || '')}&email=${encodeURIComponent(customerEmail)}&date=${deliveryDate}`);
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
                                            const deliveryDate = new Date(Date.now() + 4 * 86400000).toISOString().slice(0, 10);
                                            const customerEmail = effectiveEmail;
                                            router.push(`/order-confirmation?id=${encodeURIComponent(conciergeOrderId || '')}&email=${encodeURIComponent(customerEmail)}&date=${deliveryDate}`);
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
