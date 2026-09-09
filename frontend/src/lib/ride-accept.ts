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
 *
 * Runs as one interactive transaction gated on `status: "searching"` at the
 * ride-update step: two offers accepted at nearly the same instant (a rider
 * double-tapping Accept on two offers, or two drivers' offers both crossing
 * the same auto-accept ceiling in the same instant) would otherwise both
 * "win" — the second write silently overwriting the first's driverId/fare
 * while that first driver still believed they had the ride. The updateMany's
 * affected-row count is the guard: 0 rows means someone else already matched
 * this ride, so this attempt throws instead of clobbering it.
 */
export async function acceptRideOffer(rideId: string, offerId: string) {
    return db.$transaction(async (tx) => {
        const ride = await tx.rideRequest.findUnique({ where: { id: rideId } });
        if (!ride) throw new Error("Ride not found");
        const offer = await tx.rideOffer.findUnique({ where: { id: offerId } });
        if (!offer || offer.rideRequestId !== rideId) throw new Error("Offer not found");

        const { count } = await tx.rideRequest.updateMany({
            where: { id: rideId, status: "searching" },
            data: {
                status: "matched",
                driverId: offer.driverId,
                vehicleId: offer.vehicleId,
                agreedFare: offer.offeredFare,
            },
        });
        if (count === 0) throw new Error("This ride already has a driver");

        await tx.rideOffer.update({ where: { id: offerId }, data: { status: "accepted" } });
        await tx.rideOffer.updateMany({
            where: { rideRequestId: rideId, id: { not: offerId } },
            data: { status: "declined" },
        });
        const conversation = await tx.conversation.upsert({
            where: { sellerId_buyerId_productId: { sellerId: offer.driverId, buyerId: ride.riderId, productId: rideId } },
            update: {},
            create: {
                sellerId: offer.driverId,
                buyerId: ride.riderId,
                productId: rideId,
                productName: `Ride: ${ride.pickup} → ${ride.dropoff}`,
            },
        });
        await tx.rideRequest.update({ where: { id: rideId }, data: { conversationId: conversation.id } });

        return { conversationId: conversation.id, offer, ride };
    }).then(async (result) => {
        await notifyUser(result.offer.driverId,
            `✅ Your ₦${result.offer.offeredFare.toLocaleString()} offer was accepted for the ride from ${result.ride.pickup} to ${result.ride.dropoff}. Message your rider to coordinate pickup.`,
            { type: "system", link: "/drive/dashboard" }
        );
        return result;
    });
}
