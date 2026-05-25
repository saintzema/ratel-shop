import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { WhatsAppService } from "@/lib/whatsapp-service";
import { signToken } from "@/lib/jwt";

/**
 * POST /api/auth/whatsapp/verify-otp
 * Verifies a 6-digit OTP code against the stored verification record.
 * 
 * Expects: { phoneNumber, code }
 * Returns: { success: true } or { success: false, error: "..." }
 */
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { phoneNumber, code } = body;

        if (!phoneNumber || !code) {
            return NextResponse.json(
                { success: false, error: "Phone number and code are required" },
                { status: 400 }
            );
        }

        const cleanPhone = WhatsAppService.normalizePhoneNumber(phoneNumber);

        // Find the latest pending verification for this phone number
        const verification = await db.whatsAppVerification.findFirst({
            where: {
                phoneNumber: cleanPhone,
                status: "pending",
            },
            orderBy: { createdAt: "desc" }
        });

        if (!verification) {
            return NextResponse.json({
                success: false,
                error: "No pending verification found. Please request a new code."
            });
        }

        // Check expiration
        if (new Date() > verification.expiresAt) {
            await db.whatsAppVerification.update({
                where: { id: verification.id },
                data: { status: "expired" }
            });
            return NextResponse.json({
                success: false,
                error: "Verification code has expired. Please request a new one."
            });
        }

        // Check code match
        if (verification.code !== code) {
            return NextResponse.json({
                success: false,
                error: "Invalid verification code. Please check and try again."
            });
        }

        // Mark as verified
        await db.whatsAppVerification.update({
            where: { id: verification.id },
            data: { status: "verified" }
        });

        // Look up an existing user with this phone number and issue a JWT if found
        // so the client can immediately authenticate API calls after OTP verification
        let token: string | undefined;
        let userPayload: any;
        try {
            const cleanPhone = WhatsAppService.normalizePhoneNumber(verification.phoneNumber);
            const emailVariants = WhatsAppService.allWaEmailVariants(cleanPhone);
            const existingUser = await db.user.findFirst({
                where: {
                    OR: [
                        { whatsappNumber: cleanPhone },
                        { email: { in: emailVariants } },
                    ]
                },
                select: { id: true, email: true, name: true, role: true, avatarUrl: true }
            });
            if (existingUser) {
                token = signToken({ userId: existingUser.id, email: existingUser.email, role: existingUser.role as any });
                userPayload = {
                    id: existingUser.id,
                    email: existingUser.email,
                    name: existingUser.name,
                    role: existingUser.role,
                    avatar_url: existingUser.avatarUrl,
                };
            }
        } catch { /* non-critical — new registrations don't have a user yet */ }

        return NextResponse.json({ success: true, token, user: userPayload });
    } catch (error: any) {
        console.error("WhatsApp Verify OTP Error:", error);
        return NextResponse.json(
            { success: false, error: "Verification service unavailable" },
            { status: 500 }
        );
    }
}
