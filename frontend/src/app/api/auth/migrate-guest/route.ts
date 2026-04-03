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

        let totalMigrated = 0;

        // Migrate Negotiations
        const negResult = await db.negotiationRequest.updateMany({
            where: { customerId: { in: idsToMigrate } },
            data: { 
                customerId: newId,
                customerName: email ? email.split('@')[0] : "Authenticated Buyer"
            },
        });
        totalMigrated += negResult.count;

        // Migrate Orders
        const orderResult = await db.order.updateMany({
            where: { customerId: { in: idsToMigrate } },
            data: { customerId: newId },
        });
        totalMigrated += orderResult.count;

        // Migrate Notifications
        const notifResult = await db.notification.updateMany({
            where: { userId: { in: idsToMigrate } },
            data: { userId: newId },
        });
        totalMigrated += notifResult.count;

        // Migrate Addresses
        const addrResult = await db.address.updateMany({
            where: { userId: { in: idsToMigrate } },
            data: { userId: newId },
        });
        totalMigrated += addrResult.count;

        // Migrate Reviews
        const reviewResult = await db.review.updateMany({
            where: { userId: { in: idsToMigrate } },
            data: { userId: newId },
        });
        totalMigrated += reviewResult.count;

        // Migrate Support Messages
        const supportResult = await db.supportMessage.updateMany({
            where: { userId: { in: idsToMigrate } },
            data: { userId: newId },
        });
        totalMigrated += supportResult.count;

        // Migrate Disputes
        const disputeResult = await db.dispute.updateMany({
            where: { buyerId: { in: idsToMigrate } },
            data: { buyerId: newId },
        });
        totalMigrated += disputeResult.count;

        // Migrate Complaints
        const complaintResult = await db.complaint.updateMany({
            where: { userId: { in: idsToMigrate } },
            data: { userId: newId },
        });
        totalMigrated += complaintResult.count;

        // Clean up duplicate user records (keep the newId one)
        for (const oldUserId of idsToMigrate) {
            if (oldUserId === "guest") continue; // Keep the guest record for future use
            try {
                await db.user.delete({ where: { id: oldUserId } });
            } catch {
                // May fail if there are remaining FK constraints, that's ok
            }
        }

        return NextResponse.json({
            success: true,
            migrated: totalMigrated,
            details: {
                negotiations: negResult.count,
                orders: orderResult.count,
                notifications: notifResult.count,
                addresses: addrResult.count,
                reviews: reviewResult.count,
                support: supportResult.count,
                disputes: disputeResult.count,
                complaints: complaintResult.count,
            }
        });
    } catch (error: any) {
        console.error("Guest migration error:", error);
        return NextResponse.json({ error: error.message || "Migration failed" }, { status: 500 });
    }
}
