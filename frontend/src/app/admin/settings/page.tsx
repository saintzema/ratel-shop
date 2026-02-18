"use client";

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
    AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";

export default function AdminSettings() {
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
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Standard Commission (%)</label>
                                    <Input defaultValue="2.5" className="h-12 bg-gray-50 border-none rounded-xl font-bold" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Escrow Fee (Fixed ₦)</label>
                                    <Input defaultValue="500" className="h-12 bg-gray-50 border-none rounded-xl font-bold" />
                                </div>
                            </div>
                            <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex items-start gap-3">
                                <AlertCircle className="h-5 w-5 text-indigo-500 mt-0.5" />
                                <p className="text-xs text-indigo-600 font-medium">Fee changes will be applied to all new transactions from the next billing cycle. Existing orders are not affected.</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                                    <Shield className="h-5 w-5" />
                                </div>
                                <h3 className="text-lg font-black text-gray-900">Safety & Trust Engine</h3>
                            </div>
                            <Button variant="ghost" className="text-xs font-bold text-gray-400 hover:text-gray-600">Reset to Defaults</Button>
                        </div>

                        <div className="space-y-6">
                            {[
                                { label: "AI Price Monitoring", desc: "Flag products with prices 40% outside market average", default: true },
                                { label: "Automatic KYC Verification", desc: "Use OCR to verify NIN/BVN documents instantly", default: false },
                                { label: "Escrow Auto-Release", desc: "Release funds 7 days after confirmed delivery", default: true },
                                { label: "Strict Seller Onboarding", desc: "Require manual review for all new sellers", default: true },
                            ].map((item) => (
                                <div key={item.label} className="flex items-center justify-between py-4 border-b border-gray-50 last:border-0">
                                    <div className="max-w-md">
                                        <h4 className="text-sm font-bold text-gray-900">{item.label}</h4>
                                        <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
                                    </div>
                                    <Switch defaultChecked={item.default} />
                                </div>
                            ))}
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
                            <Button variant="outline" className="w-full h-12 border-gray-200 text-gray-600 rounded-2xl font-black text-xs uppercase tracking-widest">
                                Flush Registry Cache
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
                <Button className="h-14 px-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-500/20 flex items-center gap-2">
                    <Save className="h-4 w-4" /> Save Configuration
                </Button>
            </div>
        </div>
    );
}
