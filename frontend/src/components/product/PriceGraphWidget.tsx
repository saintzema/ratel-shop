"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, TrendingDown } from "lucide-react";
import { formatPrice } from "@/lib/utils";

interface PriceHistoryNode {
    month: string;
    price: number;
}

interface PriceGraphWidgetProps {
    history: PriceHistoryNode[];
    priceDirection: "rising" | "stable" | "falling";
}

export function PriceGraphWidget({ history, priceDirection }: PriceGraphWidgetProps) {
    const [hoverIndex, setHoverIndex] = useState<number | null>(null);

    if (!history || history.length === 0) return null;

    const prices = history.map(h => h.price);
    const minPrice = Math.min(...prices) * 0.95; // 5% buffer bottom
    const maxPrice = Math.max(...prices) * 1.05; // 5% buffer top
    const range = maxPrice - minPrice || 1;
    const height = 120;
    const width = 500; // viewBox width

    // Generate SVG Path
    const points = history.map((h, i) => {
        const x = (i / (history.length - 1)) * width;
        const y = height - ((h.price - minPrice) / range) * height;
        return { x, y, price: h.price, month: h.month };
    });

    const pathPoints = points.map(p => `${p.x},${p.y}`).join(" ");
    const areaPath = `M0,${height} ${pathPoints.split(" ").map(p => `L${p}`).join(" ")} L${width},${height} Z`;
    const linePath = `M${pathPoints.split(" ").join(" L")}`;

    const isRising = priceDirection === "rising";
    const color = isRising ? "#ef4444" : "#10b981"; // Red or Emerald

    return (
        <div
            className="rounded-2xl p-4 bg-white/95 shadow-md"
            style={{
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(0,0,0,0.06)",
            }}
        >
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-gray-700 text-[10px] font-bold uppercase tracking-wider">
                    {isRising ? (
                        <TrendingUp className="h-3 w-3 text-red-600" />
                    ) : (
                        <TrendingDown className="h-3 w-3 text-emerald-600" />
                    )}
                    6-Month Price Trend
                </div>
                <span className={`text-[10px] font-bold ${isRising ? "text-red-600" : "text-emerald-700"}`}>
                    {isRising ? "↑ Rising" : "↓ Falling"}
                </span>
            </div>

            <div className="relative h-28 w-full overflow-visible group">
                {/* Tooltip Overlay */}
                <AnimatePresence>
                    {hoverIndex !== null && (
                        <motion.div
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.15 }}
                            className="absolute z-20 pointer-events-none"
                            style={{
                                left: `${(hoverIndex / (history.length - 1)) * 100}%`,
                                top: `${(points[hoverIndex].y / height) * 100}%`,
                                transform: `translate(-50%, -130%)`
                            }}
                        >
                            <div className="bg-white border border-gray-200 shadow-xl rounded-lg px-2.5 py-1.5 flex flex-col items-center">
                                <span className="text-[9px] text-gray-600 font-bold uppercase tracking-wider">{points[hoverIndex].month}</span>
                                <span className="text-xs font-bold text-gray-900 whitespace-nowrap">{formatPrice(points[hoverIndex].price)}</span>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* SVG Chart */}
                <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
                    <defs>
                        <linearGradient id="chartGradientWidget" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
                        </linearGradient>
                    </defs>

                    {/* Area Fill */}
                    <path d={areaPath} fill="url(#chartGradientWidget)" />

                    {/* Stroke Line */}
                    <path
                        d={linePath}
                        fill="none"
                        stroke={color}
                        strokeWidth="2.5"
                        vectorEffect="non-scaling-stroke"
                        shapeRendering="geometricPrecision"
                    />

                    {/* Dots for data points & Hover Targets */}
                    {points.map((p, i) => {
                        const isLast = i === history.length - 1;
                        const isHovered = hoverIndex === i;

                        return (
                            <g key={i}>
                                {/* Invisible larger circle for easier hovering */}
                                <circle
                                    cx={p.x}
                                    cy={p.y}
                                    r={15}
                                    fill="transparent"
                                    className="cursor-pointer"
                                    onMouseEnter={() => setHoverIndex(i)}
                                    onMouseLeave={() => setHoverIndex(null)}
                                />
                                {/* Visible dot */}
                                <circle
                                    cx={p.x}
                                    cy={p.y}
                                    r={isHovered ? 6 : (isLast ? 4 : 2)}
                                    fill={isHovered ? "#ffffff" : color}
                                    stroke={isHovered ? color : "none"}
                                    strokeWidth={isHovered ? 2 : 0}
                                    className="transition-all duration-300 pointer-events-none"
                                />
                            </g>
                        );
                    })}
                </svg>

                {/* X-Axis Labels positioned absolutely */}
                <div className="absolute bottom-0 left-0 right-0 flex justify-between px-1">
                    {history.map((h, i) => (
                        <span key={i} className="text-[9px] text-gray-600 font-bold">
                            {h.month}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
}
