import { db } from "@/lib/db";
import { notifyUser } from "@/lib/user-notify";

/**
 * Locks in one offer for a ride request: declines every other pending offer,
 * opens a durable Conversation (same table every other buyer↔seller chat
 * uses) between rider and driver, and marks the ride matched.
 *
 * Shared by the rider's manual "Accept" tap and the auto-accept path (see
 * /api/rides/[id]/offers — a rider can set an "accept up to ₦X" ceiling so
 * they don't have to babysit the request, inDrive's actual highest-leverage
 * UX detail).
 */
export async function acceptRideOffer(rideId: string, offerId: string) {
    const ride = await db.rideRequest.findUnique({ where: { id: rideId } });
    if (!ride) throw new Error("Ride not found");
    const offer = await db.rideOffer.findUnique({ where: { id: offerId } });
    if (!offer || offer.rideRequestId !== rideId) throw new Error("Offer not found");

    const [, , conversation] = await db.$transaction([
        db.rideOffer.update({ where: { id: offerId }, data: { status: "accepted" } }),
        db.rideOffer.updateMany({
            where: { rideRequestId: rideId, id: { not: offerId } },
            data: { status: "declined" },
        }),
        db.conversation.upsert({
            where: { sellerId_buyerId_productId: { sellerId: offer.driverId, buyerId: ride.riderId, productId: rideId } },
            update: {},
            create: {
                sellerId: offer.driverId,
                buyerId: ride.riderId,
                productId: rideId,
                productName: `Ride: ${ride.pickup} → ${ride.dropoff}`,
            },
        }),
        db.rideRequest.update({
            where: { id: rideId },
            data: {
                status: "matched",
                driverId: offer.driverId,
                vehicleId: offer.vehicleId,
                agreedFare: offer.offeredFare,
            },
        }),
    ]);

    const conversationId = (conversation as any).id as string;
    await db.rideRequest.update({ where: { id: rideId }, data: { conversationId } }).catch(() => {});

    await notifyUser(offer.driverId,
        `✅ Your ₦${offer.offeredFare.toLocaleString()} offer was accepted for the ride from ${ride.pickup} to ${ride.dropoff}. Message your rider to coordinate pickup.`,
        { type: "system", link: "/drive/dashboard" }
    );

    return { conversationId, offer, ride };
}
