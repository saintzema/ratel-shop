import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { WhatsAppService } from "@/lib/whatsapp-service";

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

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("WhatsApp Verify OTP Error:", error);
        return NextResponse.json(
            { success: false, error: "Verification service unavailable" },
            { status: 500 }
        );
    }
}
