import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { WhatsAppService } from "@/lib/whatsapp-service";

/**
 * POST /api/auth/whatsapp/lookup
 * Checks if a WhatsApp number already exists as a registered user.
 *
 * Handles all phone number variants (0-prefix, 234-prefix, legacy wa- emails)
 * so a user entering 08169878676 and 2348169878676 always resolve to the same account.
 *
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
        const phoneVariants = WhatsAppService.allPhoneVariants(phoneNumber);
        const emailVariants = WhatsAppService.allWaEmailVariants(phoneNumber);

        // Check by whatsappNumber field — covers all stored formats
        const user = await db.user.findFirst({
            where: { whatsappNumber: { in: phoneVariants } }
        });

        if (user) {
            // Opportunistically normalise the stored number if it's in a legacy format
            if (user.whatsappNumber !== cleanPhone) {
                await db.user.update({
                    where: { id: user.id },
                    data: { whatsappNumber: cleanPhone }
                }).catch(() => {}); // best-effort, don't block the response
            }
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

        // Also check via auto-generated email patterns (wa_234.../wa-0...)
        const emailUser = await db.user.findFirst({
            where: { email: { in: emailVariants } }
        });

        if (emailUser) {
            // Link and normalise the stored number
            await db.user.update({
                where: { id: emailUser.id },
                data: { whatsappNumber: cleanPhone }
            }).catch(() => {});

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
        return NextResponse.json({ error: "Service unavailable", offline: true }, { status: 500 });
    }
}
