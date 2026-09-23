/**
 * The pure arithmetic of reward credit — no database, no server imports.
 *
 * It lives apart from credit-wallet.ts because the checkout page is a client
 * component and needs the same cap the server applies, so the figure on
 * screen is the figure that gets charged. Importing it from credit-wallet
 * would drag Prisma into the browser bundle; this repo has been broken that
 * way before.
 */

/**
 * Credit may cover at most this share of any one bill.
 *
 * It bounds what the platform funds out of take rate on a single transaction,
 * and stops the cheapest items and shortest rides being farmed to zero —
 * which is exactly what someone gaming a check-in streak would go looking
 * for. A discount, never a free ride.
 */
export const MAX_CREDIT_SHARE = 0.3;

/** Below this, payment-processor fees make the residual charge pointless. */
export const MIN_CHARGE_NAIRA = 100;

/**
 * How much credit a bill of `billTotal` can absorb — the single definition of
 * this number, shared by the checkout page, the ride payment page and the
 * server. Callers on the server must re-derive it from the stored balance
 * rather than accept it from a request.
 */
export function applicableCredit(balance: number, billTotal: number, marginCap?: number): number {
    if (!(billTotal > 0) || !(balance > 0)) return 0;
    // `marginCap` is what the platform actually earns on THIS transaction. A
    // reward funded from take rate cannot exceed the take rate, or every
    // redemption is a loss: on a ₦2,000 ride we earn ₦240 at 12%, so a ₦600
    // discount would turn a profitable trip into a ₦360 hole. Callers that
    // know their margin pass it; the share cap still applies on top.
    const ceiling = typeof marginCap === "number"
        ? Math.min(balance, Math.max(0, marginCap))
        : balance;
    const capped = Math.floor(Math.min(ceiling, billTotal * MAX_CREDIT_SHARE));
    // Never leave a residue too small to charge — reduce to whatever keeps the
    // remaining payment above the floor, or apply nothing at all.
    if (billTotal - capped < MIN_CHARGE_NAIRA) {
        const reduced = Math.floor(billTotal - MIN_CHARGE_NAIRA);
        return reduced > 0 ? reduced : 0;
    }
    return capped;
}
