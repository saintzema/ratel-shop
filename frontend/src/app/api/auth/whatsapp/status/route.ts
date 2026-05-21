import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { WhatsAppService } from "@/lib/whatsapp-service";
import { signToken } from "@/lib/jwt";

export async function GET(req: Request) {
    try {
        const { searchParams } = await Promise.resolve(new URL(req.url));
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
            const normalizedPhone = WhatsAppService.normalizePhoneNumber(verification.phoneNumber);
            const phoneVariants = WhatsAppService.allPhoneVariants(verification.phoneNumber);
            const emailVariants = WhatsAppService.allWaEmailVariants(verification.phoneNumber);

            // Broad lookup — catch accounts stored with any format of this number
            let user = await db.user.findFirst({
                where: {
                    OR: [
                        { whatsappNumber: { in: phoneVariants } },
                        { email: { in: emailVariants } },
                    ]
                }
            });

            if (!user) {
                // Create a placeholder account — use consistent wa_ + 234-prefix format
                user = await db.user.create({
                    data: {
                        name: `WA User ${normalizedPhone.slice(-4)}`,
                        email: `wa_${normalizedPhone}@fairprice.ng`,
                        whatsappNumber: normalizedPhone,
                        role: "customer"
                    }
                });
            } else if (user.whatsappNumber !== normalizedPhone) {
                // Normalise legacy stored number (e.g. 08169... → 2348169...)
                await db.user.update({
                    where: { id: user.id },
                    data: { whatsappNumber: normalizedPhone }
                }).catch(() => {});
            }

            // Mark verification as used
            await db.whatsAppVerification.update({
                where: { id: verification.id },
                data: { status: "used", userId: user.id }
            });

            const token = signToken({
                userId: user.id,
                email: user.email,
                role: user.role,
            });

            return NextResponse.json({
                status: "success",
                token,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    whatsappNumber: normalizedPhone,
                    avatar_url: user.avatarUrl,
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
