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
    Image as ImageIcon,
    Wallet,
    Sparkles,
    Clock,
    Link2,
    ChevronRight,
    BadgeCheck,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { DataSyncService } from "@/lib/sync-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QRCodeCanvas } from "qrcode.react";
import { getProxiedImageUrl } from "@/lib/utils";

// ─── Social share helpers ────────────────────────────────────────────────────
function buildWaShareUrl(url: string, bizName: string) {
    return `https://wa.me/?text=${encodeURIComponent(`Pay ${bizName} instantly via Fair QR Pay: ${url}`)}`;
}
function buildFbShareUrl(url: string) {
    return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
}
function buildXShareUrl(url: string, bizName: string) {
    return `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(`Pay ${bizName} instantly via Fair QR Pay on @FairPriceNG`)}`;
}

// ─── Social Share Row ────────────────────────────────────────────────────────
function ShareRow({ url, bizName, compact = false }: { url: string; bizName: string; compact?: boolean }) {
    const [copied, setCopied] = useState(false);

    const copy = async () => {
        try { await navigator.clipboard.writeText(url); } catch {}
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const btn = compact
        ? "h-9 w-9 rounded-xl flex items-center justify-center transition-all active:scale-90"
        : "h-10 w-10 rounded-2xl flex items-center justify-center transition-all active:scale-90";

    return (
        <div className="flex items-center gap-2">
            {/* WhatsApp */}
            <a
                href={buildWaShareUrl(url, bizName)}
                target="_blank"
                rel="noopener noreferrer"
                title="Share on WhatsApp"
                className={`${btn} bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/20`}
            >
                <svg viewBox="0 0 24 24" className={compact ? "h-4 w-4" : "h-5 w-5"} fill="#25D366">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
            </a>

            {/* Facebook */}
            <a
                href={buildFbShareUrl(url)}
                target="_blank"
                rel="noopener noreferrer"
                title="Share on Facebook"
                className={`${btn} bg-[#1877F2]/10 hover:bg-[#1877F2]/20 border border-[#1877F2]/20`}
            >
                <svg viewBox="0 0 24 24" className={compact ? "h-4 w-4" : "h-5 w-5"} fill="#1877F2">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
            </a>

            {/* X / Twitter */}
            <a
                href={buildXShareUrl(url, bizName)}
                target="_blank"
                rel="noopener noreferrer"
                title="Share on X"
                className={`${btn} bg-black/5 hover:bg-black/10 border border-black/10`}
            >
                <svg viewBox="0 0 24 24" className={compact ? "h-4 w-4" : "h-5 w-5"} fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
            </a>

            {/* Copy */}
            <button
                onClick={copy}
                title="Copy link"
                className={`${btn} ${copied ? "bg-emerald-500/20 border-emerald-400/30" : "bg-white/60 hover:bg-white/80 border border-white/40"} backdrop-blur-sm`}
            >
                {copied
                    ? <CheckCircle2 className={compact ? "h-4 w-4 text-emerald-500" : "h-5 w-5 text-emerald-500"} />
                    : <Copy className={compact ? "h-4 w-4 text-gray-500" : "h-5 w-5 text-gray-500"} />
                }
            </button>
        </div>
    );
}

// ─── Status badge ────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
    const cfg: Record<string, { label: string; cls: string }> = {
        paid:      { label: "Paid",      cls: "bg-emerald-500/15 text-emerald-600 border-emerald-400/20" },
        pending:   { label: "Pending",   cls: "bg-amber-500/15   text-amber-600   border-amber-400/20"   },
        delivered: { label: "Delivered", cls: "bg-blue-500/15    text-blue-600    border-blue-400/20"    },
        default:   { label: status,      cls: "bg-gray-200/60    text-gray-600    border-gray-300/20"    },
    };
    const { label, cls } = cfg[status] ?? cfg.default;
    return (
        <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${cls}`}>
            {label}
        </span>
    );
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function QRPaymentsPage() {
    const seller = DataSyncService.getCurrentSeller();
    const [amount, setAmount]               = useState("");
    const [displayAmount, setDisplayAmount] = useState("");
    const [label, setLabel]                 = useState("");
    const [isGenerating, setIsGenerating]   = useState(false);
    const [qrValue, setQrValue]             = useState("");
    const [copiedStore, setCopiedStore]     = useState(false);
    const [history, setHistory]             = useState<any[]>(DataSyncService.getOffListingInvoices());
    const qrRef = useRef<HTMLDivElement>(null);

    const isPremium  = ["Pro", "Growth", "Scale"].includes(seller?.subscription_plan || "");
    const logoToUse  = isPremium && seller?.logo_url ? getProxiedImageUrl(seller.logo_url) : "/logo.svg";
    const storeUrl   = typeof window !== "undefined"
        ? `${window.location.origin}/store/${seller?.store_url || seller?.id}`
        : "";
    const bizName    = seller?.business_name || "My Store";

    const handleGenerate = () => {
        if (!amount) return;
        if (!seller?.account_number || !seller?.bank_name) {
            if (window.confirm("Set up bank settlement details first to receive payments. Go to banking settings?")) {
                window.location.href = "/seller/settings/payouts";
            }
            return;
        }
        setIsGenerating(true);
        const paymentLink = `${window.location.origin}/checkout/direct?sellerId=${seller?.id}&amount=${amount}&label=${encodeURIComponent(label)}`;
        setTimeout(() => {
            const invoice = {
                id: `inv_${Math.random().toString(36).slice(2, 6).toUpperCase()}${Date.now().toString().slice(-4)}`,
                seller_id: seller?.id || "",
                amount: Number(amount),
                label: label || `Payment to ${bizName}`,
                status: "pending" as const,
                created_at: new Date().toISOString(),
                paymentLink,
            };
            DataSyncService.addOffListingInvoice(invoice);
            setHistory(DataSyncService.getOffListingInvoices());
            setQrValue(paymentLink);
            setIsGenerating(false);
        }, 700);
    };

    const downloadQR = (id: string, fileName: string) => {
        const canvas = document.getElementById(id) as HTMLCanvasElement;
        if (!canvas) return;
        const link = document.createElement("a");
        link.href  = canvas.toDataURL("image/png");
        link.download = `${fileName}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const copyStoreUrl = async () => {
        try { await navigator.clipboard.writeText(storeUrl); } catch {}
        setCopiedStore(true);
        setTimeout(() => setCopiedStore(false), 2000);
    };

    if (!seller) return null;

    return (
        /* ── Page wrapper with deep gradient backdrop ── */
        <div className="min-h-screen relative">
            {/* Ambient gradient blobs */}
            <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
                <div className="absolute -top-40 -left-40 w-[700px] h-[700px] rounded-full bg-indigo-600/10 blur-[120px]" />
                <div className="absolute top-1/3 right-0 w-[500px] h-[500px] rounded-full bg-emerald-500/8 blur-[100px]" />
                <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] rounded-full bg-blue-500/8 blur-[80px]" />
            </div>

            <div className="max-w-6xl mx-auto pb-28 px-4 md:px-6 space-y-8">

                {/* ── Hero Header ── */}
                <div className="pt-2 pb-4 flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        {/* FairPay wordmark */}
                        <div className="flex items-center gap-3 mb-3">
                            <div className="relative">
                                <div className="h-12 w-12 rounded-[18px] bg-gradient-to-br from-indigo-600 via-indigo-500 to-blue-500 flex items-center justify-center shadow-xl shadow-indigo-500/30">
                                    <QrCode className="h-6 w-6 text-white" />
                                </div>
                                <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center">
                                    <BadgeCheck className="h-3 w-3 text-white" />
                                </div>
                            </div>
                            <div>
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-3xl font-black tracking-tight text-gray-900">Fair</span>
                                    <span className="text-3xl font-black tracking-tight bg-gradient-to-r from-indigo-600 to-blue-500 bg-clip-text text-transparent">QR Pay</span>
                                </div>
                                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-400 -mt-0.5">Collect Payments Anywhere</p>
                            </div>
                        </div>
                    </div>

                    {/* Trust badges */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-[11px] font-black">
                            <ShieldCheck className="h-3.5 w-3.5" /> Paystack Protected
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 text-[11px] font-black">
                            <Zap className="h-3.5 w-3.5 fill-indigo-500" /> Instant Settlement
                        </div>
                    </div>
                </div>

                {/* ── Main Grid ── */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                    {/* ═══════════════════════════════════════════
                        LEFT — Store QR + Store Link
                    ════════════════════════════════════════════ */}
                    <div className="lg:col-span-5 space-y-5">

                        {/* Store QR Card — liquid glass */}
                        <div className="relative rounded-[40px] overflow-hidden">
                            {/* Card background: deep indigo gradient */}
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-700 via-indigo-600 to-blue-600" />
                            {/* Noise/grain texture layer */}
                            <div className="absolute inset-0 opacity-[0.04] bg-[url('/assets/images/noise.png')] bg-repeat mix-blend-overlay" />
                            {/* Gloss highlight */}
                            <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/15 to-transparent rounded-t-[40px]" />
                            {/* Inner blob */}
                            <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-blue-400/20 blur-3xl" />
                            <div className="absolute -bottom-10 -left-10 h-48 w-48 rounded-full bg-indigo-400/20 blur-2xl" />

                            <div className="relative p-8 text-center">
                                {/* FairQR Pay chip top */}
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-2">
                                        <div className="h-7 w-7 rounded-lg bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20">
                                            <QrCode className="h-3.5 w-3.5 text-white" />
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">Fair QR Pay</span>
                                    </div>
                                    <div className="text-[9px] font-black uppercase tracking-widest text-white/40 bg-white/10 px-2 py-1 rounded-lg border border-white/10">
                                        Store Code
                                    </div>
                                </div>

                                {/* Business name */}
                                <p className="text-white font-black text-xl tracking-tight mb-1">{bizName}</p>
                                <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.2em] mb-6">Scan to Browse & Pay</p>

                                {/* QR container — frosted glass card */}
                                <div className="inline-flex items-center justify-center p-5 rounded-[32px] bg-white/95 backdrop-blur-xl shadow-[0_8px_40px_rgba(0,0,0,0.25)] mb-6 border border-white/60">
                                    <QRCodeCanvas
                                        id="store-qr"
                                        value={storeUrl || "https://fairprice.ng"}
                                        size={200}
                                        level="H"
                                        imageSettings={{
                                            src: logoToUse,
                                            x: undefined,
                                            y: undefined,
                                            height: 44,
                                            width: 44,
                                            excavate: true,
                                        }}
                                        fgColor="#1e1b4b"
                                    />
                                </div>

                                {/* Action row */}
                                <div className="flex gap-3 justify-center mb-5">
                                    <button
                                        onClick={() => downloadQR("store-qr", `${bizName}-Store-QR`)}
                                        className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 backdrop-blur-sm border border-white/20 text-white text-xs font-black transition-all active:scale-95"
                                    >
                                        <Download className="h-3.5 w-3.5" /> Save QR
                                    </button>
                                    <button
                                        onClick={copyStoreUrl}
                                        className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl backdrop-blur-sm border text-xs font-black transition-all active:scale-95 ${copiedStore ? "bg-emerald-500/30 border-emerald-400/40 text-emerald-200" : "bg-white/15 hover:bg-white/25 border-white/20 text-white"}`}
                                    >
                                        {copiedStore ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                                        {copiedStore ? "Copied!" : "Copy Link"}
                                    </button>
                                </div>

                                {/* Social share */}
                                <div className="flex flex-col items-center gap-2">
                                    <p className="text-white/30 text-[9px] font-black uppercase tracking-widest">Share your store</p>
                                    <ShareRow url={storeUrl} bizName={bizName} />
                                </div>
                            </div>
                        </div>

                        {/* Your Store Link — glass card */}
                        <div className="rounded-[32px] bg-white/70 backdrop-blur-xl border border-white/60 shadow-[0_4px_24px_rgba(0,0,0,0.06)] p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="h-9 w-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                                    <Link2 className="h-4 w-4 text-indigo-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-black text-gray-900">Your Store Link</p>
                                    <p className="text-[10px] text-gray-400 font-medium">Share your catalog to social media</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 mb-4">
                                <span className="text-xs font-bold text-indigo-600 truncate flex-1">{storeUrl || "fairprice.ng/store/…"}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <ShareRow url={storeUrl} bizName={bizName} compact />
                                <button
                                    onClick={copyStoreUrl}
                                    className="text-[10px] font-black text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                                >
                                    {copiedStore ? "Copied!" : "Copy"} <ChevronRight className="h-3 w-3" />
                                </button>
                            </div>
                        </div>

                        {/* Offline tip */}
                        <div className="rounded-[32px] bg-gray-900 p-6 text-white relative overflow-hidden border border-white/5 shadow-xl">
                            <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-emerald-500/15 blur-2xl" />
                            <div className="relative flex items-start gap-4">
                                <div className="h-10 w-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/20 flex items-center justify-center shrink-0">
                                    <Zap className="h-5 w-5 text-emerald-400 fill-emerald-400" />
                                </div>
                                <div>
                                    <p className="font-black text-base mb-1">Offline Collection</p>
                                    <p className="text-gray-400 text-xs font-medium leading-relaxed">
                                        Print this QR and display it at your physical shop or delivery point. Customers pay instantly — you're notified in real time.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ═══════════════════════════════════════════
                        RIGHT — Payment QR Generator + History
                    ════════════════════════════════════════════ */}
                    <div className="lg:col-span-7 space-y-5">

                        {/* Generator card */}
                        <div className="rounded-[40px] bg-white/80 backdrop-blur-xl border border-white/60 shadow-[0_8px_40px_rgba(0,0,0,0.07)] overflow-hidden">

                            {/* Card header stripe */}
                            <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-blue-500 to-emerald-500" />

                            <div className="p-8">
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="h-12 w-12 rounded-[18px] bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                                        <Wallet className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black text-gray-900 tracking-tight">Instant Payment QR</h2>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Generate a bill for a specific amount</p>
                                    </div>
                                </div>

                                {/* Premium branding upsell */}
                                {!isPremium && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="mb-8 p-5 rounded-[28px] bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 flex flex-col sm:flex-row items-center gap-4"
                                    >
                                        <div className="h-12 w-12 rounded-2xl bg-white flex items-center justify-center text-amber-500 shadow border border-amber-100 shrink-0">
                                            <Sparkles className="h-6 w-6" />
                                        </div>
                                        <div className="flex-1 text-center sm:text-left">
                                            <p className="font-black text-gray-900 text-sm">Custom QR Branding</p>
                                            <p className="text-xs text-gray-500 mt-0.5">Add your logo to every QR code. Exclusive to Pro, Growth & Scale plans.</p>
                                        </div>
                                        <button
                                            onClick={() => window.location.href = "/seller/settings/billing"}
                                            className="shrink-0 h-10 px-6 rounded-xl bg-gray-900 text-white font-black text-xs uppercase tracking-wider hover:bg-black active:scale-95 transition-all shadow"
                                        >
                                            Upgrade
                                        </button>
                                    </motion.div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Form */}
                                    <div className="space-y-5">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Payment Amount (₦)</label>
                                            <div className="relative">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-black text-lg select-none">₦</span>
                                                <input
                                                    placeholder="10,000"
                                                    value={displayAmount}
                                                    onChange={(e) => {
                                                        const val = e.target.value.replace(/\D/g, "");
                                                        setAmount(val);
                                                        setDisplayAmount(val ? Number(val).toLocaleString() : "");
                                                    }}
                                                    className="w-full h-14 pl-10 pr-4 rounded-2xl bg-gray-50 border border-gray-100 focus:bg-white focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/20 transition-all font-black text-xl text-gray-900 placeholder:text-gray-300"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Memo / Order Ref</label>
                                            <input
                                                placeholder="e.g. Delivery for Mr. Jude"
                                                value={label}
                                                onChange={(e) => setLabel(e.target.value)}
                                                className="w-full h-14 px-4 rounded-2xl bg-gray-50 border border-gray-100 focus:bg-white focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/20 transition-all font-bold text-gray-900 placeholder:text-gray-300 text-sm"
                                            />
                                        </div>

                                        {/* Generate CTA — Apple Pay style */}
                                        <button
                                            onClick={handleGenerate}
                                            disabled={!amount || isGenerating}
                                            className="w-full h-14 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 disabled:from-gray-200 disabled:to-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-black text-base tracking-tight shadow-xl shadow-indigo-200 hover:shadow-indigo-300/60 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                                        >
                                            {isGenerating ? (
                                                <span className="flex items-center gap-2">
                                                    <motion.span
                                                        animate={{ rotate: 360 }}
                                                        transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
                                                        className="inline-block h-5 w-5 border-2 border-white/30 border-t-white rounded-full"
                                                    />
                                                    Generating…
                                                </span>
                                            ) : (
                                                <>
                                                    <QrCode className="h-5 w-5" />
                                                    Create Payment QR
                                                </>
                                            )}
                                        </button>
                                    </div>

                                    {/* QR preview panel */}
                                    <div className="flex flex-col items-center justify-center min-h-[280px] rounded-[32px] bg-gradient-to-br from-gray-50 to-gray-100/50 border-2 border-dashed border-gray-200 relative overflow-hidden">
                                        {/* subtle inner glow */}
                                        <div className="absolute inset-0 rounded-[32px] bg-gradient-to-br from-indigo-50/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                                        <AnimatePresence mode="wait">
                                            {qrValue ? (
                                                <motion.div
                                                    key="qr"
                                                    initial={{ scale: 0.75, opacity: 0, rotate: -4 }}
                                                    animate={{ scale: 1, opacity: 1, rotate: 0 }}
                                                    exit={{ scale: 0.75, opacity: 0 }}
                                                    transition={{ type: "spring", damping: 16, stiffness: 280 }}
                                                    className="text-center w-full px-4"
                                                >
                                                    {/* QR with glass card */}
                                                    <div className="inline-flex flex-col items-center bg-white rounded-[28px] p-5 shadow-[0_12px_40px_rgba(99,102,241,0.18)] border border-indigo-50 mb-4 relative">
                                                        <div className="absolute top-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
                                                            <div className="h-1 w-1 rounded-full bg-indigo-200" />
                                                            <span className="text-[8px] font-black text-indigo-300 uppercase tracking-widest">Fair QR Pay</span>
                                                            <div className="h-1 w-1 rounded-full bg-indigo-200" />
                                                        </div>
                                                        <div className="mt-3">
                                                            <QRCodeCanvas
                                                                id="payment-qr"
                                                                value={qrValue}
                                                                size={160}
                                                                level="H"
                                                                imageSettings={{
                                                                    src: logoToUse,
                                                                    x: undefined,
                                                                    y: undefined,
                                                                    height: 32,
                                                                    width: 32,
                                                                    excavate: true,
                                                                }}
                                                                fgColor="#1e1b4b"
                                                            />
                                                        </div>
                                                    </div>

                                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500 mb-0.5">Scan to Pay</p>
                                                    <p className="text-2xl font-black text-gray-900">₦{Number(amount).toLocaleString()}</p>
                                                    {label && <p className="text-xs text-gray-400 font-medium mt-0.5">{label}</p>}

                                                    {/* Action strip */}
                                                    <div className="flex items-center justify-center gap-2 mt-4">
                                                        <button
                                                            onClick={() => downloadQR("payment-qr", `FairQRPay-₦${amount}`)}
                                                            className="h-10 w-10 rounded-2xl bg-white border border-gray-100 shadow-sm flex items-center justify-center text-gray-500 hover:text-indigo-600 hover:border-indigo-200 transition-all active:scale-90"
                                                        >
                                                            <Download className="h-4 w-4" />
                                                        </button>
                                                        <ShareRow url={qrValue} bizName={bizName} compact />
                                                    </div>
                                                </motion.div>
                                            ) : (
                                                <motion.div
                                                    key="empty"
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    className="text-center px-6 space-y-3"
                                                >
                                                    <div className="w-20 h-20 rounded-[28px] bg-white border border-gray-100 shadow-sm flex items-center justify-center mx-auto">
                                                        <QrCode className="h-10 w-10 text-gray-200" />
                                                    </div>
                                                    <p className="text-xs font-bold text-gray-400 leading-relaxed max-w-[160px] mx-auto">
                                                        Enter an amount and memo to generate a secure payment QR
                                                    </p>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Invoice History */}
                        {history.length > 0 && (
                            <div className="rounded-[36px] bg-white/80 backdrop-blur-xl border border-white/60 shadow-[0_4px_24px_rgba(0,0,0,0.06)] p-7">
                                <div className="flex items-center justify-between mb-5">
                                    <div className="flex items-center gap-3">
                                        <div className="h-9 w-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                                            <Clock className="h-4 w-4 text-indigo-600" />
                                        </div>
                                        <h3 className="text-base font-black text-gray-900">Recent Payment Links</h3>
                                    </div>
                                    <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-full uppercase tracking-widest">Tracked</span>
                                </div>
                                <div className="space-y-3">
                                    {history.slice(0, 5).map((inv) => (
                                        <div
                                            key={inv.id}
                                            className="flex items-center justify-between p-4 rounded-[20px] bg-gray-50/80 border border-gray-100 hover:border-indigo-100 hover:bg-indigo-50/30 transition-all group"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="h-9 w-9 rounded-xl bg-white border border-gray-100 shadow-sm flex items-center justify-center text-indigo-400 shrink-0">
                                                    <ArrowRightLeft className="h-4 w-4" />
                                                </div>
                                                <div>
                                                    <p className="font-black text-gray-900 text-sm">₦{inv.amount.toLocaleString()}</p>
                                                    <p className="text-[11px] font-bold text-gray-400 line-clamp-1">{inv.label}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <StatusBadge status={inv.status} />
                                                <div className="text-right hidden sm:block">
                                                    <p className="text-[10px] text-gray-400 font-bold">{new Date(inv.created_at).toLocaleDateString()}</p>
                                                </div>
                                                {inv.paymentLink && (
                                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <ShareRow url={inv.paymentLink} bizName={bizName} compact />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* How it works — glass tiles */}
                        <div className="grid grid-cols-2 gap-4">
                            {[
                                {
                                    icon: Smartphone,
                                    color: "blue",
                                    title: "Customer Scans",
                                    desc: "Works with any smartphone camera. No app download required.",
                                },
                                {
                                    icon: Zap,
                                    color: "emerald",
                                    title: "Instant Sync",
                                    desc: "Payment credited to your balance instantly upon success.",
                                },
                            ].map(({ icon: Icon, color, title, desc }) => (
                                <div
                                    key={title}
                                    className="rounded-[28px] bg-white/70 backdrop-blur-xl border border-white/60 shadow-sm p-6 flex flex-col gap-4 hover:shadow-md transition-all"
                                >
                                    <div className={`h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 ${
                                        color === "blue" ? "bg-blue-50 border border-blue-100 text-blue-600" : "bg-emerald-50 border border-emerald-100 text-emerald-600"
                                    }`}>
                                        <Icon className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="font-black text-gray-900 text-sm">{title}</p>
                                        <p className="text-xs font-medium text-gray-500 mt-1 leading-relaxed">{desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
