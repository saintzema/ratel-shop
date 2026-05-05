"use client";

import { useState, useRef } from "react";
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
    Image as ImageIcon
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { DataSyncService } from "@/lib/sync-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QRCodeCanvas } from "qrcode.react";
import { getProxiedImageUrl } from "@/lib/utils";

export default function QRPaymentsPage() {
    const seller = DataSyncService.getCurrentSeller();
    const [amount, setAmount] = useState("");
    const [displayAmount, setDisplayAmount] = useState("");
    const [label, setLabel] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [qrValue, setQrValue] = useState("");
    const [copied, setCopied] = useState(false);
    const [history, setHistory] = useState<any[]>(DataSyncService.getOffListingInvoices());
    const qrRef = useRef<HTMLDivElement>(null);

    const isPremium = ["Pro", "Growth", "Scale"].includes(seller?.subscription_plan || "");
    const logoToUse = isPremium && seller?.logo_url ? getProxiedImageUrl(seller.logo_url) : "/logo.svg";

    const storeUrl = typeof window !== "undefined" 
        ? `${window.location.origin}/store/${seller?.store_url || seller?.id}`
        : "";

    const handleGenerate = () => {
        if (!amount) return;

        // Ensure bank details exist before generating payment link
        if (!seller?.account_number || !seller?.bank_name) {
            if (window.confirm("You must set up your bank settlement details first to receive payments. Redirect to banking settings?")) {
                window.location.href = "/seller/settings/payouts";
            }
            return;
        }

        setIsGenerating(true);
        
        // Use direct checkout link with sellerId and amount
        const paymentLink = `${window.location.origin}/checkout/direct?sellerId=${seller?.id}&amount=${amount}&label=${encodeURIComponent(label)}`;
        
        setTimeout(() => {
            const invoice = {
                id: `inv_${Math.random().toString(36).slice(2, 6).toUpperCase()}${Date.now().toString().slice(-4)}`,
                seller_id: seller?.id || "",
                amount: Number(amount),
                label: label || `Payment to ${seller?.business_name}`,
                status: "pending" as const,
                created_at: new Date().toISOString()
            };
            
            DataSyncService.addOffListingInvoice(invoice);
            setHistory(DataSyncService.getOffListingInvoices());
            
            setQrValue(paymentLink);
            setIsGenerating(false);
        }, 600);
    };

    const downloadQR = (id: string, fileName: string) => {
        const canvas = document.getElementById(id) as HTMLCanvasElement;
        if (!canvas) return;
        const url = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.href = url;
        link.download = `${fileName}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(storeUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (!seller) return null;

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-20 px-4 md:px-0">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tighter">QR Payments</h1>
                    <p className="text-gray-500 font-medium mt-1 italic">The WeChat of Africa approach. Collect payments anywhere.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="bg-emerald-100 text-emerald-700 px-4 py-2 rounded-2xl flex items-center gap-2 text-sm font-black border border-emerald-200">
                        <ShieldCheck className="h-4 w-4" />
                        Paystack Protected
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Side: Store QR (Permanent) */}
                <div className="lg:col-span-5 space-y-8">
                    <section className="bg-white rounded-[48px] p-8 md:p-10 border border-gray-100 shadow-[0_32px_80px_-20px_rgba(0,0,0,0.08)] text-center relative overflow-hidden group">
                        {/* Decorative Background */}
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-amber-400 via-emerald-500 to-blue-500" />
                        
                        <div className="mb-8">
                            <div className="w-16 h-16 bg-black text-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl rotate-3 group-hover:rotate-0 transition-transform duration-500">
                                <QrCode className="h-8 w-8" />
                            </div>
                            <h2 className="text-2xl font-black text-gray-900 mb-1">{seller.business_name}</h2>
                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em]">Scan to Browse Shop</p>
                        </div>
                        
                        <div className="relative inline-block p-6 bg-gradient-to-br from-gray-50 to-white rounded-[48px] border-8 border-white shadow-[inset_0_2px_4px_rgba(0,0,0,0.05),0_10px_30px_rgba(0,0,0,0.05)] mb-8">
                            <QRCodeCanvas 
                                id="store-qr"
                                value={storeUrl}
                                size={240}
                                level="H"
                                imageSettings={{
                                    src: logoToUse,
                                    x: undefined,
                                    y: undefined,
                                    height: 48,
                                    width: 48,
                                    excavate: true,
                                }}
                                fgColor="#000000"
                                className="rounded-[24px]"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <Button 
                                onClick={() => downloadQR("store-qr", `${seller.business_name}-Store-QR`)}
                                variant="outline" 
                                className="h-14 rounded-2xl border-gray-100 font-black gap-2 hover:bg-gray-50"
                            >
                                <Download className="h-4 w-4" /> Save
                            </Button>
                            <Button 
                                onClick={copyToClipboard}
                                variant="outline" 
                                className="h-14 rounded-2xl border-gray-100 font-black gap-2 hover:bg-gray-50"
                            >
                                {copied ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                                {copied ? "Copied" : "Copy Link"}
                            </Button>
                        </div>
                    </section>

                    <div className="bg-black rounded-[40px] p-8 text-white shadow-2xl relative overflow-hidden border border-white/10">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/20 rounded-full -mr-16 -mt-16 blur-3xl" />
                        <Zap className="h-10 w-10 text-emerald-400 mb-4 fill-emerald-400" />
                        <h3 className="text-xl font-black mb-2 tracking-tight">Offline Collection</h3>
                        <p className="text-gray-400 text-sm font-medium leading-relaxed">
                            Print this QR and paste it at your physical shop or delivery point. Customers pay instantly, you get notified in realtime.
                        </p>
                    </div>
                </div>

                {/* Right Side: Dynamic Payment Generator */}
                <div className="lg:col-span-7 space-y-8">
                    <section className="bg-white rounded-[48px] p-8 md:p-10 border border-gray-100 shadow-[0_32px_80px_-20px_rgba(0,0,0,0.08)]">
                        <div className="flex items-center gap-5 mb-10">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-200">
                                <Plus className="h-8 w-8" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-gray-900 tracking-tight">Instant Payment QR</h2>
                                <p className="text-xs font-black text-gray-400 uppercase tracking-widest mt-0.5">Generate a bill for a specific amount</p>
                            </div>
                        </div>

                        {!isPremium && (
                            <div className="mb-10 p-6 bg-gradient-to-br from-amber-50 to-orange-50 rounded-[32px] border border-amber-100 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center text-amber-500 shadow-md">
                                        <ImageIcon className="h-7 w-7" />
                                    </div>
                                    <div className="max-w-md">
                                        <h4 className="font-black text-gray-900 text-base">Custom QR Branding</h4>
                                        <p className="text-xs font-medium text-gray-600 mt-0.5">
                                            Replace the default logo with your store's brand logo on all QR codes. This feature is exclusive to our <strong>Pro, Growth, and Scale</strong> plans.
                                        </p>
                                    </div>
                                </div>
                                <Button 
                                    onClick={() => window.location.href = "/seller/settings/billing"}
                                    className="h-12 px-8 rounded-xl bg-gray-900 text-white font-black text-xs uppercase tracking-widest hover:bg-black transition-all hover:scale-105 active:scale-95 shadow-lg"
                                >
                                    Unlock Premium Branding
                                </Button>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Payment Amount (₦)</label>
                                    <div className="relative">
                                        <span className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 font-black text-lg">₦</span>
                                        <Input 
                                            placeholder="10,000" 
                                            value={displayAmount}
                                            onChange={(e) => {
                                                const val = e.target.value.replace(/\D/g, "");
                                                setAmount(val);
                                                setDisplayAmount(val ? Number(val).toLocaleString() : "");
                                            }}
                                            className="h-16 pl-12 rounded-2xl bg-gray-50 border-transparent focus:bg-white focus:border-emerald-500 transition-all font-black text-xl shadow-inner"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Memo / Order Ref</label>
                                    <Input 
                                        placeholder="e.g. Delivery for Mr. Jude" 
                                        value={label}
                                        onChange={(e) => setLabel(e.target.value)}
                                        className="h-16 rounded-2xl bg-gray-50 border-transparent focus:bg-white focus:border-emerald-500 transition-all font-bold shadow-inner"
                                    />
                                </div>
                                <Button 
                                    onClick={handleGenerate}
                                    disabled={!amount || isGenerating}
                                    className="w-full h-16 rounded-[24px] bg-emerald-600 hover:bg-emerald-700 text-white font-black text-lg shadow-xl shadow-emerald-100 transition-all active:scale-95"
                                >
                                    {isGenerating ? "Processing..." : "Create Payment QR"}
                                </Button>
                            </div>

                            <div className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-[48px] border-2 border-gray-100 border-dashed min-h-[320px]">
                                <AnimatePresence mode="wait">
                                    {qrValue ? (
                                        <motion.div 
                                            key="qr-code"
                                            initial={{ scale: 0.8, opacity: 0, rotate: -5 }}
                                            animate={{ scale: 1, opacity: 1, rotate: 0 }}
                                            exit={{ scale: 0.8, opacity: 0 }}
                                            className="text-center w-full"
                                        >
                                            <div className="bg-white p-6 rounded-[40px] shadow-2xl mb-6 relative group inline-block">
                                                <div className="absolute inset-0 bg-gradient-to-br from-amber-400/10 via-emerald-500/10 to-blue-500/10 rounded-[40px] blur-xl group-hover:blur-2xl transition-all" />
                                                <div className="relative">
                                                    <QRCodeCanvas 
                                                        id="payment-qr"
                                                        value={qrValue}
                                                        size={180}
                                                        level="H"
                                                        imageSettings={{
                                                            src: logoToUse,
                                                            x: undefined,
                                                            y: undefined,
                                                            height: 36,
                                                            width: 36,
                                                            excavate: true,
                                                        }}
                                                        fgColor="#000000"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">Scan to Pay</p>
                                                <p className="text-2xl font-black text-gray-900 tracking-tight">₦{Number(amount).toLocaleString()}</p>
                                            </div>
                                            <div className="flex gap-2 mt-8 justify-center">
                                                <Button 
                                                    size="sm" 
                                                    onClick={() => downloadQR("payment-qr", `Payment-₦${amount}`)}
                                                    variant="secondary" 
                                                    className="h-12 w-12 rounded-2xl bg-white border border-gray-100 shadow-sm"
                                                >
                                                    <Download className="h-5 w-5" />
                                                </Button>
                                                <Button 
                                                    size="sm" 
                                                    variant="secondary" 
                                                    className="h-12 w-12 rounded-2xl bg-white border border-gray-100 shadow-sm"
                                                >
                                                    <Share2 className="h-5 w-5" />
                                                </Button>
                                            </div>
                                        </motion.div>
                                    ) : (
                                        <motion.div 
                                            key="placeholder"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="text-center space-y-4"
                                        >
                                            <div className="w-24 h-24 bg-white rounded-[32px] flex items-center justify-center mx-auto text-gray-200 border border-gray-100 shadow-sm shadow-inner">
                                                <QrCode className="h-12 w-12" />
                                            </div>
                                            <p className="text-xs font-bold text-gray-400 max-w-[180px] mx-auto leading-relaxed">
                                                Enter an amount and memo to generate a secure payment link
                                            </p>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </section>

                    {/* Invoice History */}
                    {history.length > 0 && (
                        <section className="bg-white rounded-[40px] p-8 border border-gray-100 shadow-sm">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-black text-gray-900 tracking-tight">Recent Payment Links</h3>
                                <div className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-wider">Tracked</div>
                            </div>
                            <div className="space-y-4">
                                {history.slice(0, 5).map((inv) => (
                                    <div key={inv.id} className="flex items-center justify-between p-5 bg-gray-50 rounded-[24px] border border-gray-100 group hover:border-emerald-200 transition-all">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-gray-400 border border-gray-100 shadow-sm">
                                                <ArrowRightLeft className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <p className="font-black text-gray-900">₦{inv.amount.toLocaleString()}</p>
                                                <p className="text-[11px] font-bold text-gray-500 line-clamp-1">{inv.label}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full ${inv.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                                {inv.status}
                                            </span>
                                            <p className="text-[10px] text-gray-400 font-bold mt-1.5 opacity-60">
                                                {new Date(inv.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* How it works */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm flex items-start gap-5 hover:border-emerald-100 transition-colors">
                            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                                <Smartphone className="h-7 w-7" />
                            </div>
                            <div>
                                <h4 className="font-black text-gray-900 text-sm">Customer Scans</h4>
                                <p className="text-xs font-medium text-gray-500 mt-1 leading-relaxed">
                                    Works with any smartphone camera or QR scanner. No app required.
                                </p>
                            </div>
                        </div>
                        <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm flex items-start gap-5 hover:border-amber-100 transition-colors">
                            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
                                <ArrowRightLeft className="h-7 w-7" />
                            </div>
                            <div>
                                <h4 className="font-black text-gray-900 text-sm">Instant Sync</h4>
                                <p className="text-xs font-medium text-gray-500 mt-1 leading-relaxed">
                                    Payment is credited to your balance instantly upon success.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
