import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const rawInteractions = await db.whatsAppInteraction.findMany({
            orderBy: { createdAt: "desc" },
            take: 100
        });

        const interactions = rawInteractions.map(i => {
            let messageText = "";
            let direction: "inbound" | "outbound" = "inbound";
            let metadata = {};

            try {
                const payload = i.payload ? JSON.parse(i.payload) : {};
                messageText = payload.text || payload.fullText || payload.iceBreaker || i.payload || "";
                direction = i.interaction_type === "outbound_message" ? "outbound" : "inbound";
                metadata = payload;
            } catch (e) {
                messageText = i.payload || "";
            }

            return {
                id: i.id,
                phoneNumber: i.phoneNumber,
                messageText,
                direction,
                type: i.interaction_type.split('_')[0], // e.g. "inbound_message" -> "inbound"
                rawType: i.interaction_type,
                metadata,
                createdAt: i.createdAt
            };
        });

        return NextResponse.json(interactions);
    } catch (error: any) {
        console.error("Failed to fetch WhatsApp interactions:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
