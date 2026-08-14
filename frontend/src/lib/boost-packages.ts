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
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️  PRICING IS STILL PLACEHOLDER. Every naira figure below is a structural
 *     stand-in so the flow is testable end to end — NOT a commercial decision.
 *     This file is the single source of truth; nothing else hardcodes a price.
 *
 *     We tried to price these competitively against Jiji and could not do it
 *     honestly: Jiji's price table sits behind a login (jiji.ng/sc/premium-services
 *     302-redirects to their login), and the only naira figures on the open web
 *     are from an April 2023 article — three years and a large devaluation out of
 *     date. Guessing from those would mean charging real money against numbers we
 *     know are wrong, so the placeholders stay until someone reads the real ones
 *     off a logged-in Jiji seller account (or asks their sales line).
 *
 *     What IS verified from Jiji's live public FAQ (jiji.ng/faq/22, /faq/24):
 *       - Two product lines: TOP (single ad to top of search, 7 or 30 days) and
 *         Boost (lifts ALL your ads, 1/3/6/12 months, auto-renews on an interval
 *         that tightens as the tier rises).
 *       - Tiers ascend Start → Basic → Business → Premium → VIP → VIP Gold →
 *         VIP+ → Diamond → Enterprise.
 *       - Five category groups gate which packages you can buy: Cars, Property,
 *         Others, Others Lite, All-in-one. Cars/Property price highest.
 *       - "Pro Sales" (pay-per-click) is bundled into Boost, not sold separately.
 *     For a real market band, PropertyPro.ng publishes live agent plans at
 *     ₦15,900–₦169,900/month — a genuine current Nigerian data point.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface BoostTier {
    id: "basic" | "premium" | "vip";
    label: string;
    /** PLACEHOLDER — see the warning above. */
    priceNaira: number;
    days: number;
    tagline: string;
    perks: string[];
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
        id: "basic",
        label: "Basic",
        priceNaira: 1500,
        days: 7,
        tagline: "Get seen above free listings",
        perks: [
            "Ranked above non-boosted listings in search",
            "7 days of higher placement",
            "Performance stats on your dashboard",
        ],
        effects: { sponsored: false, trending: false, searchRank: 10 },
        accent: "from-slate-500 to-slate-700",
    },
    {
        id: "premium",
        label: "Premium",
        priceNaira: 4000,
        days: 14,
        tagline: "Sponsored placement + trending rail",
        perks: [
            "Everything in Basic",
            "Sponsored badge on your listing",
            "Appears in the Trending rail on the homepage",
            "14 days of higher placement",
        ],
        effects: { sponsored: true, trending: false, searchRank: 50 },
        accent: "from-indigo-500 to-violet-600",
    },
    {
        id: "vip",
        label: "VIP",
        priceNaira: 9000,
        days: 30,
        tagline: "Top of search for a full month",
        perks: [
            "Everything in Premium",
            "Top-of-search priority over other boosts",
            "Featured in the Trending rail",
            "30 days of maximum visibility",
        ],
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
        // PLACEHOLDER pricing. adSpendNaira is what actually reaches Meta; the
        // difference is FairPrice's cut for running it.
        priceNaira: 6000,
        adSpendNaira: 5000,
    },
    {
        id: "whatsapp_button",
        label: "WhatsApp Button",
        description: "Show a one-tap WhatsApp button on this listing so buyers can reach you instantly.",
        priceNaira: 1000,
    },
    {
        id: "extra_photos",
        label: "Extra Photo Slots",
        description: "Raise this listing's gallery limit so you can show the item from every angle.",
        priceNaira: 500,
    },
    {
        id: "auto_renew",
        label: "Auto-Renew",
        description: "Automatically re-boost this listing when the package expires, so it never goes quiet.",
        priceNaira: 800,
    },
];

export const getTier = (id: string) => BOOST_TIERS.find(t => t.id === id);
export const getAddOn = (id: string) => BOOST_ADDONS.find(a => a.id === id);

/** Total in naira for a tier plus any selected add-ons. */
export function calculateBoostTotal(tierId: string, addOnIds: string[] = []): number {
    const tier = getTier(tierId);
    if (!tier) return 0;
    return addOnIds.reduce((sum, id) => sum + (getAddOn(id)?.priceNaira ?? 0), tier.priceNaira);
}
