"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
    LayoutDashboard,
    Users,
    Package,
    ShieldCheck,
    Settings,
    LogOut,
    Bell,
    Menu,
    X,
    ChevronRight,
    AlertTriangle,
    Search,
    MessageSquare,
    Inbox,
    Vault,
    Megaphone
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { DemoStore } from "@/lib/demo-store";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { NotificationBell } from "@/components/ui/NotificationBell";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const pathname = usePathname();
    const router = useRouter();

    const navItems = [
        { label: "Overview", href: "/admin/dashboard", icon: LayoutDashboard },
        { label: "Concierge Ops", href: "/admin/orders", icon: MessageSquare },
        { label: "User Directory", href: "/admin/users", icon: Users },
        { label: "Catalog Control", href: "/admin/products", icon: Package },
        { label: "Governance", href: "/admin/governance", icon: ShieldCheck },
        { label: "Escrow", href: "/admin/escrow", icon: Vault },
        { label: "Support Inbox", href: "/admin/inbox", icon: Inbox },
        { label: "Sponsored Ads", href: "/admin/ads", icon: Megaphone },
        { label: "Settings", href: "/admin/settings", icon: Settings },
    ];

    return (
        <ProtectedRoute allowedRoles={["admin"]}>
            <div className="min-h-screen bg-[#F0F2F5] flex transition-colors duration-300">
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
                        "fixed inset-y-0 left-0 z-50 w-[280px] bg-white border-r border-gray-200 flex flex-col transition-transform duration-300 ease-out md:translate-x-0 md:static md:z-auto",
                        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
                    )}
                >
                    {/* Admin identity */}
                    <div className="p-6 border-b border-gray-100">
                        <div className="flex items-center gap-2 mb-6 cursor-pointer" onClick={() => router.push("/")}>
                            <Logo variant="dark" />
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-2xl border border-indigo-100">
                            <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                                <ShieldCheck className="h-5 w-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h2 className="font-bold text-sm text-gray-900">Admin Control</h2>
                                <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider">Super Administrator</p>
                            </div>
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
                        <p className="px-3 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Platform Control</p>
                        {navItems.map((item) => {
                            const isActive = pathname === item.href || pathname.startsWith(item.href);
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "flex items-center justify-between px-4 py-3 rounded-2xl text-[14px] font-bold transition-all duration-200",
                                        isActive
                                            ? "bg-indigo-600 text-white shadow-xl shadow-indigo-500/20"
                                            : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                                    )}
                                    onClick={() => setIsSidebarOpen(false)}
                                >
                                    <div className="flex items-center gap-3.5">
                                        <item.icon className={cn("h-[20px] w-[20px]", isActive ? "text-white" : "text-gray-400")} />
                                        {item.label}
                                    </div>
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Bottom Actions */}
                    <div className="p-4 border-t border-gray-100">
                        <button
                            onClick={() => router.push("/")}
                            className="flex items-center gap-3 px-4 py-3 text-[14px] font-bold text-gray-500 hover:bg-gray-50 rounded-2xl w-full transition-colors"
                        >
                            <LogOut className="h-[20px] w-[20px]" />
                            Exit Admin
                        </button>
                    </div>
                </aside>

                {/* Main Content */}
                <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
                    {/* Top bar */}
                    <header className="flex items-center justify-between px-6 md:px-10 py-4 bg-[#0F1B12]/90 backdrop-blur-xl border-b border-[#0F1B12]/10 sticky top-0 z-30">
                        <div className="flex items-center gap-4">
                            <Button
                                size="icon"
                                variant="ghost"
                                className="md:hidden h-10 w-10 bg-gray-50"
                                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            >
                                {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                            </Button>
                            <div>
                                <h1 className="text-xl font-black text-white tracking-tight">
                                    {navItems.find(n => pathname.startsWith(n.href))?.label || "Admin Central"}
                                </h1>
                                <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider hidden md:block">
                                    Nigeria's Trusted Marketplace Engine
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="hidden lg:flex items-center relative">
                                <Search className="absolute left-3 h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Global Search..."
                                    className="pl-10 pr-4 py-2 bg-gray-50 border-none rounded-2xl text-xs font-medium w-64 focus:ring-2 focus:ring-indigo-500 transition-all"
                                />
                            </div>
                            <div className="relative h-10 w-10 flex items-center justify-center rounded-2xl bg-[#1A261D] hover:bg-[#233528] transition-colors">
                                <NotificationBell />
                            </div>

                            <DropdownMenu>
                                <DropdownMenuTrigger className="outline-none">
                                    <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-black flex items-center justify-center shadow-lg shadow-indigo-500/20 cursor-pointer hover:scale-105 transition-transform">
                                        AD
                                    </div>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2 border-gray-100 shadow-xl mt-2 z-50 bg-white">
                                    <DropdownMenuLabel className="font-black text-gray-900 text-sm py-2 px-3">
                                        Superadmin
                                        <p className="text-xs font-bold text-gray-500 mt-0.5">admin@ratelshop.com</p>
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator className="bg-gray-100 my-1" />
                                    <Link href="/admin/settings">
                                        <DropdownMenuItem className="cursor-pointer rounded-xl font-bold text-gray-700 py-3 px-3 hover:bg-gray-50">
                                            <Settings className="mr-2 h-4 w-4" /> System Config
                                        </DropdownMenuItem>
                                    </Link>
                                    <DropdownMenuSeparator className="bg-gray-100 my-1" />
                                    <Link href="/login">
                                        <DropdownMenuItem className="cursor-pointer rounded-xl font-bold text-rose-600/90 hover:text-rose-600 py-3 px-3 hover:bg-rose-50/50">
                                            <LogOut className="mr-2 h-4 w-4" /> Log out
                                        </DropdownMenuItem>
                                    </Link>
                                </DropdownMenuContent>
                            </DropdownMenu>

                        </div>
                    </header>

                    {/* Page Content */}
                    <main className="flex-1 overflow-y-auto">
                        <div className="max-w-[1600px] mx-auto p-6 md:p-10">
                            {children}
                        </div>
                    </main>
                </div>
            </div>
        </ProtectedRoute>
    );
}
