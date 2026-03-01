"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, Check, Loader2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { DemoStore } from "@/lib/demo-store";
import { Notification as AppNotification } from "@/lib/types";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export function NotificationBell({ variant = "light" }: { variant?: "light" | "dark" }) {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const bellRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    // ...

    const loadNotifications = () => {
        // Use email as ID since that's what we use for orders/negotiations in this demo
        const userId = user?.email;
        const data = DemoStore.getNotifications(userId);
        // Sort by date desc
        const sorted = [...data].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setNotifications(sorted);
    };

    useEffect(() => {
        loadNotifications();

        // Listen for storage changes (cross-tab or internal)
        const handleStorage = () => loadNotifications();
        window.addEventListener("storage", handleStorage);
        return () => window.removeEventListener("storage", handleStorage);
    }, [user]); // Reload when user changes

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node) &&
                bellRef.current &&
                !bellRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const unreadCount = notifications.filter(n => !n.read).length;

    const handleMarkAllRead = () => {
        setIsLoading(true);
        setTimeout(() => {
            DemoStore.markAllAsRead();
            setIsLoading(false);
        }, 500);
    };

    const handleNotificationClick = (n: AppNotification) => {
        if (!n.read) {
            DemoStore.markAsRead(n.id);
        }
        setIsOpen(false);
        if (n.link) {
            router.push(n.link);
        }
    };

    return (
        <div className="relative">
            <button
                ref={bellRef}
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "relative p-2 rounded-full transition-colors cursor-pointer",
                    variant === "light" ? "hover:bg-white/10" : "hover:bg-gray-100"
                )}
            >
                <Bell className={cn("h-6 w-6 animate-bell-swing", variant === "light" ? "text-white" : "text-gray-500 hover:text-gray-900")} />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 h-4 w-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border border-transparent">
                        {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                )}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        ref={dropdownRef}
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={{ duration: 0.2 }}
                        className="absolute top-full right-0 mt-2 w-80 sm:w-96 bg-white/95 backdrop-blur-xl shadow-2xl rounded-xl overflow-hidden border border-gray-100 z-50 origin-top-right"
                    >
                        {/* Header */}
                        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <h3 className="font-bold text-gray-900">Notifications</h3>
                            {unreadCount > 0 && (
                                <button
                                    onClick={handleMarkAllRead}
                                    disabled={isLoading}
                                    className="text-xs font-bold text-brand-green-600 hover:text-brand-green-700 flex items-center gap-1"
                                >
                                    {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                                    Mark all read
                                </button>
                            )}
                        </div>

                        {/* List */}
                        <div className="max-h-[400px] overflow-y-auto">
                            {notifications.length === 0 ? (
                                <div className="p-8 text-center text-gray-500">
                                    <Bell className="h-8 w-8 mx-auto mb-2 opacity-20" />
                                    <p className="text-sm">No notifications yet</p>
                                </div>
                            ) : (
                                <ul className="divide-y divide-gray-50">
                                    {notifications.map((n) => (
                                        <li
                                            key={n.id}
                                            onClick={() => handleNotificationClick(n)}
                                            className={cn(
                                                "p-4 hover:bg-gray-50 transition-colors cursor-pointer flex gap-3",
                                                !n.read ? "bg-blue-50/30" : ""
                                            )}
                                        >
                                            <div className={cn(
                                                "shrink-0 w-2 h-2 rounded-full mt-2",
                                                !n.read ? "bg-brand-green-500" : "bg-transparent"
                                            )} />
                                            <div className="flex-1 space-y-1">
                                                <p className={cn("text-sm text-gray-900 leading-snug", !n.read && "font-semibold")}>
                                                    {n.message}
                                                </p>
                                                <p className="text-[10px] text-gray-400 capitalize">
                                                    {n.type} • {new Date(n.timestamp).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
