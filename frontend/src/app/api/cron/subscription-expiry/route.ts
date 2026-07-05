import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserFromRequest } from "@/lib/jwt";

/**
 * Subscription Expiry Cron Job
 * Frequency: Daily (configured in vercel.json)
 *
 * Any seller whose planExpiryDate has passed and hasn't renewed drops to
 * planDowngradeTo (if set for that seller) or "Starter" (the free plan)
 * otherwise. Notifies the seller either way.
 */
export async function GET(request: Request) {
    try {
        const authHeader = request.headers.get('authorization');
        if (process.env.NODE_ENV === 'production') {
            const isCron = authHeader === `Bearer ${process.env.CRON_SECRET}`;
            const user = isCron ? null : getUserFromRequest(request);
            if (!isCron && user?.role !== "admin") {
                return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
            }
        }

        const expired = await db.seller.findMany({
            where: {
                planExpiryDate: { lt: new Date() },
                subscriptionPlan: { not: "Starter" },
            },
            select: { id: true, userId: true, businessName: true, subscriptionPlan: true, planDowngradeTo: true, ownerEmail: true },
        });

        for (const seller of expired) {
            const downgradeTo = seller.planDowngradeTo || "Starter";
            await db.seller.update({
                where: { id: seller.id },
                data: {
                    subscriptionPlan: downgradeTo,
                    planExpiryDate: null,
                    planDowngradeTo: null,
                },
            });

            await db.notification.create({
                data: {
                    userId: seller.userId,
                    type: "system",
                    message: `Your ${seller.subscriptionPlan} plan has expired and your store has moved to the ${downgradeTo} plan. Renew anytime from Settings → Billing.`,
                    link: "/seller/settings/billing",
                    read: false,
                },
            }).catch(() => {});
        }

        return NextResponse.json({ success: true, downgraded: expired.length });
    } catch (error: any) {
        console.error("[cron/subscription-expiry] error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
