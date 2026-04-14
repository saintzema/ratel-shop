import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

/**
 * POST /api/auth/migrate-guest
 * Migrates all database records from a guest/old user ID to the real authenticated user ID.
 * This ensures orders, negotiations, and notifications follow the user across devices.
 */
export async function POST(request: Request) {
    try {
        const { oldId, newId, email } = await request.json();

        if (!newId) {
            return NextResponse.json({ error: "New user ID required" }, { status: 400 });
        }

        // List of old IDs to migrate from
        const oldIds = new Set<string>();
        if (oldId) oldIds.add(oldId);
        oldIds.add("guest");

        // If email provided, try to find any user records with different IDs but same email
        if (email) {
            const existingUsers = await db.user.findMany({
                where: { email: email.toLowerCase().trim() },
                select: { id: true },
            });
            for (const u of existingUsers) {
                if (u.id !== newId) oldIds.add(u.id);
            }
        }

        const idsToMigrate = Array.from(oldIds);
        if (idsToMigrate.length === 0) {
            return NextResponse.json({ success: true, migrated: 0 });
        }

        // --- Atomic Migration Transaction ---
        // We use a transaction to ensure no data is left in a partial migration state
        const results = await db.$transaction(async (tx) => {
            const customerName = email ? email.split('@')[0] : "Authenticated Buyer";

            // 1. Migrate Negotiations
            const negs = await tx.negotiationRequest.updateMany({
                where: { customerId: { in: idsToMigrate } },
                data: { customerId: newId, customerName }
            });

            // 2. Migrate Orders
            const orders = await tx.order.updateMany({
                where: { customerId: { in: idsToMigrate } },
                data: { customerId: newId }
            });

            // 3. Migrate Notifications
            const notifs = await tx.notification.updateMany({
                where: { userId: { in: idsToMigrate } },
                data: { userId: newId }
            });

            // 4. Migrate Addresses
            const addrs = await tx.address.updateMany({
                where: { userId: { in: idsToMigrate } },
                data: { userId: newId }
            });

            // 5. Migrate Reviews
            const reviews = await tx.review.updateMany({
                where: { userId: { in: idsToMigrate } },
                data: { userId: newId }
            });

            // 6. Migrate Support Messages
            const support = await tx.supportMessage.updateMany({
                where: { userId: { in: idsToMigrate } },
                data: { userId: newId }
            });

            // 7. Migrate Disputes
            const disputes = await tx.dispute.updateMany({
                where: { buyerId: { in: idsToMigrate } },
                data: { buyerId: newId }
            });

            // 8. Migrate Complaints
            const complaints = await tx.complaint.updateMany({
                where: { userId: { in: idsToMigrate } },
                data: { userId: newId }
            });

            // 9. Clean up Shell Records (the unique Guest User records)
            // We keep the literal "guest" record (shared fallback) but delete transient unique IDs (gst_... or guest_...)
            // This prevents the user table from bloating with one-time use guest shells.
            for (const oldUserId of idsToMigrate) {
                const isTransientId = oldUserId.startsWith("gst_") || oldUserId.startsWith("guest_");
                if (isTransientId && oldUserId !== "guest" && oldUserId !== newId) {
                    await tx.user.delete({ where: { id: oldUserId } }).catch(() => null);
                }
            }

            return {
                negotiations: negs.count,
                orders: orders.count,
                notifications: notifs.count,
                addresses: addrs.count,
                reviews: reviews.count,
                support: support.count,
                disputes: disputes.count,
                complaints: complaints.count,
            };
        });

        const totalMigrated = Object.values(results).reduce((a: number, b: number) => a + b, 0);

        return NextResponse.json({
            success: true,
            migrated: totalMigrated,
            details: results
        });
    } catch (error: any) {
        console.error("Guest migration error:", error);
        return NextResponse.json({ error: error.message || "Migration failed" }, { status: 500 });
    }
}
