"use client";

import { useMemo } from "react";
import { formatPrice } from "@/lib/utils";
import { ShieldCheck, AlertTriangle } from "lucide-react";
import { Product, PriceComparison } from "@/lib/types";
import { getDemoPriceComparison } from "@/lib/data";
import { Badge } from "@/components/ui/badge";

export function PriceComparisonTable({ product }: { product: Product }) {
    const comparison = useMemo(() => getDemoPriceComparison(product.id), [product.id]);

    return (
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg p-6 shadow-sm">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <span className="text-ratel-green-600">Ratel Price Intelligence</span>
                <Badge variant="outline" className="text-xs font-normal">Updated 2m ago</Badge>
            </h3>

            <div className="space-y-4">
                {/* Main Price Row */}
                <div className="flex justify-between items-center pb-4 border-b dark:border-zinc-800">
                    <div>
                        <div className="text-sm text-gray-500">Current Price (This Seller)</div>
                        <div className="text-2xl font-bold">{formatPrice(comparison.current_price)}</div>
                    </div>
                    <div className="flex flex-col items-end">
                        {comparison.flag === "fair" && (
                            <Badge variant="success" className="flex items-center gap-1">
                                <ShieldCheck className="h-3 w-3" /> Fair Market Price
                            </Badge>
                        )}
                        {comparison.flag === "overpriced" && (
                            <Badge variant="destructive" className="flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" /> Overpriced
                            </Badge>
                        )}
                        {comparison.flag === "suspicious" && (
                            <Badge variant="warning" className="flex items-center gap-1 text-black">
                                <AlertTriangle className="h-3 w-3" /> Suspiciously Low
                            </Badge>
                        )}
                    </div>
                </div>

                {/* Market Range Bar */}
                <div>
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Market Low: {formatPrice(comparison.market_low)}</span>
                        <span>Market High: {formatPrice(comparison.market_high)}</span>
                    </div>
                    <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                        {/* Safe Range Zone */}
                        <div
                            className="absolute h-full bg-emerald-200"
                            style={{ left: "20%", width: "60%" }}
                        />
                        {/* Current Price Marker */}
                        <div
                            className={`absolute top-0 h-full w-2 rounded-full transform -translate-x-1/2 ${comparison.flag === "fair" ? "bg-emerald-600" : comparison.flag === "overpriced" ? "bg-red-600" : "bg-amber-500"
                                }`}
                            style={{
                                left: `${Math.min(
                                    Math.max(
                                        ((comparison.current_price - comparison.market_low) / (comparison.market_high - comparison.market_low)) * 100,
                                        0
                                    ),
                                    100
                                )}%`
                            }}
                        />
                    </div>
                    <p className="text-xs text-center mt-2 text-gray-500">
                        Market Average: <span className="font-bold text-gray-700 dark:text-gray-300">{formatPrice(comparison.market_avg)}</span>
                    </p>
                </div>
            </div>
        </div>
    );
}
