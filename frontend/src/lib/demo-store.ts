"use client";

import { NegotiationRequest, Order, Product, Seller, KYCSubmission, Complaint, Notification as AppNotification, SupportMessage, Dispute, DisputeReason, Coupon, ReturnRequest, Deal } from "./types";
// Lazy-import DEMO data as fallback when DB is offline
let _demoFallbackLoaded = false;
let _DEMO_PRODUCTS: any[] = [];
let _DEMO_SELLERS: any[] = [];
async function loadDemoFallbacks() {
    if (_demoFallbackLoaded) return;
    try {
        const m = await import("@/lib/data");
        _DEMO_PRODUCTS = m.DEMO_PRODUCTS || [];
        _DEMO_SELLERS = m.DEMO_SELLERS || [];
        _demoFallbackLoaded = true;
    } catch { /* ignore */ }
}
import { resilientFetch } from "./offline-queue";

export interface Category {
    id: string;
    name: string;
    slug: string;
    product_count: number;
    children: Category[];
    expanded?: boolean;
}

export const INITIAL_CATEGORIES: Category[] = [
    {
        id: "cat_1", name: "Electronics", slug: "electronics", product_count: 42, children: [
            { id: "cat_1_1", name: "Smartphones", slug: "smartphones", product_count: 15, children: [] },
            { id: "cat_1_2", name: "Laptops", slug: "laptops", product_count: 12, children: [] },
            { id: "cat_1_3", name: "Audio & Headphones", slug: "audio-headphones", product_count: 8, children: [] },
            { id: "cat_1_4", name: "Wearables", slug: "wearables", product_count: 7, children: [] },
        ]
    },
    {
        id: "cat_2", name: "Fashion", slug: "fashion", product_count: 38, children: [
            { id: "cat_2_1", name: "Men's Clothing", slug: "mens-clothing", product_count: 14, children: [] },
            { id: "cat_2_2", name: "Women's Clothing", slug: "womens-clothing", product_count: 16, children: [] },
            { id: "cat_2_3", name: "Shoes & Sneakers", slug: "shoes-sneakers", product_count: 8, children: [] },
        ]
    },
    {
        id: "cat_3", name: "Home & Living", slug: "home-living", product_count: 25, children: [
            { id: "cat_3_1", name: "Kitchen", slug: "kitchen", product_count: 10, children: [] },
            { id: "cat_3_2", name: "Decor", slug: "decor", product_count: 8, children: [] },
            { id: "cat_3_3", name: "Bedding", slug: "bedding", product_count: 7, children: [] },
        ]
    },
    {
        id: "cat_4", name: "Beauty & Health", slug: "beauty-health", product_count: 20, children: [
            { id: "cat_4_1", name: "Skincare", slug: "skincare", product_count: 12, children: [] },
            { id: "cat_4_2", name: "Haircare", slug: "haircare", product_count: 8, children: [] },
        ]
    },
    {
        id: "cat_5", name: "Gaming", slug: "gaming", product_count: 15, children: [
            { id: "cat_5_1", name: "Consoles", slug: "consoles", product_count: 5, children: [] },
            { id: "cat_5_2", name: "Accessories", slug: "gaming-accessories", product_count: 10, children: [] },
        ]
    },
];

class DemoStoreService {
    private static instance: DemoStoreService;
    // Track product IDs with local edits not yet confirmed by DB
    private _pendingEdits: Set<string> = new Set();
    private readonly _PENDING_KEY = "fp_pending_product_edits";
    // Track seller IDs with local edits (KYC approve/reject) not yet confirmed by DB
    private _pendingSellerEdits: Set<string> = new Set();
    private readonly _PENDING_SELLER_KEY = "fp_pending_seller_edits";
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
        USER_OVERRIDES: "fp_user_overrides",
        SEARCH_CACHE: "fairprice_search_cache",
        CONVERSATIONS: "fp_conversations",
        CHAT_MESSAGES: "fp_chat_messages",
        CATEGORIES: "fairprice_demo_categories",
        TRENDING_CURATION: "fp_trending_ids",
        DEALS: "fairprice_demo_deals",
        PROMOTIONS: "fairprice_demo_promotions",
        AD_CREDITS: "fairprice_demo_ad_credits",
    };

    private get PROMO_KEY() {
        return this.STORAGE_KEYS.PROMOTIONS;
    }

    private constructor() {
        if (typeof window !== "undefined") {
            this.init();
            // Restore pending edits from previous session
            try {
                const saved = localStorage.getItem(this._PENDING_KEY);
                if (saved) this._pendingEdits = new Set(JSON.parse(saved));
                const savedSellers = localStorage.getItem(this._PENDING_SELLER_KEY);
                if (savedSellers) this._pendingSellerEdits = new Set(JSON.parse(savedSellers));
            } catch { /* ignore */ }
            this.syncWithDB();
            this.startRealtimeSync();
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
        // v10: LIVE-DB-ONLY — all mock/demo data removed, everything from Neon Postgres
        const DATA_VERSION = "11";
        const currentVersion = localStorage.getItem("fairprice_data_version");

        if (currentVersion !== DATA_VERSION) {
            // Clear all stale data and re-seed with latest
            Object.values(this.STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
            localStorage.setItem("fairprice_data_version", DATA_VERSION);
        }

        if (!localStorage.getItem(this.STORAGE_KEYS.NEGOTIATIONS)) {
            localStorage.setItem(this.STORAGE_KEYS.NEGOTIATIONS, "[]");
        }
        if (!localStorage.getItem(this.STORAGE_KEYS.ORDERS)) {
            localStorage.setItem(this.STORAGE_KEYS.ORDERS, "[]");
        }
        // NOTE: Products & Sellers are NO LONGER seeded from hardcoded constants.
        // They will be populated exclusively by syncWithDB() from the Neon database.
        // This ensures all users see the same prices regardless of browser/session.
        if (!localStorage.getItem(this.STORAGE_KEYS.KYC)) {
            localStorage.setItem(this.STORAGE_KEYS.KYC, "[]");
        }
        if (!localStorage.getItem(this.STORAGE_KEYS.COMPLAINTS)) {
            localStorage.setItem(this.STORAGE_KEYS.COMPLAINTS, "[]");
        }
        if (!localStorage.getItem(this.STORAGE_KEYS.PAYOUTS)) {
            localStorage.setItem(this.STORAGE_KEYS.PAYOUTS, "[]");
        }
        if (!localStorage.getItem(this.STORAGE_KEYS.RETURNS)) {
            localStorage.setItem(this.STORAGE_KEYS.RETURNS, "[]");
        }
        if (!localStorage.getItem(this.STORAGE_KEYS.CATEGORIES)) {
            localStorage.setItem(this.STORAGE_KEYS.CATEGORIES, JSON.stringify(INITIAL_CATEGORIES));
        }
        if (!localStorage.getItem(this.STORAGE_KEYS.DEALS)) {
            // Lazy load DEMO_DEALS to avoid circular dependencies during initialization
            import("@/lib/data").then(m => {
                if (!localStorage.getItem(this.STORAGE_KEYS.DEALS)) {
                    localStorage.setItem(this.STORAGE_KEYS.DEALS, JSON.stringify(m.DEMO_DEALS || []));
                }
            }).catch(console.error);
        }
        if (!localStorage.getItem(this.STORAGE_KEYS.PROMOTIONS)) {
            localStorage.setItem(this.STORAGE_KEYS.PROMOTIONS, "[]");
        }
        if (!localStorage.getItem(this.STORAGE_KEYS.AD_CREDITS)) {
            localStorage.setItem(this.STORAGE_KEYS.AD_CREDITS, "{}");
        }
    }

    private startRealtimeSync() {
        if (typeof window === "undefined") return;

        const eventSource = new EventSource("/api/realtime");

        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log("Real-time update received:", data);

                // On any change, trigger a sync to refresh localStorage
                this.syncWithDB();

                // If it's a specific user update, we could also trigger an auth update event 
                // but AuthContext should ideally handle its own sync or listen to storage events.
            } catch (e) {
                console.warn("Failed to parse real-time event:", e);
            }
        };

        eventSource.onerror = (error) => {
            // EventSource will automatically retry connecting. 
            // Silencing this error as the realtime API is optional and may not be running in all environments.
            return;
        };
    }

    private async syncWithDB() {
        if (typeof window === "undefined") return;

        try {
            // 🚀 PARALLEL FETCH: Fire all four requests simultaneously for fast sync
            const [productsResult, sellersResult, searchCacheResult, ordersResult] = await Promise.allSettled([
                fetch("/api/products?all=true"),
                fetch("/api/sellers?all=true"),
                fetch("/api/search-cache"),
                fetch("/api/orders?all=true"),
            ]);

            // ── Process Products ──
            if (productsResult.status === "fulfilled" && productsResult.value.ok) {
                const dbProducts = await productsResult.value.json();
                if (dbProducts.length > 0) {
                    const localProducts: any[] = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.PRODUCTS) || '[]');
                    const dbMap = new Map(dbProducts.map((p: any) => [p.id, p]));
                    const localMap = new Map(localProducts.map((p: any) => [p.id, p]));
                    const merged = new Map(dbMap);

                    for (const pendingId of this._pendingEdits) {
                        const localVersion = localMap.get(pendingId);
                        if (localVersion) {
                            merged.set(pendingId, localVersion);
                        }
                    }
                    for (const [id, product] of localMap) {
                        if (!dbMap.has(id)) merged.set(id, product);
                    }

                    localStorage.setItem(this.STORAGE_KEYS.PRODUCTS, JSON.stringify(Array.from(merged.values())));
                }
            }

            // ── Process Sellers (merge with pending local edits like KYC approvals) ──
            if (sellersResult.status === "fulfilled" && sellersResult.value.ok) {
                const dbSellers = await sellersResult.value.json();
                if (dbSellers.length > 0) {
                    const localSellers: any[] = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.SELLERS) || '[]');
                    const dbMap = new Map<string, any>(dbSellers.map((s: any) => [s.id, s]));
                    const localMap = new Map(localSellers.map((s: any) => [s.id, s]));

                    // Start from DB data but preserve local-only fields that the API doesn't track
                    const LOCAL_ONLY_FIELDS = ['subscription_plan', 'plan_expiry_date', 'bank_name', 'account_number', 'account_name', 'payout_history'];
                    const merged = new Map<string, any>();

                    for (const [id, dbSeller] of dbMap) {
                        const localVersion = localMap.get(id);
                        if (localVersion) {
                            // Merge: DB data wins, but preserve local-only fields if DB doesn't have them
                            const mergedSeller = { ...localVersion, ...(dbSeller as any) };
                            for (const field of LOCAL_ONLY_FIELDS) {
                                if (localVersion[field] !== undefined && (dbSeller[field] === undefined || dbSeller[field] === null)) {
                                    mergedSeller[field] = localVersion[field];
                                }
                            }
                            merged.set(id, mergedSeller);
                        } else {
                            merged.set(id, dbSeller);
                        }
                    }

                    // Preserve local versions of sellers with pending edits (e.g. KYC approvals)
                    for (const pendingSellerId of this._pendingSellerEdits) {
                        const localVersion = localMap.get(pendingSellerId);
                        if (localVersion) {
                            merged.set(pendingSellerId, localVersion);
                        }
                    }
                    // Keep locally-added sellers that don't exist in DB yet
                    for (const [id, seller] of localMap) {
                        if (!dbMap.has(id)) merged.set(id, seller);
                    }

                    localStorage.setItem(this.STORAGE_KEYS.SELLERS, JSON.stringify(Array.from(merged.values())));

                    const storedSellerId = this.getCurrentSellerId();
                    if (storedSellerId && !merged.has(storedSellerId)) {
                        const currentUser = this._getCurrentUserId();
                        if (currentUser) {
                            const match = dbSellers.find((s: any) => s.user_id === currentUser);
                            if (match) {
                                localStorage.setItem(this.STORAGE_KEYS.CURRENT_SELLER, match.id);
                            }
                        }
                    }
                }
            }

            // ── Process Orders (merge DB orders with local orders) ──
            if (ordersResult.status === "fulfilled" && ordersResult.value.ok) {
                const ordersData = await ordersResult.value.json();
                const dbOrders: any[] = ordersData.orders || ordersData || [];
                if (dbOrders.length > 0) {
                    const localOrders: any[] = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.ORDERS) || '[]');
                    const localMap = new Map(localOrders.map((o: any) => [o.id, o]));

                    // Add DB orders that don't exist locally
                    for (const dbOrder of dbOrders) {
                        const mapped = {
                            id: dbOrder.id,
                            customer_id: dbOrder.customerId || dbOrder.customer_id,
                            product_id: dbOrder.productId || dbOrder.product_id,
                            seller_id: dbOrder.sellerId || dbOrder.seller_id,
                            amount: dbOrder.amount,
                            status: dbOrder.status || 'pending',
                            escrow_status: dbOrder.escrowStatus || dbOrder.escrow_status || 'held',
                            shipping_address: dbOrder.shippingAddress || dbOrder.shipping_address || '',
                            created_at: dbOrder.createdAt || dbOrder.created_at || new Date().toISOString(),
                            updated_at: dbOrder.updatedAt || dbOrder.updated_at || new Date().toISOString(),
                            customer_name: dbOrder.customerName || dbOrder.customer_name,
                            seller_name: dbOrder.sellerName || dbOrder.seller_name,
                            product: dbOrder.product ? {
                                id: dbOrder.product.id,
                                name: dbOrder.product.name,
                                price: dbOrder.product.price,
                                image_url: dbOrder.product.imageUrl || dbOrder.product.image_url,
                                seller_id: dbOrder.product.sellerId || dbOrder.product.seller_id,
                                seller_name: dbOrder.product.sellerName || dbOrder.product.seller_name,
                                category: dbOrder.product.category,
                            } : undefined,
                        };
                        if (!localMap.has(mapped.id)) {
                            localMap.set(mapped.id, mapped);
                        }
                    }
                    localStorage.setItem(this.STORAGE_KEYS.ORDERS, JSON.stringify(Array.from(localMap.values())));
                }
            }

            // ── Process Search Cache ──
            if (searchCacheResult.status === "fulfilled" && searchCacheResult.value.ok) {
                const dbSearchCache = await searchCacheResult.value.json();
                if (Object.keys(dbSearchCache).length > 0) {
                    localStorage.setItem(this.STORAGE_KEYS.SEARCH_CACHE, JSON.stringify(dbSearchCache));
                }
            }

            // Trigger update events so React components re-render with live data
            window.dispatchEvent(new Event("storage"));
            window.dispatchEvent(new Event("demo-store-update"));
        } catch (error) {
            console.warn("Database sync failed quietly:", (error as Error).message || "Network issue");
        }

        // ── Fallback: if localStorage is still empty after sync, seed with DEMO data ──
        const hasProducts = (localStorage.getItem(this.STORAGE_KEYS.PRODUCTS) || '[]') !== '[]';
        const hasSellers = (localStorage.getItem(this.STORAGE_KEYS.SELLERS) || '[]') !== '[]';
        if (!hasProducts || !hasSellers) {
            await loadDemoFallbacks();
            if (!hasProducts && _DEMO_PRODUCTS.length > 0) {
                localStorage.setItem(this.STORAGE_KEYS.PRODUCTS, JSON.stringify(_DEMO_PRODUCTS));
            }
            if (!hasSellers && _DEMO_SELLERS.length > 0) {
                localStorage.setItem(this.STORAGE_KEYS.SELLERS, JSON.stringify(_DEMO_SELLERS));
            }
            window.dispatchEvent(new Event("storage"));
            window.dispatchEvent(new Event("demo-store-update"));
        }
    }

    // --- Gamification Support ---
    getUserTier(userId: string): { name: string, color: string, discount: number } {
        const negotiations = this.getNegotiations(undefined, userId);
        const wins = negotiations.filter(n => n.status === "accepted").length;
        
        if (wins >= 5) return { name: "Gold Negotiator", color: "text-amber-500 bg-amber-50 border-amber-200", discount: 50 };
        if (wins >= 2) return { name: "Silver Deal-Maker", color: "text-gray-500 bg-gray-50 border-gray-200", discount: 20 };
        return { name: "Bronze Haggler", color: "text-amber-700 bg-amber-50 border-amber-200/50", discount: 0 };
    }

    // Missed Deal Follow-up
    simulateWhatsAppFollowups() {
        const negotiations = this.getNegotiations();
        const products = this.getProducts();
        let followupsSent = 0;
        
        negotiations.forEach(neg => {
            // Find an open or pending negotiation that hasn't resulted in a purchase
            if ((neg.status === "pending" || (neg.status === "accepted" && !neg.purchased)) && neg.customer_name) {
                const product = products.find(p => p.id === neg.product_id);
                if (product) {
                    const discountPercent = 5; // The script mentions a 5% drop
                    
                    fetch("/api/marketing/whatsapp", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            name: neg.customer_name,
                            productName: product.name,
                            discountPercent,
                            link: `https://fairprice.ng/account/negotiations`
                        })
                    }).catch(() => {});
                    
                    followupsSent++;
                }
            }
        });
        
        return followupsSent;
    }

    // --- Categories ---
    getCategories(): Category[] {
        if (typeof window === "undefined") return INITIAL_CATEGORIES;
        const stored = localStorage.getItem(this.STORAGE_KEYS.CATEGORIES);
        return stored ? JSON.parse(stored) : INITIAL_CATEGORIES;
    }

    setCategories(categories: Category[]) {
        localStorage.setItem(this.STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
        window.dispatchEvent(new Event("demo-store-update"));
        window.dispatchEvent(new Event("storage"));
    }

    ensureCategoryExists(categoryName: string, subCategoryName?: string) {
        if (!categoryName) return;

        const categories = this.getCategories();
        let catIndex = categories.findIndex(c => c.name.toLowerCase() === categoryName.toLowerCase());

        // Auto-create category if doesn't exist
        if (catIndex === -1) {
            const newCat: Category = {
                id: `cat_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                name: categoryName,
                slug: categoryName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
                product_count: 1, // Start with 1 since we are ensuring it for a new/edited product
                children: []
            };
            categories.push(newCat);
            catIndex = categories.length - 1;
        }

        // Auto-create subcategory if doesn't exist AND is provided
        if (subCategoryName) {
            const parent = categories[catIndex];
            const subIndex = parent.children.findIndex(c => c.name.toLowerCase() === subCategoryName.toLowerCase());

            if (subIndex === -1) {
                parent.children.push({
                    id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                    name: subCategoryName,
                    slug: subCategoryName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
                    product_count: 1,
                    children: []
                });
            } else {
                // Increment subcategory count
                parent.children[subIndex].product_count += 1;
            }
        }

        // Increment top-level category count (we assume this is called per new product insertion)
        // If the category was just created, it already has product_count=1.
        // If it existing, we increment it. However, if wait, ensureCategory is called when?
        // Let's just create them if they don't exist. Product counting might drift, so we'll recalculate stats on the Category page.

        this.setCategories(categories);
    }

    // --- Negotiations ---
    getNegotiations(sellerId?: string, buyerId?: string): NegotiationRequest[] {
        if (typeof window === "undefined") return [];
        const all = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.NEGOTIATIONS) || "[]");
        
        let filtered = all;
        
        if (sellerId) {
            const products = this.getProducts();
            filtered = filtered.filter((n: NegotiationRequest) => {
                const product = products.find(p => p.id === n.product_id);
                return product?.seller_id === sellerId || (n as any).seller_id === sellerId;
            });
        }
        
        if (buyerId) {
            filtered = filtered.filter((n: NegotiationRequest) => n.customer_id === buyerId || ((n as any).customer_email && (n as any).customer_email === buyerId));
        }

        return filtered;
    }

    addNegotiation(request: NegotiationRequest) {
        const current = this.getNegotiations();
        const updated = [request, ...current];
        localStorage.setItem(this.STORAGE_KEYS.NEGOTIATIONS, JSON.stringify(updated));

        // Persist to Postgres (queued if offline)
        resilientFetch("/api/negotiations", { method: "POST", body: request, type: "general" });

        const product = this.getProducts({ includeInactiveSellers: true }).find(p => p.id === request.product_id);

        // Notify Buyer — confirmation that negotiation was sent
        this.addNotification({
            userId: request.customer_id,
            type: "negotiation",
            message: `✅ Your negotiation for "${product?.name || 'Product'}" at ₦${request.proposed_price.toLocaleString()} has been sent! You'll be notified when the seller responds.`,
            link: "/account/negotiations"
        });

        // Notify Seller
        if (product && product.seller_id) {
            const seller = this.getSellers().find(s => s.id === product.seller_id || s.user_id === product.seller_id);
            const sellerEmail = seller?.owner_email || this.getUser(product.seller_id)?.email || `seller_${product.seller_id}@fairprice.ng`;

            this.addNotification({
                userId: seller?.owner_email || product.seller_id,
                type: "negotiation",
                message: `💰 New negotiation offer for ${product.name} from ${request.customer_name}: ₦${request.proposed_price.toLocaleString()}`,
                link: "/seller/dashboard/messages"
            });

            // Email seller
            fetch("/api/email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    to: sellerEmail,
                    subject: `New Negotiation Offer: ${product.name}`,
                    type: "NEGOTIATION_REQUEST", 
                    payload: {
                        customerName: request.customer_name,
                        productName: product.name,
                        amount: `₦${request.proposed_price.toLocaleString()}`
                    }
                })
            }).catch(console.error);

            // Notify & email Admin
            this.addNotification({
                userId: "admin",
                type: "negotiation",
                message: `Negotiation: ${request.customer_name} offered ₦${request.proposed_price.toLocaleString()} for "${product.name}" (${seller?.business_name || 'Unknown Store'})`,
                link: "/admin/governance"
            });
            fetch("/api/email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    to: "techzema@gmail.com",
                    subject: `New Negotiation: ${product.name}`,
                    type: "security_alert",
                    data: { storeName: "FairPrice Admin", message: `${request.customer_name} offered ₦${request.proposed_price.toLocaleString()} for "${product.name}" from ${seller?.business_name || 'Unknown Store'}.` }
                })
            }).catch(() => {});
        }

        // Also trigger storage event for other tabs
        window.dispatchEvent(new Event("storage"));
        window.dispatchEvent(new Event("demo-store-update"));
    }

    updateNegotiationStatus(id: string, status: "accepted" | "rejected" | "purchased") {
        const current = this.getNegotiations();
        const negotiation = current.find(n => n.id === id);
        const updated = current.map(n => n.id === id ? { ...n, status } : n);
        localStorage.setItem(this.STORAGE_KEYS.NEGOTIATIONS, JSON.stringify(updated));

        if (negotiation && (status === "accepted" || status === "rejected")) {
            const product = this.getProducts().find(p => p.id === negotiation.product_id);
            if (product) {
                // Notify Buyer
                this.addNotification({
                    userId: negotiation.customer_id,
                    type: "negotiation",
                    message: `Your negotiation for ${product.name} was ${status}.`,
                    link: "/account/negotiations"
                });

                // Notify Seller
                this.addNotification({
                    userId: product.seller_id,
                    type: "negotiation",
                    message: `Negotiation for ${product.name} was ${status}.`,
                    link: "/seller/dashboard/messages"
                });

                const buyerUser = this.getUser(negotiation.customer_id);
                const buyerEmail = buyerUser?.email || `user_${negotiation.customer_id}@fairprice.ng`;
                fetch("/api/email", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        to: buyerEmail,
                        subject: `Negotiation ${status === 'accepted' ? 'Accepted' : 'Rejected'}: ${product.name}`,
                        type: status === 'accepted' ? "NEGOTIATION_ACCEPTED" : "NEGOTIATION_REJECTED", 
                        payload: {
                            customerName: "Buyer",
                            productName: product.name,
                            amount: `₦${negotiation.proposed_price.toLocaleString()}`
                        }
                    })
                }).catch(console.error);
            }
        }

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

        const product = this.getProducts().find(p => p.id === negotiation.product_id);

        // Notify Buyer (User)
        this.addNotification({
            userId: negotiation.customer_id,
            type: "negotiation",
            message: `Seller sent a counter offer of ₦${price.toLocaleString()} for ${product?.name || 'an item'}. Check your dashboard.`,
            link: "/account/negotiations"
        });

        const buyerUser = this.getUser(negotiation.customer_id);
        const buyerEmail = buyerUser?.email || `user_${negotiation.customer_id}@fairprice.ng`;
        fetch("/api/email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                to: buyerEmail,
                subject: `Counter Offer Received: ${product?.name || 'An Item'}`,
                type: "NEGOTIATION_REQUEST", 
                payload: {
                    customerName: negotiation.customer_name,
                    productName: product?.name || 'An Item',
                    amount: `₦${price.toLocaleString()}`
                }
            })
        }).catch(console.error);
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
        const exact = sellers.find(s => s.id === id);
        if (exact) return exact;

        // Fallback: the DB may have a different ID for this seller.
        // Try matching by user_id and auto-heal the stored key.
        const userId = this._getCurrentUserId();
        if (userId) {
            const byUser = sellers.find(s => s.user_id === userId);
            if (byUser) {
                // Auto-heal: update the stored seller ID to the canonical DB ID
                localStorage.setItem(this.STORAGE_KEYS.CURRENT_SELLER, byUser.id);
                return byUser;
            }
        }
        return undefined;
    }

    /** Helper: get the current logged-in user's ID from AuthContext storage */
    private _getCurrentUserId(): string | null {
        return this.getCurrentUserId();
    }

    getCurrentUser(): any | null {
        if (typeof window === "undefined") return null;
        try {
            const raw = localStorage.getItem("fp_user") || sessionStorage.getItem("fp_user");
            if (raw) {
                return JSON.parse(raw);
            }
        } catch { }
        return null;
    }

    getCurrentUserId(): string | null {
        const user = this.getCurrentUser();
        return user ? user.id : null;
    }

    logout() {
        localStorage.removeItem(this.STORAGE_KEYS.CURRENT_SELLER);
        localStorage.removeItem(this.STORAGE_KEYS.NEGOTIATIONS);
        localStorage.removeItem(this.STORAGE_KEYS.SUPPORT_MESSAGES);
        localStorage.removeItem(this.STORAGE_KEYS.ORDERS);
        localStorage.removeItem(this.STORAGE_KEYS.NOTIFICATIONS);
        localStorage.removeItem("fp_conversations");
        localStorage.removeItem("fp_chat_messages");
        window.dispatchEvent(new Event("storage"));
    }

    updateSeller(id: string, updates: Partial<Seller>) {
        const sellers = this.getSellers();
        const updatedSeller = sellers.find(s => s.id === id);
        if (!updatedSeller) return;

        const mergedSeller = { ...updatedSeller, ...updates };
        const updated = sellers.map(s => s.id === id ? mergedSeller : s);

        // Mark as pending BEFORE writing — protects from syncWithDB overwrite
        this._pendingSellerEdits.add(id);
        try { localStorage.setItem(this._PENDING_SELLER_KEY, JSON.stringify([...this._pendingSellerEdits])); } catch { /* quota */ }

        localStorage.setItem(this.STORAGE_KEYS.SELLERS, JSON.stringify(updated));
        window.dispatchEvent(new Event("storage"));
        window.dispatchEvent(new Event("demo-store-update"));

        // Persist to Postgres and clear pending on success
        fetch("/api/sellers", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(mergedSeller),
        }).then(res => {
            if (res.ok) {
                this._pendingSellerEdits.delete(id);
                try { localStorage.setItem(this._PENDING_SELLER_KEY, JSON.stringify([...this._pendingSellerEdits])); } catch { /* quota */ }
            }
        }).catch(() => {
            // Keep in pendingSellerEdits so syncWithDB doesn't overwrite
        });

        // Create generic notification for important status changes
        if (updates.status && updates.status !== updatedSeller.status) {
            this.addNotification({
                userId: id, // Route to seller inbox/dashboard
                type: "system",
                message: updates.status === "frozen" as any || updates.status === "banned" as any
                    ? "Your seller account has been temporarily suspended. Please respond to the admin enquiry."
                    : `Your seller account status has been updated to: ${updates.status}.`,
                link: "/seller/dashboard/messages"
            });
        }
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

    // --- Deals Management ---
    getDeals(): Deal[] {
        if (typeof window === "undefined") return [];
        return JSON.parse(localStorage.getItem(this.STORAGE_KEYS.DEALS) || "[]");
    }

    addDeal(deal: Omit<Deal, "id">) {
        if (typeof window === "undefined") return;
        const stored = localStorage.getItem(this.STORAGE_KEYS.DEALS);
        const current: Deal[] = stored ? JSON.parse(stored) : [];
        const newDeal: Deal = {
            ...deal,
            id: `deal_${Math.random().toString(36).substr(2, 9)}`,
            deal_priority: deal.deal_priority || 999 // Default to low priority
        };
        const updated = [newDeal, ...current];
        localStorage.setItem(this.STORAGE_KEYS.DEALS, JSON.stringify(updated));
        window.dispatchEvent(new Event("storage"));
        window.dispatchEvent(new Event("demo-store-update")); // Ensure global sync
    }

    removeDeal(dealId: string) {
        if (typeof window === "undefined") return;
        const stored = localStorage.getItem(this.STORAGE_KEYS.DEALS);
        if (!stored) return;
        const current: Deal[] = JSON.parse(stored);
        const updated = current.filter(d => d.id !== dealId);
        localStorage.setItem(this.STORAGE_KEYS.DEALS, JSON.stringify(updated));
        window.dispatchEvent(new Event("storage"));
    }
    
    updateDeal(dealId: string, updates: Partial<Deal>) {
        if (typeof window === "undefined") return;
        const stored = localStorage.getItem(this.STORAGE_KEYS.DEALS);
        if (!stored) return;
        const current: Deal[] = JSON.parse(stored);
        const updated = current.map(d => d.id === dealId ? { ...d, ...updates } : d);
        localStorage.setItem(this.STORAGE_KEYS.DEALS, JSON.stringify(updated));
        window.dispatchEvent(new Event("storage"));
    }

    // --- Getters ---
    getProducts(options?: { includeInactiveSellers?: boolean }): Product[] {
        if (typeof window === "undefined") return [];
        const stored = localStorage.getItem(this.STORAGE_KEYS.PRODUCTS);
        // Fallback to empty array if DB sync hasn't populated localStorage yet
        const allProducts: Product[] = stored ? JSON.parse(stored) : [];

        // Always map seller_name so 'My Store' defaults are overwritten by the true business name
        const allSellers = this.getSellers();
        const derivedProducts = allProducts.map((p: Product) => {
            const seller = allSellers.find(s => s.id === p.seller_id || s.user_id === p.seller_id);
            if (seller && (p.seller_name === "My Store" || !p.seller_name)) {
                return { ...p, seller_name: seller.business_name || seller.owner_name || "FairPrice Seller" };
            }
            return p;
        });

        if (options?.includeInactiveSellers) return derivedProducts;

        // By default, filter out products belonging to inactive/unverified sellers 
        // to prevent unapproved sellers from showing up in global search or catalogs.
        // Match against both seller.id AND seller.user_id to catch ghost-account mismatches.
        const activeSellerIds = new Set<string>();
        allSellers.filter(s => s.status === "active" || s.verified || s.kyc_status === "approved").forEach(s => {
            if (s.id) activeSellerIds.add(s.id);
            if (s.user_id) activeSellerIds.add(s.user_id);
        });

        return derivedProducts.filter((p: Product) => activeSellerIds.has(p.seller_id));
    }

    // ═══════════ Search Cache Layer ═══════════
    // Stores global search results separately from the main catalog.
    // Products stay here until a user clicks them (auto-promoted to catalog)
    // or an admin manually promotes/edits them.

    addToSearchCache(query: string, products: any[]) {
        if (typeof window === "undefined") return;
        const cache = this._getSearchCache();
        const normalizedQuery = query.toLowerCase().trim();
        const existing = cache[normalizedQuery] || [];
        // Merge: add new products, update existing ones
        products.forEach(p => {
            // Sanitize vertexaisearch image URLs
            if (p.image_url && (p.image_url.includes('vertexaisearch.cloud.google.com') || p.image_url.includes('grounding-api-redirect'))) {
                p.image_url = '/assets/images/placeholder.png';
            }
            const idx = existing.findIndex((e: any) => e.id === p.id);
            if (idx >= 0) {
                existing[idx] = { ...existing[idx], ...p, cached_at: existing[idx].cached_at };
            } else {
                existing.push({ ...p, cached_at: new Date().toISOString(), cache_query: normalizedQuery });
            }
        });

        cache[normalizedQuery] = existing;

        // Trim old entries if cache grows too large (keep last 50 queries)
        const keys = Object.keys(cache);
        if (keys.length > 50) {
            keys.slice(0, keys.length - 50).forEach(k => delete cache[k]);
        }

        try {
            localStorage.setItem(this.STORAGE_KEYS.SEARCH_CACHE, JSON.stringify(cache));

            // Persist to Postgres database for Admin visibility across devices
            fetch("/api/search-cache", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    query: normalizedQuery,
                    products: existing
                })
            }).catch(e => console.error("Failed to sync search cache to DB:", e));
        } catch { /* quota exceeded — trim harder */ }
    }

    // ═══════════ Admin Curation ═══════════
    // Used by admins to manually pin products to the "Trending" section.

    getTrendingIds(): string[] {
        if (typeof window === "undefined") return [];
        return this.getProducts().filter(p => p.is_trending).map(p => p.id);
    }

    async toggleTrending(productId: string): Promise<boolean> {
        const products = this.getProducts();
        const product = products.find(p => p.id === productId);
        let newStatus = false;

        // Optimistic UI Update
        if (product) {
            product.is_trending = !product.is_trending;
            newStatus = product.is_trending;
            window.dispatchEvent(new Event("demo-store-update"));
        }

        // DB Update
        try {
            const res = await fetch(`/api/products/${productId}/trending`, { method: "POST" });
            if (res.ok) {
                const data = await res.json();
                if (product) {
                    product.is_trending = data.isTrending;
                    newStatus = data.isTrending;
                    window.dispatchEvent(new Event("demo-store-update"));
                }
            } else {
                // Revert on failure
                if (product) {
                    product.is_trending = !newStatus;
                    window.dispatchEvent(new Event("demo-store-update"));
                }
            }
        } catch (error) {
            console.error("Failed to toggle trending", error);
            if (product) {
                product.is_trending = !newStatus;
                window.dispatchEvent(new Event("demo-store-update"));
            }
        }
        return newStatus;
    }

    /** Fuzzy match: find cached products across ALL queries that strictly match tokens */
    searchCacheFuzzyMatch(query: string): any[] {
        if (typeof window === "undefined") return [];
        const cache = this._getSearchCache();
        const tokens = query.toLowerCase().trim().split(/\s+/).filter(t => t.length > 1);

        // If query is empty or too short, don't show random cache items
        if (tokens.length === 0) return [];

        const results: any[] = [];
        const seenIds = new Set<string>();
        Object.values(cache).forEach((products: any[]) => {
            products.forEach(p => {
                if (seenIds.has(p.id)) return;
                const name = (p.name || '').toLowerCase();
                const category = (p.category || '').toLowerCase();

                // Ensure ALL typed words exist in either the product name or category
                const matchesAll = tokens.every(t => name.includes(t) || category.includes(t));

                if (matchesAll) {
                    results.push(p);
                    seenIds.add(p.id);
                }
            });
        });

        // Return max 4 most relevant (we'll sort them slightly by name length to prefer tighter matches)
        return results.sort((a, b) => (a.name?.length || 0) - (b.name?.length || 0)).slice(0, 4);
    }

    getAllSearchCache(): Record<string, any[]> {
        return this._getSearchCache();
    }

    /** Flat list of all cached products (for admin) */
    getAllCachedProducts(): any[] {
        const cache = this._getSearchCache();
        const seen = new Set<string>();
        const all: any[] = [];
        Object.values(cache).forEach((products: any[]) => {
            products.forEach(p => {
                if (!seen.has(p.id)) {
                    seen.add(p.id);
                    all.push(p);
                }
            });
        });
        return all;
    }

    /** Update a product in the search cache (admin edits) */
    updateSearchCacheProduct(productId: string, updates: Partial<any>) {
        if (typeof window === "undefined") return;
        const cache = this._getSearchCache();
        Object.keys(cache).forEach(q => {
            cache[q] = cache[q].map((p: any) =>
                p.id === productId ? { ...p, ...updates } : p
            );
        });
        localStorage.setItem(this.STORAGE_KEYS.SEARCH_CACHE, JSON.stringify(cache));
        window.dispatchEvent(new Event("demo-store-update"));
    }

    /** Promote a cached product into the main catalog */
    promoteFromCache(productId: string): Product | null {
        const all = this.getAllCachedProducts();
        const cached = all.find(p => p.id === productId);
        if (!cached) return null;
        // Remove cache-only fields
        const { cached_at, cache_query, _source, ...productData } = cached;
        const product = {
            ...productData,
            is_active: true,
            seller_id: cached.seller_id || 'global-partners',
            seller_name: cached.seller_name || 'Global Stores',
        };
        this.addRawProduct(product as Product);
        return product as Product;
    }

    /** Remove a product from the search cache */
    removeFromSearchCache(productId: string) {
        if (typeof window === "undefined") return;
        const cache = this._getSearchCache();
        Object.keys(cache).forEach(q => {
            cache[q] = cache[q].filter((p: any) => p.id !== productId);
            if (cache[q].length === 0) delete cache[q];
        });
        localStorage.setItem(this.STORAGE_KEYS.SEARCH_CACHE, JSON.stringify(cache));
        window.dispatchEvent(new Event("demo-store-update"));
    }

    private _getSearchCache(): Record<string, any[]> {
        if (typeof window === "undefined") return {};
        try {
            return JSON.parse(localStorage.getItem(this.STORAGE_KEYS.SEARCH_CACHE) || '{}');
        } catch { return {}; }
    }

    /** Returns only products whose seller has kyc_status === "approved" (or verified === true). 
     *  Use this for public-facing views (Homepage, Search, Category pages). */
    getApprovedProducts(): Product[] {
        const products = this.getProducts();
        const sellers = this.getSellers();
        
        // Build a broad Set of approved IDs to catch both seller.id and seller.user_id
        const approvedIds = new Set<string>();
        approvedIds.add("global-partners"); // Always include global

        sellers.forEach(s => {
            if (s.status === "active" || s.verified === true || s.kyc_status === "approved") {
                if (s.id) approvedIds.add(s.id);
                if (s.user_id) approvedIds.add(s.user_id);
            }
        });

        return products.filter(p => p.is_active !== false && approvedIds.has(p.seller_id));
    }

    getSellers(): Seller[] {
        if (typeof window === "undefined") return [];
        const stored = localStorage.getItem(this.STORAGE_KEYS.SELLERS);
        // Fallback to empty array if DB sync hasn't populated localStorage yet
        return stored ? JSON.parse(stored) : [];
    }

    addSeller(seller: Seller) {
        const sellers = this.getSellers();
        sellers.push(seller);
        localStorage.setItem(this.STORAGE_KEYS.SELLERS, JSON.stringify(sellers));

        // Persist to Postgres (queued if offline)
        resilientFetch("/api/sellers", { method: "POST", body: seller, type: "registration" });

        // Trigger Admin Registration Email
        try {
            fetch('/api/email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: 'techzema@gmail.com',
                    type: 'NEW_SELLER_REGISTRATION',
                    payload: {
                        name: seller.business_name || seller.owner_name,
                        email: seller.owner_email,
                        storeUrl: seller.store_url || seller.id
                    }
                })
            });
        } catch (e) { }

        window.dispatchEvent(new Event("storage"));
        window.dispatchEvent(new Event("demo-store-update"));
    }

    getOrders(): Order[] {
        if (typeof window === "undefined") return [];
        const allOrders: Order[] = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.ORDERS) || "[]");
        const allSellers = this.getSellers();

        return allOrders.map(order => {
            if (order.product) {
                const seller = order.product ? allSellers.find(s => s.id === order.product!.seller_id) : undefined;
                if (seller && (order.product.seller_name === "My Store" || !order.product.seller_name)) {
                    return {
                        ...order,
                        product: {
                            ...order.product,
                            seller_name: seller.business_name || seller.owner_name || "FairPrice Seller"
                        }
                    };
                }
            }
            return order;
        });
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

        // Resolve customer name from local users if not provided
        let customerName = (order as any).customer_name || "";
        if (!customerName && typeof window !== "undefined") {
            const customerUser = this.getAllUsers().find(u => u.id === order.customer_id || u.email === order.customer_id);
            if (customerUser?.name) customerName = customerUser.name;
        }
        if (!customerName) customerName = order.customer_id; // Last fallback: use email/id

        const newOrder: Order = {
            ...order,
            id: orderId,
            customer_name: customerName,
            created_at: now.toISOString(),
            updated_at: now.toISOString(),
            product: product,
            tracking_id: orderId,
            tracking_status: "pending",
            tracking_steps: trackingSteps,
            escrow_status: "held" as const
        };

        const orders = this.getOrders();
        const updated = [newOrder, ...orders];
        localStorage.setItem(this.STORAGE_KEYS.ORDERS, JSON.stringify(updated));

        // Gamification: Post-Purchase Delight
        if (order.source && order.source.startsWith("negotiation_")) {
            const negId = order.source.replace("negotiation_", "");
            const negotiations = this.getNegotiations();
            const neg = negotiations.find(n => n.id === negId);
            if (neg && (product.price > order.amount)) {
                const amountSaved = product.price - order.amount;
                this.addNotification({
                    userId: order.customer_id,
                    type: "promo",
                    message: `🎉 You saved ₦${amountSaved.toLocaleString()} today using FairPrice!`,
                    link: `/account/orders/${orderId}`
                });
                
                // Simulated Email Follow-up
                const customerEmail = `user_${order.customer_id}@fairprice.ng`;
                fetch("/api/email", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        to: customerEmail,
                        type: "ORDER_PLACED",
                        payload: {
                            name: customerName,
                            orderId: orderId,
                            productName: `${product.name} (Negotiated Savings: ₦${amountSaved.toLocaleString()})`,
                            amount: order.amount,
                            trackingUrl: `https://fairprice.ng/account/orders`
                        }
                    })
                }).catch(console.error);
            }
            
            // Mark negotiation as purchased
            if (neg) {
                const updatedNegs = negotiations.map(n => n.id === negId ? { ...n, purchased: true } : n);
                localStorage.setItem(this.STORAGE_KEYS.NEGOTIATIONS, JSON.stringify(updatedNegs));
            }
        }

        // Persist to Postgres (queued if offline — CRITICAL: ensures zero order loss)
        resilientFetch("/api/orders", { method: "POST", body: newOrder, type: "order" });

        // Notify Buyer
        this.addNotification({
            userId: order.customer_id,
            type: "order",
            message: `Your order #${orderId.substring(0, 8)} for ${product.name} has been placed successfully.`,
            link: `/account/orders`
        });

        // Email Buyer
        const customerEmail = `user_${order.customer_id}@fairprice.ng`;
        let resolvedCustomerEmail = customerEmail;
        if (typeof window !== "undefined") {
            const customerUser = this.getAllUsers().find(u => u.id === order.customer_id);
            if (customerUser?.email) resolvedCustomerEmail = customerUser.email;
        }

        fetch("/api/email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                to: resolvedCustomerEmail,
                type: "ORDER_PLACED",
                payload: {
                    name: customerName,
                    orderId: orderId,
                    productName: product.name,
                    amount: order.amount,
                    trackingUrl: `https://fairprice.ng/account/orders`
                }
            })
        }).catch(console.error);

        // Notify Seller
        const seller = this.getSellers().find(s => s.id === product.seller_id || s.user_id === product.seller_id);
        if (seller) {
            this.addNotification({
                userId: seller.owner_email || seller.id,
                type: "order",
                message: `🛒 New order #${orderId.substring(0, 8)} for ${product.name}. Please process for shipment.`,
                link: `/seller/orders`
            });

            if (seller.owner_email) {
                fetch("/api/email", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        to: seller.owner_email,
                        type: "SELLER_NEW_ORDER",
                        payload: {
                            orderId: orderId,
                            productName: product.name,
                            businessName: seller.business_name || "Seller",
                            amount: order.amount,
                            dashboardUrl: `https://fairprice.ng/seller/orders`
                        }
                    })
                }).catch(console.error);
            }
        }

        // Notify Admin
        this.addNotification({
            userId: "admin",
            type: "order",
            message: `📦 New order #${orderId.substring(0, 8)}: ${product.name} — ₦${order.amount.toLocaleString()} (${seller?.business_name || 'Unknown Store'})`,
            link: "/admin/orders"
        });
        fetch("/api/email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                to: "techzema@gmail.com",
                subject: `New Order: ${product.name} — ₦${order.amount.toLocaleString()}`,
                type: "security_alert",
                data: { storeName: "FairPrice Admin", message: `New order #${orderId.substring(0, 8)} for "${product.name}" — ₦${order.amount.toLocaleString()} from ${seller?.business_name || 'Unknown Store'}.` }
            })
        }).catch(() => {});

        window.dispatchEvent(new Event("storage"));
        // Custom event so we can listen specifically for this
        window.dispatchEvent(new Event("demo-store-update"));
        return newOrder;
    }

    getOrderByTrackingId(trackingId: string): Order | undefined {
        const orders = this.getOrders();
        return orders.find(o => o.id === trackingId || o.tracking_id === trackingId);
    }

    getOrderMessages(orderId: string) {
        const order = this.getOrderByTrackingId(orderId);
        return order?.chat_messages || [];
    }

    addOrderMessage(orderId: string, sender: string, text: string, imageUrl?: string) {
        const orders = this.getOrders();

        const updated = orders.map(o => {
            if (o.id === orderId) {
                const msg = {
                    id: Date.now().toString(),
                    sender,
                    text,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    imageUrl
                };

                return {
                    ...o,
                    chat_messages: [...(o.chat_messages || []), msg],
                    zivaActive: sender === 'ziva' ? true : false,
                    unread_admin: sender === 'user'
                };
            }
            return o;
        });

        localStorage.setItem(this.STORAGE_KEYS.ORDERS, JSON.stringify(updated));

        // Notifications: route messages to the right participants
        if (sender !== 'system') {
            const order = orders.find(o => o.id === orderId);
            const orderShortId = orderId.substring(0, 8);
            const msgPreview = text.length > 50 ? text.substring(0, 47) + '...' : text;

            if (sender === 'user') {
                // Customer sent: notify both admin and seller
                this.addNotification({
                    userId: 'admin',
                    type: 'order',
                    message: `💬 Customer message on order #${orderShortId}: "${msgPreview}"`,
                    link: `/admin/inbox/orders?order=${orderId}`
                });
                if (order?.seller_id) {
                    this.addNotification({
                        userId: order.seller_id,
                        type: 'order',
                        message: `💬 Customer message on order #${orderShortId}: "${msgPreview}"`,
                        link: `/seller/orders`
                    });
                }
            } else if (sender === 'admin') {
                // Admin sent: notify customer and seller
                if (order?.customer_id) {
                    this.addNotification({
                        userId: order.customer_id,
                        type: 'order',
                        message: `💬 Admin replied to your order #${orderShortId}`,
                        link: `/account/orders`
                    });
                }
                if (order?.seller_id) {
                    this.addNotification({
                        userId: order.seller_id,
                        type: 'order',
                        message: `💬 Admin message on order #${orderShortId}: "${msgPreview}"`,
                        link: `/seller/orders`
                    });
                }
            } else if (sender === 'seller') {
                // Seller sent: notify customer and admin
                if (order?.customer_id) {
                    this.addNotification({
                        userId: order.customer_id,
                        type: 'order',
                        message: `💬 Seller replied to your order #${orderShortId}`,
                        link: `/account/orders`
                    });
                }
                this.addNotification({
                    userId: 'admin',
                    type: 'order',
                    message: `💬 Seller replied on order #${orderShortId}: "${msgPreview}"`,
                    link: `/admin/inbox/orders?order=${orderId}`
                });
            } else if (sender === 'ziva') {
                // Ziva sent: no extra notifications needed (AI auto-response)
            }

            // Email seller if customer sent a message
            if (sender === 'user' && order?.seller_id) {
                const sellers = this.getSellers();
                const seller = sellers.find(s => s.id === order.seller_id);
                if (seller?.owner_email) {
                    fetch("/api/email", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            to: seller.owner_email,
                            type: "ORDER_INQUIRY",
                            payload: {
                                sellerName: seller.business_name || "Seller",
                                orderId: orderId,
                                message: text,
                                dashboardUrl: `https://fairprice.ng/seller/dashboard/messages`
                            }
                        })
                    }).catch(console.error);
                }
            }
        }

        window.dispatchEvent(new Event("storage"));
        window.dispatchEvent(new Event("demo-store-update"));
    }


    // --- Product CRUD ---
    addProduct(product: Omit<Product, "id" | "created_at" | "seller_id" | "seller_name" | "price_flag">) {
        const products = this.getProducts();

        // Ensure categories exist
        if (product.category) {
            this.ensureCategoryExists(product.category, product.subcategory);
        }

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

        const existingIdx = products.findIndex(p => p.id === product.id);
        if (existingIdx >= 0) {
            products[existingIdx] = { ...products[existingIdx], ...product };
        } else {
            products.unshift(product);
        }
        if (products.length > 500) products.length = 500; // soft limit

        try {
            localStorage.setItem(this.STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
        } catch (e) {
            // Force aggressive trim if quota exceeded
            products.length = 150;
            localStorage.setItem(this.STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
        }

        // Persist to Postgres (queued if offline)
        resilientFetch("/api/products", { method: "POST", body: product, type: "product_update" });

        try {
            this.addToHistory(product);
        } catch (e) { }

        window.dispatchEvent(new Event("storage"));
        window.dispatchEvent(new Event("demo-store-update"));
        return product;
    }

    async updateProduct(id: string, updates: Partial<Product>) {
        const products = this.getProducts();
        const existingProduct = products.find(p => p.id === id);

        // Ensure categories exist if they are being updated
        if (updates.category || updates.subcategory) {
            this.ensureCategoryExists(
                updates.category || existingProduct?.category || "Unknown",
                updates.subcategory || (updates.category ? undefined : existingProduct?.subcategory)
            );
        }

        const mergedProduct = { ...existingProduct, ...updates } as Product;
        const updated = products.map(p => p.id === id ? mergedProduct : p);

        // Mark as pending BEFORE writing — protects from syncWithDB overwrite
        this._pendingEdits.add(id);
        try { localStorage.setItem(this._PENDING_KEY, JSON.stringify([...this._pendingEdits])); } catch { /* quota */ }

        // Write to localStorage for instant UI feedback
        localStorage.setItem(this.STORAGE_KEYS.PRODUCTS, JSON.stringify(updated));

        // Clear stale NavSearch sessionStorage cache so thumbnails update immediately
        try {
            sessionStorage.removeItem('nav_search_results');
            sessionStorage.removeItem('nav_search_clicked_id');
        } catch { /* ignore */ }

        // Dispatch events IMMEDIATELY so UI updates right away
        window.dispatchEvent(new Event("storage"));
        window.dispatchEvent(new Event("demo-store-update"));

        // Persist to Postgres — AWAIT so the DB has the latest data
        try {
            const res = await fetch("/api/products", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(mergedProduct),
            });
            if (res.ok) {
                console.log(`✅ Persisted product update to DB: ${id}`);
                // DB confirmed — safe to remove from pending
                this._pendingEdits.delete(id);
                try { localStorage.setItem(this._PENDING_KEY, JSON.stringify([...this._pendingEdits])); } catch { /* quota */ }
            } else {
                const errData = await res.json().catch(() => ({}));
                console.warn(`⚠️ DB write returned ${res.status} for product ${id}:`, errData.error || "Unknown error");
                // Keep in pendingEdits so syncWithDB doesn't overwrite
            }
        } catch (err) {
            console.warn("⚠️ Failed to persist product update to DB:", err);
            // Keep in pendingEdits so syncWithDB doesn't overwrite
        }
    }

    promoteProduct(id: string, isSponsored: boolean = true) {
        this.updateProduct(id, { is_sponsored: isSponsored });
    }

    setCachedGlobalResults(query: string, products: Product[]) {
        const normalizedQuery = query.toLowerCase().trim();
        localStorage.setItem(`fairprice_global_search_${normalizedQuery}`, JSON.stringify(products));

        // Also save to the central SEARCH_CACHE for the Admin portal
        try {
            const centralCacheStr = localStorage.getItem(this.STORAGE_KEYS.SEARCH_CACHE) || "{}";
            const centralCache = JSON.parse(centralCacheStr);
            centralCache[normalizedQuery] = products;
            localStorage.setItem(this.STORAGE_KEYS.SEARCH_CACHE, JSON.stringify(centralCache));
            window.dispatchEvent(new Event("demo-store-update"));
        } catch (e) {
            console.error("Failed to update central search cache for admin", e);
        }
    }

    getCachedGlobalResults(query: string): Product[] | null {
        if (typeof window === "undefined") return null;
        const data = localStorage.getItem(`fairprice_global_search_${query.toLowerCase().trim()}`);
        return data ? JSON.parse(data) : null;
    }

    addToHistory(product: Product) {
        if (typeof window === "undefined") return;
        try {
            const historyJson = localStorage.getItem("fairprice_demo_global_search_history") || "[]";
            let history = JSON.parse(historyJson);

            // Remove if already exists so it gets bumped to the top
            history = history.filter((h: any) => h.productId !== product.id);

            history.unshift({ productId: product.id, productName: product.name, timestamp: new Date().toISOString() });
            if (history.length > 50) history.length = 50;
            localStorage.setItem("fairprice_demo_global_search_history", JSON.stringify(history));
        } catch (e) { }
    }

    getSearchHistoryProducts(): Product[] {
        if (typeof window === "undefined") return [];
        const historyJson = localStorage.getItem("fairprice_demo_global_search_history") || "[]";
        const history = JSON.parse(historyJson);
        const products = this.getProducts();

        // Return recently viewed products from history that exist in the products array.
        // History is already unshifted (newest first).
        const historyProducts = history
            .map((h: any) => products.find((p) => p.id === h.productId))
            .filter(Boolean);

        // Deduplicate by id (already done in addToHistory but good measure)
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
        const order = orders.find(o => o.id === id);
        if (!order) return;

        const updated = orders.map(o => o.id === id ? { ...o, status } : o);
        localStorage.setItem(this.STORAGE_KEYS.ORDERS, JSON.stringify(updated));

        // Trigger Emails & Notifications based on status change
        if (order.status !== status) {
            const customerEmail = `user_${order.customer_id}@fairprice.ng`;
            let resolvedCustomerEmail = customerEmail;
            
            // Resolve customer name from user record
            let resolvedName = order.customer_name || "";
            if (typeof window !== "undefined") {
                 const customerUser = this.getAllUsers().find(u => u.id === order.customer_id || u.email === order.customer_id);
                 if (customerUser?.email) resolvedCustomerEmail = customerUser.email;
                 if (customerUser?.name && !resolvedName) resolvedName = customerUser.name;
            }
            if (!resolvedName) resolvedName = order.customer_id; // Final fallback

            const productName = order.product?.name || "your item";
            const orderShortId = order.id.substring(0, 8);

            const sellers = this.getSellers();
            const seller = sellers.find(s => s.id === order.seller_id);
            const sellerEmail = seller?.owner_email || `seller_${order.seller_id}@fairprice.ng`;

            const dispatchEmail = (to: string, type: any, payload: any) => {
                 fetch("/api/email", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ to, type, payload })
                 }).catch(console.error);
            };

            // 1. Delivered
            if (status === 'delivered') {
                dispatchEmail(resolvedCustomerEmail, "ORDER_DELIVERED", {
                    name: resolvedName,
                    orderId: order.id,
                    productName,
                    trackingUrl: `https://fairprice.ng/account/orders`
                });
                this.addNotification({ userId: order.customer_id, type: "order", message: `Your order #${orderShortId} has been delivered.`, link: `/account/orders?id=${order.id}` });
            }

            // 2. Cancelled
            if (status === 'cancelled') {
                // Notify Buyer
                dispatchEmail(resolvedCustomerEmail, "ORDER_CANCELLED", {
                    name: resolvedName,
                    orderId: order.id,
                    productName,
                });
                this.addNotification({ userId: order.customer_id, type: "order", message: `Your order #${orderShortId} for ${productName} has been cancelled successfully.`, link: `/account/orders?id=${order.id}` });
                
                // Notify Seller
                dispatchEmail(sellerEmail, "ORDER_CANCELLED", {
                    name: seller?.business_name || "Seller",
                    sellerName: seller?.business_name || "Seller",
                    orderId: order.id,
                    productName,
                });
                this.addNotification({ userId: order.seller_id, type: "order", message: `Order #${orderShortId} for ${productName} was cancelled by the buyer.`, link: `/seller/orders?id=${order.id}` });
            }

            // 3. Shipped
            if (status === 'shipped') {
                dispatchEmail(resolvedCustomerEmail, "ORDER_SHIPPED", {
                    name: resolvedName,
                    orderId: order.id,
                    productName,
                });
                this.addNotification({ userId: order.customer_id, type: "order", message: `Your order #${orderShortId} for ${productName} has shipped!`, link: `/account/orders?id=${order.id}` });
            }

            // 4. Return workflows
            if (status === 'return_requested') {
                 dispatchEmail(sellerEmail, "RETURN_REQUESTED", {
                    sellerName: seller?.business_name || "Seller",
                    orderId: order.id,
                    productName,
                 });
                 this.addNotification({ userId: order.seller_id, type: "order", message: `A return request was opened for Order #${orderShortId} (${productName}).`, link: `/seller/orders?id=${order.id}` });
            }
            if (status === 'return_approved' || status === 'return_rejected') {
                 const newStatusStr = status === 'return_approved' ? 'approved' : 'rejected';
                 dispatchEmail(resolvedCustomerEmail, "RETURN_UPDATED", {
                    name: resolvedName,
                    orderId: order.id,
                    productName,
                    newStatus: newStatusStr
                 });
                 this.addNotification({ userId: order.customer_id, type: "order", message: `Your return request for Order #${orderShortId} (${productName}) was ${newStatusStr}.`, link: `/account/orders?id=${order.id}` });
            }
        }

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

        const customerUser = this.getUser(order.customer_id);
        const buyerEmail = customerUser?.email || `user_${order.customer_id}@fairprice.ng`;
        
        fetch("/api/email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                to: buyerEmail,
                type: "ORDER_SHIPPED", // Reuse shipped template for tracking updates
                payload: {
                    name: order.customer_name || "Customer",
                    orderId: order.id
                }
            })
        }).catch(console.error);

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
        if (!userId) return []; // If no user, show nothing

        // Build set of all identities this user has (buyer ID, seller ID, email, etc.)
        const matchIds = new Set<string>(["all", userId]);

        // If user is also a seller, match their seller ID and email too
        const seller = this.getSellers().find(s =>
            s.user_id === userId || s.id === userId || s.owner_email === userId
        );
        if (seller) {
            matchIds.add(seller.id);
            if (seller.user_id) matchIds.add(seller.user_id);
            if (seller.owner_email) matchIds.add(seller.owner_email);
        }

        // Also match by user email
        const user = this.getCurrentUser();
        if (user?.email) matchIds.add(user.email);
        if (user?.id) matchIds.add(user.id);

        // Admin users see admin-targeted notifications too
        if (user?.role === 'admin') matchIds.add('admin');

        return all.filter(n => n.userId && matchIds.has(n.userId));
    }

    addNotification(notification: Omit<AppNotification, "id" | "timestamp" | "read">) {
        const stored = localStorage.getItem(this.STORAGE_KEYS.NOTIFICATIONS);
        const current: AppNotification[] = stored ? JSON.parse(stored) : [];

        const newNotif: AppNotification = {
            ...notification,
            id: `notif_${Math.random().toString(36).substr(2, 9)} `,
            timestamp: new Date().toISOString(),
            read: false
        };
        const updated = [newNotif, ...current];
        localStorage.setItem(this.STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(updated));
        window.dispatchEvent(new Event("storage"));

        // Also persist to database
        if (typeof window !== "undefined") {
            let targetEmail = notification.userId || "all";
            if (targetEmail !== "all" && targetEmail !== "admin") {
                const seller = this.getSellers().find(s => s.id === targetEmail || s.user_id === targetEmail);
                if (seller?.owner_email) targetEmail = seller.owner_email;
                else if ((seller as any)?.email) targetEmail = (seller as any).email;
                else {
                    const user = this.getAllUsers().find(u => u.id === targetEmail);
                    if (user?.email) targetEmail = user.email;
                }
            }

            fetch("/api/notifications", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    user_email: targetEmail,
                    type: notification.type || "system",
                    message: notification.message,
                    link: notification.link || null,
                }),
            }).catch(() => { /* silently fail — localStorage is fallback */ });
        }
    }

    markNotificationRead(notifId: string) {
        if (typeof window === "undefined") return;
        const stored = localStorage.getItem(this.STORAGE_KEYS.NOTIFICATIONS);
        if (!stored) return;
        const all: AppNotification[] = JSON.parse(stored);
        const updated = all.map(n => n.id === notifId ? { ...n, read: true } : n);
        localStorage.setItem(this.STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(updated));
        window.dispatchEvent(new Event("storage"));
        window.dispatchEvent(new Event("demo-store-update"));
    }

    markAllNotificationsRead(userId: string) {
        if (typeof window === "undefined") return;
        const stored = localStorage.getItem(this.STORAGE_KEYS.NOTIFICATIONS);
        if (!stored) return;
        const all: AppNotification[] = JSON.parse(stored);

        // Build the same identity set used in getNotifications
        const matchIds = new Set<string>(["all", userId]);
        const seller = this.getSellers().find(s =>
            s.user_id === userId || s.id === userId || s.owner_email === userId
        );
        if (seller) {
            matchIds.add(seller.id);
            if (seller.user_id) matchIds.add(seller.user_id);
            if (seller.owner_email) matchIds.add(seller.owner_email);
        }
        const user = this.getCurrentUser();
        if (user?.email) matchIds.add(user.email);
        if (user?.id) matchIds.add(user.id);
        if (user?.role === 'admin') matchIds.add('admin');

        const updated = all.map(n =>
            n.userId && matchIds.has(n.userId) ? { ...n, read: true } : n
        );
        localStorage.setItem(this.STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(updated));
        window.dispatchEvent(new Event("storage"));
        window.dispatchEvent(new Event("demo-store-update"));
    }

    getAllUsers(): any[] {
        if (typeof window === "undefined") return [];
        // Users aren't stored in a collection — extract unique buyers from orders
        const orders: any[] = this.getOrders();
        const userMap = new Map<string, any>();
        for (const o of orders) {
            const cid = o.customer_id || o.customer_email;
            if (!cid || userMap.has(cid)) continue;
            userMap.set(cid, {
                id: cid,
                email: o.customer_email || cid,
                name: o.customer_name || cid.split("@")[0],
                role: "buyer",
                created_at: o.created_at,
            });
        }
        // Also include the currently logged in user if any
        const currentUser = localStorage.getItem(this.STORAGE_KEYS.USERS);
        if (currentUser) {
            try {
                const u = JSON.parse(currentUser);
                if (u && u.email && !userMap.has(u.email) && !userMap.has(u.id)) {
                    userMap.set(u.email, {
                        id: u.id || u.email,
                        email: u.email,
                        name: u.name || u.email.split("@")[0],
                        role: u.role || "buyer",
                        avatarUrl: u.avatarUrl || null,
                        created_at: u.created_at || new Date().toISOString(),
                    });
                }
            } catch { }
        }

        // Merge with any manual status overrides (suspensions, activations) made by admin
        const overridesStr = localStorage.getItem(this.STORAGE_KEYS.USER_OVERRIDES);
        let overrides: Record<string, Partial<any>> = {};
        if (overridesStr) {
            try { overrides = JSON.parse(overridesStr); } catch { }
        }

        const allUsers = Array.from(userMap.values()).map(u => {
            if (overrides[u.id]) {
                return { ...u, ...overrides[u.id] };
            }
            if (overrides[u.email]) {
                return { ...u, ...overrides[u.email] };
            }
            return u;
        });

        return allUsers;
    }

    updateUserStatus(userId: string, status: "active" | "suspended" | "frozen") {
        if (typeof window === "undefined") return;
        const overridesStr = localStorage.getItem(this.STORAGE_KEYS.USER_OVERRIDES);
        let overrides: Record<string, Partial<any>> = {};
        if (overridesStr) {
            try { overrides = JSON.parse(overridesStr); } catch { }
        }

        overrides[userId] = { ...overrides[userId], status };
        localStorage.setItem(this.STORAGE_KEYS.USER_OVERRIDES, JSON.stringify(overrides));

        // Just in case they are currently logged in right now, we can update the active user object too
        const activeUserStr = localStorage.getItem(this.STORAGE_KEYS.USERS);
        if (activeUserStr) {
            try {
                const u = JSON.parse(activeUserStr);
                if (u.id === userId || u.email === userId) {
                    localStorage.setItem(this.STORAGE_KEYS.USERS, JSON.stringify({ ...u, status }));
                }
            } catch { }
        }

        window.dispatchEvent(new Event("storage"));
        window.dispatchEvent(new Event("demo-store-update"));
    }

    sendAdminMessageToUser(userId: string, subject: string, message: string) {
        // Resolve user identity
        const seller = this.getSellers().find(s => s.id === userId || s.user_id === userId || s.owner_email === userId);
        const allUsers = this.getAllUsers();
        const dsUser = allUsers.find(u => u.id === userId || u.email === userId);

        const actualUserId = seller?.id || dsUser?.id || userId;
        const targetName = seller?.business_name || seller?.owner_name || dsUser?.name || userId;
        const targetEmail = seller?.owner_email || dsUser?.email || userId;

        // 1) Create notification for the user
        this.addNotification({
            userId: actualUserId,
            type: "system",
            message: `[Admin Message: ${subject}] ${message}`,
            link: "/account/messages"
        });

        // 2) Create/reuse a conversation thread (the core DM system)
        const conv = this.getOrCreateConversation(
            "admin",
            actualUserId,
            { admin: "FairPrice Admin", [actualUserId]: targetName },
            { type: "admin_dm" }
        );
        this.sendChatMessage(conv.id, "admin", "FairPrice Admin", subject ? `**${subject}**\n${message}` : message);

        // 3) Also create support message for backward compat
        this.addSupportMessage({
            user_name: "Admin → " + targetName,
            user_email: targetEmail,
            subject,
            message,
            source: "dispute_admin",
            target_user_email: targetEmail,
            target_user_id: actualUserId,
        });
    }

    markAsRead(id: string) {
        if (typeof window === "undefined") return;
        const stored = localStorage.getItem(this.STORAGE_KEYS.NOTIFICATIONS);
        if (!stored) return;
        const all: AppNotification[] = JSON.parse(stored);
        const updated = all.map(n => n.id === id ? { ...n, read: true } : n);
        localStorage.setItem(this.STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(updated));
        window.dispatchEvent(new Event("storage"));
    }

    markAllAsRead() {
        if (typeof window === "undefined") return;
        const stored = localStorage.getItem(this.STORAGE_KEYS.NOTIFICATIONS);
        if (!stored) return;
        const all: AppNotification[] = JSON.parse(stored);
        const updated = all.map(n => ({ ...n, read: true }));
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

        const negotiation = negs[idx];
        const product = this.getProducts().find(p => p.id === negotiation.product_id);

        if (product) {
            if (sender === "buyer") {
                this.addNotification({
                    userId: product.seller_id,
                    type: "negotiation",
                    message: `New message from buyer for ${product.name}`,
                    link: `/seller/dashboard/messages?customer=${negotiation.customer_id}`
                });
                
                const sellerUser = this.getUser(product.seller_id);
                const sellerEmail = sellerUser?.email || `seller_${product.seller_id}@fairprice.ng`;
                fetch("/api/email", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        to: sellerEmail,
                        type: "ORDER_INQUIRY",
                        payload: {
                            sellerName: "Seller",
                            orderId: `Neg: ${product.name}`,
                            message: text,
                            dashboardUrl: `https://fairprice.ng/seller/dashboard/messages`
                        }
                    })
                }).catch(console.error);

            } else if (sender === "seller") {
                this.addNotification({
                    userId: negotiation.customer_id,
                    type: "negotiation",
                    message: `Seller sent a message regarding ${product.name}`,
                    link: "/account/negotiations"
                });
                
                const buyerUser = this.getUser(negotiation.customer_id);
                const buyerEmail = buyerUser?.email || `user_${negotiation.customer_id}@fairprice.ng`;
                fetch("/api/email", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        to: buyerEmail,
                        type: "ORDER_INQUIRY", 
                        payload: {
                            sellerName: negotiation.customer_name || "Customer",
                            orderId: `Neg: ${product.name}`,
                            message: text,
                            dashboardUrl: `https://fairprice.ng/account/negotiations`
                        }
                    })
                }).catch(console.error);
            }
        }

        localStorage.setItem(this.STORAGE_KEYS.NEGOTIATIONS, JSON.stringify(negs));
        window.dispatchEvent(new Event("storage"));
    }

    // --- Promotions ---
    private PROMO_PLANS: Record<string, { days: number; price: number; label: string }> = {
        "3_day": { days: 3, price: 5000, label: "3 Days" },
        "10_day": { days: 10, price: 9999, label: "10 Days" },
        "30_day": { days: 30, price: 20000, label: "30 Days" },
    };

    createPromotion(productId: string, sellerId: string, plan: "3_day" | "10_day" | "30_day") {
        const planInfo = this.PROMO_PLANS[plan];
        const now = new Date();
        const product = this.getProducts({ includeInactiveSellers: true }).find(p => p.id === productId);
        const promo = {
            id: `promo_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            product_id: productId,
            product_name: product?.name || "Product",
            seller_id: sellerId,
            plan,
            plan_label: planInfo.label,
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
        // Notification
        this.addNotification({
            type: "promo", // fixed from 'promotion'
            title: "Sponsored Ad is Live! 🚀",
            message: `Your ad for "${product?.name || "Product"}" is now live for ${planInfo?.label || plan}. It will appear across the platform.`,
            userId: sellerId,
            link: "/seller/dashboard/promotions",
        });
        window.dispatchEvent(new Event("storage"));
        window.dispatchEvent(new Event("demo-store-update")); // Ensure global sync
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
                this.addNotification({
                    type: "promo",
                    title: "Ad Campaign Ended",
                    message: `Your sponsored ad for "${p.product_name || "Product"}" has expired. Renew to keep boosting your sales.`,
                    userId: p.seller_id,
                    link: "/seller/dashboard/promotions",
                });
                changed = true;
            }
        }
        if (changed) localStorage.setItem(this.PROMO_KEY, JSON.stringify(all));

        if (!sellerId) return all;
        const sellerInfo = this.getSellers().find((s) => s.id === sellerId || s.user_id === sellerId);
        const validIds = sellerInfo ? [sellerInfo.id, sellerInfo.user_id].filter(Boolean) : [sellerId];
        return all.filter((p: any) => validIds.includes(p.seller_id));
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

    // --- Ad Credits ---
    getAdCredits(sellerId: string): number {
        const stored = localStorage.getItem(this.STORAGE_KEYS.AD_CREDITS);
        const all = stored ? JSON.parse(stored) : {};
        return all[sellerId] || 0;
    }

    updateAdCredits(sellerId: string, amount: number): boolean {
        const stored = localStorage.getItem(this.STORAGE_KEYS.AD_CREDITS);
        const all = stored ? JSON.parse(stored) : {};
        const current = all[sellerId] || 0;
        const newTotal = current + amount;
        
        // Don't allow negative balances
        if (newTotal < 0) return false;
        
        all[sellerId] = newTotal;
        localStorage.setItem(this.STORAGE_KEYS.AD_CREDITS, JSON.stringify(all));
        window.dispatchEvent(new Event("storage"));
        return true;
    }

    async checkPlanExpiry(sellerId: string) {
        const seller = this.getSellers().find(s => s.id === sellerId);
        if (!seller || seller.subscription_plan === "Starter" || !seller.subscription_plan) return;

        // If plan is paid but has no expiry date, set it to 30 days from now (for demo purposes)
        if (!seller.plan_expiry_date) {
            const exp = new Date();
            exp.setDate(exp.getDate() + 30);
            // Removing invalid plan_expiry_date assignment for now
            // this.updateSeller(sellerId, { plan_expiry_date: exp.toISOString() });
            return;
        }

        const expiry = new Date(seller.plan_expiry_date);
        const now = new Date();
        const daysRemaining = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        const notifiedKey = `fp_expiry_notified_${sellerId}`;
        const notifiedRaw = localStorage.getItem(notifiedKey);
        const notified: number[] = notifiedRaw ? JSON.parse(notifiedRaw) : [];

        // Check 7, 4, 1, and 0 days
        const thresholds = [7, 4, 1, 0];
        let triggered = -1;

        for (const t of thresholds) {
            if (daysRemaining <= t && daysRemaining > t - 1 && !notified.includes(t)) {
                triggered = t;
                break;
            }
        }

        if (triggered !== -1) {
            // Trigger notification
            const isExpired = triggered === 0;

            this.addNotification({
                type: "system",
                title: isExpired ? "Plan Expired ⚠️" : "Plan Expiring Soon 🔔",
                message: isExpired
                    ? `Your ${seller.subscription_plan} plan for ${seller.business_name} has expired. Your store is now inactive.`
                    : `Your ${seller.subscription_plan} plan for ${seller.business_name} expires in ${triggered} day${triggered > 1 ? 's' : ''}. Renew now to avoid disruption.`,
                userId: sellerId,
                link: "/seller/settings/billing",
            });

            try {
                // Determine owner email based on user list or default to current user if demo
                const ownerEmail = "seller@fairprice.ng";

                await fetch('/api/email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        to: ownerEmail,
                        type: 'PLAN_EXPIRY',
                        payload: {
                            name: "Seller",
                            businessName: seller.business_name,
                            planName: seller.subscription_plan,
                            daysRemaining: triggered
                        }
                    })
                });
            } catch (e) {
                console.warn("Failed to trigger expiry email", e);
            }

            // Mark this threshold as notified
            notified.push(triggered);
            localStorage.setItem(notifiedKey, JSON.stringify(notified));

            if (isExpired) {
                // Using status to handle deactivation since is_active doesn't exist on Seller type
                this.updateSeller(sellerId, { status: 'frozen' }); // Deactivate the store
            }
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
        if (typeof window === "undefined") return { total_sales: 0, active_users: 0, dispute_rate: 0, total_revenue: 0 } as any;

        const orders = this.getOrders();
        const products = this.getProducts();
        const sellers = this.getSellers();
        const complaints = this.getComplaints();

        const totalRevenue = orders.reduce((sum, o) => sum + (o.amount || 0), 0);
        const escrowBalance = orders.filter(o => !o.escrow_status || o.escrow_status === "held" || o.escrow_status === "seller_confirmed" || o.escrow_status === "buyer_confirmed").reduce((sum, o) => sum + (o.amount || 0), 0);
        const processedRevenue = orders.filter(o => o.escrow_status === "released").reduce((sum, o) => sum + (o.amount || 0), 0);

        return {
            total_sales: orders.length, active_users: 0, dispute_rate: 0,
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
        if (typeof window === "undefined") return [];
        return JSON.parse(localStorage.getItem(this.STORAGE_KEYS.COMPLAINTS) || "[]");
    }

    getPayouts(): any[] {
        if (typeof window === "undefined") return [];
        return JSON.parse(localStorage.getItem(this.STORAGE_KEYS.PAYOUTS) || "[]");
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
            id: `pay_${Date.now()}_${Math.random().toString(36).substr(2, 6)} `,
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

        // Add a notification to the admin dashboard
        this.addNotification({
            userId: "admin",
            type: "system",
            message: `New Payout Request: ${seller.business_name} requested a payout of ₦${amount.toLocaleString()} for order(s): ${orderIds.join(', ')} `,
            link: "/admin/payouts"
        });

        // Simulate sending an email to the admin
        fetch('/api/email', {
            method: 'POST',
            body: JSON.stringify({ to: 'admin@fairprice.ng', type: 'SELLER_PAYOUT_REQUEST', payload: { sellerName: seller.business_name, amount, orderIds } })
        }).catch(err => console.warn("Error triggering payout email:", err));

        window.dispatchEvent(new Event("storage"));
    }

    addKYCSubmission(submission: any) {
        if (typeof window === "undefined") return;
        const existing = this.getKYCSubmissions();
        existing.push(submission);
        localStorage.setItem(this.STORAGE_KEYS.KYC, JSON.stringify(existing));
        window.dispatchEvent(new Event("demo-store-update"));
    }

    getKYCSubmissions(): KYCSubmission[] {
        if (typeof window === "undefined") return [];
        return JSON.parse(localStorage.getItem(this.STORAGE_KEYS.KYC) || "[]");
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
            id: `SUP - ${Date.now()} -${Math.random().toString(36).substr(2, 4)} `,
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
                message: `Funds for ${order.product?.name || 'your order'} have been released.Please leave a review!`,
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
            id: `disp_${Date.now()} `,
            order_id: orderId,
            buyer_id: buyerId,
            buyer_name: buyerName,
            buyer_email: buyerEmail,
            seller_id: order.seller_id,
            seller_name: seller?.business_name || order.seller_name || "Unknown Seller",
            product_name: order.product?.name || `Product ${order.product_id} `,
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
            subject: `Dispute Filed: ${reason.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())} `,
            message: `Buyer ${buyerName} raised a dispute on order #${orderId}.Reason: ${reason.replace(/_/g, " ")}.Description: ${description} `,
            source: "order_issue",
            order_id: orderId,
        });

        window.dispatchEvent(new Event("storage"));

        // Dispatch email to seller
        const sellerEmail = seller?.owner_email || this.getUser(order.seller_id)?.email || `seller_${order.seller_id}@fairprice.ng`;
        fetch("/api/email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                to: sellerEmail,
                subject: `Dispute Filed: Order #${(orderId).substring(0,8)}`,
                type: "NEW_DISPUTE",
                payload: {
                    sellerName: seller?.business_name || "Seller",
                    orderId: orderId,
                    message: reason.replace(/_/g, " "),
                    dashboardUrl: `https://fairprice.ng/seller/orders?id=${orderId}`
                }
            })
        }).catch(console.error);

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
                message: `${seller ? seller.business_name : 'A store you follow'} sent you a message: ${messageText} `,
                link: `/ account / messages` // A real app might deep link to a specific chat context
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
            id: `cpn_${Date.now()}_${Math.random().toString(36).substr(2, 4)} `,
            code: `FP - ${Math.random().toString(36).substr(2, 6).toUpperCase()} `,
            isUsed: false,
            createdAt: new Date().toISOString(),
        };
        all.unshift(newCoupon);
        localStorage.setItem(this.STORAGE_KEYS.COUPONS, JSON.stringify(all));

        // Notify user
        this.addNotification({
            userId: coupon.userId,
            type: "system",
            message: `You received a ₦${coupon.amount.toLocaleString()} coupon! Code: ${newCoupon.code}. ${coupon.reason} `,
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
            id: `ref_${Date.now()} `,
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

        // Exact match
        const exactMatches = all.filter((r: any) => r.product_id === productId);
        return exactMatches;
    }

    addReview(review: Omit<any, "id" | "created_at">) {
        const all = this.getReviews();
        const newReview = {
            ...review,
            id: `rev_${Date.now()}_${Math.random().toString(36).substr(2, 4)} `,
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

    // ─── Chat / DM System ────────────────────────────────────

    getConversations(userId?: string): any[] {
        if (typeof window === "undefined") return [];
        const convs = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.CONVERSATIONS) || "[]");
        if (!userId) return convs;
        return convs.filter((c: any) => c.participants.includes(userId));
    }

    getOrCreateConversation(
        participant1: string,
        participant2: string,
        names: Record<string, string>,
        context?: { type: "admin_dm" | "buyer_seller" | "ziva_escalation"; product_id?: string; order_id?: string }
    ): any {
        if (typeof window === "undefined") return null;
        const conversations = this.getConversations();

        // Find existing conversation between these two participants
        const existing = conversations.find((c: any) =>
            c.participants.includes(participant1) && c.participants.includes(participant2)
        );
        if (existing) return existing;

        // Create new conversation
        const conv = {
            id: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            participants: [participant1, participant2],
            participant_names: names,
            last_message: "",
            last_message_at: new Date().toISOString(),
            unread_count: { [participant1]: 0, [participant2]: 0 },
            context: context || { type: "admin_dm" as const },
        };
        conversations.unshift(conv);
        localStorage.setItem(this.STORAGE_KEYS.CONVERSATIONS, JSON.stringify(conversations));
        window.dispatchEvent(new Event("storage"));
        window.dispatchEvent(new Event("demo-store-update"));
        return conv;
    }

    getChatMessages(conversationId: string): any[] {
        if (typeof window === "undefined") return [];
        const allMsgs = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.CHAT_MESSAGES) || "[]");
        return allMsgs.filter((m: any) => m.conversation_id === conversationId);
    }

    sendChatMessage(conversationId: string, senderId: string, senderName: string, text: string): any {
        if (typeof window === "undefined") return null;

        const msg = {
            id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            conversation_id: conversationId,
            sender_id: senderId,
            sender_name: senderName,
            text,
            timestamp: new Date().toISOString(),
            read_by: [senderId],
        };

        // Append message
        const allMsgs = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.CHAT_MESSAGES) || "[]");
        allMsgs.push(msg);
        localStorage.setItem(this.STORAGE_KEYS.CHAT_MESSAGES, JSON.stringify(allMsgs));

        // Update conversation metadata
        const conversations = this.getConversations();
        const updated = conversations.map((c: any) => {
            if (c.id === conversationId) {
                const newUnread = { ...c.unread_count };
                // Increment unread for all participants except sender
                c.participants.forEach((p: string) => {
                    if (p !== senderId) newUnread[p] = (newUnread[p] || 0) + 1;
                });
                return { ...c, last_message: text, last_message_at: msg.timestamp, unread_count: newUnread };
            }
            return c;
        });
        localStorage.setItem(this.STORAGE_KEYS.CONVERSATIONS, JSON.stringify(updated));
        window.dispatchEvent(new Event("storage"));
        window.dispatchEvent(new Event("demo-store-update"));
        return msg;
    }

    markConversationRead(conversationId: string, userId: string) {
        if (typeof window === "undefined") return;
        const conversations = this.getConversations();
        const updated = conversations.map((c: any) => {
            if (c.id === conversationId) {
                return { ...c, unread_count: { ...c.unread_count, [userId]: 0 } };
            }
            return c;
        });
        localStorage.setItem(this.STORAGE_KEYS.CONVERSATIONS, JSON.stringify(updated));

        // Also mark messages as read
        const allMsgs = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.CHAT_MESSAGES) || "[]");
        const updatedMsgs = allMsgs.map((m: any) => {
            if (m.conversation_id === conversationId && !m.read_by.includes(userId)) {
                return { ...m, read_by: [...m.read_by, userId] };
            }
            return m;
        });
        localStorage.setItem(this.STORAGE_KEYS.CHAT_MESSAGES, JSON.stringify(updatedMsgs));
        window.dispatchEvent(new Event("storage"));
    }

}

export const DemoStore = DemoStoreService.getInstance();
