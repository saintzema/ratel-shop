"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Bell, Check, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { DemoStore } from "@/lib/demo-store";

interface LocalNotification {
    id: string;
    userId?: string;
    type: string;
    message: string;
    link?: string;
    read: boolean;
    timestamp: string;
}

export function NotificationBell({ variant = "light" }: { variant?: "light" | "dark" }) {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<LocalNotification[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const bellRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    // Load notifications from DemoStore (localStorage) as primary source
    const refreshNotifications = useCallback(() => {
        if (!user?.email && !user?.id) {
            setNotifications([]);
            return;
        }
        const userId = user.id || user.email;
        const local = DemoStore.getNotifications(userId);
        // Sort newest first
        local.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setNotifications(local);
    }, [user?.email, user?.id]);

    useEffect(() => {
        refreshNotifications();

        // Listen for real-time updates from DemoStore
        const handler = () => refreshNotifications();
        window.addEventListener("storage", handler);
        window.addEventListener("demo-store-update", handler);

        // Also poll every 5s for cross-browser/device realtime sync
        const poll = setInterval(refreshNotifications, 5000);

        return () => {
            window.removeEventListener("storage", handler);
            window.removeEventListener("demo-store-update", handler);
            clearInterval(poll);
        };
    }, [refreshNotifications]);

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
        if (!user?.email && !user?.id) return;
        setIsLoading(true);
        const userId = user.id || user.email;
        DemoStore.markAllNotificationsRead(userId);
        refreshNotifications();
        setIsLoading(false);
    };

    const handleNotificationClick = (n: LocalNotification) => {
        if (!n.read) {
            DemoStore.markNotificationRead(n.id);
            refreshNotifications();
        }
        setIsOpen(false);
        if (n.link) {
            router.push(n.link);
        }
    };

    const formatTimeAgo = (timestamp: string) => {
        const diff = Date.now() - new Date(timestamp).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return "Just now";
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        const days = Math.floor(hrs / 24);
        if (days < 7) return `${days}d ago`;
        return new Date(timestamp).toLocaleDateString();
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
                <Bell className={cn(
                    "h-6 w-6",
                    unreadCount > 0 && "animate-bell-swing",
                    variant === "light" ? "text-white" : "text-gray-500 hover:text-gray-900"
                )} />
                {unreadCount > 0 && (
                    <span className="absolute top-0.5 right-0.5 h-4.5 w-4.5 min-w-[18px] bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white shadow-sm px-0.5">
                        {unreadCount > 99 ? "99+" : unreadCount}
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
                            <div className="flex items-center gap-2">
                                <h3 className="font-bold text-gray-900">Notifications</h3>
                                {unreadCount > 0 && (
                                    <span className="text-[10px] font-black bg-red-500 text-white px-1.5 py-0.5 rounded-full">{unreadCount}</span>
                                )}
                            </div>
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
                                    <p className="text-sm font-medium">No notifications yet</p>
                                    <p className="text-xs text-gray-400 mt-1">Activities like orders, deals, and messages will appear here.</p>
                                </div>
                            ) : (
                                <ul className="divide-y divide-gray-50">
                                    {notifications.slice(0, 50).map((n) => (
                                        <li
                                            key={n.id}
                                            onClick={() => handleNotificationClick(n)}
                                            className={cn(
                                                "p-4 hover:bg-gray-50 transition-colors cursor-pointer flex gap-3",
                                                !n.read ? "bg-blue-50/40" : ""
                                            )}
                                        >
                                            <div className={cn(
                                                "shrink-0 w-2 h-2 rounded-full mt-2",
                                                !n.read ? "bg-brand-green-500 animate-pulse" : "bg-transparent"
                                            )} />
                                            <div className="flex-1 space-y-1 min-w-0">
                                                <p className={cn("text-sm text-gray-900 leading-snug", !n.read && "font-semibold")}>
                                                    {n.message}
                                                </p>
                                                <p className="text-[10px] text-gray-400 capitalize">
                                                    {n.type} • {formatTimeAgo(n.timestamp)}
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
