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
    Search
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { DemoStore } from "@/lib/demo-store";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

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
        { label: "User Directory", href: "/admin/users", icon: Users },
        { label: "Catalog Control", href: "/admin/products", icon: Package },
        { label: "Governance", href: "/admin/governance", icon: ShieldCheck },
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
                    <header className="flex items-center justify-between px-6 md:px-10 py-4 bg-white/80 backdrop-blur-xl border-b border-gray-200 sticky top-0 z-30">
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
                                <h1 className="text-xl font-black text-gray-900 tracking-tight">
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
                            <Button size="icon" variant="ghost" className="relative h-10 w-10 bg-gray-50 rounded-2xl">
                                <Bell className="h-5 w-5 text-gray-500" />
                                <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full" />
                            </Button>
                            <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-indigo-500/20">
                                AD
                            </div>
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
