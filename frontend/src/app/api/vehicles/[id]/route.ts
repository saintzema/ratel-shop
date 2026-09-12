import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/jwt";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/vehicles/[id] — a driver updates their OWN vehicle's plate
 * number or color after it's already approved (a repaint, a plate swap, a
 * different car entirely). Deliberately narrow: make/model/VIN/photos stay
 * fixed post-approval since those are what admin actually inspected — only
 * the two fields a rider needs to spot the right car on the street can be
 * self-edited, no re-approval required.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;

    const vehicle = await db.vehicle.findUnique({ where: { id } });
    if (!vehicle || vehicle.driverId !== user.userId) {
        return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const { plateNumber, color } = body || {};
    const data: Record<string, string | null> = {};
    if (typeof plateNumber === "string" && plateNumber.trim()) data.plateNumber = plateNumber.trim().toUpperCase();
    if (typeof color === "string") data.color = color.trim() || null;

    if (!Object.keys(data).length) {
        return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    const updated = await db.vehicle.update({ where: { id }, data });
    return NextResponse.json({ success: true, vehicle: updated });
}
