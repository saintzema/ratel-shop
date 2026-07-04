import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { signToken } from "@/lib/jwt";
import { effectiveRole } from "@/lib/constants";
import { WhatsAppService } from "@/lib/whatsapp-service";

/**
 * POST /api/auth/claim-guest
 *
 * Converts a guest-checkout identity into a real account, in one call:
 *   { guestEmail, password, realEmail?, whatsapp?, name? }
 *
 * Guests have no JWT (they never registered), so the old flow — the
 * post-payment "Secure Your Account" modal calling /api/auth/set-password,
 * which requires Bearer auth — always failed with "Authentication required".
 * Worse, direct/QR payments generate a synthetic guest_<ts>@fairprice.ng
 * email the customer can never log in with, and the modal offered no way to
 * replace it.
 *
 * This endpoint:
 *  1. Finds the guest user created at order time (by guestEmail).
 *  2. Optionally swaps the synthetic email for the customer's real email
 *     and/or attaches their WhatsApp number (orders stay tied — they're
 *     linked by customerId, which doesn't change).
 *  3. Sets their password.
 *  4. Issues a JWT so they're logged in immediately.
 *
 * Ownership proof: knowing the exact synthetic guest email (shown only to
 * the person who just completed that checkout session) + this being a
 * passwordless account. If the guest account already has a password, we
 * refuse and tell them to sign in.
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { guestEmail, realEmail, whatsapp, password, name } = body as {
            guestEmail?: string; realEmail?: string; whatsapp?: string; password?: string; name?: string;
        };

        if (!guestEmail) {
            return NextResponse.json({ error: "guestEmail is required" }, { status: 400 });
        }
        if (!password || password.length < 6) {
            return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
        }

        const normalizedGuest = guestEmail.toLowerCase().trim();
        const guestUser = await db.user.findUnique({ where: { email: normalizedGuest } });
        if (!guestUser) {
            return NextResponse.json({ error: "Guest account not found" }, { status: 404 });
        }
        if (guestUser.password) {
            // Already secured — this isn't a claimable guest anymore.
            return NextResponse.json({ error: "This account already has a password. Sign in instead.", code: "ALREADY_SECURED" }, { status: 409 });
        }

        const updateData: Record<string, any> = {
            password: await bcrypt.hash(password, 12),
        };
        if (name?.trim()) updateData.name = name.trim();

        // Swap synthetic email for the customer's real one (if provided and different)
        const normalizedReal = realEmail?.toLowerCase().trim();
        if (normalizedReal && normalizedReal !== normalizedGuest) {
            const taken = await db.user.findUnique({ where: { email: normalizedReal }, select: { id: true } });
            if (taken && taken.id !== guestUser.id) {
                return NextResponse.json({ error: "That email already belongs to another account. Sign in with it instead.", code: "EMAIL_CONFLICT" }, { status: 409 });
            }
            updateData.email = normalizedReal;
        }

        if (whatsapp) {
            const normalizedWa = WhatsAppService.normalizePhoneNumber(String(whatsapp));
            if (normalizedWa) updateData.whatsappNumber = normalizedWa;
        }

        const updated = await db.user.update({
            where: { id: guestUser.id },
            data: updateData,
            select: { id: true, email: true, name: true, role: true, createdAt: true },
        });

        // Keep order records consistent with the new identity (orders are tied by
        // customerId so nothing breaks either way — this is for display/emails).
        if (updateData.email) {
            await db.order.updateMany({
                where: { customerId: guestUser.id },
                data: { customerName: updated.name || undefined },
            }).catch(() => {});
        }

        const token = signToken({
            userId: updated.id,
            email: updated.email,
            role: effectiveRole(updated.email, updated.role) as any,
        });

        return NextResponse.json({
            success: true,
            token,
            user: {
                id: updated.id,
                email: updated.email,
                name: updated.name,
                role: updated.role,
                created_at: updated.createdAt.toISOString(),
            },
        });
    } catch (error: any) {
        console.error("claim-guest error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
