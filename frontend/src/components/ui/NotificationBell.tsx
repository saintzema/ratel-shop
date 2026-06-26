"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Bell, Check, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { DataSyncService } from "@/lib/sync-store";

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

    // Merge local (localStorage) + DB notifications, deduping by id, newest first
    const refreshNotifications = useCallback(async () => {
        if (!user?.email && !user?.id) {
            setNotifications([]);
            return;
        }
        const userId = user.id || user.email!;
        const local: LocalNotification[] = DataSyncService.getNotifications(userId);

        // Fetch DB notifications (real events: orders, approvals, negotiations, etc.)
        let dbNotifs: LocalNotification[] = [];
        if (user.email) {
            try {
                const res = await fetch(`/api/notifications?user_email=${encodeURIComponent(user.email)}`);
                if (res.ok) {
                    const data = await res.json();
                    if (Array.isArray(data)) dbNotifs = data as LocalNotification[];
                }
            } catch { /* offline — show local only */ }
        }

        // Dedupe: DB wins on id collision (more authoritative read state)
        const seen = new Set<string>();
        const merged: LocalNotification[] = [];
        for (const n of [...dbNotifs, ...local]) {
            if (!seen.has(n.id)) {
                seen.add(n.id);
                merged.push(n);
            }
        }
        merged.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setNotifications(merged);
    }, [user?.email, user?.id]);

    useEffect(() => {
        refreshNotifications();

        // Listen for real-time updates from DataSyncService
        const handler = () => refreshNotifications();
        window.addEventListener("storage", handler);
        window.addEventListener("sync-store-update", handler);

        // Poll every 15s — DB fetch is included so keep interval relaxed
        const poll = setInterval(refreshNotifications, 15000);

        return () => {
            window.removeEventListener("storage", handler);
            window.removeEventListener("sync-store-update", handler);
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

    const handleMarkAllRead = async () => {
        if (!user?.email && !user?.id) return;
        setIsLoading(true);
        const userId = user.id || user.email!;
        DataSyncService.markAllNotificationsRead(userId);
        // Also mark read in DB
        if (user.email) {
            try {
                await fetch(`/api/notifications?mark_all=true&user_email=${encodeURIComponent(user.email)}`, { method: "PATCH" });
            } catch { /* best-effort */ }
        }
        await refreshNotifications();
        setIsLoading(false);
    };

    const handleNotificationClick = (n: LocalNotification) => {
        if (!n.read) {
            DataSyncService.markNotificationRead(n.id);
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
                        className="absolute top-full right-0 mt-3 w-80 sm:w-96 bg-[#0a0a0a]/95 backdrop-blur-2xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.6)] rounded-2xl overflow-hidden border border-white/10 z-50 origin-top-right ring-1 ring-white/5"
                    >
                        {/* Header */}
                        <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                            <div className="flex items-center gap-2">
                                <h3 className="font-bold text-white text-sm">Notifications</h3>
                                {unreadCount > 0 && (
                                    <span className="text-[10px] font-black bg-emerald-500 text-black px-1.5 py-0.5 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.3)]">{unreadCount}</span>
                                )}
                            </div>
                            {notifications.length > 0 && (
                                <button
                                    onClick={handleMarkAllRead}
                                    disabled={isLoading}
                                    className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors"
                                >
                                    {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                                    Mark all read
                                </button>
                            )}
                        </div>

                        {/* List */}
                        <div className="max-h-[70vh] sm:max-h-[480px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                            {notifications.length === 0 ? (
                                <div className="p-12 text-center">
                                    <div className="w-16 h-16 bg-white/[0.03] rounded-full flex items-center justify-center mx-auto mb-4 border border-white/5">
                                        <Bell className="h-6 w-6 text-white/20" />
                                    </div>
                                    <p className="text-sm font-bold text-white">All caught up!</p>
                                    <p className="text-xs text-gray-500 mt-1 max-w-[200px] mx-auto">No new notifications at the moment. We'll let you know when things happen.</p>
                                </div>
                            ) : (
                                <ul className="divide-y divide-white/5">
                                    {notifications.slice(0, 50).map((n) => (
                                        <li
                                            key={n.id}
                                            onClick={() => handleNotificationClick(n)}
                                            className={cn(
                                                "p-4 hover:bg-white/[0.03] transition-all cursor-pointer flex gap-4 group relative",
                                                !n.read ? "bg-emerald-500/[0.03]" : ""
                                            )}
                                        >
                                            {!n.read && (
                                                <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                            )}
                                            <div className={cn(
                                                "shrink-0 w-8 h-8 rounded-xl flex items-center justify-center border transition-colors",
                                                !n.read 
                                                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" 
                                                    : "bg-white/5 border-white/5 text-gray-500 group-hover:text-gray-300"
                                            )}>
                                                <Bell className="h-4 w-4" />
                                            </div>
                                            <div className="flex-1 space-y-1 min-w-0">
                                                <div className="flex justify-between items-start gap-2">
                                                    <p className={cn("text-xs leading-relaxed", !n.read ? "text-white font-bold" : "text-gray-400 font-medium")}>
                                                        {n.message}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-black text-emerald-500/80 uppercase tracking-tight">
                                                        {n.type}
                                                    </span>
                                                    <span className="text-[10px] text-gray-600 font-bold italic">
                                                        • {formatTimeAgo(n.timestamp)}
                                                    </span>
                                                </div>
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
