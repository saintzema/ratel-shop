import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/jwt";
import { db } from "@/lib/db";
import { notifyUser } from "@/lib/user-notify";

export const dynamic = "force-dynamic";

/**
 * POST /api/rides  — rider posts a ride request with THEIR OWN proposed fare
 *                     (inDrive-style, not an algorithmic quote).
 * GET  /api/rides  — for a rider: their own requests. For an approved driver:
 *                     open requests in their state matching their vehicle
 *                     class, so they can send a counter-offer.
 */
export async function POST(req: NextRequest) {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Sign in to book a ride" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { pickup, dropoff, proposedFare, vehicleClassPref, pickupState, pickupCity, autoAcceptMax } = body || {};

    if (!pickup || !dropoff) {
        return NextResponse.json({ error: "Pickup and drop-off are required" }, { status: 400 });
    }
    const fare = Number(proposedFare);
    if (!fare || fare <= 0) {
        return NextResponse.json({ error: "Enter what you're willing to pay for this trip" }, { status: 400 });
    }
    const classPref = ["ev", "newer", "standard"].includes(String(vehicleClassPref)) ? vehicleClassPref : null;

    const ride = await db.rideRequest.create({
        data: {
            riderId: user.userId,
            pickup: String(pickup),
            dropoff: String(dropoff),
            proposedFare: fare,
            autoAcceptMax: autoAcceptMax ? Number(autoAcceptMax) : null,
            vehicleClassPref: classPref,
            pickupState: pickupState || null,
            pickupCity: pickupCity || null,
        },
    });

    // Real count, not a fabricated "N drivers viewing" animation — how many
    // approved, eligible drivers this request is actually visible to.
    const visibleDrivers = await db.vehicle.count({
        where: {
            status: "approved",
            ...(classPref ? { vehicleClass: classPref } : {}),
            ...(pickupState ? { operatingState: pickupState } : {}),
        },
    }).catch(() => 0);

    return NextResponse.json({ success: true, ride, visibleDrivers });
}

export async function GET(req: NextRequest) {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const mode = searchParams.get("mode"); // "rider" | "driver"

    if (mode === "driver") {
        // Only an approved driver sees the open request board — and only requests
        // that at least COULD be theirs: same state, and (if the rider asked for a
        // specific class) a class they actually drive.
        const myVehicles = await db.vehicle.findMany({
            where: { driverId: user.userId, status: "approved" },
        });
        if (myVehicles.length === 0) {
            return NextResponse.json({ rides: [], vehicles: [], needsApprovedVehicle: true });
        }
        const myClasses = myVehicles.map(v => v.vehicleClass);
        const myStates = Array.from(new Set(myVehicles.map(v => v.operatingState).filter(Boolean))) as string[];

        const [rides, myActiveRides] = await Promise.all([
            db.rideRequest.findMany({
                where: {
                    status: "searching",
                    AND: [
                        { OR: [{ vehicleClassPref: null }, { vehicleClassPref: { in: myClasses } }] },
                        // A driver who hasn't set an operating state still sees everything —
                        // don't let a missing field silently hide every request from them.
                        ...(myStates.length ? [{ OR: [{ pickupState: null }, { pickupState: { in: myStates } }] }] : []),
                    ],
                },
                include: {
                    rider: { select: { name: true } },
                    offers: { where: { driverId: user.userId } },
                },
                orderBy: { createdAt: "desc" },
                take: 50,
            }),
            db.rideRequest.findMany({
                where: { driverId: user.userId, status: { in: ["matched", "in_progress"] } },
                include: { rider: { select: { name: true } } },
                orderBy: { createdAt: "desc" },
            }),
        ]);

        return NextResponse.json({ rides, myActiveRides, vehicles: myVehicles });
    }

    // Rider view — their own requests with any offers received.
    const rides = await db.rideRequest.findMany({
        where: { riderId: user.userId },
        include: {
            offers: {
                include: { driver: { select: { name: true } }, vehicle: true },
                orderBy: { offeredFare: "asc" },
            },
            driver: { select: { name: true, whatsappNumber: true } },
            vehicle: true,
        },
        orderBy: { createdAt: "desc" },
        take: 20,
    });
    return NextResponse.json({ rides });
}
