import { db } from "@/lib/db";
import { applicableCredit } from "@/lib/credit-rules";

// Re-exported so server callers have one import for the whole wallet API.
export { applicableCredit, MAX_CREDIT_SHARE, MIN_CHARGE_NAIRA } from "@/lib/credit-rules";

/**
 * One wallet for every credit a user has earned — daily check-ins, rewarded
 * ads — and one place that decides how much of a given bill it may cover.
 *
 * Why a shared module: credits are small and numerous (a check-in pays ₦10),
 * so "apply the single most recent credit", which is what checkout used to
 * do, means a user with six ₦10 credits gets ₦10 off and quietly loses the
 * rest. Any bill that can accept credit — an order, a ride, a delivery — goes
 * through redeemCredits() so the behaviour, the caps and the audit trail are
 * identical everywhere.
 *
 * The ledger is the AdRewardCredit table. Credits are never converted to
 * cash and there is no withdrawal path: the only exit is against a real bill.
 */

export interface WalletView {
    balance: number;
    /** How much of `billTotal` this wallet may actually cover right now. */
    applicable: number;
    /** What the customer would still pay. */
    amountDue: number;
}

/** Total unexpired, unspent credit, floored to whole naira. */
export async function getBalance(userId: string): Promise<number> {
    const result = await db.adRewardCredit.aggregate({
        where: { userId, status: "active", expiresAt: { gt: new Date() } },
        _sum: { amount: true },
    });
    return Math.max(0, Math.floor(result._sum.amount ?? 0));
}

export async function previewWallet(userId: string, billTotal: number): Promise<WalletView> {
    const balance = await getBalance(userId);
    const applicable = applicableCredit(balance, billTotal);
    return { balance, applicable, amountDue: Math.max(0, billTotal - applicable) };
}

/**
 * Spends `amount` of credit, oldest-expiring first, and marks what it used.
 *
 * Returns how much it actually managed to spend — which may be less than
 * asked if another payment consumed the same credits first. Callers settle
 * against the returned figure, never the requested one.
 *
 * Each credit is claimed with a conditional update that only matches while it
 * is still `active`, so two payments racing for the same ₦10 cannot both win
 * it: the loser's update matches nothing and it moves to the next credit. A
 * credit bigger than the remaining need is split — the used part is marked
 * redeemed and the remainder becomes a fresh active credit with the same
 * expiry, so change is never swallowed.
 */
export async function redeemCredits(userId: string, amount: number, redeemedOrderId: string): Promise<number> {
    if (!(amount > 0)) return 0;

    const available = await db.adRewardCredit.findMany({
        where: { userId, status: "active", expiresAt: { gt: new Date() } },
        orderBy: { expiresAt: "asc" },
    });

    let remaining = amount;
    let spent = 0;

    for (const credit of available) {
        if (remaining <= 0) break;

        const claimed = await db.adRewardCredit.updateMany({
            where: { id: credit.id, status: "active" },
            data: { status: "redeemed", redeemedOrderId, redeemedAt: new Date() },
        });
        if (claimed.count === 0) continue; // someone else got there first

        const used = Math.min(credit.amount, remaining);
        const change = credit.amount - used;
        if (change > 0) {
            await db.adRewardCredit.create({
                data: {
                    userId,
                    amount: change,
                    source: credit.source,
                    status: "active",
                    expiresAt: credit.expiresAt,
                },
            });
        }
        spent += used;
        remaining -= used;
    }

    return spent;
}
