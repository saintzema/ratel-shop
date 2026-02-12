import { Product, Seller, Deal, Review, PriceAlert, Complaint, KYCSubmission, AdminDashboardStats, SellerDashboardStats, PriceComparison } from "./types";

// ─── Sellers ────────────────────────────────────────────────

export const DEMO_SELLERS: Seller[] = [
    {
        id: "s1",
        user_id: "u2",
        business_name: "TechHub Lagos",
        description: "Premium electronics and gadgets at fair prices. VDM Verified.",
        logo_url: "/sellers/techhub.png",
        category: "electronics",
        verified: true,
        trust_score: 96,
        status: "active",
        kyc_status: "approved",
        created_at: "2025-06-15T10:00:00Z",
    },
    {
        id: "s2",
        user_id: "u3",
        business_name: "Ratel EV & Power",
        description: "Leading the Nigerian green energy revolution. Solar systems and Electric Vehicles.",
        logo_url: "/sellers/ratel-power.png",
        category: "energy",
        verified: true,
        trust_score: 98,
        status: "active",
        kyc_status: "approved",
        created_at: "2025-07-20T10:00:00Z",
    },
    {
        id: "s3",
        user_id: "u4",
        business_name: "Naija Auto Parts",
        description: "Genuine auto parts and vehicle accessories.",
        logo_url: "/sellers/naija-auto.png",
        category: "cars",
        verified: true,
        trust_score: 88,
        status: "active",
        kyc_status: "approved",
        created_at: "2025-08-01T10:00:00Z",
    },
    {
        id: "s4",
        user_id: "u5",
        business_name: "PhoneZone Nigeria",
        description: "Latest smartphones at competitive prices.",
        logo_url: "/sellers/phonezone.png",
        category: "phones",
        verified: false,
        trust_score: 72,
        status: "active",
        kyc_status: "approved",
        created_at: "2025-09-10T10:00:00Z",
    },
    {
        id: "s5",
        user_id: "u6",
        business_name: "Lagos Gadget World",
        description: "All gadgets, all the time. Prices may vary.",
        logo_url: "/sellers/lgw.png",
        category: "electronics",
        verified: false,
        trust_score: 45,
        status: "active",
        kyc_status: "pending",
        created_at: "2025-10-05T10:00:00Z",
    },
];

// ─── Products ───────────────────────────────────────────────

export const DEMO_PRODUCTS: Product[] = [
    {
        id: "p1",
        seller_id: "s1",
        seller_name: "TechHub Lagos",
        name: 'Samsung Galaxy S24 Ultra 256GB — Titanium Black',
        description: "Experience the latest Samsung flagship with AI-powered camera, S Pen, and titanium build. 200MP camera, Snapdragon 8 Gen 3.",
        price: 890000,
        original_price: 1050000,
        recommended_price: 880000,
        category: "phones",
        image_url: "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=400&h=400&fit=crop",
        images: [],
        stock: 23,
        price_flag: "fair",
        is_active: true,
        avg_rating: 4.7,
        review_count: 2341,
        sold_count: 890,
        created_at: "2025-11-01T10:00:00Z",
    },
    {
        id: "p2",
        seller_id: "s1",
        seller_name: "TechHub Lagos",
        name: "iPhone 15 Pro Max 256GB — Natural Titanium",
        description: "Apple's most powerful iPhone with A17 Pro chip, 48MP camera system, and titanium design. Action button, USB-C.",
        price: 1250000,
        original_price: 1400000,
        recommended_price: 1200000,
        category: "phones",
        image_url: "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=400&h=400&fit=crop",
        images: [],
        stock: 15,
        price_flag: "fair",
        is_active: true,
        avg_rating: 4.8,
        review_count: 3102,
        sold_count: 1245,
        created_at: "2025-10-15T10:00:00Z",
    },
    {
        id: "p3",
        seller_id: "s4",
        seller_name: "PhoneZone Nigeria",
        name: "iPhone 15 Pro Max 256GB — Blue Titanium",
        description: "Same Apple flagship, different seller. Compare prices on RatelShop!",
        price: 1450000,
        original_price: 1500000,
        recommended_price: 1200000,
        category: "phones",
        image_url: "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=400&h=400&fit=crop",
        images: [],
        stock: 8,
        price_flag: "overpriced",
        is_active: true,
        avg_rating: 4.2,
        review_count: 156,
        sold_count: 45,
        created_at: "2025-11-05T10:00:00Z",
    },
    {
        id: "p4",
        seller_id: "s2",
        seller_name: "Ratel EV & Power",
        name: "Tesla Model 3 Dual Motor — 2024 Long Range",
        description: "Imported 2024 Tesla Model 3. Dual motor, all-wheel drive, zero emissions. Full self-driving capability included.",
        price: 45000000,
        original_price: 52000000,
        recommended_price: 46000000,
        category: "cars",
        image_url: "https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=800&h=800&fit=crop",
        images: [],
        stock: 2,
        price_flag: "fair",
        is_active: true,
        avg_rating: 4.9,
        review_count: 12,
        sold_count: 3,
        created_at: "2025-11-15T10:00:00Z",
    },
    {
        id: "p5",
        seller_id: "s2",
        seller_name: "Ratel EV & Power",
        name: "Luminous Solar Hybrid Inverter — 5KVA + 4 Batteries",
        description: "Complete solar power system for Nigerian homes. 5KVA hybrid inverter, 4x 200Ah tubular batteries, and 6x 400W panels.",
        price: 2450000,
        original_price: 2800000,
        recommended_price: 2400000,
        category: "energy",
        image_url: "https://images.unsplash.com/photo-1613665813446-82a78c468a1d?auto=format&fit=crop&w=800&q=80",
        images: [],
        stock: 10,
        price_flag: "fair",
        is_active: true,
        avg_rating: 4.8,
        review_count: 85,
        sold_count: 42,
        created_at: "2025-10-10T10:00:00Z",
    },
    {
        id: "p6",
        seller_id: "s1",
        seller_name: "TechHub Lagos",
        name: 'MacBook Pro 14" M3 Pro — Space Black',
        description: "Apple M3 Pro chip, 18GB RAM, 512GB SSD. Liquid Retina XDR display. Up to 17 hours battery.",
        price: 1850000,
        original_price: 2100000,
        recommended_price: 1800000,
        category: "computers",
        image_url: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&h=400&fit=crop",
        images: [],
        stock: 9,
        price_flag: "fair",
        is_active: true,
        avg_rating: 4.9,
        review_count: 1876,
        sold_count: 623,
        created_at: "2025-10-01T10:00:00Z",
    },
    {
        id: "p7",
        seller_id: "s3",
        seller_name: "Naija Auto Parts",
        name: "Toyota Camry 2020+ Front Bumper — OEM Quality",
        description: "Genuine OEM-quality front bumper for Toyota Camry 2020 and newer models. Perfect fit, primed and ready for paint.",
        price: 185000,
        original_price: 220000,
        recommended_price: 180000,
        category: "cars",
        image_url: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=400&h=400&fit=crop",
        images: [],
        stock: 18,
        price_flag: "fair",
        is_active: true,
        avg_rating: 4.4,
        review_count: 89,
        sold_count: 67,
        created_at: "2025-11-10T10:00:00Z",
    },
    {
        id: "p8",
        seller_id: "s1",
        seller_name: "TechHub Lagos",
        name: "Sony PlayStation 5 — Disc Edition Bundle",
        description: "PS5 Disc Edition with extra DualSense controller and 3 games. Limited bundle.",
        price: 650000,
        original_price: 750000,
        recommended_price: 640000,
        category: "gaming",
        image_url: "https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=400&h=400&fit=crop",
        images: [],
        stock: 3,
        price_flag: "fair",
        is_active: true,
        avg_rating: 4.8,
        review_count: 1456,
        sold_count: 478,
        created_at: "2025-09-01T10:00:00Z",
    },
    {
        id: "p9",
        seller_id: "s5",
        seller_name: "Lagos Gadget World",
        name: "Samsung Galaxy S24 Ultra 256GB — Suspicious Deal",
        description: "Brand new Samsung Galaxy S24 Ultra at unbeatable price.",
        price: 420000,
        original_price: 450000,
        recommended_price: 880000,
        category: "phones",
        image_url: "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=400&h=400&fit=crop",
        images: [],
        stock: 50,
        price_flag: "suspicious",
        is_active: true,
        avg_rating: 2.1,
        review_count: 23,
        sold_count: 12,
        created_at: "2025-11-20T10:00:00Z",
    },
    {
        id: "p10",
        seller_id: "s1",
        seller_name: "TechHub Lagos",
        name: "AirPods Pro 2nd Gen — USB-C",
        description: "Active Noise Cancellation, Adaptive Transparency, Personalized Spatial Audio. USB-C charging case.",
        price: 185000,
        original_price: 220000,
        recommended_price: 180000,
        category: "electronics",
        image_url: "https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=400&h=400&fit=crop",
        images: [],
        stock: 34,
        price_flag: "fair",
        is_active: true,
        avg_rating: 4.7,
        review_count: 2890,
        sold_count: 1567,
        created_at: "2025-10-20T10:00:00Z",
    },
    {
        id: "p11",
        seller_id: "s2",
        seller_name: "Ratel EV & Power",
        name: "EcoFlow Delta Pro Portable Power Station",
        description: "3.6kWh expandable capacity, 3600W AC output. Power your entire home during outages with this premium solar generator.",
        price: 1850000,
        original_price: 2100000,
        recommended_price: 1800000,
        category: "energy",
        image_url: "https://images.unsplash.com/photo-1621905252507-b35492ee748e?auto=format&fit=crop&w=800&q=80",
        images: [],
        stock: 5,
        price_flag: "fair",
        is_active: true,
        avg_rating: 4.9,
        review_count: 42,
        sold_count: 18,
        created_at: "2025-11-20T10:00:00Z",
    },
    {
        id: "p12",
        seller_id: "s3",
        seller_name: "Naija Auto Parts",
        name: "Car Dash Camera 4K — Dual Lens Night Vision",
        description: "4K front + 1080p rear dash cam. Night vision, parking mode, G-sensor, 128GB support.",
        price: 45000,
        original_price: 65000,
        recommended_price: 42000,
        category: "cars",
        image_url: "https://images.unsplash.com/photo-1549892848-7323862ff057?auto=format&fit=crop&w=800&q=80",
        images: [],
        stock: 45,
        price_flag: "fair",
        is_active: true,
        avg_rating: 4.3,
        review_count: 567,
        sold_count: 345,
        created_at: "2025-10-05T10:00:00Z",
    },
];

// ─── Deals ──────────────────────────────────────────────────

const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
const in3days = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

export const DEMO_DEALS: Deal[] = [
    { id: "d1", product_id: "p1", product: DEMO_PRODUCTS[0], discount_pct: 15, start_at: "2026-02-10T00:00:00Z", end_at: tomorrow, is_active: true },
    { id: "d2", product_id: "p5", product: DEMO_PRODUCTS[4], discount_pct: 20, start_at: "2026-02-10T00:00:00Z", end_at: in3days, is_active: true },
    { id: "d3", product_id: "p8", product: DEMO_PRODUCTS[7], discount_pct: 13, start_at: "2026-02-10T00:00:00Z", end_at: tomorrow, is_active: true },
    { id: "d4", product_id: "p10", product: DEMO_PRODUCTS[9], discount_pct: 16, start_at: "2026-02-10T00:00:00Z", end_at: in3days, is_active: true },
    { id: "d5", product_id: "p12", product: DEMO_PRODUCTS[11], discount_pct: 31, start_at: "2026-02-10T00:00:00Z", end_at: tomorrow, is_active: true },
];

// ─── Reviews ────────────────────────────────────────────────

export const DEMO_REVIEWS: Review[] = [
    { id: "r1", user_id: "u10", user_name: "Chidi O.", product_id: "p1", rating: 5, title: "Amazing phone!", body: "Best Samsung ever. Camera is incredible, battery lasts all day. Fast delivery from TechHub.", verified_purchase: true, created_at: "2026-01-15T10:00:00Z" },
    { id: "r2", user_id: "u11", user_name: "Amaka N.", product_id: "p1", rating: 4, title: "Great but took 3 days", body: "Phone is perfect. Delivery was slower than expected though. 3 days to Abuja.", verified_purchase: true, created_at: "2026-01-20T10:00:00Z" },
    { id: "r3", user_id: "u12", user_name: "Emeka I.", product_id: "p2", rating: 5, title: "iPhone 15 Pro Max is worth every naira", body: "Upgraded from iPhone 12. The camera and performance are night and day. TechHub Lagos is legit.", verified_purchase: true, created_at: "2026-01-10T10:00:00Z" },
    { id: "r4", user_id: "u13", user_name: "Funke A.", product_id: "p4", rating: 5, title: "Beautiful desk", body: "Mahogany is gorgeous. Took a week to deliver to Lagos but worth the wait. Very sturdy.", verified_purchase: true, created_at: "2026-01-05T10:00:00Z" },
    { id: "r5", user_id: "u14", user_name: "Tunde B.", product_id: "p9", rating: 1, title: "SCAM! Don't buy!", body: "Price too low to be real. Phone never arrived. Seller not responding. RATEL should ban this seller!", verified_purchase: false, created_at: "2026-02-01T10:00:00Z" },
];

// ─── Price Alerts ───────────────────────────────────────────

export const DEMO_PRICE_ALERTS: PriceAlert[] = [
    { id: "pa1", product_id: "p3", product_name: "iPhone 15 Pro Max 256GB", seller_id: "s4", seller_name: "PhoneZone Nigeria", alert_type: "overpriced", market_avg: 1200000, seller_price: 1450000, created_at: "2026-02-10T14:30:00Z" },
    { id: "pa2", product_id: "p9", product_name: "Samsung Galaxy S24 Ultra 256GB", seller_id: "s5", seller_name: "Lagos Gadget World", alert_type: "suspicious", market_avg: 880000, seller_price: 420000, created_at: "2026-02-10T15:00:00Z" },
];

// ─── KYC ────────────────────────────────────────────────────

export const DEMO_KYC: KYCSubmission[] = [
    { id: "kyc1", seller_id: "s5", seller_name: "Lagos Gadget World", id_type: "nin", id_number: "12345678901", document_url: "/kyc/doc1.pdf", status: "pending", created_at: "2026-02-08T10:00:00Z" },
];

// ─── Complaints ─────────────────────────────────────────────

export const DEMO_COMPLAINTS: Complaint[] = [
    { id: "c1", user_id: "u14", user_name: "Tunde B.", seller_id: "s5", seller_name: "Lagos Gadget World", order_id: "o5", type: "scam", description: "Paid ₦420,000 for Samsung S24 Ultra. Never received. Seller won't respond. Price was suspiciously low.", status: "investigating", created_at: "2026-02-02T10:00:00Z" },
    { id: "c2", user_id: "u15", user_name: "Ada K.", seller_id: "s4", seller_name: "PhoneZone Nigeria", order_id: "o6", type: "price", description: "iPhone 15 Pro Max listed at ₦1,450,000 when market average is ₦1,200,000. This is price gouging.", status: "open", created_at: "2026-02-09T10:00:00Z" },
];

// ─── Dashboard Stats ────────────────────────────────────────

export const DEMO_ADMIN_STATS: AdminDashboardStats = {
    total_revenue: 45_670_000,
    active_sellers: 127,
    flagged_products: 14,
    open_complaints: 8,
    total_users: 15_234,
    total_orders: 4_567,
};

export const DEMO_SELLER_STATS: SellerDashboardStats = {
    total_revenue: 12_450_000,
    pending_revenue: 890_000,
    monthly_revenue: 3_200_000,
    total_orders: 234,
    new_orders: 12,
    products_count: 28,
    trust_score: 96,
    flagged_products: 0,
};

// ─── Price Comparison Helper ────────────────────────────────

export function getDemoPriceComparison(productId: string): PriceComparison {
    const product = DEMO_PRODUCTS.find((p) => p.id === productId);
    if (!product) {
        return { market_low: 0, market_high: 0, market_avg: 0, ratel_best: 0, current_price: 0, flag: "none", savings: 0 };
    }
    const avgPrice = product.recommended_price || product.price;
    const marketLow = Math.round(avgPrice * 0.9);
    const marketHigh = Math.round(avgPrice * 1.35);
    const ratelBest = DEMO_PRODUCTS
        .filter((p) => p.name.split("—")[0].trim() === product.name.split("—")[0].trim() && p.id !== product.id)
        .reduce((best, p) => (p.price < best ? p.price : best), product.price);

    return {
        market_low: marketLow,
        market_high: marketHigh,
        market_avg: avgPrice,
        ratel_best: ratelBest,
        current_price: product.price,
        flag: product.price_flag,
        savings: product.original_price ? product.original_price - product.price : 0,
    };
}
