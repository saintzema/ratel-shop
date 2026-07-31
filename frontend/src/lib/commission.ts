import { db } from "@/lib/db";

/**
 * Single source of truth for "what commission rate applies to this sale."
 *
 * Admin Settings' "Standard Commission" (SystemSetting.standardCommission)
 * used to be purely cosmetic — saved to the DB, never read by anything that
 * actually moved money. Regular-checkout payouts used Seller.commissionRate
 * (a per-seller column nobody has a UI to edit, frozen at whatever it was
 * when the seller row was created) and QR/split-payment checkout used a
 * hardcoded 2.5 fallback. An admin changing the Settings page number did
 * nothing to any live transaction on either path.
 *
 * Now: the live admin setting is authoritative for every seller by default.
 * Seller.commissionRate is kept as a genuine per-seller override — only used
 * when it's been explicitly set to something OTHER than the column's own
 * default (2.5), which is the only signal available to tell "an admin
 * deliberately customized this seller" apart from "nobody ever touched it."
 */
export async function resolveCommissionRate(sellerCommissionRate: number | null | undefined): Promise<number> {
    const settings = await db.systemSetting.findUnique({
        where: { id: "global" },
        select: { standardCommission: true },
    }).catch(() => null);

    const globalRate = settings?.standardCommission;
    const hasCustomOverride = typeof sellerCommissionRate === "number" && sellerCommissionRate !== 2.5;

    if (hasCustomOverride) return sellerCommissionRate as number;
    if (typeof globalRate === "number") return globalRate;
    return sellerCommissionRate ?? 2.5;
}
