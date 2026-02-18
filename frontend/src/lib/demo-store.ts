"use client";

import { NegotiationRequest, Order, Product, Seller, KYCSubmission, Complaint, Notification as AppNotification } from "./types";
import { DEMO_NEGOTIATIONS, DEMO_ORDERS, DEMO_PRODUCTS, DEMO_SELLERS, DEMO_KYC, DEMO_COMPLAINTS, DEMO_ADMIN_STATS } from "./data";

class DemoStoreService {
    private static instance: DemoStoreService;
    private readonly STORAGE_KEYS = {
        NEGOTIATIONS: "ratel_demo_negotiations",
        ORDERS: "ratel_demo_orders",
        SELLERS: "ratel_demo_sellers",
        PRODUCTS: "ratel_demo_products",
        CURRENT_SELLER: "ratel_demo_current_seller",
        NOTIFICATIONS: "ratel_demo_notifications",
        KYC: "ratel_demo_kyc",
        COMPLAINTS: "ratel_demo_complaints",
    };

    private constructor() {
        if (typeof window !== "undefined") {
            this.init();
        }
    }

    public static getInstance(): DemoStoreService {
        if (!DemoStoreService.instance) {
            DemoStoreService.instance = new DemoStoreService();
        }
        return DemoStoreService.instance;
    }

    private init() {
        // Version check: when seed data is updated (new products added), bump this version
        // to force re-seeding localStorage with the latest data
        const DATA_VERSION = "4";
        const currentVersion = localStorage.getItem("ratel_data_version");

        if (currentVersion !== DATA_VERSION) {
            // Clear all stale data and re-seed with latest
            Object.values(this.STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
            localStorage.setItem("ratel_data_version", DATA_VERSION);
        }

        if (!localStorage.getItem(this.STORAGE_KEYS.NEGOTIATIONS)) {
            localStorage.setItem(this.STORAGE_KEYS.NEGOTIATIONS, JSON.stringify(DEMO_NEGOTIATIONS));
        }
        if (!localStorage.getItem(this.STORAGE_KEYS.ORDERS)) {
            localStorage.setItem(this.STORAGE_KEYS.ORDERS, JSON.stringify(DEMO_ORDERS));
        }
        if (!localStorage.getItem(this.STORAGE_KEYS.SELLERS)) {
            localStorage.setItem(this.STORAGE_KEYS.SELLERS, JSON.stringify(DEMO_SELLERS));
        }
        if (!localStorage.getItem(this.STORAGE_KEYS.PRODUCTS)) {
            localStorage.setItem(this.STORAGE_KEYS.PRODUCTS, JSON.stringify(DEMO_PRODUCTS));
        }
        if (!localStorage.getItem(this.STORAGE_KEYS.KYC)) {
            localStorage.setItem(this.STORAGE_KEYS.KYC, JSON.stringify(DEMO_KYC));
        }
        if (!localStorage.getItem(this.STORAGE_KEYS.COMPLAINTS)) {
            localStorage.setItem(this.STORAGE_KEYS.COMPLAINTS, JSON.stringify(DEMO_COMPLAINTS));
        }
    }

    // --- Negotiations ---
    getNegotiations(sellerId?: string): NegotiationRequest[] {
        if (typeof window === "undefined") return DEMO_NEGOTIATIONS;
        const all = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.NEGOTIATIONS) || "[]");
        if (!sellerId) return all;

        // Join with products to filter by seller
        const products = this.getProducts();
        return all.filter((n: NegotiationRequest) => {
            const product = products.find(p => p.id === n.product_id);
            return product?.seller_id === sellerId;
        });
    }

    addNegotiation(request: NegotiationRequest) {
        const current = this.getNegotiations();
        const updated = [request, ...current];
        localStorage.setItem(this.STORAGE_KEYS.NEGOTIATIONS, JSON.stringify(updated));
        // Also trigger storage event for other tabs
        window.dispatchEvent(new Event("storage"));
        window.dispatchEvent(new Event("demo-store-update"));
    }

    updateNegotiationStatus(id: string, status: "accepted" | "rejected" | "purchased") {
        const current = this.getNegotiations();
        const updated = current.map(n => n.id === id ? { ...n, status } : n);
        localStorage.setItem(this.STORAGE_KEYS.NEGOTIATIONS, JSON.stringify(updated));
        window.dispatchEvent(new Event("storage"));
        window.dispatchEvent(new Event("demo-store-update"));
    }

    sendCounterOffer(id: string, price: number, message: string) {
        const current = this.getNegotiations();
        const negotiation = current.find(n => n.id === id);
        if (!negotiation) return;

        const updated = current.map(n => n.id === id ? {
            ...n,
            counter_price: price,
            counter_message: message,
            counter_status: "pending"
        } : n);

        localStorage.setItem(this.STORAGE_KEYS.NEGOTIATIONS, JSON.stringify(updated));
        window.dispatchEvent(new Event("storage"));

        // Notify Buyer (User)
        this.addNotification({
            type: "negotiation",
            message: `Seller sent a counter offer for your negotiation. Check your dashboard.`,
            link: "/account/negotiations"
        });
    }

    // --- Login ---
    loginSeller(sellerId: string) {
        localStorage.setItem(this.STORAGE_KEYS.CURRENT_SELLER, sellerId);
        window.dispatchEvent(new Event("storage"));
    }

    getCurrentSellerId(): string | null {
        if (typeof window === "undefined") return null;
        return localStorage.getItem(this.STORAGE_KEYS.CURRENT_SELLER);
    }

    getCurrentSeller(): Seller | undefined {
        const id = this.getCurrentSellerId();
        if (!id) return undefined;
        const sellers = this.getSellers();
        return sellers.find(s => s.id === id);
    }

    logout() {
        localStorage.removeItem(this.STORAGE_KEYS.CURRENT_SELLER);
        window.dispatchEvent(new Event("storage"));
    }

    updateSeller(id: string, updates: Partial<Seller>) {
        const sellers = this.getSellers();
        const updated = sellers.map(s => s.id === id ? { ...s, ...updates } : s);
        localStorage.setItem(this.STORAGE_KEYS.SELLERS, JSON.stringify(updated));
        window.dispatchEvent(new Event("storage"));
    }

    updateSellerCoverImage(id: string, url: string) {
        this.updateSeller(id, { cover_image_url: url });
    }

    // --- Getters ---
    getProducts(): Product[] {
        if (typeof window === "undefined") return DEMO_PRODUCTS;
        return JSON.parse(localStorage.getItem(this.STORAGE_KEYS.PRODUCTS) || JSON.stringify(DEMO_PRODUCTS));
    }

    getSellers(): Seller[] {
        if (typeof window === "undefined") return DEMO_SELLERS;
        return JSON.parse(localStorage.getItem(this.STORAGE_KEYS.SELLERS) || JSON.stringify(DEMO_SELLERS));
    }

    getOrders(): Order[] {
        if (typeof window === "undefined") return DEMO_ORDERS;
        return JSON.parse(localStorage.getItem(this.STORAGE_KEYS.ORDERS) || JSON.stringify(DEMO_ORDERS));
    }

    addOrder(order: Omit<Order, "id" | "created_at" | "updated_at" | "product">): Order {
        const products = this.getProducts();
        const product = products.find(p => p.id === order.product_id);
        if (!product) throw new Error("Product not found");

        const orderId = `RATEL-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;

        const newOrder: Order = {
            ...order,
            id: orderId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            product: product,
            tracking_id: orderId,
            tracking_status: "pending",
            tracking_steps: [
                {
                    status: "Order Placed",
                    location: "System",
                    timestamp: new Date().toISOString(),
                    completed: true
                }
            ]
        };

        const orders = this.getOrders();
        const updated = [newOrder, ...orders];
        localStorage.setItem(this.STORAGE_KEYS.ORDERS, JSON.stringify(updated));
        window.dispatchEvent(new Event("storage"));
        // Custom event so we can listen specifically for this
        window.dispatchEvent(new Event("demo-store-update"));
        return newOrder;
    }

    getOrderByTrackingId(trackingId: string): Order | undefined {
        const orders = this.getOrders();
        return orders.find(o => o.id === trackingId || o.tracking_id === trackingId);
    }


    // --- Product CRUD ---
    addProduct(product: Omit<Product, "id" | "created_at" | "seller_id" | "seller_name" | "price_flag">) {
        const products = this.getProducts();

        // Mock AI analysis for price flag
        const priceFlag: "fair" | "overpriced" | "suspicious" | "none" =
            product.price > (product.recommended_price || product.price * 1.2) ? "overpriced" :
                product.price < (product.recommended_price || product.price * 0.8) ? "suspicious" : "fair";

        const newProduct: Product = {
            ...product,
            id: `prod_${Math.random().toString(36).substr(2, 9)}`,
            seller_id: "sel_001", // Default to TechHub Lagos for demo
            seller_name: "TechHub Lagos",
            created_at: new Date().toISOString(),
            price_flag: priceFlag,
            sold_count: 0,
            review_count: 0,
            avg_rating: 0,
            is_active: true,
            images: product.images || []
        };

        const updated = [newProduct, ...products];
        localStorage.setItem(this.STORAGE_KEYS.PRODUCTS, JSON.stringify(updated));
        window.dispatchEvent(new Event("storage"));
        window.dispatchEvent(new Event("demo-store-update"));
        return newProduct;
    }

    updateProduct(id: string, updates: Partial<Product>) {
        const products = this.getProducts();
        const updated = products.map(p => p.id === id ? { ...p, ...updates } : p);
        localStorage.setItem(this.STORAGE_KEYS.PRODUCTS, JSON.stringify(updated));
        window.dispatchEvent(new Event("storage"));
        window.dispatchEvent(new Event("demo-store-update"));
    }

    deleteProduct(id: string) {
        const products = this.getProducts();
        const updated = products.filter(p => p.id !== id);
        localStorage.setItem(this.STORAGE_KEYS.PRODUCTS, JSON.stringify(updated));
        window.dispatchEvent(new Event("storage"));
        window.dispatchEvent(new Event("demo-store-update"));
    }

    // --- Order Management ---
    updateOrderStatus(id: string, status: Order["status"]) {
        const orders = this.getOrders();
        const updated = orders.map(o => o.id === id ? { ...o, status } : o);
        localStorage.setItem(this.STORAGE_KEYS.ORDERS, JSON.stringify(updated));
        window.dispatchEvent(new Event("storage"));
    }

    updateOrderEscrow(id: string, escrow_status: Order["escrow_status"]) {
        const orders = this.getOrders();
        const order = orders.find(o => o.id === id);
        if (!order) return;

        const updated = orders.map(o => o.id === id ? { ...o, escrow_status } : o);
        localStorage.setItem(this.STORAGE_KEYS.ORDERS, JSON.stringify(updated));

        // Notify Seller if released
        if (escrow_status === "released") {
            this.addNotification({
                userId: order.seller_id,
                type: "system",
                message: `Funds for Order #${id.substring(0, 8)} have been released to your available balance.`,
                link: "/seller/dashboard/payouts"
            });
        }

        window.dispatchEvent(new Event("storage"));
        window.dispatchEvent(new Event("demo-store-update"));
    }

    updateTrackingStatus(id: string, status: string, location: string, carrier?: string, tracking_id?: string) {
        const orders = this.getOrders();
        const order = orders.find(o => o.id === id);
        if (!order) return;

        const newStep = {
            status,
            location,
            timestamp: new Date().toISOString(),
            completed: true
        };

        const updatedSteps = [...(order.tracking_steps || []), newStep];

        const updatedOrders = orders.map(o => o.id === id ? {
            ...o,
            tracking_steps: updatedSteps,
            carrier: carrier || o.carrier,
            tracking_id: tracking_id || o.tracking_id,
            updated_at: new Date().toISOString(),
            tracking_status: status // Sync top level status
        } : o);

        localStorage.setItem(this.STORAGE_KEYS.ORDERS, JSON.stringify(updatedOrders));

        // Notify Buyer
        this.addNotification({
            userId: order.customer_id,
            type: "order",
            message: `Update for Order #${id.substring(0, 8)}: ${status} in ${location}.`,
            link: "/account/orders"
        });

        window.dispatchEvent(new Event("storage"));
        window.dispatchEvent(new Event("demo-store-update"));
    }

    // --- Notifications ---
    getNotifications(userId?: string): AppNotification[] {
        if (typeof window === "undefined") return [];
        const stored = localStorage.getItem(this.STORAGE_KEYS.NOTIFICATIONS);
        if (!stored) {
            // Seed initial notifications (generic ones have no userId)
            const initial: AppNotification[] = [
                {
                    id: "notif_1",
                    type: "system",
                    message: "Welcome to RatelShop! Complete your profile to get started.",
                    read: false,
                    timestamp: new Date().toISOString(),
                    link: "/account/profile"
                    // No userId implies generic/system-wide or shown to all (or just standard demo data)
                },
                {
                    id: "notif_2",
                    type: "order",
                    message: "Your order #ord_xpl70ukl5 has been shipped!",
                    read: true,
                    timestamp: new Date(Date.now() - 86400000).toISOString(),
                    link: "/account/orders/ord_xpl70ukl5"
                }
            ];
            localStorage.setItem(this.STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(initial));
            // Return defaults if no userId provided, or filter?
            // For demo purposes, if userId is provided, show matching + global (no userId)
            return initial.filter(n => !n.userId || n.userId === userId);
        }

        const all: AppNotification[] = JSON.parse(stored);
        if (!userId) return []; // If no user, show nothing (or strictly public/system promos)

        return all.filter(n => !n.userId || n.userId === userId);
    }

    addNotification(notification: Omit<AppNotification, "id" | "timestamp" | "read">) {
        const stored = localStorage.getItem(this.STORAGE_KEYS.NOTIFICATIONS);
        const current: AppNotification[] = stored ? JSON.parse(stored) : [];

        const newNotif: AppNotification = {
            ...notification,
            id: `notif_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString(),
            read: false
        };
        const updated = [newNotif, ...current];
        localStorage.setItem(this.STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(updated));
        window.dispatchEvent(new Event("storage"));
    }

    markAsRead(id: string) {
        const current = this.getNotifications();
        const updated = current.map(n => n.id === id ? { ...n, read: true } : n);
        localStorage.setItem(this.STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(updated));
        window.dispatchEvent(new Event("storage"));
    }

    markAllAsRead() {
        const current = this.getNotifications();
        const updated = current.map(n => ({ ...n, read: true }));
        localStorage.setItem(this.STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(updated));
        window.dispatchEvent(new Event("storage"));
    }

    // --- Admin & Governance ---
    getAdminStats() {
        if (typeof window === "undefined") return DEMO_ADMIN_STATS;

        const orders = this.getOrders();
        const products = this.getProducts();
        const sellers = this.getSellers();
        const complaints = this.getComplaints();

        const totalRevenue = orders.reduce((sum, o) => sum + (o.amount || 0), 0);
        const escrowBalance = orders.filter(o => o.escrow_status === "held").reduce((sum, o) => sum + (o.amount || 0), 0);
        const processedRevenue = orders.filter(o => o.escrow_status === "released").reduce((sum, o) => sum + (o.amount || 0), 0);

        return {
            ...DEMO_ADMIN_STATS,
            total_revenue: totalRevenue,
            escrow_balance: escrowBalance,
            processed_revenue: processedRevenue,
            active_sellers: sellers.length,
            flagged_products: products.filter(p => p.price_flag === "suspicious" || p.price_flag === "overpriced").length,
            open_complaints: complaints.filter(c => c.status !== "resolved").length,
            total_orders: orders.length,
        };
    }

    getComplaints(): Complaint[] {
        if (typeof window === "undefined") return DEMO_COMPLAINTS;
        return JSON.parse(localStorage.getItem(this.STORAGE_KEYS.COMPLAINTS) || JSON.stringify(DEMO_COMPLAINTS));
    }

    getKYCSubmissions(): KYCSubmission[] {
        if (typeof window === "undefined") return DEMO_KYC;
        return JSON.parse(localStorage.getItem(this.STORAGE_KEYS.KYC) || JSON.stringify(DEMO_KYC));
    }

    updateKYCStatus(id: string, status: KYCSubmission["status"]) {
        const submissions = this.getKYCSubmissions();
        const updated = submissions.map(s => s.id === id ? { ...s, status } : s);
        localStorage.setItem(this.STORAGE_KEYS.KYC, JSON.stringify(updated));

        // If approved, update seller verified status
        if (status === "approved") {
            const submission = submissions.find(s => s.id === id);
            if (submission) {
                const sellers = this.getSellers();
                const updatedSellers = sellers.map(sel => sel.id === submission.seller_id ? { ...sel, verified: true, kyc_status: "approved" } : sel);
                localStorage.setItem(this.STORAGE_KEYS.SELLERS, JSON.stringify(updatedSellers));
            }
        }

        window.dispatchEvent(new Event("storage"));
    }

    updateComplaintStatus(id: string, status: Complaint["status"]) {
        const complaints = this.getComplaints();
        const updated = complaints.map(c => c.id === id ? { ...c, status } : c);
        localStorage.setItem(this.STORAGE_KEYS.COMPLAINTS, JSON.stringify(updated));
        window.dispatchEvent(new Event("storage"));
    }
}

export const DemoStore = DemoStoreService.getInstance();
