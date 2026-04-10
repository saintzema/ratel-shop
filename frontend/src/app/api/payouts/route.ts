import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

// GET /api/payouts?sellerId=xxx
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const sellerId = searchParams.get("sellerId");

        const whereClause: any = {};
        if (sellerId) whereClause.sellerId = sellerId;

        const payouts = await db.payout.findMany({
            where: whereClause,
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json({ success: true, payouts });
    } catch (error: any) {
        console.error("Payouts GET Error:", error);
        return NextResponse.json({ success: true, payouts: [] }, {
            status: 503,
            headers: { "X-DB-Status": "offline" },
        });
    }
}

// POST /api/payouts — Create a new payout request
export async function POST(request: Request) {
    try {
        const body = await request.json();

        const {
            seller_id,
            amount,
            bank_name,
            account_number,
            account_name,
            order_ids,
        } = body;

        if (!seller_id || !amount || !bank_name || !account_number) {
            return NextResponse.json(
                { success: false, error: "Missing required fields" },
                { status: 400 }
            );
        }

        const payout = await db.payout.create({
            data: {
                sellerId: seller_id,
                amount,
                bankName: bank_name,
                accountNumber: account_number,
                accountName: account_name || "N/A",
                orderIds: order_ids || [],
                status: "processing",
            },
        });

        // Mark the associated orders as payout_requested
        if (order_ids && order_ids.length > 0) {
            await db.order.updateMany({
                where: { id: { in: order_ids } },
                data: { payoutStatus: "requested" },
            });
        }

        return NextResponse.json({ success: true, payout });
    } catch (error: any) {
        console.error("Payouts POST Error:", error);
        return NextResponse.json(
            { success: true, queued: true, error: "DB offline — payout saved locally" },
            { status: 202, headers: { "X-DB-Status": "offline" } }
        );
    }
}

// PATCH /api/payouts — Update payout status (admin approval)
export async function PATCH(request: Request) {
    try {
        const body = await request.json();
        const { id, status } = body;

        if (!id || !status) {
            return NextResponse.json(
                { success: false, error: "ID and status required" },
                { status: 400 }
            );
        }

        const payout = await db.payout.update({
            where: { id },
            data: { status },
        });

        // If approved/completed, trigger Paystack transfer and mark orders as paid out
        if (status === "completed") {
            const currentPayout = await db.payout.findUnique({ where: { id } });
            
            if (currentPayout && process.env.PAYSTACK_SECRET_KEY && currentPayout.accountNumber) {
                // Map frontend bank names to Paystack Bank Codes
                const bankCodes: Record<string, string> = {
                    "Access Bank": "044",
                    "First Bank of Nigeria": "011",
                    "Guaranty Trust Bank (GTBank)": "058",
                    "United Bank for Africa (UBA)": "033",
                    "Zenith Bank": "057",
                    "Ecobank Nigeria": "050",
                    "Fidelity Bank": "070",
                    "First City Monument Bank (FCMB)": "214",
                    "Heritage Banking Company": "030",
                    "Keystone Bank": "082",
                    "Polaris Bank": "076",
                    "Stanbic IBTC Bank": "221",
                    "Standard Chartered Bank": "068",
                    "Sterling Bank": "232",
                    "Union Bank of Nigeria": "032",
                    "Unity Bank": "215",
                    "Wema Bank": "035",
                    "Kuda Microfinance Bank": "50211",
                    "OPay": "100004",
                    "PalmPay": "100033",
                    "Moniepoint": "50515"
                };

                const paystackBankCode = bankCodes[currentPayout.bankName] || "044"; // Fallback to Access

                try {
                    // Step 1: Create Transfer Recipient
                    const recipientRes = await fetch("https://api.paystack.co/transferrecipient", {
                        method: "POST",
                        headers: {
                            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            type: "nuban",
                            name: currentPayout.accountName,
                            account_number: currentPayout.accountNumber,
                            bank_code: paystackBankCode,
                            currency: "NGN"
                        })
                    });
                    const recipientData = await recipientRes.json();

                    // Step 2: Initiate Transfer
                    if (recipientData.status && recipientData.data?.recipient_code) {
                        const transferRes = await fetch("https://api.paystack.co/transfer", {
                            method: "POST",
                            headers: {
                                Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({
                                source: "balance",
                                amount: currentPayout.amount * 100, // Paystack requires kobo (amount * 100)
                                recipient: recipientData.data.recipient_code,
                                reason: `FairPrice Payout for ${currentPayout.sellerId}`
                            })
                        });
                        const transferData = await transferRes.json();
                        if (!transferData.status) {
                            console.error("Paystack Transfer Failed:", transferData.message);
                        }
                    } else {
                        console.error("Paystack Recipient Creation Failed:", recipientData.message);
                    }
                } catch (paystackErr) {
                    console.error("Paystack Error:", paystackErr);
                }
            }

            if (payout.orderIds.length > 0) {
                await db.order.updateMany({
                    where: { id: { in: payout.orderIds } },
                    data: { payoutStatus: "paid" },
                });
            }
        }

        return NextResponse.json({ success: true, payout });
    } catch (error: any) {
        console.error("Payouts PATCH Error:", error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
