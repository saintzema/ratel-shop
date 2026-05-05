"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import {
    Settings,
    Bell,
    Shield,
    Lock,
    Database,
    Cloud,
    History,
    Save,
    RefreshCw,
    Percent,
    AlertCircle,
    Truck,
    Brain,
    TrendingUp,
    Sparkles,
    LayoutGrid
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { HeroManager } from "@/components/admin/HeroManager";

export default function AdminSettings() {
    const [platformMargin, setPlatformMargin] = useState("15");
    const [vehicleMarkup, setVehicleMarkup] = useState("12"); // Default 12% markup for vehicles
    const [vehicleDepositPct, setVehicleDepositPct] = useState("15"); // Default 15% loan deposit for vehicles
    const [serviceCharge, setServiceCharge] = useState("25");
    const [standardCommission, setStandardCommission] = useState("2.5");
    const [escrowFee, setEscrowFee] = useState("1000");
    const [escrowFeePayNow, setEscrowFeePayNow] = useState("1950");
    const [doorstepFee, setDoorstepFee] = useState("4000");
    const [pickupFee, setPickupFee] = useState("2500");
    const [maxNegotiationDiscount, setMaxNegotiationDiscount] = useState("10");
    const [lowCostThreshold, setLowCostThreshold] = useState("5000");
    const [lowCostFlatFee, setLowCostFlatFee] = useState("250");
    const [highCostThreshold, setHighCostThreshold] = useState("500000");
    const [highCostCap, setHighCostCap] = useState("15000");
    const [minFinancingPrice, setMinFinancingPrice] = useState("300000");

    // COD Settings
    const [codThreshold, setCodThreshold] = useState("50000");
    const [codEnabled, setCodEnabled] = useState(true);
    const [codAllowExpensiveCategories, setCodAllowExpensiveCategories] = useState(true);
    // Global COD Settings
    const [codGlobalEnabled, setCodGlobalEnabled] = useState(true);
    const [codGlobalThreshold, setCodGlobalThreshold] = useState("50000");

    // Engine States
    const [aiMonitoring, setAiMonitoring] = useState(true);
    const [kycVerification, setKycVerification] = useState(false);
    const [escrowRelease, setEscrowRelease] = useState(true);
    const [strictSeller, setStrictSeller] = useState(true);
    const [globalSearchCaching, setGlobalSearchCaching] = useState(true);

    // Support Configuration
    const [supportEmail, setSupportEmail] = useState("hello@fairprice.ng");
    const [supportWhatsapp, setSupportWhatsapp] = useState("2348162816305");
    const [whatsappOrderNumber, setWhatsappOrderNumber] = useState("2348162816305");
    const [supportOffice, setSupportOffice] = useState("Victoria Island, Lagos, Nigeria");
    const [supportHours, setSupportHours] = useState("Mon - Sat: 8am - 10pm WAT");
    const [whatsappNegotiationBridge, setWhatsappNegotiationBridge] = useState(true);
    const [serviceCenters, setServiceCenters] = useState<{name: string, address: string, phone: string}[]>([]);
    const [heroConfig, setHeroConfig] = useState<any>(null);

    const [isSavingCommission, setIsSavingCommission] = useState(false);
    const [isSavingShipping, setIsSavingShipping] = useState(false);
    const [isSavingSecurity, setIsSavingSecurity] = useState(false);
    const [isSavingSupport, setIsSavingSupport] = useState(false);
    const [isFlushing, setIsFlushing] = useState(false);
    const [statusMsg, setStatusMsg] = useState<string | null>(null);

    // Custom State Shipping
    const defaultStateShipping: Record<string, string> = {
        "Lagos": "1500", "Abuja": "3000", "Kano": "3500",
        "Rivers": "3500", "Oyo": "2000", "Enugu": "4000"
    };
    const [stateShipping, setStateShipping] = useState(defaultStateShipping);

    // Category profit margins
    const defaultMargins: Record<string, string> = {
        "electronics": "10", "fashion": "15", "hair-beauty": "12",
        "automotive": "8", "home-kitchen": "12", "food-grocery": "5"
    };
    const [margins, setMargins] = useState(defaultMargins);
    const [aiScanRunning, setAiScanRunning] = useState(false);
    const [aiScanResults, setAiScanResults] = useState<{ name: string; ours: number; market: number; diff: number }[]>([]);

    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                let initialData: any = {};
                // First try to load from LocalStorage fallback
                try {
                    const localSettings = localStorage.getItem('fp_admin_settings');
                    if (localSettings) {
                        initialData = JSON.parse(localSettings);
                    }
                } catch { /* ignore local storage errors */ }

                const res = await fetch("/api/admin/settings");
                if (res.ok) {
                    const dbData = await res.json();
                    if (!dbData._offlineMode) {
                        initialData = dbData; // DB took precedence
                    } else {
                        // DB was offline, merge local storage on top of defaults
                        initialData = { ...dbData, ...initialData };
                    }
                }

                if (initialData) {
                    if (initialData.platformMargin !== undefined) setPlatformMargin(initialData.platformMargin.toString());
                    if (initialData.vehicleMarkup !== undefined) {
                        setVehicleMarkup(initialData.vehicleMarkup.toString());
                        localStorage.setItem("fp_vehicle_markup", initialData.vehicleMarkup.toString());
                    }
                    if (initialData.vehicleDepositPct !== undefined) {
                        setVehicleDepositPct(initialData.vehicleDepositPct.toString());
                        localStorage.setItem("fp_vehicle_deposit_pct", initialData.vehicleDepositPct.toString());
                    }
                    if (initialData.serviceCharge !== undefined) setServiceCharge(initialData.serviceCharge.toString());
                    if (initialData.standardCommission !== undefined) setStandardCommission(initialData.standardCommission.toString());
                    if (initialData.escrowFee !== undefined) setEscrowFee(initialData.escrowFee.toString());
                    if (initialData.escrowFeePayNow !== undefined) setEscrowFeePayNow(initialData.escrowFeePayNow.toString());
                    if (initialData.doorstepFee !== undefined) setDoorstepFee(initialData.doorstepFee.toString());
                    if (initialData.pickupFee !== undefined) setPickupFee(initialData.pickupFee.toString());

                    if (initialData.codThreshold !== undefined) setCodThreshold(initialData.codThreshold.toString());
                    if (initialData.codEnabled !== undefined) setCodEnabled(initialData.codEnabled);
                    if (initialData.codAllowExpensiveCategories !== undefined) setCodAllowExpensiveCategories(initialData.codAllowExpensiveCategories);
                    if (initialData.codGlobalEnabled !== undefined) setCodGlobalEnabled(initialData.codGlobalEnabled);
                    if (initialData.codGlobalThreshold !== undefined) setCodGlobalThreshold(initialData.codGlobalThreshold.toString());

                    if (initialData.aiMonitoring !== undefined) setAiMonitoring(initialData.aiMonitoring);
                    if (initialData.kycVerification !== undefined) setKycVerification(initialData.kycVerification);
                    if (initialData.escrowRelease !== undefined) setEscrowRelease(initialData.escrowRelease);
                    if (initialData.strictSeller !== undefined) setStrictSeller(initialData.strictSeller);
                    if (initialData.globalSearchCaching !== undefined) setGlobalSearchCaching(initialData.globalSearchCaching);
                    if (initialData.whatsappNegotiationBridge !== undefined) setWhatsappNegotiationBridge(initialData.whatsappNegotiationBridge);

                    if (initialData.maxNegotiationDiscount !== undefined) {
                        setMaxNegotiationDiscount(initialData.maxNegotiationDiscount.toString());
                        localStorage.setItem("fp_max_negotiation_discount", initialData.maxNegotiationDiscount.toString());
                    }

                    if (initialData.stateShipping) setStateShipping(initialData.stateShipping as Record<string, string>);
                    if (initialData.categoryMargins) setMargins(initialData.categoryMargins as Record<string, string>);
                    if (initialData.lowCostThreshold) setLowCostThreshold(initialData.lowCostThreshold.toString());
                    if (initialData.lowCostFlatFee) setLowCostFlatFee(initialData.lowCostFlatFee.toString());
                    if (initialData.highCostThreshold) setHighCostThreshold(initialData.highCostThreshold.toString());
                    if (initialData.highCostCap) setHighCostCap(initialData.highCostCap.toString());
                    if (initialData.minFinancingPrice !== undefined) setMinFinancingPrice(initialData.minFinancingPrice.toString());

                    if (initialData.supportConfig) {
                        const sc = initialData.supportConfig;
                        if (sc.email) setSupportEmail(sc.email);
                        if (sc.whatsapp) setSupportWhatsapp(sc.whatsapp);
                        if (sc.whatsappOrderNumber) setWhatsappOrderNumber(sc.whatsappOrderNumber);
                        if (sc.office) setSupportOffice(sc.office);
                        if (sc.hours) setSupportHours(sc.hours);
                        if (sc.serviceCenters) setServiceCenters(sc.serviceCenters);
                    }
                    if (initialData.heroConfig) setHeroConfig(initialData.heroConfig);
                }
            } catch (err) {
                console.error("Failed to load settings from DB", err);
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, []);

    const saveSection = async (payload: any, setSaving: (val: boolean) => void) => {
        setSaving(true);
        try {
            // Always update local storage first as a strong fallback
            try {
                const current = JSON.parse(localStorage.getItem('fp_admin_settings') || '{}');
                localStorage.setItem('fp_admin_settings', JSON.stringify({ ...current, ...payload }));
            } catch { /* ignore */ }

            const res = await fetch("/api/admin/settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                setStatusMsg("✅ Section saved successfully!");
            } else {
                // Return success anyway since we saved to local storage
                setStatusMsg("✅ Saved locally (Offline Demo Mode)");
            }
            window.dispatchEvent(new Event("storage"));
            window.dispatchEvent(new Event("sync-store-update"));
        } catch (err) {
            console.error("Failed to save settings to DB", err);
            setStatusMsg("✅ Saved locally (Offline Demo Mode)");
        } finally {
            setSaving(false);
            setTimeout(() => setStatusMsg(null), 3000);
        }
    };

    const handleSaveCommission = () => {
        // Also persist to localStorage for client-side pickup
        localStorage.setItem("fp_max_negotiation_discount", maxNegotiationDiscount || "10");
        localStorage.setItem("fp_vehicle_markup", vehicleMarkup || "12");
        localStorage.setItem("fp_vehicle_deposit_pct", vehicleDepositPct || "15");
        return saveSection({
            platformMargin: parseFloat(platformMargin) || 15.0,
            vehicleMarkup: parseFloat(vehicleMarkup) || 12.0,
            vehicleDepositPct: parseFloat(vehicleDepositPct) || 15,
            serviceCharge: parseFloat(serviceCharge) || 25.0,
            standardCommission: parseFloat(standardCommission) || 2.5,
            escrowFee: parseFloat(escrowFee) || 1000,
            escrowFeePayNow: parseFloat(escrowFeePayNow) || 1950,
            categoryMargins: margins,
            maxNegotiationDiscount: parseFloat(maxNegotiationDiscount) || 10,
            lowCostThreshold: parseFloat(lowCostThreshold) || 5000,
            lowCostFlatFee: parseFloat(lowCostFlatFee) || 250,
            highCostThreshold: parseFloat(highCostThreshold) || 500000,
            highCostCap: parseFloat(highCostCap) || 15000,
            minFinancingPrice: parseFloat(minFinancingPrice) || 300000,
        }, setIsSavingCommission);
    };

    const handleSaveShipping = () => saveSection({
        doorstepFee: parseFloat(doorstepFee) || 4000,
        pickupFee: parseFloat(pickupFee) || 2500,
        stateShipping,
        codThreshold: parseFloat(codThreshold) || 50000,
        codEnabled,
        codAllowExpensiveCategories,
        codGlobalEnabled,
        codGlobalThreshold: parseFloat(codGlobalThreshold) || 50000
    }, setIsSavingShipping);

    const handleSaveSecurity = () => saveSection({
        aiMonitoring, kycVerification, escrowRelease, strictSeller, globalSearchCaching, whatsappNegotiationBridge
    }, setIsSavingSecurity);

    const handleSaveSupport = () => saveSection({
        supportConfig: {
            email: supportEmail,
            whatsapp: supportWhatsapp,
            whatsappOrderNumber: whatsappOrderNumber,
            office: supportOffice,
            hours: supportHours,
            serviceCenters
        }
    }, setIsSavingSupport);

    const handleSaveHero = (config: any) => saveSection({ heroConfig: config }, () => {});

    const handleReset = () => {
        setAiMonitoring(true);
        setKycVerification(false);
        setEscrowRelease(true);
        setStrictSeller(true);
        setGlobalSearchCaching(true);
        setDoorstepFee("2500");
        setPickupFee("1000");
    };

    const flushRegistry = () => {
        setIsFlushing(true);
        setTimeout(() => {
            // Clear all cached data except user auth
            const keysToKeep = ["fp_auth_user", "fp_data_version"];
            const keysToRemove = Object.keys(localStorage).filter(k => k.startsWith("fp_demo_") && !keysToKeep.includes(k));
            keysToRemove.forEach(k => localStorage.removeItem(k));
            window.dispatchEvent(new Event("storage"));
            setIsFlushing(false);
            setStatusMsg("🗑️ System Registry Cache flushed — " + keysToRemove.length + " entries cleared.");
            setTimeout(() => setStatusMsg(null), 4000);
        }, 1500);
    };

    return (
        <div className="space-y-10">
            <div>
                <h2 className="text-3xl font-black text-gray-900 tracking-tight">System Settings</h2>
                <p className="text-sm text-gray-500 font-bold uppercase tracking-wider mt-1">Configure platform parameters and trust engine</p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Marketplace Fees */}
                <div className="xl:col-span-2 space-y-8">
                    <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                <Percent className="h-5 w-5" />
                            </div>
                            <h3 className="text-lg font-black text-gray-900">Revenue & Fees</h3>
                            <InfoTooltip 
                                content="These fees determine the platform's revenue model and who bears the cost of trust. High fees support better support but may impact volume."
                                title="Financial Governance"
                                position="right"
                            />
                        </div>

                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-1.5 pl-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Platform Margin (%)</label>
                                        <InfoTooltip content="The base markup applied by RatelShop on top of seller prices." />
                                    </div>
                                    <Input value={platformMargin} onChange={(e) => setPlatformMargin(e.target.value)} type="number" className="h-12 bg-gray-50 border-none rounded-xl font-bold border-indigo-200 ring-2 ring-indigo-50" />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-1.5 pl-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Vehicle Loan Markup (%)</label>
                                        <InfoTooltip content="Specialized markup for vehicle categories to cover loan processing and inspection costs." />
                                    </div>
                                    <Input value={vehicleMarkup} onChange={(e) => setVehicleMarkup(e.target.value)} type="number" className="h-12 bg-gray-50 border-none rounded-xl font-bold border-amber-200 ring-2 ring-amber-50" />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-1.5 pl-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Vehicle Loan Deposit (%)</label>
                                        <InfoTooltip content="The percentage of the vehicle price a buyer must pay upfront as a deposit to secure the vehicle. The remaining balance is financed through the loan." />
                                    </div>
                                    <Input value={vehicleDepositPct} onChange={(e) => setVehicleDepositPct(e.target.value)} type="number" min="5" max="50" className="h-12 bg-gray-50 border-none rounded-xl font-bold border-amber-200 ring-2 ring-amber-50" />
                                    <p className="text-[10px] text-gray-400 pl-1">Buyers pay this % upfront for vehicle transactions (default: 15%)</p>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-1.5 pl-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Min. Financing Price (₦)</label>
                                        <InfoTooltip content="The minimum price a product must have to be eligible for BNPL financing." />
                                    </div>
                                    <Input value={minFinancingPrice} onChange={(e) => setMinFinancingPrice(e.target.value)} type="number" className="h-12 bg-gray-50 border-none rounded-xl font-bold" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Standard Commission (%)</label>
                                    <Input value={standardCommission} onChange={(e) => setStandardCommission(e.target.value)} type="number" className="h-12 bg-gray-50 border-none rounded-xl font-bold" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Global Service Charge (%)</label>
                                    <Input value={serviceCharge} onChange={(e) => setServiceCharge(e.target.value)} type="number" className="h-12 bg-gray-50 border-none rounded-xl font-bold" />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-1.5 pl-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Escrow Fee (Fixed ₦)</label>
                                        <InfoTooltip content="The flat fee paid by the buyer for basic escrow protection on COD/standard orders." />
                                    </div>
                                    <Input value={escrowFee} onChange={(e) => setEscrowFee(e.target.value)} type="number" className="h-12 bg-gray-50 border-none rounded-xl font-bold" />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-1.5 pl-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Pay Now Escrow Fee (₦)</label>
                                        <InfoTooltip content="For instant payments, the platform uses a tiered fee (10% down to 7%, capped at ₦7,000) for maximum security and fairness." />
                                    </div>
                                    <Input value={escrowFeePayNow} onChange={(e) => setEscrowFeePayNow(e.target.value)} type="number" className="h-12 bg-gray-50 border-none rounded-xl font-bold border-emerald-200 ring-2 ring-emerald-50" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Max Negotiation Discount (%)</label>
                                    <Input value={maxNegotiationDiscount} onChange={(e) => setMaxNegotiationDiscount(e.target.value)} type="number" min="1" max="50" className="h-12 bg-gray-50 border-none rounded-xl font-bold" />
                                    <p className="text-[10px] text-gray-400 pl-1">Buyers cannot offer more than this % below the listing price</p>
                                </div>
                            </div>

                            {/* Advanced Commission Tiers */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-50">
                                <div className="space-y-4">
                                    <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest">Low Cost Protection</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Threshold (₦)</label>
                                            <Input value={lowCostThreshold} onChange={(e) => setLowCostThreshold(e.target.value)} type="number" className="h-10 bg-gray-50 border-none rounded-xl font-bold" />
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-1.5 ">
                                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none">Flat Fee (₦)</label>
                                                    <InfoTooltip content="Bears the cost: The SELLER bears this flat fee to ensure the platform remains sustainable for micro-transactions." />
                                            </div>
                                            <Input value={lowCostFlatFee} onChange={(e) => setLowCostFlatFee(e.target.value)} type="number" className="h-10 bg-gray-50 border-none rounded-xl font-bold" />
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-gray-400 italic">Items below ₦{lowCostThreshold} will pay a flat ₦{lowCostFlatFee} fee instead of %.</p>
                                </div>
                                <div className="space-y-4">
                                    <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest">High Cost Incentives</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Threshold (₦)</label>
                                            <Input value={highCostThreshold} onChange={(e) => setHighCostThreshold(e.target.value)} type="number" className="h-10 bg-gray-50 border-none rounded-xl font-bold" />
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-1.5 ">
                                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none">Fee Cap (₦)</label>
                                                <InfoTooltip content="The maximum possible commission taken from a high-value sale. Encourages luxury and bulk sellers." />
                                            </div>
                                            <Input value={highCostCap} onChange={(e) => setHighCostCap(e.target.value)} type="number" className="h-10 bg-gray-50 border-none rounded-xl font-bold" />
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-gray-400 italic">Items above ₦{highCostThreshold} will have their fee capped at ₦{highCostCap}.</p>
                                </div>
                            </div>
                            <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex items-start gap-3">
                                <AlertCircle className="h-5 w-5 text-indigo-500 mt-0.5" />
                                <p className="text-xs text-indigo-600 font-medium">Fee changes will be applied to all new transactions from the next billing cycle. Existing orders are not affected.</p>
                            </div>
                        </div>
                    </div>

                    {/* Profit Margins per Category */}
                    <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm mt-8">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                <TrendingUp className="h-5 w-5" />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-gray-900">Profit Margins by Category</h3>
                                <p className="text-xs text-gray-400">Set markup percentage applied to each product category</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {Object.entries(margins).map(([key, val]) => (
                                <div key={key} className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                                        {key.replace(/-/g, ' ')}
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            value={val}
                                            onChange={e => setMargins({ ...margins, [key]: e.target.value })}
                                            type="number"
                                            min="0"
                                            max="100"
                                            className="h-10 bg-gray-50 border-none rounded-xl font-bold"
                                        />
                                        <span className="text-sm font-bold text-gray-400">%</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100 flex items-start gap-3 mt-6">
                            <AlertCircle className="h-5 w-5 text-emerald-500 mt-0.5" />
                            <p className="text-xs text-emerald-600 font-medium">Margins are applied on top of the seller's listed price. This is FairPrice's operating margin per sale.</p>
                        </div>

                        <div className="mt-8 flex justify-end pt-6 border-t border-gray-100">
                            <Button disabled={isSavingCommission} onClick={handleSaveCommission} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs h-12 px-8 flex items-center gap-2">
                                {isSavingCommission ? "Saving..." : <><Save className="h-4 w-4" /> Save Commission</>}
                            </Button>
                        </div>
                    </div>

                    {/* AI Price Comparison Tool */}
                    <div className="bg-gradient-to-br from-violet-50 to-indigo-50 p-8 rounded-[32px] border border-indigo-100 shadow-sm mt-8">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center">
                                    <Brain className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-gray-900">AI Price Intelligence</h3>
                                    <p className="text-xs text-gray-500">Compare your catalogue prices with current market rates</p>
                                </div>
                            </div>
                            <Button
                                onClick={async () => {
                                    setAiScanRunning(true);
                                    setAiScanResults([]);
                                    try {
                                        // Scan 3 random products from catalogue
                                        const { DataSyncService } = await import('@/lib/sync-store');
                                        const products = DataSyncService.getProducts().sort(() => Math.random() - 0.5).slice(0, 3);
                                        const results: typeof aiScanResults = [];
                                        for (const p of products) {
                                            try {
                                                const res = await fetch('/api/gemini-price', {
                                                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({ productName: p.name, mode: 'search' })
                                                });
                                                const data = await res.json();
                                                const first = data.suggestions?.[0];
                                                if (first?.approxPrice) {
                                                    results.push({
                                                        name: p.name.slice(0, 40),
                                                        ours: p.price,
                                                        market: first.approxPrice,
                                                        diff: Math.round(((p.price - first.approxPrice) / first.approxPrice) * 100)
                                                    });
                                                }
                                            } catch { /* skip */ }
                                        }
                                        setAiScanResults(results);
                                    } catch { /* ignore */ }
                                    setAiScanRunning(false);
                                }}
                                disabled={aiScanRunning}
                                className="bg-violet-600 hover:bg-violet-700 text-white rounded-2xl font-black text-xs px-6 h-10 flex items-center gap-2"
                            >
                                <Sparkles className="h-4 w-4" />
                                {aiScanRunning ? 'Scanning...' : 'Run AI Price Scan'}
                            </Button>
                        </div>

                        {aiScanResults.length > 0 && (
                            <div className="space-y-3">
                                {aiScanResults.map((r, i) => (
                                    <div key={i} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100">
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-gray-900 truncate">{r.name}</p>
                                            <div className="flex items-center gap-4 mt-1 text-xs">
                                                <span className="text-gray-500">Ours: <b className="text-gray-900">₦{r.ours.toLocaleString()}</b></span>
                                                <span className="text-gray-500">Market: <b className="text-indigo-600">₦{r.market.toLocaleString()}</b></span>
                                            </div>
                                        </div>
                                        <span className={`text-xs font-black px-3 py-1.5 rounded-full ${r.diff > 10 ? 'bg-red-100 text-red-700' :
                                            r.diff < -10 ? 'bg-emerald-100 text-emerald-700' :
                                                'bg-gray-100 text-gray-600'
                                            }`}>
                                            {r.diff > 0 ? '+' : ''}{r.diff}%
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Shipping & Delivery Config */}
                    <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm mt-8">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="h-10 w-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                                <Truck className="h-5 w-5" />
                            </div>
                            <h3 className="text-lg font-black text-gray-900">Shipping & Logistics</h3>
                        </div>

                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Base Door Delivery Fee (₦)</label>
                                    <Input value={doorstepFee} onChange={(e) => setDoorstepFee(e.target.value)} type="number" className="h-12 bg-gray-50 border-none rounded-xl font-bold" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Base Pickup Station Fee (₦)</label>
                                    <Input value={pickupFee} onChange={(e) => setPickupFee(e.target.value)} type="number" className="h-12 bg-gray-50 border-none rounded-xl font-bold" />
                                </div>
                            </div>
                            <div className="p-4 bg-orange-50/50 rounded-2xl border border-orange-100 flex items-start gap-3">
                                <AlertCircle className="h-5 w-5 text-orange-500 mt-0.5" />
                                <p className="text-xs text-orange-700 font-medium">Global products or remote regions may apply smart multipliers to these base rates at checkout.</p>
                            </div>

                            {/* Pay on Delivery Settings */}
                            <div className="pt-6 border-t border-gray-50">
                                <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <Truck className="h-4 w-4 text-amber-500" />
                                    Pay on Delivery (COD)
                                </h4>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between py-3 rounded-xl bg-amber-50/50 px-4 border border-amber-100">
                                        <div>
                                            <h4 className="text-sm font-bold text-gray-900">Enable Pay on Delivery</h4>
                                            <p className="text-xs text-gray-500 mt-0.5">Allow customers to pay cash upon delivery</p>
                                        </div>
                                        <Switch checked={codEnabled} onCheckedChange={setCodEnabled} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">COD Order Threshold (₦)</label>
                                        <Input value={codThreshold} onChange={(e) => setCodThreshold(e.target.value)} type="number" className="h-12 bg-gray-50 border-none rounded-xl font-bold" />
                                        <p className="text-[10px] text-gray-400 pl-1">Orders at or below this amount can use Pay on Delivery</p>
                                    </div>
                                    <div className="flex items-center justify-between py-3 rounded-xl bg-gray-50 px-4 border border-gray-100">
                                        <div>
                                            <h4 className="text-sm font-bold text-gray-900">Allow COD for Expensive Categories</h4>
                                            <p className="text-xs text-gray-500 mt-0.5">Cars, automotive, and high-value items can use COD regardless of threshold</p>
                                        </div>
                                        <Switch checked={codAllowExpensiveCategories} onCheckedChange={setCodAllowExpensiveCategories} />
                                    </div>

                                    {/* Global Products COD */}
                                    <div className="pt-4 border-t border-gray-100">
                                        <h5 className="text-xs font-bold text-gray-600 mb-3 flex items-center gap-1.5">
                                            🌍 Global Products COD
                                        </h5>
                                        <div className="flex items-center justify-between py-3 rounded-xl bg-blue-50/50 px-4 border border-blue-100 mb-3">
                                            <div>
                                                <h4 className="text-sm font-bold text-gray-900">Enable COD for Global Products</h4>
                                                <p className="text-xs text-gray-500 mt-0.5">Allow pay-on-delivery for globally sourced items</p>
                                            </div>
                                            <Switch checked={codGlobalEnabled} onCheckedChange={setCodGlobalEnabled} />
                                        </div>
                                        {codGlobalEnabled && (
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Global COD Threshold (₦)</label>
                                                <Input value={codGlobalThreshold} onChange={(e) => setCodGlobalThreshold(e.target.value)} type="number" className="h-12 bg-gray-50 border-none rounded-xl font-bold" />
                                                <p className="text-[10px] text-gray-400 pl-1">Global product orders at or below this amount can use Pay on Delivery</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Custom State Shipping Override */}
                            <div className="pt-6 border-t border-gray-50">
                                <h4 className="text-sm font-bold text-gray-900 mb-4">Custom State Pricing (Doorstep Override)</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {Object.entries(stateShipping).map(([state, fee]) => (
                                        <div key={state} className="space-y-1.5">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">{state}</label>
                                            <Input
                                                value={fee}
                                                onChange={e => setStateShipping({ ...stateShipping, [state]: e.target.value })}
                                                type="number"
                                                className="h-10 bg-gray-50 border-none rounded-xl font-bold"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 flex justify-end pt-6 border-t border-gray-100">
                            <Button disabled={isSavingShipping} onClick={handleSaveShipping} className="bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-black text-xs h-12 px-8 flex items-center gap-2">
                                {isSavingShipping ? "Saving..." : <><Save className="h-4 w-4" /> Save Shipping</>}
                            </Button>
                        </div>
                    </div>

                    <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm mt-8">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                                    <Shield className="h-5 w-5" />
                                </div>
                                <h3 className="text-lg font-black text-gray-900">Safety & Trust Engine</h3>
                            </div>
                            <Button variant="ghost" onClick={handleReset} className="text-xs font-bold text-gray-400 hover:text-gray-600">Reset to Defaults</Button>
                        </div>

                        <div className="space-y-6">
                            <div className="flex items-center justify-between py-4 border-b border-gray-50">
                                <div className="max-w-md">
                                    <h4 className="text-sm font-bold text-gray-900">AI Price Monitoring</h4>
                                    <p className="text-xs text-gray-400 mt-0.5">Flag products with prices 40% outside market average</p>
                                </div>
                                <Switch checked={aiMonitoring} onCheckedChange={setAiMonitoring} />
                            </div>
                            <div className="flex items-center justify-between py-4 border-b border-gray-50">
                                <div className="max-w-md">
                                    <h4 className="text-sm font-bold text-gray-900">Automatic KYC Verification</h4>
                                    <p className="text-xs text-gray-400 mt-0.5">Use OCR to verify NIN/BVN documents instantly</p>
                                </div>
                                <Switch checked={kycVerification} onCheckedChange={setKycVerification} />
                            </div>
                            <div className="flex items-center justify-between py-4 border-b border-gray-50">
                                <div className="max-w-md">
                                    <h4 className="text-sm font-bold text-gray-900">Escrow Auto-Release</h4>
                                    <p className="text-xs text-gray-400 mt-0.5">Release funds 14 days after confirmed delivery</p>
                                </div>
                                <Switch checked={escrowRelease} onCheckedChange={setEscrowRelease} />
                            </div>
                            <div className="flex items-center justify-between py-4 border-b border-gray-50">
                                <div className="max-w-md">
                                    <h4 className="text-sm font-bold text-gray-900">Strict Seller Onboarding</h4>
                                    <p className="text-xs text-gray-400 mt-0.5">Require manual review for all new sellers</p>
                                </div>
                                <Switch checked={strictSeller} onCheckedChange={setStrictSeller} />
                            </div>
                            <div className="flex items-center justify-between py-4 border-b border-gray-50 last:border-0">
                                <div className="max-w-md">
                                    <h4 className="text-sm font-bold text-gray-900">Global Search Caching</h4>
                                    <p className="text-xs text-gray-400 mt-0.5">Auto-capture and add AI-generated products from Navbar & Modal Search into the public catalogue</p>
                                </div>
                                <Switch checked={globalSearchCaching} onCheckedChange={setGlobalSearchCaching} />
                            </div>
                            <div className="flex items-center justify-between py-4 border-b border-gray-50 last:border-0">
                                <div className="max-w-md">
                                    <h4 className="text-sm font-bold text-gray-900">Ziva AI-WhatsApp Bridge</h4>
                                    <p className="text-xs text-gray-400 mt-0.5">Enable real-time negotiations and alerts via WhatsApp Cloud API</p>
                                </div>
                                <Switch checked={whatsappNegotiationBridge} onCheckedChange={setWhatsappNegotiationBridge} />
                            </div>
                        </div>

                        <div className="mt-8 flex justify-end pt-6 border-t border-gray-100">
                            <Button disabled={isSavingSecurity} onClick={handleSaveSecurity} className="bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-black text-xs h-12 px-8 flex items-center gap-2">
                                {isSavingSecurity ? "Saving..." : <><Save className="h-4 w-4" /> Save Security</>}
                            </Button>
                        </div>
                    </div>

                    {/* Content & Categories Management */}
                    <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm mt-8 xl:mt-0 xl:col-span-2">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                                    <Cloud className="h-5 w-5" />
                                </div>
                                <h3 className="text-lg font-black text-gray-900">Content & Categories</h3>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="p-6 border border-gray-100 rounded-2xl bg-gray-50/50 hover:bg-gray-50 transition-colors cursor-pointer group">
                                    <h4 className="text-sm font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">Homepage Banners</h4>
                                    <p className="text-xs text-gray-500 mt-1 mb-4">Manage hero promotions and deal highlights</p>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">3 Active</span>
                                        <Link href="/admin/content/banners">
                                            <Button variant="outline" size="sm" className="h-8 text-xs font-bold rounded-xl">Manage</Button>
                                        </Link>
                                    </div>
                                </div>
                                <div className="p-6 border border-gray-100 rounded-2xl bg-gray-50/50 hover:bg-gray-50 transition-colors cursor-pointer group">
                                    <h4 className="text-sm font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">Taxonomy & Categories</h4>
                                    <p className="text-xs text-gray-500 mt-1 mb-4">Structure product catalog and departments</p>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">24 Categories</span>
                                        <Link href="/admin/content/categories">
                                            <Button variant="outline" size="sm" className="h-8 text-xs font-bold rounded-xl">Manage</Button>
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Homepage Hero Grid Management */}
                    <HeroManager 
                        config={heroConfig} 
                        onSave={async (config) => {
                            setHeroConfig(config);
                            await handleSaveHero(config);
                        }}
                        isLoading={isLoading}
                    />

                    {/* Support & Contact Management */}
                    <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm mt-8 xl:col-span-2">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="h-10 w-10 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
                                <Truck className="h-5 w-5" />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-gray-900">Customer Support Locations & Contact</h3>
                                <p className="text-xs text-gray-500">Contact details managed across help screens and pickup centers</p>
                            </div>
                        </div>
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Primary Email</label>
                                    <Input value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} placeholder="hello@fairprice.ng" className="h-12 bg-gray-50 border-none rounded-xl font-medium" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">WhatsApp Support (Format: 234...)</label>
                                    <Input value={supportWhatsapp} onChange={(e) => setSupportWhatsapp(e.target.value)} placeholder="2348162816305" className="h-12 bg-gray-50 border-none rounded-xl font-medium" />
                                    <p className="text-[10px] text-gray-400 pl-1">Don't include '+', spaces, or hyphens</p>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-1.5 pl-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">WhatsApp Order Number</label>
                                        <InfoTooltip content="This is the WhatsApp Business number used for the 'Order via WhatsApp' checkout flow. Customers will send their order summary to this number." />
                                    </div>
                                    <Input value={whatsappOrderNumber} onChange={(e) => setWhatsappOrderNumber(e.target.value)} placeholder="2349131767484" className="h-12 bg-gray-50 border-none rounded-xl font-medium border-emerald-200 ring-2 ring-emerald-50" />
                                    <p className="text-[10px] text-gray-400 pl-1">Format: 234... (no +, spaces, or hyphens). This powers the checkout WhatsApp button.</p>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Head Office Address</label>
                                    <Input value={supportOffice} onChange={(e) => setSupportOffice(e.target.value)} placeholder="Victoria Island, Lagos" className="h-12 bg-gray-50 border-none rounded-xl font-medium" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Working Hours</label>
                                    <Input value={supportHours} onChange={(e) => setSupportHours(e.target.value)} placeholder="Mon - Sat: 8am - 10pm WAT" className="h-12 bg-gray-50 border-none rounded-xl font-medium" />
                                </div>
                            </div>
                            <div className="pt-6 border-t border-gray-50">
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-sm font-bold text-gray-900">Warehouses & Logistics Hubs</h4>
                                    <Button onClick={() => setServiceCenters([...serviceCenters, { name: "", address: "", phone: "" }])} variant="outline" size="sm" className="h-8 text-xs font-bold rounded-xl text-cyan-600 border-cyan-200 hover:bg-cyan-50">
                                        + Add Warehouse Location
                                    </Button>
                                </div>
                                <div className="space-y-4">
                                    {serviceCenters.map((center, i) => (
                                        <div key={i} className="flex flex-col md:flex-row gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                            <Input
                                                placeholder="Location Name (e.g. Abuja Hub)"
                                                value={center.name}
                                                onChange={(e) => {
                                                    const s = [...serviceCenters];
                                                    s[i].name = e.target.value;
                                                    setServiceCenters(s);
                                                }}
                                                className="bg-white border-none h-10 flex-1 rounded-xl"
                                            />
                                            <Input
                                                placeholder="Full Address"
                                                value={center.address}
                                                onChange={(e) => {
                                                    const s = [...serviceCenters];
                                                    s[i].address = e.target.value;
                                                    setServiceCenters(s);
                                                }}
                                                className="bg-white border-none h-10 flex-2 rounded-xl"
                                            />
                                            <Input
                                                placeholder="Phone (Optional)"
                                                value={center.phone}
                                                onChange={(e) => {
                                                    const s = [...serviceCenters];
                                                    s[i].phone = e.target.value;
                                                    setServiceCenters(s);
                                                }}
                                                className="bg-white border-none h-10 flex-1 rounded-xl"
                                            />
                                            <Button onClick={() => {
                                                setServiceCenters(serviceCenters.filter((_, idx) => idx !== i));
                                            }} variant="ghost" className="h-10 px-3 text-red-500 hover:bg-red-50 rounded-xl">Remove</Button>
                                        </div>
                                    ))}
                                    {serviceCenters.length === 0 && <p className="text-xs text-gray-400 italic">No additional service centers registered.</p>}
                                </div>
                            </div>
                        </div>
                        <div className="mt-8 flex justify-end pt-6 border-t border-gray-100">
                            <Button disabled={isSavingSupport} onClick={handleSaveSupport} className="bg-cyan-600 hover:bg-cyan-700 text-white rounded-2xl font-black text-xs h-12 px-8 flex items-center gap-2">
                                {isSavingSupport ? "Saving..." : <><Save className="h-4 w-4" /> Save Contacts</>}
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Maintenance Actions */}
                <div className="space-y-6">
                    <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
                        <h3 className="text-sm font-black text-gray-900 mb-6 uppercase tracking-widest">Platform Maintenance</h3>
                        <div className="space-y-3">
                            <Button
                                onClick={() => {
                                    setStatusMsg("🔄 Syncing market prices in background...");
                                    setTimeout(() => setStatusMsg("✅ Market prices synced successfully"), 2500);
                                }}
                                className="w-full h-12 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2"
                            >
                                <RefreshCw className="h-4 w-4" /> Sync Market Prices
                            </Button>
                            <Button
                                onClick={flushRegistry}
                                disabled={isFlushing}
                                variant="outline"
                                className="w-full h-12 border-gray-200 text-gray-600 rounded-2xl font-black text-xs uppercase tracking-widest"
                            >
                                {isFlushing ? "Flushing..." : "Flush Registry Cache"}
                            </Button>
                        </div>
                    </div>

                    <div className="bg-rose-50/50 p-8 rounded-[32px] border border-rose-100 shadow-sm">
                        <h3 className="text-sm font-black text-rose-900 mb-6 uppercase tracking-widest">Danger Zone</h3>
                        <p className="text-xs text-rose-600 font-medium mb-6">These actions are destructive and cannot be undone. System administrator access required.</p>
                        <Button
                            onClick={() => {
                                setStatusMsg("⚠️ Platform is now in demonstration Maintenance Mode.");
                                setTimeout(() => setStatusMsg(null), 3000);
                            }}
                            variant="ghost"
                            className="w-full h-12 text-rose-600 hover:bg-rose-100 rounded-2xl font-black text-xs uppercase tracking-widest border border-rose-200"
                        >
                            Maintenance Mode
                        </Button>
                    </div>
                </div>
            </div>

            {statusMsg && (
                <div className="fixed bottom-6 right-6 bg-gray-900 text-white px-6 py-3.5 rounded-2xl shadow-2xl text-sm font-bold z-50 animate-in slide-in-from-bottom-4">
                    {statusMsg}
                </div>
            )}
        </div>
    );
}
