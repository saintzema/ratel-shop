"use client";

import Link from "next/link";
import { Star, ShieldCheck, AlertTriangle } from "lucide-react";
import { Product } from "@/lib/types";
import { formatPrice, getTrustColor } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ProductCardProps {
    product: Product;
    showDealTimer?: boolean;
}

export function ProductCard({ product, showDealTimer }: ProductCardProps) {
    // Mock savings calculation
    const savings = product.original_price ? product.original_price - product.price : 0;
    const savingsPct = product.original_price ? Math.round((savings / product.original_price) * 100) : 0;

    return (
        <div className="group relative flex flex-col justify-between bg-card text-card-foreground border border-border rounded-2xl p-4 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
            <Link href={`/product/${product.id}`} className="block">
                <div className="relative aspect-square mb-4 overflow-hidden rounded-xl bg-muted">
                    {/* Discount Badge */}
                    {savings > 0 && (
                        <Badge variant="destructive" className="absolute top-3 left-3 z-10 font-bold">
                            -{savingsPct}%
                        </Badge>
                    )}

                    {/* VDM Verified Badge */}
                    {product.seller_name.includes("TechHub") && ( // Mock logic
                        <Badge variant="success" className="absolute top-3 right-3 z-10 flex items-center gap-1 font-bold">
                            <ShieldCheck className="h-3 w-3" /> VDM
                        </Badge>
                    )}

                    <img
                        src={product.image_url}
                        alt={product.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                        onError={(e) => {
                            e.currentTarget.src = "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=800&q=80"; // Tech fallback
                        }}
                    />
                </div>

                <h3 className="text-sm font-bold line-clamp-2 mb-2 group-hover:text-ratel-green-600 transition-colors leading-snug min-h-[40px]">
                    {product.name}
                </h3>

                {/* Rating */}
                <div className="flex items-center gap-1.5 mb-3">
                    <div className="flex text-amber-400">
                        {[...Array(5)].map((_, i) => (
                            <Star
                                key={i}
                                className={`h-3 w-3 ${i < Math.round(product.avg_rating) ? "fill-current" : "text-gray-300 dark:text-zinc-700"}`}
                            />
                        ))}
                    </div>
                    <span className="text-[10px] text-muted-foreground font-bold">
                        ({product.review_count.toLocaleString()})
                    </span>
                </div>

                {/* Price Section */}
                <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-xl font-black text-foreground">
                        {formatPrice(product.price)}
                    </span>
                    {product.original_price && (
                        <span className="text-xs text-muted-foreground line-through font-medium">
                            {formatPrice(product.original_price)}
                        </span>
                    )}
                </div>

                {/* Price Fairness Flag */}
                {product.price_flag === "overpriced" && (
                    <div className="flex items-center gap-1 text-[10px] text-red-500 font-bold mb-4 uppercase tracking-tighter">
                        <AlertTriangle className="h-3 w-3" /> Overpriced
                    </div>
                )}
                {product.price_flag === "fair" && (
                    <div className="flex items-center gap-1 text-[10px] text-ratel-green-600 dark:text-ratel-green-400 font-bold mb-4 uppercase tracking-tighter">
                        <ShieldCheck className="h-3 w-3" /> Fair Price
                    </div>
                )}
            </Link>

            <Button
                className="w-full mt-auto bg-ratel-green-600 text-white font-black hover:bg-ratel-orange hover:text-black transition-all duration-300 cursor-pointer rounded-xl h-10 shadow-lg"
                size="sm"
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    alert(`${product.name} added to cart! 🛒`);
                }}
            >
                Add to Cart
            </Button>
        </div>
    );
}
