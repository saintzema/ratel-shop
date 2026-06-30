import { db } from "@/lib/db";
import { broadcast } from "@/lib/realtime-service";

/**
 * Platform-wide ADMIN notification helper (server-side).
 *
 * Creates an in-app notification for every admin user and broadcasts it over SSE, so
 * operators see material platform events (payouts, escrow releases, failures, disputes)
 * in the admin notification bell — not just in batch emails. This is the accountability /
 * monitoring trail an ISO 27701-aligned platform is expected to surface.
 *
 * Best-effort: never throws (callers are payment webhooks / crons that must not fail
 * because a notification couldn't be written).
 *
 * `type` must be one of the lowercase NotificationType enum values
 * (system | order | negotiation | promo); anything else is coerced to "system".
 */
const VALID_TYPES = new Set(["system", "order", "negotiation", "promo"]);

export async function notifyAdmins(
    message: string,
    opts?: { type?: string; link?: string }
): Promise<void> {
    try {
        const admins = await db.user.findMany({
            where: { role: "admin" },
            select: { id: true },
        });
        if (!admins.length) return;

        const safeType = (VALID_TYPES.has(String(opts?.type || "").toLowerCase())
            ? String(opts?.type).toLowerCase()
            : "system") as any;

        await db.notification.createMany({
            data: admins.map((a) => ({
                userId: a.id,
                type: safeType,
                message,
                link: opts?.link || null,
                read: false,
            })),
        });

        // Nudge each admin's client to refresh its notification list.
        for (const a of admins) {
            try { broadcast({ type: "notification", userId: a.id }); } catch { /* non-critical */ }
        }
    } catch (err) {
        console.error("[notifyAdmins] failed:", err);
    }
}
