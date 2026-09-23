import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { signToken } from "@/lib/jwt";
import { WhatsAppService } from "@/lib/whatsapp-service";

/**
 * POST /api/auth/phone-start  — { phone, name?, email? }
 *
 * The one-step account a guest gets when they book a ride (or a delivery)
 * without signing in first. In Nigeria the driver simply CALLS the rider the
 * moment they accept, so the number is the load-bearing detail; a full
 * sign-up form in front of that is friction that loses the booking.
 *
 * SECURITY — this endpoint only ever issues a token for an account it just
 * created in this same request. If the number (or email) already belongs to
 * somebody, it returns `{ existing: true }` and NOTHING else: no token, no
 * profile, not even a name. Handing back a session for a pre-existing account
 * on nothing but a typed phone number would be the same auth bypass that
 * /api/auth/issue-token used to have — anyone could claim any account by
 * guessing a number. Returning users go through the WhatsApp OTP flow
 * (/api/auth/whatsapp/send-otp → verify-otp), which proves they hold the line.
 */
export async function POST(req: Request) {
    const body = await req.json().catch(() => ({}));
    const { phone, name, email } = (body || {}) as { phone?: string; name?: string; email?: string };

    const cleanPhone = WhatsAppService.normalizePhoneNumber(String(phone || ""));
    if (!cleanPhone) {
        return NextResponse.json({ error: "Enter a valid phone number" }, { status: 400 });
    }

    const normalizedEmail = email?.toLowerCase().trim() || null;
    if (normalizedEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalizedEmail)) {
        return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
    }

    const phoneVariants = WhatsAppService.allPhoneVariants(cleanPhone);
    const emailVariants = WhatsAppService.allWaEmailVariants(cleanPhone);
    if (normalizedEmail) emailVariants.push(normalizedEmail);

    const existing = await db.user.findFirst({
        where: { OR: [{ whatsappNumber: { in: phoneVariants } }, { email: { in: emailVariants } }] },
        select: { id: true },
    });
    if (existing) {
        return NextResponse.json({ existing: true, phone: cleanPhone });
    }

    const user = await db.user.create({
        data: {
            // A real email when they gave one, otherwise the same wa_ placeholder
            // the WhatsApp sign-up path already uses — so the two flows converge
            // on one account instead of creating a duplicate for the same person.
            email: normalizedEmail || `wa_${cleanPhone}@fairprice.ng`,
            name: name?.trim() || `Rider ${cleanPhone.slice(-4)}`,
            whatsappNumber: cleanPhone,
            role: "customer",
        },
        select: { id: true, email: true, name: true, role: true, avatarUrl: true },
    });

    const token = signToken({ userId: user.id, email: user.email, role: user.role as any });
    return NextResponse.json({ success: true, token, user });
}
