// Lightweight feature-discovery nudges for the seller dashboard — points new
// (and existing) sellers at real features they haven't opened yet, so
// something like Quotes & Invoices or the Social Composer doesn't just sit
// undiscovered in the sidebar forever. Tracked client-side per seller; no
// backend needed since this is purely "have they ever opened this page."
export interface FeatureTourItem {
    key: string;
    label: string;
    description: string;
    href: string;
}

export const FEATURE_TOUR_ITEMS: FeatureTourItem[] = [
    {
        key: "quotes",
        href: "/seller/quotes",
        label: "Quotes & Invoices",
        description: "Describe a job in plain language and get an AI-drafted, editable quote with a payable link — no spreadsheet needed.",
    },
    {
        key: "social",
        href: "/seller/social",
        label: "Social Composer",
        description: "Write once, post everywhere — auto-publish to Instagram and Facebook, formatted per platform, now or scheduled.",
    },
    {
        key: "team",
        href: "/seller/settings/team",
        label: "Team",
        description: "Invite staff to help run your store, with permissions that stop them from touching price or stock unless you allow it.",
    },
    {
        key: "discounts",
        href: "/seller/discounts",
        label: "Discounts & Coupons",
        description: "Run a limited-time discount or issue a coupon code without editing every product's price by hand.",
    },
    {
        key: "analytics",
        href: "/seller/analytics",
        label: "Analytics",
        description: "See what's actually selling, where your traffic comes from, and which products need a better photo or price.",
    },
];

function storageKey(sellerId: string) {
    return `fp_seller_tour_seen_${sellerId}`;
}

export function getSeenFeatures(sellerId: string): Set<string> {
    if (typeof window === "undefined" || !sellerId) return new Set();
    try {
        const raw = localStorage.getItem(storageKey(sellerId));
        return new Set(raw ? JSON.parse(raw) : []);
    } catch {
        return new Set();
    }
}

export function markFeatureSeen(sellerId: string, key: string) {
    if (typeof window === "undefined" || !sellerId) return;
    const seen = getSeenFeatures(sellerId);
    if (seen.has(key)) return;
    seen.add(key);
    try {
        localStorage.setItem(storageKey(sellerId), JSON.stringify(Array.from(seen)));
    } catch { /* storage full/unavailable — non-critical, just means the nudge repeats */ }
}

// The first tracked feature this seller hasn't opened yet, or null if they've
// opened everything we currently nudge for.
export function getNextUnseenFeature(sellerId: string): FeatureTourItem | null {
    const seen = getSeenFeatures(sellerId);
    return FEATURE_TOUR_ITEMS.find((f) => !seen.has(f.key)) || null;
}
