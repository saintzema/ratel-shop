/**
 * On-platform boost packages (Jiji-style Basic / Premium / VIP + add-ons).
 *
 * Distinct from the Meta ad boost in /api/seller/facebook/promote — that one
 * spends real money with Facebook/Instagram to reach people OFF FairPrice and
 * requires a connected Page and an existing post. These packages buy placement
 * WITHIN FairPrice (top of search, sponsored slots, trending rail), which needs
 * no external account and is what a first-time seller can actually buy on day
 * one. The two are complementary and can both be active on one listing.
 *
 * ─── PRICING BASIS (real, observed August 2026) ──────────────────────────────
 * Priced deliberately UNDER Jiji, read off their live logged-in Premium
 * Services pages plus the entry offers they made directly to our own account:
 *
 *   Jiji entry offers (what a small seller is actually quoted):
 *     ₦2,999  / 1 week
 *     ₦6,499  / 1 month, up to 30 products
 *
 *   Jiji published package prices (1 month):
 *     Property  Basic ₦17,999 · Premium ₦27,499
 *     Others    Premium ₦31,999
 *     Cars      Premium ₦49,999
 *     Others Lite  VIP Gold ₦57,999 · Diamond Gold ₦71,999
 *     All-in-one   Diamond Gold ₦128,999 · Diamond Elite ₦154,999 ·
 *                  Enterprise Gold ₦219,999
 *
 *   Jiji add-ons:
 *     WhatsApp Button ₦5,500 (20 ads / 14 days)
 *     Discounts       ₦3,700 (20 ads / 15 days)
 *
 * Everything above the entry offers is where FairPrice competes: a Nigerian
 * seller with a handful of listings is not paying ₦31,999–₦49,999/month, and
 * that gap is the wedge. Our tiers sit at or below Jiji's OWN entry pricing
 * while covering more listings, and our add-ons roughly halve theirs.
 *
 * These are real, chargeable numbers. This file is the single source of truth —
 * nothing else hardcodes a price. Revisit when Jiji's pricing moves (they
 * discount 8–9% off list regularly, so treat their list price as a ceiling).
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface BoostTier {
    id: "starter" | "basic" | "premium" | "vip";
    label: string;
    priceNaira: number;
    days: number;
    /** How many of the seller's listings one purchase covers. */
    maxListings: number;
    tagline: string;
    perks: string[];
    /** What Jiji charges for the nearest equivalent — shown as the comparison. */
    jijiComparisonNaira?: number;
    jijiComparisonLabel?: string;
    /** Placement effects applied to the product while the boost is live. */
    effects: {
        sponsored: boolean;
        trending: boolean;
        /** Relative weight for top-of-search ordering; higher wins. */
        searchRank: number;
    };
    accent: string;
}

export interface BoostAddOn {
    id: string;
    label: string;
    description: string;
    /** PLACEHOLDER — see the warning above. */
    priceNaira: number;
    /**
     * For add-ons that buy real external ad inventory: how much of the price is
     * actual ad spend with the platform. The remainder is FairPrice's cut.
     * Kept explicit rather than a percentage so the split is auditable, and so
     * the seller can be told exactly what reaches Meta.
     */
    adSpendNaira?: number;
}

/** The add-on that extends an on-platform boost onto Facebook + Instagram. */
export const META_ADS_ADDON_ID = "meta_ads";

export const BOOST_TIERS: BoostTier[] = [
    {
        id: "starter",
        label: "Starter",
        // Undercuts Jiji's ₦2,999/week entry offer and covers 3 listings, not 1.
        priceNaira: 1999,
        days: 7,
        maxListings: 3,
        tagline: "Try a boost for a week",
        perks: [
            "Boost up to 3 listings for 7 days",
            "Ranked above non-boosted listings in search",
            "Full performance stats — views, contacts, chats",
        ],
        jijiComparisonNaira: 2999,
        jijiComparisonLabel: "Jiji: ₦2,999/week",
        effects: { sponsored: false, trending: false, searchRank: 10 },
        accent: "from-slate-500 to-slate-700",
    },
    {
        id: "basic",
        label: "Basic",
        // Directly against Jiji's ₦6,499/month-for-30-products entry offer.
        priceNaira: 4999,
        days: 30,
        maxListings: 10,
        tagline: "A full month, sponsored",
        perks: [
            "Boost up to 10 listings for 30 days",
            "Sponsored badge on every boosted listing",
            "Ranked above non-boosted listings in search",
            "Full performance stats",
        ],
        jijiComparisonNaira: 6499,
        jijiComparisonLabel: "Jiji: ₦6,499/month",
        effects: { sponsored: true, trending: false, searchRank: 40 },
        accent: "from-indigo-500 to-violet-600",
    },
    {
        id: "premium",
        label: "Premium",
        // Jiji's cheapest comparable monthly package is ₦17,999 (Property Basic);
        // for Others it's ₦31,999. We sit far under both with more listings.
        priceNaira: 9999,
        days: 30,
        maxListings: 30,
        tagline: "Your whole shop, boosted",
        perks: [
            "Boost up to 30 listings for 30 days",
            "Sponsored badge + Trending rail placement",
            "Priority ranking above Basic boosts",
            "Full performance stats",
        ],
        jijiComparisonNaira: 17999,
        jijiComparisonLabel: "Jiji: from ₦17,999/month",
        effects: { sponsored: true, trending: true, searchRank: 70 },
        accent: "from-fuchsia-500 to-purple-600",
    },
    {
        id: "vip",
        label: "VIP",
        // Against Jiji Cars Premium ₦49,999 and Others Lite VIP Gold ₦57,999.
        priceNaira: 24999,
        days: 30,
        maxListings: 100,
        tagline: "Top of search, everywhere",
        perks: [
            "Boost up to 100 listings for 30 days",
            "Top-of-search priority over every other boost",
            "Featured in the Trending rail",
            "Sponsored badge across your whole catalogue",
            "Full performance stats",
        ],
        jijiComparisonNaira: 49999,
        jijiComparisonLabel: "Jiji: from ₦49,999/month",
        effects: { sponsored: true, trending: true, searchRank: 100 },
        accent: "from-amber-400 to-orange-500",
    },
];

export const BOOST_ADDONS: BoostAddOn[] = [
    {
        id: META_ADS_ADDON_ID,
        label: "Advertise on Facebook & Instagram",
        description:
            "We post this product to your connected Facebook Page and Instagram, then run it as a real paid ad on Meta — reaching people who've never heard of FairPrice.",
        // ₦5,000 of this is real Meta ad spend; ₦1,500 is FairPrice's cut for
        // publishing the post and running the campaign. Split kept explicit so
        // the seller can be told exactly what reaches Facebook.
        priceNaira: 6500,
        adSpendNaira: 5000,
    },
    {
        id: "whatsapp_button",
        label: "WhatsApp Button",
        // Jiji: ₦5,500 for 20 ads / 14 days. Ours covers the whole boost period.
        description: "One-tap WhatsApp button on your boosted listings, for the full length of your package.",
        priceNaira: 2500,
    },
    {
        id: "discounts",
        label: "Discount Badge",
        // Jiji: ₦3,700 for 20 ads / 15 days.
        description: "Show a strike-through discount badge on your boosted listings — the single biggest driver of clicks.",
        priceNaira: 1800,
    },
    {
        id: "auto_renew",
        label: "Auto-Renew",
        description: "Automatically re-boost when the package expires, so your listings never go quiet.",
        priceNaira: 1500,
    },
];

export const getTier = (id: string) => BOOST_TIERS.find(t => t.id === id);
export const getAddOn = (id: string) => BOOST_ADDONS.find(a => a.id === id);

/** Total in naira for a tier plus any selected add-ons. */
export function calculateBoostTotal(tierId: string, addOnIds: string[] = [], listingType?: string | null): number {
    // listingType is optional and defaults to product pricing, so every existing
    // caller keeps its current behaviour. It MUST be passed wherever a scaled
    // ladder is displayed, or the seller sees one price and is charged another.
    const tier = (listingType ? tiersForListingType(listingType) : BOOST_TIERS).find(t => t.id === tierId);
    if (!tier) return 0;
    // Add-ons are flat: a WhatsApp button costs the same to run whatever it is
    // attached to, so only the tier scales.
    return addOnIds.reduce((sum, id) => sum + (getAddOn(id)?.priceNaira ?? 0), tier.priceNaira);
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-listing-type pricing
//
// The tiers above are priced for physical goods, where a boost competes for a
// ₦20k–₦2m sale. That is the wrong shape for the other listing types:
//
//   - PROPERTY sells a ₦20m–₦200m asset on a months-long cycle, and agents list
//     in volume. A boost is worth far more per listing, and Jiji charges
//     accordingly (their Property tiers run ₦17,999–₦481,000/month against
//     ₦2,999/week for general goods). Pricing property like a phone leaves
//     most of the value uncollected.
//   - JOBS are posted by employers, not traders. One vacancy, filled once, and
//     the posting is worth nothing the day it is filled — so duration matters
//     more than listing count, and a 7-day boost is close to useless.
//   - SERVICES sit between the two: recurring work, moderate ticket, and the
//     provider wants sustained visibility rather than a burst.
//
// Rather than maintain four parallel tier ladders that drift apart, one ladder
// is scaled per type. Multipliers are round numbers on purpose — they are a
// starting position to test against real conversion, not a derived truth.
// ─────────────────────────────────────────────────────────────────────────────

export interface ListingTypePricing {
    /** Applied to every tier's priceNaira. */
    multiplier: number;
    /** Heading shown above the packages for this type. */
    label: string;
    /** One line explaining to the seller why this costs what it costs. */
    rationale: string;
    /** Minimum flight length for this type, where a short boost is pointless. */
    minDays?: number;
}

export const LISTING_TYPE_PRICING: Record<string, ListingTypePricing> = {
    product: {
        multiplier: 1,
        label: "Promote your listing",
        rationale: "Reach more buyers searching for what you sell.",
    },
    property: {
        multiplier: 3,
        label: "Premium Services for Property",
        rationale: "Property buyers take weeks to decide. These packages keep your listing in front of them for the whole search — and one closed sale pays for a year of them.",
        // A 7-day property boost expires before most buyers finish shortlisting.
        minDays: 30,
    },
    job: {
        multiplier: 1.5,
        label: "Promote your vacancy",
        rationale: "Reach qualified candidates in your state. A vacancy is worth nothing the day it is filled, so these run for a full hiring cycle rather than a week.",
        minDays: 30,
    },
    service: {
        multiplier: 1.2,
        label: "Promote your service",
        rationale: "Stay visible to people looking for your trade in your area, not just on the day you post.",
        minDays: 14,
    },
};

/** Pricing config for a listing type, defaulting to product. */
export function pricingForListingType(type?: string | null): ListingTypePricing {
    return LISTING_TYPE_PRICING[String(type || "product").toLowerCase()] || LISTING_TYPE_PRICING.product;
}

/**
 * The boost tiers as they should be sold for a given listing type — scaled
 * price, and a floor on duration where a short flight is pointless.
 *
 * Prices are rounded to the nearest ₦100 and end in 99, matching how the base
 * tiers are already priced. Never mutates BOOST_TIERS.
 */
export function tiersForListingType(type?: string | null): BoostTier[] {
    const cfg = pricingForListingType(type);
    if (cfg.multiplier === 1 && !cfg.minDays) return BOOST_TIERS;

    return BOOST_TIERS.map(tier => {
        const scaled = tier.priceNaira * cfg.multiplier;
        // Round to the nearest hundred, then land on x99 like the base ladder.
        const priceNaira = Math.max(99, Math.round(scaled / 100) * 100 - 1);
        return {
            ...tier,
            priceNaira,
            days: cfg.minDays ? Math.max(tier.days, cfg.minDays) : tier.days,
            // The Jiji comparison was researched against general-goods pricing and
            // does not hold for property or jobs. Drop it rather than show a
            // comparison that is not true for this type.
            jijiComparisonNaira: cfg.multiplier === 1 ? tier.jijiComparisonNaira : undefined,
            jijiComparisonLabel: cfg.multiplier === 1 ? tier.jijiComparisonLabel : undefined,
        };
    });
}
