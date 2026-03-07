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
            <div className="relative flex items-center justify-center w-10 h-10 rounded-[14px] overflow-hidden bg-white/10 backdrop-blur-xl border border-white/30 shadow-[0_0_12px_rgba(34,197,94,0.3)] group-hover:scale-105 group-hover:shadow-[0_0_20px_rgba(34,197,94,0.45)] group-hover:border-white/50 transition-all duration-300 shrink-0">
                <img src="/logo.png" alt="FairPrice Logo" className="w-full h-full object-cover scale-[1.3] filter drop-shadow-md" />
            </div>
            <div className={cn("flex-col -space-y-1", hideTextMobile ? "hidden md:flex" : "flex")}>
                <span className={cn("text-xl font-black tracking-tight leading-none", variant === "light" ? "text-white" : "text-brand-green-900")}>
                    FairPrice
                </span>
                <span className={cn("text-[10px] font-bold text:white italic uppercase tracking-widest opacity-75", variant === "light" ? "text-brand-green-400" : "text-brand-green-700")}>
                    Never overpay again!        </span>
            </div>
        </Link>
    );
}
