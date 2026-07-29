import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { signToken } from "@/lib/jwt";
import { effectiveRole } from "@/lib/constants";

/**
 * POST /api/auth/issue-token
 * Issues a JWT for a user whose identity was already verified client-side
 * (e.g. email OTP code). Looks up the user by email and returns a signed token.
 *
 * This endpoint does NOT re-verify identity — it must only be called after
 * a successful verification step (e.g. email code, WA OTP) has been completed.
 */
export async function POST(req: Request) {
    try {
        const { email } = await req.json();
        if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

        const user = await db.user.findUnique({
            where: { email: email.toLowerCase().trim() },
            select: { id: true, email: true, role: true }
        });

        if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

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
        return NextResponse.json({ token, ...(staffClaims ? { staffOf: staffClaims.staffOf } : {}) });
    } catch (err: any) {
        console.error("[issue-token] error:", err);
        return NextResponse.json({ error: "Service unavailable" }, { status: 500 });
    }
}
