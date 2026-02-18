// ─── Core Types ─────────────────────────────────────────────

export interface User {
    id: string;
    name: string;
    email: string;
    role: "customer" | "seller" | "admin";
    avatar_url?: string;
    location?: string;
    created_at: string;
}

export interface Seller {
    id: string;
    user_id: string;
    business_name: string;
    description: string;
    logo_url?: string;
    category: string;
    verified: boolean;
    rating: number;
    trust_score: number;
    status: "pending" | "active" | "frozen" | "banned";
    kyc_status: "not_submitted" | "pending" | "approved" | "rejected";
    cover_image_url?: string;
    bank_name?: string;
    account_number?: string;
    created_at: string;
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
    price_flag: "fair" | "overpriced" | "suspicious" | "none";
    is_active: boolean;
    avg_rating: number;
    review_count: number;
    sold_count: number;
    created_at: string;
    specs?: Record<string, string>;
    highlights?: string[];
}

export interface Order {
    id: string;
    customer_id: string;
    product_id: string;
    seller_id: string;
    amount: number;
    status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
    escrow_status: "held" | "released" | "disputed" | "refunded";
    shipping_address: string;
    tracking_status?: "pending" | "processing" | "shipped" | "out_for_delivery" | "delivered";
    tracking_id?: string;
    carrier?: string;
    tracking_steps?: {
        status: string;
        location: string;
        timestamp: string;
        completed: boolean;
    }[];
    created_at: string;
    updated_at: string;
    product?: Product;
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
    created_at: string;
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
    alert_type: "overpriced" | "suspicious";
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
    ratel_best: number;
    current_price: number;
    flag: "fair" | "overpriced" | "suspicious" | "none";
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
    { value: "phones", label: "Phones & Tablets", icon: "📱" },
    { value: "computers", label: "Computers & Laptops", icon: "💻" },
    { value: "electronics", label: "Electronics", icon: "🔌" },
    { value: "fashion", label: "Fashion", icon: "👗" },
    { value: "beauty", label: "Beauty & Health", icon: "💄" },
    { value: "home", label: "Home & Kitchen", icon: "🏠" },
    { value: "fitness", label: "Gym & Fitness", icon: "💪" },
    { value: "office", label: "Office Furniture & Accessories", icon: "🪑" },
    { value: "furniture", label: "Home Furniture", icon: "🛋️" },
    { value: "grocery", label: "Groceries & Supermarket", icon: "🛒" },
    { value: "baby", label: "Baby Products", icon: "👶" },
    { value: "sports", label: "Sports & Outdoors", icon: "⚽" },
    { value: "cars", label: "Cars", icon: "🚗" },
    { value: "energy", label: "Energy & Solar", icon: "⚡" },
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
