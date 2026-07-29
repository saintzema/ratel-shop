"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";
import { PaystackCheckout } from "@/components/payment/PaystackCheckout";
import { generateQuotePdf } from "@/lib/quote-pdf";
import { ShieldCheck, Download, Loader2 } from "lucide-react";

export default function PublicQuotePage() {
    const params = useParams();
    const id = params.id as string;
    const [quote, setQuote] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [email, setEmail] = useState("");
    const [showPay, setShowPay] = useState<"deposit" | "full" | null>(null);
    const [pdfLoading, setPdfLoading] = useState(false);

    const load = () => {
        fetch(`/api/quotes/${id}`)
            .then(r => r.ok ? r.json() : null)
            .then(d => setQuote(d?.quote || null))
            .finally(() => setLoading(false));
    };

    useEffect(load, [id]);

    if (loading) return <div className="p-12 text-center text-gray-500 animate-pulse">Loading quote...</div>;
    if (!quote) return <div className="p-12 text-center text-gray-500">This quote link is invalid or has been removed.</div>;

    const balance = quote.total - quote.amountPaid;
    const payableAmount = showPay === "deposit" ? (quote.depositAmount || 0) - quote.amountPaid : balance;

    const handlePaySuccess = async (reference: string) => {
        setShowPay(null);
        await fetch(`/api/quotes/${id}/pay`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reference }),
        }).catch(() => {});
        load();
    };

    const downloadPdf = async () => {
        setPdfLoading(true);
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
                sellerName: quote.seller.businessName,
                sellerLogoUrl: quote.seller.logoUrl,
                sellerContact: quote.seller.contact,
            });
        } finally {
            setPdfLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4">
            <div className="max-w-lg mx-auto space-y-5">
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-5">
                    <div className="flex items-center gap-3">
                        {quote.seller.logoUrl ? (
                            <img src={quote.seller.logoUrl} alt="" className="w-12 h-12 rounded-xl object-cover" />
                        ) : (
                            <img src="/logo.png" alt="FairPrice" className="w-12 h-12 rounded-xl object-cover" />
                        )}
                        <div>
                            <p className="font-bold text-gray-900">{quote.seller.businessName}</p>
                            {quote.seller.contact && <p className="text-xs text-gray-500">{quote.seller.contact}</p>}
                        </div>
                    </div>

                    <div>
                        <h1 className="text-xl font-black text-gray-900">{quote.title}</h1>
                        <p className="text-sm text-gray-500">Prepared for {quote.clientName}</p>
                    </div>

                    <div className="border-t border-gray-100 pt-4 space-y-2">
                        {quote.items.map((item: any, i: number) => (
                            <div key={i} className="flex justify-between text-sm">
                                <span className="text-gray-600">{item.description} × {item.qty}</span>
                                <span className="font-medium text-gray-900">{formatPrice(item.qty * item.unitPrice)}</span>
                            </div>
                        ))}
                    </div>

                    <div className="border-t border-gray-100 pt-3 flex justify-between font-bold text-lg text-gray-900">
                        <span>Total</span>
                        <span>{formatPrice(quote.total)}</span>
                    </div>

                    {quote.notes && <p className="text-xs text-gray-500 italic bg-gray-50 p-3 rounded-xl">{quote.notes}</p>}

                    {quote.amountPaid > 0 && (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-sm">
                            <p className="font-bold text-emerald-700">{formatPrice(quote.amountPaid)} paid</p>
                            {balance > 0.5 && <p className="text-emerald-600 text-xs mt-0.5">{formatPrice(balance)} remaining</p>}
                        </div>
                    )}

                    <Button variant="outline" onClick={downloadPdf} disabled={pdfLoading} className="w-full h-11 rounded-2xl font-bold">
                        {pdfLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />} Download PDF
                    </Button>
                </div>

                {quote.status !== "paid" && quote.status !== "cancelled" && (
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-3">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Your email (for the receipt)</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            className="w-full h-11 rounded-xl border border-gray-200 px-3 text-sm"
                        />
                        {quote.depositRequired && quote.amountPaid < (quote.depositAmount || 0) && (
                            <Button
                                disabled={!email.includes("@")}
                                onClick={() => setShowPay("deposit")}
                                className="w-full h-12 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold"
                            >
                                Pay Deposit — {formatPrice((quote.depositAmount || 0) - quote.amountPaid)}
                            </Button>
                        )}
                        <Button
                            disabled={!email.includes("@")}
                            onClick={() => setShowPay("full")}
                            className="w-full h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                        >
                            Pay {quote.depositRequired ? "Balance in Full" : "Now"} — {formatPrice(balance)}
                        </Button>
                        <p className="text-[11px] text-gray-400 flex items-center gap-1 justify-center pt-1">
                            <ShieldCheck className="h-3 w-3" /> Secured by Paystack
                        </p>
                    </div>
                )}

                {showPay && (
                    <PaystackCheckout
                        amount={Math.round(payableAmount * 100)}
                        email={email}
                        metadata={{ type: "quote_payment", quote_id: id }}
                        onSuccess={handlePaySuccess}
                        onClose={() => setShowPay(null)}
                        autoStart={true}
                    />
                )}
            </div>
        </div>
    );
}
