import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { WhatsAppService } from "@/lib/whatsapp-service";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const code = searchParams.get("code");

        if (!code) {
            return NextResponse.json({ error: "Code is required" }, { status: 400 });
        }

        const verification = await db.whatsAppVerification.findUnique({
            where: { code }
        });

        if (!verification) {
            return NextResponse.json({ status: "not_found" });
        }

        if (verification.status === "verified" || verification.status === "used") {
            // Find or create the user linked to this phone number
            const normalizedPhone = WhatsAppService.normalizePhoneNumber(verification.phoneNumber);
            
            let user = await db.user.findUnique({
                where: { whatsappNumber: normalizedPhone }
            });

            if (!user) {
                // Check if user exists by email if we have it, otherwise create a placeholder
                // For simplicity in this demo, we'll create a new user if not found
                user = await db.user.create({
                    data: {
                        name: `WA User ${normalizedPhone.slice(-4)}`,
                        email: `wa-${normalizedPhone}@fairprice.ng`, // Placeholder email
                        whatsappNumber: normalizedPhone,
                        role: "customer"
                    }
                });
            }

            // Mark verification as used
            await db.whatsAppVerification.update({
                where: { id: verification.id },
                data: { status: "used", userId: user.id }
            });

            return NextResponse.json({ 
                status: "success", 
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role
                }
            });
        }

        if (new Date() > verification.expiresAt) {
            return NextResponse.json({ status: "expired" });
        }

        return NextResponse.json({ status: "pending" });
    } catch (error: any) {
        console.error("WhatsApp Auth Status Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
