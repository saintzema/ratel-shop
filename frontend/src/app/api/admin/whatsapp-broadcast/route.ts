import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { WhatsAppService } from "@/lib/whatsapp-service";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { product, message, targetUsers, isTest } = body;

        if (isTest) {
            // For a connection test, we only send to the admin/test number
            const testNumber = "2348162816305"; // Default test number
            const result = await WhatsAppService.sendTestMessage(testNumber);
            return NextResponse.json({ success: !!result && !result.error, test: true });
        }

        // Fetch users with WhatsApp numbers
        // targetUsers can be 'all' or specific IDs
        const users = await db.user.findMany({
            where: {
                role: "customer",
                ...(targetUsers !== "all" && { id: { in: targetUsers } })
            },
            select: { id: true, name: true }
        });

        // For this demo/integration, we simulate finding users with WhatsApp numbers 
        // linked to their profiles. In a real system, we'd check a `whatsappNumber` field.
        // For now, we'll use a mocked list or just the ones provided.

        let sentCount = 0;
        const results = [];

        for (const user of users) {
            // Mocking a WhatsApp number if none exists for demo purposes
            // In production, we'd use user.whatsappNumber
            const whatsappNumber = (user as any).whatsappNumber || "2348162816305"; // Default to admin for testing

            try {
                let result;
                if (product) {
                    result = await WhatsAppService.sendProductOffer(whatsappNumber, {
                        name: product.name,
                        price: product.price,
                        url: `${process.env.NEXTAUTH_URL}/product/${product.id}`,
                        imageUrl: product.image_url
                    });
                } else {
                    result = await WhatsAppService.sendMessage(whatsappNumber, message);
                }
                
                if (result && !result.error) {
                    sentCount++;
                }
                results.push({ userId: user.id, success: !!result && !result.error });
            } catch (e) {
                console.error(`Failed to send WhatsApp to ${user.id}:`, e);
            }
        }

        return NextResponse.json({ 
            success: true, 
            sentCount, 
            totalTargeted: users.length,
            details: results
        });
    } catch (error: any) {
        console.error("WhatsApp Broadcast Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
