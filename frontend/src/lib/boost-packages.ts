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
 * ⚠️  PRICING IS PLACEHOLDER. Every naira figure below is a structural stand-in
 *     so the flow is buildable and testable end to end — they are NOT commercial
 *     decisions and have not been signed off. Set the real numbers here (this is
 *     the single source of truth; nothing else hardcodes a price) before this is
 *     promoted to anything customers can pay against.
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
}

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
