"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, useMemo, memo } from "react";
import { Star, ShieldCheck, ShoppingCart, Clock, Crown, Store, Plus, AlertTriangle } from "lucide-react";
import { Product } from "@/lib/types";
import { formatPrice, cn, getProductUrl, getProxiedImageUrl, formatNumber } from "@/lib/utils";
import { useCart } from "@/context/CartContext";
import { nativeBridge } from "@/lib/native-bridge";
import { DataSyncService } from "@/lib/sync-store";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";

interface CompactPriceDropCardProps {
    product: Product;
    className?: string;
}

function CompactPriceDropCardComponent({ product, className }: CompactPriceDropCardProps) {
    const { addToCart } = useCart();
    const { user } = useAuth();
    const router = useRouter();
    const [timeLeft, setTimeLeft] = useState<string>("00:00:00");
    const [addedToCart, setAddedToCart] = useState(false);
    
    // Stabilize deal end time calculation
    const dealEndTime = useMemo(() => {
        const createdPlus24h = product.created_at ? new Date(new Date(product.created_at).getTime() + 24 * 60 * 60 * 1000) : new Date(0);
        const now = new Date();
        
        // If the 24h deal is still active, use it
        if (createdPlus24h.getTime() > now.getTime()) {
            return createdPlus24h.toISOString();
        }
        
        // Otherwise, use end of current day as a fallback "daily deal"
        const endOfDay = new Date(now);
        endOfDay.setHours(23, 59, 59, 999);
        return endOfDay.toISOString();
    }, [product.id, product.created_at]);

    useEffect(() => {
        const calculateTimeLeft = () => {
            const diff = new Date(dealEndTime).getTime() - Date.now();
            if (diff <= 0) return "00:00:00";
            
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const secs = Math.floor((diff % (1000 * 60)) / 1000);
            
            return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        };
        
        // Update immediately
        setTimeLeft(calculateTimeLeft());
        
        const interval = setInterval(() => {
            setTimeLeft(calculateTimeLeft());
        }, 1000);
        
        return () => clearInterval(interval);
    }, [dealEndTime]);

    const displayOriginalPrice = product.original_price || (product.price * 1.25);
    const savings = displayOriginalPrice - product.price;
    const discountPct = Math.round((savings / displayOriginalPrice) * 100);
    
    const cardSeller = DataSyncService.getSellers().find(s => s.id === product.seller_id || s.user_id === product.seller_id);
    const isPremium = cardSeller?.subscription_plan && cardSeller.subscription_plan !== "Starter";
    const isVerified = cardSeller?.verified;

    // Urgent stock count
    const stockLeft = product.stock > 0 && product.stock <= 15 ? product.stock : (Math.floor(Math.random() * 10) + 2);

    return (
        <div 
            onClick={() => router.push(getProductUrl(product.id, product.name, product.slug))}
            className={cn("group relative flex flex-col bg-white border border-gray-100 rounded-lg overflow-hidden transition-all hover:shadow-lg active:scale-[0.98] cursor-pointer h-full", className)}
        >
            {/* Discount Badge Floating */}
            <div className="absolute top-2 left-2 z-10 bg-red-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded shadow-sm flex items-center gap-0.5 animate-bounce-subtle">
                -{discountPct}%
            </div>

            <div className="relative aspect-square bg-gray-50 overflow-hidden">
                <img
                    src={getProxiedImageUrl(product.image_url)}
                    alt={product.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                />
            </div>

            <div className="flex flex-col p-2 flex-1 justify-between">
                <div className="space-y-1">
                    {/* Writeup / Status Line */}
                    <div className="flex items-center gap-1 overflow-hidden">
                        <span className="bg-[#eef2ff] text-[#4f46e5] text-[9px] font-bold px-1 py-0.5 rounded flex items-center gap-0.5 whitespace-nowrap shrink-0 border border-[#c7d2fe]/50">
                            <span className="text-[10px]">✨</span> HOT DEAL
                        </span>
                        <h3 className="text-[11px] font-bold text-gray-800 truncate">{product.name}</h3>
                    </div>

                    {/* Urgency Line */}
                    <div className="flex items-center justify-between">
                        <span className="text-[#f97316] text-[9px] font-black uppercase tracking-tight">
                            ONLY {stockLeft} LEFT
                        </span>
                        <div className="flex text-amber-400">
                            {[...Array(5)].map((_, i) => (
                                <Star key={i} className={`h-2 w-2 ${i < Math.round(product.avg_rating || 4.5) ? "fill-current" : "text-gray-200"}`} />
                            ))}
                        </div>
                    </div>

                    {/* Store Scroller */}
                    <div className="relative h-5 overflow-hidden rounded bg-gray-50 flex items-center border border-gray-100 marquee-container">
                        <div className="flex items-center gap-4 whitespace-nowrap animate-marquee-slow">
                            {/* Duplicate content for seamless loop */}
                            <div className="flex items-center gap-4">
                                <span className="text-[9px] text-gray-600 font-black flex items-center gap-1">
                                    <Store className="h-3 w-3 text-indigo-500" /> {product.seller_name}
                                </span>
                                {isPremium && (
                                    <span className="bg-purple-600 text-white text-[8px] px-1.5 py-0.5 rounded flex items-center gap-0.5 font-black uppercase shadow-sm">
                                        <Crown className="h-2 w-2" /> Premium
                                    </span>
                                )}
                                {isVerified && (
                                    <span className="bg-emerald-500 text-white text-[8px] px-1.5 py-0.5 rounded flex items-center gap-0.5 font-black uppercase shadow-sm">
                                        <ShieldCheck className="h-2 w-2" /> Verified
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="text-[9px] text-gray-600 font-black flex items-center gap-1">
                                    <Store className="h-3 w-3 text-indigo-500" /> {product.seller_name}
                                </span>
                                {isPremium && (
                                    <span className="bg-purple-600 text-white text-[8px] px-1.5 py-0.5 rounded flex items-center gap-0.5 font-black uppercase shadow-sm">
                                        <Crown className="h-2 w-2" /> Premium
                                    </span>
                                )}
                                {isVerified && (
                                    <span className="bg-emerald-500 text-white text-[8px] px-1.5 py-0.5 rounded flex items-center gap-0.5 font-black uppercase shadow-sm">
                                        <ShieldCheck className="h-2 w-2" /> Verified
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Price Drop Box */}
                    <div className="mt-1 bg-[#fff7ed] border border-[#ffedd5] rounded p-1">
                        <div className="flex items-center justify-between text-[9px] font-black text-[#ea580c]">
                            <div className="flex items-center gap-1">
                                <span className="bg-white px-1 rounded border border-[#ffedd5]">Saved {formatPrice(savings)}</span>
                            </div>
                            <div className="flex items-center gap-0.5">
                                <Clock className="h-2.5 w-2.5 animate-shake" /> 
                                <span className="font-mono">{timeLeft}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Final Row: Price + Round Cart Button */}
                <div className="flex items-center justify-between mt-2">
                    <div className="flex flex-col -space-y-0.5">
                        <span className="text-[9px] text-gray-400 line-through">{formatPrice(displayOriginalPrice)}</span>
                        <span className="text-sm font-black text-gray-900 tracking-tight">{formatPrice(product.price)}</span>
                    </div>
                    
                    <button
                        onClick={(e) => { 
                            e.preventDefault();
                            e.stopPropagation(); 
                            addToCart(product); 
                            nativeBridge.hapticFeedback("medium");
                        }}
                        className="w-9 h-9 rounded-full bg-emerald-600 shadow-lg shadow-emerald-600/30 flex items-center justify-center transition-all hover:bg-emerald-700 hover:scale-110 active:scale-95 relative"
                    >
                        <ShoppingCart className="h-4 w-4 text-white" strokeWidth={2.5} />
                        <div className="absolute -top-0.5 -left-0.5 w-3.5 h-3.5 bg-white rounded-full flex items-center justify-center shadow-sm">
                            <span className="font-black text-emerald-600 text-[9px] leading-none">+</span>
                        </div>
                    </button>
                </div>
            </div>

            {/* Custom Animations */}
            <style jsx>{`
                @keyframes marquee {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
                .animate-marquee-slow {
                    display: inline-flex;
                    animation: marquee 15s linear infinite;
                    padding-right: 20px;
                }
                @keyframes shake {
                    0%, 100% { transform: rotate(0) scale(1); }
                    25% { transform: rotate(-15deg) scale(1.1); }
                    75% { transform: rotate(15deg) scale(1.1); }
                }
                .animate-shake {
                    animation: shake 0.4s ease-in-out infinite;
                    color: #ea580c;
                }
                @keyframes bounce-subtle {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-3px); }
                }
                .animate-bounce-subtle {
                    animation: bounce-subtle 2s ease-in-out infinite;
                }
                .marquee-container:hover .animate-marquee-slow {
                    animation-play-state: paused;
                }
            `}</style>
        </div>
    );
}
export const CompactPriceDropCard = memo(CompactPriceDropCardComponent);
