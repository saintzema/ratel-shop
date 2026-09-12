import { db } from "@/lib/db";
import { resolveBankCode } from "@/lib/bank-codes";

/**
 * Real Paystack Transfer to a courier's own bank account — the automated
 * side of delivery escrow release. Deliberately NOT built on
 * lib/payout-transfer.ts's initiatePaystackTransfer: that helper writes its
 * state onto the Payout table, which is FK'd to Seller — a courier isn't a
 * seller, and creating a throwaway Seller row just to satisfy that foreign
 * key would be modeling a courier as a store. This duplicates the same two
 * Paystack REST calls (recipient, then transfer) but tracks state on
 * DeliveryRequest.courierTransferCode directly instead.
 *
 * Falls back cleanly: any failure here just means the existing
 * admin-reviewed settlement queue (see /api/deliveries/[id]/deliver's
 * notifyAdmins call) handles it instead — never a silent loss of the
 * courier's money.
 */
export async function transferDeliveryFareToCourier(deliveryId: string, amount: number, courierId: string): Promise<{ success: boolean; message?: string }> {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) return { success: false, message: "Paystack secret key not configured" };

    const courier = await db.user.findUnique({
        where: { id: courierId },
        select: { payoutBankName: true, payoutAccountNumber: true, payoutAccountName: true },
    });
    if (!courier?.payoutBankName || !courier?.payoutAccountNumber || !courier?.payoutAccountName) {
        return { success: false, message: "Courier has no payout bank details on file" };
    }

    const bankCode = resolveBankCode(courier.payoutBankName);

    try {
        const recipientRes = await fetch("https://api.paystack.co/transferrecipient", {
            method: "POST",
            headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                type: "nuban",
                name: courier.payoutAccountName,
                account_number: courier.payoutAccountNumber,
                bank_code: bankCode,
                currency: "NGN",
            }),
        });
        const recipientData = await recipientRes.json();
        if (!recipientData.status || !recipientData.data?.recipient_code) {
            return { success: false, message: `Recipient creation failed: ${recipientData.message}` };
        }

        const transferRes = await fetch("https://api.paystack.co/transfer", {
            method: "POST",
            headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                source: "balance",
                amount: Math.round(amount * 100),
                recipient: recipientData.data.recipient_code,
                reason: `FairPrice delivery payout for ${deliveryId}`,
                reference: `fp_delivery_payout_${deliveryId}`,
            }),
        });
        const transferData = await transferRes.json();
        if (!transferData.status) {
            return { success: false, message: `Transfer failed: ${transferData.message}` };
        }

        await db.deliveryRequest.update({
            where: { id: deliveryId },
            data: { courierTransferCode: transferData.data?.transfer_code || "sent" },
        });
        return { success: true };
    } catch (err: any) {
        return { success: false, message: err.message };
    }
}
