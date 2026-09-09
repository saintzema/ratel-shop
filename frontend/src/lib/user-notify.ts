import { db } from "@/lib/db";
import { broadcast } from "@/lib/realtime-service";

/**
 * Direct-to-User notification helper (server-side) — for events tied to a
 * plain User.id rather than a Seller (see seller-notify.ts) or every admin
 * (see admin-notify.ts). Used by the ride-hailing flow: a rider and a driver
 * are both just Users, not sellers.
 *
 * Best-effort: never throws.
 */
const VALID_TYPES = new Set(["system", "order", "negotiation", "promo"]);

export async function notifyUser(
    userId: string,
    message: string,
    opts?: { type?: string; link?: string }
): Promise<void> {
    try {
        const safeType = (VALID_TYPES.has(String(opts?.type || "").toLowerCase())
            ? String(opts?.type).toLowerCase()
            : "system") as any;

        await db.notification.create({
            data: {
                userId,
                type: safeType,
                message,
                link: opts?.link || null,
                read: false,
            },
        });
        broadcast({ type: "notification", userId });
    } catch {
        // Best-effort — never block the caller on a notification failure.
    }
}
