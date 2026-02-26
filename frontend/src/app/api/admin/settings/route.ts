import { NextResponse } from "next/server";
import { db as prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
    try {
        let settings = await prisma.systemSetting.findUnique({
            where: { id: "global" }
        });

        if (!settings) {
            settings = await prisma.systemSetting.create({
                data: { id: "global" }
            });
        }

        return NextResponse.json(settings);
    } catch (error) {
        console.error("Failed to fetch settings:", error);
        return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { id, createdAt, updatedAt, ...updatableFields } = body; // Destructure to exclude fields we shouldn't update directly if they are sent

        const settings = await prisma.systemSetting.upsert({
            where: { id: "global" },
            update: updatableFields,
            create: {
                id: "global",
                ...updatableFields
            }
        });

        return NextResponse.json(settings);
    } catch (error) {
        console.error("Failed to update settings:", error);
        return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
    }
}
