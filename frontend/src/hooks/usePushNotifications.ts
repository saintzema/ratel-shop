import { useEffect, useRef } from 'react';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { DataSyncService } from '@/lib/sync-store';
import { useAuth } from '@/context/AuthContext';

interface NotificationTemplate {
    id: string;
    title: string;
    body: string;
    time: string;
}

export function usePushNotifications() {
    const { user } = useAuth();
    const isInitialized = useRef(false);

    useEffect(() => {
        if (!Capacitor.isNativePlatform()) return;

        const initializeNotifications = async () => {
            try {
                let permStatus = await LocalNotifications.checkPermissions();
                if (permStatus.display !== 'granted') {
                    permStatus = await LocalNotifications.requestPermissions();
                }

                // Register Action Categories (e.g., the "View" button in user screenshot)
                if (Capacitor.getPlatform() !== 'web') {
                    await LocalNotifications.registerActionTypes({
                        types: [
                            {
                                id: 'VIEW_ACTION',
                                actions: [
                                    { id: 'view', title: 'View Details', foreground: true },
                                    { id: 'dismiss', title: 'Dismiss', destructive: true }
                                ]
                            }
                        ]
                    });
                }

                if (permStatus.display === 'granted') {
                    await scheduleMarketingNotifications();
                }
                isInitialized.current = true;
            } catch (error) {
                console.warn("LocalNotifications initialization failed:", error);
            }
        };

        if (!isInitialized.current) {
            initializeNotifications();
        }

        // --- Event 1: Price Drops ---
        const handlePriceDrop = async (e: any) => {
            const { product, newPrice, oldPrice } = e.detail;
            
            // @ts-ignore
            const cart = DataSyncService.getCart ? DataSyncService.getCart() : [];
            // @ts-ignore
            const favorites = DataSyncService.getFavorites ? DataSyncService.getFavorites() : [];
            
            const isInCart = cart.some((item: any) => item.product.id === product.id);
            const isFavorited = favorites.some((fav: any) => fav.id === product.id);
            
            if (!isInCart && !isFavorited) return;

            if (user?.id) {
                DataSyncService.addNotification({
                    userId: user.id,
                    type: "promo",
                    title: "Price Drop Alert! 📉",
                    message: `Price dropped on ${product.name} from ₦${oldPrice?.toLocaleString()} to ₦${newPrice?.toLocaleString()}!`,
                });
            }

            if (Capacitor.isNativePlatform()) {
                const hasPerms = await LocalNotifications.checkPermissions();
                if (hasPerms.display === 'granted') {
                    await LocalNotifications.schedule({
                        notifications: [{
                            title: "Price Drop Alert! 🔥",
                            body: `Your watched item (${product.name}) just dropped to ₦${newPrice?.toLocaleString()}!`,
                            id: Math.floor(Math.random() * 100000),
                            schedule: { at: new Date(Date.now() + 1000) },
                            actionTypeId: 'VIEW_ACTION',
                            attachments: product.imageUrl ? [{ id: 'product', url: product.imageUrl }] : undefined,
                            largeBody: `The price of ${product.name} has been lowered significantly. Snap it up before someone else does!`,
                            summaryArgument: product.name
                        }]
                    });
                }
            }
        };

        // --- Event 2: Admin Live Broadcast ---
        const handleAdminBroadcast = async (e: any) => {
            const { title, body, link, image } = e.detail;
            if (Capacitor.isNativePlatform()) {
                const hasPerms = await LocalNotifications.checkPermissions();
                if (hasPerms.display === 'granted') {
                    await LocalNotifications.schedule({
                        notifications: [{
                            title: title || "New Message",
                            body: body || "You have a new alert.",
                            id: Math.floor(Math.random() * 100000),
                            schedule: { at: new Date(Date.now() + 500) },
                            actionTypeId: 'VIEW_ACTION',
                            attachments: image ? [{ id: 'broadcast', url: image }] : undefined,
                            extra: { link }
                        }]
                    });
                }
            }
        };

        // --- Event 3: Admin Template Updates ---
        const handleTemplatesUpdated = async () => {
            if (Capacitor.isNativePlatform()) {
                await scheduleMarketingNotifications(); 
            }
        };

        // --- Event 4: Real-time Notification Received ---
        const handleNotificationReceived = async (e: any) => {
            const notification = e.detail;
            if (!notification) return;

            const isForMe = notification.userId === "all" || 
                            notification.userId === user?.id || 
                            notification.userId === user?.email ||
                            (notification.userId === "admin" && user?.role === "admin");
            
            if (!isForMe && user?.role === 'seller') {
                const seller = DataSyncService.getSellers().find(s => s.user_id === user.id);
                if (seller && notification.userId === seller.id) {
                    // It's for my store!
                } else {
                    return;
                }
            } else if (!isForMe) {
               return;
            }

            if (Capacitor.isNativePlatform()) {
                const hasPerms = await LocalNotifications.checkPermissions();
                if (hasPerms.display === 'granted') {
                    await LocalNotifications.schedule({
                        notifications: [{
                            title: notification.title || (notification.type === 'order' ? "Order Update 📦" : "New Message 💬"),
                            body: notification.message,
                            id: Math.floor(Math.random() * 100000),
                            schedule: { at: new Date(Date.now() + 500) },
                            actionTypeId: 'VIEW_ACTION',
                            attachments: notification.imageUrl ? [{ id: 'notif_img', url: notification.imageUrl }] : undefined,
                            extra: { link: notification.link }
                        }]
                    });
                }
            }
        };

        window.addEventListener("product-price-dropped", handlePriceDrop);
        window.addEventListener("fp-admin-broadcast", handleAdminBroadcast);
        window.addEventListener("fp-templates-updated", handleTemplatesUpdated);
        window.addEventListener("fp-notification-received", handleNotificationReceived);
        
        return () => {
            window.removeEventListener("product-price-dropped", handlePriceDrop);
            window.removeEventListener("fp-admin-broadcast", handleAdminBroadcast);
            window.removeEventListener("fp-templates-updated", handleTemplatesUpdated);
            window.removeEventListener("fp-notification-received", handleNotificationReceived);
        };
    }, [user?.id]);
}

async function scheduleMarketingNotifications() {
    try {
        await LocalNotifications.cancel({ notifications: [{ id: 101 }, { id: 102 }, { id: 103 }, { id: 104 }] });

        let templates: NotificationTemplate[] = [
            { id: "morning_alert", title: "Good Morning! ☀️", body: "Start your day with amazing deals.", time: "07:45 AM" },
            { id: "midday_alert", title: "Lunch Break Deals 🍕", body: "Prices dropped on items you love.", time: "12:30 PM" },
            { id: "evening_alert", title: "Unwind & Shop 🛒", body: "Relaxing evening? Explore exclusive discounts.", time: "06:00 PM" },
            { id: "weekend_alert", title: "Weekend Flash Sales! ⚡", body: "Time to grab items in your cart before they sell out.", time: "Saturday 10:00 AM" }
        ];

        if (typeof window !== "undefined") {
            const saved = localStorage.getItem("fp_admin_notification_templates");
            if (saved) {
                try {
                    templates = JSON.parse(saved);
                } catch (e) {
                    console.error("Failed to parse", e);
                }
            }
        }

        const now = new Date();
        const scheduled = [];

        // 1. Morning
        const morning = new Date(now);
        morning.setDate(morning.getDate() + 1);
        morning.setHours(7, 45, 0, 0);
        scheduled.push({ title: templates[0].title, body: templates[0].body, id: 101, schedule: { at: morning }, actionTypeId: 'VIEW_ACTION' });

        // 2. Midday
        const midday = new Date(now);
        midday.setDate(midday.getDate() + 2);
        midday.setHours(12, 30, 0, 0);
        scheduled.push({ title: templates[1].title, body: templates[1].body, id: 102, schedule: { at: midday }, actionTypeId: 'VIEW_ACTION' });

        // 3. Evening
        const evening = new Date(now);
        evening.setDate(evening.getDate() + 3);
        evening.setHours(18, 0, 0, 0);
        scheduled.push({ title: templates[2].title, body: templates[2].body, id: 103, schedule: { at: evening }, actionTypeId: 'VIEW_ACTION' });

        // 4. Weekend (Next Saturday)
        const weekend = new Date(now);
        const toSat = (6 - weekend.getDay() + 7) % 7 || 7;
        weekend.setDate(weekend.getDate() + toSat);
        weekend.setHours(10, 0, 0, 0);
        scheduled.push({ title: templates[3].title, body: templates[3].body, id: 104, schedule: { at: weekend }, actionTypeId: 'VIEW_ACTION' });

        await LocalNotifications.schedule({ notifications: scheduled as any });
        console.log("Marketing notifications scheduled with Admin templates.");
    } catch (e) {
        console.error("Failed to schedule marketing notifications", e);
    }
}
