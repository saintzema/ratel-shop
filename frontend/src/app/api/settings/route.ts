import { NextResponse } from "next/server";
import { db as prisma } from "@/lib/db";

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const settings = await prisma.systemSetting.findUnique({
            where: { id: "global" },
            select: {
                heroConfig: true,
                categoryMargins: true,
                supportConfig: true,
                codEnabled: true,
                codThreshold: true,
                // Add other non-sensitive fields here
            }
        });

        return NextResponse.json(settings || {});
    } catch (error) {
        console.error("Failed to fetch public settings:", error);
        return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
    }
}
