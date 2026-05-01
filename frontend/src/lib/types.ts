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
    phone?: string;
    phone_numbers?: string[];
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
    phone_number?: string;
    phone_numbers?: string[];
    subscription_plan?: "Starter" | "Pro" | "Growth" | "Scale";
    plan_expiry_date?: string;
    rating?: number;
    trust_score: number;
    commission_rate?: number;
    tier?: "Gold" | "Silver" | "Bronze" | "Standard";
    status?: "pending" | "active" | "frozen" | "banned";
    kyc_status: "not_submitted" | "pending" | "approved" | "rejected";
    cover_image_url?: string;
    cover_image_urls?: string[];
    bank_name?: string;
    account_number?: string;
    account_name?: string;
    store_url?: string;
    slug?: string;
    location?: string;
    street_address?: string;
    city?: string;
    state?: string;
    business_registered?: boolean;
    cac_document_url?: string;
    cac_rc_number?: string;
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
    is_trending?: boolean;
    is_active: boolean;
    avg_rating: number;
    review_count: number;
    sold_count: number;
    created_at: string;
    specs?: Record<string, string>;
    external_url?: string;
    highlights?: string[];
    financing_available?: boolean;
    financing_down_payment?: number;
    condition?: "brand_new" | "used" | "refurbished";
    colors?: string[];
    subcategory?: string;
    tags?: string[];
    seller_trust_score?: number;
    negotiation_rate?: number;
    _source?: string;
    financing_config?: {
        enabled: boolean;
        deposit_percent?: number; // Overrides the global/category default if specified (e.g. 0.10 for 10%)
        interest_rate_pa?: number; // Overrides the global/category annual markup (e.g. 0.20 for 20%)
        max_tenor_months?: number; // Shortened or extended tenor (e.g. 24 for 2 years max)
    };
    contact_info?: {
        show: boolean;
        phone?: string;
        whatsapp?: string;
    };
    slug?: string;
}

export interface Order {
    id: string;
    customer_id: string;
    product_id: string;
    seller_id: string;
    amount: number;
    quantity?: number;
    payment_method?: string;
    status: "pending" | "processing" | "shipped" | "delivered" | "cancelled" | "return_requested" | "return_approved" | "return_rejected" | "returned";
    escrow_status: "held" | "seller_confirmed" | "buyer_confirmed" | "auto_release_eligible" | "released" | "disputed" | "refunded";
    shipping_address: string;
    delivery_method?: string;
    tracking_status?: "pending" | "processing" | "shipped" | "out_for_delivery" | "delivered";
    tracking_id?: string;
    payout_status?: "pending_payout" | "cashed_out" | "paid" | "none";
    carrier?: string;
    tracking_steps?: {
        status: string;
        location: string;
        timestamp: string;
        completed: boolean;
    }[];
    chat_messages?: {
        id: string;
        sender: string;
        text: string;
        timestamp: string;
        imageUrl?: string;
        imageUrls?: string[];
        replyTo?: { sender: string; text: string };
    }[];
    zivaActive?: boolean;
    unread_admin?: boolean;
    seller_confirmed_at?: string;
    buyer_confirmed_at?: string;
    escrow_released_at?: string;
    created_at: string;
    updated_at: string;
    product?: Product;
    customer_name?: string;
    customer_email?: string;
    customer_phone?: string;
    customer_whatsapp?: string;
    source?: string;
    seller_name?: string;
    discount_id?: string;
    // Vehicle Loan Financing details (set when isVehicle is true)
    financing?: {
        is_vehicle_loan: boolean;
        vehicle_price: number;       // Full listing price of the vehicle
        deposit_paid: number;        // 15% deposit amount paid upfront
        loan_balance: number;        // Remaining balance after deposit
        monthly_payment: number;     // Estimated monthly repayment
        tenor_months: number;        // Repayment period in months
        interest_rate: number;       // Annual markup rate (e.g. 0.34 = 34%)
        total_repayment: number;     // Total amount over the loan term
        condition?: string;          // new | foreign_used | nigerian_used
        loan_type?: string;          // bnpl | lease
    };
}

export interface ReturnRequest {
    id: string;
    order_id: string;
    customer_id: string;
    seller_id: string;
    reason: string;
    description: string;
    images?: string[];
    status: "pending" | "approved" | "rejected" | "item_received" | "refunded";
    seller_notes?: string;
    admin_notes?: string;
    created_at: string;
    updated_at: string;
}

export interface NegotiationRequest {
    id: string;
    product_id: string;
    customer_id: string;
    customer_name: string;
    seller_id?: string;
    proposed_price: number;
    message?: string;
    status: "pending" | "accepted" | "rejected" | "countered" | "purchased";
    customer_whatsapp?: string;
    counter_price?: number;
    counter_message?: string;
    counter_status?: "pending" | "accepted" | "rejected" | "purchased";
    chat_messages?: {
        id?: string;
        sender: "seller" | "buyer" | "system";
        text: string;
        timestamp: string;
        imageUrl?: string;
        imageUrls?: string[];
        replyTo?: { sender: string; text: string };
        readByRecipient?: boolean;
        negotiation?: any;
    }[];
    purchased?: boolean;
    created_at: string;
    updated_at?: string;
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
    deal_priority?: number;
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
    negotiatedPrice?: number;
}

export interface Notification {
    id: string;
    type: "system" | "order" | "negotiation" | "promo";
    title?: string;
    message: string;
    read: boolean;
    timestamp: string;
    link?: string;
    userId?: string;
    imageUrl?: string;
}

// ─── Categories ─────────────────────────────────────────────

export type ProductCategory = "all" | "trending" | "best_selling" | "solar" | "streaming_kits" | "phones" | "gaming" | "computers" | "fashion" | "cars" | "grocery" | "home_office" | "evs" | "industrial" | "health" | "automotive" | "bags" | "women" | "jewelry" | "household" | "toys" | "crafts" | "men" | "sports" | "kids" | "beauty" | "office" | "baby" | "garden" | "pets" | "musical" | "appliances" | "food" | "books" | "tablets" | "electronics" | "energy" | "fitness" | "machinery" | "agriculture" | "construction" | "medical" | "furniture" | "smartwatch" | "vehicles" | "home";

export const CATEGORIES: { value: ProductCategory; label: string; subcategories: string[], adminOnly?: boolean }[] = [
    { value: "trending", label: "Trending", subcategories: [], adminOnly: true },
    { value: "best_selling", label: "Best-Selling", subcategories: [], adminOnly: true },
    { value: "solar", label: "Solar", subcategories: ["Panels", "Inverters", "Batteries"] },
    { value: "streaming_kits", label: "Streaming Kits", subcategories: ["Microphones", "Ring Lights", "Webcams", "Capture Cards"] },
    { value: "phones", label: "Phones", subcategories: ["Smartphones", "Feature Phones", "Refurbished Phones", "Accessories"] },
    { value: "gaming", label: "Gaming", subcategories: ["Consoles", "Gaming PCs", "Accessories", "Video Games"] },
    { value: "computers", label: "Computers", subcategories: ["Laptops", "Desktops", "Monitors", "Networking", "Components"] },
    { value: "fashion", label: "Fashion", subcategories: ["Men's Wear", "Women's Wear", "Kids", "Bags", "Shoes", "Sneakers", "Watches"] },
    { value: "cars", label: "Cars", subcategories: ["SUVs", "Sedans", "Trucks", "Luxury"] },
    { value: "grocery", label: "Grocery", subcategories: ["Food", "Beverages", "Household", "Personal Care"] },
    { value: "home_office", label: "Home Office", subcategories: ["Desks", "Ergonomic Chairs", "Stationery", "Organizers"] },
    { value: "evs", label: "EVs", subcategories: ["Electric Cars", "Electric Bikes", "Charging Stations"] },
    { value: "industrial", label: "Industrial", subcategories: ["Power Tools", "Welding Equipment", "Air Compressors", "Safety Gear"] },
    { value: "health", label: "Health", subcategories: ["Fitness", "Supplements", "Medical Supplies", "Diagnostic Gear"] },
    { value: "automotive", label: "Automotive", subcategories: ["Auto Parts", "Engines", "Tyres", "Oils & Fluids", "Batteries"] },
    { value: "bags", label: "Bags", subcategories: ["Backpacks", "Handbags", "Luggage", "Briefcases"] },
    { value: "women", label: "Women", subcategories: ["Clothing", "Shoes", "Accessories"] },
    { value: "jewelry", label: "Jewelry", subcategories: ["Necklaces", "Rings", "Earrings", "Watches"] },
    { value: "household", label: "Household", subcategories: ["Cleaning", "Storage", "Laundry"] },
    { value: "toys", label: "Toy", subcategories: ["Action Figures", "Educational", "Board Games"] },
    { value: "crafts", label: "Crafts", subcategories: ["Art Supplies", "DIY Kits", "Sewing"] },
    { value: "men", label: "Men", subcategories: ["Clothing", "Shoes", "Accessories"] },
    { value: "sports", label: "Sports", subcategories: ["Exercise Equipment", "Outdoor Gear", "Sportswear"] },
    { value: "kids", label: "Kids", subcategories: ["Clothing", "Shoes", "Toys"] },
    { value: "beauty", label: "Beauty", subcategories: ["Skincare", "Makeup", "Fragrances", "Haircare", "Personal Care"] },
    { value: "office", label: "Office", subcategories: ["Printers", "Shredders", "Supplies"] },
    { value: "baby", label: "Baby", subcategories: ["Baby Care", "Diapers", "Baby Toys", "Gear"] },
    { value: "garden", label: "Garden", subcategories: ["Tools", "Plants", "Outdoor Furniture"] },
    { value: "pets", label: "Pets", subcategories: ["Food", "Toys", "Beds", "Collars"] },
    { value: "musical", label: "Musical", subcategories: ["Guitars", "Keyboards", "Drums", "Audio Interfaces"] },
    { value: "appliances", label: "Appliances", subcategories: ["Fans", "Generators", "Air Conditioning", "Refrigerators", "Microwaves"] },
    { value: "food", label: "Food", subcategories: ["Snacks", "Canned Goods", "Fresh Produce"] },
    { value: "books", label: "Books", subcategories: ["Fiction", "Non-Fiction", "Educational", "Comics"] },
    
    // Legacy mapping (kept for safety)
    { value: "tablets", label: "Tablets", subcategories: ["iPads", "Android Tablets", "Drawing Tablets"] },
    { value: "electronics", label: "Electronics", subcategories: ["Audio", "Headphones", "Smart Home", "Drones", "Cameras", "TV & Video"] },
    { value: "energy", label: "Energy", subcategories: ["Generators", "Batteries"] },
    { value: "machinery", label: "Machinery", subcategories: ["Lathes", "CNC Machines", "Industrial Pumps"] },
    { value: "agriculture", label: "Agro & Farming", subcategories: ["Tractors", "Irrigation Systems", "Harvesters"] },
    { value: "furniture", label: "Furniture", subcategories: ["Sofas", "Beds", "Dining Tables"] },
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
    source: "ziva_escalation" | "ziva_negotiation" | "contact_form" | "order_issue" | "dispute_admin" | "image_request";
    status: "new" | "read" | "replied" | "resolved";
    transcript?: string;
    created_at: string;
    target_user_id?: string;
    target_user_email?: string;
    order_id?: string;
}

// ─── Chat / DM System ──────────────────────────────────────

export interface Conversation {
    id: string;
    participants: string[];            // ["admin", "user_4a2oib40x"]
    participant_names: Record<string, string>; // { admin: "FairPrice Admin", user_4a2oib40x: "Zee Medic" }
    last_message: string;
    last_message_at: string;
    unread_count: Record<string, number>;
    context?: {
        type: "admin_dm" | "buyer_seller" | "ziva_escalation";
        product_id?: string;
        order_id?: string;
    };
}

export interface ChatMessage {
    id: string;
    conversation_id: string;
    sender_id: string;
    sender_name: string;
    text: string;
    timestamp: string;
    imageUrl?: string;
    imageUrls?: string[];
    read_by: string[];
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
