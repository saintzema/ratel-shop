import { db } from "@/lib/db";
import { signToken } from "@/lib/jwt";
import { effectiveRole } from "@/lib/constants";

/** Signs a session JWT for an email whose identity has ALREADY been proven by the caller. */
export async function issueSessionForEmail(rawEmail: string) {
    const email = rawEmail;
    const user = await db.user.findUnique({
            where: { email: email.toLowerCase().trim() },
            select: { id: true, email: true, role: true, name: true, avatarUrl: true, whatsappNumber: true, createdAt: true }
        });

        if (!user) return null;

        // An invited teammate acting on someone else's seller dashboard gets
        // staffOf/staffPermissions embedded so permission checks (e.g. blocking
        // price/stock edits) work without a DB lookup on every request. Only
        // applies if this email isn't itself a real seller — an actual seller
        // logging in should never be scoped down by a stale staff invite.
        let staffClaims: { staffOf: string; staffPermissions: any } | null = null;
        const ownSeller = await db.seller.findFirst({ where: { userId: user.id } });
        if (!ownSeller) {
            let staffRecord = await db.sellerStaff.findFirst({
                where: { invitedEmail: user.email.toLowerCase(), status: { in: ["invited", "active"] } },
            });
            // First login after being invited — no separate "accept" click required;
            // the invite itself (sent by the seller, to an email the seller chose) is
            // the consent step. Link the account and flip to active here.
            if (staffRecord && staffRecord.status === "invited") {
                staffRecord = await db.sellerStaff.update({
                    where: { id: staffRecord.id },
                    data: { status: "active", userId: user.id },
                });
            }
            if (staffRecord) {
                staffClaims = {
                    staffOf: staffRecord.sellerId,
                    staffPermissions: {
                        canEditPrice: staffRecord.canEditPrice,
                        canEditStock: staffRecord.canEditStock,
                        canManageDiscounts: staffRecord.canManageDiscounts,
                        canViewFinancials: staffRecord.canViewFinancials,
                    },
                };
            }
        }

        const token = signToken({
            userId: user.id,
            email: user.email,
            role: effectiveRole(user.email, user.role) as any,
            ...(staffClaims || {}),
        });
    return {
        token,
        staffOf: staffClaims?.staffOf,
        user: {
            id: user.id, email: user.email, name: user.name, role: effectiveRole(user.email, user.role),
            avatar_url: user.avatarUrl, whatsappNumber: user.whatsappNumber, created_at: user.createdAt?.toISOString(),
        },
    };
}
