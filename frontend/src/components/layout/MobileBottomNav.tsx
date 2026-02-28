"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ShoppingCart, MessageCircle, Heart, Search, User } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useMessages } from "@/context/MessageContext";
import { useFavorites } from "@/context/FavoritesContext";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

export function MobileBottomNav() {
    const pathname = usePathname();
    const { cartCount } = useCart();
    const { totalUnread, openMessageBox } = useMessages();
    const { favoritesCount } = useFavorites();
    const { user } = useAuth();
    const pic = typeof window !== 'undefined' ? localStorage.getItem('fp_profile_pic') : null;

    // Hide on specific pages where it might be intrusive
    if (pathname === "/checkout" || pathname?.startsWith("/admin") || pathname?.startsWith("/seller")) {
        return null;
    }

    const profileName = user ? user.name.split(" ")[0] : "Profile";

    const navItems = [
        { name: "Home", href: "/", icon: Home },
        { name: "Categories", href: "/categories", icon: Search },
        { name: "Messages", href: "#messages", icon: MessageCircle, count: totalUnread, isMessages: true },
        { name: "Cart", href: "/cart", icon: ShoppingCart, count: cartCount },
        { name: profileName, href: "/account", icon: User, isProfile: true },
    ];

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-t border-gray-200 pb-safe">
            <div className="flex items-center justify-around h-16 px-2">
                {navItems.map((item) => {
                    const isActive = item.isMessages
                        ? false
                        : pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));
                    const Icon = item.icon;

                    const content = (
                        <>
                            <div className="relative">
                                {item.isProfile ? (
                                    <div className={cn("h-6 w-6 rounded-full overflow-hidden border-2 flex items-center justify-center bg-gray-100", isActive ? "border-brand-green-600" : "border-gray-300")}>
                                        {pic ? (
                                            <img src={pic} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <User className={cn("h-4 w-4", isActive ? "text-brand-green-600" : "text-gray-400")} strokeWidth={isActive ? 2.5 : 2} />
                                        )}
                                    </div>
                                ) : (
                                    <Icon className={cn("h-6 w-6", isActive && "fill-brand-green-600/20")} strokeWidth={isActive ? 2.5 : 2} />
                                )}

                                {item.count !== undefined && item.count > 0 && (
                                    <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[9px] font-black min-w-[16px] h-4 rounded-full flex items-center justify-center px-1 border border-white">
                                        {item.count}
                                    </span>
                                )}
                            </div>
                            <span className={cn("text-[10px] font-medium tracking-wide", isActive ? "font-bold text-brand-green-600" : "")}>
                                {item.name}
                            </span>
                        </>
                    );

                    // Messages item opens the overlay instead of navigating
                    if (item.isMessages) {
                        return (
                            <button
                                key={item.name}
                                onClick={() => openMessageBox()}
                                className={cn(
                                    "flex flex-col items-center justify-center w-full h-full space-y-1 relative transition-colors",
                                    "text-gray-500 hover:text-gray-900"
                                )}
                            >
                                {content}
                            </button>
                        );
                    }

                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                                "flex flex-col items-center justify-center w-full h-full space-y-1 relative transition-colors",
                                isActive ? "text-brand-green-600" : "text-gray-500 hover:text-gray-900"
                            )}
                        >
                            {content}
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
