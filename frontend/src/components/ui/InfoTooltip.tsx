"use client";

import React, { useState, useRef, useEffect } from "react";
import { HelpCircle, Info, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface InfoTooltipProps {
    content: string;
    title?: string;
    icon?: React.ReactNode;
    className?: string;
    position?: "top" | "bottom" | "left" | "right";
}

/**
 * Premium InfoTooltip for Platform-Wide Informational Context
 * Optimized for "Apple-level" UI/UX with smooth transitions and click-outside logic.
 */
export function InfoTooltip({
    content,
    title,
    icon,
    className,
    position = "top"
}: InfoTooltipProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Click outside to close (Apple-level smoothness)
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen]);

    const positionClasses = {
        top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
        bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
        left: "right-full top-1/2 -translate-y-1/2 mr-2",
        right: "left-full top-1/2 -translate-y-1/2 ml-2"
    };

    const arrowClasses = {
        top: "bottom-[-6px] left-1/2 -translate-x-1/2 border-t-white border-x-transparent border-b-transparent",
        bottom: "top-[-6px] left-1/2 -translate-x-1/2 border-b-white border-x-transparent border-t-transparent",
        left: "right-[-6px] top-1/2 -translate-y-1/2 border-l-white border-y-transparent border-r-transparent",
        right: "left-[-6px] top-1/2 -translate-y-1/2 border-r-white border-y-transparent border-l-transparent"
    };

    return (
        <div ref={containerRef} className={cn("relative inline-flex items-center", className)}>
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                }}
                className="text-gray-400 hover:text-emerald-600 transition-colors cursor-help p-0.5"
                aria-label="More information"
            >
                {icon || <Info className="h-4 w-4" />}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: position === "top" ? 5 : -5 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: position === "top" ? 5 : -5 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className={cn(
                            "absolute z-[9999] w-64 bg-white rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.15)] border border-gray-100 p-4",
                            positionClasses[position]
                        )}
                    >
                        {/* Arrow */}
                        <div className={cn("absolute w-0 h-0 border-[6px]", arrowClasses[position])} />

                        <div className="flex items-start justify-between mb-1">
                            {title && <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wider">{title}</h4>}
                            <button 
                                onClick={() => setIsOpen(false)}
                                className="text-gray-400 hover:text-gray-600 p-0.5 rounded-full hover:bg-gray-50 transition-all ml-auto"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </div>
                        <p className="text-sm text-gray-600 leading-relaxed font-medium">
                            {content}
                        </p>
                        
                        {/* Premium "Glass" reflection effect */}
                        <div className="absolute inset-0 rounded-xl pointer-events-none overflow-hidden">
                            <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-white/5 rotate-45" />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
