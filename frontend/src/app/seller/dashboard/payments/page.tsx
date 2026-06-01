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
    Wallet,
    Sparkles,
    Clock,
    Link2,
    ChevronRight,
    BadgeCheck,
    X,
    Ban,
    RefreshCw,
    Eye,
    Printer,
    Receipt,
    TrendingUp,
    ExternalLink,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { DataSyncService } from "@/lib/sync-store";
import { QRCodeCanvas } from "qrcode.react";
import { getProxiedImageUrl } from "@/lib/utils";

// ─── Social share helpers ────────────────────────────────────────────────────
function buildWaShareUrl(url: string, bizName: string) {
    return `https://wa.me/?text=${encodeURIComponent(`Pay ${bizName} instantly via FairPay QR Scan: ${url}`)}`;
}
function buildFbShareUrl(url: string) {
    return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
}
function buildXShareUrl(url: string, bizName: string) {
    return `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(`Pay ${bizName} instantly via FairPay QR Scan on @FairPriceNG`)}`;
}

// ─── Social Share Row ────────────────────────────────────────────────────────
// `variant="dark"` = shown inside the indigo QR card (white-friendly backgrounds)
function ShareRow({
    url,
    bizName,
    compact = false,
    variant = "light",
}: {
    url: string;
    bizName: string;
    compact?: boolean;
    variant?: "light" | "dark";
}) {
    const [copied, setCopied] = useState(false);

    const copy = async () => {
        try { await navigator.clipboard.writeText(url); } catch {}
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const size = compact ? "h-9 w-9" : "h-10 w-10";
    const iconSize = compact ? "h-4 w-4" : "h-5 w-5";
    const base = `${size} rounded-xl flex items-center justify-center transition-all active:scale-90`;

    // On dark (indigo) card: all buttons use white/translucent backgrounds so they're visible
    const waBg   = variant === "dark" ? "bg-white/20 hover:bg-white/30 border border-white/25" : "bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/20";
    const fbBg   = variant === "dark" ? "bg-white/20 hover:bg-white/30 border border-white/25" : "bg-[#1877F2]/10 hover:bg-[#1877F2]/20 border border-[#1877F2]/20";
    const xBg    = variant === "dark" ? "bg-white/20 hover:bg-white/30 border border-white/25" : "bg-black/5 hover:bg-black/10 border border-black/10";
    const copyBg = copied
        ? "bg-emerald-500/30 border-emerald-400/40"
        : variant === "dark"
            ? "bg-white/20 hover:bg-white/30 border border-white/25"
            : "bg-white/60 hover:bg-white/80 border border-white/40 backdrop-blur-sm";
    const waIcon  = variant === "dark" ? "white" : "#25D366";
    const fbIcon  = variant === "dark" ? "white" : "#1877F2";
    const xIcon   = variant === "dark" ? "white" : "currentColor";

    return (
        <div className="flex items-center gap-2">
            <a href={buildWaShareUrl(url, bizName)} target="_blank" rel="noopener noreferrer" title="Share on WhatsApp" className={`${base} ${waBg}`}>
                <svg viewBox="0 0 24 24" className={iconSize} fill={waIcon}>
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
            </a>
            <a href={buildFbShareUrl(url)} target="_blank" rel="noopener noreferrer" title="Share on Facebook" className={`${base} ${fbBg}`}>
                <svg viewBox="0 0 24 24" className={iconSize} fill={fbIcon}>
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
            </a>
            <a href={buildXShareUrl(url, bizName)} target="_blank" rel="noopener noreferrer" title="Share on X" className={`${base} ${xBg}`}>
                <svg viewBox="0 0 24 24" className={iconSize} fill={xIcon}>
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
            </a>
            <button onClick={copy} title="Copy link" className={`${base} ${copyBg}`}>
                {copied
                    ? <CheckCircle2 className={`${iconSize} text-emerald-400`} />
                    : <Copy className={`${iconSize} ${variant === "dark" ? "text-white" : "text-gray-500"}`} />}
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
        revoked:   { label: "Revoked",   cls: "bg-red-500/15     text-red-600     border-red-400/20"     },
        default:   { label: status,      cls: "bg-gray-200/60    text-gray-600    border-gray-300/20"    },
    };
    const { label, cls } = cfg[status] ?? cfg.default;
    return (
        <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${cls}`}>
            {label}
        </span>
    );
}

// ─── Invoice Print Helper ────────────────────────────────────────────────────
function printInvoice(inv: any, bizName: string, sellerEmail?: string) {
    const w = window.open("", "_blank", "width=800,height=600");
    if (!w) return;
    w.document.write(`
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Invoice ${inv.id}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
  body { background: #fff; color: #111; padding: 48px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 2px solid #f0f0f0; padding-bottom: 32px; }
  .brand { font-size: 28px; font-weight: 900; color: #4f46e5; }
  .brand span { color: #111; }
  .badge { font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.2em; color: #6366f1; background: #eef2ff; padding: 6px 14px; border-radius: 999px; display: inline-block; margin-top: 4px; }
  .inv-title { font-size: 13px; font-weight: 700; color: #888; text-transform: uppercase; letter-spacing: 0.1em; }
  .inv-id { font-size: 22px; font-weight: 900; color: #111; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; margin: 32px 0; }
  th { text-align: left; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.15em; color: #888; padding: 0 0 12px; border-bottom: 1px solid #f0f0f0; }
  td { padding: 16px 0; border-bottom: 1px solid #f8f8f8; font-size: 14px; }
  .total-row td { font-weight: 900; font-size: 18px; color: #4f46e5; border-bottom: none; padding-top: 20px; }
  .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; background: #f8f8ff; padding: 24px; border-radius: 16px; margin-bottom: 32px; }
  .meta-label { font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.15em; color: #888; margin-bottom: 4px; }
  .meta-value { font-size: 14px; font-weight: 700; color: #111; }
  .footer { margin-top: 40px; font-size: 11px; color: #aaa; text-align: center; }
  @media print { body { padding: 20px; } }
</style>
</head>
<body>
<div class="header">
  <div>
    <div class="brand">Fair<span>Price</span></div>
    <div class="badge">FairPay QR Scan</div>
  </div>
  <div style="text-align:right">
    <div class="inv-title">Invoice</div>
    <div class="inv-id">${inv.id}</div>
  </div>
</div>
<div class="meta">
  <div><div class="meta-label">Bill From</div><div class="meta-value">${bizName}</div>${sellerEmail ? `<div style="font-size:12px;color:#888;margin-top:2px">${sellerEmail}</div>` : ""}</div>
  <div><div class="meta-label">Date Issued</div><div class="meta-value">${new Date(inv.created_at).toLocaleDateString("en-NG", { year:"numeric", month:"long", day:"numeric" })}</div></div>
  <div><div class="meta-label">Status</div><div class="meta-value" style="color:${inv.status==="paid"?"#059669":inv.status==="pending"?"#d97706":"#6b7280"}">${inv.status.toUpperCase()}</div></div>
  <div><div class="meta-label">Payment Method</div><div class="meta-value">QR / Scan-to-Pay</div></div>
</div>
<table>
  <thead><tr><th>Description</th><th>Qty</th><th style="text-align:right">Amount</th></tr></thead>
  <tbody>
    <tr><td>${inv.label || "Payment"}</td><td>1</td><td style="text-align:right">₦${Number(inv.amount).toLocaleString()}</td></tr>
  </tbody>
  <tfoot>
    <tr class="total-row"><td colspan="2">Total Due</td><td style="text-align:right">₦${Number(inv.amount).toLocaleString()}</td></tr>
  </tfoot>
</table>
<p style="font-size:12px;color:#888;text-align:center;margin-bottom:8px">Secured by FairPrice Escrow Protection</p>
<div class="footer">fairprice.ng · FairPay QR Scan · Generated ${new Date().toLocaleString()}</div>
</body>
</html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 400);
}

// ─── Payment Detail Modal ────────────────────────────────────────────────────
function PaymentDetailModal({
    inv,
    bizName,
    logoUrl,
    sellerEmail,
    onClose,
    onRevoke,
    onReactivate,
}: {
    inv: any;
    bizName: string;
    logoUrl: string;
    sellerEmail?: string;
    onClose: () => void;
    onRevoke: (id: string) => void;
    onReactivate: (id: string) => void;
}) {
    const isRevoked = inv.status === "revoked";
    const paymentUrl = inv.paymentLink || "";

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div
                initial={{ opacity: 0, y: 60, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 60, scale: 0.96 }}
                transition={{ type: "spring", damping: 22, stiffness: 320 }}
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-lg bg-white rounded-[36px] shadow-2xl overflow-hidden"
            >
                {/* Top stripe */}
                <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-blue-500 to-emerald-500" />

                <div className="p-7">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center overflow-hidden">
                                {logoUrl && logoUrl !== "/logo.svg"
                                    ? <img src={getProxiedImageUrl(logoUrl)} alt="" className="h-10 w-10 object-cover rounded-xl" />
                                    : <QrCode className="h-6 w-6 text-indigo-400" />}
                            </div>
                            <div>
                                <p className="font-black text-gray-900 text-base">{inv.label || "Payment"}</p>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{inv.id}</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="h-9 w-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
                            <X className="h-4 w-4 text-gray-500" />
                        </button>
                    </div>

                    {/* Amount + status */}
                    <div className="flex items-center justify-between p-5 rounded-[24px] bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 mb-6">
                        <div>
                            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Amount</p>
                            <p className="text-3xl font-black text-indigo-700">₦{Number(inv.amount).toLocaleString()}</p>
                        </div>
                        <StatusBadge status={inv.status} />
                    </div>

                    {/* Stats row */}
                    <div className="grid grid-cols-3 gap-3 mb-6">
                        {[
                            { label: "Scans", value: inv.scan_count ?? 0, icon: Eye },
                            { label: "Checkouts", value: inv.checkout_count ?? 0, icon: TrendingUp },
                            { label: "Created", value: new Date(inv.created_at).toLocaleDateString("en-NG", { month: "short", day: "numeric" }), icon: Clock },
                        ].map(({ label, value, icon: Icon }) => (
                            <div key={label} className="p-4 rounded-[20px] bg-gray-50 border border-gray-100 text-center">
                                <Icon className="h-4 w-4 text-gray-400 mx-auto mb-1" />
                                <p className="text-lg font-black text-gray-900">{value}</p>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
                            </div>
                        ))}
                    </div>

                    {/* QR code + payment link */}
                    {paymentUrl && !isRevoked && (
                        <div className="flex flex-col sm:flex-row gap-4 mb-5 p-4 bg-gray-50 rounded-[20px] border border-gray-100">
                            {/* QR */}
                            <div className="flex flex-col items-center gap-2 shrink-0">
                                <div className="p-3 bg-white rounded-2xl border border-gray-100 shadow-sm inline-flex">
                                    <QRCodeCanvas
                                        id={`modal-qr-${inv.id}`}
                                        value={paymentUrl}
                                        size={108}
                                        level="H"
                                        imageSettings={logoUrl && logoUrl !== "/logo.svg" ? {
                                            src: logoUrl,
                                            x: undefined, y: undefined,
                                            height: 20, width: 20, excavate: true,
                                        } : undefined}
                                    />
                                </div>
                                <button
                                    onClick={() => {
                                        const canvas = document.getElementById(`modal-qr-${inv.id}`) as HTMLCanvasElement;
                                        if (canvas) { const a = document.createElement("a"); a.href = canvas.toDataURL("image/png"); a.download = `payment-${inv.id}.png`; a.click(); }
                                    }}
                                    className="flex items-center gap-1 text-[10px] font-black text-indigo-600 hover:text-indigo-700 uppercase tracking-widest"
                                >
                                    <Download className="h-3 w-3" /> Save QR
                                </button>
                            </div>
                            {/* Link + share */}
                            <div className="flex-1 flex flex-col justify-between gap-3 min-w-0">
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Payment Link</p>
                                    <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-3 py-2">
                                        <Link2 className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                                        <span className="text-xs font-bold text-indigo-600 truncate flex-1">{paymentUrl}</span>
                                        <a href={paymentUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 h-6 w-6 rounded-lg bg-indigo-50 flex items-center justify-center hover:bg-indigo-100 transition-colors">
                                            <ExternalLink className="h-3 w-3 text-indigo-500" />
                                        </a>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Share</p>
                                    <ShareRow url={paymentUrl} bizName={bizName} compact />
                                </div>
                            </div>
                        </div>
                    )}
                    {/* Revoked link (no QR, just text) */}
                    {paymentUrl && isRevoked && (
                        <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 mb-5 opacity-50">
                            <Link2 className="h-4 w-4 text-gray-400 shrink-0" />
                            <span className="text-xs font-medium text-gray-400 truncate flex-1 line-through">{paymentUrl}</span>
                        </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex gap-3">
                        <button
                            onClick={() => printInvoice(inv, bizName, sellerEmail)}
                            className="flex-1 h-11 rounded-2xl bg-gray-900 text-white font-black text-sm flex items-center justify-center gap-2 hover:bg-black active:scale-95 transition-all"
                        >
                            <Printer className="h-4 w-4" /> Print Invoice
                        </button>
                        {isRevoked ? (
                            <button
                                onClick={() => { onReactivate(inv.id); onClose(); }}
                                className="flex-1 h-11 rounded-2xl bg-emerald-600 text-white font-black text-sm flex items-center justify-center gap-2 hover:bg-emerald-700 active:scale-95 transition-all"
                            >
                                <RefreshCw className="h-4 w-4" /> Reactivate
                            </button>
                        ) : (
                            <button
                                onClick={() => { onRevoke(inv.id); onClose(); }}
                                className="flex-1 h-11 rounded-2xl bg-red-50 border border-red-100 text-red-600 font-black text-sm flex items-center justify-center gap-2 hover:bg-red-100 active:scale-95 transition-all"
                            >
                                <Ban className="h-4 w-4" /> Revoke QR
                            </button>
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
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
    const [selectedInv, setSelectedInv]     = useState<any>(null);

    const isPremium  = ["Pro", "Growth", "Scale"].includes(seller?.subscription_plan || "");
    const logoToUse  = isPremium && seller?.logo_url ? getProxiedImageUrl(seller.logo_url) : "/logo.svg";
    const storeUrl   = typeof window !== "undefined"
        ? `${window.location.origin}/store/${seller?.store_url || seller?.id}`
        : "";
    const bizName    = seller?.business_name || "My Store";

    const handleGenerate = () => {
        // Allow generating without an amount — produces a store QR the customer can use to pay any amount
        if (!seller?.account_number || !seller?.bank_name) {
            if (window.confirm("Set up bank settlement details first to receive payments. Go to banking settings?")) {
                window.location.href = "/seller/settings/payouts";
            }
            return;
        }
        setIsGenerating(true);

        // Include seller logo so the cart item shows the seller's brand image
        const logoParam = seller?.logo_url ? `&image=${encodeURIComponent(seller.logo_url)}` : "";
        const paymentLink = amount
            ? `${window.location.origin}/checkout/direct?sellerId=${seller?.id}&amount=${amount}&label=${encodeURIComponent(label || `Payment to ${bizName}`)}${logoParam}`
            : storeUrl; // No amount → store link (browse & pay)

        setTimeout(() => {
            const invoice = {
                id: `inv_${Math.random().toString(36).slice(2, 6).toUpperCase()}${Date.now().toString().slice(-4)}`,
                seller_id: seller?.id || "",
                amount: Number(amount) || 0,
                label: label || (amount ? `Payment to ${bizName}` : `Store QR — ${bizName}`),
                status: "pending" as const,
                created_at: new Date().toISOString(),
                paymentLink,
                scan_count: 0,
                checkout_count: 0,
            };
            DataSyncService.addOffListingInvoice(invoice);
            const updated = DataSyncService.getOffListingInvoices();
            setHistory(updated);
            setQrValue(paymentLink);
            setIsGenerating(false);
        }, 700);
    };

    const revokeInvoice = (id: string) => {
        const updated = history.map(inv =>
            inv.id === id ? { ...inv, status: "revoked" } : inv
        );
        setHistory(updated);
        // Persist
        try {
            const raw = localStorage.getItem("fp_off_listing_invoices");
            if (raw) {
                const parsed = JSON.parse(raw);
                const patched = parsed.map((inv: any) => inv.id === id ? { ...inv, status: "revoked" } : inv);
                localStorage.setItem("fp_off_listing_invoices", JSON.stringify(patched));
            }
        } catch {}
    };

    const reactivateInvoice = (id: string) => {
        const updated = history.map(inv =>
            inv.id === id ? { ...inv, status: "pending" } : inv
        );
        setHistory(updated);
        try {
            const raw = localStorage.getItem("fp_off_listing_invoices");
            if (raw) {
                const parsed = JSON.parse(raw);
                const patched = parsed.map((inv: any) => inv.id === id ? { ...inv, status: "pending" } : inv);
                localStorage.setItem("fp_off_listing_invoices", JSON.stringify(patched));
            }
        } catch {}
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
        <>
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
                                    <span className="text-3xl font-black tracking-tight text-gray-900">FairPay</span>
                                    <span className="text-3xl font-black tracking-tight bg-gradient-to-r from-indigo-600 to-blue-500 bg-clip-text text-transparent">QR Scan</span>
                                </div>
                                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-400 -mt-0.5">Collect Payments Anywhere</p>
                            </div>
                        </div>
                    </div>

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

                    {/* ═══ LEFT — Store QR + Store Link ═══ */}
                    <div className="lg:col-span-5 space-y-5">

                        {/* Store QR Card — liquid glass */}
                        <div className="relative rounded-[40px] overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-700 via-indigo-600 to-blue-600" />
                            <div className="absolute inset-0 opacity-[0.04] bg-[url('/assets/images/noise.png')] bg-repeat mix-blend-overlay" />
                            <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/15 to-transparent rounded-t-[40px]" />
                            <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-blue-400/20 blur-3xl" />
                            <div className="absolute -bottom-10 -left-10 h-48 w-48 rounded-full bg-indigo-400/20 blur-2xl" />

                            <div className="relative p-8 text-center">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-2">
                                        <div className="h-7 w-7 rounded-lg bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20">
                                            <QrCode className="h-3.5 w-3.5 text-white" />
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70">FairPay QR Scan</span>
                                    </div>
                                    <div className="text-[9px] font-black uppercase tracking-widest text-white/50 bg-white/10 px-2 py-1 rounded-lg border border-white/10">
                                        Store Code
                                    </div>
                                </div>

                                <p className="text-white font-black text-xl tracking-tight mb-1">{bizName}</p>
                                <p className="text-white/50 text-[10px] font-bold uppercase tracking-[0.2em] mb-6">Scan to Browse & Pay</p>

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

                                <div className="flex gap-3 justify-center mb-6">
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

                                {/* Social share — white variant for dark bg */}
                                <div className="flex flex-col items-center gap-3">
                                    <p className="text-white/60 text-[9px] font-black uppercase tracking-widest">Share your store</p>
                                    <ShareRow url={storeUrl} bizName={bizName} variant="dark" />
                                </div>
                            </div>
                        </div>

                        {/* Your Store Link */}
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
                                <button onClick={copyStoreUrl} className="text-[10px] font-black text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
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

                    {/* ═══ RIGHT — Payment QR Generator + History ═══ */}
                    <div className="lg:col-span-7 space-y-5">

                        {/* Generator card */}
                        <div className="rounded-[40px] bg-white/80 backdrop-blur-xl border border-white/60 shadow-[0_8px_40px_rgba(0,0,0,0.07)] overflow-hidden">
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
                                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Payment Amount (₦) <span className="normal-case font-normal text-gray-300">— optional</span></label>
                                            <div className="relative">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-black text-lg select-none">₦</span>
                                                <input
                                                    placeholder="Leave blank for open amount"
                                                    value={displayAmount}
                                                    onChange={(e) => {
                                                        const val = e.target.value.replace(/\D/g, "");
                                                        setAmount(val);
                                                        setDisplayAmount(val ? Number(val).toLocaleString() : "");
                                                    }}
                                                    className="w-full h-14 pl-10 pr-4 rounded-2xl bg-gray-50 border border-gray-100 focus:bg-white focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/20 transition-all font-black text-xl text-gray-900 placeholder:text-gray-300 placeholder:text-sm placeholder:font-medium"
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

                                        {/* Generate CTA */}
                                        <button
                                            onClick={handleGenerate}
                                            disabled={isGenerating}
                                            className="w-full h-14 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-black text-base tracking-tight shadow-xl shadow-indigo-200 hover:shadow-indigo-300/60 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
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
                                                    {amount ? `Create Payment QR — ₦${Number(amount).toLocaleString()}` : "Create Payment QR"}
                                                </>
                                            )}
                                        </button>
                                    </div>

                                    {/* QR preview panel */}
                                    <div className="flex flex-col items-center justify-center min-h-[280px] rounded-[32px] bg-gradient-to-br from-gray-50 to-gray-100/50 border-2 border-dashed border-gray-200 relative overflow-hidden">
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
                                                    <div className="inline-flex flex-col items-center bg-white rounded-[28px] p-5 shadow-[0_12px_40px_rgba(99,102,241,0.18)] border border-indigo-50 mb-4 relative">
                                                        <div className="absolute top-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
                                                            <div className="h-1 w-1 rounded-full bg-indigo-200" />
                                                            <span className="text-[8px] font-black text-indigo-300 uppercase tracking-widest">FairPay QR</span>
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
                                                    {amount
                                                        ? <p className="text-2xl font-black text-gray-900">₦{Number(amount).toLocaleString()}</p>
                                                        : <p className="text-sm font-black text-gray-500">Open Amount</p>}
                                                    {label && <p className="text-xs text-gray-400 font-medium mt-0.5">{label}</p>}

                                                    <div className="flex items-center justify-center gap-2 mt-4">
                                                        <button
                                                            onClick={() => downloadQR("payment-qr", `FairPayQR-${amount ? `₦${amount}` : "OpenAmount"}`)}
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
                                                        Click "Create Payment QR" to generate — amount is optional
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
                                        <h3 className="text-base font-black text-gray-900">Payment Links</h3>
                                    </div>
                                    <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-full uppercase tracking-widest">
                                        {history.length} total
                                    </span>
                                </div>
                                <div className="space-y-3">
                                    {history.slice(0, 8).map((inv) => (
                                        <button
                                            key={inv.id}
                                            onClick={() => setSelectedInv(inv)}
                                            className="w-full flex items-center justify-between p-4 rounded-[20px] bg-gray-50/80 border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/40 transition-all group text-left"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="h-9 w-9 rounded-xl bg-white border border-gray-100 shadow-sm flex items-center justify-center text-indigo-400 shrink-0">
                                                    {inv.status === "revoked"
                                                        ? <Ban className="h-4 w-4 text-red-400" />
                                                        : <ArrowRightLeft className="h-4 w-4" />}
                                                </div>
                                                <div>
                                                    <p className="font-black text-gray-900 text-sm">
                                                        {inv.amount ? `₦${Number(inv.amount).toLocaleString()}` : "Open Amount"}
                                                    </p>
                                                    <p className="text-[11px] font-bold text-gray-400 line-clamp-1">{inv.label}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <StatusBadge status={inv.status} />
                                                <div className="text-right hidden sm:block">
                                                    <p className="text-[10px] text-gray-400 font-bold">{new Date(inv.created_at).toLocaleDateString()}</p>
                                                </div>
                                                <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-indigo-400 transition-colors" />
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* How it works */}
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

        {/* Payment Detail Modal */}
        <AnimatePresence>
            {selectedInv && (
                <PaymentDetailModal
                    inv={selectedInv}
                    bizName={bizName}
                    logoUrl={seller?.logo_url || ""}
                    sellerEmail={(seller as any)?.email || (seller as any)?.contact_email || ""}
                    onClose={() => setSelectedInv(null)}
                    onRevoke={(id) => {
                        revokeInvoice(id);
                        setHistory(h => h.map(i => i.id === id ? { ...i, status: "revoked" } : i));
                    }}
                    onReactivate={(id) => {
                        reactivateInvoice(id);
                        setHistory(h => h.map(i => i.id === id ? { ...i, status: "pending" } : i));
                    }}
                />
            )}
        </AnimatePresence>
        </>
    );
}
