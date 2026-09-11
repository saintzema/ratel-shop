import { db } from "@/lib/db";
import { notifyUser } from "@/lib/user-notify";

/**
 * Locks in one courier offer for a delivery request — the same shape as
 * acceptRideOffer (see lib/ride-accept.ts), including the same atomic
 * updateMany guard against two offers both "winning" a near-simultaneous
 * accept.
 */
export async function acceptDeliveryOffer(deliveryId: string, offerId: string) {
    return db.$transaction(async (tx) => {
        const delivery = await tx.deliveryRequest.findUnique({ where: { id: deliveryId } });
        if (!delivery) throw new Error("Delivery not found");
        const offer = await tx.deliveryOffer.findUnique({ where: { id: offerId } });
        if (!offer || offer.deliveryRequestId !== deliveryId) throw new Error("Offer not found");

        const { count } = await tx.deliveryRequest.updateMany({
            where: { id: deliveryId, status: "searching" },
            data: { status: "matched", courierId: offer.courierId, agreedFare: offer.offeredFare },
        });
        if (count === 0) throw new Error("This delivery already has a courier");

        await tx.deliveryOffer.update({ where: { id: offerId }, data: { status: "accepted" } });
        await tx.deliveryOffer.updateMany({
            where: { deliveryRequestId: deliveryId, id: { not: offerId } },
            data: { status: "declined" },
        });
        const conversation = await tx.conversation.upsert({
            where: { sellerId_buyerId_productId: { sellerId: offer.courierId, buyerId: delivery.senderId, productId: deliveryId } },
            update: {},
            create: {
                sellerId: offer.courierId,
                buyerId: delivery.senderId,
                productId: deliveryId,
                productName: `Delivery: ${delivery.pickup} → ${delivery.dropoff}`,
            },
        });
        await tx.deliveryRequest.update({ where: { id: deliveryId }, data: { conversationId: conversation.id } });

        return { conversationId: conversation.id, offer, delivery };
    }).then(async (result) => {
        await notifyUser(result.offer.courierId,
            `✅ Your ₦${result.offer.offeredFare.toLocaleString()} offer was accepted for the delivery from ${result.delivery.pickup} to ${result.delivery.dropoff}. Message the sender to coordinate pickup.`,
            { type: "system", link: "/deliver/dashboard" }
        );
        return result;
    });
}
