import { db } from "@/lib/db";
import { resolveBankCode } from "@/lib/bank-codes";

/**
 * Real Paystack Transfer to a driver's own bank account, the moment the
 * rider's in-app fare payment verifies — mirrors lib/delivery-payout.ts
 * exactly (same reasoning: a driver isn't a Seller, so this can't be built
 * on lib/payout-transfer.ts's Payout table, which is FK'd to Seller).
 * Falls back cleanly: any failure here just means the existing
 * admin-reviewed settlement queue handles it instead — never a silent
 * loss of the driver's fare.
 */
export async function transferRideFareToDriver(rideId: string, amount: number, driverId: string): Promise<{ success: boolean; message?: string }> {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) return { success: false, message: "Paystack secret key not configured" };

    const driver = await db.user.findUnique({
        where: { id: driverId },
        select: { payoutBankName: true, payoutAccountNumber: true, payoutAccountName: true },
    });
    if (!driver?.payoutBankName || !driver?.payoutAccountNumber || !driver?.payoutAccountName) {
        return { success: false, message: "Driver has no payout bank details on file" };
    }

    const bankCode = resolveBankCode(driver.payoutBankName);

    try {
        const recipientRes = await fetch("https://api.paystack.co/transferrecipient", {
            method: "POST",
            headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                type: "nuban",
                name: driver.payoutAccountName,
                account_number: driver.payoutAccountNumber,
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
                reason: `FairPrice ride fare payout for ${rideId}`,
                reference: `fp_ride_payout_${rideId}`,
            }),
        });
        const transferData = await transferRes.json();
        if (!transferData.status) {
            return { success: false, message: `Transfer failed: ${transferData.message}` };
        }

        await db.rideRequest.update({
            where: { id: rideId },
            data: { driverTransferCode: transferData.data?.transfer_code || "sent" },
        });
        return { success: true };
    } catch (err: any) {
        return { success: false, message: err.message };
    }
}
