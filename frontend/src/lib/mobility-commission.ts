import { db } from "@/lib/db";

/**
 * How FairPrice earns on rides and deliveries — the one place the take rate
 * is defined, applied and recorded.
 *
 * The model is inDrive's, because inDrive's is the one that works in Nigeria:
 *
 *  - The RIDER still names the price and the driver still accepts or counters.
 *    We take a cut of the agreed fare; we don't set the fare. That's the whole
 *    reason drivers and riders prefer it to Uber's opaque algorithmic pricing.
 *  - The cut is deliberately low. Uber takes ~25% from Nigerian drivers and
 *    Bolt ~20%; inDrive's near-single-digit commission is the single biggest
 *    reason Nigerian drivers switch and then recruit other drivers. In a
 *    mobility marketplace the scarce side is supply, so the commission is a
 *    growth lever, not just a revenue dial. Default 12%, admin-editable.
 *  - Commission is owed on EVERY completed job, not only the ones paid in
 *    app. Nigeria runs on cash: if the fare is handed over in the car, we
 *    never touch it, so the commission becomes a charge on the driver's
 *    ledger that they clear from later earnings — the wallet every Bolt and
 *    inDrive driver already understands.
 *
 * Revenue per job = fare × rate. On an in-app fare it is netted out of the
 * transfer automatically, because the full fare landed in our Paystack
 * account and we only send the driver the remainder.
 */

const DEFAULT_RIDE_COMMISSION = 12;
const DEFAULT_DELIVERY_COMMISSION = 12;

export type JobType = "ride" | "delivery";

let cached: { rates: { ride: number; delivery: number }; at: number } | null = null;
const CACHE_MS = 60_000;

export async function commissionRates(): Promise<{ ride: number; delivery: number }> {
    if (cached && Date.now() - cached.at < CACHE_MS) return cached.rates;
    const settings = await db.systemSetting.findUnique({ where: { id: "global" } }).catch(() => null);
    const rates = {
        ride: (settings as any)?.rideCommission ?? DEFAULT_RIDE_COMMISSION,
        delivery: (settings as any)?.deliveryCommission ?? DEFAULT_DELIVERY_COMMISSION,
    };
    cached = { rates, at: Date.now() };
    return rates;
}

export async function commissionRateFor(jobType: JobType): Promise<number> {
    const rates = await commissionRates();
    return jobType === "ride" ? rates.ride : rates.delivery;
}

export interface CommissionSplit {
    fare: number;
    ratePct: number;
    /** What FairPrice keeps. */
    commission: number;
    /** What the driver or courier is actually transferred. */
    payout: number;
}

/** Splits an agreed fare into the platform's cut and the earner's payout. */
export async function splitFare(jobType: JobType, fare: number): Promise<CommissionSplit> {
    const ratePct = await commissionRateFor(jobType);
    const commission = Math.max(0, Math.round(fare * (ratePct / 100)));
    return { fare, ratePct, commission, payout: Math.max(0, fare - commission) };
}

/**
 * Books the commission for one completed job.
 *
 * `settled` for an in-app fare (already netted out of the payout) and `owed`
 * for a cash fare (the driver holds our money and will clear it later).
 *
 * Idempotent on (jobType, jobId): a retried payment webhook or a
 * double-tapped "paid in cash" can't bill a driver twice for the same trip.
 */
export async function recordCommission(args: {
    driverId: string;
    jobType: JobType;
    jobId: string;
    fare: number;
    settled: boolean;
    note?: string;
}): Promise<CommissionSplit> {
    const split = await splitFare(args.jobType, args.fare);
    await db.driverCommissionCharge.upsert({
        where: { jobType_jobId: { jobType: args.jobType, jobId: args.jobId } },
        update: {},
        create: {
            driverId: args.driverId,
            jobType: args.jobType,
            jobId: args.jobId,
            fare: args.fare,
            ratePct: split.ratePct,
            amount: split.commission,
            status: args.settled ? "settled" : "owed",
            settledAt: args.settled ? new Date() : null,
            note: args.note,
        },
    }).catch(() => null);
    return split;
}

/** What this driver currently owes FairPrice from cash jobs. */
export async function outstandingCommission(driverId: string): Promise<number> {
    const result = await db.driverCommissionCharge.aggregate({
        where: { driverId, status: "owed" },
        _sum: { amount: true },
    });
    return Math.max(0, Math.round(result._sum.amount ?? 0));
}

/**
 * A driver who owes more than this from cash jobs stops being shown new
 * requests until they settle — the same backstop Bolt and inDrive use, and
 * the only thing that makes a cash-commission model collectable at all.
 * Generous enough that a normal day of cash trips never trips it.
 */
export const MAX_OUTSTANDING_COMMISSION = 5000;

export async function isBlockedForDebt(driverId: string): Promise<boolean> {
    return (await outstandingCommission(driverId)) > MAX_OUTSTANDING_COMMISSION;
}
