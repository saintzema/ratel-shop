import { cn } from "@/lib/utils";
import Link from "next/link";

interface LogoProps {
    className?: string;
    variant?: "light" | "dark";
}

export function Logo({ className, variant = "light" }: LogoProps) {
    return (
        <Link href="/" className={cn("flex items-center gap-2", className)}>
            <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-white text-ratel-green-600 border-2 border-ratel-green-600 overflow-hidden">
                <span className="text-xl font-bold">R</span>
            </div>
            <span className={cn("text-xl font-bold tracking-tight", variant === "light" ? "text-white" : "text-ratel-green-900")}>
                RatelShop
            </span>
        </Link>
    );
}
