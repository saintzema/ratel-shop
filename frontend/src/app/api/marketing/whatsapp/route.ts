import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { name, productName, discountPercent, link } = body;

        // In a real production app, this would integrate with a provider like Twilio, Infobip, or MessageBird
        console.log(`[WHATSAPP AUTOMATION TRIGGERED]`);
        console.log(`To: ${name}`);
        console.log(`Message: Hey ${name}, your AI assistant negotiated a great deal on those ${productName} last week. The vendor just dropped the floor price by another ${discountPercent}% for the next 24 hours. Want to close the deal? ${link}`);

        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 800));

        return NextResponse.json({ success: true, message: "WhatsApp notification dispatched successfully" });
    } catch (error) {
        console.error("WhatsApp API Error:", error);
        return NextResponse.json({ success: false, error: "Failed to dispatch WhatsApp message" }, { status: 500 });
    }
}
