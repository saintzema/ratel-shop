"use client";

import { NegotiationRequest, Order, Product, Seller, KYCSubmission, Complaint, Notification as AppNotification, SupportMessage, Dispute, DisputeReason, Coupon, ReturnRequest } from "./types";
import { DEMO_NEGOTIATIONS, DEMO_ORDERS, DEMO_PRODUCTS, DEMO_SELLERS, DEMO_KYC, DEMO_COMPLAINTS, DEMO_ADMIN_STATS, DEMO_PAYOUTS } from "./data";

class DemoStoreService {
    private static instance: DemoStoreService;
    public readonly STORAGE_KEYS = {
        NEGOTIATIONS: "fairprice_demo_negotiations",
        ORDERS: "fairprice_demo_orders",
        SELLERS: "fairprice_demo_sellers",
        PRODUCTS: "fairprice_demo_products",
        CURRENT_SELLER: "fairprice_demo_current_seller",
        NOTIFICATIONS: "fairprice_demo_notifications",
        KYC: "fairprice_demo_kyc",
        COMPLAINTS: "fairprice_demo_complaints",
        PAYOUTS: "fairprice_demo_payouts",
        SUPPORT_MESSAGES: "fairprice_demo_support_messages",
        DISPUTES: "fairprice_demo_disputes",
        COUPONS: "fairprice_demo_coupons",
        REFERRALS: "fairprice_demo_referrals",
        REVIEWS: "fairprice_demo_reviews",
        RETURNS: "fairprice_demo_returns",
        USERS: "fp_user",
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
        const DATA_VERSION = "8";
        const currentVersion = localStorage.getItem("fairprice_data_version");

        if (currentVersion !== DATA_VERSION) {
            // Clear all stale data and re-seed with latest
            Object.values(this.STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
            localStorage.setItem("fairprice_data_version", DATA_VERSION);
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
        if (!localStorage.getItem(this.STORAGE_KEYS.PAYOUTS)) {
            localStorage.setItem(this.STORAGE_KEYS.PAYOUTS, JSON.stringify(DEMO_PAYOUTS));
        }
        if (!localStorage.getItem(this.STORAGE_KEYS.RETURNS)) {
            const initialReturns: ReturnRequest[] = [
                {
                    id: "ret_demo1",
                    order_id: "FP-RET551O",
                    customer_id: "u1",
                    seller_id: "s1",
                    reason: "Product arrived damaged",
                    description: "The item box was completely crushed during delivery.",
                    images: [],
                    status: "pending",
                    created_at: "2026-02-13T09:00:00Z",
                    updated_at: "2026-02-13T09:00:00Z"
                }
            ];
            localStorage.setItem(this.STORAGE_KEYS.RETURNS, JSON.stringify(initialReturns));
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

    // --- Returns ---
    getReturnRequests(sellerId?: string): ReturnRequest[] {
        if (typeof window === "undefined") return [];
        const all: ReturnRequest[] = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.RETURNS) || "[]");
        if (!sellerId) return all;
        return all.filter(r => r.seller_id === sellerId);
    }

    createReturnRequest(orderId: string, customerId: string, sellerId: string, reason: string, description: string, images?: string[]): ReturnRequest {
        const requests = this.getReturnRequests();
        const newReq: ReturnRequest = {
            id: `ret_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            order_id: orderId,
            customer_id: customerId,
            seller_id: sellerId,
            reason,
            description,
            images,
            status: "pending",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        requests.unshift(newReq);
        localStorage.setItem(this.STORAGE_KEYS.RETURNS, JSON.stringify(requests));

        // Update order status
        this.updateOrderStatus(orderId, "return_requested");

        window.dispatchEvent(new Event("storage"));
        window.dispatchEvent(new Event("demo-store-update"));

        return newReq;
    }

    updateReturnRequestStatus(id: string, status: ReturnRequest["status"], sellerNotes?: string, adminNotes?: string) {
        const requests = this.getReturnRequests();
        const req = requests.find(r => r.id === id);
        if (!req) return;

        const updated = requests.map(r => r.id === id ? {
            ...r,
            status,
            seller_notes: sellerNotes || r.seller_notes,
            admin_notes: adminNotes || r.admin_notes,
            updated_at: new Date().toISOString()
        } : r);

        localStorage.setItem(this.STORAGE_KEYS.RETURNS, JSON.stringify(updated));

        // Sync to order status & escrow
        if (status === "approved") {
            this.updateOrderStatus(req.order_id, "return_approved");
        } else if (status === "rejected") {
            this.updateOrderStatus(req.order_id, "return_rejected");
            // If rejected, might unfreeze escrow or leave it for dispute.
        } else if (status === "item_received" || status === "refunded") {
            this.updateOrderStatus(req.order_id, "returned");
            this.updateOrderEscrow(req.order_id, "refunded");

            // Send refund notification
            this.addNotification({
                userId: req.customer_id,
                type: "order",
                message: `Your return for order #${req.order_id.substring(0, 8)} has been processed and your refund is complete.`,
                link: `/account/orders/${req.order_id}`
            });
        }

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

    getSellerCommissionRate(seller: Seller): number {
        if (seller.commission_rate !== undefined) {
            return seller.commission_rate;
        }

        const plan = seller.subscription_plan || "Starter";
        if (plan === "Starter") return 0.01;      // 1%
        if (plan === "Pro") return 0.005;         // 0.5%
        if (plan === "Growth" || plan === "Scale") return 0; // Free

        return 0.01; // Default to Starter
    }

    updateSellerCoverImage(id: string, url: string) {
        this.updateSeller(id, { cover_image_url: url });
    }

    // --- Getters ---
    getProducts(): Product[] {
        if (typeof window === "undefined") return DEMO_PRODUCTS;
        return JSON.parse(localStorage.getItem(this.STORAGE_KEYS.PRODUCTS) || JSON.stringify(DEMO_PRODUCTS));
    }

    /** Returns only products whose seller has kyc_status === "approved" (or verified === true). 
     *  Use this for public-facing views (Homepage, Search, Category pages). */
    getApprovedProducts(): Product[] {
        const products = this.getProducts();
        const sellers = this.getSellers();
        const approvedSellerIds = new Set(
            sellers.filter(s => s.verified === true || s.kyc_status === "approved").map(s => s.id)
        );
        return products.filter(p => approvedSellerIds.has(p.seller_id));
    }

    getSellers(): Seller[] {
        if (typeof window === "undefined") return DEMO_SELLERS;
        return JSON.parse(localStorage.getItem(this.STORAGE_KEYS.SELLERS) || JSON.stringify(DEMO_SELLERS));
    }

    addSeller(seller: Seller) {
        const sellers = this.getSellers();
        sellers.push(seller);
        localStorage.setItem(this.STORAGE_KEYS.SELLERS, JSON.stringify(sellers));
        window.dispatchEvent(new Event("storage"));
    }

    getOrders(): Order[] {
        if (typeof window === "undefined") return DEMO_ORDERS;
        return JSON.parse(localStorage.getItem(this.STORAGE_KEYS.ORDERS) || JSON.stringify(DEMO_ORDERS));
    }

    addOrder(order: Omit<Order, "id" | "created_at" | "updated_at" | "product">, sourceProduct?: Product): Order {
        const products = this.getProducts();
        const product = products.find(p => p.id === order.product_id) || sourceProduct;
        if (!product) throw new Error("Product not found");

        const orderId = `ORDER-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;

        const now = new Date();
        const trackingSteps = [
            {
                status: "Order Placed",
                location: "System",
                timestamp: now.toISOString(),
                completed: true
            },
            {
                status: "Payment Confirmed",
                location: "Paystack Gateway",
                timestamp: new Date(now.getTime() + 60000).toISOString(), // +1 min
                completed: true
            },
            {
                status: "Processing",
                location: product.seller_name || "Seller Warehouse",
                timestamp: new Date(now.getTime() + 3600000).toISOString(), // +1 hr
                completed: true
            },
            {
                status: "Dispatched to Courier",
                location: "Lagos Sortation Hub",
                timestamp: new Date(now.getTime() + 86400000).toISOString(), // +1 day
                completed: false
            },
            {
                status: "Out for Delivery",
                location: "Local Hub",
                timestamp: new Date(now.getTime() + 172800000).toISOString(), // +2 days
                completed: false
            },
            {
                status: "Delivered",
                location: "Customer Address",
                timestamp: new Date(now.getTime() + 259200000).toISOString(), // +3 days
                completed: false
            },
        ];

        const newOrder: Order = {
            ...order,
            id: orderId,
            created_at: now.toISOString(),
            updated_at: now.toISOString(),
            product: product,
            tracking_id: orderId,
            tracking_status: "pending",
            tracking_steps: trackingSteps
        };

        const orders = this.getOrders();
        const updated = [newOrder, ...orders];
        localStorage.setItem(this.STORAGE_KEYS.ORDERS, JSON.stringify(updated));

        // Notify Buyer
        this.addNotification({
            userId: order.customer_id,
            type: "order",
            message: `Your order #${orderId.substring(0, 8)} for ${product.name} has been placed successfully.`,
            link: `/account/orders`
        });

        // Notify Seller
        const seller = this.getSellers().find(s => s.id === product.seller_id);
        if (seller) {
            this.addNotification({
                userId: seller.owner_email,
                type: "order",
                message: `New order #${orderId.substring(0, 8)} for ${product.name}. Please process for shipment.`,
                link: `/seller/orders`
            });
        }

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
        const priceFlag: "fair" | "overpriced" | "too_low" | "none" =
            product.price > (product.recommended_price || product.price * 1.2) ? "overpriced" :
                product.price < (product.recommended_price || product.price * 0.8) ? "too_low" : "fair";

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

    addRawProduct(product: Product) {
        let products = this.getProducts();
        if (products.some(p => p.id === product.id)) return product;

        products.unshift(product);
        if (products.length > 500) products.length = 500; // soft limit

        try {
            localStorage.setItem(this.STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
        } catch (e) {
            // Force aggressive trim if quota exceeded
            products.length = 150;
            localStorage.setItem(this.STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
        }

        // Also add to global search history 
        try {
            const historyJson = localStorage.getItem("fairprice_demo_global_search_history") || "[]";
            const history = JSON.parse(historyJson);
            history.unshift({ productId: product.id, productName: product.name, timestamp: new Date().toISOString() });
            if (history.length > 50) history.length = 50;
            localStorage.setItem("fairprice_demo_global_search_history", JSON.stringify(history));
        } catch (e) { }

        window.dispatchEvent(new Event("storage"));
        window.dispatchEvent(new Event("demo-store-update"));
        return product;
    }

    updateProduct(id: string, updates: Partial<Product>) {
        const products = this.getProducts();
        const updated = products.map(p => p.id === id ? { ...p, ...updates } : p);
        localStorage.setItem(this.STORAGE_KEYS.PRODUCTS, JSON.stringify(updated));
        window.dispatchEvent(new Event("storage"));
        window.dispatchEvent(new Event("demo-store-update"));
    }

    setCachedGlobalResults(query: string, products: Product[]) {
        localStorage.setItem(`fairprice_global_search_${query.toLowerCase().trim()}`, JSON.stringify(products));
    }

    getCachedGlobalResults(query: string): Product[] | null {
        if (typeof window === "undefined") return null;
        const data = localStorage.getItem(`fairprice_global_search_${query.toLowerCase().trim()}`);
        return data ? JSON.parse(data) : null;
    }

    getSearchHistoryProducts(): Product[] {
        if (typeof window === "undefined") return [];
        const historyJson = localStorage.getItem("fairprice_demo_global_search_history") || "[]";
        const history = JSON.parse(historyJson);
        const products = this.getProducts();
        // Return recently viewed products from history that exist in the products array
        const historyProducts = history
            .map((h: any) => products.find((p) => p.id === h.productId))
            .filter(Boolean)
            .reverse(); // Most recent first

        // Deduplicate by id
        return historyProducts.filter((v: Product, i: number, a: Product[]) => a.findIndex(t => (t.id === v.id)) === i);
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
            // Seed initial notifications (generic ones use "all")
            const initial: AppNotification[] = [
                {
                    id: "notif_1",
                    userId: "all",
                    type: "system",
                    message: "Welcome to FairPrice! Complete your profile to get started.",
                    read: false,
                    timestamp: new Date().toISOString(),
                    link: "/account/profile"
                }
            ];
            localStorage.setItem(this.STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(initial));
            return initial.filter(n => n.userId === "all" || n.userId === userId);
        }

        const all: AppNotification[] = JSON.parse(stored);
        if (!userId) return []; // If no user, show nothing (or strictly public/system promos)

        return all.filter(n => n.userId === "all" || n.userId === userId);
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

    sendAdminMessageToUser(userId: string, subject: string, message: string) {
        // Find the user by ID or Email
        const usersJson = localStorage.getItem(this.STORAGE_KEYS.USERS);
        let targetUser = null;
        if (usersJson) {
            const users = Object.values(JSON.parse(usersJson));
            targetUser = users.find((u: any) => u.id === userId || u.email === userId);
        }

        const actualUserId = targetUser ? (targetUser as any).id : userId;

        this.addNotification({
            userId: actualUserId,
            type: "system",
            message: `[Admin Message: ${subject}] - ${message}`,
            link: "/account/messages"
        });
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

    // --- User & Premium ---
    getUser(emailOrId: string) {
        const stored = localStorage.getItem("fp_user");
        if (!stored) return null;
        try {
            const user = JSON.parse(stored);
            if (user.email === emailOrId || user.id === emailOrId) return user;
        } catch { }
        return null;
    }

    addPremiumSubscription(userId: string) {
        const stored = localStorage.getItem("fp_user");
        if (!stored) return;
        try {
            const user = JSON.parse(stored);
            if (user.id === userId || user.email === userId) {
                user.isPremium = true;
                user.premiumExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
                localStorage.setItem("fp_user", JSON.stringify(user));
                window.dispatchEvent(new Event("storage"));
            }
        } catch { }
    }
    // --- Negotiation Chat Messaging ---
    addNegotiationMessage(negId: string, sender: "seller" | "buyer", text: string) {
        const stored = localStorage.getItem(this.STORAGE_KEYS.NEGOTIATIONS);
        if (!stored) return;
        const negs = JSON.parse(stored);
        const idx = negs.findIndex((n: any) => n.id === negId);
        if (idx === -1) return;
        if (!negs[idx].chat_messages) negs[idx].chat_messages = [];
        negs[idx].chat_messages.push({ sender, text, timestamp: new Date().toISOString() });
        localStorage.setItem(this.STORAGE_KEYS.NEGOTIATIONS, JSON.stringify(negs));
        window.dispatchEvent(new Event("storage"));
    }

    // --- Promotions ---
    private PROMO_KEY = "fp_promotions";
    private PROMO_PLANS: Record<string, { days: number; price: number }> = {
        "7_day": { days: 7, price: 5000 },
        "14_day": { days: 14, price: 8500 },
        "30_day": { days: 30, price: 15000 },
    };

    createPromotion(productId: string, sellerId: string, plan: "7_day" | "14_day" | "30_day") {
        const planInfo = this.PROMO_PLANS[plan];
        const now = new Date();
        const promo = {
            id: `promo_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            product_id: productId,
            seller_id: sellerId,
            plan,
            amount_paid: planInfo.price,
            started_at: now.toISOString(),
            expires_at: new Date(now.getTime() + planInfo.days * 24 * 60 * 60 * 1000).toISOString(),
            status: "active" as const,
            impressions: 0,
            clicks: 0,
        };
        const stored = localStorage.getItem(this.PROMO_KEY);
        const all = stored ? JSON.parse(stored) : [];
        all.push(promo);
        localStorage.setItem(this.PROMO_KEY, JSON.stringify(all));
        // Mark product as sponsored
        this.updateProduct(productId, { is_sponsored: true });
        window.dispatchEvent(new Event("storage"));
        return promo;
    }

    getPromotions(sellerId?: string): any[] {
        const stored = localStorage.getItem(this.PROMO_KEY);
        const all = stored ? JSON.parse(stored) : [];
        // Auto-expire
        const now = new Date().getTime();
        let changed = false;
        for (const p of all) {
            if (p.status === "active" && new Date(p.expires_at).getTime() < now) {
                p.status = "ended";
                this.updateProduct(p.product_id, { is_sponsored: false });
                changed = true;
            }
        }
        if (changed) localStorage.setItem(this.PROMO_KEY, JSON.stringify(all));
        return sellerId ? all.filter((p: any) => p.seller_id === sellerId) : all;
    }

    getActivePromotions(): any[] {
        return this.getPromotions().filter((p: any) => p.status === "active");
    }

    endPromotion(promoId: string) {
        const stored = localStorage.getItem(this.PROMO_KEY);
        if (!stored) return;
        const all = JSON.parse(stored);
        const promo = all.find((p: any) => p.id === promoId);
        if (promo) {
            promo.status = "ended";
            this.updateProduct(promo.product_id, { is_sponsored: false });
            localStorage.setItem(this.PROMO_KEY, JSON.stringify(all));
            window.dispatchEvent(new Event("storage"));
        }
    }

    extendPromotion(promoId: string, days: number) {
        const stored = localStorage.getItem(this.PROMO_KEY);
        if (!stored) return;
        const all = JSON.parse(stored);
        const promo = all.find((p: any) => p.id === promoId);
        if (promo) {
            const current = new Date(promo.expires_at).getTime();
            promo.expires_at = new Date(current + days * 24 * 60 * 60 * 1000).toISOString();
            if (promo.status === "ended") {
                promo.status = "active";
                this.updateProduct(promo.product_id, { is_sponsored: true });
            }
            localStorage.setItem(this.PROMO_KEY, JSON.stringify(all));
            window.dispatchEvent(new Event("storage"));
        }
    }

    getPromoPlan(plan: string) { return this.PROMO_PLANS[plan]; }

    // --- Platform Commission ---
    static PLATFORM_COMMISSION = 0.05; // 5% commission

    getSellerPayout(orderAmount: number) {
        const commission = orderAmount * DemoStoreService.PLATFORM_COMMISSION;
        return { commission, payout: orderAmount - commission, rate: DemoStoreService.PLATFORM_COMMISSION };
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
            flagged_products: products.filter(p => p.price_flag === "too_low" || p.price_flag === "overpriced").length,
            open_complaints: complaints.filter(c => c.status !== "resolved").length,
            total_orders: orders.length,
        };
    }

    getComplaints(): Complaint[] {
        if (typeof window === "undefined") return DEMO_COMPLAINTS;
        return JSON.parse(localStorage.getItem(this.STORAGE_KEYS.COMPLAINTS) || JSON.stringify(DEMO_COMPLAINTS));
    }

    getPayouts(): any[] {
        if (typeof window === "undefined") return DEMO_PAYOUTS;
        return JSON.parse(localStorage.getItem(this.STORAGE_KEYS.PAYOUTS) || JSON.stringify(DEMO_PAYOUTS));
    }

    updatePayoutStatus(id: string, status: string) {
        const payouts = this.getPayouts();
        const updated = payouts.map(p => p.id === id ? { ...p, status } : p);
        localStorage.setItem(this.STORAGE_KEYS.PAYOUTS, JSON.stringify(updated));

        // If completed, update the orders that were cashed out
        if (status === "completed") {
            const currentPayout = payouts.find(p => p.id === id);
            if (currentPayout && currentPayout.order_ids) {
                const orders = this.getOrders();
                const updatedOrders = orders.map(o =>
                    currentPayout.order_ids.includes(o.id) ? { ...o, payout_status: "cashed_out" } : o
                );
                localStorage.setItem(this.STORAGE_KEYS.ORDERS, JSON.stringify(updatedOrders));
                window.dispatchEvent(new Event("demo-store-update"));
            }
        }
    }

    requestPayout(sellerId: string, orderIds: string[], amount: number, method: string, bank: string, account_last4: string) {
        const payouts = this.getPayouts();
        const seller = this.getSellers().find(s => s.id === sellerId);
        if (!seller) return;

        const newPayout = {
            id: `pay_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            seller_id: sellerId,
            seller_name: seller.business_name,
            amount,
            status: "processing",
            order_ids: orderIds,
            method,
            bank,
            account_last4,
            created_at: new Date().toISOString()
        };

        localStorage.setItem(this.STORAGE_KEYS.PAYOUTS, JSON.stringify([newPayout, ...payouts]));

        // Mark orders as pending_payout
        const orders = this.getOrders();
        const updatedOrders = orders.map(o =>
            orderIds.includes(o.id) ? { ...o, payout_status: "pending_payout" } : o
        );
        localStorage.setItem(this.STORAGE_KEYS.ORDERS, JSON.stringify(updatedOrders));

        window.dispatchEvent(new Event("storage"));
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
                const matchedSeller = sellers.find(sel => sel.id === submission.seller_id);
                if (matchedSeller) {
                    const updatedSellers = sellers.map(sel => sel.id === submission.seller_id ? { ...sel, verified: true, kyc_status: "approved" } : sel);
                    localStorage.setItem(this.STORAGE_KEYS.SELLERS, JSON.stringify(updatedSellers));

                    // Trigger approval email
                    try {
                        fetch('/api/email', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                type: 'SELLER_APPROVED',
                                payload: {
                                    name: matchedSeller.business_name,
                                    storeUrl: matchedSeller.store_url || matchedSeller.id
                                }
                            })
                        });
                    } catch (e) { }
                }
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

    // ─── Support Messages (Admin Inbox) ─────────────────
    getSupportMessages(): SupportMessage[] {
        if (typeof window === "undefined") return [];
        return JSON.parse(localStorage.getItem(this.STORAGE_KEYS.SUPPORT_MESSAGES) || "[]");
    }

    addSupportMessage(msg: Omit<SupportMessage, "id" | "created_at" | "status">) {
        const messages = this.getSupportMessages();
        const newMsg: SupportMessage = {
            ...msg,
            id: `SUP-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            status: "new",
            created_at: new Date().toISOString(),
        };
        messages.unshift(newMsg);
        localStorage.setItem(this.STORAGE_KEYS.SUPPORT_MESSAGES, JSON.stringify(messages));
        window.dispatchEvent(new Event("storage"));
        return newMsg;
    }

    updateSupportMessageStatus(id: string, status: SupportMessage["status"]) {
        const messages = this.getSupportMessages();
        const updated = messages.map(m => m.id === id ? { ...m, status } : m);
        localStorage.setItem(this.STORAGE_KEYS.SUPPORT_MESSAGES, JSON.stringify(updated));
        window.dispatchEvent(new Event("storage"));
    }

    // ─── Escrow Management ──────────────────────────────
    getEscrowOrders(): Order[] {
        const orders = this.getOrders();
        return orders.filter(o => o.escrow_status !== "released" && o.escrow_status !== "refunded");
    }

    sellerConfirmDelivery(orderId: string) {
        const orders = this.getOrders();
        const updated = orders.map(o => o.id === orderId ? {
            ...o,
            escrow_status: "seller_confirmed" as const,
            seller_confirmed_at: new Date().toISOString(),
            status: "delivered" as const,
        } : o);
        localStorage.setItem(this.STORAGE_KEYS.ORDERS, JSON.stringify(updated));
        window.dispatchEvent(new Event("storage"));
    }

    buyerConfirmReceipt(orderId: string) {
        const orders = this.getOrders();
        const updated = orders.map(o => o.id === orderId ? {
            ...o,
            escrow_status: "buyer_confirmed" as const,
            buyer_confirmed_at: new Date().toISOString(),
        } : o);
        localStorage.setItem(this.STORAGE_KEYS.ORDERS, JSON.stringify(updated));
        window.dispatchEvent(new Event("storage"));
    }

    releaseEscrow(orderId: string) {
        const orders = this.getOrders();
        const order = orders.find(o => o.id === orderId);

        const updated = orders.map(o => o.id === orderId ? {
            ...o,
            escrow_status: "released" as const,
            escrow_released_at: new Date().toISOString(),
        } : o);
        localStorage.setItem(this.STORAGE_KEYS.ORDERS, JSON.stringify(updated));

        if (order) {
            // Prompt buyer to leave a review
            this.addNotification({
                userId: order.customer_id,
                type: "system",
                message: `Funds for ${order.product?.name || 'your order'} have been released. Please leave a review!`,
                link: `/product/${order.product_id}?review=true`,
            });
            // Update stats & trigger storage event
            this.updateOrderEscrow(orderId, "released");
        }
        window.dispatchEvent(new Event("storage"));
    }

    /** Check if order is eligible for auto-release (3+ days since seller confirmed, no dispute) */
    checkAutoReleaseEligible(order: Order): boolean {
        if (order.escrow_status !== "seller_confirmed" || !order.seller_confirmed_at) return false;
        const daysSinceConfirm = (Date.now() - new Date(order.seller_confirmed_at).getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceConfirm >= 3;
    }
    // ─── Dispute Management ─────────────────────────────
    getDisputes(): Dispute[] {
        return JSON.parse(localStorage.getItem(this.STORAGE_KEYS.DISPUTES) || "[]");
    }

    raiseDispute(orderId: string, buyerId: string, buyerName: string, buyerEmail: string, reason: DisputeReason, description: string): Dispute {
        const orders = this.getOrders();
        const order = orders.find(o => o.id === orderId);
        if (!order) throw new Error("Order not found");

        const sellers = this.getSellers();
        const seller = sellers.find(s => s.id === order.seller_id);

        const dispute: Dispute = {
            id: `disp_${Date.now()}`,
            order_id: orderId,
            buyer_id: buyerId,
            buyer_name: buyerName,
            buyer_email: buyerEmail,
            seller_id: order.seller_id,
            seller_name: seller?.business_name || order.seller_name || "Unknown Seller",
            product_name: order.product?.name || `Product ${order.product_id}`,
            amount: order.amount,
            reason,
            description,
            status: "open",
            created_at: new Date().toISOString(),
        };

        // Save dispute
        const disputes = this.getDisputes();
        disputes.unshift(dispute);
        localStorage.setItem(this.STORAGE_KEYS.DISPUTES, JSON.stringify(disputes));

        // Mark order as disputed
        const updated = orders.map(o => o.id === orderId ? { ...o, escrow_status: "disputed" as const } : o);
        localStorage.setItem(this.STORAGE_KEYS.ORDERS, JSON.stringify(updated));

        // Create admin notification message
        this.addSupportMessage({
            user_name: buyerName,
            user_email: buyerEmail,
            subject: `Dispute Filed: ${reason.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}`,
            message: `Buyer ${buyerName} raised a dispute on order #${orderId}. Reason: ${reason.replace(/_/g, " ")}. Description: ${description}`,
            source: "order_issue",
            order_id: orderId,
        });

        window.dispatchEvent(new Event("storage"));
        return dispute;
    }

    resolveDispute(disputeId: string, resolution: "resolved_refund" | "resolved_release", adminNotes?: string) {
        const disputes = this.getDisputes();
        const dispute = disputes.find(d => d.id === disputeId);
        if (!dispute) return;

        const updatedDisputes = disputes.map(d => d.id === disputeId ? {
            ...d,
            status: resolution,
            resolved_at: new Date().toISOString(),
            admin_notes: adminNotes || "",
        } : d);
        localStorage.setItem(this.STORAGE_KEYS.DISPUTES, JSON.stringify(updatedDisputes));

        // Update order escrow status
        const orders = this.getOrders();
        const newEscrowStatus = resolution === "resolved_refund" ? "refunded" as const : "released" as const;
        const updatedOrders = orders.map(o => o.id === dispute.order_id ? {
            ...o,
            escrow_status: newEscrowStatus,
            escrow_released_at: new Date().toISOString(),
        } : o);
        localStorage.setItem(this.STORAGE_KEYS.ORDERS, JSON.stringify(updatedOrders));

        window.dispatchEvent(new Event("storage"));
    }

    updateDisputeStatus(disputeId: string, status: Dispute["status"], adminNotes?: string) {
        const disputes = this.getDisputes();
        const updated = disputes.map(d => d.id === disputeId ? {
            ...d,
            status,
            admin_notes: adminNotes || d.admin_notes,
            ...(status.startsWith("resolved") ? { resolved_at: new Date().toISOString() } : {}),
        } : d);
        localStorage.setItem(this.STORAGE_KEYS.DISPUTES, JSON.stringify(updated));
        window.dispatchEvent(new Event("storage"));
    }

    getDisputeByOrderId(orderId: string): Dispute | undefined {
        return this.getDisputes().find(d => d.order_id === orderId);
    }

    /** Buyer-side dispute resolution: mark the dispute as resolved and release escrow */
    buyerResolveDispute(disputeId: string) {
        const disputes = this.getDisputes();
        const dispute = disputes.find(d => d.id === disputeId);
        if (!dispute) return;

        const updatedDisputes = disputes.map(d => d.id === disputeId ? {
            ...d,
            status: "resolved_release" as const,
            resolved_at: new Date().toISOString(),
            admin_notes: "Resolved by buyer",
        } : d);
        localStorage.setItem(this.STORAGE_KEYS.DISPUTES, JSON.stringify(updatedDisputes));

        // Release escrow
        const orders = this.getOrders();
        const updatedOrders = orders.map(o => o.id === dispute.order_id ? {
            ...o,
            escrow_status: "released" as const,
            escrow_released_at: new Date().toISOString(),
        } : o);
        localStorage.setItem(this.STORAGE_KEYS.ORDERS, JSON.stringify(updatedOrders));

        window.dispatchEvent(new Event("storage"));
        window.dispatchEvent(new Event("demo-store-update"));
    }

    getAdminMessagesForUser(userEmail: string): SupportMessage[] {
        return this.getSupportMessages().filter(m =>
            m.source === "dispute_admin" && m.target_user_email === userEmail
        );
    }

    getAdminMessagesForOrder(orderId: string): SupportMessage[] {
        return this.getSupportMessages().filter(m => m.order_id === orderId);
    }

    // ─── Broadcast Messaging ────────────────────────────
    sendBroadcastMessage(customerIds: string[], messageText: string) {
        const sellerId = this.getCurrentSellerId();
        const seller = sellerId ? this.getSellers().find(s => s.id === sellerId) : null;

        customerIds.forEach(customerId => {
            // Give them a notification in their dashboard
            this.addNotification({
                userId: customerId,
                type: "promo",
                message: `${seller ? seller.business_name : 'A store you follow'} sent you a message: ${messageText}`,
                link: `/account/messages` // A real app might deep link to a specific chat context
            });

            // Note: In a complete production system, we might also seed a direct MessageThread array
            // so it populates in the Buyer's Inbox.
        });

        window.dispatchEvent(new Event("storage"));
        window.dispatchEvent(new Event("demo-store-update"));
    }

    // ─── Coupon System ──────────────────────────────────────
    getCoupons(userId?: string): Coupon[] {
        if (typeof window === "undefined") return [];
        const stored = localStorage.getItem(this.STORAGE_KEYS.COUPONS);
        const all: Coupon[] = stored ? JSON.parse(stored) : [];
        if (!userId) return all;
        return all.filter(c => c.userId === userId);
    }

    getActiveCoupons(userId: string): Coupon[] {
        const now = new Date().toISOString();
        return this.getCoupons(userId).filter(
            c => !c.isUsed && !c.revokedAt && c.expiresAt > now
        );
    }

    addCoupon(coupon: Omit<Coupon, "id" | "code" | "createdAt" | "isUsed">): Coupon {
        const all = this.getCoupons();
        const newCoupon: Coupon = {
            ...coupon,
            id: `cpn_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            code: `FP-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
            isUsed: false,
            createdAt: new Date().toISOString(),
        };
        all.unshift(newCoupon);
        localStorage.setItem(this.STORAGE_KEYS.COUPONS, JSON.stringify(all));

        // Notify user
        this.addNotification({
            userId: coupon.userId,
            type: "system",
            message: `You received a ₦${coupon.amount.toLocaleString()} coupon! Code: ${newCoupon.code}. ${coupon.reason}`,
            link: "/account/coupons",
        });

        window.dispatchEvent(new Event("storage"));
        return newCoupon;
    }

    useCoupon(code: string, userId: string): { success: boolean; coupon?: Coupon; error?: string } {
        const all = this.getCoupons();
        const now = new Date().toISOString();
        const coupon = all.find(c => c.code === code && c.userId === userId);

        if (!coupon) return { success: false, error: "Invalid coupon code" };
        if (coupon.isUsed) return { success: false, error: "Coupon already used" };
        if (coupon.revokedAt) return { success: false, error: "Coupon has been revoked" };
        if (coupon.expiresAt < now) return { success: false, error: "Coupon has expired" };

        const updated = all.map(c =>
            c.id === coupon.id ? { ...c, isUsed: true, usedAt: now } : c
        );
        localStorage.setItem(this.STORAGE_KEYS.COUPONS, JSON.stringify(updated));
        window.dispatchEvent(new Event("storage"));
        return { success: true, coupon };
    }

    revokeCoupon(id: string) {
        const all = this.getCoupons();
        const updated = all.map(c =>
            c.id === id ? { ...c, revokedAt: new Date().toISOString() } : c
        );
        localStorage.setItem(this.STORAGE_KEYS.COUPONS, JSON.stringify(updated));
        window.dispatchEvent(new Event("storage"));
    }

    // ─── Referral System ────────────────────────────────────
    getReferrals(referrerCode?: string): any[] {
        if (typeof window === "undefined") return [];
        const stored = localStorage.getItem(this.STORAGE_KEYS.REFERRALS);
        const all = stored ? JSON.parse(stored) : [];
        if (!referrerCode) return all;
        return all.filter((r: any) => r.referrerCode === referrerCode);
    }

    addReferral(referrerCode: string, referredUserId: string) {
        const all = this.getReferrals();
        all.unshift({
            id: `ref_${Date.now()}`,
            referrerCode,
            referredUserId,
            orderAmount: 0,
            couponIssued: false,
            createdAt: new Date().toISOString(),
        });
        localStorage.setItem(this.STORAGE_KEYS.REFERRALS, JSON.stringify(all));
    }

    /** Called after successful order payment to issue referral coupon */
    processReferralReward(referredUserId: string, orderAmount: number) {
        const allReferrals = this.getReferrals();
        const ref = allReferrals.find((r: any) => r.referredUserId === referredUserId && !r.couponIssued);
        if (!ref) return;

        // Tiered reward
        let rewardAmount = 1000; // Default ₦1,000
        if (orderAmount >= 500000) rewardAmount = 5000;
        else if (orderAmount >= 150000) rewardAmount = 3000;

        // Find referrer user by code
        const users = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("fp_user") || "null") : null;
        // For demo, we store referrer code → userId mapping in the referral itself
        // Issue coupon to the referrer
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days
        this.addCoupon({
            amount: rewardAmount,
            userId: ref.referrerCode, // In demo, referrerCode doubles as userId
            issuedBy: "referral",
            reason: `Referral reward! Your friend spent ₦${orderAmount.toLocaleString()}.`,
            expiresAt,
        });

        // Mark referral as processed
        const updated = allReferrals.map((r: any) =>
            r.id === ref.id ? { ...r, couponIssued: true, orderAmount } : r
        );
        localStorage.setItem(this.STORAGE_KEYS.REFERRALS, JSON.stringify(updated));
    }

    // ─── Reviews ────────────────────────────────────────────
    getReviews(productId?: string): any[] {
        if (typeof window === "undefined") return [];
        const stored = localStorage.getItem(this.STORAGE_KEYS.REVIEWS);
        const all = stored ? JSON.parse(stored) : [];
        if (!productId) return all;
        return all.filter((r: any) => r.product_id === productId);
    }

    addReview(review: Omit<any, "id" | "created_at">) {
        const all = this.getReviews();
        const newReview = {
            ...review,
            id: `rev_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            created_at: new Date().toISOString(),
        };
        all.unshift(newReview);
        localStorage.setItem(this.STORAGE_KEYS.REVIEWS, JSON.stringify(all));

        // Update product average rating
        const products = this.getProducts();
        const product = products.find(p => p.id === review.product_id);
        if (product) {
            const productReviews = all.filter((r: any) => r.product_id === review.product_id);
            const totalRating = productReviews.reduce((sum, r) => sum + r.rating, 0);
            const avgRating = totalRating / productReviews.length;
            this.updateProduct(product.id, {
                avg_rating: Number(avgRating.toFixed(1)),
                review_count: productReviews.length,
            });
        }

        window.dispatchEvent(new Event("storage"));
        window.dispatchEvent(new Event("demo-store-update"));
        return newReview;
    }

    deleteReview(id: string) {
        const all = this.getReviews();
        const reviewToDelete = all.find(r => r.id === id);
        if (!reviewToDelete) return;

        const updated = all.filter(r => r.id !== id);
        localStorage.setItem(this.STORAGE_KEYS.REVIEWS, JSON.stringify(updated));

        // Update product average rating
        const products = this.getProducts();
        const product = products.find(p => p.id === reviewToDelete.product_id);
        if (product) {
            const productReviews = updated.filter((r: any) => r.product_id === reviewToDelete.product_id);
            const totalRating = productReviews.reduce((sum, r) => sum + r.rating, 0);
            const avgRating = productReviews.length > 0 ? totalRating / productReviews.length : 0;
            this.updateProduct(product.id, {
                avg_rating: Number(avgRating.toFixed(1)),
                review_count: productReviews.length,
            });
        }

        window.dispatchEvent(new Event("storage"));
        window.dispatchEvent(new Event("demo-store-update"));
    }
}

export const DemoStore = DemoStoreService.getInstance();
