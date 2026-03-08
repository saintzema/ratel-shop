// Shared types — mirrored from frontend/src/lib/types.ts
// Only the types needed for mobile app functionality

export interface User {
    id: string;
    name: string;
    email: string;
    role: "customer" | "seller" | "admin";
    avatar_url?: string;
    location?: string;
    birthday?: string;
    isPremium?: boolean;
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
    category: string;
    image_url: string;
    images: string[];
    stock: number;
    price_flag?: "fair" | "overpriced" | "too_low" | "none" | "great_deal";
    is_sponsored?: boolean;
    avg_rating: number;
    review_count: number;
    sold_count: number;
    created_at: string;
    specs?: Record<string, string>;
    highlights?: string[];
    condition?: "brand_new" | "used" | "refurbished";
}

export interface Order {
    id: string;
    customer_id: string;
    product_id: string;
    seller_id: string;
    amount: number;
    quantity: number;
    status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
    shipping_address: string;
    payment_method: string;
    tracking_status?: string;
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
    created_at: string;
}

export interface CartItem {
    product: Product;
    quantity: number;
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

export interface Notification {
    id: string;
    type: "system" | "order" | "negotiation" | "promo";
    message: string;
    read: boolean;
    timestamp: string;
    link?: string;
}

export interface AuthResponse {
    token: string;
    user: User;
}

export interface ApiError {
    error: string;
}
