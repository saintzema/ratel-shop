import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/jwt";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * POST /api/vehicles  — a driver submits a vehicle for approval.
 * GET  /api/vehicles  — the signed-in driver's own vehicles + their status.
 *
 * No vehicle can carry a paying rider until an admin approves it (see
 * /api/admin/vehicles) — vetted before it's live, not self-certified.
 */
export async function POST(req: NextRequest) {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Sign in to register a vehicle" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { make, model, year, plateNumber, vin, vehicleClass, photos, licensePhotoUrl, operatingState } = body || {};

    if (!make || !model || !plateNumber || !vin) {
        return NextResponse.json({ error: "Make, model, plate number and VIN are required" }, { status: 400 });
    }
    if (!["ev", "newer", "standard"].includes(String(vehicleClass))) {
        return NextResponse.json({ error: "Choose a valid vehicle class" }, { status: 400 });
    }
    if (!Array.isArray(photos) || photos.length < 2) {
        return NextResponse.json({ error: "At least 2 vehicle photos are required for inspection" }, { status: 400 });
    }

    const vehicle = await db.vehicle.create({
        data: {
            driverId: user.userId,
            make: String(make),
            model: String(model),
            year: year ? Number(year) : null,
            plateNumber: String(plateNumber).toUpperCase(),
            vin: String(vin).toUpperCase(),
            vehicleClass,
            photos,
            licensePhotoUrl: licensePhotoUrl || null,
            operatingState: operatingState || null,
        },
    });

    return NextResponse.json({ success: true, vehicle });
}

export async function GET(req: NextRequest) {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const vehicles = await db.vehicle.findMany({
        where: { driverId: user.userId },
        orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ vehicles });
}
