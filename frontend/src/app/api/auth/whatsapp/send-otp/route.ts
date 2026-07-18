import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { WhatsAppService } from "@/lib/whatsapp-service";

/**
 * POST /api/auth/whatsapp/send-otp
 * Generates a 6-digit OTP and sends it to the user's WhatsApp number
 * via the Meta Cloud API. Falls back gracefully if credentials are missing.
 * 
 * Expects: { phoneNumber, purpose?: "signup" | "login" }
 * Returns: { success: true } (code is NOT returned to client for security)
 */
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { phoneNumber, purpose = "signup" } = body;

        if (!phoneNumber) {
            return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
        }

        const cleanPhone = WhatsAppService.normalizePhoneNumber(phoneNumber);
        const code = WhatsAppService.generateVerificationCode();

        // Check if admin has enabled WA verification
        let waVerificationEnabled = false;
        try {
            const settings = await db.systemSetting.findUnique({ where: { id: "global" } });
            // Check if waVerificationEnabled is stored in the settings
            // We use a dynamic approach since we may not have a dedicated column yet
            waVerificationEnabled = (settings as any)?.waVerificationEnabled ?? false;
        } catch {
            // If settings table doesn't exist or field missing, default to false
        }

        if (!waVerificationEnabled) {
            // WA verification is disabled — return success with a bypass flag
            // The client will skip the OTP step
            return NextResponse.json({ success: true, bypassed: true });
        }

        // Create verification record valid for 10 minutes
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        // Expire any previous pending codes for this phone number
        await db.whatsAppVerification.updateMany({
            where: {
                phoneNumber: cleanPhone,
                status: "pending",
            },
            data: { status: "expired" }
        });

        // Create new verification
        await db.whatsAppVerification.create({
            data: {
                code,
                phoneNumber: cleanPhone,
                expiresAt,
                status: "pending"
            }
        });

        // Send the OTP via WhatsApp Cloud API Template
        const sendResult = await WhatsAppService.sendVerificationTemplate(cleanPhone, code);

        if (!sendResult) {
            // Either credentials are missing, or Meta's API rejected the send
            // (unapproved template, expired token, recipient not opted in, etc.)
            // — both used to be swallowed into a silent "success", leaving the
            // user waiting forever for a code that was never actually sent.
            console.warn(`WhatsApp OTP for ${cleanPhone}: ${code} (send failed — see WhatsAppService error log above)`);
            return NextResponse.json({
                error: "Could not send the verification code to that WhatsApp number. Double-check the number is correct and can receive WhatsApp messages, then try again."
            }, { status: 502 });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("WhatsApp Send OTP Error:", error);
        return NextResponse.json({ error: "Failed to send verification code" }, { status: 500 });
    }
}
