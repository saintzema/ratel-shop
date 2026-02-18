"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
    LayoutDashboard,
    Package,
    ShoppingBag,
    MessageSquare,
    LogOut,
    Bell,
    Menu,
    X,
    Wallet,
    ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { DemoStore } from "@/lib/demo-store";
import { Seller, NegotiationRequest } from "@/lib/types";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export default function SellerLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [currentSeller, setCurrentSeller] = useState<Seller | undefined>(undefined);
    const [pendingNegotiations, setPendingNegotiations] = useState(0);
    const pathname = usePathname();
    const router = useRouter();

    // Skip sidebar for login/onboarding routes
    const isPublicRoute = pathname.startsWith("/seller/login") || pathname.startsWith("/seller/onboarding") || pathname.startsWith("/seller/verified");

    useEffect(() => {
        if (isPublicRoute) return;

        const sellerId = DemoStore.getCurrentSellerId();
        if (!sellerId) {
            router.push("/seller/login");
            return;
        }

        const seller = DemoStore.getCurrentSeller();
        setCurrentSeller(seller);

        const loadCounts = () => {
            const negs = DemoStore.getNegotiations(sellerId);
            setPendingNegotiations(negs.filter(n => n.status === "pending").length);
        };

        loadCounts();
        window.addEventListener("storage", loadCounts);
        return () => window.removeEventListener("storage", loadCounts);
    }, [router, isPublicRoute]);

    // For public routes (login, onboarding, verified), just render children
    if (isPublicRoute) {
        return <>{children}</>;
    }

    const navItems = [
        { label: "Overview", href: "/seller/dashboard", icon: LayoutDashboard },
        { label: "Products", href: "/seller/products", icon: Package },
        { label: "Orders", href: "/seller/orders", icon: ShoppingBag },
        { label: "Negotiations", href: "/seller/dashboard/negotiations", icon: MessageSquare, badge: pendingNegotiations > 0 ? pendingNegotiations.toString() : undefined },
        { label: "Payouts", href: "/seller/dashboard/payouts", icon: Wallet },
    ];

    if (!currentSeller) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-pulse text-gray-400">Loading...</div>
            </div>
        );
    }

    return (
        <ProtectedRoute allowedRoles={["seller", "admin"]}>
            <div className="min-h-screen bg-[#E3E6E6] flex transition-colors duration-300">
                {/* Mobile overlay */}
                {isSidebarOpen && (
                    <div
                        className="fixed inset-0 bg-black/40 z-40 md:hidden"
                        onClick={() => setIsSidebarOpen(false)}
                    />
                )}

                {/* Sidebar */}
                <aside
                    className={cn(
                        "fixed inset-y-0 left-0 z-50 w-[260px] bg-white border-r border-gray-200 flex flex-col transition-transform duration-300 ease-out md:translate-x-0 md:static md:z-auto",
                        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
                    )}
                >
                    {/* Seller identity */}
                    <div className="p-5 border-b border-gray-100">
                        <div className="flex items-center gap-2 mb-5 cursor-pointer" onClick={() => router.push("/")}>
                            <Logo variant="dark" />
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-ratel-green-600 to-emerald-500 flex items-center justify-center text-white font-bold text-sm shadow-md">
                                {currentSeller.business_name.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h2 className="font-bold text-sm text-gray-900 truncate">{currentSeller.business_name}</h2>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                    <span className="text-[11px] text-green-600 font-semibold">Verified Seller</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                        <p className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Menu</p>
                        {navItems.map((item) => {
                            const isActive = pathname === item.href || (item.href !== "/seller/dashboard" && pathname.startsWith(item.href));
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-200",
                                        isActive
                                            ? "bg-ratel-green-600 text-white shadow-md shadow-ratel-green-600/20"
                                            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                                    )}
                                    onClick={() => setIsSidebarOpen(false)}
                                >
                                    <div className="flex items-center gap-3">
                                        <item.icon className="h-[18px] w-[18px]" />
                                        {item.label}
                                    </div>
                                    {item.badge && (
                                        <span className={cn(
                                            "text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center",
                                            isActive ? "bg-white/20 text-white" : "bg-blue-100 text-blue-700"
                                        )}>
                                            {item.badge}
                                        </span>
                                    )}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Logout */}
                    <div className="p-3 border-t border-gray-100">
                        <button
                            onClick={() => { DemoStore.logout(); router.push("/seller/login"); }}
                            className="flex items-center gap-3 px-3 py-2.5 text-[13px] font-semibold text-red-500 hover:bg-red-50 rounded-xl w-full transition-colors"
                        >
                            <LogOut className="h-[18px] w-[18px]" />
                            Log Out
                        </button>
                    </div>
                </aside>

                {/* Main Content */}
                <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
                    {/* Top bar */}
                    <header className="flex items-center justify-between px-4 md:px-8 py-3 bg-white border-b border-gray-200 sticky top-0 z-30">
                        <div className="flex items-center gap-3">
                            <Button
                                size="icon"
                                variant="ghost"
                                className="md:hidden h-9 w-9"
                                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            >
                                {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                            </Button>
                            <div>
                                <h1 className="text-lg font-bold text-gray-900">
                                    {navItems.find(n => pathname === n.href)?.label || "Seller Central"}
                                </h1>
                                <p className="text-[11px] text-gray-400 font-medium hidden md:block">
                                    Manage your store, products and orders
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button size="icon" variant="ghost" className="relative h-9 w-9">
                                <Bell className="h-4 w-4 text-gray-500" />
                                {pendingNegotiations > 0 && (
                                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                                )}
                            </Button>
                            <Link href={`/store/${currentSeller.id}`} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 transition-colors">
                                View Store <ChevronRight className="h-3 w-3" />
                            </Link>
                        </div>
                    </header>

                    {/* Page Content */}
                    <main className="flex-1 overflow-y-auto p-4 md:p-8">
                        {children}
                    </main>
                </div>
            </div>
        </ProtectedRoute>
    );
}
