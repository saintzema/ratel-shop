"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
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
    Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";

export default function AdminSettings() {
    const [platformMargin, setPlatformMargin] = useState("15");
    const [serviceCharge, setServiceCharge] = useState("25");
    const [standardCommission, setStandardCommission] = useState("2.5");
    const [escrowFee, setEscrowFee] = useState("1000");
    const [doorstepFee, setDoorstepFee] = useState("4000");
    const [pickupFee, setPickupFee] = useState("2500");

    // Engine States
    const [aiMonitoring, setAiMonitoring] = useState(true);
    const [kycVerification, setKycVerification] = useState(false);
    const [escrowRelease, setEscrowRelease] = useState(true);
    const [strictSeller, setStrictSeller] = useState(true);

    const [isSaving, setIsSaving] = useState(false);
    const [isFlushing, setIsFlushing] = useState(false);
    const [statusMsg, setStatusMsg] = useState<string | null>(null);

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
                const res = await fetch("/api/admin/settings");
                if (res.ok) {
                    const data = await res.json();
                    setPlatformMargin(data.platformMargin?.toString() || "15");
                    setServiceCharge(data.serviceCharge?.toString() || "25");
                    setStandardCommission(data.standardCommission?.toString() || "2.5");
                    setEscrowFee(data.escrowFee?.toString() || "1000");
                    setDoorstepFee(data.doorstepFee?.toString() || "4000");
                    setPickupFee(data.pickupFee?.toString() || "2500");

                    setAiMonitoring(data.aiMonitoring ?? true);
                    setKycVerification(data.kycVerification ?? false);
                    setEscrowRelease(data.escrowRelease ?? true);
                    setStrictSeller(data.strictSeller ?? true);

                    if (data.categoryMargins) {
                        // Prisma json field
                        setMargins(data.categoryMargins as Record<string, string>);
                    }
                }
            } catch (err) {
                console.error("Failed to load settings from DB", err);
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, []);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const payload = {
                platformMargin: parseFloat(platformMargin) || 15.0,
                serviceCharge: parseFloat(serviceCharge) || 25.0,
                standardCommission: parseFloat(standardCommission) || 2.5,
                escrowFee: parseFloat(escrowFee) || 1000,
                doorstepFee: parseFloat(doorstepFee) || 4000,
                pickupFee: parseFloat(pickupFee) || 2500,
                aiMonitoring,
                kycVerification,
                escrowRelease,
                strictSeller,
                categoryMargins: margins
            };

            const res = await fetch("/api/admin/settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setStatusMsg("✅ Configuration saved successfully!");
            } else {
                setStatusMsg("❌ Failed to save configuration.");
            }
        } catch (err) {
            console.error("Failed to save settings to DB", err);
            setStatusMsg("❌ Error saving configuration.");
        } finally {
            setIsSaving(false);
            setTimeout(() => setStatusMsg(null), 3000);
        }
    };

    const handleReset = () => {
        setAiMonitoring(true);
        setKycVerification(false);
        setEscrowRelease(true);
        setStrictSeller(true);
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
                        </div>

                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Platform Margin (%)</label>
                                    <Input value={platformMargin} onChange={(e) => setPlatformMargin(e.target.value)} type="number" className="h-12 bg-gray-50 border-none rounded-xl font-bold border-indigo-200 ring-2 ring-indigo-50" />
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
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Escrow Fee (Fixed ₦)</label>
                                    <Input value={escrowFee} onChange={(e) => setEscrowFee(e.target.value)} type="number" className="h-12 bg-gray-50 border-none rounded-xl font-bold" />
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
                                        const { DemoStore } = await import('@/lib/demo-store');
                                        const products = DemoStore.getProducts().sort(() => Math.random() - 0.5).slice(0, 3);
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
                                    <p className="text-xs text-gray-400 mt-0.5">Release funds 7 days after confirmed delivery</p>
                                </div>
                                <Switch checked={escrowRelease} onCheckedChange={setEscrowRelease} />
                            </div>
                            <div className="flex items-center justify-between py-4 border-b border-gray-50 last:border-0">
                                <div className="max-w-md">
                                    <h4 className="text-sm font-bold text-gray-900">Strict Seller Onboarding</h4>
                                    <p className="text-xs text-gray-400 mt-0.5">Require manual review for all new sellers</p>
                                </div>
                                <Switch checked={strictSeller} onCheckedChange={setStrictSeller} />
                            </div>
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
                </div>

                {/* Maintenance Actions */}
                <div className="space-y-6">
                    <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
                        <h3 className="text-sm font-black text-gray-900 mb-6 uppercase tracking-widest">Platform Maintenance</h3>
                        <div className="space-y-3">
                            <Button className="w-full h-12 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2">
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
                        <Button variant="ghost" className="w-full h-12 text-rose-600 hover:bg-rose-100 rounded-2xl font-black text-xs uppercase tracking-widest border border-rose-200">
                            Maintenance Mode
                        </Button>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-10">
                <Button variant="ghost" className="h-14 px-8 font-black text-xs uppercase tracking-widest text-gray-400">Discard Changes</Button>
                <Button disabled={isSaving} onClick={handleSave} className="h-14 px-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-500/20 flex items-center gap-2">
                    {isSaving ? "Saving..." : <><Save className="h-4 w-4" /> Save Configuration</>}
                </Button>
            </div>
            {statusMsg && (
                <div className="fixed bottom-6 right-6 bg-gray-900 text-white px-6 py-3.5 rounded-2xl shadow-2xl text-sm font-bold z-50 animate-in slide-in-from-bottom-4">
                    {statusMsg}
                </div>
            )}
        </div>
    );
}
