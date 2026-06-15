import { NextResponse } from "next/server";
import { WhatsAppService } from "@/lib/whatsapp-service";

export const runtime = "nodejs";

// GET /api/whatsapp/test?phone=2348000000000
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const phone = searchParams.get("phone");

        if (!phone) {
            return NextResponse.json({ success: false, error: "Please provide a phone number in the URL (e.g., ?phone=2348000000000)" }, { status: 400 });
        }

        const result = await WhatsAppService.sendTestMessage(phone);

        if (result && !result.error) {
            return NextResponse.json({ success: true, message: `Hello World test message sent to ${phone}! Check your WhatsApp.`, metaResponse: result });
        } else {
            return NextResponse.json({ success: false, error: "Meta rejected the message", details: result }, { status: 500 });
        }
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
