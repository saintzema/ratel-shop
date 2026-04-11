"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

export type NotificationType = "success" | "error" | "info" | "ziva" | "admin";

export interface Notification {
    id: string;
    type: NotificationType;
    title: string;
    message: string;
    duration?: number;
    onClick?: () => void;
    timestamp: number;
    read?: boolean;
}

interface NotificationContextType {
    showNotification: (notification: Omit<Notification, "id" | "timestamp">) => void;
    clearAll: () => void;
    notifications: Notification[];
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const STORAGE_KEY = "fp_notification_history";
const MAX_HISTORY = 50;

export function NotificationProvider({ children }: { children: ReactNode }) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [activeToasts, setActiveToasts] = useState<Notification[]>([]);

    // Initialize from storage & setup cross-tab sync
    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setNotifications(parsed);
            } catch (e) {
                console.error("Failed to load notifications", e);
            }
        }

        // Setup BroadcastChannel for multi-tab sync (Feature-check for older iOS/Mobile)
        const hasBroadcast = typeof BroadcastChannel !== "undefined";
        let channel: any = null;

        if (hasBroadcast) {
            try {
                channel = new BroadcastChannel("fp_notifications_sync");
                channel.onmessage = (event: MessageEvent) => {
                    if (event.data.type === "SYNC_NOTIFICATIONS") {
                        setNotifications(event.data.notifications);
                    } else if (event.data.type === "REMOVE_TOAST") {
                        setActiveToasts(prev => prev.filter(n => n.id !== event.data.id));
                    }
                };
            } catch (e) {
                console.error("BroadcastChannel initialization failed", e);
            }
        }

        return () => {
            if (channel) channel.close();
        };
    }, []);

    // Persist to storage and broadcast to other tabs
    const persistAndBroadcast = useCallback((newNotifications: Notification[]) => {
        setNotifications(newNotifications);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newNotifications.slice(0, MAX_HISTORY)));
        
        if (typeof BroadcastChannel !== "undefined") {
            try {
                const channel = new BroadcastChannel("fp_notifications_sync");
                channel.postMessage({ type: "SYNC_NOTIFICATIONS", notifications: newNotifications });
                // Note: We don't need to keep it open here as postMessage is immediate
                setTimeout(() => channel.close(), 100); 
            } catch (e) {}
        }
    }, []);

    const showNotification = useCallback((notification: Omit<Notification, "id" | "timestamp">) => {
        const id = Date.now().toString();
        const newNotif = { ...notification, id, timestamp: Date.now(), read: false };
        
        // Add to active toasts (ephemeral UI)
        setActiveToasts((prev) => [...prev, newNotif]);

        // Add to permanent history
        setNotifications(prev => {
            const updated = [newNotif, ...prev].slice(0, MAX_HISTORY);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            return updated;
        });

        // Auto-remove toast after duration
        if (notification.duration !== 0) {
            setTimeout(() => {
                removeToast(id);
            }, notification.duration || 5000);
        }
    }, []);

    const removeToast = useCallback((id: string) => {
        setActiveToasts((prev) => prev.filter((n) => n.id !== id));
        if (typeof BroadcastChannel !== "undefined") {
            try {
                const channel = new BroadcastChannel("fp_notifications_sync");
                channel.postMessage({ type: "REMOVE_TOAST", id });
                setTimeout(() => channel.close(), 100);
            } catch (e) {}
        }
    }, []);

    const clearAll = useCallback(() => {
        persistAndBroadcast([]);
    }, [persistAndBroadcast]);

    return (
        <NotificationContext.Provider value={{ showNotification, clearAll, notifications }}>
            {children}
            <div className="fixed top-0 left-0 right-0 z-[9999] p-4 sm:p-6 pointer-events-none flex flex-col items-center gap-3">
                <AnimatePresence mode="popLayout">
                    {activeToasts.map((notif) => (
                        <NotificationToast
                            key={notif.id}
                            notification={notif}
                            onClose={() => removeToast(notif.id)}
                        />
                    ))}
                </AnimatePresence>
            </div>
        </NotificationContext.Provider>
    );
}

export function useNotification() {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error("useNotification must be used within a NotificationProvider");
    }
    return context;
}

function NotificationToast({ notification, onClose }: { notification: Notification; onClose: () => void }) {
    const isMessage = notification.type === "ziva" || notification.type === "admin";

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: -50, scale: 0.9, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 0.95, filter: "blur(10px)", transition: { duration: 0.2 } }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className={`pointer-events-auto rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] border overflow-hidden flex items-center pr-2 pl-1 py-1 cursor-pointer transition-transform hover:scale-105 active:scale-95 max-w-sm w-full sm:w-auto ${isMessage ? "bg-white/90 backdrop-blur-xl border-white/20" : "bg-white border-gray-100"
                }`}
            onClick={(e) => {
                if (notification.onClick) notification.onClick();
                else onClose();
            }}
        >
            <div className="flex items-center gap-3 w-full pr-3 pl-1">

                {/* Icon / Avatar */}
                <div className="shrink-0">
                    {notification.type === "ziva" && (
                        <div className="w-10 h-10 rounded-full bg-brand-green-100 flex items-center justify-center border-2 border-white shadow-sm overflow-hidden relative">
                            <span className="font-black text-brand-green-700 text-lg">Z</span>
                            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white" />
                        </div>
                    )}
                    {notification.type === "admin" && (
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center border-2 border-white shadow-sm overflow-hidden relative">
                            <span className="font-black text-blue-700 text-lg">A</span>
                            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-blue-500 rounded-full border-2 border-white" />
                        </div>
                    )}
                    {notification.type === "success" && (
                        <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
                            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                        </div>
                    )}
                    {notification.type === "error" && (
                        <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                            <AlertCircle className="w-6 h-6 text-red-500" />
                        </div>
                    )}
                    {notification.type === "info" && (
                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                            <Info className="w-6 h-6 text-blue-500" />
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 py-1">
                    <p className="text-sm font-bold text-gray-900 leading-tight truncate">{notification.title}</p>
                    <p className="text-xs text-gray-500 font-medium truncate mt-0.5">{notification.message}</p>
                </div>

            </div>
        </motion.div>
    );
}
