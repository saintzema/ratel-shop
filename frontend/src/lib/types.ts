// ─── Core Types ─────────────────────────────────────────────

export interface User {
    id: string;
    name: string;
    email: string;
    role: "customer" | "seller" | "admin";
    avatar_url?: string;
    location?: string;
    birthday?: string;
    isPremium?: boolean;
    premiumExpiresAt?: string;
    referralCode?: string;
    referredBy?: string;
    emailVerified?: boolean;
    created_at: string;
}

export interface Coupon {
    id: string;
    code: string;
    amount: number;
    userId: string;
    issuedBy: "system" | "admin" | "referral";
    reason: string;
    isUsed: boolean;
    usedAt?: string;
    expiresAt: string;
    createdAt: string;
    revokedAt?: string;
}

export interface Seller {
    id: string;
    user_id?: string;
    business_name: string;
    owner_name?: string;
    owner_email?: string;
    description: string;
    logo_url?: string;
    category: string;
    verified: boolean;
    subscription_plan?: "Starter" | "Pro" | "Growth" | "Scale";
    rating?: number;
    trust_score: number;
    status?: "pending" | "active" | "frozen" | "banned";
    kyc_status: "not_submitted" | "pending" | "approved" | "rejected";
    cover_image_url?: string;
    bank_name?: string;
    account_number?: string;
    account_name?: string;
    store_url?: string;
    location?: string;
    weekly_orders?: string;
    currencies?: string[];
    staff_count?: string;
    physical_stores?: string;
    joined_at?: string;
    created_at?: string;
}

export interface Product {
    id: string;
    seller_id: string;
    seller_name: string;
    name: string;
    description: string;
    price: number;
    original_price?: number;
    recommended_price?: number;
    category: ProductCategory;
    image_url: string;
    images: string[];
    stock: number;
    price_flag: "fair" | "overpriced" | "too_low" | "none" | "great_deal";
    is_sponsored?: boolean;
    is_active: boolean;
    avg_rating: number;
    review_count: number;
    sold_count: number;
    created_at: string;
    specs?: Record<string, string>;
    external_url?: string;
    highlights?: string[];
    condition?: "brand_new" | "used" | "refurbished";
    colors?: string[];
    subcategory?: string;
}

export interface Order {
    id: string;
    customer_id: string;
    product_id: string;
    seller_id: string;
    amount: number;
    status: "pending" | "processing" | "shipped" | "delivered" | "cancelled" | "returned";
    escrow_status: "held" | "seller_confirmed" | "buyer_confirmed" | "auto_release_eligible" | "released" | "disputed" | "refunded";
    shipping_address: string;
    tracking_status?: "pending" | "processing" | "shipped" | "out_for_delivery" | "delivered";
    tracking_id?: string;
    payout_status?: "pending_payout" | "cashed_out";
    carrier?: string;
    tracking_steps?: {
        status: string;
        location: string;
        timestamp: string;
        completed: boolean;
    }[];
    seller_confirmed_at?: string;
    buyer_confirmed_at?: string;
    escrow_released_at?: string;
    created_at: string;
    updated_at: string;
    product?: Product;
    customer_name?: string;
    seller_name?: string;
}

export interface NegotiationRequest {
    id: string;
    product_id: string;
    customer_id: string;
    customer_name: string;
    proposed_price: number;
    message?: string;
    status: "pending" | "accepted" | "rejected";
    counter_price?: number;
    counter_message?: string;
    counter_status?: "pending" | "accepted" | "rejected";
    chat_messages?: { sender: "seller" | "buyer"; text: string; timestamp: string }[];
    created_at: string;
}

export interface Promotion {
    id: string;
    product_id: string;
    seller_id: string;
    plan: "7_day" | "14_day" | "30_day";
    amount_paid: number;
    started_at: string;
    expires_at: string;
    status: "active" | "ended" | "cancelled";
    impressions: number;
    clicks: number;
}

export interface Review {
    id: string;
    user_id: string;
    user_name: string;
    product_id: string;
    rating: number;
    title: string;
    body: string;
    verified_purchase: boolean;
    helpful_count?: number;
    images?: string[];
    seller_reply?: string;
    created_at: string;
}

export interface Deal {
    id: string;
    product_id: string;
    product: Product;
    discount_pct: number;
    start_at: string;
    end_at: string;
    is_active: boolean;
}

export interface KYCSubmission {
    id: string;
    seller_id: string;
    seller_name: string;
    id_type: "nin" | "drivers_license" | "voters_card" | "passport";
    id_number: string;
    document_url: string;
    status: "pending" | "approved" | "rejected";
    reviewed_by?: string;
    review_notes?: string;
    created_at: string;
    reviewed_at?: string;
}

export interface PriceAlert {
    id: string;
    product_id: string;
    product_name: string;
    seller_id: string;
    seller_name: string;
    alert_type: "overpriced" | "great_deal";
    market_avg: number;
    seller_price: number;
    created_at: string;
}

export interface Complaint {
    id: string;
    user_id: string;
    user_name: string;
    seller_id: string;
    seller_name: string;
    order_id?: string;
    type: "price" | "quality" | "delivery" | "scam" | "other";
    description: string;
    status: "open" | "investigating" | "resolved" | "dismissed";
    created_at: string;
}

export interface PriceComparison {
    market_low: number;
    market_high: number;
    market_avg: number;
    fp_best: number;
    current_price: number;
    flag: "fair" | "overpriced" | "too_low" | "none" | "great_deal";
    savings: number;
}

export interface CartItem {
    product: Product;
    quantity: number;
}

export interface Notification {
    id: string;
    type: "system" | "order" | "negotiation" | "promo";
    message: string;
    read: boolean;
    timestamp: string;
    link?: string;
    userId?: string;
}

// ─── Categories ─────────────────────────────────────────────

export type ProductCategory = "phones" | "computers" | "smartwatch" | "electronics" | "fashion" | "beauty" | "home" | "cars" | "energy" | "gaming" | "automotive" | "solar" | "textiles" | "fitness" | "office" | "furniture" | "grocery" | "baby" | "sports";

export const CATEGORIES: { value: ProductCategory; label: string; icon: string }[] = [
    { value: "phones", label: "Phones", icon: "📱" },
    { value: "computers", label: "Computers", icon: "💻" },
    { value: "electronics", label: "Electronics", icon: "🔌" },
    { value: "fashion", label: "Fashion", icon: "👗" },
    { value: "beauty", label: "Beauty", icon: "💄" },
    { value: "home", label: "Home", icon: "🏠" },
    { value: "fitness", label: "Gym", icon: "💪" },
    { value: "office", label: "Office", icon: "🪑" },
    { value: "furniture", label: "Furniture", icon: "🛋️" },
    { value: "grocery", label: "Grocery", icon: "🛒" },
    { value: "baby", label: "Baby", icon: "👶" },
    { value: "sports", label: "Sports", icon: "⚽" },
    { value: "cars", label: "Cars", icon: "🚗" },
    { value: "energy", label: "Energy", icon: "⚡" },
    { value: "gaming", label: "Gaming", icon: "🎮" },
];

// ─── Dashboard Stats ────────────────────────────────────────

export interface AdminDashboardStats {
    total_revenue: number;
    active_sellers: number;
    flagged_products: number;
    open_complaints: number;
    total_users: number;
    total_orders: number;
}

export interface SellerDashboardStats {
    total_revenue: number;
    pending_revenue: number;
    monthly_revenue: number;
    total_orders: number;
    new_orders: number;
    products_count: number;
    trust_score: number;
    flagged_products: number;
}

// ─── Support Messages (Admin Inbox) ─────────────────────────

export interface SupportMessage {
    id: string;
    user_name: string;
    user_email: string;
    subject: string;
    message: string;
    source: "ziva_escalation" | "ziva_negotiation" | "contact_form" | "order_issue" | "dispute_admin";
    status: "new" | "read" | "replied" | "resolved";
    transcript?: string;
    created_at: string;
    target_user_id?: string;
    target_user_email?: string;
    order_id?: string;
}

// ─── Disputes ────────────────────────────────────────────────

export type DisputeReason = "wrong_item" | "damaged" | "not_received" | "not_as_described" | "other";

export interface Dispute {
    id: string;
    order_id: string;
    buyer_id: string;
    buyer_name: string;
    buyer_email: string;
    seller_id: string;
    seller_name: string;
    product_name: string;
    amount: number;
    reason: DisputeReason;
    description: string;
    status: "open" | "investigating" | "resolved_refund" | "resolved_release";
    created_at: string;
    resolved_at?: string;
    admin_notes?: string;
}
