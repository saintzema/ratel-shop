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

        // Send the OTP via WhatsApp Cloud API
        const purposeText = purpose === "login" ? "login" : "verify your account";
        const message = `🔐 Your FairPrice ${purpose === "login" ? "login" : "verification"} code is: *${code}*\n\nThis code expires in 10 minutes. Do not share it with anyone.`;

        const sendResult = await WhatsAppService.sendMessage(cleanPhone, message);

        if (!sendResult) {
            // WhatsApp credentials missing — send was suppressed
            // Still return success so the flow continues (client will show the code input)
            // In production, the admin should configure the WhatsApp Business API
            console.warn(`WhatsApp OTP for ${cleanPhone}: ${code} (send suppressed — missing credentials)`);
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("WhatsApp Send OTP Error:", error);
        return NextResponse.json({ error: "Failed to send verification code" }, { status: 500 });
    }
}
