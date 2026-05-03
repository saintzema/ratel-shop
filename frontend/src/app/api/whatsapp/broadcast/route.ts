import { NextResponse } from "next/server";
import { WhatsAppService } from "@/lib/whatsapp-service";
import { db } from "@/lib/db";

/**
 * POST /api/whatsapp/broadcast
 * Handles bulk WhatsApp messaging from the admin dashboard.
 */
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { message, phoneNumbers } = body;

        if (!message || !phoneNumbers || !Array.isArray(phoneNumbers)) {
            return NextResponse.json(
                { error: "Message and an array of phone numbers are required" },
                { status: 400 }
            );
        }

        console.log(`[WhatsApp Broadcast] Sending to ${phoneNumbers.length} recipients...`);

        // Send messages in parallel to avoid long blocking (Meta API rate limits apply)
        const results = await Promise.allSettled(
            phoneNumbers.map(async (phone) => {
                // Ensure number is properly formatted (e.g. +234...)
                const formattedPhone = phone.startsWith("+") ? phone : `+${phone}`;
                
                await WhatsAppService.sendMessage(formattedPhone, message);
                
                // Log the interaction for analytics (optional but good for tracking)
                try {
                    await (db as any).whatsAppInteraction.create({
                        data: {
                            phoneNumber: formattedPhone,
                            interaction_type: "broadcast",
                            payload: "Admin Bulk Broadcast"
                        }
                    });
                } catch (e) {
                    console.error("Failed to log broadcast interaction:", e);
                }
            })
        );

        const successful = results.filter(r => r.status === "fulfilled").length;
        const failed = results.filter(r => r.status === "rejected").length;

        console.log(`[WhatsApp Broadcast] Complete. Success: ${successful}, Failed: ${failed}`);

        return NextResponse.json({
            success: true,
            total: phoneNumbers.length,
            successful,
            failed
        });
    } catch (error: any) {
        console.error("WhatsApp Broadcast error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to process broadcast" },
            { status: 500 }
        );
    }
}
