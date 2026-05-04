import { cn } from "@/lib/utils";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";

interface LogoProps {
    className?: string;
    variant?: "light" | "dark";
    hideTextMobile?: boolean;
    isAdmin?: boolean;
}

export function Logo({ className, variant = "light", hideTextMobile = false, isAdmin = false }: LogoProps) {
    return (
        <Link href={isAdmin ? "/admin/dashboard" : "/"} className={cn("flex items-center gap-3.5 group", className)}>
            <div className="relative flex items-center justify-center w-10 h-10 rounded-[14px] overflow-hidden bg-white/10 backdrop-blur-xl border border-white/30 shadow-[0_0_12px_rgba(34,197,94,0.3)] group-hover:scale-105 group-hover:shadow-[0_0_20px_rgba(34,197,94,0.45)] group-hover:border-white/50 transition-all duration-300 shrink-0">
                <img src="/logo.png" alt="FairPrice Logo" className="w-full h-full object-cover scale-[1.3] filter drop-shadow-md" />
            </div>
            <div className={cn("flex flex-col", hideTextMobile ? "hidden md:flex" : "flex")}>
                <span className={cn("text-xl font-black tracking-tight leading-tight", variant === "light" ? "text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]" : "text-green-700")}>
                    {isAdmin ? "Admin Portal" : "FairPrice.ng"}
                </span>
                <span className={cn("text-[8.5px] font-black italic uppercase tracking-widest mt-1.5", variant === "light" ? "text-yellow-400 drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]" : "text-emerald-700")}>
                    {isAdmin ? "Marketplace Engine" : "Never Over Pay Again"}
                </span>
            </div>
        </Link>
    );
}
