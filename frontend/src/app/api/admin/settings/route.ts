import { NextResponse } from "next/server";
import { db as prisma } from "@/lib/db";

export const dynamic = 'force-dynamic';
export const runtime = "nodejs";

const DEFAULT_SETTINGS = {
    id: "global",
    platformMargin: 2.5,
    serviceCharge: 1.5,
    standardCommission: 5.0,
    escrowFee: 1.0,
    doorstepFee: 1500,
    pickupFee: 500,
    aiMonitoring: true,
    kycVerification: true,
    escrowRelease: 7,
    strictSeller: true,
    categoryMargins: {},
    updatedAt: new Date()
};

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
        console.error("Failed to fetch DB settings, falling back to defaults:", error);
        return NextResponse.json({ ...DEFAULT_SETTINGS, _offlineMode: true });
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
