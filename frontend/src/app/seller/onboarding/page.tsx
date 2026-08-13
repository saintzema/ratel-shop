"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, ChevronRight, Upload, Building, User, CreditCard, Box, Camera } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { DataSyncService } from "@/lib/sync-store";
import { Seller, CATEGORIES } from "@/lib/types";
import { NIGERIAN_STATES } from "@/lib/nigerian-states";
import { InstallBanner } from "@/components/ui/InstallBanner";

export default function KYCOnboarding() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    // Read directly off window instead of useSearchParams — avoids requiring a
    // Suspense boundary around this whole (already large) form just for one param.
    // Set by /sell -> seller/products/new when someone created a product before
    // they were a seller yet; lets this completion step link straight to it.
    const [fromProductId, setFromProductId] = useState<string | null>(null);
    useEffect(() => {
        if (typeof window === "undefined") return;
        setFromProductId(new URLSearchParams(window.location.search).get("fromProduct"));
    }, []);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [fileName, setFileName] = useState<string | null>(null);
    // Real uploaded URLs — previously fileName/cacFileName only ever held the local
    // filename string, and submission built a fake "/mock/kyc/..." path from it that
    // pointed to nothing. Nothing was ever actually uploaded to Blob storage, which is
    // why admin verification always showed "No KYC Submitted" regardless of what a
    // seller picked during onboarding.
    const [idDocumentUrl, setIdDocumentUrl] = useState<string | null>(null);
    const [cacDocumentUrl, setCacDocumentUrl] = useState<string | null>(null);
    const [uploadingId, setUploadingId] = useState(false);
    const [uploadingCac, setUploadingCac] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);

    const uploadKycFile = async (file: File, folder: "kyc" | "cac"): Promise<string | null> => {
        let token = typeof window !== "undefined" ? localStorage.getItem("fp_token") : null;
        const doUpload = async () => {
            const fd = new FormData();
            fd.append("file", file);
            fd.append("folder", folder);
            return fetch("/api/upload", {
                method: "POST",
                headers: token ? { Authorization: `Bearer ${token}` } : {},
                body: fd,
            });
        };
        try {
            let res = await doUpload();
            // A cached fp_user with a missing/expired fp_token looks fully logged in
            // but 401s here — AuthContext re-issues one on mount, but if that hasn't
            // landed yet (or this token is genuinely stale), get a fresh one and retry
            // once instead of surfacing "Unauthorized" for something the seller can't fix.
            if (res.status === 401 && user?.email) {
                const tokenRes = await fetch("/api/auth/issue-token", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email: user.email }),
                });
                if (tokenRes.ok) {
                    const { token: freshToken } = await tokenRes.json();
                    if (freshToken) {
                        token = freshToken;
                        localStorage.setItem("fp_token", freshToken);
                        res = await doUpload();
                    }
                }
            }
            const data = await res.json();
            if (!res.ok || !data.url) {
                setUploadError(data.error || "Upload failed. Please try again.");
                return null;
            }
            return data.url;
        } catch {
            setUploadError("Upload failed — check your connection and try again.");
            return null;
        }
    };
    const [businessName, setBusinessName] = useState("");
    const [businessCategory, setBusinessCategory] = useState("");
    const [whatsappNumber, setWhatsappNumber] = useState("");
    const [waSameAsPhone, setWaSameAsPhone] = useState(true);
    const [storeUrl, setStoreUrl] = useState("");
    // Tracks whether the seller manually edited the Store URL. Until they do, we
    // auto-prefill it from the Business Name (slugified) so they don't have to type it.
    const [storeUrlTouched, setStoreUrlTouched] = useState(false);
    const slugifyStoreUrl = (s: string) =>
        s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    const [streetAddress, setStreetAddress] = useState("");
    const [city, setCity] = useState("");
    const [stateRegion, setStateRegion] = useState("");
    const [phoneNumbers, setPhoneNumbers] = useState("");
    const [isRegistered, setIsRegistered] = useState(false);
    const [cacNumber, setCacNumber] = useState("");
    const [cacFileName, setCacFileName] = useState<string | null>(null);
    const [idType, setIdType] = useState<string>("");
    const [weeklyOrders, setWeeklyOrders] = useState("");
    const [currencies, setCurrencies] = useState<string[]>([]);
    const [staffCount, setStaffCount] = useState("");
    const [physicalStores, setPhysicalStores] = useState("");
    const [bankName, setBankName] = useState("");
    const [accountNumber, setAccountNumber] = useState("");
    const [accountName, setAccountName] = useState("");
    const [isResolving, setIsResolving] = useState(false);
    const [resolutionError, setResolutionError] = useState("");
    const [sellerRole, setSellerRole] = useState<string>("");
    const [logoFile, setLogoFile] = useState<string | null>(null);
    const logoInputRef = useRef<HTMLInputElement>(null);

    const BANK_CODES: Record<string, string> = {
        "Access Bank": "044",
        "First Bank of Nigeria": "011",
        "Guaranty Trust Bank (GTBank)": "058",
        "United Bank for Africa (UBA)": "033",
        "Zenith Bank": "057",
        "Ecobank Nigeria": "050",
        "Fidelity Bank": "070",
        "First City Monument Bank (FCMB)": "214",
        "Kuda Microfinance Bank": "50211",
        "Moniepoint": "50515",
        "OPay": "100004",
        "PalmPay": "100033",
        "Wema Bank": "035"
    };

    useEffect(() => {
        const resolveAccount = async () => {
            if (accountNumber.length === 10 && bankName) {
                const code = BANK_CODES[bankName];
                if (!code) return;

                setIsResolving(true);
                setResolutionError("");

                try {
                    const res = await fetch(`/api/payouts/verify?account_number=${accountNumber}&bank_code=${code}`);
                    const data = await res.json();
                    if (data.success) {
                        setAccountName(data.account_name);
                    } else {
                        setResolutionError(data.error || "Could not resolve account");
                        setAccountName("");
                    }
                } catch (err) {
                    setResolutionError("Network error during verification");
                } finally {
                    setIsResolving(false);
                }
            }
        };

        const timer = setTimeout(resolveAccount, 500);
        return () => clearTimeout(timer);
    }, [accountNumber, bankName]);
    const { user, isLoading: isAuthLoading, updateUser } = useAuth();
    
    useEffect(() => {
        if (!isAuthLoading && !user) {
            router.push("/login?returnUrl=/seller/onboarding");
        }
    }, [user, isAuthLoading, router]);

    const toggleCurrency = (currency: string) => {
        setCurrencies(prev =>
            prev.includes(currency) ? prev.filter(c => c !== currency) : [...prev, currency]
        );
    };

    const [validationErrors, setValidationErrors] = useState<string[]>([]);

    const validateStep = (currentStep: number): boolean => {
        const errors: string[] = [];
        if (currentStep === 1) {
            if (!sellerRole) errors.push("Please select your role");
        } else if (currentStep === 2) {
            if (!businessName.trim()) errors.push("Business Name is required");
            if (!businessCategory) errors.push("Business Category is required");
            if (!storeUrl.trim()) errors.push("Store URL is required");
            if (!streetAddress.trim()) errors.push("Street Address is required");
            if (!stateRegion) errors.push("State is required");
            if (!city) errors.push("City is required");
            if (!phoneNumbers.trim()) errors.push("At least one phone number is required");
            if (!weeklyOrders) errors.push("Weekly orders selection is required");
            if (!staffCount) errors.push("Staff count selection is required");
            if (!physicalStores) errors.push("Number of physical stores is required");
            if (currencies.length === 0) errors.push("Select at least one currency");
            if (isRegistered) {
                if (!cacNumber.trim()) errors.push("RC Number is required for registered businesses");
                if (!cacFileName) errors.push("CAC Certificate is required for registered businesses");
            }
        } else if (currentStep === 3) {
            if (!idType) errors.push("Please select a document type");
            if (!fileName) errors.push("Please upload your ID document");
        }
        setValidationErrors(errors);
        return errors.length === 0;
    };

    const nextStep = () => {
        if (validateStep(step)) {
            setValidationErrors([]);
            setStep(step + 1);
        }
    };
    const prevStep = () => { setValidationErrors([]); setStep(step - 1); };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setFileName(file.name);
        setUploadError(null);
        setUploadingId(true);
        const url = await uploadKycFile(file, "kyc");
        setUploadingId(false);
        if (url) setIdDocumentUrl(url);
        else setFileName(null); // upload failed — don't let submission proceed with a fake reference
    };

    const handleSubmit = async () => {
        setIsLoading(true);

        // Every new seller previously started "pending" and their products were
        // force-set isActive:false server-side until an admin manually approved
        // them — invisible to buyers with no self-serve path around it. Respect
        // the admin's "Strict Seller Onboarding" setting instead of hardcoding
        // manual review: off (the new default) means sellers and their products
        // go live the moment onboarding finishes.
        let requiresManualReview = false;
        try {
            const settingsRes = await fetch("/api/admin/settings");
            if (settingsRes.ok) {
                const settings = await settingsRes.json();
                requiresManualReview = !!settings.strictSeller;
            }
        } catch { /* default to auto-active if settings are unreachable */ }

        const currentSeller = DataSyncService.getCurrentSeller();
        // Force the seller ID to match the user's custom store URL input for aesthetic links, falling back to user ID or random
        const sellerId = currentSeller?.id || storeUrl || user?.id || `s_${Math.random().toString(36).substr(2, 9)}`;

        const sellerUpdates: Partial<Seller> = {
            business_name: businessName || (user ? `${user.name}'s Shop` : "New Seller"),
            description: "A new seller on FairPrice",
            category: businessCategory || "electronics",
            store_url: storeUrl,
            street_address: streetAddress,
            city: city,
            state: stateRegion,
            location: `${city}, ${stateRegion}`,
            phone_number: phoneNumbers.split(",")[0].trim(),
            phone_numbers: phoneNumbers.split(",").map(p => p.trim()).filter(Boolean),
            whatsapp: (waSameAsPhone ? phoneNumbers.split(",")[0].trim() : whatsappNumber) || undefined,
            business_registered: isRegistered,
            cac_rc_number: isRegistered ? cacNumber : undefined,
            cac_document_url: isRegistered ? (cacDocumentUrl || undefined) : undefined,
            id_document_url: idDocumentUrl || undefined,
            weekly_orders: weeklyOrders,
            currencies: currencies,
            staff_count: staffCount,
            physical_stores: physicalStores,
            verified: !requiresManualReview,
            rating: 0,
            trust_score: 50,
            status: requiresManualReview ? "pending" : "active",
            kyc_status: "pending",
            bank_name: bankName || undefined,
            account_number: accountNumber || undefined,
            account_name: accountName || undefined,
            logo_url: logoFile || ("https://ui-avatars.com/api/?name=" + encodeURIComponent(businessName || "Shop") + "&background=random"),
            seller_role: sellerRole,
        };

        if (currentSeller) {
            DataSyncService.updateSeller(sellerId, sellerUpdates);
        } else {
            // New seller onboarding
            DataSyncService.addSeller({
                ...sellerUpdates,
                id: sellerId,
                user_id: user?.id || sellerId,
                owner_email: user?.email || (businessName + "@fairprice.ng").replace(/\s+/g, '').toLowerCase(),
                owner_name: user?.name || businessName,
                created_at: new Date().toISOString()
            } as Seller);
            DataSyncService.loginSeller(sellerId);
        }

        // Create KYC submission so admin sees it in dashboard.
        // Previously local-only (DataSyncService.addKYCSubmission never reaches the
        // server) AND built a fake "/mock/kyc/..." document URL — combined, admin
        // verification could never see a submission OR a real document, regardless
        // of what the seller actually uploaded. Now POSTs the real Blob URL to the
        // DB directly, same pattern as the review-submission fix.
        const ID_TYPE_MAP: Record<string, string> = {
            "NIN Slip": "nin",
            "Intl. Passport": "passport",
            "Driver License": "drivers_license",
        };
        if (idDocumentUrl) {
            try {
                await fetch("/api/kyc", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        seller_id: sellerId,
                        seller_name: businessName || "New Seller",
                        id_type: ID_TYPE_MAP[idType] || "nin",
                        id_number: "N/A",
                        document_url: idDocumentUrl,
                    }),
                });
            } catch { /* non-fatal — seller can re-submit from settings if this fails */ }
        }

        DataSyncService.addNotification({
            userId: sellerId,
            type: "system",
            message: `Welcome to FairPrice! Your KYC details are currently under review. While you wait for verification, you can already start uploading products to your store.`,
            link: "/seller/settings"
        });

        if (fromProductId) {
            // The product they created via the Sell button before finishing
            // onboarding — confirm it's actually live now that the store exists,
            // and give them a direct tap-through to see it on their new storefront.
            DataSyncService.addNotification({
                userId: sellerId,
                type: "system",
                message: `🎉 Your store is set up and "${fromProductId.replace(/-/g, " ")}" is now live! Tap to view it on your storefront.`,
                link: `/store/${storeUrl || sellerId}`
            });
        }

        if (user) {
            updateUser({ role: 'seller' });
        }

        try {
            await fetch('/api/email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: user?.email,
                    type: 'SELLER_WELCOME',
                    payload: { name: businessName }
                })
            });
        } catch (e) { }

        // Admin notification (in-app bell) for KYC review
        DataSyncService.addNotification({
            type: "system",
            title: "New Seller KYC Submitted",
            message: `${businessName || "A new seller"} has completed onboarding and is awaiting approval.`,
            userId: "admin",
            link: `/admin/users/${sellerId}`,
        });

        // Admin email via Resend
        try {
            await fetch('/api/email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: process.env.NEXT_PUBLIC_ESCALATION_EMAIL || 'techzema@gmail.com',
                    type: 'ADMIN_NEW_KYC',
                    payload: {
                        businessName: businessName || "New Seller",
                        ownerEmail: user?.email || "unknown",
                        reviewUrl: `${window.location.origin}/admin/users/${sellerId}`,
                    }
                })
            });
        } catch (e) { }

        // Track seller onboarding completed
        if (typeof window !== "undefined" && (window as any).pendo) {
            (window as any).pendo.track("seller_onboarding_completed", {
                seller_role: sellerRole,
                business_name: businessName || "",
                state: stateRegion || "",
                city: city || "",
                is_registered_business: isRegistered,
                has_cac: !!cacNumber,
                has_bank_details: !!(bankName && accountNumber),
                weekly_orders: weeklyOrders || "",
                staff_count: staffCount || "",
                physical_stores: physicalStores || "",
                currencies: currencies.join(","),
            });
        }

        setTimeout(() => {
            router.push("/seller/dashboard");
        }, 100);
    };

    return (
        <div suppressHydrationWarning className="h-[100dvh] overflow-y-auto bg-gray-50 pb-32">
            <InstallBanner />
            <div className="py-12 px-4 sm:px-6">
            {/* Progress Bar */}
            <div className="w-full max-w-2xl mx-auto mb-8">
                <div className="flex justify-between mb-2">
                    {["Role", "Business Info", "Identity", "Bank Details", "Review"].map((label, i) => (
                        <div key={i} className={`text-xs font-bold ${step > i + 1 ? "text-brand-green-600" : step === i + 1 ? "text-black" : "text-gray-400"}`}>
                            {label}
                        </div>
                    ))}
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <motion.div
                        className="h-full bg-brand-green-600"
                        initial={{ width: 0 }}
                        animate={{ width: `${(step / 5) * 100}%` }}
                        transition={{ type: "spring", stiffness: 100 }}
                    />
                </div>
            </div>

            <div className="w-full max-w-2xl mx-auto bg-white rounded-2xl shadow-xl border overflow-hidden">
                <div className="bg-brand-green-600 p-6 text-white text-center">
                    <h1 className="text-2xl font-bold">Seller Onboarding</h1>
                    <p className="text-green-100 text-sm">Empowering Nigerian businesses with global reach.</p>
                </div>

                <form onSubmit={(e) => {
                    e.preventDefault();
                    if (step < 5) nextStep();
                    else handleSubmit();
                }}>
                    <div className="p-8">
                        <AnimatePresence mode="wait">

                            {/* Step 1: Role Selection */}
                            {step === 1 && (
                                <motion.div
                                    key="step0"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-6"
                                >
                                    <div className="text-center mb-8">
                                        <h2 className="text-2xl font-black text-gray-900 mb-2">Which best describes you?</h2>
                                        <p className="text-sm text-gray-500">Choose the profile that matches your business model.</p>
                                    </div>

                                    <div className="grid grid-cols-1 gap-4">
                                        {[
                                            { 
                                                id: "entrepreneur", 
                                                title: "Aspiring Entrepreneur", 
                                                desc: "I have some things to sell and want to get started.", 
                                                icon: <User className="h-6 w-6" /> 
                                            },
                                            { 
                                                id: "merchant", 
                                                title: "Merchant", 
                                                desc: "I have a physical store and want to sell online.", 
                                                icon: <Building className="h-6 w-6" /> 
                                            },
                                            { 
                                                id: "supplier", 
                                                title: "Supplier", 
                                                desc: "I import or manufacture goods and sell in large quantities.", 
                                                icon: <Box className="h-6 w-6" /> 
                                            },
                                        ].map((role) => (
                                            <div
                                                key={role.id}
                                                onClick={() => setSellerRole(role.id)}
                                                className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex items-center gap-4 ${sellerRole === role.id ? "border-brand-green-600 bg-brand-green-50 shadow-md" : "border-gray-100 bg-white hover:border-brand-green-200 hover:bg-gray-50"}`}
                                            >
                                                <div className={`p-3 rounded-xl ${sellerRole === role.id ? "bg-brand-green-600 text-white" : "bg-gray-100 text-gray-500"}`}>
                                                    {role.icon}
                                                </div>
                                                <div className="flex-1">
                                                    <h3 className={`font-bold ${sellerRole === role.id ? "text-brand-green-900" : "text-gray-900"}`}>{role.title}</h3>
                                                    <p className="text-xs text-gray-500">{role.desc}</p>
                                                </div>
                                                {sellerRole === role.id && (
                                                    <div className="bg-brand-green-600 rounded-full p-1">
                                                        <Check className="h-3 w-3 text-white" />
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    
                                    <div className="text-center pt-4">
                                        <p className="text-xs text-gray-500">
                                            Already have a seller account? <a href="/login" className="text-brand-green-600 font-bold hover:underline">Log in here</a>
                                        </p>
                                    </div>
                                </motion.div>
                            )}

                            {/* Step 2: Business Info */}
                            {step === 2 && (
                                <motion.div
                                    key="step1"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-4"
                                >
                                    <div className="mb-4">
                                        <h2 className="text-2xl font-bold text-gray-900 mb-1">Tell us a little bit about your business.</h2>
                                        <p className="text-sm text-gray-500">This helps us customize your experience.</p>
                                    </div>

                                    <div className="flex flex-col items-center justify-center py-4 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                                        <div 
                                            className="w-20 h-20 rounded-full bg-white border-2 border-brand-green-100 flex items-center justify-center overflow-hidden cursor-pointer hover:border-brand-green-500 transition-colors shadow-sm"
                                            onClick={() => logoInputRef.current?.click()}
                                        >
                                            {logoFile ? (
                                                <img src={logoFile} alt="Logo" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="flex flex-col items-center justify-center text-gray-400">
                                                    <Camera className="h-6 w-6" />
                                                    <span className="text-[10px] font-bold mt-1">LOGO</span>
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-[10px] font-bold text-brand-green-600 mt-2 cursor-pointer hover:underline" onClick={() => logoInputRef.current?.click()}>
                                            {logoFile ? "Change Business Logo" : "Upload Business Logo"}
                                        </p>
                                        <input
                                            type="file"
                                            ref={logoInputRef}
                                            className="hidden"
                                            accept="image/*"
                                            onChange={async (e) => {
                                                const file = e.target.files?.[0];
                                                if (!file) return;
                                                try {
                                                    const token = typeof window !== "undefined" ? localStorage.getItem("fp_token") : null;
                                                    const fd = new FormData();
                                                    fd.append("file", file, file.name || "logo.jpg");
                                                    const res = await fetch("/api/upload", {
                                                        method: "POST",
                                                        headers: token ? { Authorization: `Bearer ${token}` } : {},
                                                        body: fd,
                                                    });
                                                    if (res.ok) {
                                                        const data = await res.json();
                                                        if (data.url) { setLogoFile(data.url); return; }
                                                    }
                                                } catch { /* fall through to base64 */ }
                                                const reader = new FileReader();
                                                reader.onload = (ev) => setLogoFile(ev.target?.result as string);
                                                reader.readAsDataURL(file);
                                            }}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Business Name *</label>
                                        <Input
                                            placeholder="E.g. Ore's Gloss Hub"
                                            value={businessName}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setBusinessName(val);
                                                // Auto-fill the Store URL from the name until the seller edits it themselves
                                                if (!storeUrlTouched) setStoreUrl(slugifyStoreUrl(val));
                                            }}
                                            className="border border-gray-300"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Business Category *</label>
                                        <select
                                            value={businessCategory}
                                            onChange={(e) => setBusinessCategory(e.target.value)}
                                            className="w-full border border-gray-300 rounded-md h-10 px-3 text-sm"
                                            required
                                        >
                                            <option value="">Select what you mostly sell</option>
                                            {CATEGORIES.filter(c => !c.adminOnly && c.value !== "all").map(c => (
                                                <option key={c.value} value={c.value}>{c.label}</option>
                                            ))}
                                        </select>
                                        <p className="text-[11px] text-gray-500">This decides which store category and filters your products appear under.</p>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Business Phone Number(s) *</label>
                                        <Input
                                            placeholder="E.g. +2348012345678, +2349012345678"
                                            value={phoneNumbers}
                                            onChange={(e) => setPhoneNumbers(e.target.value)}
                                            className="border border-gray-300"
                                            required
                                        />
                                        <p className="text-[11px] text-gray-500">Separate multiple numbers with commas.</p>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">WhatsApp Number</label>
                                        <div className="flex items-center gap-2 mb-1">
                                            <input
                                                type="checkbox"
                                                id="wa-same-as-phone"
                                                checked={waSameAsPhone}
                                                onChange={(e) => {
                                                    setWaSameAsPhone(e.target.checked);
                                                    if (e.target.checked) setWhatsappNumber(phoneNumbers.split(",")[0].trim());
                                                }}
                                                className="h-4 w-4"
                                            />
                                            <label htmlFor="wa-same-as-phone" className="text-xs text-gray-600">Same as my business phone number</label>
                                        </div>
                                        <Input
                                            placeholder="E.g. +2348012345678"
                                            value={waSameAsPhone ? phoneNumbers.split(",")[0].trim() : whatsappNumber}
                                            onChange={(e) => setWhatsappNumber(e.target.value)}
                                            disabled={waSameAsPhone}
                                            className="border border-gray-300 disabled:bg-gray-50 disabled:text-gray-500"
                                        />
                                        <p className="text-[11px] text-gray-500">Unlocks WhatsApp features — QR/payment link generation, product upload, and order chat straight from WhatsApp.</p>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Store URL *</label>
                                        <div className="flex">
                                            <div className="bg-gray-100 flex items-center px-4 rounded-l-md border border-gray-300 border-r-0 text-gray-500 text-sm font-medium">
                                                fairprice.ng/store/
                                            </div>
                                            <Input
                                                placeholder="oresglosshub"
                                                value={storeUrl}
                                                onChange={(e) => { setStoreUrlTouched(true); setStoreUrl(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')); }}
                                                className="rounded-l-none border-l-0 border border-gray-300 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-brand-green-600"
                                                required
                                            />
                                        </div>
                                        <p className="text-[11px] text-gray-500">You can unlock a custom .fairprice.ng subdomain on the Pro plan.</p>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Street Address *</label>
                                            <Input
                                                placeholder="E.g. 123 Main Street"
                                                value={streetAddress}
                                                onChange={(e) => setStreetAddress(e.target.value)}
                                                className="border border-gray-300"
                                                required
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">State *</label>
                                                <select
                                                    value={stateRegion}
                                                    onChange={(e) => { setStateRegion(e.target.value); setCity(""); }}
                                                    className="flex h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green-600 focus-visible:border-transparent"
                                                    required
                                                >
                                                    <option value="">Select State</option>
                                                    {NIGERIAN_STATES.map((s) => (
                                                        <option key={s.state} value={s.state}>{s.state}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">City *</label>
                                                <select
                                                    value={city}
                                                    onChange={(e) => setCity(e.target.value)}
                                                    className="flex h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green-600 focus-visible:border-transparent disabled:opacity-50"
                                                    required
                                                    disabled={!stateRegion}
                                                >
                                                    <option value="">Select City</option>
                                                    {stateRegion && NIGERIAN_STATES.find(s => s.state === stateRegion)?.cities.map((c) => (
                                                        <option key={c} value={c}>{c}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-3 p-4 bg-gray-50 border border-gray-100 rounded-xl">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <label className="text-sm font-bold text-gray-900 block">Is your business registered with CAC?</label>
                                                <p className="text-xs text-gray-500">Increases trust score slightly</p>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input type="checkbox" className="sr-only peer" checked={isRegistered} onChange={(e) => setIsRegistered(e.target.checked)} />
                                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-green-600"></div>
                                            </label>
                                        </div>
                                        <AnimatePresence>
                                            {isRegistered && (
                                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="space-y-3 overflow-hidden pt-2 border-t border-gray-200 mt-3">
                                                    <div className="space-y-2">
                                                        <label className="text-sm font-medium">RC Number *</label>
                                                        <Input
                                                            placeholder="RC1234567"
                                                            value={cacNumber}
                                                            onChange={(e) => setCacNumber(e.target.value)}
                                                            className="border border-gray-300"
                                                            required={isRegistered}
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-sm font-medium">Upload CAC Certificate *</label>
                                                        <div className="border border-dashed border-gray-300 rounded-lg p-4 text-center">
                                                            {uploadingCac ? (
                                                                <div className="flex items-center justify-center gap-2 text-gray-500">
                                                                    <span className="text-sm font-medium">Uploading…</span>
                                                                </div>
                                                            ) : cacFileName ? (
                                                                <div className="flex items-center justify-center gap-2 text-brand-green-600">
                                                                    <Check className="h-4 w-4" />
                                                                    <span className="text-sm font-medium">{cacFileName}</span>
                                                                </div>
                                                            ) : (
                                                                <label className="cursor-pointer">
                                                                    <span className="text-brand-green-600 text-sm font-bold hover:underline">Click to upload</span>
                                                                    <span className="text-gray-500 text-sm"> or drag and drop</span>
                                                                    <input
                                                                        type="file"
                                                                        className="hidden"
                                                                        accept="image/*,.pdf"
                                                                        onChange={async (e) => {
                                                                            const file = e.target.files?.[0];
                                                                            if (!file) return;
                                                                            setCacFileName(file.name);
                                                                            setUploadError(null);
                                                                            setUploadingCac(true);
                                                                            const url = await uploadKycFile(file, "cac");
                                                                            setUploadingCac(false);
                                                                            if (url) setCacDocumentUrl(url);
                                                                            else setCacFileName(null);
                                                                        }}
                                                                    />
                                                                </label>
                                                            )}
                                                        </div>
                                                        {uploadError && <p className="text-xs text-rose-600 mt-1">{uploadError}</p>}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">How many orders do you get weekly? *</label>
                                            <select
                                                value={weeklyOrders}
                                                onChange={(e) => setWeeklyOrders(e.target.value)}
                                                className="flex h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green-600 focus-visible:border-transparent"
                                                required
                                            >
                                                <option value="">Select an option</option>
                                                <option value="Just starting">I'm just starting out</option>
                                                <option value="1-10">1 to 10 orders</option>
                                                <option value="11-50">11 to 50 orders</option>
                                                <option value="51-100">51 to 100 orders</option>
                                                <option value="100+">More than 100 orders</option>
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">How many staff do you have? *</label>
                                            <select
                                                value={staffCount}
                                                onChange={(e) => setStaffCount(e.target.value)}
                                                className="flex h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green-600 focus-visible:border-transparent"
                                                required
                                            >
                                                <option value="">Select an option</option>
                                                <option value="Just me">Just me</option>
                                                <option value="2-5">2 to 5 staff</option>
                                                <option value="6-10">6 to 10 staff</option>
                                                <option value="11+">11 or more staff</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">How many physical stores do you have? *</label>
                                            <select
                                                value={physicalStores}
                                                onChange={(e) => setPhysicalStores(e.target.value)}
                                                className="flex h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green-600 focus-visible:border-transparent"
                                                required
                                            >
                                                <option value="">Select an option</option>
                                                <option value="None (Online only)">None (Online only)</option>
                                                <option value="1">1</option>
                                                <option value="2-3">2 to 3</option>
                                                <option value="4+">4 or more</option>
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium mb-1 block">Currencies you receive payment in *</label>
                                            <div className="grid grid-cols-2 gap-2 mt-1">
                                                {["NGN (₦)", "USD ($)", "EUR (€)", "GBP (£)"].map((curr) => (
                                                    <div
                                                        key={curr}
                                                        onClick={() => toggleCurrency(curr)}
                                                        className={`border rounded-md px-3 py-2 text-sm text-center cursor-pointer transition-colors select-none ${currencies.includes(curr) ? "bg-brand-green-50 border-brand-green-600 text-brand-green-700 font-medium" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"}`}
                                                    >
                                                        {curr}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* Step 3: Identity Verification */}
                            {step === 3 && (
                                <motion.div
                                    key="step2"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-4"
                                >
                                    <div className="flex items-center gap-3 mb-4 text-brand-green-600">
                                        <User className="h-6 w-6" />
                                        <h2 className="text-xl font-bold">Identity Verification</h2>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Document Type <span className="text-gray-400 font-normal">(choose one)</span></label>
                                        <div className="grid grid-cols-3 gap-3">
                                            {["NIN Slip", "Intl. Passport", "Driver License"].map(doc => (
                                                <div
                                                    key={doc}
                                                    onClick={() => setIdType(doc)}
                                                    className={`relative border-2 rounded-lg p-3 text-center cursor-pointer transition-all ${idType === doc ? "bg-brand-green-50 border-brand-green-600 text-brand-green-700 font-bold shadow-sm" : "border-gray-200 hover:border-brand-green-400 hover:bg-green-50"}`}
                                                >
                                                    {idType === doc && (
                                                        <span className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-brand-green-600 text-white flex items-center justify-center">
                                                            <Check className="h-3 w-3" />
                                                        </span>
                                                    )}
                                                    {doc}
                                                </div>
                                            ))}
                                        </div>
                                        {!idType && (
                                            <p className="text-[11px] text-amber-600">Tap ONE of the three above — you only need to upload one document below, not all three.</p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Upload Document *</label>
                                        <div
                                            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:bg-gray-50 transition"
                                            onClick={() => fileInputRef.current?.click()}
                                        >
                                            {uploadingId ? (
                                                <div className="flex flex-col items-center justify-center gap-2">
                                                    <span className="text-sm font-medium text-gray-500">Uploading…</span>
                                                </div>
                                            ) : fileName ? (
                                                <div className="flex flex-col items-center justify-center gap-2">
                                                    <div className="h-16 w-16 bg-brand-green-50 rounded-xl flex items-center justify-center mb-1">
                                                        <Check className="h-8 w-8 text-brand-green-600" />
                                                    </div>
                                                    <span className="text-sm font-medium text-gray-900">{fileName}</span>
                                                    <button onClick={(e) => { e.stopPropagation(); setFileName(null); setIdDocumentUrl(null); }} className="text-xs text-rose-500 hover:underline">Remove</button>
                                                </div>
                                            ) : (
                                                <>
                                                    <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                                                    <p className="text-sm text-gray-600">
                                                        Click to upload your ID document
                                                    </p>
                                                    <p className="text-xs text-gray-400 mt-1">JPG, PNG or PDF (Max 10MB)</p>
                                                </>
                                            )}
                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                className="hidden"
                                                accept=".jpg,.jpeg,.png,.pdf"
                                                onChange={handleFileChange}
                                            />
                                        </div>
                                        {uploadError && <p className="text-xs text-rose-600 mt-1">{uploadError}</p>}
                                    </div>
                                </motion.div>
                            )}

                            {/* Step 4: Bank Details */}
                            {step === 4 && (
                                <motion.div
                                    key="step3"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-4"
                                >
                                    <div className="flex items-center gap-3 mb-4 text-brand-green-600">
                                        <CreditCard className="h-6 w-6" />
                                        <h2 className="text-xl font-bold">Bank Account</h2>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Bank Name</label>
                                        <select
                                            value={bankName}
                                            onChange={(e) => setBankName(e.target.value)}
                                            className="flex h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green-600"
                                        >
                                            <option value="">Select Bank</option>
                                            <option value="Access Bank">Access Bank</option>
                                            <option value="Citibank Nigeria">Citibank Nigeria</option>
                                            <option value="Ecobank Nigeria">Ecobank Nigeria</option>
                                            <option value="Fidelity Bank">Fidelity Bank</option>
                                            <option value="First Bank of Nigeria">First Bank of Nigeria</option>
                                            <option value="First City Monument Bank">First City Monument Bank</option>
                                            <option value="Globus Bank">Globus Bank</option>
                                            <option value="Guaranty Trust Bank (GTBank)">Guaranty Trust Bank (GTBank)</option>
                                            <option value="Heritage Banking Company">Heritage Banking Company</option>
                                            <option value="Keystone Bank">Keystone Bank</option>
                                            <option value="Kuda Microfinance Bank">Kuda Microfinance Bank</option>
                                            <option value="Moniepoint">Moniepoint</option>
                                            <option value="OPay">OPay</option>
                                            <option value="PalmPay">PalmPay</option>
                                            <option value="Polaris Bank">Polaris Bank</option>
                                            <option value="Providus Bank">Providus Bank</option>
                                            <option value="Stanbic IBTC Bank">Stanbic IBTC Bank</option>
                                            <option value="Standard Chartered Bank">Standard Chartered Bank</option>
                                            <option value="Sterling Bank">Sterling Bank</option>
                                            <option value="SunTrust Bank">SunTrust Bank</option>
                                            <option value="Titan Trust Bank">Titan Trust Bank</option>
                                            <option value="Union Bank of Nigeria">Union Bank of Nigeria</option>
                                            <option value="United Bank for Africa (UBA)">United Bank for Africa (UBA)</option>
                                            <option value="Unity Bank">Unity Bank</option>
                                            <option value="Wema Bank">Wema Bank</option>
                                            <option value="Zenith Bank">Zenith Bank</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Account Number *</label>
                                        <Input
                                            placeholder="0123456789"
                                            maxLength={10}
                                            value={accountNumber}
                                            onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                                            className={`border ${resolutionError ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
                                        />
                                        {resolutionError && <p className="text-[10px] text-red-500 font-bold mt-1">{resolutionError}</p>}
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium flex items-center justify-between">
                                            <span>Account Name</span>
                                            {isResolving && <span className="text-[10px] text-emerald-600 animate-pulse font-black">Verifying...</span>}
                                        </label>
                                        <Input
                                            placeholder={isResolving ? "Fetching..." : "Auto-resolved from bank"}
                                            value={accountName}
                                            readOnly={accountNumber.length === 10 && !!bankName}
                                            onChange={e => setAccountName(e.target.value)}
                                            className={`border transition-all ${accountNumber.length === 10 && !!bankName ? 'bg-gray-50 font-bold text-emerald-700' : 'border-gray-300'}`}
                                        />
                                    </div>
                                </motion.div>
                            )}

                            {/* Step 5: Submission */}
                            {step === 5 && (
                                <motion.div
                                    key="step4"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="text-center py-8"
                                >
                                    <div className="w-20 h-20 bg-green-100 text-brand-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <Check className="h-10 w-10" />
                                    </div>
                                    <h2 className="text-2xl font-bold mb-2">You're almost there!</h2>
                                    <p className="text-gray-600 mb-8 max-w-md mx-auto">
                                        By clicking Submit, you agree to FairPrice's Seller Code of Conduct. Your application will be reviewed by our compliance team within 24 hours.
                                    </p>
                                </motion.div>
                            )}

                        </AnimatePresence>

                        {/* Validation Errors */}
                        {validationErrors.length > 0 && (
                            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl">
                                <p className="text-xs font-bold text-red-700 mb-1">Please fix the following:</p>
                                <ul className="text-xs text-red-600 space-y-0.5 list-disc pl-4">
                                    {validationErrors.map((err, i) => (
                                        <li key={i}>{err}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>

                    {/* Footer Buttons */}
                    <div className="p-6 bg-gray-50 border-t flex justify-between">
                        <Button
                            variant="ghost"
                            onClick={prevStep}
                            disabled={step === 1 || isLoading}
                            className="text-gray-500"
                        >
                            Back
                        </Button>

                        {step < 5 ? (
                            <Button type="submit" className="bg-brand-green-600 hover:bg-brand-green-700">
                                Next Step <ChevronRight className="ml-2 h-4 w-4" />
                            </Button>
                        ) : (
                            <Button
                                type="submit"
                                disabled={isLoading}
                                className="bg-brand-green-600 hover:bg-brand-green-700 px-6"
                            >
                                {isLoading ? "Submitting..." : "Submit Application"}
                            </Button>
                        )}
                    </div>
                </form>
            </div>
            </div>
        </div>
    );
}
