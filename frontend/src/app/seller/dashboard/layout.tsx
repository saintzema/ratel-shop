"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Package,
    ShoppingBag,
    Settings,
    LogOut,
    Bell,
    Menu,
    X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";

export default function SellerLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const pathname = usePathname();

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    const navItems = [
        { label: "Dashboard", href: "/seller/dashboard", icon: LayoutDashboard },
        { label: "Products", href: "/seller/products", icon: Package },
        { label: "Orders", href: "/seller/orders", icon: ShoppingBag },
        { label: "Settings", href: "/seller/settings", icon: Settings },
    ];

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-zinc-950 flex flex-col md:flex-row">
            {/* Mobile Header */}
            <header className="md:hidden flex items-center justify-between p-4 bg-white dark:bg-zinc-900 border-b dark:border-zinc-800">
                <Logo variant="dark" />
                <Button size="icon" variant="ghost" onClick={toggleSidebar}>
                    {isSidebarOpen ? <X /> : <Menu />}
                </Button>
            </header>

            {/* Sidebar */}
            <aside
                className={cn(
                    "fixed inset-y-0 left-0 z-40 w-64 bg-white dark:bg-zinc-900 border-r dark:border-zinc-800 transform transition-transform duration-200 ease-in-out md:translate-x-0 md:static md:h-screen",
                    isSidebarOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                <div className="p-6 flex items-center gap-2">
                    <div className="w-8 h-8 rounded bg-ratel-green-600 flex items-center justify-center text-white font-bold">R</div>
                    <span className="font-bold text-lg">Seller Central</span>
                </div>

                <nav className="flex-1 px-4 space-y-2 mt-4">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                                    isActive
                                        ? "bg-ratel-green-50 dark:bg-ratel-green-900/20 text-ratel-green-700 dark:text-ratel-green-400"
                                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-zinc-800"
                                )}
                                onClick={() => setIsSidebarOpen(false)}
                            >
                                <item.icon className="h-5 w-5" />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t dark:border-zinc-800">
                    <button className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg w-full transition-colors">
                        <LogOut className="h-5 w-5" />
                        Log Out
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto">
                <header className="hidden md:flex items-center justify-between px-8 py-4 bg-white dark:bg-zinc-900 border-b dark:border-zinc-800">
                    <h1 className="text-xl font-bold">
                        {navItems.find(n => n.href === pathname)?.label || "Dashboard"}
                    </h1>
                    <div className="flex items-center gap-4">
                        <Button size="icon" variant="ghost" className="relative">
                            <Bell className="h-5 w-5" />
                            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
                        </Button>
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-zinc-700"></div>
                            <span className="text-sm font-medium">TechHub Lagos</span>
                        </div>
                    </div>
                </header>
                <div className="p-4 md:p-8">
                    {children}
                </div>
            </main>
        </div>
    );
}
