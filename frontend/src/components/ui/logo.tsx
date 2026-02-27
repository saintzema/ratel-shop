import { cn } from "@/lib/utils";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";

interface LogoProps {
    className?: string;
    variant?: "light" | "dark";
    hideTextMobile?: boolean;
}

export function Logo({ className, variant = "light", hideTextMobile = false }: LogoProps) {
    return (
        <Link href="/" className={cn("flex items-center gap-2 group", className)}>
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-brand-green-600 to-black border border-brand-green-500/50 shadow-lg overflow-hidden group-hover:scale-105 transition-transform shrink-0">
                <span className="text-2xl filter drop-shadow-md">🤝</span>
            </div>
            <div className={cn("flex-col -space-y-1", hideTextMobile ? "hidden md:flex" : "flex")}>
                <span className={cn("text-xl font-black tracking-tight leading-none", variant === "light" ? "text-white" : "text-brand-green-900")}>
                    FairPrice
                </span>
                <span className={cn("text-[10px] font-bold uppercase tracking-widest opacity-75", variant === "light" ? "text-brand-green-400" : "text-brand-green-700")}>
                    Shop Secure
                </span>
            </div>
        </Link>
    );
}
