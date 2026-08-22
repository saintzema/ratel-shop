import { db } from "@/lib/db";

/**
 * Resolve THE seller record for a signed-in user, deterministically.
 *
 * Every endpoint used to do:
 *
 *     db.seller.findFirst({ where: { OR: [{ userId }, { ownerEmail }] } })
 *
 * with no ordering. A user can legitimately own more than one seller row — the
 * Sell (+) quick-list flow auto-drafts a placeholder store ("<Name>'s Shop")
 * separate from the store they actually trade under — and with no ORDER BY,
 * Postgres is free to return whichever row it likes, and can return a different
 * one from request to request.
 *
 * Observed in production: one owner had three rows. The real store carried the
 * bank account, the WhatsApp number and 300 products; two placeholders carried
 * nothing. Whenever a placeholder won the race the seller was told to add a
 * payout account they had already added, told to connect WhatsApp they had
 * already connected, shown "0 items" on a 300-product catalogue, told to "add a
 * product first" in the Social Composer, and — because the placeholder's name
 * matches the "never onboarded" shape — bounced into onboarding.
 *
 * Ordering rules, strongest signal first:
 *   1. a real payout account on file  — the strongest "this is the live store"
 *   2. verified, then active          — a vetted store beats a draft
 *   3. a WhatsApp number on file      — real setup work was done here
 *   4. oldest                         — the original store, not a later draft
 *
 * Deliberately NOT deleting the duplicates: their ids may already be referenced
 * by products, orders and payouts, so merging them is a data migration that
 * needs a human decision, not a side effect of a read.
 */
export async function resolveSellerForUser(
    user: { userId?: string; email?: string | null } | null | undefined,
    select?: any
) {
    if (!user?.userId && !user?.email) return null;

    const where = {
        OR: [
            ...(user.userId ? [{ userId: user.userId }] : []),
            ...(user.email ? [{ ownerEmail: user.email }] : []),
        ],
    };

    const candidates = await db.seller.findMany({
        where,
        ...(select ? { select: { ...select, id: true, bankName: true, accountNumber: true, verified: true, status: true, whatsappNumber: true, createdAt: true } } : {}),
    });

    if (candidates.length === 0) return null;
    if (candidates.length === 1) return candidates[0];

    const score = (s: any) => {
        let n = 0;
        if (s.bankName && s.accountNumber) n += 8;
        if (s.verified === true) n += 4;
        if (s.status === "active") n += 2;
        if (s.whatsappNumber) n += 1;
        return n;
    };

    return candidates.sort((a: any, b: any) => {
        const d = score(b) - score(a);
        if (d !== 0) return d;
        // Stable tie-break: the earliest row is the original store.
        return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
    })[0];
}

/** How many seller rows this user owns — used to warn about duplicates. */
export async function countSellersForUser(user: { userId?: string; email?: string | null }): Promise<number> {
    if (!user?.userId && !user?.email) return 0;
    return db.seller.count({
        where: {
            OR: [
                ...(user.userId ? [{ userId: user.userId }] : []),
                ...(user.email ? [{ ownerEmail: user.email }] : []),
            ],
        },
    });
}
