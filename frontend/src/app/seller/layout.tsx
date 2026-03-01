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
    ChevronRight,
    Settings,
    Crown,
    BarChart3,
    Users,
    Tag,
    Blocks,
    Store
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { DemoStore } from "@/lib/demo-store";
import { Seller, NegotiationRequest } from "@/lib/types";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
        { label: "Customers", href: "/seller/customers", icon: Users },
        { label: "Analytics", href: "/seller/analytics", icon: BarChart3 },
        { label: "Discounts", href: "/seller/discounts", icon: Tag },
        { label: "App Integrations", href: "/seller/integrations", icon: Blocks },
        { label: "Messages", href: "/seller/dashboard/messages", icon: MessageSquare, badge: pendingNegotiations > 0 ? pendingNegotiations.toString() : undefined },
        { label: "Payouts", href: "/seller/dashboard/payouts", icon: Wallet },
        { label: "Store Settings", href: "/seller/settings", icon: Settings },
        { label: "Plans & Billing", href: "/seller/settings/billing", icon: Crown },
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
            <div className="min-h-screen bg-[#F5F5F7] flex transition-colors duration-300 font-sans">
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
                    <div className="p-5 border-b border-gray-200">
                        <div className="flex items-center gap-2 mb-5 cursor-pointer" onClick={() => router.push("/")}>
                            <Logo variant="dark" />
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 md:h-12 md:w-12 rounded-2xl bg-gradient-to-br from-gray-900 to-black flex items-center justify-center text-white font-bold text-lg shadow-sm">
                                {currentSeller.business_name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h2 className="font-bold text-sm text-gray-900 truncate tracking-tight">{currentSeller.business_name}</h2>
                                <div className="flex flex-col gap-1 mt-0.5">
                                    {currentSeller.verified && (
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                            <span className="text-[11px] text-gray-500 font-medium">Verified Seller</span>
                                        </div>
                                    )}
                                    {currentSeller.subscription_plan && currentSeller.subscription_plan !== "Starter" && (
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                            <span className="text-[11px] text-amber-600 font-bold tracking-tight">Premium Seller</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
                        <p className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Menu</p>
                        {navItems.map((item) => {
                            const isActive = pathname === item.href || (item.href !== "/seller/dashboard" && pathname.startsWith(item.href));
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-200",
                                        isActive
                                            ? "bg-gray-100 text-gray-900"
                                            : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                                    )}
                                    onClick={() => setIsSidebarOpen(false)}
                                >
                                    <div className="flex items-center gap-3">
                                        <item.icon className={cn("h-[18px] w-[18px]", isActive ? "text-gray-900" : "text-gray-400")} />
                                        {item.label}
                                    </div>
                                    {item.badge && (
                                        <span className={cn(
                                            "text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center",
                                            isActive ? "bg-white shadow-sm text-gray-900" : "bg-gray-100 text-gray-500"
                                        )}>
                                            {item.badge}
                                        </span>
                                    )}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Logout */}
                    <div className="p-4 border-t border-gray-200">
                        <button
                            onClick={() => { DemoStore.logout(); router.push("/seller/login"); }}
                            className="flex items-center gap-3 px-3 py-2.5 text-[13px] font-semibold text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl w-full transition-colors"
                        >
                            <LogOut className="h-[18px] w-[18px]" />
                            Log Out
                        </button>
                    </div>
                </aside>

                {/* Main Content */}
                <div className="flex-1 flex flex-col min-h-screen overflow-hidden relative">
                    {/* Top bar */}
                    <header className="flex items-center justify-between px-4 md:px-8 py-4 bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-30">
                        <div className="flex items-center gap-3">
                            <Button
                                size="icon"
                                variant="ghost"
                                className="md:hidden h-9 w-9 text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            >
                                {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                            </Button>
                            <div>
                                <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                                    {navItems.find(n => pathname === n.href)?.label || "Seller Central"}
                                </h1>
                                <p className="text-[11px] text-gray-500 font-medium hidden md:block mt-0.5">
                                    Manage your store, products and orders
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Button size="icon" variant="ghost" className="relative h-9 w-9 text-gray-500 hover:text-gray-900 hover:bg-gray-100">
                                <Bell className="h-5 w-5" />
                                {pendingNegotiations > 0 && (
                                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-pulse border-2 border-white" />
                                )}
                            </Button>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="relative h-10 w-10 md:h-12 md:w-12 rounded-2xl bg-gradient-to-br from-gray-900 to-black flex items-center justify-center text-white font-bold text-lg shadow-sm cursor-pointer p-0 overflow-hidden">
                                        {currentSeller.business_name.charAt(0).toUpperCase()}
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-64 rounded-2xl p-2 border-gray-100 shadow-xl bg-white/95 backdrop-blur-xl">
                                    <DropdownMenuLabel className="font-bold text-gray-900 px-3 py-2">
                                        {currentSeller.business_name}
                                        <div className="text-[10px] text-gray-400 font-medium uppercase tracking-widest mt-0.5" >Seller ID: {currentSeller.id}</div>
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator className="bg-gray-100 opacity-50 my-1" />
                                    <DropdownMenuItem asChild className="rounded-xl cursor-pointer py-2.5 px-3 focus:bg-gray-50 focus:text-gray-900 transition-colors">
                                        <Link href={`/store/${currentSeller.store_url || currentSeller.id}`} className="w-full flex items-center font-medium">
                                            <ShoppingBag className="mr-3 h-4 w-4 text-gray-400" />
                                            View Store Profile
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild className="rounded-xl cursor-pointer py-2.5 px-3 focus:bg-gray-50 focus:text-gray-900 transition-colors">
                                        <Link href="/seller/dashboard/payouts" className="w-full flex items-center font-medium">
                                            <Wallet className="mr-3 h-4 w-4 text-gray-400" />
                                            Settings / Setup Payout
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator className="bg-gray-100 opacity-50 my-1" />
                                    <DropdownMenuItem asChild className="rounded-xl cursor-pointer py-2.5 px-3 focus:bg-amber-50 focus:text-amber-700 text-amber-600 transition-colors font-bold">
                                        <Link href="/seller/settings/billing" className="w-full flex items-center">
                                            <Crown className="mr-3 h-4 w-4" />
                                            Become Premium Seller
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="rounded-xl cursor-pointer py-2.5 px-3 focus:bg-indigo-50 focus:text-indigo-700 text-indigo-600 transition-colors font-bold">
                                        Run Sponsored Ads
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator className="bg-gray-100 opacity-50 my-1" />
                                    <DropdownMenuItem className="rounded-xl cursor-pointer py-2.5 px-3 focus:bg-gray-50 focus:text-gray-900 transition-colors font-medium">
                                        <Store className="mr-3 h-4 w-4 text-emerald-500" />
                                        Switch Business
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="rounded-xl cursor-pointer py-2.5 px-3 focus:bg-gray-50 focus:text-gray-900 transition-colors font-medium text-xs">
                                        + Add New Store Profile
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator className="bg-gray-100 opacity-50 my-1" />
                                    <DropdownMenuItem
                                        className="rounded-xl cursor-pointer py-2.5 px-3 focus:bg-red-50 focus:text-red-700 text-red-600 transition-colors font-bold"
                                        onClick={() => { DemoStore.logout(); router.push("/login"); }}
                                    >
                                        <LogOut className="mr-3 h-4 w-4" />
                                        Log out
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
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
