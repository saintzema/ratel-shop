"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";
import { generateQuotePdf } from "@/lib/quote-pdf";
import { Download, Copy, Check, MessageCircle, Link as LinkIcon, Loader2 } from "lucide-react";

export default function SellerQuoteDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;
    const [quote, setQuote] = useState<any>(null);
    const [sellerName, setSellerName] = useState("");
    const [sellerLogo, setSellerLogo] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);
    const [generatingPdf, setGeneratingPdf] = useState(false);

    const authHeaders = (): HeadersInit => {
        const token = typeof window !== "undefined" ? localStorage.getItem("fp_token") : null;
        return token ? { Authorization: `Bearer ${token}` } : {};
    };

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch(`/api/seller/quotes/${id}`, { headers: authHeaders() });
                if (!res.ok) { router.push("/seller/quotes"); return; }
                const data = await res.json();
                setQuote(data.quote);
                // Public endpoint already includes seller display info, reuse it
                const pub = await fetch(`/api/quotes/${id}`);
                if (pub.ok) {
                    const pubData = await pub.json();
                    setSellerName(pubData.quote.seller.businessName);
                    setSellerLogo(pubData.quote.seller.logoUrl);
                }
            } finally {
                setLoading(false);
            }
        })();
    }, [id, router]);

    if (loading) return <div className="p-12 text-center text-gray-500 animate-pulse">Loading quote...</div>;
    if (!quote) return null;

    const publicUrl = `https://www.fairprice.ng/quote/${id}`;
    const balance = quote.total - quote.amountPaid;

    const copyLink = () => {
        navigator.clipboard.writeText(publicUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const shareWhatsApp = () => {
        const text = `Hi ${quote.clientName}, here's your quote for "${quote.title}": ${formatPrice(quote.total)}.\n\nView & pay: ${publicUrl}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    };

    const downloadPdf = async () => {
        setGeneratingPdf(true);
        try {
            await generateQuotePdf({
                title: quote.title,
                clientName: quote.clientName,
                items: quote.items,
                subtotal: quote.subtotal,
                total: quote.total,
                depositRequired: quote.depositRequired,
                depositAmount: quote.depositAmount,
                notes: quote.notes,
                createdAt: quote.createdAt,
                sellerName,
                sellerLogoUrl: sellerLogo,
            });
        } finally {
            setGeneratingPdf(false);
        }
    };

    const statusBadge: Record<string, string> = {
        draft: "bg-gray-100 text-gray-600",
        sent: "bg-blue-100 text-blue-700",
        deposit_paid: "bg-amber-100 text-amber-700",
        paid: "bg-emerald-100 text-emerald-700",
        cancelled: "bg-rose-100 text-rose-700",
    };

    return (
        <div className="max-w-2xl mx-auto py-8 px-4 space-y-6 pb-24">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-black text-gray-900">{quote.title}</h1>
                <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${statusBadge[quote.status] || statusBadge.draft}`}>
                    {quote.status.replace("_", " ")}
                </span>
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4">
                <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Client</span>
                    <span className="font-bold text-gray-900">{quote.clientName}</span>
                </div>
                <div className="border-t border-gray-100 pt-3 space-y-2">
                    {quote.items.map((item: any, i: number) => (
                        <div key={i} className="flex justify-between text-sm">
                            <span className="text-gray-600">{item.description} × {item.qty}</span>
                            <span className="font-medium text-gray-900">{formatPrice(item.qty * item.unitPrice)}</span>
                        </div>
                    ))}
                </div>
                <div className="border-t border-gray-100 pt-3 flex justify-between font-bold text-gray-900">
                    <span>Total</span>
                    <span>{formatPrice(quote.total)}</span>
                </div>
                {quote.amountPaid > 0 && (
                    <div className="flex justify-between text-sm text-emerald-600 font-bold">
                        <span>Paid so far</span>
                        <span>{formatPrice(quote.amountPaid)}</span>
                    </div>
                )}
                {balance > 0.5 && quote.amountPaid > 0 && (
                    <div className="flex justify-between text-sm text-amber-600 font-bold">
                        <span>Balance remaining</span>
                        <span>{formatPrice(balance)}</span>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-2 gap-3">
                <Button onClick={shareWhatsApp} className="h-12 rounded-2xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold">
                    <MessageCircle className="h-4 w-4 mr-2" /> Share on WhatsApp
                </Button>
                <Button onClick={downloadPdf} disabled={generatingPdf} variant="outline" className="h-12 rounded-2xl font-bold">
                    {generatingPdf ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />} Download PDF
                </Button>
            </div>
            <Button onClick={copyLink} variant="outline" className="w-full h-11 rounded-2xl font-bold text-sm">
                {copied ? <Check className="h-4 w-4 mr-2 text-emerald-600" /> : <LinkIcon className="h-4 w-4 mr-2" />}
                {copied ? "Link copied!" : "Copy payable link"}
            </Button>
            <p className="text-xs text-gray-400 text-center">{publicUrl}</p>
        </div>
    );
}
