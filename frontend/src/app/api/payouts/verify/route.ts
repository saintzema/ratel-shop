import { NextResponse } from "next/server";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const accountNumber = searchParams.get("account_number");
        const bankCode = searchParams.get("bank_code");

        if (!accountNumber || !bankCode) {
            return NextResponse.json(
                { success: false, error: "Account number and bank code are required" },
                { status: 400 }
            );
        }

        const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
        if (!paystackSecret) {
            return NextResponse.json(
                { success: false, error: "Paystack secret key not configured" },
                { status: 500 }
            );
        }

        const response = await fetch(
            `https://api.paystack.co/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
            {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${paystackSecret}`,
                    "Content-Type": "application/json",
                },
            }
        );

        const data = await response.json();

        if (data.status) {
            return NextResponse.json({
                success: true,
                account_name: data.data.account_name,
            });
        } else {
            return NextResponse.json(
                { success: false, error: data.message },
                { status: 400 }
            );
        }
    } catch (error: any) {
        console.error("Paystack Resolution Error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to resolve bank account" },
            { status: 500 }
        );
    }
}
