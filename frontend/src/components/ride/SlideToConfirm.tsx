"use client";

import { useRef, useState } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { ChevronsRight, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface SlideToConfirmProps {
    label: string;
    confirmedLabel?: string;
    onConfirm: () => Promise<void> | void;
    color?: "green" | "orange";
    disabled?: boolean;
}

const HANDLE_SIZE = 52;
const TRACK_PADDING = 4;

/**
 * A drag-to-confirm slider for a driver's own hands on a moving trip — a tap
 * that can fire from a pocket-brush or a stray thumb is the wrong affordance
 * for "I am now ending this passenger's ride." Dragging the handle past the
 * threshold is a deliberate, two-handed-feeling gesture the same way it is
 * in every ride-hailing app already doing this (see the reference screenshot
 * this was modeled on).
 */
export function SlideToConfirm({ label, confirmedLabel = "Done", onConfirm, color = "green", disabled = false }: SlideToConfirmProps) {
    const trackRef = useRef<HTMLDivElement>(null);
    const x = useMotionValue(0);
    const [trackWidth, setTrackWidth] = useState(0);
    const [status, setStatus] = useState<"idle" | "confirming" | "done">("idle");

    const maxX = Math.max(trackWidth - HANDLE_SIZE - TRACK_PADDING * 2, 0);
    const progress = useTransform(x, [0, maxX || 1], [0, 1]);
    const labelOpacity = useTransform(progress, [0, 0.6], [1, 0]);

    const measure = (el: HTMLDivElement | null) => {
        trackRef.current = el;
        if (el) setTrackWidth(el.getBoundingClientRect().width);
    };

    const handleDragEnd = async () => {
        if (status !== "idle") return;
        const current = x.get();
        if (maxX > 0 && current >= maxX * 0.82) {
            setStatus("confirming");
            animate(x, maxX, { type: "spring", stiffness: 400, damping: 40 });
            try {
                await onConfirm();
                setStatus("done");
            } catch {
                // Snap back so the driver can try again — onConfirm's own caller
                // surfaces the actual error (e.g. a bad pickup code).
                setStatus("idle");
                animate(x, 0, { type: "spring", stiffness: 400, damping: 40 });
            }
        } else {
            animate(x, 0, { type: "spring", stiffness: 500, damping: 35 });
        }
    };

    const colors = color === "green"
        ? { track: "bg-brand-green-600", handle: "bg-white text-brand-green-700" }
        : { track: "bg-brand-orange", handle: "bg-white text-brand-orange" };

    return (
        <div
            ref={measure}
            className={cn("relative w-full h-16 rounded-full overflow-hidden select-none", colors.track, disabled && "opacity-50 pointer-events-none")}
            style={{ padding: TRACK_PADDING }}
        >
            <motion.span
                className="absolute inset-0 flex items-center justify-center text-white font-black text-sm tracking-wide pointer-events-none"
                style={{ opacity: status === "idle" ? labelOpacity : 0 }}
            >
                {label}
            </motion.span>
            {status === "done" && (
                <span className="absolute inset-0 flex items-center justify-center text-white font-black text-sm tracking-wide">
                    {confirmedLabel}
                </span>
            )}
            <motion.div
                drag={status === "idle" ? "x" : false}
                dragConstraints={{ left: 0, right: maxX }}
                dragElastic={0}
                dragMomentum={false}
                style={{ x, width: HANDLE_SIZE, height: HANDLE_SIZE }}
                onDragEnd={handleDragEnd}
                className={cn("absolute top-1 left-1 rounded-full flex items-center justify-center shadow-lg cursor-grab active:cursor-grabbing", colors.handle)}
            >
                {status === "confirming" ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                ) : status === "done" ? (
                    <Check className="h-5 w-5" />
                ) : (
                    <ChevronsRight className="h-5 w-5" />
                )}
            </motion.div>
        </div>
    );
}
