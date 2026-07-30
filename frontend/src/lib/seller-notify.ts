import { db } from "@/lib/db";
import { broadcast } from "@/lib/realtime-service";
import { WhatsAppService } from "@/lib/whatsapp-service";

/**
 * Per-seller notification helper — mirrors admin-notify.ts's pattern but targets
 * the seller's owning User (Seller.userId), and optionally also pings their
 * WhatsApp so a time-sensitive lead (e.g. "how much?" on an Instagram post)
 * doesn't sit unread in an in-app bell a seller might not check for hours.
 *
 * Best-effort: never throws.
 */
const VALID_TYPES = new Set(["system", "order", "negotiation", "promo"]);

export async function notifySeller(
    sellerId: string,
    message: string,
    opts?: { type?: string; link?: string; alsoWhatsApp?: boolean }
): Promise<void> {
    try {
        const seller = await db.seller.findUnique({
            where: { id: sellerId },
            select: { userId: true, whatsappNumber: true, whatsappEnabled: true },
        });
        if (!seller) return;

        const safeType = (VALID_TYPES.has(String(opts?.type || "").toLowerCase())
            ? String(opts?.type).toLowerCase()
            : "system") as any;

        await db.notification.create({
            data: {
                userId: seller.userId,
                type: safeType,
                message,
                link: opts?.link || null,
                read: false,
            },
        });
        broadcast({ type: "notification", userId: seller.userId });

        if (opts?.alsoWhatsApp && seller.whatsappEnabled && seller.whatsappNumber) {
            WhatsAppService.sendMessage(seller.whatsappNumber, message).catch(() => {});
        }
    } catch (err) {
        console.error("[notifySeller] failed:", err);
    }
}
