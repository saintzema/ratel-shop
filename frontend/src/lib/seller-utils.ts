import { db } from "@/lib/db";

/**
 * Guarantee every seller has a human-readable storeUrl. Without this, a seller
 * whose onboarding/update call ever sends an empty store_url ends up with
 * storeUrl=null in the DB, and every place that renders "share your store link"
 * falls back to the raw seller id (e.g. /store/s_cmr39zb0000004jr) — confusing
 * and unshareable. Slugifies the business name and appends a short suffix on
 * collision so it stays unique.
 */
export async function resolveStoreUrl(requested: string | undefined | null, businessName: string | undefined, sellerId: string): Promise<string> {
    const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50);

    let base = slugify(requested || businessName || "store");
    if (!base) base = "store";

    let candidate = base;
    let suffix = 0;
    while (true) {
        const existing = await db.seller.findFirst({ where: { storeUrl: candidate }, select: { id: true } });
        if (!existing || existing.id === sellerId) return candidate;
        suffix += 1;
        candidate = `${base}-${suffix}`;
    }
}
