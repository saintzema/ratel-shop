"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, ChevronRight, Upload, Building, User, CreditCard } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { DemoStore } from "@/lib/demo-store";
import { Seller } from "@/lib/types";
import { NIGERIAN_STATES } from "@/lib/nigerian-states";

export default function KYCOnboarding() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [fileName, setFileName] = useState<string | null>(null);
    const [businessName, setBusinessName] = useState("");
    const [storeUrl, setStoreUrl] = useState("");
    const [streetAddress, setStreetAddress] = useState("");
    const [city, setCity] = useState("");
    const [stateRegion, setStateRegion] = useState("");
    const [isRegistered, setIsRegistered] = useState(false);
    const [cacNumber, setCacNumber] = useState("");
    const [cacFileName, setCacFileName] = useState<string | null>(null);
    const [idType, setIdType] = useState<string>("");
    const [weeklyOrders, setWeeklyOrders] = useState("");
    const [currencies, setCurrencies] = useState<string[]>([]);
    const [staffCount, setStaffCount] = useState("");
    const [physicalStores, setPhysicalStores] = useState("");
    const [accountName, setAccountName] = useState("");
    const { user, updateUser } = useAuth();

    const toggleCurrency = (currency: string) => {
        setCurrencies(prev =>
            prev.includes(currency) ? prev.filter(c => c !== currency) : [...prev, currency]
        );
    };

    const nextStep = () => setStep(step + 1);
    const prevStep = () => setStep(step - 1);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFileName(e.target.files[0].name);
        }
    };

    const handleSubmit = async () => {
        setIsLoading(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 2000));

        const sellerId = `s_${Math.random().toString(36).substr(2, 9)}`;
        const newSeller: Seller = {
            id: sellerId,
            user_id: user?.id || "",
            business_name: businessName || (user ? `${user.name}'s Shop` : "New Seller"),
            description: "A new seller on FairPrice",
            category: "electronics",
            store_url: storeUrl,
            street_address: streetAddress,
            city: city,
            state: stateRegion,
            location: `${city}, ${stateRegion}`,
            business_registered: isRegistered,
            cac_rc_number: isRegistered ? cacNumber : undefined,
            cac_document_url: isRegistered && cacFileName ? `/mock/cac/${cacFileName}` : undefined,
            weekly_orders: weeklyOrders,
            currencies: currencies,
            staff_count: staffCount,
            physical_stores: physicalStores,
            verified: false,
            rating: 0,
            trust_score: 50,
            status: "pending",
            kyc_status: "pending",
            logo_url: "https://ui-avatars.com/api/?name=" + encodeURIComponent(businessName || "Shop") + "&background=random",
            created_at: new Date().toISOString()
        };

        DemoStore.addSeller(newSeller);
        DemoStore.loginSeller(sellerId);

        DemoStore.addNotification({
            userId: sellerId,
            type: "system",
            message: `Welcome to FairPrice! Your business profile for ${businessName} has been created.`,
            link: "/seller/settings"
        });

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

        setTimeout(() => {
            router.push("/seller/dashboard");
        }, 100);
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            {/* Progress Bar */}
            <div className="w-full max-w-2xl mb-8">
                <div className="flex justify-between mb-2">
                    {["Business Info", "Identity", "Bank Details", "Review"].map((label, i) => (
                        <div key={i} className={`text-xs font-bold ${step > i + 1 ? "text-brand-green-600" : step === i + 1 ? "text-black" : "text-gray-400"}`}>
                            {label}
                        </div>
                    ))}
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <motion.div
                        className="h-full bg-brand-green-600"
                        initial={{ width: 0 }}
                        animate={{ width: `${(step / 4) * 100}%` }}
                        transition={{ type: "spring", stiffness: 100 }}
                    />
                </div>
            </div>

            <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border overflow-hidden">
                <div className="bg-brand-green-600 p-6 text-white text-center">
                    <h1 className="text-2xl font-bold">Seller Verification</h1>
                    <p className="text-green-100 text-sm">Join Nigeria's most trusted marketplace. Let's get you verified.</p>
                </div>

                <div className="p-8">
                    <AnimatePresence mode="wait">

                        {/* Step 1: Business Info */}
                        {step === 1 && (
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

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Business Name *</label>
                                    <Input
                                        placeholder="E.g. Ore's Gloss Hub"
                                        value={businessName}
                                        onChange={(e) => setBusinessName(e.target.value)}
                                        className="border border-gray-300"
                                        required
                                    />
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
                                            onChange={(e) => setStoreUrl(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
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
                                                        {cacFileName ? (
                                                            <div className="flex items-center justify-center gap-2 text-brand-green-600">
                                                                <Check className="h-4 w-4" />
                                                                <span className="text-sm font-medium">{cacFileName}</span>
                                                            </div>
                                                        ) : (
                                                            <label className="cursor-pointer">
                                                                <span className="text-brand-green-600 text-sm font-bold hover:underline">Click to upload</span>
                                                                <span className="text-gray-500 text-sm"> or drag and drop</span>
                                                                <input type="file" className="hidden" onChange={(e) => e.target.files && setCacFileName(e.target.files[0].name)} accept="image/*,.pdf" />
                                                            </label>
                                                        )}
                                                    </div>
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

                        {/* Step 2: Identity Verification */}
                        {step === 2 && (
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
                                    <label className="text-sm font-medium">Document Type</label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {["NIN Slip", "Intl. Passport", "Driver License"].map(doc => (
                                            <div
                                                key={doc}
                                                onClick={() => setIdType(doc)}
                                                className={`border rounded-lg p-3 text-center cursor-pointer transition ${idType === doc ? "bg-brand-green-50 border-brand-green-600 text-brand-green-700 font-medium" : "hover:border-brand-green-600 hover:bg-green-50"}`}
                                            >
                                                {doc}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Upload Document *</label>
                                    <div
                                        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:bg-gray-50 transition"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        {fileName ? (
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                <div className="h-16 w-16 bg-brand-green-50 rounded-xl flex items-center justify-center mb-1">
                                                    <Check className="h-8 w-8 text-brand-green-600" />
                                                </div>
                                                <span className="text-sm font-medium text-gray-900">{fileName}</span>
                                                <button onClick={(e) => { e.stopPropagation(); setFileName(null); }} className="text-xs text-rose-500 hover:underline">Remove</button>
                                            </div>
                                        ) : (
                                            <>
                                                <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                                                <p className="text-sm text-gray-600">
                                                    Click to upload your ID document
                                                </p>
                                                <p className="text-xs text-gray-400 mt-1">JPG, PNG or PDF (Max 5MB)</p>
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
                                </div>
                            </motion.div>
                        )}

                        {/* Step 3: Bank Details */}
                        {step === 3 && (
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
                                    <select className="flex h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green-600">
                                        <option value="">Select Bank</option>
                                        <option value="Access Bank">Access Bank</option>
                                        <option value="Citibank Nigeria">Citibank Nigeria</option>
                                        <option value="Ecobank Nigeria">Ecobank Nigeria</option>
                                        <option value="Fidelity Bank">Fidelity Bank</option>
                                        <option value="First Bank of Nigeria">First Bank of Nigeria</option>
                                        <option value="First City Monument Bank">First City Monument Bank</option>
                                        <option value="Globus Bank">Globus Bank</option>
                                        <option value="Guaranty Trust Bank (GTB)">Guaranty Trust Bank (GTB)</option>
                                        <option value="Heritage Bank">Heritage Bank</option>
                                        <option value="Keystone Bank">Keystone Bank</option>
                                        <option value="Kuda Bank">Kuda Bank</option>
                                        <option value="Moniepoint">Moniepoint</option>
                                        <option value="Opay">Opay</option>
                                        <option value="Palmpay">Palmpay</option>
                                        <option value="Polaris Bank">Polaris Bank</option>
                                        <option value="Providus Bank">Providus Bank</option>
                                        <option value="Stanbic IBTC Bank">Stanbic IBTC Bank</option>
                                        <option value="Standard Chartered">Standard Chartered</option>
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
                                    <label className="text-sm font-medium">Account Number</label>
                                    <Input placeholder="0123456789" maxLength={10} className="border border-gray-300" />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Account Name</label>
                                    <Input
                                        placeholder="E.g. Oreoluwa Ajibola"
                                        value={accountName}
                                        onChange={e => setAccountName(e.target.value)}
                                        className="border border-gray-300"
                                    />
                                </div>
                            </motion.div>
                        )}

                        {/* Step 4: Submission */}
                        {step === 4 && (
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

                    {step < 4 ? (
                        <Button onClick={nextStep} className="bg-brand-green-600 hover:bg-brand-green-700">
                            Next Step <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                    ) : (
                        <Button
                            onClick={handleSubmit}
                            disabled={isLoading}
                            className="bg-brand-green-600 hover:bg-brand-green-700 px-6"
                        >
                            {isLoading ? "Submitting..." : "Submit Application"}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
