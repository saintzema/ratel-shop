"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, MessageCircle, Search, User, Plus } from "lucide-react";
import { useMessages } from "@/context/MessageContext";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { DataSyncService } from "@/lib/sync-store";

export function MobileBottomNav() {
    const pathname = usePathname();
    const { totalUnread, openMessageBox } = useMessages();
    const { user } = useAuth();
    const [pic, setPic] = useState<string | null>(null);

    useEffect(() => {
        setPic(localStorage.getItem('fp_profile_pic'));
    }, []);

    const [unreadNotifs, setUnreadNotifs] = useState(0);

    useEffect(() => {
        const loadCounts = () => {
            const userId = user?.email;
            const notifs = DataSyncService.getNotifications(userId);
            setUnreadNotifs(notifs.filter(n => !n.read).length);
        };
        loadCounts();
        window.addEventListener("storage", loadCounts);
        return () => window.removeEventListener("storage", loadCounts);
    }, [user]);

    // Always show the mobile nav bar on all pages
    // (dashboard layouts have their own top-bar menus, but users need bottom nav for Home/Categories/Sell/Messages/Profile)

    const profileName = user ? user.name.split(" ")[0] : "Profile";

    const combinedUnread = totalUnread + unreadNotifs;

    const navItems = [
        { name: "Home", href: "/", icon: Home },
        { name: "Categories", href: "/categories", icon: Search },
        // Sell replaces Cart in the center slot, Jiji-style — cart is still
        // reachable from the top navbar on every page, it just isn't one of
        // the five primary bottom-nav destinations anymore.
        { name: "Sell", href: "/sell", icon: Plus, isSell: true },
        { name: "Messages", href: "#messages", icon: MessageCircle, count: combinedUnread, isMessages: true },
        { name: profileName, href: "/account", icon: User, isProfile: true },
    ];

    return (
        <div data-bottom-chrome className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
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

                    // Sell gets a raised, filled golden-amber circle (Jiji-style) instead
                    // of the plain icon+label treatment every other item uses — it's the
                    // primary action on this bar, not just another destination.
                    if (item.isSell) {
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className="flex flex-col items-center justify-center w-full h-full space-y-1 relative text-gray-500"
                            >
                                <div className="h-11 w-11 -mt-6 rounded-full bg-brand-orange shadow-lg shadow-brand-orange/40 border-4 border-white flex items-center justify-center">
                                    <Plus className="h-6 w-6 text-black" strokeWidth={2.75} />
                                </div>
                                <span className="text-[10px] font-bold tracking-wide text-gray-700">
                                    {item.name}
                                </span>
                            </Link>
                        );
                    }

                    // Messages item opens the overlay instead of navigating
                    if (item.isMessages) {
                        return (
                            <button
                                key={item.name}
                                onClick={() => user ? openMessageBox() : window.location.href = "/login?from=/account"}
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
