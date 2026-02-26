"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, ShoppingCart, User } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { cn } from "@/lib/utils";

export function MobileBottomNav() {
    const pathname = usePathname();
    const { cartCount } = useCart();

    // Hide on specific pages where it might be intrusive
    if (pathname === "/checkout" || pathname?.startsWith("/admin") || pathname?.startsWith("/seller")) {
        return null;
    }

    const navItems = [
        { name: "Home", href: "/", icon: Home },
        { name: "Search", href: "/search", icon: Search },
        { name: "Cart", href: "/cart", icon: ShoppingCart, count: cartCount },
        { name: "Profile", href: "/account", icon: User },
    ];

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-t border-gray-200 pb-safe">
            <div className="flex items-center justify-around h-16 px-2">
                {navItems.map((item) => {
                    const isActive = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                                "flex flex-col items-center justify-center w-full h-full space-y-1 relative transition-colors",
                                isActive ? "text-ratel-green-600" : "text-gray-500 hover:text-gray-900"
                            )}
                        >
                            <div className="relative">
                                <Icon className={cn("h-6 w-6", isActive && "fill-ratel-green-600/20")} strokeWidth={isActive ? 2.5 : 2} />
                                {item.count !== undefined && item.count > 0 && (
                                    <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[9px] font-black min-w-[16px] h-4 rounded-full flex items-center justify-center px-1 border border-white">
                                        {item.count}
                                    </span>
                                )}
                            </div>
                            <span className={cn("text-[10px] font-medium tracking-wide", isActive ? "font-bold text-ratel-green-600" : "")}>
                                {item.name}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
