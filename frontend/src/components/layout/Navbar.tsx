"use strict";
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    Search,
    ShoppingCart,
    Menu,
    User,
    MapPin,
    ChevronDown,
    X,
    Phone,
    Monitor,
    Sofa,
    Home,
    Zap,
    ShoppingBag,
    Car,
    Gamepad
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/ui/logo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { CATEGORIES } from "@/lib/types";
import { cn } from "@/lib/utils";

export function Navbar() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState("All");
    const pathname = usePathname();

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    // Close sidebar on route change
    // active route highlighting logic can be added here

    return (
        <>
            <header className="sticky top-0 z-50 w-full flex-col">
                {/* Top Bar - Amazon Style */}
                <div className="flex w-full items-center gap-4 bg-[#131921] px-4 py-3 text-white">
                    {/* Logo */}
                    <Logo />

                    {/* Deliver To */}
                    <div className="hidden md:flex flex-col text-xs leading-tight hover:outline hover:outline-1 hover:outline-white p-2 rounded cursor-pointer">
                        <span className="text-gray-300">Deliver to</span>
                        <div className="flex items-center font-bold">
                            <MapPin className="mr-1 h-3 w-3" />
                            Lagos
                        </div>
                    </div>

                    {/* Search Bar */}
                    <div className="flex flex-1 items-center">
                        <div className="flex h-10 w-full rounded-md bg-white text-black overflow-hidden focus-within:ring-2 focus-within:ring-ratel-orange">
                            {/* Category Dropdown (Mock) */}
                            <button className="hidden sm:flex items-center gap-1 bg-gray-100 px-3 text-xs text-gray-700 hover:bg-gray-200 border-r border-gray-300">
                                {selectedCategory} <ChevronDown className="h-3 w-3" />
                            </button>

                            <Input
                                className="flex-1 border-0 bg-transparent px-3 text-sm focus-visible:ring-0 placeholder:text-gray-500 rounded-none h-full"
                                placeholder="Search RatelShop..."
                            />

                            <Button
                                variant="amazon"
                                className="h-full rounded-none px-4 bg-ratel-green-600 hover:bg-ratel-orange text-white hover:text-black border-none transition-colors duration-300 cursor-pointer"
                            >
                                <Search className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>

                    {/* Account & Lists Dropdown */}
                    <div
                        className="relative hidden md:flex flex-col text-xs leading-tight hover:outline hover:outline-1 hover:outline-white p-2 rounded cursor-pointer group"
                        onMouseEnter={() => setIsAccountMenuOpen(true)}
                        onMouseLeave={() => setIsAccountMenuOpen(false)}
                    >
                        <span className="text-gray-300">Hello, Sign in</span>
                        <span className="font-bold flex items-center">Account & Lists <ChevronDown className="ml-1 h-3 w-3" /></span>

                        {/* Dropdown Menu */}
                        <AnimatePresence>
                            {isAccountMenuOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    className="absolute top-full right-0 w-64 bg-white dark:bg-zinc-900 shadow-2xl rounded-sm p-4 mt-1 border dark:border-zinc-800 text-black dark:text-white z-[100]"
                                >
                                    <div className="flex flex-col items-center pb-4 border-b dark:border-zinc-800">
                                        <Button className="w-full bg-ratel-orange text-black font-bold hover:bg-amber-500 mb-2">Sign in</Button>
                                        <p className="text-[10px] text-gray-500">New customer? <Link href="/register" className="text-blue-600 hover:underline">Start here.</Link></p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 pt-4">
                                        <div className="space-y-2">
                                            <h4 className="font-bold text-sm">Your Lists</h4>
                                            <ul className="text-[11px] space-y-1 text-gray-600 dark:text-gray-400">
                                                <li className="hover:text-ratel-orange">Create a List</li>
                                                <li className="hover:text-ratel-orange">Find a List</li>
                                            </ul>
                                        </div>
                                        <div className="space-y-2">
                                            <h4 className="font-bold text-sm">Your Account</h4>
                                            <ul className="text-[11px] space-y-1 text-gray-600 dark:text-gray-400">
                                                <li className="hover:text-ratel-orange">Your Orders</li>
                                                <li className="hover:text-ratel-orange">Your Profile</li>
                                                <li className="hover:text-ratel-orange">Seller Hub</li>
                                            </ul>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Returns & Orders */}
                    <div className="hidden md:flex flex-col text-xs leading-tight hover:outline hover:outline-1 hover:outline-white p-2 rounded cursor-pointer">
                        <span className="text-gray-300">Returns</span>
                        <span className="font-bold">& Orders</span>
                    </div>

                    {/* Theme Toggle */}
                    <div className="hidden md:block">
                        <ThemeToggle />
                    </div>

                    {/* Cart */}
                    <Link href="/cart" className="flex items-end gap-1 hover:outline hover:outline-1 hover:outline-white p-2 rounded relative">
                        <div className="relative">
                            <ShoppingCart className="h-8 w-8" />
                            <Badge
                                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center rounded-full bg-ratel-orange text-black font-bold p-0 border-2 border-[#131921]"
                            >
                                3
                            </Badge>
                        </div>
                        <span className="text-sm font-bold hidden sm:inline mb-1">Cart</span>
                    </Link>
                </div>

                {/* Bottom Bar - Navigation */}
                <div className="flex w-full items-center gap-4 bg-[#232f3e] px-4 py-2 text-sm text-white overflow-x-auto no-scrollbar">
                    <button
                        onClick={toggleSidebar}
                        className="flex items-center gap-1 font-bold hover:outline hover:outline-1 hover:outline-white px-2 py-1 rounded"
                    >
                        <Menu className="h-5 w-5" /> All
                    </button>

                    {["Today's Deals", "VDM Verified", "Electronics", "Phones", "Solar Energy", "Cars", "Help"].map((item) => (
                        <Link
                            key={item}
                            href={item === "VDM Verified" ? "/seller/verified" : `/category/${item.toLowerCase().replace(" ", "-")}`}
                            className="whitespace-nowrap px-2 py-1 hover:outline hover:outline-1 hover:outline-white rounded"
                        >
                            {item}
                        </Link>
                    ))}
                </div>
            </header>

            {/* Sidebar Overlay */}
            <AnimatePresence>
                {isSidebarOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.5 }}
                            exit={{ opacity: 0 }}
                            onClick={toggleSidebar}
                            className="fixed inset-0 z-40 bg-black"
                        />
                        <motion.div
                            initial={{ x: "-100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "-100%" }}
                            transition={{ type: "tween", duration: 0.3 }}
                            className="fixed inset-y-0 left-0 z-50 w-80 bg-white dark:bg-zinc-900 shadow-xl overflow-y-auto"
                        >
                            <div className="flex items-center gap-2 bg-[#232f3e] px-6 py-3 text-white font-bold text-lg">
                                <User className="h-6 w-6" /> Hello, Sign in
                            </div>

                            <div className="py-2">
                                <div className="px-6 py-3 font-bold text-lg text-gray-800 dark:text-gray-100">Shop By Category</div>
                                <ul>
                                    {CATEGORIES.map((cat) => (
                                        <li key={cat.value}>
                                            <Link
                                                href={`/category/${cat.value}`}
                                                className="flex items-center justify-between px-6 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800"
                                                onClick={() => setIsSidebarOpen(false)}
                                            >
                                                <span className="flex items-center gap-3">
                                                    {/* Mapping icons manually since they are strings in types.ts */}
                                                    {cat.label}
                                                </span>
                                                <ChevronDown className="h-4 w-4 -rotate-90 text-gray-400" />
                                            </Link>
                                        </li>
                                    ))}
                                </ul>

                                <hr className="my-2 border-gray-200 dark:border-zinc-800" />

                                <div className="px-6 py-3 font-bold text-lg text-gray-800 dark:text-gray-100">Help & Settings</div>
                                <ul>
                                    {["Your Account", "Customer Service", "Sign Out"].map((item) => (
                                        <li key={item}>
                                            <Link
                                                href="#"
                                                className="block px-6 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800"
                                            >
                                                {item}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <button
                                onClick={toggleSidebar}
                                className="absolute top-2 right-2 text-white p-1"
                            >
                                <X className="h-6 w-6" />
                            </button>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
