"use client";

import { useState, useEffect } from "react";
import { 
    QrCode, 
    Download, 
    Share2, 
    Zap, 
    ShieldCheck, 
    Smartphone, 
    Plus, 
    Copy,
    CheckCircle2,
    ArrowRightLeft,
    Wallet
} from "lucide-react";
import { motion } from "framer-motion";
import { DataSyncService } from "@/lib/sync-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export default function QRPaymentsPage() {
    const seller = DataSyncService.getCurrentSeller();
    const [amount, setAmount] = useState("");
    const [label, setLabel] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [qrUrl, setQrUrl] = useState("");
    const [copied, setCopied] = useState(false);

    const storeUrl = `${window.location.origin}/store/${seller?.store_url || seller?.id}`;
    const defaultQr = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(storeUrl)}`;

    const handleGenerate = () => {
        if (!amount) return;
        setIsGenerating(true);
        
        // Generate a Paystack-like direct payment link or a platform internal link
        const paymentLink = `${window.location.origin}/checkout/direct?sellerId=${seller?.id}&amount=${amount}&label=${encodeURIComponent(label)}`;
        const url = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(paymentLink)}`;
        
        setTimeout(() => {
            setQrUrl(url);
            setIsGenerating(false);
        }, 800);
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(storeUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (!seller) return null;

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-20">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">QR Payments & Collection</h1>
                    <p className="text-gray-500 font-medium mt-1">Accept payments offline like a pro. The WeChat of Africa approach.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="bg-emerald-100 text-emerald-700 px-4 py-2 rounded-2xl flex items-center gap-2 text-sm font-black">
                        <ShieldCheck className="h-4 w-4" />
                        Secure Paystack Integration
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Side: Store QR */}
                <div className="lg:col-span-5 space-y-8">
                    <section className="bg-white rounded-[40px] p-10 border border-gray-100 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.05)] text-center">
                        <div className="w-16 h-16 bg-gray-900 text-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl">
                            <QrCode className="h-8 w-8" />
                        </div>
                        <h2 className="text-2xl font-black text-gray-900 mb-2">Store Profile QR</h2>
                        <p className="text-sm text-gray-400 font-bold uppercase tracking-widest mb-8">Scan to browse & buy</p>
                        
                        <div className="relative group max-w-[280px] mx-auto p-4 bg-gray-50 rounded-[40px] border-4 border-white shadow-inner mb-8">
                            <img 
                                src={defaultQr} 
                                alt="Store QR" 
                                className="w-full h-full rounded-[32px] mix-blend-multiply"
                            />
                            <div className="absolute inset-0 bg-black/40 rounded-[32px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                                <Button variant="secondary" className="rounded-full h-12 px-6 font-black gap-2">
                                    <Download className="h-4 w-4" /> Download
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center gap-2 p-4 bg-gray-50 rounded-2xl border border-gray-100 min-w-0">
                                <span className="text-xs font-bold text-gray-500 truncate flex-1">{storeUrl}</span>
                                <button onClick={copyToClipboard} className="text-gray-400 hover:text-gray-900 transition-colors">
                                    {copied ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <Copy className="h-5 w-5" />}
                                </button>
                            </div>
                            <Button className="w-full h-14 rounded-2xl bg-black hover:bg-gray-800 text-white font-black text-sm gap-2">
                                <Share2 className="h-4 w-4" /> Share Store Link
                            </Button>
                        </div>
                    </section>

                    <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-[40px] p-8 text-white shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
                        <Zap className="h-10 w-10 text-yellow-300 mb-4 fill-yellow-300" />
                        <h3 className="text-xl font-black mb-2">Offline Collection</h3>
                        <p className="text-white/80 text-sm font-medium leading-relaxed">
                            Show your QR code at your physical store or delivery point. Customers scan, pay with Paystack, and you get notified instantly!
                        </p>
                    </div>
                </div>

                {/* Right Side: Dynamic Payment Generator */}
                <div className="lg:col-span-7 space-y-8">
                    <section className="bg-white rounded-[40px] p-10 border border-gray-100 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.05)]">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-14 h-14 rounded-3xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                                <Plus className="h-8 w-8" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-gray-900 tracking-tight">Generate Payment QR</h2>
                                <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Instant bill for specific amount</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Payment Amount (₦)</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₦</span>
                                        <Input 
                                            placeholder="5,000" 
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
                                            className="h-14 pl-10 rounded-2xl bg-gray-50 border-gray-100 focus:bg-white transition-all font-black text-lg"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Label (Optional)</label>
                                    <Input 
                                        placeholder="e.g. Delivery for Order #123" 
                                        value={label}
                                        onChange={(e) => setLabel(e.target.value)}
                                        className="h-14 rounded-2xl bg-gray-50 border-gray-100 focus:bg-white transition-all font-bold"
                                    />
                                </div>
                                <Button 
                                    onClick={handleGenerate}
                                    disabled={!amount || isGenerating}
                                    className="w-full h-16 rounded-[24px] bg-emerald-600 hover:bg-emerald-700 text-white font-black text-lg shadow-lg shadow-emerald-200"
                                >
                                    {isGenerating ? "Generating..." : "Generate QR Code"}
                                </Button>
                            </div>

                            <div className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-[40px] border border-gray-100 border-dashed">
                                {qrUrl ? (
                                    <motion.div 
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        className="text-center"
                                    >
                                        <img src={qrUrl} alt="Payment QR" className="w-48 h-48 mx-auto mb-4 mix-blend-multiply" />
                                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Scan to Pay ₦{Number(amount).toLocaleString()}</p>
                                        <div className="flex gap-2 mt-6">
                                            <Button size="sm" variant="outline" className="rounded-xl border-gray-200">
                                                <Download className="h-4 w-4" />
                                            </Button>
                                            <Button size="sm" variant="outline" className="rounded-xl border-gray-200">
                                                <Share2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </motion.div>
                                ) : (
                                    <div className="text-center space-y-4">
                                        <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto text-gray-200 border border-gray-100">
                                            <QrCode className="h-10 w-10" />
                                        </div>
                                        <p className="text-xs font-bold text-gray-400 max-w-[160px] mx-auto">Enter amount to generate a custom payment QR</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>

                    {/* How it works */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm flex items-start gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                <Smartphone className="h-6 w-6" />
                            </div>
                            <div>
                                <h4 className="font-black text-gray-900 text-sm">Customer Scans</h4>
                                <p className="text-xs font-medium text-gray-500 mt-1">Works with any smartphone camera or QR scanner.</p>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm flex items-start gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                                <ArrowRightLeft className="h-6 w-6" />
                            </div>
                            <div>
                                <h4 className="font-black text-gray-900 text-sm">Instant Sync</h4>
                                <p className="text-xs font-medium text-gray-500 mt-1">Payment is credited to your wallet immediately upon success.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
