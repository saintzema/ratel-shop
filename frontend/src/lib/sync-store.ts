"use client";

import { NegotiationRequest, Order, Product, Seller, KYCSubmission, Complaint, Notification as AppNotification, SupportMessage, Dispute, DisputeReason, Coupon, ReturnRequest, Deal, ProductCategory } from "./types";
export type { NegotiationRequest };
import { formatPrice, getProxiedImageUrl, getProductUrl } from "./utils";
import { resilientFetch } from "./offline-queue";
import { TEMU_PRODUCTS } from "./demo-data-temu";
import { SEED_PRODUCTS, SEED_SELLERS } from "./data";

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
            { id: "cat_1_1", name: "Phones", slug: "phones", product_count: 15, children: [] },
            { id: "cat_1_2", name: "Tablets", slug: "tablets", product_count: 5, children: [] },
            { id: "cat_1_3", name: "Laptops", slug: "laptops", product_count: 12, children: [] },
            { id: "cat_1_4", name: "Audio", slug: "audio", product_count: 4, children: [] },
            { id: "cat_1_5", name: "Headphones", slug: "headphones", product_count: 4, children: [] },
            { id: "cat_1_6", name: "Wearables", slug: "wearables", product_count: 7, children: [] },
        ]
    },
    {
        id: "cat_2", name: "Fashion", slug: "fashion", product_count: 38, children: [
            { id: "cat_2_1", name: "Men's Clothing", slug: "mens-clothing", product_count: 14, children: [] },
            { id: "cat_2_2", name: "Women's Clothing", slug: "womens-clothing", product_count: 16, children: [] },
            { id: "cat_2_3", name: "Shoes", slug: "shoes", product_count: 4, children: [] },
            { id: "cat_2_4", name: "Sneakers", slug: "sneakers", product_count: 4, children: [] },
        ]
    },
    {
        id: "cat_8", name: "Appliances", slug: "appliances", product_count: 35, children: [
            { id: "cat_8_1", name: "Fans", slug: "fans", product_count: 12, children: [] },
            { id: "cat_8_2", name: "Air Conditioning", slug: "air-conditioning", product_count: 8, children: [] },
            { id: "cat_8_3", name: "Generators", slug: "generators", product_count: 5, children: [] },
            { id: "cat_8_4", name: "Refrigerators", slug: "refrigerators", product_count: 5, children: [] },
            { id: "cat_8_5", name: "Microwaves", slug: "microwaves", product_count: 5, children: [] },
        ]
    },
    {
        id: "cat_3", name: "Home", slug: "home", product_count: 25, children: [
            { id: "cat_3_1", name: "Kitchen", slug: "kitchen", product_count: 10, children: [] },
            { id: "cat_3_2", name: "Decor", slug: "decor", product_count: 8, children: [] },
            { id: "cat_3_3", name: "Furniture", slug: "furniture", product_count: 4, children: [] },
            { id: "cat_3_4", name: "Bedding", slug: "bedding", product_count: 3, children: [] },
        ]
    },
    {
        id: "cat_4", name: "Beauty", slug: "beauty", product_count: 15, children: [
            { id: "cat_4_1", name: "Skincare", slug: "skincare", product_count: 10, children: [] },
            { id: "cat_4_2", name: "Haircare", slug: "haircare", product_count: 3, children: [] },
            { id: "cat_4_3", name: "Makeup", slug: "makeup", product_count: 2, children: [] },
        ]
    },
    {
        id: "cat_9", name: "Health", slug: "health", product_count: 10, children: [
            { id: "cat_9_1", name: "Fitness", slug: "fitness", product_count: 5, children: [] },
            { id: "cat_9_2", name: "Supplements", slug: "supplements", product_count: 3, children: [] },
            { id: "cat_9_3", name: "Medical Supplies", slug: "medical-supplies", product_count: 2, children: [] },
        ]
    },
    {
        id: "cat_5", name: "Gaming", slug: "gaming", product_count: 15, children: [
            { id: "cat_5_1", name: "Consoles", slug: "consoles", product_count: 5, children: [] },
            { id: "cat_5_2", name: "Accessories", slug: "gaming-accessories", product_count: 10, children: [] },
        ]
    },
    {
        id: "cat_6", name: "Vehicles", slug: "vehicles", product_count: 20, children: [
            { id: "cat_6_1", name: "Cars", slug: "cars", product_count: 12, children: [] },
            { id: "cat_6_2", name: "Motorcycles", slug: "motorcycles", product_count: 4, children: [] },
            { id: "cat_6_3", name: "Tricycles", slug: "tricycles", product_count: 2, children: [] },
            { id: "cat_6_4", name: "Buses", slug: "buses", product_count: 1, children: [] },
            { id: "cat_6_5", name: "Vans", slug: "vans", product_count: 1, children: [] },
        ]
    },
];

class DataSyncServiceService {
    private static instance: DataSyncServiceService;
    // Track product IDs with local edits not yet confirmed by DB
    private _pendingEdits: Set<string> = new Set();
    private _pendingSellerEdits: Set<string> = new Set();
    private _pendingOrderEdits: Set<string> = new Set();
    private _deletedProductIds: Set<string> = new Set();
    private _deletedSellerIds: Set<string> = new Set();
    private _lastFullSync: number = 0;
    private _isDbOffline: boolean = false;
    private readonly _PENDING_KEY = "fp_pending_product_edits";
    
    /**
     * seedDemoData: Safety net that populates the marketplace with 
     * existing TEMU_PRODUCTS if the database is offline and the store is empty.
     */
    public seedDemoData() {
        if (typeof window === "undefined") return;
        
        const currentProducts = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.PRODUCTS) || '[]');
        if (currentProducts.length === 0) {
            console.log("🛠️ Resilience: Database unreachable and store empty. Seeding full SEED_PRODUCTS catalog.");
            localStorage.setItem(this.STORAGE_KEYS.PRODUCTS, JSON.stringify(SEED_PRODUCTS));
            
            // Also seed sellers to ensure getApprovedProducts works
            const currentSellers = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.SELLERS) || '[]');
            if (currentSellers.length === 0) {
                // Ensure all seeded sellers are marked as verified/active for the demo
                const verifiedSellers = SEED_SELLERS.map(s => ({ ...s, verified: true, status: "active", kyc_status: "approved" }));
                localStorage.setItem(this.STORAGE_KEYS.SELLERS, JSON.stringify(verifiedSellers));
            }

            // Trigger UI update
            window.dispatchEvent(new Event("storage"));
            window.dispatchEvent(new Event("sync-store-update"));
        }
    }

    public isSyncing = false;
    private readonly _PENDING_SELLER_KEY = "fp_pending_seller_edits";
    // Track negotiation IDs with local edits not confirmed by DB
    private _pendingNegotiationEdits: Set<string> = new Set();
    private readonly _PENDING_NEGOTIATION_KEY = "fp_pending_negotiations";
    private readonly _PENDING_ORDER_KEY = "fp_pending_order_edits";
    private _isRegisteringSeller = false;
    private _autoReleaseActive = false;
    private _syncDebounceTimer: any = null;
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
        CATEGORIES: "fp_marketplace_taxonomy",
        TRENDING_CURATION: "fp_trending_ids",
        DEALS: "fairprice_demo_deals",
        PROMOTIONS: "fairprice_demo_promotions",
        AD_CREDITS: "fairprice_demo_ad_credits",
        DELETED_STUBS: "fp_deleted_stubs",
        PENDING_NEGOTIATIONS: "fp_pending_negotiations",
        PLATFORM_SETTINGS: "fp_platform_settings",
        TAXONOMY: "fp_marketplace_taxonomy",
        OFF_LISTING_INVOICES: "fairprice_demo_off_listing_invoices",
        RESTOCK_SUBSCRIPTIONS: "fairprice_restock_subscriptions"
    };

    private selfHeal() {
        if (typeof window === "undefined") return;
        try {
            const DEMO_PATTERNS = ["FP-DEMO-ORD", "complaint_FP-DEMO-ORD", "dispute_FP-DEMO-ORD", "TEST-", "mock_"];
            const keysToClean = Object.values(this.STORAGE_KEYS);
            
            let healed = false;
            keysToClean.forEach(key => {
                const stored = localStorage.getItem(key);
                if (stored) {
                    try {
                        const data = JSON.parse(stored);
                        if (Array.isArray(data)) {
                            const filtered = data.filter(item => {
                                const itemStr = JSON.stringify(item).toLowerCase();
                                return !DEMO_PATTERNS.some(p => 
                                    itemStr.includes(p.toLowerCase()) || 
                                    (item.id && String(item.id).startsWith(p)) ||
                                    (item.order_id && String(item.order_id).startsWith(p))
                                );
                            });
                            if (filtered.length !== data.length) {
                                localStorage.setItem(key, JSON.stringify(filtered));
                                healed = true;
                            }
                        }
                    } catch (e) {
                         localStorage.removeItem(key);
                         healed = true;
                    }
                }
            });

            if (healed) {
                if (process.env.NODE_ENV === 'development') {
                    console.log("🛠️ DataSyncService self-heal: Purged all legacy demo entries.");
                }
                window.dispatchEvent(new Event("sync-store-update"));
            }
        } catch (e) {
            console.error("Self-heal failed:", e);
        }
    }

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
                const savedNegs = localStorage.getItem(this._PENDING_NEGOTIATION_KEY);
                if (savedNegs) this._pendingNegotiationEdits = new Set(JSON.parse(savedNegs));
                const savedOrders = localStorage.getItem(this._PENDING_ORDER_KEY);
                if (savedOrders) this._pendingOrderEdits = new Set(JSON.parse(savedOrders));
            } catch { /* ignore */ }
            this.syncWithDB();
            this.startRealtimeSync();

            // Re-sync EVERYTHING when user logs in or switches accounts
            window.addEventListener("fp-auth-update", () => {
                this.syncWithDB();
            });

            // Listen for buyer messages from floating chat to hot-sync to DB
            window.addEventListener("buyer-negotiation-message-sent", (e: any) => {
                const { productId, text, replyTo } = e.detail;
                const negs = this.getNegotiations();
                const neg = negs.find(n => n.product_id === productId && n.status !== "accepted" && n.status !== "rejected");
                
                if (neg) {
                    const existingMessages = Array.isArray(neg.chat_messages) ? [...neg.chat_messages] : [];
                    existingMessages.push({
                        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                        sender: "buyer",
                        text,
                        timestamp: new Date().toISOString(),
                        replyTo
                    });

                    // Update local storage
                    const updated = negs.map(n => n.id === neg.id ? { ...n, chat_messages: existingMessages } : n);
                    localStorage.setItem(this.STORAGE_KEYS.NEGOTIATIONS, JSON.stringify(updated));
                    
                    // Hot sync to DB
                    fetch("/api/negotiations", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            id: neg.id,
                            chatMessages: existingMessages
                        })
                    }).catch(console.error);
                }
            });
        }
    }

    public static getInstance(): DataSyncServiceService {
        if (!DataSyncServiceService.instance) {
            DataSyncServiceService.instance = new DataSyncServiceService();
        }
        return DataSyncServiceService.instance;
    }

    private init() {
        // Version check: when seed data is updated (new products added), bump this version
        // to force re-seeding localStorage with the latest data
        // v17: Reset all stats, purge orphaned products/sellers/orders
        // v18: EXTREMELY IMPORTANT - Marketplace consolidation. Reassigned all products to Global Stores and purged demo stores/users.
        // v19: Clean Sweep Synchronization. Forced cache flush after database reset and cascading rules update.
        const DATA_VERSION = "20";
        const currentVersion = localStorage.getItem("fairprice_data_version");

        if (currentVersion !== DATA_VERSION) {
            // Clear all stale data and re-seed with latest
            Object.values(this.STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
            localStorage.setItem("fairprice_data_version", DATA_VERSION);
        }

        this.selfHeal();

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
        if (!localStorage.getItem(this.STORAGE_KEYS.TAXONOMY)) {
            localStorage.setItem(this.STORAGE_KEYS.TAXONOMY, "[]");
        }
        if (!localStorage.getItem(this.STORAGE_KEYS.DEALS)) {
            localStorage.setItem(this.STORAGE_KEYS.DEALS, "[]");
        }
        if (!localStorage.getItem(this.STORAGE_KEYS.PROMOTIONS)) {
            localStorage.setItem(this.STORAGE_KEYS.PROMOTIONS, "[]");
        }
        if (!localStorage.getItem(this.STORAGE_KEYS.AD_CREDITS)) {
            localStorage.setItem(this.STORAGE_KEYS.AD_CREDITS, "{}");
        }
        
        if (!localStorage.getItem(this.STORAGE_KEYS.OFF_LISTING_INVOICES)) {
            localStorage.setItem(this.STORAGE_KEYS.OFF_LISTING_INVOICES, "[]");
        }
        if (!localStorage.getItem(this.STORAGE_KEYS.RESTOCK_SUBSCRIPTIONS)) {
            localStorage.setItem(this.STORAGE_KEYS.RESTOCK_SUBSCRIPTIONS, "[]");
        }
        
        // Start auto-release worker
        this.runAutoReleaseWorker();
    }

    private startRealtimeSync() {
        if (typeof window === "undefined") return;

        const eventSource = new EventSource("/api/realtime");

        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === "ping") return;

                let collectionToSync: string | undefined = undefined;
                if (data.type === "product_updated") collectionToSync = "products";
                else if (data.type === "seller_updated") collectionToSync = "sellers";
                else if (data.type === "order_updated" || data.type === "order_message_sync") collectionToSync = "orders";
                else if (data.type === "negotiation_updated") collectionToSync = "negotiations";
                else if (data.type === "notification") collectionToSync = "notifications";

                // Debounce to prevent rapid-fire DB compute spikes and UI jank
                if (this._syncDebounceTimer) clearTimeout(this._syncDebounceTimer);
                this._syncDebounceTimer = setTimeout(() => {
                    this.syncWithDB(collectionToSync, true);
                }, 2000); 
            } catch (e) {
                console.warn("Failed to parse real-time event:", e);
            }
        };

        eventSource.onerror = (error) => {
            return;
        };
    }


    
    /**
     * Sharded Sync Logic:
     * - Critical: Orders, Notifications, Negotiations (Fast, frequent)
     * - Lazy: Search Cache, Products, Sellers, Reviews (Heavy, throttled)
     */
    public async syncWithDB(collection?: string, isCritical: boolean = false) {
        if (typeof window === "undefined" || this.isSyncing) return;
        
        // Throttle heavy syncs to prevent UI hanging
        const now = Date.now();
        if (!collection && !isCritical && now - this._lastFullSync < 600000) { // 10 min throttle for full sync
            return;
        }

        this.isSyncing = true;
        try {
            const fetchWithTimeout = async (url: string, options: any = {}) => {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s hard timeout for 6k+ products
                try {
                    const response = await fetch(url, { ...options, signal: controller.signal });
                    clearTimeout(timeoutId);
                    return response;
                } catch (err: any) {
                    clearTimeout(timeoutId);
                    if (err.name === 'AbortError') throw new Error(`Timeout: ${url}`);
                    throw err;
                }
            };

            const user = this.getCurrentUser();
            const notificationUrl = user?.email ? `/api/notifications?user_email=${encodeURIComponent(user.email)}` : null;

            const syncAll = !collection;
            const fetchProducts = syncAll || collection === "products";
            const fetchSellers = syncAll || collection === "sellers";
            // Search Cache is HEAVY — ONLY fetch if specifically requested (Lazy)
            const fetchSearchCache = collection === "search_cache";
            const fetchOrders = syncAll || collection === "orders" || isCritical;
            const fetchNegotiations = syncAll || collection === "negotiations" || isCritical;
            const fetchNotifications = syncAll || collection === "notifications" || isCritical;
            const fetchConversations = syncAll || collection === "conversations";
            const fetchDisputes = syncAll || collection === "disputes";
            const fetchComplaints = syncAll || collection === "complaints";
            const fetchKYC = syncAll || collection === "kyc";
            const fetchReviews = syncAll || collection === "reviews";

            const lastSync = localStorage.getItem("fp_last_sync_time");
            const hasLocalProducts = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.PRODUCTS) || '[]').length > 0;
            const hasLocalSellers = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.SELLERS) || '[]').length > 0;
            const updatedAfter = (lastSync && hasLocalProducts && hasLocalSellers) ? `&updated_after=${lastSync}` : "";

            const mockUnfetched = Promise.resolve({ ok: false, json: () => Promise.resolve(null) } as Response);

            const sellerId = this.getCurrentSeller()?.id || this.getCurrentSeller()?.user_id;
            const customerId = user?.id;
            const ordersUrl = sellerId 
                ? `/api/orders?sellerId=${sellerId}` 
                : (customerId ? `/api/orders?customerId=${customerId}` : "/api/orders?all=true");

            const [
                productsResult, sellersResult, searchCacheResult, ordersResult, 
                negotiationsResult, notificationsResult, conversationsResult,
                disputesResult, complaintsResult, kycResult, reviewsResult
            ] = await Promise.allSettled([
                fetchProducts ? fetchWithTimeout(`/api/products?all=true${updatedAfter}`) : mockUnfetched,
                fetchSellers ? fetchWithTimeout(`/api/sellers?all=true${updatedAfter}`) : mockUnfetched,
                fetchSearchCache ? fetchWithTimeout("/api/search-cache") : mockUnfetched,
                fetchOrders ? fetchWithTimeout(ordersUrl) : mockUnfetched,
                fetchNegotiations ? fetchWithTimeout(`/api/negotiations?all=true`) : mockUnfetched,
                fetchNotifications && notificationUrl ? fetchWithTimeout(notificationUrl) : mockUnfetched,
                fetchConversations && user?.email ? fetchWithTimeout(`/api/conversations?user_email=${encodeURIComponent(user.email)}`) : mockUnfetched,
                fetchDisputes ? fetchWithTimeout("/api/disputes?all=true") : mockUnfetched,
                fetchComplaints ? fetchWithTimeout("/api/complaints?all=true") : mockUnfetched,
                fetchKYC ? fetchWithTimeout("/api/kyc?all=true") : mockUnfetched,
                fetchReviews ? fetchWithTimeout("/api/reviews?all=true") : mockUnfetched
            ]);

            // Resilience Check: If any critical results are 503 (offline), 
            // handle gracefully instead of clearing data.
            const isDbOffline = [productsResult, sellersResult].some(r => 
                r.status === "fulfilled" && r.value.status === 503
            );

            if (isDbOffline) {
                console.warn("📢 Resilience: Database reported offline (503). Preserving local cache.");
                this._isDbOffline = true;
                this.seedDemoData(); // Last resort: seed if totally empty
                this.isSyncing = false;
                window.dispatchEvent(new Event("sync-store-update"));
                return;
            }

            this._isDbOffline = false;

            if (!collection) {
                localStorage.setItem("fp_last_sync_time", new Date().toISOString());
            }

            // ── Process Products ──
            if (productsResult.status === "fulfilled" && productsResult.value.ok) {
                const raw = await productsResult.value.json();
                const dbProducts = Array.isArray(raw) ? raw : (raw?.products ?? []);
                if (Array.isArray(dbProducts)) {
                    const localProducts: any[] = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.PRODUCTS) || '[]');
                    
                    // SAFETY NET: If the API returned 0 products but we have local data,
                    // this is almost certainly a silent DB failure (Prisma returned empty
                    // instead of throwing). Preserve local cache and abort.
                    if (dbProducts.length === 0 && localProducts.length > 0 && !collection) {
                        console.warn("🛡️ Resilience: API returned 0 products but local cache has", localProducts.length, "— preserving cache.");
                    } else if (dbProducts.length > 0 || localProducts.length === 0) {
                    // MAP CamelCase to snake_case for senior tech lead consistency
                    const mappedDbProducts = dbProducts.map((p: any) => ({
                        ...p,
                        seller_id: p.sellerId || p.seller_id,
                        image_url: getProxiedImageUrl(p.imageUrl || p.image_url),
                        avg_rating: p.avgRating || p.avg_rating || 0,
                        review_count: p.reviewCount || p.review_count || 0,
                        sold_count: p.soldCount || p.sold_count || 0,
                        is_trending: p.isTrending || p.is_trending || false,
                        is_active: p.isActive !== undefined ? p.isActive : (p.is_active !== undefined ? p.is_active : true),
                        is_sponsored: p.isSponsored || p.is_sponsored || false,
                        original_price: p.originalPrice || p.original_price,
                        financing_down_payment: p.financingDownPayment || p.financing_down_payment,
                        seller_name: p.sellerName || p.seller_name || "Global Store",
                        tags: p.tags || [],
                        subcategory: p.subcategory || "",
                        updated_at: p.updatedAt || p.updated_at || p.createdAt || p.created_at || new Date().toISOString()
                    }));
                    
                    // ASYNC MERGE: Prevent UI hanging for large catalogs (6k+ items)
                    setTimeout(() => {
                        const isIncremental = !!updatedAfter;
                        const localMap = new Map(localProducts.map((p: any) => [p.id, p]));
                        const merged = isIncremental ? new Map(localMap) : new Map<string, any>();
                        
                        const deletedStubs = this.getDeletedStubs();

                        for (const dbProduct of mappedDbProducts) {
                            if (this._deletedProductIds.has(dbProduct.id) || deletedStubs.includes(dbProduct.id)) continue;

                            const localVersion = localMap.get(dbProduct.id);
                            if (localVersion) {
                                const dbTime = new Date(dbProduct.updated_at).getTime();
                                const localTime = new Date(localVersion.updated_at || 0).getTime();
                                if (dbTime >= localTime || !isIncremental) {
                                    merged.set(dbProduct.id, dbProduct);
                                }
                            } else {
                                merged.set(dbProduct.id, dbProduct);
                            }
                        }

                        for (const pendingId of this._pendingEdits) {
                            const localVersion = localMap.get(pendingId);
                            if (localVersion) merged.set(pendingId, localVersion);
                        }
                        
                        const newDataStr = JSON.stringify(Array.from(merged.values()));
                        if (newDataStr !== localStorage.getItem(this.STORAGE_KEYS.PRODUCTS)) {
                            localStorage.setItem(this.STORAGE_KEYS.PRODUCTS, newDataStr);
                            window.dispatchEvent(new Event("storage"));
                            window.dispatchEvent(new Event("sync-store-update"));
                        }
                    }, 0);
                    }
                }
            }

            // ── Process Sellers ──
            if (sellersResult.status === "fulfilled" && sellersResult.value.ok) {
                const dbSellers = await sellersResult.value.json();
                if (Array.isArray(dbSellers)) {
                    const localSellers: any[] = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.SELLERS) || '[]');
                    
                    // SAFETY NET: Same as products — if API returns 0 sellers but we have local sellers,
                    // treat as silent DB failure and preserve cache.
                    if (dbSellers.length === 0 && localSellers.length > 0 && !collection) {
                        console.warn("🛡️ Resilience: API returned 0 sellers but local cache has", localSellers.length, "— preserving cache.");
                    } else {
                    // MERGE STRATEGY: Same as products
                    const isIncremental = !!updatedAfter;
                    const localMap = new Map(localSellers.map((s: any) => [s.id, s]));
                    const merged = isIncremental ? new Map<string, any>(localMap) : new Map<string, any>();
                    const LOCAL_ONLY_FIELDS = ['subscription_plan', 'plan_expiry_date', 'payout_history'];

                    // Apply DB updates (overwrite or add)
                    for (const dbSeller of dbSellers) {
                        const localVersion = localMap.get(dbSeller.id);
                        if (localVersion) {
                            const mergedSeller = { ...localVersion, ...(dbSeller as any) };
                            for (const field of LOCAL_ONLY_FIELDS) {
                                if (localVersion[field] !== undefined && (dbSeller[field] === undefined || dbSeller[field] === null)) {
                                    mergedSeller[field] = localVersion[field];
                                }
                            }
                            merged.set(dbSeller.id, mergedSeller);
                        } else {
                            merged.set(dbSeller.id, dbSeller);
                        }
                    }
                    
                    // Preserve user's pending seller edits over DB versions
                    for (const pendingSellerId of this._pendingSellerEdits) {
                        const localVersion = localMap.get(pendingSellerId);
                        if (localVersion) merged.set(pendingSellerId, localVersion);
                    }

                    const sortedSellers = Array.from(merged.values()).sort((a, b) => a.id.localeCompare(b.id));
                    const newDataStr = JSON.stringify(sortedSellers);
                    if (newDataStr !== localStorage.getItem(this.STORAGE_KEYS.SELLERS)) {
                        localStorage.setItem(this.STORAGE_KEYS.SELLERS, newDataStr);
                        window.dispatchEvent(new Event("storage"));
                        window.dispatchEvent(new Event("sync-store-update"));
                    }
                    }
                }
            }

            // ── Process Orders ──
            if (ordersResult.status === "fulfilled" && ordersResult.value.ok) {
                const ordersData = await ordersResult.value.json();
                const dbOrders: any[] = ordersData.orders || ordersData || [];
                const localOrders: any[] = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.ORDERS) || '[]');
                
                // MERGE STRATEGY: Start with local, overlay DB updates.
                // This prevents the "top 200" limit from deleting historical data.
                const localMap = new Map(localOrders.map((o: any) => [o.id, o]));
                const mergedOrders = new Map<string, any>(localMap);
                
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
                        customer_email: dbOrder.customerEmail || dbOrder.customer_email,
                        seller_name: dbOrder.sellerName || dbOrder.seller_name,
                        payout_status: dbOrder.payoutStatus || dbOrder.payout_status || 'none',
                        product: dbOrder.product ? {
                            id: dbOrder.product.id,
                            name: dbOrder.product.name,
                            price: dbOrder.product.price,
                            image_url: dbOrder.product.imageUrl || dbOrder.product.image_url,
                            seller_id: dbOrder.product.sellerId || dbOrder.product.seller_id,
                            category: dbOrder.product.category,
                        } : undefined,
                    };
                    mergedOrders.set(dbOrder.id, mapped);
                }
                
                // 🛡️ Preserve user's pending order edits over DB versions (absolute priority)
                for (const pendingId of this._pendingOrderEdits) {
                    const localVersion = localMap.get(pendingId);
                    if (localVersion) mergedOrders.set(pendingId, localVersion);
                }

                const newDataArray = Array.from(mergedOrders.values());
                const newDataStr = JSON.stringify(newDataArray);
                if (newDataStr !== localStorage.getItem(this.STORAGE_KEYS.ORDERS)) {
                    localStorage.setItem(this.STORAGE_KEYS.ORDERS, newDataStr);
                    window.dispatchEvent(new Event("storage"));
                    window.dispatchEvent(new Event("sync-store-update"));
                }
                // Run auto-release check after syncing orders
                this.runAutoReleaseWorker();
            }
            

            // ── Process Negotiations ──
            if (negotiationsResult.status === "fulfilled" && negotiationsResult.value.ok) {
                const negData = await negotiationsResult.value.json();
                const dbNegotiations: any[] = negData.negotiations || [];
                if (dbNegotiations.length > 0) {
                    const localNegotiations: any[] = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.NEGOTIATIONS) || '[]');
                    const localMap = new Map(localNegotiations.map((n: any) => [n.id, n]));
                    const dbMap = new Map(dbNegotiations.map((n: any) => [n.id, n]));

                    let hasNewUpdate = false;
                    for (const dbNeg of dbNegotiations) {
                        const localVersion = localMap.get(dbNeg.id);
                        let chatMessages = dbNeg.chatMessages || localVersion?.chat_messages;
                        if (!chatMessages || chatMessages.length === 0) {
                            chatMessages = [{
                                id: `msg_init_${dbNeg.id}`,
                                sender: "system",
                                text: "Negotiation started",
                                timestamp: dbNeg.createdAt || new Date().toISOString()
                            }];
                        }

                        let justUpdatedType = null;
                        if (dbNeg.status === 'accepted' && localVersion?.status !== 'accepted') {
                            chatMessages.push({ 
                                sender: "seller", 
                                text: `Your offer of ₦${dbNeg.proposedPrice.toLocaleString()} has been ACCEPTED! 🎉`, 
                                timestamp: dbNeg.updatedAt || dbNeg.createdAt,
                                negotiation: { type: "accepted", productId: dbNeg.productId, counterPrice: dbNeg.proposedPrice, productName: dbNeg.product?.name || "Product", originalPrice: dbNeg.proposedPrice }
                            });
                            justUpdatedType = 'accepted';
                        } else if (dbNeg.status === 'rejected' && localVersion?.status !== 'rejected') {
                            chatMessages.push({ 
                                sender: "seller", 
                                text: `Unfortunately, your offer of ₦${dbNeg.proposedPrice.toLocaleString()} was REJECTED.`, 
                                timestamp: dbNeg.updatedAt || dbNeg.createdAt,
                                negotiation: { type: "rejected", productId: dbNeg.productId, counterPrice: dbNeg.proposedPrice, productName: dbNeg.product?.name || "Product", originalPrice: dbNeg.proposedPrice }
                            });
                            justUpdatedType = 'rejected';
                        } else if (dbNeg.counterPrice && localVersion?.counter_price !== dbNeg.counterPrice) {
                            chatMessages.push({
                                sender: "seller",
                                text: dbNeg.counterMessage || `The seller sent a counter offer of ₦${dbNeg.counterPrice.toLocaleString()}.`,
                                timestamp: dbNeg.updatedAt || dbNeg.createdAt,
                                negotiation: { type: "countered", productId: dbNeg.productId, counterPrice: dbNeg.counterPrice, productName: dbNeg.product?.name || "Product", originalPrice: dbNeg.proposedPrice || dbNeg.counterPrice }
                            });
                            justUpdatedType = 'countered';
                        }

                        const mapped = {
                            id: dbNeg.id,
                            product_id: dbNeg.productId || dbNeg.product_id,
                            seller_id: dbNeg.sellerId || dbNeg.seller_id,
                            customer_id: dbNeg.customerId || dbNeg.customer_id,
                            customer_name: dbNeg.customerName || dbNeg.customer_name,
                            proposed_price: dbNeg.proposedPrice || dbNeg.proposed_price,
                            message: dbNeg.message,
                            status: (dbNeg.status || "pending").toLowerCase() === "declined" ? "rejected" : (dbNeg.status || "pending").toLowerCase(),
                            counter_price: dbNeg.counterPrice || dbNeg.counter_price,
                            counter_message: dbNeg.counterMessage || dbNeg.counter_message,
                            counter_status: (dbNeg.counterStatus || dbNeg.counter_status || "").toLowerCase(),
                            created_at: dbNeg.createdAt || dbNeg.created_at,
                            updated_at: dbNeg.updatedAt || dbNeg.updated_at,
                            chat_messages: chatMessages,
                        };
                        
                        // Always update local with DB version (Overwrites stale status/counters)
                        localMap.set(dbNeg.id, mapped);
                        hasNewUpdate = true;
                        
                        if (justUpdatedType) {
                            window.dispatchEvent(new CustomEvent("negotiation-updated-remote", { detail: { type: justUpdatedType, negotiation: mapped } }));
                        }
                    }

                    // 🛡️ Apply pending local edits to ensure UI doesn't flicker/revert
                    for (const pendingId of this._pendingNegotiationEdits) {
                        const localVersion = localMap.get(pendingId);
                        if (localVersion) localMap.set(pendingId, localVersion);
                    }

                    if (hasNewUpdate) {
                        localStorage.setItem(this.STORAGE_KEYS.NEGOTIATIONS, JSON.stringify(Array.from(localMap.values())));
                        window.dispatchEvent(new Event("storage"));
                        window.dispatchEvent(new Event("sync-store-update"));
                        window.dispatchEvent(new Event("negotiation-updated-remote"));
                    }
                }
            }

            // ── Process Conversations ──
            if (conversationsResult.status === "fulfilled" && conversationsResult.value.ok) {
                const dbConversations = await conversationsResult.value.json();
                if (Array.isArray(dbConversations) && dbConversations.length > 0) {
                    const localConvs: any[] = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.CONVERSATIONS) || '[]');
                    const localMap = new Map(localConvs.map((c: any) => [c.id, c]));
                    let changed = false;

                    for (const dbConv of dbConversations) {
                        if (!localMap.has(dbConv.id)) {
                            localMap.set(dbConv.id, {
                                id: dbConv.id,
                                orderId: dbConv.orderId,
                                productName: dbConv.productName,
                                productImage: dbConv.productImage,
                                storeName: dbConv.storeName,
                                lastMessage: dbConv.lastMessage,
                                lastUpdated: dbConv.lastUpdated || new Date().toISOString(),
                                unreadCount: dbConv.unreadCount || 0,
                                messages: dbConv.messages || []
                            });
                            changed = true;
                        }
                    }
                    if (changed) {
                        localStorage.setItem(this.STORAGE_KEYS.CONVERSATIONS, JSON.stringify(Array.from(localMap.values())));
                        window.dispatchEvent(new Event("storage"));
                        window.dispatchEvent(new Event("sync-store-update"));
                    }
                }
            }

            // ── Process Search Cache ──
            if (searchCacheResult.status === "fulfilled" && searchCacheResult.value.ok) {
                const dbSearchCache = await searchCacheResult.value.json();
                if (Object.keys(dbSearchCache).length > 0) {
                    localStorage.setItem(this.STORAGE_KEYS.SEARCH_CACHE, JSON.stringify(dbSearchCache));
                }
            }

            // ── Process Notifications ──
            if (notificationsResult.status === "fulfilled" && notificationsResult.value.ok) {
                const dbNotifs = await notificationsResult.value.json();
                if (Array.isArray(dbNotifs)) {
                    const local: any[] = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.NOTIFICATIONS) || '[]');
                    const localMap = new Map(local.map(n => [n.id, n]));
                    dbNotifs.forEach((n: any) => {
                        localMap.set(n.id, {
                            id: n.id,
                            userId: n.user_id || n.user_email,
                            type: n.type,
                            message: n.message,
                            link: n.link,
                            read: n.read,
                            timestamp: n.created_at || new Date().toISOString()
                        });
                    });
                    localStorage.setItem(this.STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(Array.from(localMap.values())));
                    window.dispatchEvent(new Event("storage"));
                }
            }

            // ── Process Disputes ──
            if (disputesResult.status === "fulfilled" && disputesResult.value.ok) {
                const data = await disputesResult.value.json();
                if (data.success && Array.isArray(data.disputes)) {
                    localStorage.setItem(this.STORAGE_KEYS.DISPUTES, JSON.stringify(data.disputes));
                    window.dispatchEvent(new Event("storage"));
                }
            }

            // ── Process Complaints ──
            if (complaintsResult.status === "fulfilled" && complaintsResult.value.ok) {
                const data = await complaintsResult.value.json();
                if (data.success && Array.isArray(data.complaints)) {
                    localStorage.setItem(this.STORAGE_KEYS.COMPLAINTS, JSON.stringify(data.complaints));
                    window.dispatchEvent(new Event("storage"));
                }
            }

            // ── Process KYC ──
            if (kycResult.status === "fulfilled" && kycResult.value.ok) {
                const data = await kycResult.value.json();
                if (data.success && Array.isArray(data.submissions)) {
                    localStorage.setItem(this.STORAGE_KEYS.KYC, JSON.stringify(data.submissions));
                    window.dispatchEvent(new Event("storage"));
                }
            }

            // ── Process Reviews ──
            if (reviewsResult.status === "fulfilled" && reviewsResult.value.ok) {
                const data = await reviewsResult.value.json();
                if (data.success && Array.isArray(data.reviews)) {
                    // Reviews might be handled differently, check key
                    localStorage.setItem(this.STORAGE_KEYS.REVIEWS || "fp_reviews", JSON.stringify(data.reviews));
                    window.dispatchEvent(new Event("storage"));
                }
            }

            if (!collection && !isCritical) {
                this._lastFullSync = now;
            }
        } catch (error) {
            console.warn("Database sync failed quietly:", error);
        } finally {
            this.isSyncing = false;
        }
    }

    public isDbOffline(): boolean {
        return this._isDbOffline;
    }

    // --- Gamification Support ---
    getUserTier(userId: string): { name: string, color: string, discount: number } {
        const negotiations = this.getNegotiations(undefined, userId);
        const wins = negotiations.filter(n => n.status === "accepted").length;
        
        if (wins >= 5) return { name: "Gold Negotiator", color: "text-amber-500 bg-amber-50 border-amber-200", discount: 50 };
        if (wins >= 2) return { name: "Silver Deal-Maker", color: "text-gray-500 bg-gray-50 border-gray-200", discount: 20 };
        return { name: "Bronze Haggler", color: "text-amber-700 bg-amber-50 border-amber-200/50", discount: 0 };
    }

    private _syncFailedAt = 0;
    public async syncNegotiations() {
        if (typeof window === "undefined") return;
        // Circuit breaker: skip for 30s after a failure to avoid hammering a dead DB
        if (this._syncFailedAt && Date.now() - this._syncFailedAt < 30000) return;
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);
            const res = await fetch("/api/negotiations?all=true", { signal: controller.signal });
            clearTimeout(timeoutId);
            if (!res.ok) return;
            const negData = await res.json();
            const dbNegotiations: any[] = negData.negotiations || [];
            
            if (dbNegotiations.length > 0) {
                let localNegotiations: any[] = [];
                try {
                    localNegotiations = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.NEGOTIATIONS) || "[]");
                } catch (e) {
                    console.warn("Failed to parse local negotiations", e);
                }
                const localMap = new Map(localNegotiations.map((n: any) => [n.id, n]));

                for (const dbNeg of dbNegotiations) {
                    const localVersion = localMap.get(dbNeg.id);
                    let chatMessages = dbNeg.chatMessages || localVersion?.chat_messages;
                    if (!chatMessages || chatMessages.length === 0) {
                        chatMessages = [];
                        chatMessages.push({
                            sender: "buyer",
                            text: `🤝 Negotiation Request\n\nProduct: ${dbNeg.product?.name || "Product"}\nCurrent Price: ₦${dbNeg.product?.price?.toLocaleString() || 0}\nMy Offer: ₦${dbNeg.proposedPrice.toLocaleString()}\n\nMessage: ${dbNeg.message || "Offer submitted"}\n\nWaiting for seller to respond...`,
                            timestamp: dbNeg.createdAt
                        });
                    }
                        
                    let justUpdatedType = null;
                    if (dbNeg.status === "accepted" && localVersion?.status !== "accepted") {
                        chatMessages.push({ 
                            sender: "seller", 
                            text: `Your offer of ₦${dbNeg.proposedPrice.toLocaleString()} has been ACCEPTED! 🎉\n\nYou can now proceed to checkout.`, 
                            timestamp: dbNeg.updatedAt || dbNeg.createdAt,
                            negotiation: { type: "accepted", productId: dbNeg.productId, counterPrice: dbNeg.proposedPrice, productName: dbNeg.product?.name || "Product", originalPrice: dbNeg.proposedPrice }
                        });
                        justUpdatedType = 'accepted';
                    } else if (dbNeg.status === "rejected" && localVersion?.status !== "rejected") {
                        chatMessages.push({ 
                            sender: "seller", 
                            text: `Unfortunately, your offer of ₦${dbNeg.proposedPrice.toLocaleString()} was REJECTED.`, 
                            timestamp: dbNeg.updatedAt || dbNeg.createdAt,
                            negotiation: { type: "rejected", productId: dbNeg.productId, counterPrice: dbNeg.proposedPrice, productName: dbNeg.product?.name || "Product", originalPrice: dbNeg.proposedPrice }
                        });
                        justUpdatedType = 'rejected';
                    } else if (dbNeg.counterPrice && localVersion?.counter_price !== dbNeg.counterPrice) {
                        chatMessages.push({
                            sender: "seller",
                            text: dbNeg.counterMessage || `The seller sent a counter offer of ₦${dbNeg.counterPrice.toLocaleString()}.\n\nDo you accept?`,
                            timestamp: dbNeg.updatedAt || dbNeg.createdAt,
                            negotiation: { type: "countered", productId: dbNeg.productId, counterPrice: dbNeg.counterPrice, productName: dbNeg.product?.name || "Product", originalPrice: dbNeg.proposedPrice || dbNeg.counterPrice }
                        });
                        justUpdatedType = 'countered';
                    }

                    const mapped = {
                        id: dbNeg.id,
                        product_id: dbNeg.productId || dbNeg.product_id,
                        customer_id: dbNeg.customerId || dbNeg.customer_id,
                        customer_name: dbNeg.customerName || dbNeg.customer_name,
                        seller_id: dbNeg.sellerId || dbNeg.seller_id,
                        proposed_price: dbNeg.proposedPrice || dbNeg.proposed_price,
                        message: dbNeg.message,
                        status: (dbNeg.status || "pending").toLowerCase() === "declined" ? "rejected" : (dbNeg.status || "pending").toLowerCase(),
                        counter_price: dbNeg.counterPrice || dbNeg.counter_price,
                        counter_message: dbNeg.counterMessage || dbNeg.counter_message,
                        counter_status: (dbNeg.counterStatus || dbNeg.counter_status || "").toLowerCase(),
                        created_at: dbNeg.createdAt || dbNeg.created_at,
                        updated_at: dbNeg.updatedAt || dbNeg.updated_at,
                        chat_messages: chatMessages,
                    };
                    localMap.set(mapped.id, mapped);

                    if (justUpdatedType && typeof window !== "undefined") {
                        window.dispatchEvent(new CustomEvent("negotiation-updated-remote", { detail: { type: justUpdatedType, negotiation: mapped } }));
                    }
                }
                    const newDataStr = JSON.stringify(Array.from(localMap.values()));
                    try {
                        const oldDataStr = localStorage.getItem(this.STORAGE_KEYS.NEGOTIATIONS);
                        if (newDataStr !== oldDataStr) {
                            localStorage.setItem(this.STORAGE_KEYS.NEGOTIATIONS, newDataStr);
                            window.dispatchEvent(new Event("storage"));
                            window.dispatchEvent(new Event("sync-store-update"));
                        }
                    } catch (e) {
                        console.warn("Failed to persist negotiations to localStorage", e);
                    }
                }
            // Success: reset breaker
            this._syncFailedAt = 0;
        } catch (error) {
            // Silently fail if DB is offline, frontend resilience pattern takes over
            // Circuit breaker: record failure time to back off for 30s
            this._syncFailedAt = Date.now();
        }
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
        const stored = localStorage.getItem(this.STORAGE_KEYS.TAXONOMY);
        try {
            return stored ? JSON.parse(stored) : INITIAL_CATEGORIES;
        } catch {
            localStorage.removeItem(this.STORAGE_KEYS.TAXONOMY);
            return INITIAL_CATEGORIES;
        }
    }

    /**
     * Maps any loose string (from AI, User, or Search) to a canonical 
     * category/subcategory pair from the synced database taxonomy.
     */
    normalizeCategory(category: string, subcategory?: string): { category: ProductCategory; subcategory: string } {
        const taxonomy = this.getTaxonomy();
        const normCat = category.trim().toLowerCase();
        const normSub = subcategory?.trim().toLowerCase();

        // 1. Find canonical category
        const canonicalCat = taxonomy.find((c: Category) => 
            c.name.toLowerCase() === normCat || 
            c.slug.toLowerCase() === normCat
        );

        if (!canonicalCat) {
            // Fallback: return original lowercase if not found
            return { category: normCat as ProductCategory, subcategory: normSub || "" };
        }

        // 2. Find canonical subcategory if provided
        if (normSub && canonicalCat.children) {
            const canonicalSub = canonicalCat.children.find((s: Category) => 
                s.name.toLowerCase() === normSub || 
                s.slug.toLowerCase() === normSub
            );
            if (canonicalSub) {
                return { category: canonicalCat.name as ProductCategory, subcategory: canonicalSub.name };
            }
        }

        return { category: canonicalCat.name as ProductCategory, subcategory: normSub || "" };
    }

    setCategories(categories: Category[]) {
        localStorage.setItem(this.STORAGE_KEYS.TAXONOMY, JSON.stringify(categories));
        window.dispatchEvent(new Event("sync-store-update"));
        window.dispatchEvent(new Event("storage"));
    }

    async syncTaxonomy(silent: boolean = false) {
        try {
            const res = await fetch("/api/admin/taxonomy");
            if (res.ok) {
                const data = await res.json();
                if (data.success) {
                    // Map backend 'subcategories' to frontend 'children' for consistency
                    const mapped = (data.categories || []).map((cat: any) => ({
                        ...cat,
                        children: cat.subcategories || []
                    }));
                    localStorage.setItem(this.STORAGE_KEYS.TAXONOMY, JSON.stringify(mapped));
                    if (!silent) {
                        window.dispatchEvent(new Event("sync-store-update"));
                    }
                }
            }
        } catch (e) {
            console.error("Taxonomy sync failed:", e);
        }
    }

    getTaxonomy(): any[] {
        return this.getCategories();
    }

    async createPersistentCategory(name: string, silent: boolean = false) {
        try {
            const res = await fetch("/api/admin/taxonomy", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type: "category", name })
            });
            if (res.ok) await this.syncTaxonomy(silent);
        } catch (e) {
            console.error("Failed to create category:", e);
        }
    }

    async createPersistentSubcategory(categoryId: string, name: string, silent: boolean = false) {
        try {
            const res = await fetch("/api/admin/taxonomy", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type: "subcategory", categoryId, name })
            });
            if (res.ok) await this.syncTaxonomy(silent);
        } catch (e) {
            console.error("Failed to create subcategory:", e);
        }
    }

    // Helper to migrate hardcoded categories to DB if DB is empty
    // Helper to migrate hardcoded categories to DB if DB is empty
    async migrateTaxonomyIfNeeded(hardcodedCategories: any[]) {
        const current = this.getTaxonomy();
        
        // If we have some categories but significantly fewer than the hardcoded list,
        // we might be in a partial state. But for now, 0 is the safest trigger.
        if (current.length === 0) {
            console.log("🛠️ Taxonomy: Database is empty. Migrating hardcoded categories...");
            for (const cat of hardcodedCategories) {
                try {
                    await this.createPersistentCategory(cat.label, true);
                    const refreshed = this.getTaxonomy();
                    // Case-insensitive search for the category we just created/found
                    const dbCat = refreshed.find(c => c.name.toLowerCase() === cat.label.toLowerCase());
                    
                    if (dbCat && cat.subcategories) {
                        for (const sub of cat.subcategories) {
                            await this.createPersistentSubcategory(dbCat.id, sub, true);
                        }
                    }
                } catch (e) {
                    console.error(`🛠️ Taxonomy Migration Failed for "${cat.label}":`, e);
                }
            }
            // Final sync and dispatch once everything is migrated
            await this.syncTaxonomy();
            window.dispatchEvent(new Event("sync-store-update"));
            console.log("🛠️ Taxonomy: Migration complete.");
        }
    }

    /**
     * Ensures category/subcategory stats are updated.
     * NOTE: Auto-creation is DISABLED to prevent AI-generated duplicates.
     * Taxonomy should be managed via the Admin Category page.
     */
    ensureCategoryExists(categoryName: string, subCategoryName?: string) {
        if (!categoryName || typeof window === "undefined") return;

        try {
            const categories = this.getTaxonomy(); // Use getTaxonomy which is synced from DB
            if (categories.length === 0) return; // Wait for sync

            const catIndex = categories.findIndex(c => c && c.name && c.name.toLowerCase() === categoryName.toLowerCase());

            if (catIndex === -1) {
                console.warn(`🛡️ Data Integrity: Product uses unknown category "${categoryName}". Auto-creation skipped.`);
                return;
            }

            const parent = categories[catIndex];
            if (!parent) return;
            
            // Increment local count for UI responsiveness
            parent.product_count = (parent.product_count || 0) + 1;

            if (subCategoryName && parent.children) {
                const subIndex = parent.children.findIndex((c: Category) => c && c.name && c.name.toLowerCase() === subCategoryName.toLowerCase());
                if (subIndex !== -1) {
                    parent.children[subIndex].product_count = (parent.children[subIndex].product_count || 0) + 1;
                } else {
                    console.warn(`🛡️ Data Integrity: Product uses unknown subcategory "${subCategoryName}" in "${categoryName}".`);
                }
            }

            this.setCategories(categories);
        } catch (e) {
            console.error("🛡️ ensureCategoryExists error:", e);
        }
    }

    // --- Negotiations ---
    /** Returns all negotiations from local cache without any filtering. Used for upsert operations. */
    getNegotiationsRaw(): any[] {
        if (typeof window === "undefined") return [];
        try { return JSON.parse(localStorage.getItem(this.STORAGE_KEYS.NEGOTIATIONS) || "[]"); } catch { return []; }
    }

    getNegotiations(sellerId?: string, buyerId?: string): NegotiationRequest[] {
        if (typeof window === "undefined") return [];
        let all: any[] = [];
        try { 
            all = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.NEGOTIATIONS) || "[]"); 
        } catch (e) { 
            console.warn("Corrupted negotiations in storage", e);
        }
        
        let filtered = all;
        
        if (sellerId) {
            const products = this.getProducts({ includeInactiveSellers: true });
            const seller = this.getSellers().find(s => s.id === sellerId || s.user_id === sellerId || s.owner_email === sellerId);
            
            // Build a set of valid IDs for this seller
            const matchIds = new Set<string>([sellerId]);
            if (seller) {
                if (seller.id) matchIds.add(seller.id);
                if (seller.user_id) matchIds.add(seller.user_id);
                if (seller.owner_email) matchIds.add(seller.owner_email);
            }

            filtered = filtered.filter((n: NegotiationRequest) => {
                const product = products.find(p => p.id === n.product_id);
                const nSellerId = (n as any).seller_id || "";
                
                return matchIds.has(nSellerId) || 
                       (product?.seller_id && matchIds.has(product.seller_id));
            });
        }
        
        if (buyerId) {
            filtered = filtered.filter((n: NegotiationRequest) => n.customer_id === buyerId || ((n as any).customer_email && (n as any).customer_email === buyerId));
        }

        return filtered;
    }

    addNegotiation(request: NegotiationRequest) {
        const product = this.getProducts({ includeInactiveSellers: true }).find(p => p.id === request.product_id);
        
        // Attach seller_id to the negotiation for reliable matching
        const enrichedRequest = { 
            ...request, 
            seller_id: product?.seller_id || '',
            chat_messages: request.chat_messages || [{
                sender: "buyer",
                text: request.message || `Initial offer of ₦${(request.proposed_price || 0).toLocaleString()}`,
                timestamp: new Date().toISOString(),
                readByRecipient: false
            }]
        };
        
        const current = this.getNegotiations();
        const updated = [enrichedRequest, ...current];
        try {
            localStorage.setItem(this.STORAGE_KEYS.NEGOTIATIONS, JSON.stringify(updated));
        } catch (e) {
            console.warn("Failed to add negotiation to localStorage", e);
        }

        // Persist to Postgres (queued if offline)
        resilientFetch("/api/negotiations", { method: "POST", body: enrichedRequest, type: "general" });

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

            // Notify by seller ID (for dashboard visibility)
            this.addNotification({
                userId: product.seller_id,
                type: "negotiation",
                message: `💰 New negotiation offer for ${product.name} from ${request.customer_name}: ₦${request.proposed_price.toLocaleString()}`,
                link: "/seller/dashboard/messages"
            });
            // Also notify by email if different
            if (seller?.owner_email && seller.owner_email !== product.seller_id) {
                this.addNotification({
                    userId: seller.owner_email,
                    type: "negotiation",
                    message: `💰 New negotiation offer for ${product.name} from ${request.customer_name}: ₦${request.proposed_price.toLocaleString()}`,
                    link: "/seller/dashboard/messages"
                });
            }

            // --- CRITICAL: Send Real Email via API ---
            if (sellerEmail) {
                fetch('/api/email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        to: sellerEmail,
                        type: 'NEGOTIATION_REQUEST',
                        payload: {
                            name: seller?.business_name || "Seller",
                            customerName: request.customer_name,
                            productName: product.name,
                            amount: `₦${request.proposed_price.toLocaleString()}`,
                            dashboardUrl: `https://fairprice.ng/seller/dashboard/messages`
                        }
                    })
                }).catch(err => console.error("Negotiation email failed:", err));
            }

            // Email seller
            fetch("/api/email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    to: sellerEmail,
                    subject: `New Negotiation Offer: ${product.name}`,
                    type: "NEGOTIATION_REQUEST", 
                    payload: {
                        name: seller?.business_name || seller?.owner_name || "Seller",
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
        }

        // Also trigger storage event for other tabs
        window.dispatchEvent(new Event("storage"));
        window.dispatchEvent(new Event("sync-store-update"));
    }

    updateNegotiationStatus(id: string, status: "accepted" | "rejected" | "purchased", actor: "buyer" | "seller" = "seller") {
        const current = this.getNegotiations();
        const negotiation = current.find(n => n.id === id);
        if (!negotiation) return;

        // Only the buyer can respond to a seller's counter-offer using this path
        const isRespondingToCounter = actor === "buyer" && negotiation.status === "countered" && negotiation.counter_status === "pending";

        const updated = current.map(n => {
            if (n.id !== id) return n;
            
            const updatedNeg = { ...n };
            if (isRespondingToCounter) {
                updatedNeg.counter_status = status;
            } else {
                updatedNeg.status = status;
                // If seller accepts original offer while a counter is pending, clear the pending counter.
                if (actor === "seller" && n.status === "countered" && n.counter_status === "pending") {
                    updatedNeg.counter_status = undefined;
                }
            }

            // Append a chat message so the response is visible in the chat thread
            if (status === "accepted" || status === "rejected") {
                const existingMessages = Array.isArray(n.chat_messages) ? [...n.chat_messages] : [];
                const product = this.getProducts({ includeInactiveSellers: true }).find(p => p.id === n.product_id);
                
                let text = "";
                if (isRespondingToCounter) {
                    text = status === "accepted"
                        ? `✅ You accepted the counter offer of ₦${n.counter_price?.toLocaleString()}! 🎉\n\nYou can now proceed to checkout at the negotiated price.`
                        : `❌ You rejected the counter offer of ₦${n.counter_price?.toLocaleString()}.`;
                } else {
                    if (actor === "seller") {
                        text = status === "accepted"
                            ? `✅ Your offer of ₦${n.proposed_price.toLocaleString()} for ${product?.name || 'this item'} has been ACCEPTED! 🎉\n\nYou can now proceed to checkout at the negotiated price.`
                            : `❌ Unfortunately, your offer of ₦${n.proposed_price.toLocaleString()} for ${product?.name || 'this item'} was declined.\n\nYou can try a different offer or purchase at the listed price.`;
                    } else {
                        text = status === "accepted"
                            ? `✅ I've accepted your offer for ${product?.name || 'this item'}.`
                            : `❌ I've rejected your offer for ${product?.name || 'this item'}.`;
                    }
                }

                existingMessages.push({
                    sender: actor === "buyer" ? "buyer" as const : "seller" as const,
                    text: text,
                    timestamp: new Date().toISOString(),
                    readByRecipient: false
                });
                updatedNeg.chat_messages = existingMessages;
            }
            return updatedNeg;
        });
        localStorage.setItem(this.STORAGE_KEYS.NEGOTIATIONS, JSON.stringify(updated));

        // Let's add the resilientFetch here!
        const updatedNegRef = updated.find(n => n.id === id);
        if (updatedNegRef) {
            resilientFetch(`/api/negotiations?id=${id}`, { 
                method: "PATCH", 
                body: { 
                    id, 
                    status: updatedNegRef.status, 
                    counterStatus: updatedNegRef.counter_status,
                    chatMessages: updatedNegRef.chat_messages
                }, 
                type: "general" 
            }).catch(err => console.error("Failed to sync negotiation status:", err));
        }

        if (negotiation && (status === "accepted" || status === "rejected")) {
            const product = this.getProducts({ includeInactiveSellers: true }).find(p => p.id === negotiation.product_id);
            if (product) {
                const buyerUser = this.getUser(negotiation.customer_id);
                const buyerEmail = buyerUser?.email || `user_${negotiation.customer_id}@fairprice.ng`;
                const seller = this.getSellers().find(s => s.id === product.seller_id || s.user_id === product.seller_id);
                const sellerEmail = seller?.owner_email || `seller_${product.seller_id}@fairprice.ng`;

                if (isRespondingToCounter) {
                    // ─── BUYER is responding to the seller's counter-offer ───
                    if (status === "accepted") {
                        // Buyer ACCEPTED the counter-offer
                        this.addNotification({
                            userId: negotiation.customer_id,
                            type: "negotiation",
                            message: `🎉 You accepted the counter-offer of ₦${(negotiation.counter_price || 0).toLocaleString()} for "${product.name}". Proceed to checkout!`,
                            link: "/account/negotiations"
                        });
                        this.addNotification({
                            userId: product.seller_id,
                            type: "negotiation",
                            message: `🎉 ${negotiation.customer_name || 'Buyer'} ACCEPTED your counter-offer of ₦${(negotiation.counter_price || 0).toLocaleString()} for ${product.name}!`,
                            link: "/seller/dashboard/messages"
                        });
                        // Email buyer
                        fetch("/api/email", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                to: buyerEmail,
                                subject: `Offer Accepted: ${product.name}`,
                                type: "NEGOTIATION_ACCEPTED",
                                payload: { name: buyerUser?.name || "Customer", customerName: buyerUser?.name || "Buyer", productName: product.name, amount: `₦${(negotiation.counter_price || 0).toLocaleString()}` }
                            })
                        }).catch(console.error);
                    } else {
                        // Buyer DECLINED the counter-offer
                        this.addNotification({
                            userId: negotiation.customer_id,
                            type: "negotiation",
                            message: `You declined the counter-offer of ₦${(negotiation.counter_price || 0).toLocaleString()} for "${product.name}". You can submit a new offer or buy at the listed price.`,
                            link: "/account/negotiations"
                        });
                        this.addNotification({
                            userId: product.seller_id,
                            type: "negotiation",
                            message: `${negotiation.customer_name || 'Buyer'} declined your counter-offer of ₦${(negotiation.counter_price || 0).toLocaleString()} for ${product.name}.`,
                            link: "/seller/dashboard/messages"
                        });
                        // Email buyer — use COUNTER_OFFER_DECLINED (NOT NEGOTIATION_REJECTED)
                        fetch("/api/email", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                to: buyerEmail,
                                subject: `Counter-Offer Update: ${product.name}`,
                                type: "COUNTER_OFFER_DECLINED",
                                payload: { name: buyerUser?.name || "Customer", customerName: negotiation.customer_name || "Buyer", productName: product.name, amount: `₦${(negotiation.counter_price || 0).toLocaleString()}` }
                            })
                        }).catch(console.error);
                        // Email seller
                        fetch("/api/email", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                to: sellerEmail,
                                subject: `Counter-Offer Declined: ${product.name}`,
                                type: "COUNTER_OFFER_DECLINED",
                                payload: { name: seller?.business_name || "Seller", customerName: negotiation.customer_name || "Buyer", productName: product.name, amount: `₦${(negotiation.counter_price || 0).toLocaleString()}` }
                            })
                        }).catch(console.error);
                    }
                } else {
                    // ─── SELLER is responding to the buyer's initial offer ───
                    if (status === "accepted") {
                        this.addNotification({
                            userId: negotiation.customer_id,
                            type: "negotiation",
                            message: `🎉 Great news! The seller ACCEPTED your offer of ₦${negotiation.proposed_price.toLocaleString()} for "${product.name}"! Proceed to checkout.`,
                            link: "/account/negotiations"
                        });
                        this.addNotification({
                            userId: product.seller_id,
                            type: "negotiation",
                            message: `✅ You accepted the offer of ₦${negotiation.proposed_price.toLocaleString()} from ${negotiation.customer_name || 'a buyer'} for ${product.name}.`,
                            link: "/seller/dashboard/messages"
                        });
                        // Email buyer
                        fetch("/api/email", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                to: buyerEmail,
                                subject: `Offer Accepted: ${product.name} 🎉`,
                                type: "NEGOTIATION_ACCEPTED",
                                payload: { name: buyerUser?.name || "Customer", customerName: buyerUser?.name || "Buyer", productName: product.name, amount: `₦${negotiation.proposed_price.toLocaleString()}` }
                            })
                        }).catch(console.error);
                    } else {
                        // Seller REJECTED the buyer's initial offer
                        this.addNotification({
                            userId: negotiation.customer_id,
                            type: "negotiation",
                            message: `The seller could not accept your offer of ₦${negotiation.proposed_price.toLocaleString()} for "${product.name}". You can try a higher offer or buy at the listed price.`,
                            link: "/account/negotiations"
                        });
                        this.addNotification({
                            userId: product.seller_id,
                            type: "negotiation",
                            message: `You declined the offer of ₦${negotiation.proposed_price.toLocaleString()} from ${negotiation.customer_name || 'a buyer'} for ${product.name}.`,
                            link: "/seller/dashboard/messages"
                        });
                        // Email buyer
                        fetch("/api/email", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                to: buyerEmail,
                                subject: `Offer Update: ${product.name}`,
                                type: "NEGOTIATION_REJECTED",
                                payload: { name: buyerUser?.name || "Customer", customerName: buyerUser?.name || "Buyer", productName: product.name, amount: `₦${negotiation.proposed_price.toLocaleString()}` }
                            })
                        }).catch(console.error);
                    }
                }
            }

            // Persist status change to database
            const payload: any = { id };
            if (isRespondingToCounter) {
                payload.counterStatus = status;
                payload.chatMessages = updated.find((n: any) => n.id === id)?.chat_messages;
            } else {
                payload.status = status;
                payload.chatMessages = updated.find((n: any) => n.id === id)?.chat_messages;
            }

            fetch("/api/negotiations", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            }).catch(console.error);
        }

        window.dispatchEvent(new Event("storage"));
        window.dispatchEvent(new Event("sync-store-update"));
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
        window.dispatchEvent(new Event("sync-store-update"));

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
        window.dispatchEvent(new Event("sync-store-update"));
    }

    sendCounterOffer(id: string, price: number, message: string) {
        const current = this.getNegotiations();
        const negotiation = current.find(n => n.id === id);
        if (!negotiation) return;

        const product = this.getProducts({ includeInactiveSellers: true }).find(p => p.id === negotiation.product_id);

        const updated = current.map(n => {
            if (n.id !== id) return n;
            // Append counter-offer as a seller chat message
            const existingMessages = Array.isArray(n.chat_messages) ? [...n.chat_messages] : [];
            existingMessages.push({
                sender: "seller" as const,
                text: `💬 Counter Offer\n\nThe seller has proposed a new price of ₦${price.toLocaleString()} for ${product?.name || 'this item'}.\n\n${message ? `Seller's message: "${message}"` : ''}\n\nDo you accept this counter offer?`,
                timestamp: new Date().toISOString()
            });
            return {
                ...n,
                counter_price: price,
                counter_message: message,
                counter_status: "pending",
                status: "countered",
                chat_messages: existingMessages
            };
        });

        localStorage.setItem(this.STORAGE_KEYS.NEGOTIATIONS, JSON.stringify(updated));
        window.dispatchEvent(new Event("storage"));
        window.dispatchEvent(new Event("sync-store-update"));

        // Push to local API to ensure sync loop doesn't overwrite it
        resilientFetch(`/api/negotiations?id=${id}`, {
            method: "PATCH",
            body: {
                id,
                status: "countered",
                counterPrice: price,
                counterMessage: message || "",
                counterStatus: "pending"
            },
            type: "general"
        }).catch(err => console.error("Failed to sync counter offer:", err));

        // Notify Buyer (User)
        this.addNotification({
            userId: negotiation.customer_id,
            type: "negotiation",
            message: `💰 Counter offer of ₦${price.toLocaleString()} for "${product?.name || 'an item'}". Check your negotiations!`,
            link: "/account/negotiations"
        });

        // Persist counter-offer to database
        fetch("/api/negotiations", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                id,
                counterPrice: price,
                counterMessage: message,
                counterStatus: "pending",
                status: "countered",
                chatMessages: updated.find((n: any) => n.id === id)?.chat_messages
            })
        }).catch(console.error);
    }

    /**
     * Buyer sends a counter-counter-offer back to seller.
     * Updates the EXISTING negotiation record instead of creating a duplicate.
     */
    sendBuyerCounterOffer(negId: string, newPrice: number, message?: string) {
        const current = this.getNegotiations();
        const negotiation = current.find(n => n.id === negId);
        if (!negotiation) return;

        const product = this.getProducts({ includeInactiveSellers: true }).find(p => p.id === negotiation.product_id);
        const buyerName = negotiation.customer_name || "Buyer";

        const updated = current.map(n => {
            if (n.id !== negId) return n;
            const existingMessages = Array.isArray(n.chat_messages) ? [...n.chat_messages] : [];
            existingMessages.push({
                sender: "buyer" as const,
                text: `🤝 Counter-Offer\n\nI'd like to propose ₦${newPrice.toLocaleString()} for ${product?.name || 'this item'}.${message ? `\n\nMessage: "${message}"` : ''}`,
                timestamp: new Date().toISOString(),
                readByRecipient: false,
                negotiation: { 
                    type: "countered", 
                    productId: negotiation.product_id, 
                    counterPrice: newPrice, 
                    productName: product?.name || 'Product',
                    originalPrice: negotiation.proposed_price || newPrice
                }
            });
            return {
                ...n,
                proposed_price: newPrice,
                status: "pending",
                counter_status: null,
                counter_price: null,
                counter_message: null,
                chat_messages: existingMessages,
                updated_at: new Date().toISOString()
            };
        });

        localStorage.setItem(this.STORAGE_KEYS.NEGOTIATIONS, JSON.stringify(updated));
        const updatedNeg = updated.find(n => n.id === negId);
        
        // Mark as pending to prevent sync overwrite
        this._pendingNegotiationEdits.add(negId);
        try { localStorage.setItem(this._PENDING_NEGOTIATION_KEY, JSON.stringify([...this._pendingNegotiationEdits])); } catch {}

        // Persist to Postgres
        fetch("/api/negotiations", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                id: negId,
                status: "pending",
                proposedPrice: newPrice,
                counterPrice: null,
                counterMessage: null,
                counterStatus: null, // Ensure previous seller counter is cleared in DB
                chatMessages: updatedNeg?.chat_messages
            })
        }).then(res => {
            if (res.ok) {
                this._pendingNegotiationEdits.delete(negId);
                try { localStorage.setItem(this._PENDING_NEGOTIATION_KEY, JSON.stringify([...this._pendingNegotiationEdits])); } catch {}
            }
        }).catch(console.error);

        // Notify Seller
        if (product && product.seller_id) {
            const seller = this.getSellers().find(s => s.id === product.seller_id || s.user_id === product.seller_id);
            this.addNotification({
                userId: product.seller_id,
                type: "negotiation",
                message: `💰 ${buyerName} sent a counter-offer of ₦${newPrice.toLocaleString()} for ${product.name}`,
                link: "/seller/dashboard/messages"
            });
            if (seller?.owner_email && seller.owner_email !== product.seller_id) {
                this.addNotification({
                    userId: seller.owner_email,
                    type: "negotiation",
                    message: `💰 ${buyerName} sent a counter-offer of ₦${newPrice.toLocaleString()} for ${product.name}`,
                    link: "/seller/dashboard/messages"
                });
            }

            // Email seller
            const sellerEmail = seller?.owner_email || `seller_${product.seller_id}@fairprice.ng`;
            fetch("/api/email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    to: sellerEmail,
                    subject: `Counter-Offer Received: ${product.name}`,
                    type: "NEGOTIATION_REQUEST",
                    payload: {
                        name: seller?.business_name || seller?.owner_name || "Seller",
                        customerName: buyerName,
                        productName: product.name,
                        amount: `₦${newPrice.toLocaleString()}`
                    }
                })
            }).catch(console.error);
        }

        // Notify buyer confirmation
        this.addNotification({
            userId: negotiation.customer_id,
            type: "negotiation",
            message: `✅ Your counter-offer of ₦${newPrice.toLocaleString()} for "${product?.name || 'Product'}" has been sent!`,
            link: "/account/negotiations"
        });

        window.dispatchEvent(new Event("storage"));
        window.dispatchEvent(new Event("sync-store-update"));
    }

    /**
     * Buyer accepts or rejects a COUNTER-OFFER from the seller.
     * Updates counter_status specifically (not the base status).
     */
    updateCounterStatus(negId: string, counterStatus: "accepted" | "rejected") {
        const current = this.getNegotiations();
        const negotiation = current.find(n => n.id === negId);
        if (!negotiation) return;

        const product = this.getProducts({ includeInactiveSellers: true }).find(p => p.id === negotiation.product_id);

        const updated = current.map(n => {
            if (n.id !== negId) return n;
            const existingMessages = Array.isArray(n.chat_messages) ? [...n.chat_messages] : [];
            existingMessages.push({
                sender: "buyer" as const,
                text: counterStatus === "accepted"
                    ? `✅ I accept the counter-offer of ₦${n.counter_price?.toLocaleString()} for ${product?.name || 'this item'}! Proceeding to checkout.`
                    : `❌ I've declined the counter-offer of ₦${n.counter_price?.toLocaleString()} for ${product?.name || 'this item'}.`,
                timestamp: new Date().toISOString()
            });
            return {
                ...n,
                counter_status: counterStatus,
                status: counterStatus === "accepted" ? "accepted" : n.status,
                chat_messages: existingMessages,
                updated_at: new Date().toISOString()
            };
        });

        localStorage.setItem(this.STORAGE_KEYS.NEGOTIATIONS, JSON.stringify(updated));

        // Persist to Postgres
        fetch("/api/negotiations", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                id: negId,
                status: counterStatus === "accepted" ? "accepted" : "countered",
            })
        }).catch(console.error);

        // Notify Seller
        if (product && product.seller_id) {
            const seller = this.getSellers().find(s => s.id === product.seller_id || s.user_id === product.seller_id);
            this.addNotification({
                userId: product.seller_id,
                type: "negotiation",
                message: counterStatus === "accepted"
                    ? `🎉 ${negotiation.customer_name || 'Buyer'} ACCEPTED your counter-offer of ₦${negotiation.counter_price?.toLocaleString()} for ${product.name}!`
                    : `${negotiation.customer_name || 'Buyer'} declined your counter-offer for ${product.name}.`,
                link: "/seller/dashboard/messages"
            });

            // Email seller
            const sellerEmail = seller?.owner_email || `seller_${product.seller_id}@fairprice.ng`;
            fetch("/api/email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    to: sellerEmail,
                    subject: counterStatus === "accepted"
                        ? `Counter-Offer Accepted: ${product.name}`
                        : `Counter-Offer Declined: ${product.name}`,
                    type: counterStatus === "accepted" ? "NEGOTIATION_ACCEPTED" : "COUNTER_OFFER_DECLINED",
                    payload: {
                        name: seller?.business_name || "Seller",
                        customerName: negotiation.customer_name || "Buyer",
                        productName: product.name,
                        amount: `₦${(negotiation.counter_price || 0).toLocaleString()}`,
                        dashboardUrl: `https://fairprice.ng/seller/dashboard/messages?customer=${negotiation.customer_id}&order=${negotiation.id}`
                    }
                })
            }).catch(console.error);
        }

        // Notify buyer
        this.addNotification({
            userId: negotiation.customer_id,
            type: "negotiation",
            message: counterStatus === "accepted"
                ? `🎉 You accepted the counter-offer of ₦${(negotiation.counter_price || 0).toLocaleString()} for "${product?.name || 'Product'}". Proceed to checkout!`
                : `You declined the counter-offer for "${product?.name || 'Product'}".`,
            link: "/account/negotiations"
        });

        window.dispatchEvent(new Event("storage"));
        window.dispatchEvent(new Event("sync-store-update"));
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
        if (typeof window === "undefined") return null;
        const user = this.getCurrentUser();
        if (user) return user.id;
        
        // Fallback to persistent guest ID
        return this.getOrInitializeGuestId();
    }

    getOrInitializeGuestId(): string {
        if (typeof window === "undefined") return "guest";
        
        let guestId = localStorage.getItem("fp_guest_id");
        if (!guestId) {
            // Unify with AuthContext pattern: gst_<timestamp>_<random_string>
            guestId = `gst_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
            localStorage.setItem("fp_guest_id", guestId);
            
            // Also initialize a matching guest name if not already set
            if (!localStorage.getItem("fp_guest_name")) {
                localStorage.setItem("fp_guest_name", "Guest Buyer");
            }
            console.log(`👤 SyncStore: Initialized unique guest identity: ${guestId}`);
        }
        return guestId;
    }

    logout() {
        localStorage.removeItem(this.STORAGE_KEYS.CURRENT_SELLER);
        localStorage.removeItem(this.STORAGE_KEYS.NEGOTIATIONS);
        localStorage.removeItem(this.STORAGE_KEYS.SUPPORT_MESSAGES);
        localStorage.removeItem(this.STORAGE_KEYS.ORDERS);
        localStorage.removeItem(this.STORAGE_KEYS.NOTIFICATIONS);
        localStorage.removeItem("fp_conversations");
        localStorage.removeItem("fp_chat_messages");
        
        // CRITICAL: Clear guest IDs on logout to prevent "inheritance" by the next user
        localStorage.removeItem("fp_guest_id");
        localStorage.removeItem("fp_guest_name");
        localStorage.removeItem("fp-cart-guest");
        
        window.dispatchEvent(new Event("storage"));
    }

    updateSeller(id: string, updates: Partial<Seller>) {
        const sellers = this.getSellers();
        const updatedSeller = sellers.find(s => s.id === id);
        if (!updatedSeller) return;

        // 🛡️ INFINITE LOOP GUARD: Dirty check for trust_score
        // If we're only updating trust_score and it hasn't changed, skip everything.
        // This stops the recalculateTrustScore -> updateSeller -> sync-store-update -> loadData loop.
        const keys = Object.keys(updates);
        if (keys.length === 1 && keys[0] === 'trust_score' && updatedSeller.trust_score === updates.trust_score) {
            return;
        }

        const mergedSeller = { ...updatedSeller, ...updates };
        const updated = sellers.map(s => s.id === id ? mergedSeller : s);

        // Mark as pending BEFORE writing — protects from syncWithDB overwrite
        if (!this._pendingSellerEdits.has(id)) {
            this._pendingSellerEdits.add(id);
        }
        try { localStorage.setItem(this._PENDING_SELLER_KEY, JSON.stringify([...this._pendingSellerEdits])); } catch { /* quota */ }

        localStorage.setItem(this.STORAGE_KEYS.SELLERS, JSON.stringify(updated));
        
        // Only dispatch if something actually changed (beyond the guard above)
        window.dispatchEvent(new Event("storage"));
        window.dispatchEvent(new Event("sync-store-update"));

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

    getPlatformSettings() {
        if (typeof window === "undefined") return { default_commission_rate: 0.05, categories: {}, price_tiers: [] };
        const stored = localStorage.getItem(this.STORAGE_KEYS.PLATFORM_SETTINGS);
        if (!stored) {
            const defaults = {
                default_commission_rate: 0.05,
                categories: {
                    "solar": 0.03,
                    "energy": 0.03,
                    "cars": 0.02
                },
                price_tiers: [
                    { min: 1000000, rate: 0.03 },
                    { min: 5000000, rate: 0.02 }
                ]
            };
            localStorage.setItem(this.STORAGE_KEYS.PLATFORM_SETTINGS, JSON.stringify(defaults));
            return defaults;
        }
        return JSON.parse(stored);
    }

    getSellerCommissionRate(seller: Seller, product?: Product): number {
        // 1. Admin direct override on seller (highest priority for personalized deals)
        if (seller.commission_rate !== undefined) {
            return seller.commission_rate;
        }

        const settings = this.getPlatformSettings();

        // 2. Product-specific logic
        if (product) {
            // Category-specific overrides
            if (product.category && settings.categories[product.category] !== undefined) {
                return settings.categories[product.category];
            }

            // Price-tier logic (e.g. high-value items have lower %)
            if (settings.price_tiers && settings.price_tiers.length > 0) {
                // Sort by min descending to find the highest matching tier
                const sortedTiers = [...settings.price_tiers].sort((a, b) => b.min - a.min);
                const tier = sortedTiers.find(t => product.price >= t.min);
                if (tier) return tier.rate;
            }
        }

        // 3. Legacy Plan-based logic (can be phased out or used as secondary fallback)
        const plan = seller.subscription_plan || "Starter";
        if (plan === "Starter") return settings.default_commission_rate; 
        if (plan === "Pro") return 0.03;         // pro tier lowered 
        if (plan === "Growth" || plan === "Scale") return 0.01; // lowest possible

        return settings.default_commission_rate; 
    }

    /**
     * Dynamically recalculates a seller's trust score based on:
     * - Confirmed/delivered orders (+2 each, capped at +20)
     * - Average review rating (5★ = +10, 1★ = -15)
     * - Disputed orders (-5 each, capped at -20)
     * Base is 80. Range is clamped to 0–100.
     */
    /**
     * Re-calculate trust score based on:
     * - Order success/delivery (+2 each, cap +30)
     * - Average review stars (-10 to +15)
     * - Disputed orders (-5 each, cap -20)
     * - Negotiation Acceptance Rate (+5 for >80%, -5 for <40%)
     * Base is 75. Range is clamped to 0–100.
     */
    recalculateTrustScore(sellerId: string): number {
        const BASE = 75;
        const orders = this.getOrders().filter(o => o.seller_id === sellerId);
        const reviews: any[] = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.REVIEWS) || "[]");
        const negotiations = this.getNegotiations().filter(n => n.seller_id === sellerId);

        // 1. Delivery Bonus (+2 per confirmed delivery, capped at +30)
        const confirmedOrders = orders.filter(o =>
            o.status === "delivered" || o.escrow_status === "released" || o.status === "shipped"
        );
        const deliveryBonus = Math.min(confirmedOrders.length * 2, 30);

        // 2. Rating Bonus (Scale: 1★ → -10, 3★ → 0, 5★ → +15)
        const products = this.getProducts({ includeInactiveSellers: true }).filter(p => p.seller_id === sellerId);
        const productIds = new Set(products.map(p => p.id));
        const sellerReviews = reviews.filter((r: any) => productIds.has(r.product_id));
        let ratingBonus = 0;
        if (sellerReviews.length > 0) {
            const avgRating = sellerReviews.reduce((sum: number, r: any) => sum + (r.rating || 0), 0) / sellerReviews.length;
            ratingBonus = Math.max(-10, Math.min(15, Math.round((avgRating - 3) * 7.5)));
        }

        // 3. Dispute Penalty (-5 per disputed order, capped at -20)
        const disputedOrders = orders.filter(o => o.escrow_status === "disputed");
        const disputePenalty = Math.min(disputedOrders.length * 5, 20);

        // 4. Negotiation Acceptance Bonus/Penalty
        let negotiationBonus = 0;
        if (negotiations.length >= 5) {
            const accepted = negotiations.filter(n => n.status === "accepted").length;
            const acceptanceRate = (accepted / negotiations.length) * 100;
            if (acceptanceRate >= 80) negotiationBonus = 5;
            else if (acceptanceRate < 40) negotiationBonus = -5;
        }

        const score = Math.max(0, Math.min(100, BASE + deliveryBonus + ratingBonus + negotiationBonus - disputePenalty));

        // Persist the updated score back to the local record
        this.updateSeller(sellerId, { trust_score: score });

        return score;
    }

    updateSellerCoverImage(id: string, url: string) {
        this.updateSeller(id, { cover_image_url: url });
    }

    // --- Deals Management ---
    getDeals(): Deal[] {
        if (typeof window === "undefined") return [];
        const stored = localStorage.getItem(this.STORAGE_KEYS.DEALS);
        if (!stored) return [];
        
        try {
            const deals: Deal[] = JSON.parse(stored);
            const now = new Date().getTime();
            
            // Auto-cleanup expired deals
            const validDeals = deals.filter(d => {
                if (!d.end_at) return true;
                return new Date(d.end_at).getTime() > now;
            });
            
            if (validDeals.length !== deals.length) {
                localStorage.setItem(this.STORAGE_KEYS.DEALS, JSON.stringify(validDeals));
            }
            
            return validDeals;
        } catch {
            return [];
        }
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
        window.dispatchEvent(new Event("sync-store-update")); // Ensure global sync
    }

     removeDeal(dealId: string) {
        if (typeof window === "undefined") return;
        const stored = localStorage.getItem(this.STORAGE_KEYS.DEALS);
        if (!stored) return;
        const current: any[] = JSON.parse(stored);
        const updated = current.filter(d => d.id !== dealId);
        localStorage.setItem(this.STORAGE_KEYS.DEALS, JSON.stringify(updated));
        window.dispatchEvent(new Event("storage"));
        window.dispatchEvent(new Event("sync-store-update"));
    }

    removeDealByProductId(productId: string) {
        if (typeof window === "undefined") return;
        const stored = localStorage.getItem(this.STORAGE_KEYS.DEALS);
        if (!stored) return;
        const current: any[] = JSON.parse(stored);
        const updated = current.filter(d => (d.product_id || d.productId) !== productId);
        localStorage.setItem(this.STORAGE_KEYS.DEALS, JSON.stringify(updated));
        window.dispatchEvent(new Event("storage"));
        window.dispatchEvent(new Event("sync-store-update"));
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

    // --- Restock Subscriptions ---
    getRestockSubscriptions(): { productId: string, userId: string, userEmail?: string, timestamp: string }[] {
        if (typeof window === "undefined") return [];
        return JSON.parse(localStorage.getItem(this.STORAGE_KEYS.RESTOCK_SUBSCRIPTIONS) || "[]");
    }

    addRestockSubscription(productId: string, userId: string, userEmail?: string) {
        if (typeof window === "undefined") return;
        const subs = this.getRestockSubscriptions();
        if (!subs.some(s => s.productId === productId && s.userId === userId)) {
            subs.push({ productId, userId, userEmail, timestamp: new Date().toISOString() });
            localStorage.setItem(this.STORAGE_KEYS.RESTOCK_SUBSCRIPTIONS, JSON.stringify(subs));
            window.dispatchEvent(new Event("sync-store-update"));
        }
    }

    removeRestockSubscriptionsByProduct(productId: string) {
        if (typeof window === "undefined") return;
        const subs = this.getRestockSubscriptions().filter(s => s.productId !== productId);
        localStorage.setItem(this.STORAGE_KEYS.RESTOCK_SUBSCRIPTIONS, JSON.stringify(subs));
    }

    // --- Getters ---
    getProducts(options?: { includeInactiveSellers?: boolean }): Product[] {
        if (typeof window === "undefined") return [];
        const stored = localStorage.getItem(this.STORAGE_KEYS.PRODUCTS);
        let allProducts: Product[] = [];
        try {
            allProducts = stored ? JSON.parse(stored) : [];
        } catch {
            console.warn("Corrupted products in localStorage — resetting.");
            localStorage.removeItem(this.STORAGE_KEYS.PRODUCTS);
        }

        // Optimization: Create a seller map for O(1) lookups
        const allSellers = this.getSellers();
        const sellerMap = new Map();
        allSellers.forEach((s: any) => {
            if (s.id) sellerMap.set(s.id, s);
            if (s.userId || s.user_id) sellerMap.set(s.userId || s.user_id, s);
        });

        const deletedStubs = this.getDeletedStubs();
        const derivedProducts = allProducts
            .filter((p: Product) => !deletedStubs.includes(p.id))
            .map((p: Product) => {
                const seller = sellerMap.get(p.seller_id);
                if (seller && (p.seller_name === "My Store" || !p.seller_name)) {
                    return { ...p, seller_name: seller.business_name || seller.owner_name || "FairPrice Seller" };
                }
                return p;
            });

        if (options?.includeInactiveSellers) return derivedProducts;

        // By default, filter out products belonging to inactive/unverified sellers 
        // to prevent unapproved sellers from showing up in global search or catalogs.
        const user = this.getCurrentUser();
        const activeSellerIds = new Set<string>();
        allSellers.forEach((s: any) => {
            // Handle both camelCase (from DB API) and snake_case (from localStorage)
            const kycStatus = s.kycStatus || s.kyc_status;
            const userId = s.userId || s.user_id;
            const ownerEmail = s.ownerEmail || s.owner_email;
            
            const isVerified = s.status === "active" || s.verified || kycStatus === "approved" || s.id === "global-partners";
            const isOwner = user && (user.id === userId || user.email === ownerEmail);
            const isAdmin = user?.role === "admin";

            if (isVerified || isOwner || isAdmin) {
                if (s.id) activeSellerIds.add(s.id);
                if (userId) activeSellerIds.add(userId);
            }
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
        const products = this.getProducts();
        
        // 1. Admin Curated (Fire Button)
        const curated = products.filter(p => p.is_trending);
        
        // 2. Intelligent Organically Trending (High Demand, High Sold Count/Reviews)
        const organic = products
            .filter(p => !p.is_trending && p.is_active && (p.sold_count > 10 || p.review_count > 5))
            .sort((a, b) => (b.sold_count * 2 + b.review_count) - (a.sold_count * 2 + a.review_count))
            .slice(0, 15); // Top 15 organic trending
            
        // Combine and map to IDs
        return [...curated, ...organic].map(p => p.id);
    }

    async toggleTrending(productId: string): Promise<boolean> {
        const products = this.getProducts();
        const product = products.find(p => p.id === productId);
        let newStatus = false;

        if (product) {
            product.is_trending = !product.is_trending;
            newStatus = product.is_trending;
            window.dispatchEvent(new Event("sync-store-update"));
        }

        try {
            const res = await fetch(`/api/products/${productId}/trending`, { method: "POST" });
            if (res.ok) {
                const data = await res.json();
                if (product) {
                    product.is_trending = data.isTrending;
                    newStatus = data.isTrending;
                    localStorage.setItem(this.STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
                    window.dispatchEvent(new Event("sync-store-update"));
                }
            } else {
                if (product) {
                    product.is_trending = !newStatus;
                    window.dispatchEvent(new Event("sync-store-update"));
                }
            }
        } catch (error) {
            console.error("Failed to toggle trending", error);
            if (product) {
                product.is_trending = !newStatus;
                window.dispatchEvent(new Event("sync-store-update"));
            }
        }
        return newStatus;
    }

    async toggleSponsored(productId: string): Promise<boolean> {
        const products = this.getProducts();
        const product = products.find(p => p.id === productId);
        let newStatus = false;

        if (product) {
            product.is_sponsored = !product.is_sponsored;
            newStatus = product.is_sponsored;
            window.dispatchEvent(new Event("sync-store-update"));
        }

        try {
            const res = await fetch(`/api/products/${productId}/sponsored`, { method: "POST" });
            if (res.ok) {
                const data = await res.json();
                if (product) {
                    product.is_sponsored = data.isSponsored;
                    newStatus = data.isSponsored;
                    window.dispatchEvent(new Event("sync-store-update"));
                }
            } else {
                if (product) {
                    product.is_sponsored = !newStatus;
                    window.dispatchEvent(new Event("sync-store-update"));
                }
            }
        } catch (error) {
            console.error("Failed to toggle sponsored", error);
            if (product) {
                product.is_sponsored = !newStatus;
                window.dispatchEvent(new Event("sync-store-update"));
            }
        }
        return newStatus;
    }

    /** Fuzzy match: find cached products across ALL queries that strictly match tokens */
    /** Fuzzy match: find cached products across ALL queries that strictly match tokens */
    searchCacheFuzzyMatch(query: string): any[] {
        if (typeof window === "undefined") return [];
        
        // Fallback to empty object if cache is missing to avoid crashes
        const cache = this._getSearchCache() || {};
        const tokens = query.toLowerCase().trim().split(/\s+/).filter(t => t.length > 1);

        // If query is empty or too short, don't show random cache items
        if (tokens.length === 0) return [];

        const results: any[] = [];
        const seenIds = new Set<string>();

        Object.values(cache).forEach((products) => {
            // CRITICAL FIX: Ensure 'products' is an array before iterating.
            // This prevents the "e.forEach is not a function" error.
            if (Array.isArray(products)) {
                products.forEach(p => {
                    if (!p || !p.id || seenIds.has(p.id)) return;
                    
                    const name = (p.name || '').toLowerCase();
                    const category = (p.category || '').toLowerCase();

                    // Ensure ALL typed words exist in either the product name or category
                    const matchesAll = tokens.every(t => name.includes(t) || category.includes(t));

                    if (matchesAll) {
                        results.push(p);
                        seenIds.add(p.id);
                    }
                });
            }
        });

        // Return max 4 most relevant (sorted by name length to prefer tighter matches)
        return results.sort((a, b) => (a.name?.length || 0) - (b.name?.length || 0)).slice(0, 4);
    }

    /** Direct access to the raw search cache */
    getAllSearchCache(): Record<string, any[]> {
        return this._getSearchCache() || {};
    }

    /** Flat list of all cached products (crucial for Admin view stability) */
    getAllCachedProducts(): any[] {
        const cache = this._getSearchCache() || {};
        const seen = new Set<string>();
        const all: any[] = [];

        Object.values(cache).forEach((products) => {
            // DEFENSIVE FIX: Guard against non-array values sitting in the store
            if (Array.isArray(products)) {
                products.forEach(p => {
                    if (p && p.id && !seen.has(p.id)) {
                        seen.add(p.id);
                        all.push(p);
                    }
                });
            }
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
        window.dispatchEvent(new Event("sync-store-update"));
    }

    /** Promote a cached product into the main catalog */
    promoteFromCache(productId: string, persist: boolean = true): Product | null {
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
        this.addRawProduct(product as Product, persist);
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
        window.dispatchEvent(new Event("sync-store-update"));
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

        sellers.forEach((s: any) => {
            // Handle both camelCase (from DB API) and snake_case (from localStorage)
            const status = s.status;
            const verified = s.verified;
            const kycStatus = s.kycStatus || s.kyc_status;
            const userId = s.userId || s.user_id;
            
            if (status === "active" || verified === true || kycStatus === "approved") {
                if (s.id) approvedIds.add(s.id);
                if (userId) approvedIds.add(userId);
            }
        });

        return products.filter(p => p.is_active !== false && approvedIds.has(p.seller_id));
    }

    getSellers(): Seller[] {
        if (typeof window === "undefined") return [];
        const stored = localStorage.getItem(this.STORAGE_KEYS.SELLERS);
        return stored ? JSON.parse(stored) : [];
    }

    async addSeller(seller: Seller) {
        if (this._isRegisteringSeller) return;
        
        // Final guard: check if we already have this seller or are currently building it
        const existing = this.getSellers();
        if (existing.some(s => s.user_id === seller.user_id || s.id === seller.id)) return;

        // Persistent lock to prevent cross-tab/re-reload loops
        const lockKey = `fairprice_reg_lock_${seller.user_id || seller.id}`;
        const lastAttempt = localStorage.getItem(lockKey);
        if (lastAttempt && Date.now() - parseInt(lastAttempt) < 10000) {
            console.log("Registration locked - attempt too recent");
            return;
        }
        localStorage.setItem(lockKey, Date.now().toString());

        this._isRegisteringSeller = true;
        const sellers = this.getSellers();
        sellers.push(seller);
        localStorage.setItem(this.STORAGE_KEYS.SELLERS, JSON.stringify(sellers));
        window.dispatchEvent(new Event("storage"));
        window.dispatchEvent(new Event("sync-store-update"));

        try {
            await resilientFetch("/api/sellers", { method: "POST", body: seller, type: "registration" });
        } catch (e) {
            console.error("Seller registration failed, queued for later:", e);
        } finally {
            this._isRegisteringSeller = false;
        }

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
        window.dispatchEvent(new Event("sync-store-update"));
    }

    getOrders(): Order[] {
        if (typeof window === "undefined") return [];
        const DEMO_PATTERNS = ["FP-DEMO", "TEST-", "mock_", "demo_"];
        const allOrders: Order[] = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.ORDERS) || "[]")
            .filter((o: any) => !DEMO_PATTERNS.some(p => String(o.id).includes(p)));
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

    addOrder(order: Omit<Order, "created_at" | "updated_at" | "product">, sourceProduct?: Product): Order {
        const products = this.getProducts();
        const product = products.find(p => p.id === order.product_id) || sourceProduct;
        if (!product) throw new Error("Product not found");

        const orderId = order.id || `ORDER-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;

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
            escrow_status: "held" as const,
            discount_id: (order as any).discount_id,
            zivaActive: true,
            chat_messages: [
                {
                    id: Date.now().toString(),
                    sender: "ziva",
                    text: `Hello ${customerName.split(" ")[0]}! I'm Ziva, your AI Concierge for order #${orderId}. I'll keep you updated on tracking info and coordinate with ${product.seller_name || "the seller"} if you have any questions. How can we help?`,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }
            ]
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

        // ─── STOCK DEDUCTION & RESTOCK ALERTS ───
        const orderQty = (order as any).quantity || 1;
        const currentStock = product.stock ?? 999;
        const newStock = Math.max(0, currentStock - orderQty);
        this.updateProduct(product.id, { stock: newStock, sold_count: (product.sold_count || 0) + orderQty });

        // Low stock alert (≤ 3 remaining)
        if (newStock > 0 && newStock <= 3 && seller) {
            this.addNotification({
                userId: seller.owner_email || seller.id,
                type: "order",
                message: `⚠️ Low Stock Alert: "${product.name}" has only ${newStock} unit${newStock > 1 ? 's' : ''} left. Consider restocking soon.`,
                link: "/seller/dashboard"
            });
        }

        // Out of stock alert (0 remaining)
        if (newStock === 0 && seller) {
            this.addNotification({
                userId: seller.owner_email || seller.id,
                type: "order",
                message: `🚨 Out of Stock: "${product.name}" is now sold out (0 units). Restock immediately to avoid lost sales.`,
                link: "/seller/dashboard"
            });

            // Email seller about restock
            if (seller.owner_email) {
                fetch("/api/email", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        to: seller.owner_email,
                        type: "SELLER_NEW_ORDER",
                        payload: {
                            orderId: orderId,
                            productName: `⚠️ RESTOCK NEEDED: ${product.name}`,
                            businessName: seller.business_name || "Seller",
                            amount: 0,
                            dashboardUrl: `https://fairprice.ng/seller/dashboard`
                        }
                    })
                }).catch(console.error);
            }

            // Notify admin
            this.addNotification({
                userId: "admin",
                type: "order",
                message: `📦 Stock Depleted: "${product.name}" from ${seller?.business_name} is now at 0 units.`,
                link: "/admin/products"
            });
        }

        window.dispatchEvent(new Event("storage"));
        // Custom event so we can listen specifically for this
        window.dispatchEvent(new Event("sync-store-update"));
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

    addOrderMessage(orderId: string, sender: string, text: string, imageUrl?: string, imageUrls?: string[], replyTo?: { sender: string; text: string }) {
        const orders = this.getOrders();

        const updated = orders.map(o => {
            if (o.id === orderId || o.tracking_id === orderId) {
                const msg = {
                    id: Date.now().toString(),
                    sender,
                    text,
                    replyTo,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    imageUrl,
                    imageUrls // Support multiple images
                };

                return {
                    ...o,
                    chat_messages: [...(o.chat_messages || []), msg],
                    zivaActive: sender === 'ziva' ? true : (sender === 'system' ? o.zivaActive : false),
                    unread_admin: sender === 'user' || (sender === 'ziva' && text.includes('ESCALATION'))
                };
            }
            return o;
        });

        localStorage.setItem(this.STORAGE_KEYS.ORDERS, JSON.stringify(updated));

        // CRITICAL: Push to DB immediately for Concierge messages to ensure persistence and notifications
        fetch("/api/orders/sync-messages", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId, sender, text, imageUrl, imageUrls, replyTo })
        }).catch(err => console.error("Message sync failed:", err));

        // Notifications: route messages to the right participants
        if (sender !== 'system') {
            const order = orders.find(o => o.id === orderId);
            const msgPreview = text.length > 50 ? text.substring(0, 47) + '...' : text;

            if (sender === 'user') {
                // Customer sent: notify both admin and seller
                this.addNotification({
                    userId: 'admin',
                    type: 'order',
                    message: `💬 Customer message on order #${orderId}: "${msgPreview}"`,
                    link: `/admin/inbox/orders?order=${orderId}`
                });
                if (order?.seller_id) {
                    this.addNotification({
                        userId: order.seller_id,
                        type: 'order',
                        message: `💬 Customer message on order #${orderId}: "${msgPreview}"`,
                        link: `/seller/dashboard/messages?order=${orderId}`
                    });

                    // --- Send Email to Seller ---
                    const seller = this.getSellers().find(s => s.id === order.seller_id || s.user_id === order.seller_id);
                    const sellerEmail = seller?.owner_email || this.getUser(order.seller_id)?.email;
                    if (sellerEmail) {
                        fetch('/api/email', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                to: sellerEmail,
                                type: 'ORDER_INQUIRY',
                                payload: {
                                    sellerName: seller?.business_name || "Seller",
                                    orderId: order.id,
                                    message: text,
                                    dashboardUrl: `https://fairprice.ng/seller/dashboard/messages?order=${orderId}`
                                }
                            })
                        }).catch(() => {});
                    }
                }
            } else if (sender === 'admin') {
                // Admin sent: notify customer and seller
                if (order?.customer_id) {
                    const customerUser = this.getUser(order.customer_id);
                    const customerEmail = customerUser?.email || (order.customer_id.includes('@') ? order.customer_id : undefined);
                    
                    this.addNotification({
                        userId: order.customer_id,
                        type: 'order',
                        message: `💬 Admin replied to your order #${orderId}`,
                        link: `/account/orders?orderId=${orderId}&openConcierge=true`
                    });

                    if (customerEmail) {
                        fetch('/api/email', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                to: customerEmail,
                                type: 'BUYER_ORDER_MESSAGE',
                                payload: {
                                    name: customerUser?.name || "Customer",
                                    sellerName: "FairPrice Support",
                                    orderId: orderId,
                                    message: text,
                                    dashboardUrl: `https://fairprice.ng/account/orders?orderId=${orderId}&openConcierge=true`
                                }
                            })
                        }).catch(() => {});
                    }
                }
                if (order?.seller_id) {
                    this.addNotification({
                        userId: order.seller_id,
                        type: 'order',
                        message: `💬 Admin message on order #${orderId}: "${msgPreview}"`,
                        link: `/seller/dashboard/messages?order=${orderId}`
                    });
                }
            } else if (sender === 'seller') {
                // Seller sent: notify customer and admin
                if (order?.customer_id) {
                    const customerUser = this.getUser(order.customer_id);
                    const customerEmail = customerUser?.email || (order.customer_id.includes('@') ? order.customer_id : undefined);
                    const seller = this.getSellers().find(s => s.id === order.seller_id);

                    this.addNotification({
                        userId: order.customer_id,
                        type: 'order',
                        message: `💬 Seller replied to your order #${orderId}`,
                        link: `/account/orders?orderId=${orderId}&openConcierge=true`
                    });

                    if (customerEmail) {
                        fetch('/api/email', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                to: customerEmail,
                                type: 'BUYER_ORDER_MESSAGE',
                                payload: {
                                    name: customerUser?.name || "Customer",
                                    sellerName: seller?.business_name || "the Seller",
                                    orderId: orderId,
                                    message: text,
                                    dashboardUrl: `https://fairprice.ng/account/orders?orderId=${orderId}&openConcierge=true`
                                }
                            })
                        }).catch(() => {});
                    }
                }
                this.addNotification({
                    userId: 'admin',
                    type: 'order',
                    message: `💬 Seller replied on order #${orderId}: "${msgPreview}"`,
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
        window.dispatchEvent(new Event("sync-store-update"));
    }

    markOrderReadAsAdmin(orderId: string) {
        const orders = this.getOrders();
        const updated = orders.map(o => o.id === orderId ? { ...o, unread_admin: false } : o);
        localStorage.setItem(this.STORAGE_KEYS.ORDERS, JSON.stringify(updated));
        window.dispatchEvent(new Event("storage"));
        window.dispatchEvent(new Event("sync-store-update"));
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
        window.dispatchEvent(new Event("sync-store-update"));
        return newProduct;
    }

    addRawProduct(product: Product, persist: boolean = true) {
        if (typeof window === "undefined") return;

        // Canonical Taxonomy Normalization
        const { category, subcategory } = this.normalizeCategory(product.category, product.subcategory || "");
        product.category = category as ProductCategory;
        product.subcategory = subcategory;

        // Enforce 50-character limit for GMC compliance on all newly added products
        if (product.id.length > 50) {
            product.id = product.id.slice(0, 50).replace(/-+$/, "");
        }
        let products = this.getProducts();

        // ─── LOGICAL DUPLICATE PREVENTION ───
        // If this is a new product creation (not an update to existing ID), 
        // reject if an identical product from the same seller was added within the last 30 seconds.
        const isNewCreation = !products.some(p => p.id === product.id);
        if (isNewCreation && persist) {
            const logicalDuplicate = products.find(p => 
                p.name === product.name && 
                p.price === product.price && 
                p.seller_id === product.seller_id &&
                (new Date().getTime() - new Date(p.created_at).getTime() < 30000)
            );
            if (logicalDuplicate) {
                console.warn(`🛡️ Resilience: Rejected logical duplicate for "${product.name}" from ${product.seller_id}`);
                return logicalDuplicate;
            }
        }

        const existingIdx = products.findIndex(p => p.id === product.id);
        
        // ─── PERSISTENT DELETION BLOCK ───
        // If this product was explicitly deleted by the user, do NOT allow it to be re-added
        // via automated search or global discovery.
        const deletedStubs = this.getDeletedStubs();
        if (deletedStubs.includes(product.id)) {
            console.warn(`🛡️ Resilience: Blocked re-addition of deleted product ${product.id}`);
            return null; 
        }

        if (existingIdx >= 0) {
            const existing = products[existingIdx];
            
            // ─── DATA INTEGRITY LOCKING (ANTI-HALLUCINATION) ───
            // If the product is a high-value car (price > 5M) or already has a valid image, 
            // DO NOT allow an automated search-cache result to downgrade it with a hallucinated price or placeholder image.
            const isIncomingFromSearch = product.id.startsWith('global-') || product.id.startsWith('__global_') || !persist;
            
            if (isIncomingFromSearch) {
                // 1. Price Floor Lock: If existing is > 5M and incoming is < 1M, reject.
                if (existing.price > 5_000_000 && product.price < 1_000_000) {
                    console.warn(`🛡️ Resilience: Rejected price hallucination for ${product.id}. Existing: ${existing.price}, Incoming: ${product.price}`);
                    return existing;
                }
                
                // 2. Image Persistence: If existing has a real image and incoming has a placeholder, preserve existing image.
                if (existing.image_url && !existing.image_url.includes('placeholder') && (product.image_url?.includes('placeholder') || !product.image_url)) {
                     product.image_url = existing.image_url;
                }
                
                // 3. Catalog Locking: For luxury brands, once a realistic price is set, automated drops > 50% are blocked.
                const LUXURY_BRANDS = ["lexus", "toyota", "mercedes", "benz", "range", "land", "porsche"];
                const nameLower = existing.name.toLowerCase();
                if (LUXURY_BRANDS.some(b => nameLower.includes(b)) && product.price < existing.price * 0.4) {
                     console.warn(`🛡️ Resilience: Blocked suspicious luxury price drop for ${product.id}.`);
                     return existing;
                }
            }

            products[existingIdx] = { ...existing, ...product };
        } else {
            products.unshift(product);
            
            // 🔥 REAL-TIME GOOGLE INDEXING: Ping Google Indexing API whenever a 
            // brand new product enters the platform (via Seller add or Admin promotion).
            if (typeof window !== "undefined") {
                const absoluteUrl = getProductUrl(product);
                fetch("/api/google-index", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ urls: [absoluteUrl] }),
                }).catch(e => console.error("Google Indexing Ping Failed:", e));
            }
        }
        if (products.length > 500) products.length = 500; // soft limit

        try {
            localStorage.setItem(this.STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
        } catch (e) {
            // Force aggressive trim if quota exceeded
            products.length = 150;
            localStorage.setItem(this.STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
        }

        // Persist to Postgres if allowed (queued if offline)
        if (persist) {
            resilientFetch("/api/products", { method: "POST", body: product, type: "product_update" });
        }

        try {
            this.addToHistory(product);
        } catch (e) { }

        window.dispatchEvent(new Event("storage"));
        window.dispatchEvent(new Event("sync-store-update"));
        return product;
    }

    async updateProduct(id: string, updates: Partial<Product>) {
        if (typeof window === "undefined") return;

        // Canonical Taxonomy Normalization
        if (updates.category) {
            const { category, subcategory } = this.normalizeCategory(
                updates.category, 
                updates.subcategory || ""
            );
            updates.category = category as ProductCategory;
            if (updates.subcategory !== undefined) {
                updates.subcategory = subcategory;
            }
        }

        const products = this.getProducts();
        const existingProduct = products.find(p => p.id === id);

        // Ensure categories exist if they are being updated
        if (updates.category || updates.subcategory) {
            this.ensureCategoryExists(
                updates.category || existingProduct?.category || "Unknown",
                updates.subcategory || (updates.category ? undefined : existingProduct?.subcategory)
            );
        }

        const mergedProduct = { ...existingProduct, ...updates, updated_at: new Date().toISOString() } as Product;
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

        // ─── RESTOCK NOTIFICATION ───
        // If stock was 0 and is now > 0, notify all subscribed users
        if (existingProduct && existingProduct.stock === 0 && updates.stock !== undefined && updates.stock > 0) {
            const subs = this.getRestockSubscriptions().filter(s => s.productId === id);
            if (subs.length > 0) {
                subs.forEach(sub => {
                    // Bell Notification
                    this.addNotification({
                        userId: sub.userId,
                        type: "order",
                        message: `🔔 Good News! "${mergedProduct.name}" is back in stock. Order now before it runs out again!`,
                        link: `/product/${mergedProduct.id}/${(mergedProduct.name || 'product').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
                    });
                    
                    // Simulate Push / Email Notification
                    console.log(`[Push/Email Triggered] To: ${sub.userEmail || sub.userId} | Subject: "${mergedProduct.name}" is Back in Stock! | Link: /product/${mergedProduct.id}/${(mergedProduct.name || 'product').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`);
                    
                    if (sub.userEmail) {
                        fetch('/api/email', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                to: sub.userEmail,
                                type: 'RESTOCK_ALERT',
                                payload: {
                                    name: "Customer",
                                    productName: mergedProduct.name,
                                    productLink: `/product/${mergedProduct.id}/${(mergedProduct.name || 'product').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
                                }
                            })
                        }).catch(e => console.error("Restock email dispatch failed", e));
                    }
                });
                // Clear subscriptions for this product since they have been notified
                this.removeRestockSubscriptionsByProduct(id);
            }
        }

        // ─── PRICE DROP DETECTION & AUTO-DEAL ───
        // When a seller reduces price by 10%+, auto-add to Best Deals & notify interested buyers
        if (existingProduct && updates.price && updates.price < existingProduct.price) {
            const dropPct = Math.round(((existingProduct.price - updates.price) / existingProduct.price) * 100);
            
            if (dropPct >= 10) {
                // Auto-create a deal for the Best Deals section (48hr visibility)
                const existingDeals = this.getDeals();
                const alreadyHasDeal = existingDeals.some(d => d.product_id === id && d.is_active);
                
                if (!alreadyHasDeal) {
                    this.addDeal({
                        product_id: id,
                        product: mergedProduct,
                        discount_pct: dropPct,
                        start_at: new Date().toISOString(),
                        end_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // 48 hours
                        is_active: true,
                        deal_priority: dropPct >= 30 ? 1 : dropPct >= 20 ? 2 : 3
                    });
                }

                // Notify seller their product is now in Best Deals
                const seller = this.getSellers().find(s => s.id === mergedProduct.seller_id || s.user_id === mergedProduct.seller_id);
                if (seller) {
                    this.addNotification({
                        userId: seller.owner_email || seller.id,
                        type: "promo",
                        message: `🔥 Price Drop! "${mergedProduct.name}" (-${dropPct}%) has been auto-promoted to Best Deals for 48 hours.`,
                        link: "/deals"
                    });
                }

                // Notify buyers who may have viewed similar products (push notification simulation)
                this.addNotification({
                    userId: "all_buyers",
                    type: "promo",
                    message: `💰 Price Drop Alert: "${mergedProduct.name}" is now ₦${(updates.price).toLocaleString()} (-${dropPct}% off!)`,
                    link: `/product/${id}/${mergedProduct.slug || id}`
                });
            }
        }

        // Dispatch events IMMEDIATELY — UI resolves at this point, DB write is fire-and-forget
        window.dispatchEvent(new Event("storage"));
        window.dispatchEvent(new Event("sync-store-update"));

        // Persist to Postgres in the background — never block the caller
        // Uses AbortSignal timeout (20s) so a slow Neon cold-start doesn't stall anything
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20_000);
        fetch("/api/products", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(mergedProduct),
            signal: controller.signal,
        })
            .then(async (res) => {
                clearTimeout(timeoutId);
                if (res.ok) {
                    console.log(`✅ Persisted product update to DB: ${id}`);
                    this._pendingEdits.delete(id);
                    try { localStorage.setItem(this._PENDING_KEY, JSON.stringify([...this._pendingEdits])); } catch { /* quota */ }
                } else {
                    const errData = await res.json().catch(() => ({}));
                    console.warn(`⚠️ DB write returned ${res.status} for product ${id}:`, errData.error || "Unknown error");
                }
            })
            .catch((err) => {
                clearTimeout(timeoutId);
                if (err?.name !== "AbortError") {
                    console.warn("⚠️ Failed to persist product update to DB:", err);
                }
            });
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
            window.dispatchEvent(new Event("sync-store-update"));
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
        if (typeof window === "undefined") return;
        
        // 1. Local cleanup
        const products = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.PRODUCTS) || "[]");
        const filtered = products.filter((p: any) => p.id !== id);
        localStorage.setItem(this.STORAGE_KEYS.PRODUCTS, JSON.stringify(filtered));
        
        // 2. Persistent Tombstone (Prevents re-syncing from DB in current session)
        this._deletedProductIds.add(id);
        // PERSISTENT TOMBSTONE: Add to DELETED_STUBS so it never comes back via automated discovery
        const deleted = this.getDeletedStubs();
        if (!deleted.includes(id)) {
            deleted.push(id);
            localStorage.setItem(this.STORAGE_KEYS.DELETED_STUBS, JSON.stringify(deleted));
        }

        setTimeout(() => this._deletedProductIds.delete(id), 60000); // 1 min memory tombstone

        // Sync deletion to Postgres via POST fallback (more reliable than DELETE method)
        resilientFetch(`/api/products`, { 
            method: "POST", 
            body: { action: "delete", id },
            type: "product_update" 
        });

        window.dispatchEvent(new Event("storage"));
        window.dispatchEvent(new Event("sync-store-update"));
    }

    // --- Sync Engine ---

    /** 
     * Automated Full Sync: Pulls all relevant entities from the DB and merges them locally.
     * Designed to be called on page mount or periodically.
     */
    async autoSync(forceRefresh: boolean = false) {
        if (typeof window === "undefined") return;
        
        const sellerId = this.getCurrentSellerId();
        const userId = this.getCurrentUser()?.id;
        const identity = sellerId || userId;

        if (!identity) return;

        if (forceRefresh) {
            console.log(`🧹 Clearing stale local cache for ${identity} before refresh...`);
            // We don't wipe everything, just items matching this identity to avoid affecting other accounts
            if (sellerId) {
                const orders = this.getOrders().filter(o => o.seller_id !== sellerId);
                localStorage.setItem(this.STORAGE_KEYS.ORDERS, JSON.stringify(orders));
                const negs = this.getNegotiationsRaw().filter((n: any) => n.seller_id !== sellerId);
                localStorage.setItem(this.STORAGE_KEYS.NEGOTIATIONS, JSON.stringify(negs));
            } else if (userId) {
                const orders = this.getOrders().filter(o => o.customer_id !== userId);
                localStorage.setItem(this.STORAGE_KEYS.ORDERS, JSON.stringify(orders));
                const negs = this.getNegotiationsRaw().filter((n: any) => n.customer_id !== userId);
                localStorage.setItem(this.STORAGE_KEYS.NEGOTIATIONS, JSON.stringify(negs));
            }
        }
        try {
            console.log(`🔄 AutoSync started for ${identity}...`);
            
            const queries = [];
            if (sellerId) {
                queries.push(
                    fetch(`/api/orders?sellerId=${sellerId}`).then(r => r.json()),
                    fetch(`/api/negotiations?sellerId=${sellerId}`).then(r => r.json()),
                    fetch(`/api/payouts?sellerId=${sellerId}`).then(r => r.json()),
                    fetch(`/api/notifications?userId=${sellerId}`).then(r => r.json())
                );
            } else if (userId) {
                queries.push(
                    fetch(`/api/orders?customerId=${userId}`).then(r => r.json()),
                    fetch(`/api/negotiations?customerId=${userId}`).then(r => r.json()),
                    fetch(`/api/notifications?userId=${userId}`).then(r => r.json())
                );
            }

            const results = await Promise.allSettled(queries);
            
            // 1. Process Orders
            const ordersRes = results[0];
            if (ordersRes.status === "fulfilled" && ordersRes.value?.orders) {
                ordersRes.value.orders.forEach((o: any) => {
                    this.upsertOrder({
                        id: o.id,
                        product_id: o.productId,
                        seller_id: o.sellerId,
                        customer_id: o.customerId,
                        customer_name: o.customerName || "",
                        seller_name: o.sellerName || "",
                        amount: o.amount,
                        quantity: o.quantity,
                        status: o.status,
                        escrow_status: o.escrowStatus,
                        payout_status: o.payoutStatus || "none",
                        shipping_address: o.shippingAddress,
                        payment_method: o.paymentMethod,
                        tracking_id: o.trackingId,
                        carrier: o.carrier,
                        tracking_steps: o.trackingSteps || [],
                        chat_messages: o.chatMessages || [],
                        zivaActive: o.zivaActive,
                        created_at: o.createdAt,
                        updated_at: o.updatedAt
                    });
                });
            }

            // 2. Process Negotiations
            const negsRes = results[1];
            if (negsRes.status === "fulfilled" && negsRes.value?.negotiations) {
                negsRes.value.negotiations.forEach((n: any) => {
                    this.upsertNegotiation({
                        id: n.id,
                        product_id: n.productId,
                        customer_id: n.customerId,
                        customer_name: n.customerName,
                        seller_id: n.sellerId,
                        proposed_price: n.proposedPrice,
                        message: n.message,
                        status: n.status,
                        counter_price: n.counterPrice,
                        counter_message: n.counterMessage,
                        chat_messages: n.chatMessages || [],
                        created_at: n.createdAt,
                        updated_at: n.updatedAt
                    });
                });
            }

            // 3. Process Payouts if seller
            if (sellerId) {
                const payoutsRes = results[2];
                if (payoutsRes.status === "fulfilled" && payoutsRes.value?.payouts) {
                    localStorage.setItem(this.STORAGE_KEYS.PAYOUTS, JSON.stringify(payoutsRes.value.payouts));
                }
            }

            // 4. Force financial recalculation after data merge
            if (sellerId) this.recalculateSellerBalances(sellerId);

            localStorage.setItem("fp_last_sync", new Date().toISOString());
            window.dispatchEvent(new Event("sync-store-update"));
            console.log("✅ AutoSync complete.");

        } catch (e) {
            console.warn("⚠️ AutoSync failed (offline or server error). Using local cache.", e);
        }
    }

    /** 
     * Recalculates available balance, escrow, and total revenue for a seller.
     * Ensures absolute data integrity especially after refunds/returns.
     */
    recalculateSellerBalances(sellerId: string) {
        const orders = this.getOrders().filter(o => o.seller_id === sellerId);
        const seller = this.getSellers().find(s => s.id === sellerId || s.user_id === sellerId);
        if (!seller) return;

        const ELIGIBLE = ["released", "buyer_confirmed", "auto_release_eligible"];
        const ESCROW = ["held", "seller_confirmed"];
        const COMMISSION = this.getSellerCommissionRate(seller);

        const escrowAmount = orders
            .filter(o => ESCROW.includes(o.escrow_status as string))
            .reduce((sum, o) => sum + o.amount, 0);

        const availableBalance = orders
            .filter(o => ELIGIBLE.includes(o.escrow_status as string) && (o.payout_status === "none" || !o.payout_status))
            .reduce((sum, o) => sum + (o.amount * (1 - COMMISSION)), 0);

        const totalRevenue = orders
            .filter(o => o.status !== "cancelled" && o.status !== "returned")
            .reduce((sum, o) => sum + o.amount, 0);

        // Update local seller object with recalculated values
        this.updateSeller(sellerId, {
            payoutable_amount: availableBalance, // Using common field names
            trust_score: this.recalculateTrustScore(sellerId) // Fresh score
        } as any);

        // Persistent stats cache for dashboard
        localStorage.setItem(`fp_stats_${sellerId}`, JSON.stringify({
            escrowAmount,
            availableBalance,
            totalRevenue,
            lastCalculated: new Date().toISOString()
        }));
    }

    // --- Order Management ---

    /** Upsert an order into the local cache (used by DB sync). If it exists, merge; if not, add. */
    upsertOrder(order: Partial<Order> & { id: string }) {
        const orders = this.getOrders();
        const idx = orders.findIndex(o => o.id === order.id);
        if (idx >= 0) {
            orders[idx] = { ...orders[idx], ...order };
        } else {
            orders.unshift(order as Order);
        }
        localStorage.setItem(this.STORAGE_KEYS.ORDERS, JSON.stringify(orders));
        // Don't dispatch events here to avoid infinite loops during batch upserts
    }

    /** Upsert a negotiation into the local cache (used by DB sync). */
    upsertNegotiation(neg: Partial<NegotiationRequest> & { id: string }) {
        const negs = this.getNegotiationsRaw();
        const idx = negs.findIndex((n: any) => n.id === neg.id);
        if (idx >= 0) {
            negs[idx] = { ...negs[idx], ...neg };
        } else {
            negs.unshift(neg);
        }
        localStorage.setItem(this.STORAGE_KEYS.NEGOTIATIONS, JSON.stringify(negs));
    }

    updateOrder(id: string, updates: Partial<Order>) {
        const orders = this.getOrders();
        const updated = orders.map(o => o.id === id ? { ...o, ...updates } : o);
        localStorage.setItem(this.STORAGE_KEYS.ORDERS, JSON.stringify(updated));
        window.dispatchEvent(new Event("storage"));
        window.dispatchEvent(new Event("sync-store-update"));
    }

    updateOrderStatus(id: string, status: Order["status"]) {
        const orders = this.getOrders();
        const order = orders.find(o => o.id === id);
        if (!order) return;

        const updated = orders.map(o => o.id === id ? { ...o, status } : o);
        localStorage.setItem(this.STORAGE_KEYS.ORDERS, JSON.stringify(updated));
        
        // Mark as pending to prevent sync overwrite
        this._pendingOrderEdits.add(id);
        localStorage.setItem(this._PENDING_ORDER_KEY, JSON.stringify(Array.from(this._pendingOrderEdits)));

        // Trigger balance recalculation if it impacts financials
        this.recalculateSellerBalances(order.seller_id);

        // Sync to Remote DB
        fetch("/api/orders", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, status })
        }).then(res => {
            if (res.ok) {
                this._pendingOrderEdits.delete(id);
                localStorage.setItem(this._PENDING_ORDER_KEY, JSON.stringify(Array.from(this._pendingOrderEdits)));
            }
        }).catch(console.error);

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

            const sellers = this.getSellers();
            const seller = sellers.find(s => s.id === order.seller_id);
            const sellerEmail = seller?.owner_email || `seller_${order.seller_id}@fairprice.ng`;
            const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "fairprice2026@gmail.com";

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
                    trackingUrl: `https://fairprice.ng/account/orders?id=${order.id}`
                });
                this.addNotification({ userId: order.customer_id, type: "order", message: `Your order #${order.id} for ${productName} has been delivered.`, link: `/account/orders?id=${order.id}` });
            }

            // 2. Cancelled
            if (status === 'cancelled') {
                // Notify Buyer
                dispatchEmail(resolvedCustomerEmail, "ORDER_CANCELLED", {
                    name: resolvedName,
                    orderId: order.id,
                    productName,
                });
                this.addNotification({ userId: order.customer_id, type: "order", message: `Your order #${order.id} for ${productName} has been cancelled successfully.`, link: `/account/orders?id=${order.id}` });
                
                // Notify Seller
                dispatchEmail(sellerEmail, "ORDER_CANCELLED", {
                    name: seller?.business_name || "Seller",
                    sellerName: seller?.business_name || "Seller",
                    orderId: order.id,
                    productName,
                });
                this.addNotification({ userId: order.seller_id, type: "order", message: `Order #${order.id} for ${productName} was cancelled by the buyer.`, link: `/seller/orders?id=${order.id}` });
            }

            // 3. Shipped
            if (status === 'shipped') {
                dispatchEmail(resolvedCustomerEmail, "ORDER_SHIPPED", {
                    name: resolvedName,
                    orderId: order.id,
                    productName,
                    trackingUrl: `https://fairprice.ng/account/orders?id=${order.id}`
                });
                
                // ALSO Notify Admin!
                dispatchEmail(adminEmail, "ORDER_SHIPPED", {
                    name: "Admin",
                    orderId: order.id,
                    productName,
                    sellerName: seller?.business_name || "a Seller",
                    trackingUrl: `https://fairprice.ng/admin/orders?id=${order.id}`
                });

                this.addNotification({ userId: order.customer_id, type: "order", message: `Your order #${order.id} for ${productName} has shipped!`, link: `/account/orders?id=${order.id}` });
            }

            // 4. Return workflows
            if (status === 'return_requested') {
                 dispatchEmail(sellerEmail, "RETURN_REQUESTED", {
                    sellerName: seller?.business_name || "Seller",
                    orderId: order.id,
                    productName,
                 });
                 this.addNotification({ userId: order.seller_id, type: "order", message: `A return request was opened for Order #${order.id} (${productName}).`, link: `/seller/orders?id=${order.id}` });
            }
            if (status === 'return_approved' || status === 'return_rejected') {
                 const newStatusStr = status === 'return_approved' ? 'approved' : 'rejected';
                 dispatchEmail(resolvedCustomerEmail, "RETURN_UPDATED", {
                    name: resolvedName,
                    orderId: order.id,
                    productName,
                    newStatus: newStatusStr
                 });
                 this.addNotification({ userId: order.customer_id, type: "order", message: `Your return request for Order #${order.id} (${productName}) was ${newStatusStr}.`, link: `/account/orders?id=${order.id}` });
            }
        }

        window.dispatchEvent(new Event("storage"));
        window.dispatchEvent(new Event("sync-store-update"));
    }


    updateOrderEscrow(id: string, escrow_status: Order["escrow_status"]) {
        const orders = this.getOrders();
        const order = orders.find(o => o.id === id);
        if (!order) return;

        const updated = orders.map(o => o.id === id ? { ...o, escrow_status } : o);
        localStorage.setItem(this.STORAGE_KEYS.ORDERS, JSON.stringify(updated));

        // Financial Integrity: Recalculate balance on escrow state change
        this.recalculateSellerBalances(order.seller_id);

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
        window.dispatchEvent(new Event("sync-store-update"));
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
        
        // Mark as pending to prevent sync overwrite
        this._pendingOrderEdits.add(id);
        localStorage.setItem(this._PENDING_ORDER_KEY, JSON.stringify(Array.from(this._pendingOrderEdits)));

        // Sync to Remote DB
        fetch("/api/orders", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                id, 
                carrier: carrier || order.carrier, 
                tracking_id: tracking_id || order.tracking_id,
                tracking_steps: updatedSteps,
                tracking_status: status
            })
        }).then(res => {
            if (res.ok) {
                this._pendingOrderEdits.delete(id);
                localStorage.setItem(this._PENDING_ORDER_KEY, JSON.stringify(Array.from(this._pendingOrderEdits)));
            }
        }).catch(console.error);

        // Notify Buyer via email & notification
        window.dispatchEvent(new Event("storage"));
        window.dispatchEvent(new Event("sync-store-update"));
        this.addNotification({
            userId: order.customer_id,
            type: "order",
            message: `Update for Order #${id}: ${status} in ${location}.`,
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
        window.dispatchEvent(new Event("sync-store-update"));
    }

    /**
     * Seller-initiated order cancellation with reason + automated refund flow.
     * Sets escrow to refund_pending → admin approves → refund processed.
     */
    cancelOrderBySeller(orderId: string, reason: string) {
        const orders = this.getOrders();
        const order = orders.find(o => o.id === orderId);
        if (!order) return;

        const product = this.getProducts({ includeInactiveSellers: true }).find(p => p.id === order.product_id);
        const productName = product?.name || order.product?.name || "your item";
        const seller = this.getSellers().find(s => s.id === order.seller_id);
        const sellerName = seller?.business_name || "The seller";

        // Update order status and escrow
        const updated = orders.map(o => o.id === orderId ? {
            ...o,
            status: "cancelled" as const,
            escrow_status: "refund_pending" as const,
            cancel_reason: reason,
            cancelled_by: "seller",
            updated_at: new Date().toISOString()
        } : o);
        localStorage.setItem(this.STORAGE_KEYS.ORDERS, JSON.stringify(updated));

        // Recalculate seller balances
        this.recalculateSellerBalances(order.seller_id);

        // ─── Notify Buyer (Bell + Ziva Concierge) ───
        this.addNotification({
            userId: order.customer_id,
            type: "order",
            message: `⚠️ Your order #${orderId.substring(0, 8)} for "${productName}" has been cancelled by ${sellerName}. Reason: ${reason}. A refund is being processed.`,
            link: `/account/orders`
        });

        // ─── Notify Seller (Confirmation) ───
        this.addNotification({
            userId: order.seller_id,
            type: "order",
            message: `You cancelled order #${orderId.substring(0, 8)} for "${productName}". Reason: ${reason}. The buyer will be refunded.`,
            link: `/seller/orders`
        });

        // ─── Notify Admin (Refund Approval Required) ───
        this.addNotification({
            userId: "admin",
            type: "order",
            message: `🔴 SELLER CANCELLATION: ${sellerName} cancelled order #${orderId.substring(0, 8)} for "${productName}". Reason: "${reason}". Refund of ₦${order.amount.toLocaleString()} pending admin approval.`,
            link: `/admin/orders/${orderId}`
        });

        // ─── Email Buyer ───
        const customerUser = this.getUser(order.customer_id);
        const buyerEmail = customerUser?.email || `user_${order.customer_id}@fairprice.ng`;
        fetch("/api/email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                to: buyerEmail,
                subject: `Order Cancelled — #${orderId}`,
                type: "ORDER_CANCELLED",
                payload: {
                    name: customerUser?.name || order.customer_name || "Customer",
                    orderId: orderId,
                    productName,
                    amount: order.amount
                }
            })
        }).catch(console.error);

        // ─── Email Seller (Confirmation) ───
        const sellerEmail = seller?.owner_email || `seller_${order.seller_id}@fairprice.ng`;
        fetch("/api/email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                to: sellerEmail,
                subject: `Order Cancelled Confirmation — #${orderId}`,
                type: "ORDER_CANCELLED",
                payload: {
                    name: seller?.business_name || "Seller",
                    sellerName: seller?.business_name || "Seller",
                    orderId: orderId,
                    productName
                }
            })
        }).catch(console.error);

        window.dispatchEvent(new Event("storage"));
        window.dispatchEvent(new Event("sync-store-update"));
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
        window.dispatchEvent(new Event("sync-store-update"));

        // Dispatch global event for Push Notifications hook
        window.dispatchEvent(new CustomEvent("fp-notification-received", {
            detail: newNotif
        }));

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
        window.dispatchEvent(new Event("sync-store-update"));

        // Sync to backend
        fetch(`/api/notifications?id=${notifId}`, { method: "PATCH" }).catch(() => {});
    }

    public getOffListingInvoices(): any[] {
        if (typeof window === "undefined") return [];
        return JSON.parse(localStorage.getItem(this.STORAGE_KEYS.OFF_LISTING_INVOICES) || "[]");
    }

    public addOffListingInvoice(invoice: { id: string; seller_id: string; amount: number; label: string; status: "pending" | "paid"; created_at: string }) {
        if (typeof window === "undefined") return;
        const invoices = this.getOffListingInvoices();
        invoices.unshift(invoice);
        localStorage.setItem(this.STORAGE_KEYS.OFF_LISTING_INVOICES, JSON.stringify(invoices));
        window.dispatchEvent(new Event("storage"));
        window.dispatchEvent(new Event("sync-store-update"));
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
        window.dispatchEvent(new Event("sync-store-update"));

        // Sync to backend
        if (user?.email) {
            fetch(`/api/notifications?mark_all=true&user_email=${encodeURIComponent(user.email)}`, { method: "PATCH" }).catch(() => {});
        }
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

    updateUserStatus(userId: string, status: "active" | "suspended" | "frozen" | "banned") {
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
        window.dispatchEvent(new Event("sync-store-update"));
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
        this.markNotificationRead(id);
    }

    markAllAsRead() {
        const user = this.getCurrentUser();
        if (user?.email) {
            this.markAllNotificationsRead(user.email);
        } else if (user?.id) {
            this.markAllNotificationsRead(user.id);
        }
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
    addNegotiationMessage(negId: string, sender: "seller" | "buyer", text: string, imageUrl?: string, replyTo?: { sender: string; text: string }, imageUrls?: string[]) {
        const stored = localStorage.getItem(this.STORAGE_KEYS.NEGOTIATIONS);
        if (!stored) return;
        const negs = JSON.parse(stored);
        const idx = negs.findIndex((n: any) => n.id === negId);
        if (idx === -1) return;
        if (!negs[idx].chat_messages) negs[idx].chat_messages = [];
        const newMsg = { sender, text, imageUrl, replyTo, timestamp: new Date().toISOString() };
        negs[idx].chat_messages.push(newMsg);

        localStorage.setItem(this.STORAGE_KEYS.NEGOTIATIONS, JSON.stringify(negs));
        window.dispatchEvent(new Event("storage"));
        window.dispatchEvent(new Event("sync-store-update"));

        const negotiation = negs[idx];
        const product = this.getProducts().find(p => p.id === negotiation.product_id);

        // Sync to DB
        fetch("/api/negotiations", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                id: negId,
                chatMessages: negs[idx].chat_messages
            })
        }).catch(console.error);

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

            // Sync the updated chat messages array to the database for cross-device access
            fetch("/api/negotiations", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: negotiation.id,
                    chatMessages: negs[idx].chat_messages
                })
            }).catch(console.error);
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
        window.dispatchEvent(new Event("sync-store-update")); // Ensure global sync
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
    static get PLATFORM_COMMISSION() {
        if (typeof window === "undefined") return 0.05;
        try {
            const settings = JSON.parse(localStorage.getItem('fp_admin_settings') || '{}');
            return (settings.standardCommission !== undefined) ? settings.standardCommission / 100 : 0.05;
        } catch { return 0.05; }
    }

    calculateCommission(orderAmount: number, sellerId?: string) {
        if (typeof window === "undefined") return { commission: orderAmount * 0.05, payout: orderAmount * 0.95, rate: 0.05 };
        
        let settings: any = {};
        try {
            settings = JSON.parse(localStorage.getItem('fp_admin_settings') || '{}');
        } catch { /* ignore */ }

        let rate = (settings.standardCommission !== undefined) ? settings.standardCommission / 100 : 0.05;

        // 1. Seller Tiers / Custom Rates
        if (sellerId) {
            const sellers = this.getSellers();
            const seller = sellers.find(s => s.id === sellerId);
            if (seller?.tier === 'Gold') {
                rate = 0.01; // Gold Tier is 1%
            } else if (seller?.commission_rate !== undefined) {
                rate = seller.commission_rate / 100;
            }
        }

        // 2. Low Cost Protection (Flat Fee)
        if (settings.lowCostThreshold && orderAmount < settings.lowCostThreshold) {
            const flatFee = settings.lowCostFlatFee || 250;
            return { commission: flatFee, payout: orderAmount - flatFee, rate: flatFee / orderAmount };
        }

        // 3. High Cost Incentives (Fee Cap)
        let commission = orderAmount * rate;
        if (settings.highCostThreshold && orderAmount > settings.highCostThreshold) {
            const cap = settings.highCostCap || 15000;
            if (commission > cap) {
                commission = cap;
                rate = cap / orderAmount;
            }
        }

        return { commission, payout: orderAmount - commission, rate };
    }

    getSellerPayout(orderAmount: number, sellerId?: string) {
        return this.calculateCommission(orderAmount, sellerId);
    }

    // --- Admin & Governance ---
    getAdminStats() {
        if (typeof window === "undefined") return { total_sales: 0, active_users: 0, dispute_rate: 0, total_revenue: 0 } as any;

        const orders = this.getOrders().filter(o => !String(o.id).startsWith("FP-DEMO-ORD"));
        const products = this.getProducts();
        const sellers = this.getSellers();
        const complaints = this.getComplaints().filter(c => !String(c.id).startsWith("complaint_FP-DEMO-ORD") && !String(c.order_id).startsWith("FP-DEMO-ORD"));
        const disputes = this.getDisputes().filter(d => !String(d.order_id).startsWith("FP-DEMO-ORD"));

        const totalRevenue = orders.reduce((sum, o) => sum + (o.amount || 0), 0);
        const escrowBalance = orders.filter(o => !o.escrow_status || o.escrow_status === "held" || o.escrow_status === "seller_confirmed" || o.escrow_status === "buyer_confirmed").reduce((sum, o) => sum + (o.amount || 0), 0);
        const processedRevenue = orders.filter(o => o.escrow_status === "released").reduce((sum, o) => sum + (o.amount || 0), 0);
        
        // Dynamic calculations for real insights
        const uniqueCustomers = new Set(orders.map(o => o.customer_id)).size;
        const activeUsersCount = uniqueCustomers + sellers.length;
        const disputeRate = orders.length > 0 ? (disputes.length / orders.length) * 100 : 0;

        return {
            total_sales: orders.length, 
            active_users: activeUsersCount, 
            dispute_rate: Math.round(disputeRate * 10) / 10,
            total_revenue: totalRevenue,
            escrow_balance: escrowBalance,
            processed_revenue: processedRevenue,
            active_sellers: sellers.length,
            flagged_products: products.filter(p => p.price_flag === "too_low" || p.price_flag === "overpriced").length,
            open_complaints: complaints.filter(c => c.status !== "resolved").length,
            open_disputes: disputes.filter(d => d.status !== "resolved_refund" && d.status !== "resolved_release").length,
            total_orders: orders.length,
        };
    }

    // --- Catalog Suggestions ---
    getUniqueSubcategories(category?: string): string[] {
        if (typeof window === "undefined") return [];
        const products = this.getProducts();
        const filtered = category ? products.filter(p => p.category === category) : products;
        const subs = filtered
            .map(p => p.subcategory || (p as any).sub_category)
            .filter((s): s is string => !!s && s.trim().length > 0);
        return Array.from(new Set(subs)).sort();
    }

    getUniqueColors(): string[] {
        if (typeof window === "undefined") return ["Multicolor", "Black", "White", "Silver", "Gold", "Red", "Blue", "Green"];
        const products = this.getProducts();
        const colorsSet = new Set<string>(["Multicolor", "Black", "White", "Silver", "Gold", "Red", "Blue", "Green"]);
        
        products.forEach(p => {
            const firstColor = (p.colors && p.colors.length > 0) ? p.colors[0] : null;
            const color = firstColor || (p as any).color || (p.specs && p.specs.Color) || (p.specs && p.specs.color);
            if (color && typeof color === 'string') {
                color.split(/,|\/|\s+/).forEach(c => {
                    const clean = c.trim();
                    if (clean) colorsSet.add(clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase());
                });
            }
        });
        return Array.from(colorsSet).sort();
    }

    getComplaints(): Complaint[] {
        if (typeof window === "undefined") return [];
        const DEMO_PATTERNS = ["FP-DEMO", "TEST-", "mock_", "demo_"];
        return JSON.parse(localStorage.getItem(this.STORAGE_KEYS.COMPLAINTS) || "[]")
            .filter((c: any) => !DEMO_PATTERNS.some(p => String(c.id).includes(p)) && !DEMO_PATTERNS.some(p => c.order_id && String(c.order_id).includes(p)));
    }

    getPayouts(): any[] {
        if (typeof window === "undefined") return [];
        return JSON.parse(localStorage.getItem(this.STORAGE_KEYS.PAYOUTS) || "[]");
    }

    updatePayoutStatus(id: string, status: string, finalAmount?: number) {
        const payouts = this.getPayouts();
        const updated = payouts.map(p => p.id === id ? { ...p, status, amount: finalAmount !== undefined ? finalAmount : p.amount } : p);
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
                window.dispatchEvent(new Event("sync-store-update"));
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

        // Background Sync to Postgres
        resilientFetch("/api/payouts", { 
            method: "POST", 
            body: {
                seller_id: sellerId,
                amount,
                bank_name: bank,
                account_number: account_last4, // Fallback to last4 if full number isn't passed here
                account_name: seller.business_name,
                order_ids: orderIds
            }, 
            type: "general" 
        });

        // Add a notification to the admin dashboard
        this.addNotification({
            userId: "admin",
            type: "system",
            message: `New Payout Request: ${seller.business_name} requested a payout of ₦${amount.toLocaleString()} for order(s): ${orderIds.join(', ')}`,
            link: "/admin/payouts"
        });

        // Simulate sending an email to the admin
        fetch('/api/email', {
            method: 'POST',
            body: JSON.stringify({ to: 'admin@fairprice.ng', type: 'SELLER_PAYOUT_REQUEST', payload: { sellerName: seller.business_name, amount, orderIds } })
        }).catch(err => console.warn("Error triggering payout email:", err));

        window.dispatchEvent(new Event("storage"));
        window.dispatchEvent(new Event("sync-store-update"));
    }

    addKYCSubmission(submission: any) {
        if (typeof window === "undefined") return;
        const existing = this.getKYCSubmissions();
        existing.push(submission);
        localStorage.setItem(this.STORAGE_KEYS.KYC, JSON.stringify(existing));
        window.dispatchEvent(new Event("sync-store-update"));
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

    /** Check if order is eligible for auto-release (48 hours since seller confirmed, no dispute) */
    checkAutoReleaseEligible(order: Order): boolean {
        if (order.escrow_status !== "seller_confirmed" || !order.seller_confirmed_at) return false;
        const hoursSinceConfirm = (Date.now() - new Date(order.seller_confirmed_at).getTime()) / (1000 * 60 * 60);
        return hoursSinceConfirm >= 48;
    }

    /** Background worker to process all eligible auto-releases */
    public runAutoReleaseWorker() {
        if (typeof window === "undefined" || this._autoReleaseActive) return;
        this._autoReleaseActive = true;
        try {
            const orders = this.getOrders();
            const eligible = orders.filter(o => this.checkAutoReleaseEligible(o));
            if (eligible.length > 0) {
                console.log(`🛠️ DataSyncService: Auto-releasing ${eligible.length} eligible orders.`);
                eligible.forEach(o => {
                    // Check if already released in this batch to avoid redundant cycles
                    const currentOrder = this.getOrders().find(co => co.id === o.id);
                    if (currentOrder && currentOrder.escrow_status !== "released") {
                        this.releaseEscrow(o.id);
                    }
                });
            }
        } catch (e) {
            console.error("Auto-release worker failed:", e);
        } finally {
            this._autoReleaseActive = false;
        }
    }
    // ─── Dispute Management ─────────────────────────────
    getDisputes(): Dispute[] {
        const DEMO_PATTERNS = ["FP-DEMO", "TEST-", "mock_", "demo_"];
        return JSON.parse(localStorage.getItem(this.STORAGE_KEYS.DISPUTES) || "[]")
            .filter((d: any) => !DEMO_PATTERNS.some(p => String(d.id).includes(p)) && !DEMO_PATTERNS.some(p => d.order_id && String(d.order_id).includes(p)));
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

        const productName = order.product?.name || `Product ${order.product_id}`;
        const reasonLabel = reason.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());

        // Create admin support message (appears in admin support inbox)
        this.addSupportMessage({
            user_name: buyerName,
            user_email: buyerEmail,
            subject: `Dispute Filed: ${reasonLabel} — ${productName}`,
            message: `Buyer ${buyerName} raised a dispute on order #${orderId} for "${productName}".\nReason: ${reasonLabel}.\nDescription: ${description}`,
            source: "order_issue",
            order_id: orderId,
        });

        // ── Bell Notifications ──────────────────────────────────

        // Seller bell notification
        this.addNotification({
            userId: order.seller_id,
            type: "order",
            message: `⚠️ Dispute filed on order #${orderId} for "${productName}". Reason: ${reasonLabel}. Payment is frozen.`,
            link: `/seller/orders?filter=disputed`,
        });

        // Admin bell notification
        this.addNotification({
            userId: "admin",
            type: "order",
            message: `🚨 New dispute: Order #${orderId} — "${productName}" (${seller?.business_name || "Unknown Seller"}). Reason: ${reasonLabel}.`,
            link: "/admin/disputes",
        });

        // Buyer confirmation bell notification
        this.addNotification({
            userId: buyerId,
            type: "order",
            message: `Your dispute for "${productName}" (Order #${orderId}) has been filed. Our team will review within 24-48 hours.`,
            link: `/account/orders/${orderId}`,
        });

        window.dispatchEvent(new Event("storage"));
        window.dispatchEvent(new Event("sync-store-update"));

        // ── Email Notifications ─────────────────────────────────

        // Email to seller (full order ID + product name)
        const sellerEmail = seller?.owner_email || this.getUser(order.seller_id)?.email || `seller_${order.seller_id}@fairprice.ng`;
        fetch("/api/email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                to: sellerEmail,
                subject: `Dispute Filed: Order #${orderId} — ${productName}`,
                type: "NEW_DISPUTE",
                payload: {
                    sellerName: seller?.business_name || "Seller",
                    orderId: orderId,
                    productName: productName,
                    reason: reasonLabel,
                    description: description,
                    buyerName: buyerName,
                    message: `A buyer has filed a dispute on order #${orderId} for "${productName}". Reason: ${reasonLabel}. Payment is frozen until resolved.`,
                    dashboardUrl: `https://fairprice.ng/seller/orders?filter=disputed`
                }
            })
        }).catch(console.error);

        // Email to admin
        fetch("/api/email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                to: "techzema@gmail.com",
                subject: `🚨 New Dispute: Order #${orderId} — ${productName}`,
                type: "security_alert",
                data: {
                    storeName: "FairPrice Admin",
                    message: `Dispute filed by ${buyerName} on order #${orderId} for "${productName}" (${seller?.business_name || "Unknown Seller"}). Reason: ${reasonLabel}. Amount: ₦${order.amount.toLocaleString()}.`
                }
            })
        }).catch(() => {});

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

        // Sync with backend API to prevent ghost rerenders from polling
        fetch("/api/admin/resolve-dispute", {
            method: "POST",
            body: JSON.stringify({
                disputeId,
                orderId: dispute.order_id,
                resolution,
                adminNotes
            })
        }).catch(() => {});

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
        window.dispatchEvent(new Event("sync-store-update"));
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
        window.dispatchEvent(new Event("sync-store-update"));
    }

    // ─── Coupon System ──────────────────────────────────────
    getCoupons(userId?: string): Coupon[] {
        if (typeof window === "undefined") return [];
        const stored = localStorage.getItem(this.STORAGE_KEYS.COUPONS);
        const all: Coupon[] = stored ? JSON.parse(stored) : [];
        if (!userId) return all;
        return all.filter(c => c.userId === userId || c.userId === "all");
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
        const DEMO_PATTERNS = ["FP-DEMO", "TEST-", "mock_", "demo_"];
        const stored = localStorage.getItem(this.STORAGE_KEYS.REVIEWS);
        const all = stored ? JSON.parse(stored).filter((r: any) => !DEMO_PATTERNS.some(p => String(r.id).includes(p)) && !DEMO_PATTERNS.some(p => r.product_id && String(r.product_id).includes(p))) : [];
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
        window.dispatchEvent(new Event("sync-store-update"));
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
        window.dispatchEvent(new Event("sync-store-update"));
    }

    // ─── Chat / DM System ────────────────────────────────────

    getConversations(userId?: string): any[] {
        if (typeof window === "undefined") return [];
        const convs = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.CONVERSATIONS) || "[]");
        if (!userId) return convs;
        
        // Build a set of all known IDs for this user (handles seller ID mismatches)
        const matchIds = new Set<string>([userId]);
        const seller = this.getSellers().find(s => s.id === userId || s.user_id === userId || s.owner_email === userId);
        if (seller) {
            if (seller.id) matchIds.add(seller.id);
            if (seller.user_id) matchIds.add(seller.user_id);
            if (seller.owner_email) matchIds.add(seller.owner_email);
        }
        const userRecord = this.getUser(userId);
        if (userRecord?.email) matchIds.add(userRecord.email);
        if (userRecord?.id) matchIds.add(userRecord.id);
        
        return convs.filter((c: any) => c.participants.some((p: string) => matchIds.has(p)));
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
        window.dispatchEvent(new Event("sync-store-update"));
        return conv;
    }

    getChatMessages(conversationId: string): any[] {
        if (typeof window === "undefined") return [];
        const allMsgs = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.CHAT_MESSAGES) || "[]");
        return allMsgs.filter((m: any) => m.conversation_id === conversationId);
    }

    sendChatMessage(conversationId: string, senderId: string, senderName: string, text: string, replyTo?: { sender: string; text: string }): any {
        if (typeof window === "undefined") return null;

        const msg = {
            id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            conversation_id: conversationId,
            sender_id: senderId,
            sender_name: senderName,
            text,
            replyTo, // allow threading context
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
        window.dispatchEvent(new Event("sync-store-update"));
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

    markNegotiationRead(id: string) {
        if (typeof window === "undefined") return;
        const current = this.getNegotiations();
        const negotiation = current.find(n => n.id === id);
        if (!negotiation) return;

        let hasChange = false;
        const updatedMessages = (negotiation.chat_messages || []).map((msg: any) => {
            if (msg.sender === "buyer" && !msg.readByRecipient) {
                hasChange = true;
                return { ...msg, readByRecipient: true };
            }
            return msg;
        });

        if (hasChange) {
            const updated = current.map(n => n.id === id ? { ...n, chat_messages: updatedMessages } : n);
            localStorage.setItem(this.STORAGE_KEYS.NEGOTIATIONS, JSON.stringify(updated));
            
            // Sync to DB
            fetch("/api/negotiations", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id,
                    chatMessages: updatedMessages
                })
            }).catch(console.error);

            window.dispatchEvent(new Event("storage"));
            window.dispatchEvent(new Event("sync-store-update"));
        }
    }

    getDeletedStubs(): string[] {
        if (typeof window === "undefined") return [];
        try {
            return JSON.parse(localStorage.getItem(this.STORAGE_KEYS.DELETED_STUBS) || "[]");
        } catch { return []; }
    }

    deleteConversation(conversationId: string) {
        if (typeof window === "undefined") return;
        
        // If it's a stub, track it so it doesn't reappear
        if (conversationId.startsWith("chat-") || conversationId.startsWith("neg-group-") || conversationId.startsWith("conc-")) {
            const deleted = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.DELETED_STUBS) || "[]");
            if (!deleted.includes(conversationId)) {
                deleted.push(conversationId);
                localStorage.setItem(this.STORAGE_KEYS.DELETED_STUBS, JSON.stringify(deleted));
            }
        }

        const currentMsgs = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.CHAT_MESSAGES) || "[]");
        const remainingMsgs = currentMsgs.filter((m: any) => m.conversation_id !== conversationId);
        localStorage.setItem(this.STORAGE_KEYS.CHAT_MESSAGES, JSON.stringify(remainingMsgs));
        
        const currentConvs = this.getConversations();
        const remainingConvs = currentConvs.filter((c: any) => c.id !== conversationId);
        localStorage.setItem(this.STORAGE_KEYS.CONVERSATIONS, JSON.stringify(remainingConvs));
        
        window.dispatchEvent(new Event("storage"));
        window.dispatchEvent(new Event("sync-store-update"));
    }
}

export const DataSyncService = DataSyncServiceService.getInstance();
