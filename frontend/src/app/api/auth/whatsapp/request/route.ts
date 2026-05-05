import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { WhatsAppService } from "@/lib/whatsapp-service";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { phoneNumber } = body;

        if (!phoneNumber) {
            return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
        }

        const cleanPhone = WhatsAppService.normalizePhoneNumber(phoneNumber);
        const code = WhatsAppService.generateVerificationCode();
        
        // Create verification record valid for 10 minutes
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
        
        const verification = await db.whatsAppVerification.create({
            data: {
                code,
                phoneNumber: cleanPhone,
                expiresAt,
                status: "pending"
            }
        });

        // Construct the WhatsApp Link
        // Format: https://wa.me/[NUMBER]?text=Verify%20FairPrice:%20[CODE]
        const waNumber = process.env.WHATSAPP_COLLECTION_NUMBER || "2349131767484";
        const message = encodeURIComponent(`Verify FairPrice: ${code}`);
        const waLink = `https://wa.me/${waNumber}?text=${message}`;

        return NextResponse.json({ 
            success: true, 
            code, 
            waLink,
            expiresAt 
        });
    } catch (error: any) {
        console.error("WhatsApp Auth Request Error:", error);
        return NextResponse.json({ error: "Failed to create verification request" }, { status: 500 });
    }
}
