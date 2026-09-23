"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ShieldCheck, TrendingDown } from "lucide-react";
import { formatPrice } from "@/lib/utils";

interface Benchmark {
    flag: "fair" | "overpriced" | "too_low" | "none" | "great_deal";
    median: number | null;
    peerCount: number;
    ratio: number | null;
}

/**
 * The numbers behind the price badge, on the product page.
 *
 * A red "Pricing Alert" chip on its own asks the shopper to take our word for
 * it. This shows the working — what similar listings actually cost and how
 * many were compared — which is the only version of this feature that
 * deserves to be believed on a site called FairPrice.
 *
 * Renders nothing at all when there aren't enough comparables to be sure, or
 * when the price is simply normal: silence is the correct output for "no
 * finding", and a badge on every product would mean nothing.
 */
export function PriceBenchmarkNotice({ productId }: { productId: string }) {
    const [data, setData] = useState<Benchmark | null>(null);

    useEffect(() => {
        let cancelled = false;
        fetch(`/api/products/${productId}/price-check`)
            .then(r => (r.ok ? r.json() : null))
            .then(d => { if (!cancelled && d && !d.error) setData(d); })
            .catch(() => { /* a missing benchmark just means no notice */ });
        return () => { cancelled = true; };
    }, [productId]);

    if (!data) return null;
    if (data.flag === "none" || data.flag === "fair") return null;

    // The numbers are optional — see the price-check route for when they're
    // withheld. Without them the notice states the finding and stops, rather
    // than inventing a comparison it can't back up.
    const hasNumbers = data.median != null && data.peerCount > 0;
    const peers = `${data.peerCount} similar listing${data.peerCount === 1 ? "" : "s"}`;

    if (data.flag === "overpriced") {
        const times = data.ratio ? `${data.ratio.toFixed(1)}×` : "above";
        return (
            <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                <div>
                    <p className="text-xs font-black text-red-700">
                        {hasNumbers ? `This is ${times} the usual price` : "Priced above similar listings"}
                    </p>
                    <p className="text-[11px] text-red-600/90 mt-0.5">
                        {hasNumbers
                            ? `${peers} on FairPrice sell around ${formatPrice(data.median!)}. `
                            : "Other sellers here list this for less. "}
                        Try negotiating, or compare before you buy.
                    </p>
                </div>
            </div>
        );
    }

    if (data.flag === "too_low") {
        return (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                    <p className="text-xs font-black text-amber-800">Priced far below similar listings</p>
                    <p className="text-[11px] text-amber-700/90 mt-0.5">
                        {hasNumbers ? `${peers} sell around ${formatPrice(data.median!)}. ` : ""}
                        Pay through FairPrice so your money is held in escrow until you get the item.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 flex items-start gap-2">
            {data.flag === "great_deal"
                ? <TrendingDown className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                : <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />}
            <div>
                <p className="text-xs font-black text-emerald-800">Below the usual price</p>
                <p className="text-[11px] text-emerald-700/90 mt-0.5">
                    {hasNumbers ? `${peers} sell around ${formatPrice(data.median!)}.` : "Cheaper than other listings of the same item here."}
                </p>
            </div>
        </div>
    );
}
