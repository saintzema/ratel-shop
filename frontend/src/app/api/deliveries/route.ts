import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/jwt";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const PACKAGE_SIZES = ["small", "medium", "large"];

/**
 * POST /api/deliveries — sender posts a delivery request with their own
 *                         proposed fare (same inDrive-style pricing as rides).
 * GET  /api/deliveries — for a sender: their own requests. For a courier:
 *                         the open request board — no vehicle-approval gate,
 *                         since carrying a package doesn't carry the same
 *                         passenger-safety stakes driving does.
 */
export async function POST(req: NextRequest) {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Sign in to send a package" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const {
        pickup, dropoff, proposedFare, pickupState, pickupCity, autoAcceptMax,
        packageDescription, packageSize, recipientName, recipientPhone,
    } = body || {};

    if (!pickup || !dropoff) {
        return NextResponse.json({ error: "Pickup and drop-off are required" }, { status: 400 });
    }
    if (!packageDescription) {
        return NextResponse.json({ error: "Describe what you're sending" }, { status: 400 });
    }
    const fare = Number(proposedFare);
    if (!fare || fare <= 0) {
        return NextResponse.json({ error: "Enter what you're willing to pay for this delivery" }, { status: 400 });
    }
    const size = PACKAGE_SIZES.includes(String(packageSize)) ? packageSize : "small";

    const delivery = await db.deliveryRequest.create({
        data: {
            senderId: user.userId,
            pickup: String(pickup),
            dropoff: String(dropoff),
            packageDescription: String(packageDescription),
            packageSize: size,
            recipientName: recipientName || null,
            recipientPhone: recipientPhone || null,
            proposedFare: fare,
            autoAcceptMax: autoAcceptMax ? Number(autoAcceptMax) : null,
            pickupState: pickupState || null,
            pickupCity: pickupCity || null,
        },
    });

    return NextResponse.json({ success: true, delivery });
}

export async function GET(req: NextRequest) {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const mode = searchParams.get("mode"); // "sender" | "courier"

    if (mode === "courier") {
        const [deliveries, myActiveDeliveries] = await Promise.all([
            db.deliveryRequest.findMany({
                where: { status: "searching" },
                include: {
                    sender: { select: { name: true } },
                    offers: { where: { courierId: user.userId } },
                },
                orderBy: { createdAt: "desc" },
                take: 50,
            }),
            db.deliveryRequest.findMany({
                where: { courierId: user.userId, status: { in: ["matched", "picked_up"] } },
                include: { sender: { select: { name: true } } },
                orderBy: { createdAt: "desc" },
            }),
        ]);
        return NextResponse.json({ deliveries, myActiveDeliveries });
    }

    // Sender view — their own requests with any offers received.
    const deliveries = await db.deliveryRequest.findMany({
        where: { senderId: user.userId },
        include: {
            offers: {
                include: { courier: { select: { name: true } } },
                orderBy: { offeredFare: "asc" },
            },
            courier: { select: { name: true, whatsappNumber: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
    });
    return NextResponse.json({ deliveries });
}
