import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const code = searchParams.get("code");

        if (!code) {
            return NextResponse.json({ error: "Code is required" }, { status: 400 });
        }

        const verification = await db.whatsAppVerification.findUnique({
            where: { code },
            include: {
                // In a real scenario, we might want to include the user here if already linked
            }
        });

        if (!verification) {
            return NextResponse.json({ status: "not_found" });
        }

        if (verification.status === "verified" || verification.status === "used") {
            // Find or create the user linked to this phone number
            let user = await db.user.findUnique({
                where: { whatsappNumber: verification.phoneNumber }
            });

            if (!user) {
                // Check if user exists by email if we have it, otherwise create a placeholder
                // For simplicity in this demo, we'll create a new user if not found
                user = await db.user.create({
                    data: {
                        name: `WA User ${verification.phoneNumber.slice(-4)}`,
                        email: `wa-${verification.phoneNumber}@fairprice.ng`, // Placeholder email
                        whatsappNumber: verification.phoneNumber,
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
