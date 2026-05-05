import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { WhatsAppService } from "@/lib/whatsapp-service";

/**
 * POST /api/auth/whatsapp/lookup
 * Checks if a WhatsApp number already exists as a registered user.
 * Returns { exists: true, user: {...} } or { exists: false }
 */
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { phoneNumber } = body;

        if (!phoneNumber) {
            return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
        }

        const cleanPhone = WhatsAppService.normalizePhoneNumber(phoneNumber);

        // Check if this phone number is already registered
        const user = await db.user.findUnique({
            where: { whatsappNumber: cleanPhone }
        });

        if (user) {
            return NextResponse.json({
                exists: true,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    hasPassword: !!user.password,
                    avatar_url: user.avatarUrl,
                }
            });
        }

        // Also check if the phone number is associated via email pattern
        const waEmail = `wa_${cleanPhone}@fairprice.ng`;
        const emailUser = await db.user.findUnique({
            where: { email: waEmail }
        });

        if (emailUser) {
            // Associate the WA number with the existing user
            await db.user.update({
                where: { id: emailUser.id },
                data: { whatsappNumber: cleanPhone }
            });

            return NextResponse.json({
                exists: true,
                user: {
                    id: emailUser.id,
                    name: emailUser.name,
                    email: emailUser.email,
                    role: emailUser.role,
                    hasPassword: !!emailUser.password,
                    avatar_url: emailUser.avatarUrl,
                }
            });
        }

        return NextResponse.json({ exists: false });
    } catch (error: any) {
        console.error("WhatsApp Lookup Error:", error);
        return NextResponse.json({ error: "Service unavailable", offline: true }, { status: 503 });
    }
}
