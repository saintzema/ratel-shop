import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/jwt";
import { db } from "@/lib/db";
import { notifyUser } from "@/lib/user-notify";

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

    // Real-time nudge to couriers, not just whoever happens to have the open-
    // request board on screen — anyone who's ever carried a delivery before,
    // or who's already added payout bank details (the clearest signal of
    // "I want to earn doing this"), same state when we know it. Best-effort:
    // notifyUser never throws, so a notify failure can't fail the post itself.
    (async () => {
        try {
            const [pastCouriers, interestedByPayout] = await Promise.all([
                db.deliveryRequest.findMany({
                    where: { courierId: { not: null } },
                    select: { courierId: true },
                    distinct: ["courierId"],
                }),
                db.user.findMany({
                    where: { payoutBankName: { not: null } },
                    select: { id: true },
                }),
            ]);
            const candidateIds = new Set<string>([
                ...pastCouriers.map(d => d.courierId as string),
                ...interestedByPayout.map(u => u.id),
            ]);
            candidateIds.delete(user.userId);

            // Early days: if literally nobody looks like a courier yet, this
            // sender would otherwise just wait on a request nobody sees —
            // hand it to the team the same way an unfulfillable "Hire an
            // Expert" request is, so a human can manually arrange it.
            if (candidateIds.size === 0) {
                const { sendAdminAlert } = await import("@/lib/admin-alert");
                await sendAdminAlert({
                    title: "Delivery request has no couriers yet",
                    message: `No registered couriers to notify for a new delivery: ${pickup} → ${dropoff}.`,
                    data: {
                        pickup: String(pickup),
                        dropoff: String(dropoff),
                        package: String(packageDescription),
                        fare: `₦${fare.toLocaleString()}`,
                        state: pickupState || "Not specified",
                    },
                    link: "/admin",
                });
            }

            await Promise.all(
                Array.from(candidateIds).map(id =>
                    notifyUser(id, `New delivery request nearby: ${pickup} → ${dropoff} (₦${fare.toLocaleString()})`, {
                        type: "system",
                        link: "/deliver/dashboard",
                    })
                )
            );
        } catch {
            // best-effort
        }
    })();

    return NextResponse.json({ success: true, delivery });
}

export async function GET(req: NextRequest) {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const mode = searchParams.get("mode"); // "sender" | "courier"

    if (mode === "courier") {
        // A courier who hasn't set a vicinity still sees everything nationwide
        // — a missing filter should never silently hide every request, same
        // rule the ride-matching side already follows for operatingState.
        const state = searchParams.get("state");
        const [deliveries, myActiveDeliveries] = await Promise.all([
            db.deliveryRequest.findMany({
                where: {
                    status: "searching",
                    ...(state ? { OR: [{ pickupState: null }, { pickupState: state }] } : {}),
                },
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
