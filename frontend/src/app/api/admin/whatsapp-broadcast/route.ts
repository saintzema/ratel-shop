import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { WhatsAppService } from "@/lib/whatsapp-service";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        if (searchParams.get("stats") === "true") {
            const phoneNumbers = new Set<string>();
            const negotiations = await db.negotiationRequest.findMany({
                where: { customerWhatsapp: { not: null } },
                select: { customerWhatsapp: true }
            });
            negotiations.forEach(n => {
                if (n.customerWhatsapp) phoneNumbers.add(n.customerWhatsapp.replace(/\D/g, ""));
            });

            const interactions = await db.whatsAppInteraction.findMany({
                select: { phoneNumber: true }
            });
            interactions.forEach((i: { phoneNumber: string }) => {
                if (i.phoneNumber) phoneNumbers.add(i.phoneNumber.replace(/\D/g, ""));
            });

            return NextResponse.json({ totalReach: phoneNumbers.size });
        }

        return NextResponse.json({ ok: true });
    } catch (e) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { product, message, targetUsers, isTest, templateName = "product_offer_v1" } = body;

        if (isTest) {
            // For a connection test, we only send to the admin/test number
            const testNumber = "2348162816305"; 
            const result = await WhatsAppService.sendTestMessage(testNumber);
            return NextResponse.json({ success: !!result && !result.error, test: true });
        }

        // 1. Collect all unique phone numbers from the system
        const phoneNumbers = new Set<string>();

        // From Users
        const users = await db.user.findMany({
            where: { role: "customer" },
            select: { id: true }
        });
        // (In production, we'd select whatsappNumber from the User model if it existed)

        // From Negotiation Requests (Direct customers who shared WhatsApp)
        const negotiations = await db.negotiationRequest.findMany({
            where: { customerWhatsapp: { not: null } },
            select: { customerWhatsapp: true }
        });
        negotiations.forEach(n => {
            if (n.customerWhatsapp) phoneNumbers.add(n.customerWhatsapp.replace(/\D/g, ""));
        });

        // From Interaction Logs (Anyone who messaged the bot)
        const interactions = await db.whatsAppInteraction.findMany({
            select: { phoneNumber: true }
        });
        interactions.forEach((i: { phoneNumber: string }) => {
            if (i.phoneNumber) phoneNumbers.add(i.phoneNumber.replace(/\D/g, ""));
        });

        // For this demo, if no numbers found, we add the admin number so the UI shows something
        if (phoneNumbers.size === 0) {
            phoneNumbers.add("2348162816305");
        }

        const targetList = Array.from(phoneNumbers);
        let sentCount = 0;

        for (const phone of targetList) {
            try {
                let result;
                if (product) {
                    // Send a Product Offer template
                    result = await WhatsAppService.sendMarketingBroadcast(phone, {
                        templateName: "product_offer_v1",
                        bodyText: `${product.name} - ${message || 'Check out this deal!'}`,
                        headerImage: product.image_url,
                        buttonLink: `${process.env.NEXTAUTH_URL}/product/${product.id}`
                    });
                } else {
                    // Send a Generic template (e.g. Happy New Month)
                    // Note: 'monthly_promo' is used as an example template name
                    result = await WhatsAppService.sendMarketingBroadcast(phone, {
                        templateName: templateName || "monthly_promo",
                        bodyText: message,
                        buttonLink: process.env.NEXTAUTH_URL
                    });
                }
                
                if (result && !result.error) {
                    sentCount++;
                }
            } catch (e) {
                console.error(`Failed to send WhatsApp broadcast to ${phone}:`, e);
            }
        }

        return NextResponse.json({ 
            success: true, 
            sentCount, 
            totalTargeted: targetList.length 
        });
    } catch (error: any) {
        console.error("WhatsApp Broadcast Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
