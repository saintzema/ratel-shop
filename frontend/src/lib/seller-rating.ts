import { db } from "@/lib/db";

/**
 * A seller's rating used to just sit at whatever value was set at creation —
 * nothing recomputed it from real reviews. Call this after any review that
 * touches a seller (a quote/expert-hire review, or a review on one of their
 * products) so the number shown on the store page and in search actually
 * reflects what customers said, not a stale default.
 */
export async function recomputeSellerRating(sellerId: string): Promise<void> {
    try {
        const [direct, viaProducts] = await Promise.all([
            db.review.findMany({ where: { sellerId }, select: { rating: true } }),
            db.review.findMany({ where: { product: { sellerId } }, select: { rating: true } }),
        ]);
        const all = [...direct, ...viaProducts];
        if (all.length === 0) return;
        const avg = all.reduce((sum, r) => sum + r.rating, 0) / all.length;
        await db.seller.update({ where: { id: sellerId }, data: { rating: Math.round(avg * 10) / 10 } });
    } catch (e) {
        console.error("[recomputeSellerRating] failed:", e);
    }
}
