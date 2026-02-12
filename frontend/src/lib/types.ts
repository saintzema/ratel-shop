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
    trust_score: number;
    status: "pending" | "active" | "frozen" | "banned";
    kyc_status: "not_submitted" | "pending" | "approved" | "rejected";
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
}

export interface Order {
    id: string;
    user_id: string;
    product_id: string;
    seller_id: string;
    product: Product;
    quantity: number;
    total_price: number;
    status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
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

// ─── Categories ─────────────────────────────────────────────

export type ProductCategory =
    | "phones"
    | "computers"
    | "furniture"
    | "home"
    | "electronics"
    | "health"
    | "cars"
    | "gaming"
    | "automotive"
    | "energy"
    | "solar";

export const CATEGORIES: { value: ProductCategory; label: string; icon: string }[] = [
    { value: "phones", label: "Phones & Tablets", icon: "📱" },
    { value: "computers", label: "Computers", icon: "💻" },
    { value: "furniture", label: "Furniture", icon: "🪑" },
    { value: "home", label: "Home & Kitchen", icon: "🏠" },
    { value: "electronics", label: "Electronics", icon: "⚡" },
    { value: "health", label: "Health & Beauty", icon: "🧴" },
    { value: "cars", label: "Cars & Auto", icon: "🚗" },
    { value: "gaming", label: "Gaming", icon: "🎮" },
    { value: "energy", label: "Energy", icon: "🔋" },
    { value: "solar", label: "Solar", icon: "☀️" },
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
