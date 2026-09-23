/**
 * Daily check-in credit — the returning-visit loop Temu and Opay run on.
 *
 * Three rules make this a growth mechanic rather than a giveaway:
 *
 *  1. The reward is CREDIT, never cash. It rides the existing AdRewardCredit
 *     ledger (source: "checkin"), which is only ever redeemed against a real
 *     order, and there is no withdrawal path anywhere in the app. A farmer who
 *     checks in for a month has ₦650 they can only spend with us.
 *  2. It escalates with the streak and resets when broken, so the value is in
 *     the habit, not the tap. Day 7 pays 4× a day 1.
 *  3. A perfect month costs about ₦650 per active user — deliberately at the
 *     low end of the range we'd fund from take rate, so the number can be
 *     raised once margin per user is known rather than discovered too late.
 *
 * Streak state is derived from the credit rows themselves rather than stored
 * on the user, so there is no schema change and no second source of truth to
 * drift: the ledger IS the record of who checked in when.
 */

export const CHECKIN_SOURCE = "checkin";
/** Long enough to be worth saving up, short enough to keep the liability bounded. */
export const CHECKIN_CREDIT_VALIDITY_DAYS = 60;

/**
 * What each day of a 7-day cycle pays, in naira. Day 7 is the completion
 * bonus that makes the sixth day worth showing up for.
 */
export const CHECKIN_LADDER = [10, 10, 15, 15, 20, 20, 60];

/** Reward for the Nth consecutive day (1-indexed); cycles weekly. */
export function rewardForStreakDay(streakDay: number): number {
    if (streakDay < 1) return 0;
    return CHECKIN_LADDER[(streakDay - 1) % CHECKIN_LADDER.length];
}

/** A perfect 30-day month, for anyone sizing the cost of this. */
export function monthlyCeiling(): number {
    let total = 0;
    for (let day = 1; day <= 30; day++) total += rewardForStreakDay(day);
    return total;
}

/**
 * Days are compared in Lagos time, not UTC. A Nigerian checking in at 9pm
 * would otherwise roll into the next UTC day and appear to have checked in
 * twice, quietly doubling the payout; someone at 12:30am would break a streak
 * they hadn't broken.
 */
export function lagosDayKey(date: Date): string {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Africa/Lagos", year: "numeric", month: "2-digit", day: "2-digit",
    }).format(date);
}

function dayKeyToUTCDate(key: string): Date {
    const [y, m, d] = key.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d));
}

/** Whole days between two Lagos day keys. */
export function daysBetween(earlier: string, later: string): number {
    const ms = dayKeyToUTCDate(later).getTime() - dayKeyToUTCDate(earlier).getTime();
    return Math.round(ms / 86_400_000);
}

export interface CheckinState {
    /** Consecutive days including today if already claimed, else the run up to yesterday. */
    streak: number;
    claimedToday: boolean;
    /** What claiming right now would pay — 0 if already claimed today. */
    nextReward: number;
    /** Position in the current 7-day cycle for the UI's day strip, 1–7. */
    cycleDay: number;
    /** Lagos day keys claimed in the last 7 days, for the calendar strip. */
    recentDays: string[];
}

/**
 * Works the streak out from the dates already claimed.
 *
 * `claimDates` may be in any order and may contain duplicates — it's whatever
 * the ledger returned. A gap of more than one day ends the run.
 */
export function deriveCheckinState(claimDates: Date[], now: Date = new Date()): CheckinState {
    const today = lagosDayKey(now);
    const keys = Array.from(new Set(claimDates.map(lagosDayKey))).sort().reverse();
    const claimedToday = keys[0] === today;

    let streak = 0;
    // A run that ended before yesterday is already broken, so it contributes
    // nothing — today would start a fresh streak at day 1.
    let expected = claimedToday ? today : null;
    if (!claimedToday && keys.length > 0 && daysBetween(keys[0], today) === 1) {
        expected = keys[0];
    }
    if (expected) {
        for (const key of keys) {
            if (key !== expected) break;
            streak++;
            expected = lagosDayKey(new Date(dayKeyToUTCDate(expected).getTime() - 86_400_000));
        }
    }

    const nextStreakDay = claimedToday ? streak : streak + 1;
    return {
        streak,
        claimedToday,
        nextReward: claimedToday ? 0 : rewardForStreakDay(nextStreakDay),
        cycleDay: ((nextStreakDay - 1) % CHECKIN_LADDER.length) + 1,
        recentDays: keys.filter(k => daysBetween(k, today) < 7),
    };
}
