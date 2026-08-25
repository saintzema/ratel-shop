// Shared DB → client mapper so the API route, the server PDP page, and any
// other server fetch produce an IDENTICAL snake_case product shape. This is the
// single source of truth for what a "product" looks like on the client, which is
// what keeps the same URL rendering the same data on every device.

type DbSellerLike = {
    businessName?: string | null;
    status?: string | null;
    verified?: boolean | null;
    rating?: number | null;
    trustScore?: number | null;
    createdAt?: Date | string | null;
    subscriptionPlan?: string | null;
} | null | undefined;

type DbProductLike = Record<string, any> & {
    id: string;
    sellerId?: string | null;
    sellerName?: string | null;
    originalPrice?: number | null;
    recommendedPrice?: number | null;
    imageUrl?: string | null;
    priceFlag?: string | null;
    isSponsored?: boolean | null;
    isTrending?: boolean | null;
    isActive?: boolean | null;
    financingAvailable?: boolean | null;
    avgRating?: number | null;
    reviewCount?: number | null;
    soldCount?: number | null;
    createdAt?: Date | string | null;
    updatedAt?: Date | string | null;
    seller?: DbSellerLike;
};

function toIso(v: Date | string | null | undefined): string | undefined {
    if (!v) return undefined;
    return v instanceof Date ? v.toISOString() : String(v);
}

/**
 * Map a Prisma product (optionally with a `seller` include) to the snake_case
 * shape the client product components expect. Safe to call on the server.
 */
export function mapDbProductToClient(product: DbProductLike) {
    return {
        ...product,
        seller_id: product.sellerId,
        seller_name: product.sellerName || product.seller?.businessName,
        original_price: product.originalPrice,
        recommended_price: product.recommendedPrice,
        image_url: product.imageUrl,
        price_flag: product.priceFlag,
        is_sponsored: product.isSponsored,
        is_trending: product.isTrending,
        is_active: product.isActive,
        financing_available: product.financingAvailable,
        avg_rating: product.avgRating,
        review_count: product.reviewCount,
        // Condition has always been on the model but never reached the client, so
        // no card, filter or PDP could show it. Location is new — both feed the
        // search filters and the location-priority ranking.
        condition: product.condition,
        location_state: (product as any).locationState ?? null,
        location_city: (product as any).locationCity ?? null,
        sold_count: product.soldCount,
        created_at: toIso(product.createdAt),
        updated_at: toIso(product.updatedAt),
        seller: product.seller ? {
            ...product.seller,
            business_name: product.seller.businessName,
            subscription_plan: product.seller.subscriptionPlan,
            trust_score: product.seller.trustScore,
            created_at: toIso(product.seller.createdAt),
        } : null,
    };
}
